"""Shared test fixtures for Admiral Framework tests."""

from __future__ import annotations

import time

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
from admiral.models.identity import (
    IdentityToken,
    TokenClaims,
    AuthorityTierLevel,
)
from admiral.models.agent import (
    AgentDefinition,
    AgentCategory,
    ModelTier,
    ScheduleType,
)
from admiral.hooks.engine import HookEngine, HookResult
from admiral.hooks.lifecycle import HookEvent
from admiral.hooks.manifest import HookManifest


# Signing key for test tokens
TEST_SIGNING_KEY = "test-signing-key-for-admiral-framework-tests"


@pytest.fixture
def signing_key() -> str:
    return TEST_SIGNING_KEY


@pytest.fixture
def sample_claims() -> TokenClaims:
    now = time.time()
    return TokenClaims(
        agent_id="backend-implementer-001",
        agent_role="Backend Implementer",
        authority_tier=AuthorityTierLevel.SPECIALIST,
        session_id="session-test-001",
        project="admiral-self-build",
        issued_at=now,
        expires_at=now + 3600,
    )


@pytest.fixture
def sample_token(sample_claims: TokenClaims, signing_key: str) -> IdentityToken:
    return IdentityToken.create(claims=sample_claims, signing_key=signing_key)


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
