"""Checkpoint and Institutional Memory models.

Implements Section 24 — Institutional Memory.

Agents lose context between sessions. Persist via checkpoint files, decision
logs, and handoff briefs. Session persistence is the single biggest UX pain point.

Anti-pattern: False Checkpointing — summaries that sound comprehensive but omit
what wasn't done, assumptions made, shortcuts taken. If ASSUMPTIONS and
RECOVERY_ACTIONS are both empty, be suspicious.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field

from admiral.models.authority import DecisionTier


class TaskStatus(str, Enum):
    """Status of a task in a checkpoint."""

    PENDING = "pending"
    COMPLETED = "completed"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    SKIPPED = "skipped"


class TaskRecord(BaseModel):
    """A task's status in a checkpoint."""

    description: str = Field(..., min_length=1)
    status: TaskStatus
    notes: str = Field(default="")
    references: list[str] = Field(
        default_factory=list,
        description="File paths, commit hashes, or URLs.",
    )


class DecisionRecord(BaseModel):
    """A single decision made during a session.

    Per Section 24: Every decision must be logged with alternatives
    considered and rationale for the choice made.
    """

    timestamp: str = Field(
        ...,
        min_length=1,
        description="ISO 8601 timestamp.",
    )
    decision: str = Field(..., min_length=1)
    alternatives: list[str] = Field(
        default_factory=list,
        description="Other options that were considered.",
    )
    rationale: str = Field(
        default="",
        description="Why this option was chosen over alternatives.",
    )
    authority_tier: DecisionTier = Field(
        default=DecisionTier.AUTONOMOUS,
        description="What authority tier this decision fell under.",
    )


class DecisionLog(BaseModel):
    """Append-only log of decisions made during a session."""

    decisions: list[DecisionRecord] = Field(default_factory=list)

    def append(self, record: DecisionRecord) -> None:
        """Add a decision to the log."""
        self.decisions.append(record)

    def by_tier(self, tier: DecisionTier) -> list[DecisionRecord]:
        """Get all decisions at a given authority tier."""
        return [d for d in self.decisions if d.authority_tier == tier]

    @property
    def proposed(self) -> list[DecisionRecord]:
        """Decisions that required Admiral approval."""
        return self.by_tier(DecisionTier.PROPOSE)

    @property
    def escalated(self) -> list[DecisionRecord]:
        """Decisions that were escalated."""
        return self.by_tier(DecisionTier.ESCALATE)


class ResourceUsage(BaseModel):
    """Resources consumed during a session."""

    tokens_used: int = Field(default=0, ge=0)
    tokens_budget: int | None = Field(default=None, ge=0)
    time_minutes: int = Field(default=0, ge=0)
    time_budget_minutes: int | None = Field(default=None, ge=0)
    tool_calls: int = Field(default=0, ge=0)

    @property
    def tokens_remaining(self) -> int | None:
        """Tokens remaining in budget, or None if no budget set."""
        if self.tokens_budget is not None:
            return max(0, self.tokens_budget - self.tokens_used)
        return None

    @property
    def time_remaining(self) -> int | None:
        """Minutes remaining in time budget, or None if no budget set."""
        if self.time_budget_minutes is not None:
            return max(0, self.time_budget_minutes - self.time_minutes)
        return None


class Checkpoint(BaseModel):
    """Section 24 — Session checkpoint for institutional memory.

    Template:
        SESSION: metadata
        COMPLETED: tasks with status
        IN PROGRESS: current state
        BLOCKED: with references
        NEXT: ordered tasks
        DECISIONS MADE: count + references
        RECOVERY ACTIONS: or "None"
        RESOURCES CONSUMED: tokens/budget, time/budget
        ASSUMPTIONS: what Admiral should validate
    """

    # Session metadata
    session_id: str = Field(..., min_length=1)
    fleet_id: str = Field(default="")
    created_at: str = Field(
        default_factory=lambda: datetime.now().isoformat(),
    )

    # Task tracking
    completed: list[TaskRecord] = Field(default_factory=list)
    in_progress: list[TaskRecord] = Field(default_factory=list)
    blocked: list[TaskRecord] = Field(default_factory=list)
    next_tasks: list[str] = Field(
        default_factory=list,
        description="Ordered list of what should happen next.",
    )

    # Decisions
    decision_log: DecisionLog = Field(default_factory=DecisionLog)

    # Recovery
    recovery_actions: list[str] = Field(
        default_factory=list,
        description="Recovery actions taken. Empty list is suspicious — real work involves recovery.",
    )

    # Resources
    resources: ResourceUsage = Field(default_factory=ResourceUsage)

    # Assumptions (critical for honesty)
    assumptions: list[str] = Field(
        default_factory=list,
        description="Assumptions made that Admiral should validate. Empty list is suspicious.",
    )

    def render(self) -> str:
        """Render checkpoint as structured text for context injection."""
        lines = [
            f"# Checkpoint: {self.session_id}",
            f"Created: {self.created_at}",
            "",
        ]

        if self.completed:
            lines.append("## Completed")
            for t in self.completed:
                notes = f" — {t.notes}" if t.notes else ""
                lines.append(f"- [{t.status.value}] {t.description}{notes}")
            lines.append("")

        if self.in_progress:
            lines.append("## In Progress")
            for t in self.in_progress:
                notes = f" — {t.notes}" if t.notes else ""
                lines.append(f"- {t.description}{notes}")
            lines.append("")

        if self.blocked:
            lines.append("## Blocked")
            for t in self.blocked:
                refs = f" (refs: {', '.join(t.references)})" if t.references else ""
                lines.append(f"- {t.description}{refs}")
            lines.append("")

        if self.next_tasks:
            lines.append("## Next")
            for i, task in enumerate(self.next_tasks, 1):
                lines.append(f"{i}. {task}")
            lines.append("")

        lines.append(f"## Decisions Made: {len(self.decision_log.decisions)}")
        if self.decision_log.decisions:
            for d in self.decision_log.decisions:
                lines.append(f"- [{d.authority_tier.value}] {d.decision}")
        lines.append("")

        lines.append("## Recovery Actions")
        if self.recovery_actions:
            for action in self.recovery_actions:
                lines.append(f"- {action}")
        else:
            lines.append("- None")
        lines.append("")

        lines.append("## Resources")
        r = self.resources
        if r.tokens_budget is not None:
            lines.append(f"- Tokens: {r.tokens_used}/{r.tokens_budget}")
        if r.time_budget_minutes is not None:
            lines.append(f"- Time: {r.time_minutes}/{r.time_budget_minutes} min")
        lines.append(f"- Tool calls: {r.tool_calls}")
        lines.append("")

        lines.append("## Assumptions")
        if self.assumptions:
            for a in self.assumptions:
                lines.append(f"- {a}")
        else:
            lines.append("- None (suspicious — real work involves assumptions)")
        lines.append("")

        return "\n".join(lines)


class HandoffBrief(BaseModel):
    """End-of-session narrative for the next session to load.

    Bridges context window boundaries. Loaded by SessionStart hook
    to reconstruct state.
    """

    session_id: str = Field(..., min_length=1)
    completed_summary: str = Field(
        default="",
        description="What was accomplished this session.",
    )
    in_progress_summary: str = Field(
        default="",
        description="What's mid-flight and its current state.",
    )
    blocked_summary: str = Field(
        default="",
        description="What's blocked and why.",
    )
    decisions_summary: str = Field(
        default="",
        description="Key decisions made and their rationale.",
    )
    next_session_should: list[str] = Field(
        default_factory=list,
        description="Ordered list of what the next session should do first.",
    )

    def render(self) -> str:
        """Render as text for SessionStart hook injection."""
        lines = [
            f"# Handoff Brief: {self.session_id}",
            "",
        ]
        if self.completed_summary:
            lines.append(f"**Completed:** {self.completed_summary}")
        if self.in_progress_summary:
            lines.append(f"**In Progress:** {self.in_progress_summary}")
        if self.blocked_summary:
            lines.append(f"**Blocked:** {self.blocked_summary}")
        if self.decisions_summary:
            lines.append(f"**Decisions:** {self.decisions_summary}")

        if self.next_session_should:
            lines.append("")
            lines.append("**Next session should:**")
            for i, item in enumerate(self.next_session_should, 1):
                lines.append(f"{i}. {item}")

        return "\n".join(lines)
