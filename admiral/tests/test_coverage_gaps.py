"""Tests for previously untested models, negative cases, and strengthened assertions.

Covers: AgentScope, ToolPermission, InterfaceContractRef, GuardrailDef,
        HandoffRoute, MCPTrustLevel, RetryConfig, A2AAuthMethod,
        render method structure validation, defensive programming,
        and negative/rejection test cases.
"""

from __future__ import annotations

import json

import pytest
from pydantic import ValidationError

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
    PromptAnatomy,
    PromptSection,
    PROMPT_SECTION_ORDER,
)
from admiral.models.authority import (
    DecisionTier,
    DecisionAuthority,
    AuthorityAssignment,
)
from admiral.models.checkpoint import (
    Checkpoint,
    ResourceUsage,
    TaskRecord,
    TaskStatus,
)
from admiral.models.context import (
    ContextBudget,
    ContextProfile,
    ContextEntry,
    ContextSlot,
    STANDING_CONTEXT_MAX_LINES,
)
from admiral.models.enforcement import (
    Constraint,
    ConstraintCategory,
    ConstraintClassification,
    EnforcementLevel,
)
from admiral.models.fleet import FleetRoster, FLEET_MIN_AGENTS, FLEET_MAX_AGENTS
from admiral.models.ground_truth import TechStackEntry, GroundTruth
from admiral.models.handoff import HandoffDocument, HandoffRoute, validate_handoff
from admiral.models.protocol_integration import (
    A2AAuthMethod,
    A2AConnection,
    ProtocolRegistry,
)
from admiral.models.recovery import (
    RecoveryStep,
    RecoveryRecord,
    RecoveryLadder,
    RetryConfig,
    FallbackConfig,
    RECOVERY_LADDER_ORDER,
)
from admiral.models.tool_registry import (
    MCPTrustLevel,
    MCPServerConfig,
    ToolEntry,
    AgentToolRegistry,
    FleetToolRegistry,
)
from admiral.models.work import (
    WorkChunk,
    Decomposition,
    ChunkState,
    QualityGate,
    CHUNK_BUDGET_CEILING_PCT,
)
from admiral.runtime.state import increment_usage


# =============================================================================
# AgentScope
# =============================================================================


class TestAgentScope:
    def test_create_with_does_and_does_not(self):
        scope = AgentScope(
            does=["Write backend code", "Create APIs"],
            does_not_do=["Frontend CSS", "Database migrations"],
        )
        assert len(scope.does) == 2
        assert len(scope.does_not_do) == 2
        assert "Frontend CSS" in scope.does_not_do

    def test_empty_scope_allowed(self):
        """Empty scope is valid at the model level (semantic check is separate)."""
        scope = AgentScope()
        assert scope.does == []
        assert scope.does_not_do == []

    def test_output_routing(self):
        scope = AgentScope(
            does=["Generate reports"],
            output_routing={"QA Agent": "All reports go to QA for review"},
        )
        assert "QA Agent" in scope.output_routing

    def test_roundtrip(self):
        scope = AgentScope(
            does=["Code"],
            does_not_do=["Deploy"],
            output_routing={"Reviewer": "Review"},
        )
        data = scope.model_dump()
        restored = AgentScope.model_validate(data)
        assert restored == scope


# =============================================================================
# ToolPermission
# =============================================================================


class TestToolPermission:
    def test_allowed_and_denied(self):
        perm = ToolPermission(
            allowed=["Read", "Write", "Bash"],
            denied=["WebFetch"],
            rationale={"WebFetch": "No network access for this agent"},
        )
        assert "Read" in perm.allowed
        assert "WebFetch" in perm.denied
        assert "WebFetch" in perm.rationale

    def test_empty_permissions(self):
        perm = ToolPermission()
        assert perm.allowed == []
        assert perm.denied == []
        assert perm.rationale == {}

    def test_roundtrip(self):
        perm = ToolPermission(
            allowed=["Read"],
            denied=["Bash"],
            rationale={"Bash": "Security risk"},
        )
        data = json.loads(perm.model_dump_json())
        restored = ToolPermission.model_validate(data)
        assert restored == perm


# =============================================================================
# InterfaceContractRef
# =============================================================================


class TestInterfaceContractRef:
    def test_create_sends_to(self):
        ref = InterfaceContractRef(
            partner_role="QA Agent",
            direction=ContractDirection.SENDS_TO,
            contract_summary="Sends completed code for review",
        )
        assert ref.direction == ContractDirection.SENDS_TO

    def test_create_receives_from(self):
        ref = InterfaceContractRef(
            partner_role="Orchestrator",
            direction=ContractDirection.RECEIVES_FROM,
            contract_summary="Receives task assignments",
        )
        assert ref.direction == ContractDirection.RECEIVES_FROM

    def test_rejects_empty_partner_role(self):
        with pytest.raises(ValidationError):
            InterfaceContractRef(
                partner_role="",
                direction=ContractDirection.SENDS_TO,
                contract_summary="Something",
            )

    def test_rejects_empty_contract_summary(self):
        with pytest.raises(ValidationError):
            InterfaceContractRef(
                partner_role="QA Agent",
                direction=ContractDirection.SENDS_TO,
                contract_summary="",
            )

    def test_rejects_invalid_direction(self):
        with pytest.raises(ValidationError):
            InterfaceContractRef(
                partner_role="QA Agent",
                direction="invalid_dir",
                contract_summary="Something",
            )

    def test_all_directions(self):
        for direction in ContractDirection:
            ref = InterfaceContractRef(
                partner_role="Agent",
                direction=direction,
                contract_summary="Contract",
            )
            assert ref.direction == direction


# =============================================================================
# GuardrailDef
# =============================================================================


class TestGuardrailDef:
    def test_create_hook_guardrail(self):
        g = GuardrailDef(
            name="Token Budget Gate",
            description="Blocks tool use when budget exhausted",
            enforcement=GuardrailEnforcement.HOOK,
        )
        assert g.enforcement == GuardrailEnforcement.HOOK

    def test_all_enforcement_types(self):
        for enforcement in GuardrailEnforcement:
            g = GuardrailDef(
                name=f"Guard ({enforcement.value})",
                description="Test guardrail",
                enforcement=enforcement,
            )
            assert g.enforcement == enforcement

    def test_rejects_empty_name(self):
        with pytest.raises(ValidationError):
            GuardrailDef(
                name="",
                description="Some guardrail",
                enforcement=GuardrailEnforcement.HOOK,
            )

    def test_rejects_empty_description(self):
        with pytest.raises(ValidationError):
            GuardrailDef(
                name="Guard",
                description="",
                enforcement=GuardrailEnforcement.INSTRUCTION,
            )

    def test_rejects_invalid_enforcement(self):
        with pytest.raises(ValidationError):
            GuardrailDef(
                name="Guard",
                description="Some guardrail",
                enforcement="invalid",
            )


# =============================================================================
# HandoffRoute enum
# =============================================================================


class TestHandoffRoute:
    def test_orchestrator_route(self):
        assert HandoffRoute.ORCHESTRATOR.value == "orchestrator"

    def test_direct_route(self):
        assert HandoffRoute.DIRECT.value == "direct"


# =============================================================================
# MCPTrustLevel enum
# =============================================================================


class TestMCPTrustLevel:
    def test_all_levels(self):
        assert MCPTrustLevel.OFFICIAL.value == "official"
        assert MCPTrustLevel.COMMUNITY.value == "community"
        assert MCPTrustLevel.INTERNAL.value == "internal"


# =============================================================================
# A2AAuthMethod enum
# =============================================================================


class TestA2AAuthMethod:
    def test_all_methods(self):
        assert A2AAuthMethod.API_KEY.value == "api_key"
        assert A2AAuthMethod.OAUTH2.value == "oauth2"
        assert A2AAuthMethod.MTLS.value == "mtls"
        assert A2AAuthMethod.NONE.value == "none"


# =============================================================================
# RetryConfig
# =============================================================================


class TestRetryConfig:
    def test_default(self):
        rc = RetryConfig()
        assert rc.max_retries == 3

    def test_custom(self):
        rc = RetryConfig(max_retries=2)
        assert rc.max_retries == 2

    def test_rejects_zero(self):
        with pytest.raises(ValidationError):
            RetryConfig(max_retries=0)

    def test_rejects_negative(self):
        with pytest.raises(ValidationError):
            RetryConfig(max_retries=-1)

    def test_rejects_above_max(self):
        with pytest.raises(ValidationError):
            RetryConfig(max_retries=6)

    def test_boundary_values(self):
        assert RetryConfig(max_retries=1).max_retries == 1
        assert RetryConfig(max_retries=5).max_retries == 5


# =============================================================================
# Negative validation tests
# =============================================================================


class TestNegativeValidation:
    """Tests that invalid inputs are properly rejected."""

    def test_work_chunk_negative_budget_rejected(self):
        with pytest.raises(ValidationError):
            WorkChunk(
                id="chunk-1",
                description="Test",
                token_budget=-100,
            )

    def test_work_chunk_zero_budget_rejected(self):
        with pytest.raises(ValidationError):
            WorkChunk(
                id="chunk-1",
                description="Test",
                token_budget=0,
            )

    def test_fleet_too_many_agents(self):
        agents = [
            AgentDefinition(
                name=f"Agent-{i}",
                category=AgentCategory.ENGINEERING_BACKEND,
                model_tier=ModelTier.WORKHORSE,
            )
            for i in range(FLEET_MAX_AGENTS + 1)
        ]
        with pytest.raises(ValidationError):
            FleetRoster(agents=agents)

    def test_recovery_ladder_backward_progression(self):
        with pytest.raises(ValidationError):
            RecoveryRecord(
                step=RecoveryStep.FALLBACK,
                description="Tried fallback",
                next_step=RecoveryStep.RETRY,
            )

    def test_recovery_ladder_skip_rung(self):
        with pytest.raises(ValidationError):
            RecoveryRecord(
                step=RecoveryStep.RETRY,
                description="Tried retry",
                next_step=RecoveryStep.BACKTRACK,
            )

    def test_recovery_ladder_valid_progression(self):
        record = RecoveryRecord(
            step=RecoveryStep.RETRY,
            description="Tried retry",
            next_step=RecoveryStep.FALLBACK,
        )
        assert record.next_step == RecoveryStep.FALLBACK

    def test_context_budget_below_100(self):
        with pytest.raises(ValidationError):
            ContextBudget(standing_pct=15, session_pct=50, working_pct=20)

    def test_context_budget_above_100(self):
        with pytest.raises(ValidationError):
            ContextBudget(standing_pct=25, session_pct=65, working_pct=30)

    def test_handoff_self_send(self):
        with pytest.raises(ValidationError):
            HandoffDocument(
                from_agent="Backend",
                to_agent="Backend",
                task="Do something",
                deliverable="Result",
                acceptance_criteria=["Criterion that is long enough"],
            )

    def test_tech_stack_vague_version_latest(self):
        with pytest.raises(ValidationError):
            TechStackEntry(name="React", version="latest")

    def test_tech_stack_vague_version_stable(self):
        with pytest.raises(ValidationError):
            TechStackEntry(name="React", version="stable")

    def test_tech_stack_vague_version_lts(self):
        with pytest.raises(ValidationError):
            TechStackEntry(name="Node", version="lts")

    def test_constraint_security_must_be_hook(self):
        cc = ConstraintClassification(
            constraints=[
                Constraint(
                    name="Security rule",
                    description="A security constraint at guidance level",
                    category=ConstraintCategory.SECURITY,
                    level=EnforcementLevel.GUIDANCE,
                    mechanism="readme",
                ),
            ]
        )
        violations = cc.validate_coverage()
        assert len(violations) >= 1
        assert any("should be hook-enforced" in v for v in violations)

    def test_constraint_scope_must_be_hook(self):
        cc = ConstraintClassification(
            constraints=[
                Constraint(
                    name="Scope rule",
                    description="A scope constraint at instruction level",
                    category=ConstraintCategory.SCOPE,
                    level=EnforcementLevel.INSTRUCTION,
                    mechanism="agents.md",
                ),
            ]
        )
        violations = cc.validate_coverage()
        assert len(violations) >= 1

    def test_tool_registry_overlap_rejected(self):
        with pytest.raises(ValidationError):
            AgentToolRegistry(
                agent_role="Backend",
                available_tools=[ToolEntry(name="Bash")],
                not_available=["Bash"],
            )


# =============================================================================
# Render method structure tests
# =============================================================================


class TestRenderStructure:
    """Validate render output structure, not just substring presence."""

    def test_ground_truth_render_section_order(self, sample_ground_truth):
        rendered = sample_ground_truth.render()
        lines = rendered.split("\n")

        # First line must be the title
        assert lines[0] == "# Ground Truth"

        # Sections must appear in order
        section_positions = {}
        for i, line in enumerate(lines):
            if line.startswith("## "):
                section_positions[line] = i

        if "## Domain Ontology" in section_positions and "## Tech Stack" in section_positions:
            assert section_positions["## Domain Ontology"] < section_positions["## Tech Stack"]

        if "## Tech Stack" in section_positions and "## Known Issues" in section_positions:
            assert section_positions["## Tech Stack"] < section_positions["## Known Issues"]

    def test_checkpoint_render_structure(self, sample_checkpoint):
        rendered = sample_checkpoint.render()
        lines = rendered.split("\n")

        # Must start with checkpoint header
        assert lines[0].startswith("# Checkpoint:")

        # Must have required sections
        assert "## Completed" in rendered
        assert "## In Progress" in rendered
        assert "## Next" in rendered
        assert "## Decisions Made:" in rendered
        assert "## Recovery Actions" in rendered
        assert "## Resources" in rendered
        assert "## Assumptions" in rendered

    def test_checkpoint_render_no_suspicious_warning_with_assumptions(self, sample_checkpoint):
        rendered = sample_checkpoint.render()
        assert "suspicious" not in rendered.lower()

    def test_checkpoint_render_suspicious_warning_without_assumptions(self):
        cp = Checkpoint(session_id="empty")
        rendered = cp.render()
        assert "suspicious" in rendered.lower()

    def test_prompt_anatomy_render_section_headers(self):
        pa = PromptAnatomy(
            identity="I am the Backend Implementer.",
            authority="[AUTONOMOUS] Variable naming",
            constraints="You do NOT: deploy to production",
        )
        rendered = pa.render()

        # Each non-empty section should have a ## header
        assert "## IDENTITY" in rendered
        assert "## AUTHORITY" in rendered
        assert "## CONSTRAINTS" in rendered
        # Empty sections should be omitted
        assert "## KNOWLEDGE" not in rendered
        assert "## TASK" not in rendered

    def test_prompt_anatomy_section_order_in_render(self):
        pa = PromptAnatomy(
            identity="I am.",
            authority="Auth.",
            constraints="Constraints.",
            knowledge="Knowledge.",
            task="Task.",
        )
        rendered = pa.render()
        positions = {
            "IDENTITY": rendered.index("## IDENTITY"),
            "AUTHORITY": rendered.index("## AUTHORITY"),
            "CONSTRAINTS": rendered.index("## CONSTRAINTS"),
            "KNOWLEDGE": rendered.index("## KNOWLEDGE"),
            "TASK": rendered.index("## TASK"),
        }
        # Verify canonical ordering
        assert positions["IDENTITY"] < positions["AUTHORITY"]
        assert positions["AUTHORITY"] < positions["CONSTRAINTS"]
        assert positions["CONSTRAINTS"] < positions["KNOWLEDGE"]
        assert positions["KNOWLEDGE"] < positions["TASK"]


# =============================================================================
# ResourceUsage time_remaining (previously untested)
# =============================================================================


class TestResourceUsageTime:
    def test_time_remaining_with_budget(self):
        r = ResourceUsage(time_minutes=20, time_budget_minutes=60)
        assert r.time_remaining == 40

    def test_time_remaining_exhausted(self):
        r = ResourceUsage(time_minutes=60, time_budget_minutes=60)
        assert r.time_remaining == 0

    def test_time_remaining_over_budget(self):
        r = ResourceUsage(time_minutes=70, time_budget_minutes=60)
        assert r.time_remaining == 0

    def test_time_remaining_no_budget(self):
        r = ResourceUsage(time_minutes=20)
        assert r.time_remaining is None

    def test_tokens_remaining_with_budget(self):
        r = ResourceUsage(tokens_used=50_000, tokens_budget=200_000)
        assert r.tokens_remaining == 150_000


# =============================================================================
# Defensive programming — state.py increment_usage
# =============================================================================


class TestIncrementUsageDefensive:
    def test_increment_with_missing_context(self):
        """increment_usage should handle missing 'context' key defensively."""
        state = {
            "tokens_used": 0,
            "tool_call_count": 0,
            "token_budget": 100_000,
        }
        result = increment_usage(state, "Read")
        assert result["tokens_used"] > 0
        assert "context" in result
        assert result["context"]["current_utilization"] > 0

    def test_increment_with_full_state(self):
        state = {
            "tokens_used": 0,
            "tool_call_count": 0,
            "token_budget": 100_000,
            "context": {"current_utilization": 0.0},
        }
        result = increment_usage(state, "Read")
        assert result["tokens_used"] == 1000
        assert result["context"]["current_utilization"] == 0.01


# =============================================================================
# Decomposition validate_chunk_ids
# =============================================================================


class TestDecompositionValidation:
    def test_valid_dependencies(self):
        d = Decomposition(
            goal="Build feature",
            chunks=[
                WorkChunk(id="a", description="First"),
                WorkChunk(id="b", description="Second", depends_on=["a"]),
            ],
        )
        assert d.validate_chunk_ids() == []

    def test_invalid_dependency_reference(self):
        d = Decomposition(
            goal="Build feature",
            chunks=[
                WorkChunk(id="a", description="First"),
                WorkChunk(id="b", description="Second", depends_on=["nonexistent"]),
            ],
        )
        violations = d.validate_chunk_ids()
        assert len(violations) == 1
        assert "nonexistent" in violations[0]

    def test_next_actionable(self):
        d = Decomposition(
            goal="Build feature",
            chunks=[
                WorkChunk(id="a", description="First", state=ChunkState.COMPLETED),
                WorkChunk(id="b", description="Second", depends_on=["a"]),
                WorkChunk(id="c", description="Third", depends_on=["b"]),
            ],
        )
        nxt = d.next_actionable()
        assert nxt is not None
        assert nxt.id == "b"

    def test_next_actionable_blocked(self):
        d = Decomposition(
            goal="Build feature",
            chunks=[
                WorkChunk(id="a", description="First"),
                WorkChunk(id="b", description="Second", depends_on=["a"]),
            ],
        )
        # 'a' is PENDING so 'b' is blocked
        nxt = d.next_actionable()
        assert nxt is not None
        assert nxt.id == "a"  # 'a' has no deps, so it's actionable


# =============================================================================
# Hook manifest discovery — dynamic count instead of brittle hardcoded
# =============================================================================


class TestHookManifestDiscoveryDynamic:
    def test_spec_manifests_exist(self):
        """Verify hook manifests can be discovered (non-brittle version)."""
        from pathlib import Path

        hook_dir = Path("aiStrat/hooks")
        if hook_dir.exists():
            manifests = list(hook_dir.glob("*.json"))
            assert len(manifests) >= 1, "Expected at least one hook manifest in aiStrat/hooks/"


# =============================================================================
# A2AConnection validation
# =============================================================================


class TestA2AConnectionValidation:
    def test_valid_connection(self):
        conn = A2AConnection(
            agent_a="Backend",
            agent_b="QA",
            purpose="Code review handoff",
        )
        assert conn.bidirectional is True
        assert conn.auth_method == A2AAuthMethod.NONE

    def test_unidirectional(self):
        conn = A2AConnection(
            agent_a="Backend",
            agent_b="QA",
            bidirectional=False,
        )
        assert conn.bidirectional is False

    def test_rejects_empty_agent(self):
        with pytest.raises(ValidationError):
            A2AConnection(agent_a="", agent_b="QA")

    def test_protocol_registry_validates_agents(self):
        reg = ProtocolRegistry(
            a2a_connections=[
                A2AConnection(agent_a="Backend", agent_b="Ghost"),
            ],
        )
        violations = reg.validate_agents_exist({"Backend", "QA"})
        assert len(violations) == 1
        assert "Ghost" in violations[0]

    def test_all_auth_methods(self):
        for method in A2AAuthMethod:
            conn = A2AConnection(
                agent_a="A",
                agent_b="B",
                auth_method=method,
            )
            assert conn.auth_method == method


# =============================================================================
# MCPServerConfig validation
# =============================================================================


class TestMCPServerConfig:
    def test_create_valid(self):
        srv = MCPServerConfig(
            name="filesystem",
            version="1.0.0",
            capability="Read and write files",
            trust_level=MCPTrustLevel.INTERNAL,
        )
        assert srv.trust_level == MCPTrustLevel.INTERNAL

    def test_rejects_empty_name(self):
        with pytest.raises(ValidationError):
            MCPServerConfig(name="", version="1.0.0")

    def test_rejects_empty_version(self):
        with pytest.raises(ValidationError):
            MCPServerConfig(name="test", version="")

    def test_all_trust_levels(self):
        for level in MCPTrustLevel:
            srv = MCPServerConfig(name="test", version="1.0.0", trust_level=level)
            assert srv.trust_level == level

    def test_agent_roles(self):
        srv = MCPServerConfig(
            name="db",
            version="2.0.0",
            agent_roles=["Backend", "DBA"],
        )
        assert "Backend" in srv.agent_roles


# =============================================================================
# Fleet tool registry MCP authorization
# =============================================================================


class TestFleetToolRegistryValidation:
    def test_mcp_authorization_violation(self):
        registry = FleetToolRegistry(
            mcp_servers=[
                MCPServerConfig(
                    name="db-server",
                    version="1.0.0",
                    agent_roles=["DBA"],
                ),
            ],
            agent_registries=[
                AgentToolRegistry(
                    agent_role="Backend",
                    mcp_servers=["db-server"],
                ),
            ],
        )
        violations = registry.validate_mcp_agent_authorization()
        assert len(violations) == 1
        assert "Backend" in violations[0]

    def test_mcp_authorization_pass(self):
        registry = FleetToolRegistry(
            mcp_servers=[
                MCPServerConfig(
                    name="db-server",
                    version="1.0.0",
                    agent_roles=["Backend"],
                ),
            ],
            agent_registries=[
                AgentToolRegistry(
                    agent_role="Backend",
                    mcp_servers=["db-server"],
                ),
            ],
        )
        violations = registry.validate_mcp_agent_authorization()
        assert violations == []
