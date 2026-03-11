"""Handoff Protocol models.

Implements Section 38 — Handoff Protocol.

Every time one agent's output becomes another's input, follow structured format.
Unstructured handoffs produce "I assumed you'd give me X" failures.

Routes through Orchestrator unless explicitly authorized otherwise.
Receiver validates before starting — if anything missing, handoff bounces back.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, model_validator


class HandoffRoute(str, Enum):
    """How the handoff is routed."""

    ORCHESTRATOR = "orchestrator"
    DIRECT = "direct"


class HandoffDocument(BaseModel):
    """Section 38 — Structured agent-to-agent handoff.

    Template:
        FROM: [sender role]
        TO: [receiver role]
        VIA: [Orchestrator | Direct if authorized]
        TASK: [what receiver should do]
        DELIVERABLE: [the actual output]
        ACCEPTANCE CRITERIA: [how receiver knows success]
        CONTEXT FILES: [what needs loaded]
        CONSTRAINTS: [budget, deadline, scope limits]
        ASSUMPTIONS: [what sender assumed that receiver should validate]
        OPEN QUESTIONS: [unresolved issues receiver should know about]
    """

    from_agent: str = Field(..., min_length=1, description="Sender agent role.")
    to_agent: str = Field(..., min_length=1, description="Receiver agent role.")
    via: HandoffRoute = Field(
        default=HandoffRoute.ORCHESTRATOR,
        description="Routing: through Orchestrator unless explicitly authorized for direct.",
    )
    task: str = Field(
        ...,
        min_length=1,
        description="What the receiver should do with this handoff.",
    )
    deliverable: str = Field(
        ...,
        min_length=1,
        description="The actual output being handed off.",
    )
    acceptance_criteria: list[str] = Field(
        ...,
        min_length=1,
        description="How receiver knows they've successfully processed this.",
    )
    context_files: list[str] = Field(
        default_factory=list,
        description="Files that need to be loaded by the receiver.",
    )
    constraints: dict[str, str] = Field(
        default_factory=dict,
        description="Budget, deadline, scope limits.",
    )
    assumptions: list[str] = Field(
        default_factory=list,
        description="What sender assumed that receiver should validate.",
    )
    open_questions: list[str] = Field(
        default_factory=list,
        description="Unresolved issues receiver should know about.",
    )
    metadata: dict[str, str] = Field(
        default_factory=dict,
        description="Domain extension point per fleet/interface-contracts.md.",
    )

    @model_validator(mode="after")
    def sender_and_receiver_differ(self) -> HandoffDocument:
        """Sender and receiver must be different agents."""
        if self.from_agent == self.to_agent:
            raise ValueError(
                f"Handoff sender and receiver must differ, both are '{self.from_agent}'."
            )
        return self

    def render(self) -> str:
        """Render as structured text matching Section 38 template."""
        lines = [
            f"FROM: {self.from_agent}",
            f"TO: {self.to_agent}",
            f"VIA: {self.via.value}",
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

        if self.constraints:
            lines.append("CONSTRAINTS:")
            for k, v in self.constraints.items():
                lines.append(f"  - {k}: {v}")

        if self.assumptions:
            lines.append("ASSUMPTIONS:")
            for a in self.assumptions:
                lines.append(f"  - {a}")

        if self.open_questions:
            lines.append("OPEN QUESTIONS:")
            for q in self.open_questions:
                lines.append(f"  - {q}")

        return "\n".join(lines)


def validate_handoff(doc: HandoffDocument) -> list[str]:
    """Validate a handoff document for completeness.

    Returns list of issues. Empty list = valid.
    """
    issues = []

    if not doc.acceptance_criteria:
        issues.append("Missing acceptance criteria — receiver cannot verify success.")

    if not doc.task.strip():
        issues.append("Empty task — receiver does not know what to do.")

    if not doc.deliverable.strip():
        issues.append("Empty deliverable — nothing to hand off.")

    if not doc.assumptions and not doc.open_questions:
        issues.append(
            "No assumptions or open questions listed. "
            "Real handoffs involve unknowns — verify this is complete."
        )

    return issues
