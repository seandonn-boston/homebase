"""Shared test fixtures for Admiral Framework tests."""

from __future__ import annotations

import pytest

from admiral.models.mission import (
    Mission,
    Boundaries,
    SuccessCriteria,
    Criterion,
    CriterionCategory,
    ProjectPhase,
    PipelineEntry,
    ResourceBudgets,
)
from admiral.models.agent import (
    AgentDefinition,
    AgentCategory,
    AgentScope,
    ModelTier,
    ScheduleType,
    ToolPermission,
    ContractDirection,
    InterfaceContractRef,
    GuardrailEnforcement,
    GuardrailDef,
)
from admiral.models.ground_truth import (
    GroundTruth,
    TechStackEntry,
    KnownIssue,
    KnownIssueSeverity,
    ConfigurationStatus,
)
from admiral.models.context import ContextProfile, ContextBudget, ContextEntry, ContextSlot
from admiral.models.fleet import FleetRoster, RoutingRule, RoutingTable
from admiral.models.checkpoint import Checkpoint, TaskRecord, TaskStatus, DecisionLog
from admiral.models.handoff import HandoffDocument
from admiral.hooks.engine import HookEngine, HookResult
from admiral.hooks.lifecycle import HookEvent
from admiral.hooks.manifest import HookManifest


@pytest.fixture
def sample_mission() -> Mission:
    return Mission(
        identity="Admiral Framework is a governance system for autonomous AI agent fleets.",
        success_state="All 71 core agents can be instantiated, routed, and governed with zero manual intervention.",
        stakeholders="AI engineers and fleet operators who need production-grade agent governance.",
        phase=ProjectPhase.GREENFIELD,
        pipeline_entry=PipelineEntry.IMPLEMENTATION,
    )


@pytest.fixture
def sample_agent() -> AgentDefinition:
    return AgentDefinition(
        name="Backend Implementer",
        category=AgentCategory.ENGINEERING_BACKEND,
        model_tier=ModelTier.WORKHORSE,
        schedule=ScheduleType.TRIGGERED,
        description="Implements backend services, APIs, and data access layers.",
        is_core_fleet=True,
    )


@pytest.fixture
def sample_ground_truth() -> GroundTruth:
    return GroundTruth(
        glossary={"Admiral": "Fleet governance framework"},
        tech_stack=[
            TechStackEntry(name="Python", version="3.12", purpose="Runtime"),
            TechStackEntry(name="Pydantic", version="2.5.0", purpose="Validation"),
        ],
        known_issues=[
            KnownIssue(
                description="Token counts are estimates",
                severity=KnownIssueSeverity.MEDIUM,
            ),
        ],
        config_status=ConfigurationStatus(hooks_count=5),
    )


@pytest.fixture
def sample_fleet() -> FleetRoster:
    agents = [
        AgentDefinition(
            name="Orchestrator",
            category=AgentCategory.COMMAND,
            model_tier=ModelTier.FLAGSHIP,
            is_core_fleet=True,
        ),
        AgentDefinition(
            name="Backend Implementer",
            category=AgentCategory.ENGINEERING_BACKEND,
            model_tier=ModelTier.WORKHORSE,
            is_core_fleet=True,
        ),
        AgentDefinition(
            name="QA Agent",
            category=AgentCategory.QUALITY,
            model_tier=ModelTier.WORKHORSE,
            is_core_fleet=True,
        ),
    ]
    return FleetRoster(agents=agents)


@pytest.fixture
def sample_checkpoint() -> Checkpoint:
    return Checkpoint(
        session_id="test-session-001",
        completed=[
            TaskRecord(description="Built core models", status=TaskStatus.COMPLETED),
        ],
        in_progress=[
            TaskRecord(description="Writing tests", status=TaskStatus.IN_PROGRESS),
        ],
        next_tasks=["Run full test suite", "Deploy to staging"],
        assumptions=["Pydantic v2 API is stable"],
    )


@pytest.fixture
def hook_engine() -> HookEngine:
    return HookEngine(max_retries=3, max_session_retries=10)


def make_hook_handler(exit_code: int = 0, stdout: str = "", stderr: str = ""):
    """Factory for creating test hook handlers."""
    def handler(payload):
        return HookResult(
            hook_name="test",
            event=HookEvent.PRE_TOOL_USE,
            exit_code=exit_code,
            stdout=stdout,
            stderr=stderr,
            duration_ms=1.0,
        )
    return handler
