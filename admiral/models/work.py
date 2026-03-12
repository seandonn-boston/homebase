"""Work Decomposition models.

Implements Section 18 — Work Decomposition.

Break goals into chunks that consume no more than 40% of an agent's token budget.
Each chunk: independently completable, independently verifiable, explicit
entry/exit states.

Anti-pattern: Completion Bias — delivering all endpoints with last 4 untested.
Better to deliver 3 endpoints with full quality than 12 with degraded quality.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, model_validator


# Spec ceiling: no chunk should consume more than 40% of agent token budget
CHUNK_BUDGET_CEILING_PCT = 40


class ChunkState(str, Enum):
    """State of a work chunk."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    FAILED = "failed"


class QualityGate(BaseModel):
    """A quality check that must pass before a chunk is considered done."""

    name: str = Field(..., min_length=1)
    command: str | None = Field(
        default=None,
        description="Machine-verifiable command (e.g., 'pytest tests/test_auth.py').",
    )
    description: str = Field(
        default="",
        description="What this gate checks.",
    )


class WorkChunk(BaseModel):
    """A single unit of decomposed work.

    Each chunk is independently completable and verifiable.
    Budget must not exceed 40% of the agent's total token budget.
    """

    id: str = Field(..., min_length=1, description="Unique chunk identifier.")
    description: str = Field(..., min_length=1)
    agent_role: str = Field(
        default="",
        description="Which agent role handles this chunk.",
    )
    state: ChunkState = Field(default=ChunkState.PENDING)

    # Entry/Exit
    entry_state: list[str] = Field(
        default_factory=list,
        description="Preconditions that must be true before starting.",
    )
    exit_state: list[str] = Field(
        default_factory=list,
        description="Deliverables and criteria that define completion.",
    )

    # Budget
    token_budget: int | None = Field(
        default=None,
        gt=0,
        description="Max tokens allocated to this chunk.",
    )
    agent_total_budget: int | None = Field(
        default=None,
        gt=0,
        description="Agent's total token budget (used for 40% ceiling check).",
    )

    # Quality
    quality_gates: list[QualityGate] = Field(default_factory=list)
    quality_floor: str | None = Field(
        default=None,
        description="Minimum acceptable quality if budget is tight.",
    )

    # Dependencies
    depends_on: list[str] = Field(
        default_factory=list,
        description="Chunk IDs that must complete before this one starts.",
    )

    @model_validator(mode="after")
    def validate_budget_ceiling(self) -> WorkChunk:
        """Enforce 40% budget ceiling per Section 18.

        If both token_budget and agent_total_budget are set, validates
        that the chunk doesn't exceed CHUNK_BUDGET_CEILING_PCT of total.
        """
        if self.token_budget and self.agent_total_budget:
            pct = (self.token_budget / self.agent_total_budget) * 100
            if pct > CHUNK_BUDGET_CEILING_PCT:
                raise ValueError(
                    f"Chunk '{self.id}' budget is {pct:.0f}% of agent budget, "
                    f"exceeds {CHUNK_BUDGET_CEILING_PCT}% ceiling. "
                    f"Break into smaller chunks."
                )
        return self


class Decomposition(BaseModel):
    """A goal decomposed into ordered work chunks.

    Section 18: Front-load uncertainty — tackle hard, unknown parts first
    when resources are fresh.
    """

    goal: str = Field(..., min_length=1, description="High-level objective.")
    chunks: list[WorkChunk] = Field(default_factory=list, min_length=1)
    uncertainty_first: bool = Field(
        default=True,
        description="Whether chunks are ordered by uncertainty descending.",
    )

    def pending(self) -> list[WorkChunk]:
        """Chunks not yet started."""
        return [c for c in self.chunks if c.state == ChunkState.PENDING]

    def in_progress(self) -> list[WorkChunk]:
        """Chunks currently being worked on."""
        return [c for c in self.chunks if c.state == ChunkState.IN_PROGRESS]

    def completed(self) -> list[WorkChunk]:
        """Chunks that are done."""
        return [c for c in self.chunks if c.state == ChunkState.COMPLETED]

    def blocked(self) -> list[WorkChunk]:
        """Chunks that are blocked."""
        return [c for c in self.chunks if c.state == ChunkState.BLOCKED]

    def next_actionable(self) -> WorkChunk | None:
        """Return the next chunk whose dependencies are all completed."""
        completed_ids = {c.id for c in self.completed()}
        for chunk in self.pending():
            if all(dep in completed_ids for dep in chunk.depends_on):
                return chunk
        return None

    def validate_chunk_ids(self) -> list[str]:
        """Check that all dependency references point to real chunks."""
        all_ids = {c.id for c in self.chunks}
        violations = []
        for chunk in self.chunks:
            for dep in chunk.depends_on:
                if dep not in all_ids:
                    violations.append(
                        f"Chunk '{chunk.id}' depends on '{dep}' which does not exist."
                    )
        return violations
