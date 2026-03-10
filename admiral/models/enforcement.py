"""Enforcement spectrum models.

Implements Section 08 — Deterministic Enforcement.

The gap between "should" and "must." An instruction in AGENTS.md saying
"never use rm -rf" can be forgotten. A PreToolUse hook that blocks it
fires every single time. Any constraint that must hold with zero exceptions
must be a hook, not an instruction.

Three levels:
    Hard enforcement (hooks)     — 100% reliable, deterministic
    Firm guidance (instructions) — High but degradable under context pressure
    Soft guidance (reference)    — Low, easily overridden
"""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class EnforcementLevel(str, Enum):
    """The three levels of the enforcement spectrum.

    HOOK: 100% — fires deterministically every time.
    INSTRUCTION: High but degradable under context pressure.
    GUIDANCE: Low — easily overridden, suggestions only.
    """

    HOOK = "hook"
    INSTRUCTION = "instruction"
    GUIDANCE = "guidance"


class ConstraintCategory(str, Enum):
    """Categories that determine enforcement level assignment."""

    SECURITY = "security"
    QUALITY = "quality"
    SCOPE = "scope"
    PROCESS = "process"
    COST = "cost"


class Constraint(BaseModel):
    """A single constraint with its enforcement classification.

    Per Section 08, every constraint falls somewhere on the enforcement
    spectrum. The classification determines HOW it is enforced.
    """

    name: str = Field(..., min_length=1)
    description: str = Field(..., min_length=1)
    category: ConstraintCategory
    level: EnforcementLevel
    mechanism: str = Field(
        ...,
        min_length=1,
        description=(
            "For HOOK: the hook event and command. "
            "For INSTRUCTION: where documented. "
            "For GUIDANCE: where noted."
        ),
    )

    @property
    def is_deterministic(self) -> bool:
        """Whether this constraint fires deterministically (hook-enforced)."""
        return self.level == EnforcementLevel.HOOK


class ConstraintClassification(BaseModel):
    """The full enforcement classification for a project.

    Template from Section 08:
        HARD ENFORCEMENT (hooks): ...
        FIRM GUIDANCE (instructions): ...
        SOFT GUIDANCE (reference): ...
    """

    constraints: list[Constraint] = Field(default_factory=list)

    @property
    def hooks(self) -> list[Constraint]:
        """All hook-enforced constraints (hard enforcement)."""
        return [c for c in self.constraints if c.level == EnforcementLevel.HOOK]

    @property
    def instructions(self) -> list[Constraint]:
        """All instruction-enforced constraints (firm guidance)."""
        return [c for c in self.constraints if c.level == EnforcementLevel.INSTRUCTION]

    @property
    def guidance(self) -> list[Constraint]:
        """All reference-enforced constraints (soft guidance)."""
        return [c for c in self.constraints if c.level == EnforcementLevel.GUIDANCE]

    def get_by_category(self, category: ConstraintCategory) -> list[Constraint]:
        """Get all constraints for a given category."""
        return [c for c in self.constraints if c.category == category]

    def validate_coverage(self) -> list[str]:
        """Check that security and scope constraints are hook-enforced.

        Per Section 08: Safety, security, and scope limits MUST be hooks.
        Returns list of violations.
        """
        violations = []
        for constraint in self.constraints:
            if constraint.category in (
                ConstraintCategory.SECURITY,
                ConstraintCategory.SCOPE,
            ) and constraint.level != EnforcementLevel.HOOK:
                violations.append(
                    f"Constraint '{constraint.name}' ({constraint.category.value}) "
                    f"should be hook-enforced but is {constraint.level.value}"
                )
        return violations
