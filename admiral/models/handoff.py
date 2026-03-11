"""Handoff protocol models.

Implements Section 38 — Handoff Protocol and aiStrat/handoff/v1.schema.json.

The handoff protocol is the canonical format for inter-agent communication.
JSON is canonical for validation; text rendering for human/agent consumption.
Interface contracts extend the base schema via the metadata field using $ref.
"""

from __future__ import annotations

from enum import Enum as _Enum
from typing import Any

from pydantic import BaseModel, Field


class HandoffConstraints(BaseModel):
    """Budget, deadline, and scope constraints for a handoff."""

    token_budget_remaining: int | None = Field(
        default=None,
        ge=0,
        description="Remaining token budget for this task.",
    )
    deadline: str | None = Field(
        default=None,
        description="'session', 'next_session', or ISO 8601 timestamp.",
    )
    extra: dict[str, Any] = Field(
        default_factory=dict,
        description="Domain-specific constraints via additionalProperties.",
    )


class SessionHandoff(BaseModel):
    """Session-boundary handoff for work spanning context windows.

    From v1.schema.json: present only for session-boundary handoffs.
    This is how the fleet survives context boundaries.
    """

    session_id: str = Field(..., min_length=1)
    agent: str = Field(..., min_length=1, description="Agent role producing this handoff.")
    completed: list[str] = Field(
        default_factory=list,
        description="What was finished this session.",
    )
    in_progress: list[str] = Field(
        default_factory=list,
        description="What was started but not completed, with current state.",
    )
    blocked: list[str] = Field(
        default_factory=list,
        description="What could not proceed and why.",
    )
    decisions_made: list[str] = Field(
        default_factory=list,
        description="Key decisions with rationale.",
    )
    next_session_should: list[str] = Field(
        ...,
        min_length=1,
        description="Prioritized list of what to do next.",
    )
    critical_context: list[str] = Field(
        default_factory=list,
        description="Information the next session absolutely must have loaded.",
    )


class HandoffVia(str, _Enum):
    """Routing path for handoffs."""

    ORCHESTRATOR = "Orchestrator"
    DIRECT = "Direct"


class HandoffDocument(BaseModel):
    """The canonical inter-agent handoff document.

    Validated against aiStrat/handoff/v1.schema.json.
    Required fields: from, to, via, task, deliverable, acceptance_criteria.

    Per Section 38: Handoffs transfer WORK, not UNCERTAINTY.
    If Agent A is uncertain, it escalates to the Orchestrator — it does
    not hand the uncertainty to Agent B as a task.
    """

    from_agent: str = Field(
        ...,
        min_length=1,
        alias="from",
        description="Sending agent role.",
    )
    to_agent: str = Field(
        ...,
        min_length=1,
        alias="to",
        description="Receiving agent role.",
    )
    via: HandoffVia = Field(
        ...,
        description="'Orchestrator' or 'Direct'.",
    )
    task: str = Field(
        ...,
        min_length=1,
        description="What the receiving agent should do.",
    )
    deliverable: str = Field(
        ...,
        min_length=1,
        description="The actual output — code diff, spec, audit report, etc.",
    )
    acceptance_criteria: list[str] = Field(
        ...,
        min_length=1,
        description="How the receiver knows they succeeded.",
    )
    context_files: list[str] = Field(
        default_factory=list,
        description="Files the receiver needs loaded.",
    )
    constraints: HandoffConstraints | None = None
    assumptions: list[str] = Field(
        default_factory=list,
        description="Assumptions the sender made that the receiver should validate.",
    )
    open_questions: list[str] = Field(
        default_factory=list,
        description="Unresolved issues the receiver should be aware of.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Extension point for domain-specific fields.",
    )
    session_handoff: SessionHandoff | None = Field(
        default=None,
        description="Present only for session-boundary handoffs.",
    )

    model_config = {"populate_by_name": True}

    def to_text(self) -> str:
        """Render as human/agent-readable text format.

        Per the spec: JSON is canonical for validation,
        text rendering for human/agent consumption.
        """
        lines = [
            f"HANDOFF: {self.from_agent} → {self.to_agent} (via {self.via})",
            f"TASK: {self.task}",
            f"DELIVERABLE: {self.deliverable}",
            "ACCEPTANCE CRITERIA:",
        ]
        for criterion in self.acceptance_criteria:
            lines.append(f"  - {criterion}")

        if self.context_files:
            lines.append("CONTEXT FILES:")
            for f in self.context_files:
                lines.append(f"  - {f}")

        if self.assumptions:
            lines.append("ASSUMPTIONS:")
            for a in self.assumptions:
                lines.append(f"  - {a}")

        if self.open_questions:
            lines.append("OPEN QUESTIONS:")
            for q in self.open_questions:
                lines.append(f"  - {q}")

        return "\n".join(lines)

    def to_schema_dict(self) -> dict[str, Any]:
        """Export as dict matching v1.schema.json field names."""
        d: dict[str, Any] = {
            "$schema": "handoff/v1",
            "from": self.from_agent,
            "to": self.to_agent,
            "via": self.via,
            "task": self.task,
            "deliverable": self.deliverable,
            "acceptance_criteria": self.acceptance_criteria,
        }
        if self.context_files:
            d["context_files"] = self.context_files
        if self.constraints:
            d["constraints"] = {
                k: v
                for k, v in self.constraints.model_dump().items()
                if v is not None and k != "extra"
            }
            d["constraints"].update(self.constraints.extra)
        if self.assumptions:
            d["assumptions"] = self.assumptions
        if self.open_questions:
            d["open_questions"] = self.open_questions
        if self.metadata:
            d["metadata"] = self.metadata
        if self.session_handoff:
            d["session_handoff"] = self.session_handoff.model_dump(exclude_none=True)
        return d
