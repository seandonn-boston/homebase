"""Tests for enforcement spectrum behavior.

Phase 1: Validates constraint classification, enforcement level assignment,
and coverage validation.
"""

from __future__ import annotations

import pytest

from admiral.models.enforcement import (
    EnforcementLevel,
    Constraint,
    ConstraintCategory,
    ConstraintClassification,
)


@pytest.mark.phase1
class TestEnforcementSpectrum:
    """Tests verifying the three-level enforcement spectrum from Section 08."""

    def test_security_constraints_must_be_hooks(self):
        """Per Section 08: Safety, security, and scope limits MUST be hooks."""
        cc = ConstraintClassification(
            constraints=[
                Constraint(
                    name="Block rm -rf",
                    description="Prevent destructive deletion",
                    category=ConstraintCategory.SECURITY,
                    level=EnforcementLevel.HOOK,
                    mechanism="PreToolUse hook",
                ),
                Constraint(
                    name="Scope boundary",
                    description="Prevent modification outside assigned dirs",
                    category=ConstraintCategory.SCOPE,
                    level=EnforcementLevel.HOOK,
                    mechanism="PreToolUse hook",
                ),
            ]
        )
        violations = cc.validate_coverage()
        assert len(violations) == 0

    def test_security_as_instruction_is_violation(self):
        cc = ConstraintClassification(
            constraints=[
                Constraint(
                    name="Prevent secrets in code",
                    description="Should be hook but is instruction",
                    category=ConstraintCategory.SECURITY,
                    level=EnforcementLevel.INSTRUCTION,
                    mechanism="AGENTS.md",
                ),
            ]
        )
        violations = cc.validate_coverage()
        assert len(violations) == 1

    def test_quality_as_instruction_is_acceptable(self):
        """Quality constraints CAN be instructions (firm guidance)."""
        cc = ConstraintClassification(
            constraints=[
                Constraint(
                    name="Follow naming conventions",
                    description="Use consistent naming",
                    category=ConstraintCategory.QUALITY,
                    level=EnforcementLevel.INSTRUCTION,
                    mechanism="AGENTS.md",
                ),
            ]
        )
        violations = cc.validate_coverage()
        assert len(violations) == 0

    def test_full_enforcement_classification(self):
        """Complete classification matching Section 08 template."""
        cc = ConstraintClassification(
            constraints=[
                # Hard enforcement (hooks)
                Constraint(
                    name="Block rm -rf /",
                    description="Block destructive commands",
                    category=ConstraintCategory.SECURITY,
                    level=EnforcementLevel.HOOK,
                    mechanism="PreToolUse: block_dangerous_commands",
                ),
                Constraint(
                    name="Secret scanning",
                    description="Prevent commits with secrets",
                    category=ConstraintCategory.SECURITY,
                    level=EnforcementLevel.HOOK,
                    mechanism="PreCommit: scan_secrets",
                ),
                Constraint(
                    name="File scope",
                    description="Block modifications outside assigned dirs",
                    category=ConstraintCategory.SCOPE,
                    level=EnforcementLevel.HOOK,
                    mechanism="PreToolUse: validate_scope",
                ),
                Constraint(
                    name="Token budget",
                    description="Kill session after budget exceeded",
                    category=ConstraintCategory.COST,
                    level=EnforcementLevel.HOOK,
                    mechanism="PreToolUse: token_budget_gate",
                ),
                # Firm guidance (instructions)
                Constraint(
                    name="Coding patterns",
                    description="Follow established patterns",
                    category=ConstraintCategory.QUALITY,
                    level=EnforcementLevel.INSTRUCTION,
                    mechanism="AGENTS.md",
                ),
                # Soft guidance (reference)
                Constraint(
                    name="Code style preferences",
                    description="Prefer early returns",
                    category=ConstraintCategory.QUALITY,
                    level=EnforcementLevel.GUIDANCE,
                    mechanism="README.md",
                ),
            ]
        )
        assert len(cc.hooks) == 4
        assert len(cc.instructions) == 1
        assert len(cc.guidance) == 1
        assert len(cc.validate_coverage()) == 0
        assert len(cc.get_by_category(ConstraintCategory.SECURITY)) == 2
