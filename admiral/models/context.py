"""Context Window Strategy models.

Implements Section 06 — Context Window Strategy.

Context window is working memory. Load identity first (primacy), task last
(recency), reference in middle. Never exceed 150 lines standing instructions.

Budget allocation:
    Standing: 15-25% (identity, constraints, role)
    Session:  50-65% (task-specific, current work)
    Working:  20-30% (scratchpad, intermediate results)

Sacrifice order when full: working → session → NEVER standing.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, model_validator


# Standing context hard limit from spec
STANDING_CONTEXT_MAX_LINES = 150


class ContextSlot(str, Enum):
    """When context loads into the window."""

    STANDING = "standing"
    SESSION = "session"
    ON_DEMAND = "on_demand"


class RefreshTrigger(str, Enum):
    """Events that trigger context refresh.

    CHUNK_BOUNDARY:      After completing a work chunk.
    PROPOSE_RESOLUTION:  After a Propose-tier decision is resolved.
    DRIFT_DETECTED:      When context health check detects drift.
    """

    CHUNK_BOUNDARY = "chunk_boundary"
    PROPOSE_RESOLUTION = "propose_resolution"
    DRIFT_DETECTED = "drift_detected"


class SacrificeOrder(str, Enum):
    """What gets compressed when context is full.

    Working context first, then session, NEVER standing.
    """

    WORKING = "working"
    SESSION = "session"
    # Standing is never sacrificed — not included by design.


class ContextEntry(BaseModel):
    """A single piece of context to load."""

    name: str = Field(..., min_length=1)
    slot: ContextSlot
    source: str = Field(
        ...,
        min_length=1,
        description="File path, skill name, or inline content reference.",
    )
    estimated_lines: int = Field(default=0, ge=0)
    priority: int = Field(
        default=50,
        ge=0,
        le=100,
        description="Higher priority = loaded first within slot. 100 = critical.",
    )


class ContextBudget(BaseModel):
    """Budget allocation across context slots.

    All percentages must sum to 100. Standing must be 15-25%,
    session 50-65%, working 20-30%.
    """

    standing_pct: int = Field(default=20, ge=15, le=25)
    session_pct: int = Field(default=55, ge=50, le=65)
    working_pct: int = Field(default=25, ge=20, le=30)

    @model_validator(mode="after")
    def percentages_must_sum_to_100(self) -> ContextBudget:
        total = self.standing_pct + self.session_pct + self.working_pct
        if total != 100:
            raise ValueError(
                f"Context budget must sum to 100%, got {total}% "
                f"(standing={self.standing_pct}, session={self.session_pct}, working={self.working_pct})"
            )
        return self


class ContextProfile(BaseModel):
    """Per-agent context profile defining what loads when.

    Section 06: Standing context must not exceed 150 lines.
    Loading order: identity → constraints → task (primacy → recency).
    """

    agent_role: str = Field(..., min_length=1)
    budget: ContextBudget = Field(default_factory=ContextBudget)
    entries: list[ContextEntry] = Field(default_factory=list)
    refresh_triggers: list[RefreshTrigger] = Field(default_factory=list)
    sacrifice_order: list[SacrificeOrder] = Field(
        default_factory=lambda: [SacrificeOrder.WORKING, SacrificeOrder.SESSION],
    )

    @property
    def standing(self) -> list[ContextEntry]:
        """Entries that load at session start (identity, role, constraints)."""
        return sorted(
            [e for e in self.entries if e.slot == ContextSlot.STANDING],
            key=lambda e: -e.priority,
        )

    @property
    def session(self) -> list[ContextEntry]:
        """Entries that load with the current task."""
        return sorted(
            [e for e in self.entries if e.slot == ContextSlot.SESSION],
            key=lambda e: -e.priority,
        )

    @property
    def on_demand(self) -> list[ContextEntry]:
        """Entries loaded only when triggered (skills, reference)."""
        return [e for e in self.entries if e.slot == ContextSlot.ON_DEMAND]

    @property
    def standing_lines(self) -> int:
        """Total estimated lines in standing context."""
        return sum(e.estimated_lines for e in self.standing)

    def validate_standing_limit(self) -> list[str]:
        """Check standing context against 150-line hard limit.

        Returns list of violations. Empty list = compliant.
        """
        violations = []
        total = self.standing_lines
        if total > STANDING_CONTEXT_MAX_LINES:
            violations.append(
                f"Standing context for '{self.agent_role}' is {total} lines, "
                f"exceeds {STANDING_CONTEXT_MAX_LINES}-line limit. "
                f"Move content to session or on-demand slots."
            )
        return violations

    def validate_fits_budget(self, context_budget_kb: int) -> list[str]:
        """Cross-validate that total estimated context fits the agent's budget.

        Per Section 13: context requirements must be verified against the
        agent's context window budget. Uses ~40 bytes/line as rough estimate.
        """
        violations = []
        total_lines = sum(e.estimated_lines for e in self.entries)
        estimated_kb = (total_lines * 40) // 1024
        if estimated_kb > context_budget_kb:
            violations.append(
                f"Context profile for '{self.agent_role}' estimates ~{estimated_kb}KB "
                f"({total_lines} lines) but agent budget is {context_budget_kb}KB. "
                f"Reduce entries or increase budget."
            )
        return violations
