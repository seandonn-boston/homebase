"""Tests for all core data models.

Level 1: Validates that every spec structure serializes, validates,
and rejects invalid input correctly.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from admiral.models.mission import (
    Mission,
    Boundaries,
    SuccessCriteria,
    Criterion,
    CriterionCategory,
    ProjectPhase,
    PipelineEntry,
    ResourceBudgets,
    LLMLastBoundary,
)
from admiral.models.enforcement import (
    EnforcementLevel,
    Constraint,
    ConstraintCategory,
    ConstraintClassification,
)
from admiral.models.authority import (
    DecisionTier,
    DecisionAuthority,
    AuthorityAssignment,
    CalibrationCondition,
    CalibrationRule,
)
from admiral.models.agent import (
    AgentDefinition,
    AgentCategory,
    ModelTier,
    ScheduleType,
    AgentScope,
    ToolPermission,
)


# === Mission Models ===

@pytest.mark.phase1
class TestMission:
    def test_create_valid_mission(self, sample_mission):
        assert sample_mission.phase == ProjectPhase.GREENFIELD
        assert sample_mission.pipeline_entry == PipelineEntry.IMPLEMENTATION

    def test_mission_requires_identity(self):
        with pytest.raises(ValidationError):
            Mission(
                identity="",
                success_state="Tests pass",
                stakeholders="Engineers",
                phase=ProjectPhase.GREENFIELD,
            )

    def test_all_project_phases(self):
        for phase in ProjectPhase:
            m = Mission(
                identity="Test project",
                success_state="Done",
                stakeholders="Team",
                phase=phase,
            )
            assert m.phase == phase

    def test_all_pipeline_entries(self):
        for entry in PipelineEntry:
            m = Mission(
                identity="Test",
                success_state="Done",
                stakeholders="Team",
                phase=ProjectPhase.GREENFIELD,
                pipeline_entry=entry,
            )
            assert m.pipeline_entry == entry


@pytest.mark.phase1
class TestBoundaries:
    def test_empty_boundaries(self):
        b = Boundaries()
        assert b.non_goals_functional == []
        assert b.non_goals_quality == []
        assert b.non_goals_architectural == []

    def test_boundaries_with_budgets(self):
        b = Boundaries(
            non_goals_functional=["No mobile app"],
            resource_budgets=ResourceBudgets(
                token_budget=200_000,
                time_budget_minutes=30,
                scope_paths=["src/"],
            ),
        )
        assert b.resource_budgets.token_budget == 200_000
        assert "No mobile app" in b.non_goals_functional

    def test_llm_last_boundary(self):
        b = Boundaries(
            llm_last=LLMLastBoundary(
                deterministic_handles=["linting", "formatting"],
                llm_handles=["architecture decisions"],
            ),
        )
        assert len(b.llm_last.deterministic_handles) == 2


@pytest.mark.phase1
class TestSuccessCriteria:
    def test_create_criteria(self):
        sc = SuccessCriteria(
            criteria=[
                Criterion(
                    category=CriterionCategory.FUNCTIONAL,
                    description="pytest exits 0",
                    verification_command="pytest",
                ),
                Criterion(
                    category=CriterionCategory.QUALITY,
                    description="No lint errors",
                ),
                Criterion(
                    category=CriterionCategory.NEGATIVE,
                    description="No files outside admiral/",
                ),
            ],
        )
        assert len(sc.functional) == 1
        assert len(sc.quality) == 1
        assert len(sc.negative) == 1

    def test_criteria_requires_at_least_one(self):
        with pytest.raises(ValidationError):
            SuccessCriteria(criteria=[])


# === Enforcement Models ===

@pytest.mark.phase1
class TestEnforcement:
    def test_enforcement_levels(self):
        assert EnforcementLevel.HOOK.value == "hook"
        assert EnforcementLevel.INSTRUCTION.value == "instruction"
        assert EnforcementLevel.GUIDANCE.value == "guidance"

    def test_constraint_is_deterministic(self):
        hook_constraint = Constraint(
            name="Block rm -rf",
            description="Prevent destructive file deletion",
            category=ConstraintCategory.SECURITY,
            level=EnforcementLevel.HOOK,
            mechanism="PreToolUse hook",
        )
        assert hook_constraint.is_deterministic is True

        instruction_constraint = Constraint(
            name="Follow naming conventions",
            description="Use kebab-case for files",
            category=ConstraintCategory.QUALITY,
            level=EnforcementLevel.INSTRUCTION,
            mechanism="AGENTS.md",
        )
        assert instruction_constraint.is_deterministic is False

    def test_classification_coverage_validation(self):
        cc = ConstraintClassification(
            constraints=[
                Constraint(
                    name="Block dangerous commands",
                    description="Security constraint as instruction (violation!)",
                    category=ConstraintCategory.SECURITY,
                    level=EnforcementLevel.INSTRUCTION,
                    mechanism="AGENTS.md",
                ),
            ]
        )
        violations = cc.validate_coverage()
        assert len(violations) == 1
        assert "should be hook-enforced" in violations[0]

    def test_classification_getters(self):
        cc = ConstraintClassification(
            constraints=[
                Constraint(name="Hook1", description="d", category=ConstraintCategory.SECURITY, level=EnforcementLevel.HOOK, mechanism="hook"),
                Constraint(name="Inst1", description="d", category=ConstraintCategory.QUALITY, level=EnforcementLevel.INSTRUCTION, mechanism="agents.md"),
                Constraint(name="Guide1", description="d", category=ConstraintCategory.QUALITY, level=EnforcementLevel.GUIDANCE, mechanism="readme"),
            ]
        )
        assert len(cc.hooks) == 1
        assert len(cc.instructions) == 1
        assert len(cc.guidance) == 1


# === Authority Models ===

@pytest.mark.phase1
class TestAuthority:
    def test_decision_tiers(self):
        assert DecisionTier.ENFORCED.value == "enforced"
        assert DecisionTier.AUTONOMOUS.value == "autonomous"
        assert DecisionTier.PROPOSE.value == "propose"
        assert DecisionTier.ESCALATE.value == "escalate"

    def test_authority_table(self):
        da = DecisionAuthority(
            assignments=[
                AuthorityAssignment(
                    decision="Add new dependency",
                    tier=DecisionTier.PROPOSE,
                    examples=["Adding lodash", "Adding new ORM"],
                ),
                AuthorityAssignment(
                    decision="Variable naming",
                    tier=DecisionTier.AUTONOMOUS,
                ),
                AuthorityAssignment(
                    decision="Scope change",
                    tier=DecisionTier.ESCALATE,
                ),
            ]
        )
        assert da.get_tier("Add new dependency") == DecisionTier.PROPOSE
        assert da.get_tier("Variable naming") == DecisionTier.AUTONOMOUS
        assert da.get_tier("Unknown") is None
        assert len(da.propose) == 1
        assert len(da.autonomous) == 1
        assert len(da.escalate) == 1


# === Agent Models ===

@pytest.mark.phase1
class TestAgent:
    def test_create_agent(self, sample_agent):
        assert sample_agent.name == "Backend Implementer"
        assert sample_agent.model_tier == ModelTier.WORKHORSE
        assert sample_agent.is_core_fleet is True

    def test_prompt_anchor(self, sample_agent):
        anchor = sample_agent.prompt_anchor
        assert "Backend Implementer" in anchor
        assert "workhorse" in anchor

    def test_all_model_tiers(self):
        for tier in ModelTier:
            a = AgentDefinition(
                name=f"Test Agent ({tier.value})",
                category=AgentCategory.ENGINEERING_BACKEND,
                model_tier=tier,
            )
            assert a.model_tier == tier

    def test_all_categories(self):
        for cat in AgentCategory:
            a = AgentDefinition(
                name=f"Test Agent ({cat.value})",
                category=cat,
                model_tier=ModelTier.WORKHORSE,
            )
            assert a.category == cat
