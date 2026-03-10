"""Mission, Boundaries, and Success Criteria models.

Implements the Strategy triangle from Part 1 (Sections 01-03):
Mission (destination) + Boundaries (fences) + Success Criteria (finish line).

Every downstream artifact derives from this triangle. If any vertex is missing,
the fleet will infer one, and the inference will be subtly wrong.
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class ProjectPhase(str, Enum):
    """Current project phase — changes how agents approach ambiguity and risk."""

    GREENFIELD = "greenfield"
    FEATURE_ADD = "feature-add"
    REFACTOR = "refactor"
    MIGRATION = "migration"
    MAINTENANCE = "maintenance"


class PipelineEntry(str, Enum):
    """Where the fleet takes over in the Spec-First Pipeline.

    Mission → Requirements → Design → Tasks → Implementation.
    """

    REQUIREMENTS = "Requirements"
    DESIGN = "Design"
    TASKS = "Tasks"
    IMPLEMENTATION = "Implementation"


class Mission(BaseModel):
    """Section 01 — The strategic frame that prevents drift.

    Template:
        This project is [one-sentence identity].
        It is successful when [concrete, observable success state].
        It is built for [stakeholders/audience] who need [core need].
        Current phase: [phase].
        Pipeline entry: Fleet takes over at [stage].
    """

    identity: str = Field(
        ...,
        min_length=1,
        description="One-sentence project identity. If you cannot express it in a single sentence, the fleet will not stay aligned.",
    )
    success_state: str = Field(
        ...,
        min_length=1,
        description="Concrete, observable success state. Not 'a great user experience' but measurable outcomes.",
    )
    stakeholders: str = Field(
        ...,
        min_length=1,
        description="Who this is for and their core need.",
    )
    phase: ProjectPhase = Field(
        ...,
        description="Current project phase.",
    )
    pipeline_entry: PipelineEntry = Field(
        default=PipelineEntry.IMPLEMENTATION,
        description="Where the fleet takes over in the Spec-First Pipeline.",
    )


class ResourceBudgets(BaseModel):
    """Resource budgets from Section 02.

    Prevents unbounded exploration, runaway loops, and brute-forcing.
    """

    token_budget: int | None = Field(
        default=None,
        gt=0,
        description="Max tokens per task before agent must deliver or escalate.",
    )
    time_budget_minutes: int | None = Field(
        default=None,
        gt=0,
        description="Wall-clock time limit per task in minutes.",
    )
    tool_call_limit: int | None = Field(
        default=None,
        gt=0,
        description="Max API calls or tool invocations per task.",
    )
    scope_paths: list[str] = Field(
        default_factory=list,
        description="File paths, repos, and services each agent may touch.",
    )
    quality_floor: str | None = Field(
        default=None,
        description="Minimum acceptable quality bar, defined concretely.",
    )


class LLMLastBoundary(BaseModel):
    """The LLM-Last boundary from Section 02.

    Single highest-impact cost and reliability lever in fleet operations.
    If a static tool can do it, the LLM should not.
    """

    deterministic_handles: list[str] = Field(
        default_factory=list,
        description="Tasks handled by static analysis, regex, linters, shell commands.",
    )
    llm_handles: list[str] = Field(
        default_factory=list,
        description="Tasks requiring understanding of intent, tradeoffs, novel design.",
    )


class Boundaries(BaseModel):
    """Section 02 — The single most effective tool against agent drift.

    Non-goals eliminate more bad work than goals create good work.
    """

    non_goals_functional: list[str] = Field(
        default_factory=list,
        description="Features, capabilities, or user flows explicitly out of scope.",
    )
    non_goals_quality: list[str] = Field(
        default_factory=list,
        description="Levels of polish or optimization not required at this phase.",
    )
    non_goals_architectural: list[str] = Field(
        default_factory=list,
        description="Patterns, technologies, or approaches that must not be used.",
    )
    hard_constraints: dict[str, str] = Field(
        default_factory=dict,
        description="Tech stack, deadlines, compatibility, regulatory constraints.",
    )
    resource_budgets: ResourceBudgets = Field(
        default_factory=ResourceBudgets,
    )
    llm_last: LLMLastBoundary = Field(
        default_factory=LLMLastBoundary,
    )


class CriterionCategory(str, Enum):
    """Categories of success criteria from Section 03."""

    FUNCTIONAL = "functional"
    QUALITY = "quality"
    COMPLETENESS = "completeness"
    NEGATIVE = "negative"


class Criterion(BaseModel):
    """A single success criterion."""

    category: CriterionCategory
    description: str = Field(..., min_length=1)
    verification_command: str | None = Field(
        default=None,
        description="Machine-verifiable command (e.g., 'npm run lint' exits 0).",
    )
    failure_action: str | None = Field(
        default=None,
        description="What happens when criterion cannot be met: escalate | deliver partial | block.",
    )
    judgment_boundary: str | None = Field(
        default=None,
        description="Where the criterion is ambiguous — name it explicitly.",
    )


class SuccessCriteria(BaseModel):
    """Section 03 — Machine-verifiable definition of done.

    Every task needs a definition of done. Without one, agents either
    under-deliver or loop forever.
    """

    criteria: list[Criterion] = Field(
        default_factory=list,
        min_length=1,
        description="List of acceptance criteria across all categories.",
    )
    verification_level: str = Field(
        default="self_check",
        description="Self-Check | Peer Review | Admiral Review",
    )

    @property
    def functional(self) -> list[Criterion]:
        return [c for c in self.criteria if c.category == CriterionCategory.FUNCTIONAL]

    @property
    def quality(self) -> list[Criterion]:
        return [c for c in self.criteria if c.category == CriterionCategory.QUALITY]

    @property
    def negative(self) -> list[Criterion]:
        return [c for c in self.criteria if c.category == CriterionCategory.NEGATIVE]
