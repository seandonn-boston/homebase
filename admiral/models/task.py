"""Task decomposition and work chunk models.

Implements Section 18 — Work Decomposition and the Spec-First Pipeline.

Key principles:
    - 40% token budget rule: no chunk should consume more than 40% of budget
    - Quality > Completeness: deliver excellent partial over mediocre complete
    - Every chunk has entry/exit states, budget, quality gates, and owner
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class VerificationLevel(str, Enum):
    """Quality verification levels from Section 21."""

    SELF_CHECK = "self_check"
    PEER_REVIEW = "peer_review"
    ADMIRAL_REVIEW = "admiral_review"


class ChunkState(str, Enum):
    """Lifecycle states for a work chunk."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


class FailureScenario(BaseModel):
    """What happens when a criterion cannot be met.

    Per Section 03: Criteria without failure guidance create a judgment
    vacuum. Specify the action.
    """

    condition: str = Field(
        ...,
        description="The failure condition (e.g., 'Tests cannot pass').",
    )
    action: str = Field(
        ...,
        description="'escalate' | 'deliver_partial' | 'block_and_report'",
    )
    rationale: str = Field(
        default="",
        description="Why this action is appropriate for this failure.",
    )


class QualityGate(BaseModel):
    """A quality gate that must pass before a chunk is complete."""

    name: str
    command: str | None = Field(
        default=None,
        description="Machine-verifiable command (exit 0 = pass).",
    )
    description: str = Field(default="")
    verification_level: VerificationLevel = Field(
        default=VerificationLevel.SELF_CHECK,
    )


class Chunk(BaseModel):
    """A single unit of work in a task decomposition.

    Per Section 18: Chunks should not exceed 40% of token budget.
    Each chunk has clear entry/exit states.
    """

    id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    description: str = Field(default="")
    state: ChunkState = Field(default=ChunkState.PENDING)

    # Budget
    estimated_tokens: int | None = Field(default=None, ge=0)
    actual_tokens: int | None = Field(default=None, ge=0)

    # Entry/Exit
    entry_state: str = Field(
        default="",
        description="What must be true before this chunk starts.",
    )
    exit_state: str = Field(
        default="",
        description="What must be true when this chunk completes.",
    )

    # Quality
    quality_gates: list[QualityGate] = Field(default_factory=list)
    failure_scenarios: list[FailureScenario] = Field(default_factory=list)

    # Assignment
    assigned_agent: str | None = Field(default=None)
    dependencies: list[str] = Field(
        default_factory=list,
        description="IDs of chunks that must complete before this one starts.",
    )

    @property
    def is_terminal(self) -> bool:
        """Whether this chunk is in a terminal state."""
        return self.state in (
            ChunkState.COMPLETED,
            ChunkState.FAILED,
            ChunkState.SKIPPED,
        )

    def check_budget(self, total_budget: int) -> bool:
        """Check if estimated tokens respect the 40% rule."""
        if self.estimated_tokens is None or total_budget <= 0:
            return True
        return self.estimated_tokens <= total_budget * 0.4


class PipelineStage(str, Enum):
    """Stages in the Spec-First Pipeline."""

    MISSION = "mission"
    REQUIREMENTS = "requirements"
    DESIGN = "design"
    TASKS = "tasks"
    IMPLEMENTATION = "implementation"


class TaskDecomposition(BaseModel):
    """A complete task decomposition following the Spec-First Pipeline.

    Mission → Requirements → Design → Tasks → Implementation.
    """

    task_id: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    pipeline_stage: PipelineStage = Field(
        default=PipelineStage.TASKS,
        description="Current stage in the Spec-First Pipeline.",
    )
    chunks: list[Chunk] = Field(default_factory=list)
    total_token_budget: int | None = Field(default=None, ge=0)

    @property
    def pending_chunks(self) -> list[Chunk]:
        return [c for c in self.chunks if c.state == ChunkState.PENDING]

    @property
    def completed_chunks(self) -> list[Chunk]:
        return [c for c in self.chunks if c.state == ChunkState.COMPLETED]

    @property
    def blocked_chunks(self) -> list[Chunk]:
        return [c for c in self.chunks if c.state == ChunkState.BLOCKED]

    @property
    def progress(self) -> float:
        """Completion progress as a fraction (0.0 to 1.0)."""
        if not self.chunks:
            return 0.0
        terminal = sum(1 for c in self.chunks if c.is_terminal)
        return terminal / len(self.chunks)

    def validate_budget(self) -> list[str]:
        """Check all chunks respect the 40% token budget rule."""
        if self.total_token_budget is None:
            return []
        violations = []
        for chunk in self.chunks:
            if not chunk.check_budget(self.total_token_budget):
                violations.append(
                    f"Chunk '{chunk.id}' estimated {chunk.estimated_tokens} tokens "
                    f"exceeds 40% of budget ({self.total_token_budget * 0.4:.0f})"
                )
        return violations

    def get_ready_chunks(self) -> list[Chunk]:
        """Get chunks whose dependencies are all satisfied."""
        completed_ids = {c.id for c in self.completed_chunks}
        return [
            c
            for c in self.pending_chunks
            if all(dep in completed_ids for dep in c.dependencies)
        ]
