"""Failure Recovery models.

Implements Section 22 — Failure Recovery.

Five-step recovery ladder: retry with variation, fallback to simpler approach,
backtrack to last-known-good state, isolate and skip, escalate.
No skipping rungs. No silent recoveries. Every recovery action is logged.
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field, model_validator


class RecoveryStep(str, Enum):
    """The five rungs of the recovery ladder.

    Per Section 22: no skipping rungs. An agent that jumps from retry
    to escalation has either insufficient context about fallback options
    or unclear authority boundaries.
    """

    RETRY = "retry"
    FALLBACK = "fallback"
    BACKTRACK = "backtrack"
    ISOLATE = "isolate"
    ESCALATE = "escalate"


# Canonical ordering — defines rung precedence
RECOVERY_LADDER_ORDER = [
    RecoveryStep.RETRY,
    RecoveryStep.FALLBACK,
    RecoveryStep.BACKTRACK,
    RecoveryStep.ISOLATE,
    RecoveryStep.ESCALATE,
]


class RetryConfig(BaseModel):
    """Configuration for the retry step.

    Per Section 22: retry must be meaningfully different, not the same
    approach repeated. Max 2-3 retries.
    """

    max_retries: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Maximum retry attempts. Spec recommends 2-3.",
    )


class FallbackConfig(BaseModel):
    """Configuration for the fallback step.

    Per Section 22: known-safe fallback producing lesser but acceptable result.
    Defined in advance.
    """

    description: str = Field(
        default="",
        description="What the fallback approach is.",
    )
    quality_floor: str = Field(
        default="",
        description="Minimum acceptable quality from the fallback.",
    )


class RecoveryLadder(BaseModel):
    """The fleet's recovery configuration.

    Per Section 22: the ladder preserves agent autonomy for as long as
    possible and escalates only when autonomy is exhausted.

    Standing Order 6 documents the behavioral protocol. This model
    configures the operational parameters.
    """

    retry: RetryConfig = Field(default_factory=RetryConfig)
    fallback: FallbackConfig = Field(default_factory=FallbackConfig)
    escalation_template_ready: bool = Field(
        default=False,
        description="Whether the escalation report template (Section 37) is available.",
    )
    log_all_recovery_actions: bool = Field(
        default=True,
        description="Per Section 22: no silent recoveries. Every action is logged.",
    )

    def validate_readiness(self) -> list[str]:
        """Check that the recovery ladder is ready for deployment.

        Returns list of issues. Empty = ready.
        """
        issues = []
        if not self.escalation_template_ready:
            issues.append(
                "Escalation template not ready. Section 37 report format "
                "must be available before fleet deployment."
            )
        if not self.fallback.description:
            issues.append(
                "No fallback approach described. Section 22 requires "
                "fallbacks to be defined in advance."
            )
        return issues


class RecoveryRecord(BaseModel):
    """A single recovery action taken during execution.

    Per Section 22: every recovery action is logged. No silent fallbacks.
    If Assumptions and Recovery Actions are both empty in a checkpoint,
    be suspicious — real work involves at least minor recoveries.
    """

    step: RecoveryStep
    task_id: str = Field(default="", description="Which task triggered recovery.")
    attempt: int = Field(default=1, ge=1, description="Attempt number within this step.")
    description: str = Field(
        ...,
        min_length=1,
        description="What was tried.",
    )
    outcome: str = Field(
        default="",
        description="What happened (success, failure, partial).",
    )
    next_step: RecoveryStep | None = Field(
        default=None,
        description="Which ladder step comes next, if this one failed.",
    )

    @model_validator(mode="after")
    def next_step_must_be_higher(self) -> RecoveryRecord:
        """Next step must be the next rung on the ladder, not a skip."""
        if self.next_step is not None:
            current_idx = RECOVERY_LADDER_ORDER.index(self.step)
            next_idx = RECOVERY_LADDER_ORDER.index(self.next_step)
            if next_idx <= current_idx:
                raise ValueError(
                    f"Recovery must progress up the ladder: "
                    f"'{self.step.value}' cannot go to '{self.next_step.value}'. "
                    f"No skipping rungs, no going backward."
                )
            if next_idx > current_idx + 1:
                raise ValueError(
                    f"Recovery must not skip rungs: "
                    f"'{self.step.value}' must go to "
                    f"'{RECOVERY_LADDER_ORDER[current_idx + 1].value}', "
                    f"not '{self.next_step.value}'."
                )
        return self
