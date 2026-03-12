"""Tests for Level 2 models.

Validates fleet composition, routing, handoff protocol, work decomposition,
context profiles, ground truth, checkpoints, and institutional memory.
"""

from __future__ import annotations

import pytest

from admiral.models.ground_truth import (
    GroundTruth,
    TechStackEntry,
    KnownIssue,
    KnownIssueSeverity,
    AccessPermission,
    ConfigurationStatus,
)
from admiral.models.context import (
    ContextProfile,
    ContextBudget,
    ContextEntry,
    ContextSlot,
    RefreshTrigger,
    SacrificeOrder,
    STANDING_CONTEXT_MAX_LINES,
)
from admiral.models.work import (
    Decomposition,
    WorkChunk,
    ChunkState,
    QualityGate,
    CHUNK_BUDGET_CEILING_PCT,
)
from admiral.models.checkpoint import (
    Checkpoint,
    HandoffBrief,
    DecisionRecord,
    DecisionLog,
    TaskRecord,
    TaskStatus,
    ResourceUsage,
)
from admiral.models.handoff import (
    HandoffDocument,
    HandoffRoute,
    validate_handoff,
)
from admiral.models.fleet import (
    FleetRoster,
    RoutingRule,
    RoutingTable,
    FLEET_MIN_AGENTS,
    FLEET_MAX_AGENTS,
)
from admiral.models.agent import AgentDefinition, AgentCategory, ModelTier
from admiral.models.authority import (
    DecisionTier,
    DecisionAuthority,
    CalibrationCondition,
)
from admiral.protocols.handoff_protocol import (
    validate_handoff_completeness,
    validate_acceptance,
)
from admiral.models.tool_registry import (
    FleetToolRegistry,
    AgentToolRegistry,
    ToolEntry,
    MCPServerConfig,
    MCPTrustLevel,
)
from admiral.models.protocol_integration import (
    ProtocolRegistry,
    A2AConnection,
    A2AAuthMethod,
)
from admiral.models.recovery import (
    RecoveryLadder,
    RecoveryRecord,
    RecoveryStep,
    FallbackConfig,
    RECOVERY_LADDER_ORDER,
)


# === Ground Truth ===


@pytest.mark.phase2
class TestGroundTruth:
    def test_create_ground_truth(self):
        gt = GroundTruth(
            glossary={"fleet": "Collection of AI agents"},
            tech_stack=[
                TechStackEntry(name="Python", version="3.12.3", purpose="Runtime"),
                TechStackEntry(name="Pydantic", version="2.10.1", purpose="Validation"),
            ],
        )
        assert gt.get_tech("Python") is not None
        assert gt.get_tech("Python").version == "3.12.3"
        assert gt.get_tech("unknown") is None

    def test_version_rejects_vague(self):
        with pytest.raises(Exception, match="exact"):
            TechStackEntry(name="React", version="latest")

    def test_version_rejects_all_vague_strings(self):
        for vague in ["latest", "stable", "current", "newest", "recent", "lts"]:
            with pytest.raises(Exception, match="exact"):
                TechStackEntry(name="X", version=vague)

    def test_version_accepts_exact(self):
        entry = TechStackEntry(name="React", version="19.1")
        assert entry.version == "19.1"

    def test_critical_issues(self):
        gt = GroundTruth(
            known_issues=[
                KnownIssue(description="DB timeout", severity=KnownIssueSeverity.CRITICAL),
                KnownIssue(description="Minor UI glitch", severity=KnownIssueSeverity.LOW),
            ]
        )
        assert len(gt.get_critical_issues()) == 1
        assert gt.get_critical_issues()[0].description == "DB timeout"

    def test_render_contains_tech_stack(self):
        gt = GroundTruth(
            tech_stack=[TechStackEntry(name="Python", version="3.12", purpose="Runtime")],
        )
        rendered = gt.render()
        assert "Python 3.12" in rendered
        assert "Runtime" in rendered

    def test_case_insensitive_tech_lookup(self):
        gt = GroundTruth(
            tech_stack=[TechStackEntry(name="PostgreSQL", version="16.2")],
        )
        assert gt.get_tech("postgresql") is not None
        assert gt.get_tech("POSTGRESQL") is not None


# === Context Window Strategy ===


@pytest.mark.phase2
class TestContextProfile:
    def test_default_budget_valid(self):
        budget = ContextBudget()
        assert budget.standing_pct + budget.session_pct + budget.working_pct == 100

    def test_budget_must_sum_to_100(self):
        with pytest.raises(Exception, match="100%"):
            ContextBudget(standing_pct=20, session_pct=50, working_pct=20)

    def test_budget_rejects_out_of_range(self):
        with pytest.raises(Exception):
            ContextBudget(standing_pct=10, session_pct=60, working_pct=30)  # standing < 15

    def test_standing_entries_sorted_by_priority(self):
        profile = ContextProfile(
            agent_role="Orchestrator",
            entries=[
                ContextEntry(name="mission", slot=ContextSlot.STANDING, source="AGENTS.md", priority=100),
                ContextEntry(name="constraints", slot=ContextSlot.STANDING, source="boundaries.md", priority=80),
                ContextEntry(name="reference", slot=ContextSlot.SESSION, source="docs/api.md", priority=50),
            ],
        )
        standing = profile.standing
        assert len(standing) == 2
        assert standing[0].name == "mission"
        assert standing[1].name == "constraints"
        assert len(profile.session) == 1

    def test_standing_limit_validation(self):
        profile = ContextProfile(
            agent_role="Bloated Agent",
            entries=[
                ContextEntry(
                    name="too_much",
                    slot=ContextSlot.STANDING,
                    source="giant.md",
                    estimated_lines=200,
                ),
            ],
        )
        violations = profile.validate_standing_limit()
        assert len(violations) == 1
        assert "200 lines" in violations[0]
        assert "150" in violations[0]

    def test_standing_limit_passes(self):
        profile = ContextProfile(
            agent_role="Lean Agent",
            entries=[
                ContextEntry(name="a", slot=ContextSlot.STANDING, source="a.md", estimated_lines=50),
                ContextEntry(name="b", slot=ContextSlot.STANDING, source="b.md", estimated_lines=90),
            ],
        )
        assert profile.validate_standing_limit() == []
        assert profile.standing_lines == 140

    def test_sacrifice_order_default(self):
        profile = ContextProfile(agent_role="Test")
        assert profile.sacrifice_order == [SacrificeOrder.WORKING, SacrificeOrder.SESSION]


# === Work Decomposition ===


@pytest.mark.phase2
class TestWorkDecomposition:
    def test_create_chunk(self):
        chunk = WorkChunk(
            id="auth-1",
            description="Implement login endpoint",
            agent_role="Backend Implementer",
            entry_state=["User model exists"],
            exit_state=["POST /login returns JWT"],
            quality_gates=[QualityGate(name="tests_pass", command="pytest tests/test_auth.py")],
        )
        assert chunk.state == ChunkState.PENDING
        assert len(chunk.quality_gates) == 1

    def test_budget_ceiling_enforced(self):
        with pytest.raises(Exception, match="40%"):
            WorkChunk(
                id="too-big",
                description="Way too much work",
                token_budget=50_000,
                agent_total_budget=100_000,  # 50% > 40% ceiling
            )

    def test_budget_ceiling_passes(self):
        chunk = WorkChunk(
            id="ok",
            description="Right-sized chunk",
            token_budget=35_000,
            agent_total_budget=100_000,  # 35% < 40%
        )
        assert chunk.token_budget == 35_000

    def test_budget_ceiling_exactly_40(self):
        chunk = WorkChunk(
            id="edge",
            description="Exactly at ceiling",
            token_budget=40_000,
            agent_total_budget=100_000,  # 40% == 40%
        )
        assert chunk.token_budget == 40_000

    def test_decomposition_next_actionable(self):
        decomp = Decomposition(
            goal="Build auth system",
            chunks=[
                WorkChunk(id="a", description="User model", state=ChunkState.COMPLETED),
                WorkChunk(id="b", description="Login endpoint", depends_on=["a"]),
                WorkChunk(id="c", description="Signup endpoint", depends_on=["a"]),
                WorkChunk(id="d", description="Integration tests", depends_on=["b", "c"]),
            ],
        )
        nxt = decomp.next_actionable()
        assert nxt is not None
        assert nxt.id in ("b", "c")

    def test_decomposition_no_actionable_when_blocked(self):
        decomp = Decomposition(
            goal="Build auth",
            chunks=[
                WorkChunk(id="a", description="First", state=ChunkState.IN_PROGRESS),
                WorkChunk(id="b", description="Second", depends_on=["a"]),
            ],
        )
        assert decomp.next_actionable() is None

    def test_validate_chunk_ids(self):
        decomp = Decomposition(
            goal="Test",
            chunks=[
                WorkChunk(id="a", description="First"),
                WorkChunk(id="b", description="Second", depends_on=["a", "nonexistent"]),
            ],
        )
        violations = decomp.validate_chunk_ids()
        assert len(violations) == 1
        assert "nonexistent" in violations[0]

    def test_decomposition_queries(self):
        decomp = Decomposition(
            goal="Test",
            chunks=[
                WorkChunk(id="a", description="Done", state=ChunkState.COMPLETED),
                WorkChunk(id="b", description="Working", state=ChunkState.IN_PROGRESS),
                WorkChunk(id="c", description="Stuck", state=ChunkState.BLOCKED),
                WorkChunk(id="d", description="Waiting", state=ChunkState.PENDING),
            ],
        )
        assert len(decomp.completed()) == 1
        assert len(decomp.in_progress()) == 1
        assert len(decomp.blocked()) == 1
        assert len(decomp.pending()) == 1


# === Checkpoint / Institutional Memory ===


@pytest.mark.phase2
class TestCheckpoint:
    def test_create_checkpoint(self):
        cp = Checkpoint(
            session_id="session-001",
            completed=[
                TaskRecord(description="Built models", status=TaskStatus.COMPLETED),
            ],
            in_progress=[
                TaskRecord(description="Writing tests", status=TaskStatus.IN_PROGRESS),
            ],
            assumptions=["Database schema is stable"],
        )
        assert cp.session_id == "session-001"
        assert len(cp.completed) == 1
        assert len(cp.assumptions) == 1

    def test_checkpoint_render(self):
        cp = Checkpoint(
            session_id="test-session",
            completed=[TaskRecord(description="Task A", status=TaskStatus.COMPLETED)],
            next_tasks=["Write tests", "Deploy"],
            assumptions=["Schema stable"],
        )
        rendered = cp.render()
        assert "test-session" in rendered
        assert "Task A" in rendered
        assert "Write tests" in rendered
        assert "Schema stable" in rendered

    def test_checkpoint_render_empty_assumptions_warning(self):
        cp = Checkpoint(session_id="s1")
        rendered = cp.render()
        assert "suspicious" in rendered.lower()

    def test_resource_usage_remaining(self):
        usage = ResourceUsage(tokens_used=50_000, tokens_budget=200_000)
        assert usage.tokens_remaining == 150_000

    def test_resource_usage_no_budget(self):
        usage = ResourceUsage(tokens_used=50_000)
        assert usage.tokens_remaining is None

    def test_resource_usage_exhausted(self):
        usage = ResourceUsage(tokens_used=250_000, tokens_budget=200_000)
        assert usage.tokens_remaining == 0


@pytest.mark.phase2
class TestDecisionLog:
    def test_append_and_query(self):
        log = DecisionLog()
        log.append(DecisionRecord(
            timestamp="2026-03-11T10:00:00",
            decision="Use Pydantic for validation",
            alternatives=["dataclasses", "attrs"],
            rationale="Spec compliance requires runtime validation",
            authority_tier=DecisionTier.AUTONOMOUS,
        ))
        log.append(DecisionRecord(
            timestamp="2026-03-11T10:30:00",
            decision="Add new external dependency",
            authority_tier=DecisionTier.PROPOSE,
        ))
        assert len(log.decisions) == 2
        assert len(log.proposed) == 1
        assert len(log.by_tier(DecisionTier.AUTONOMOUS)) == 1


@pytest.mark.phase2
class TestHandoffBrief:
    def test_render(self):
        brief = HandoffBrief(
            session_id="s1",
            completed_summary="Built Level 2 models",
            next_session_should=["Write tests", "Run CI"],
        )
        rendered = brief.render()
        assert "Built Level 2 models" in rendered
        assert "Write tests" in rendered


# === Handoff Protocol ===


@pytest.mark.phase2
class TestHandoffDocument:
    def test_create_valid_handoff(self):
        doc = HandoffDocument(
            from_agent="Backend Implementer",
            to_agent="QA Agent",
            task="Review login endpoint implementation",
            deliverable="Diff of src/auth/login.py",
            acceptance_criteria=["All tests pass", "No security vulnerabilities"],
            assumptions=["JWT library is v3.x compatible"],
        )
        assert doc.via == HandoffRoute.ORCHESTRATOR
        assert len(doc.acceptance_criteria) == 2

    def test_sender_receiver_must_differ(self):
        with pytest.raises(Exception, match="differ"):
            HandoffDocument(
                from_agent="Same Agent",
                to_agent="Same Agent",
                task="Self-review",
                deliverable="code",
                acceptance_criteria=["pass"],
            )

    def test_render_format(self):
        doc = HandoffDocument(
            from_agent="Implementer",
            to_agent="QA",
            task="Review code",
            deliverable="PR #42",
            acceptance_criteria=["Tests pass"],
            assumptions=["No breaking changes"],
        )
        rendered = doc.render()
        assert "FROM: Implementer" in rendered
        assert "TO: QA" in rendered
        assert "VIA: orchestrator" in rendered
        assert "TASK: Review code" in rendered
        assert "ASSUMPTIONS:" in rendered

    def test_validate_handoff_complete(self):
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Do X",
            deliverable="Result",
            acceptance_criteria=["Done"],
            assumptions=["Stable API"],
        )
        issues = validate_handoff(doc)
        assert issues == []

    def test_validate_handoff_missing_unknowns(self):
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Do X",
            deliverable="Result",
            acceptance_criteria=["Done"],
        )
        issues = validate_handoff(doc)
        assert len(issues) == 1
        assert "assumptions" in issues[0].lower() or "open questions" in issues[0].lower()

    def test_direct_routing(self):
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            via=HandoffRoute.DIRECT,
            task="Quick handoff",
            deliverable="Data",
            acceptance_criteria=["Received"],
            assumptions=["Authorized for direct"],
        )
        assert doc.via == HandoffRoute.DIRECT


# === Fleet Composition ===


def _make_agent(name: str, is_core: bool = True) -> AgentDefinition:
    """Helper to create a minimal agent for fleet tests."""
    return AgentDefinition(
        name=name,
        category=AgentCategory.ENGINEERING_BACKEND,
        model_tier=ModelTier.WORKHORSE,
        is_core_fleet=is_core,
    )


@pytest.mark.phase2
class TestFleetRoster:
    def test_create_fleet(self):
        fleet = FleetRoster(
            agents=[_make_agent("Orchestrator"), _make_agent("Implementer")],
        )
        assert len(fleet.agents) == 2
        assert "Orchestrator" in fleet.roles

    def test_fleet_max_exceeded(self):
        agents = [_make_agent(f"Agent-{i}") for i in range(13)]
        with pytest.raises(Exception, match="12"):
            FleetRoster(agents=agents)

    def test_fleet_lookup(self):
        fleet = FleetRoster(agents=[_make_agent("QA Agent")])
        assert fleet.get_agent("QA Agent") is not None
        assert fleet.get_agent("Nonexistent") is None

    def test_core_fleet_filter(self):
        fleet = FleetRoster(
            agents=[
                _make_agent("Core", is_core=True),
                _make_agent("Optional", is_core=False),
            ],
        )
        assert len(fleet.core_fleet) == 1
        assert fleet.core_fleet[0].name == "Core"


@pytest.mark.phase2
class TestRoutingTable:
    def test_route_basic(self):
        table = RoutingTable(
            rules=[
                RoutingRule(task_type="backend", agent_role="Backend Implementer"),
                RoutingRule(task_type="frontend", agent_role="Frontend Implementer"),
            ]
        )
        assert table.route("backend") == "Backend Implementer"
        assert table.route("frontend") == "Frontend Implementer"
        assert table.route("unknown") is None

    def test_route_priority(self):
        table = RoutingTable(
            rules=[
                RoutingRule(task_type="review", agent_role="Junior QA", priority=30),
                RoutingRule(task_type="review", agent_role="Senior QA", priority=80),
            ]
        )
        assert table.route("review") == "Senior QA"

    def test_route_with_fallback(self):
        table = RoutingTable(
            rules=[
                RoutingRule(
                    task_type="deploy",
                    agent_role="DevOps",
                    fallback_role="Orchestrator",
                ),
            ]
        )
        primary, fallback = table.route_with_fallback("deploy")
        assert primary == "DevOps"
        assert fallback == "Orchestrator"

    def test_validate_agents_exist(self):
        table = RoutingTable(
            rules=[
                RoutingRule(task_type="test", agent_role="QA"),
                RoutingRule(task_type="build", agent_role="Ghost"),
            ]
        )
        violations = table.validate_agents_exist({"QA", "Implementer"})
        assert len(violations) == 1
        assert "Ghost" in violations[0]

    def test_all_task_types(self):
        table = RoutingTable(
            rules=[
                RoutingRule(task_type="b", agent_role="X"),
                RoutingRule(task_type="a", agent_role="Y"),
                RoutingRule(task_type="b", agent_role="Z"),
            ]
        )
        assert table.all_task_types() == ["a", "b"]

    def test_fleet_routing_validation(self):
        fleet = FleetRoster(
            agents=[_make_agent("Implementer")],
            routing=RoutingTable(
                rules=[
                    RoutingRule(task_type="code", agent_role="Implementer"),
                    RoutingRule(task_type="review", agent_role="Ghost QA"),
                ]
            ),
        )
        violations = fleet.validate_routing()
        assert len(violations) == 1
        assert "Ghost QA" in violations[0]


@pytest.mark.phase2
class TestSelfQAValidation:
    def test_detects_same_agent_doing_impl_and_qa(self):
        fleet = FleetRoster(
            agents=[_make_agent("FullStack")],
            routing=RoutingTable(
                rules=[
                    RoutingRule(task_type="backend", agent_role="FullStack"),
                    RoutingRule(task_type="code_review", agent_role="FullStack"),
                ]
            ),
        )
        violations = fleet.validate_no_self_qa()
        assert len(violations) == 1
        assert "FullStack" in violations[0]
        assert "conflict of interest" in violations[0]

    def test_no_violation_when_roles_separated(self):
        fleet = FleetRoster(
            agents=[_make_agent("Implementer"), _make_agent("QA Agent")],
            routing=RoutingTable(
                rules=[
                    RoutingRule(task_type="backend", agent_role="Implementer"),
                    RoutingRule(task_type="code_review", agent_role="QA Agent"),
                ]
            ),
        )
        violations = fleet.validate_no_self_qa()
        assert violations == []

    def test_detects_multiple_qa_keywords(self):
        """Detects conflicts with various QA-related task types."""
        for qa_task in ["code_review", "qa_check", "run_test", "security_audit", "verify_output"]:
            fleet = FleetRoster(
                agents=[_make_agent("Agent")],
                routing=RoutingTable(
                    rules=[
                        RoutingRule(task_type="implement", agent_role="Agent"),
                        RoutingRule(task_type=qa_task, agent_role="Agent"),
                    ]
                ),
            )
            violations = fleet.validate_no_self_qa()
            assert len(violations) == 1, f"Expected violation for qa_task={qa_task}"

    def test_no_violation_when_only_qa_tasks(self):
        """Agent doing only QA tasks is fine."""
        fleet = FleetRoster(
            agents=[_make_agent("QA Specialist")],
            routing=RoutingTable(
                rules=[
                    RoutingRule(task_type="code_review", agent_role="QA Specialist"),
                    RoutingRule(task_type="test_execution", agent_role="QA Specialist"),
                ]
            ),
        )
        violations = fleet.validate_no_self_qa()
        assert violations == []

    def test_no_violation_with_empty_routing(self):
        fleet = FleetRoster(agents=[_make_agent("Solo")])
        assert fleet.validate_no_self_qa() == []


@pytest.mark.phase2
class TestGroundTruthRenderComplete:
    """Verify render() covers all modeled sections."""

    def test_render_includes_naming_conventions(self):
        gt = GroundTruth(naming_conventions={"files": "kebab-case"})
        rendered = gt.render()
        assert "kebab-case" in rendered

    def test_render_includes_status_definitions(self):
        gt = GroundTruth(status_definitions={"done": "tested and merged"})
        rendered = gt.render()
        assert "tested and merged" in rendered

    def test_render_includes_access_permissions(self):
        gt = GroundTruth(
            access_permissions=[
                AccessPermission(role="QA", can_read=["src/"], can_write=["tests/"]),
            ]
        )
        rendered = gt.render()
        assert "QA" in rendered

    def test_render_includes_external_dependencies(self):
        gt = GroundTruth(external_dependencies={"Stripe": "99.9% SLA"})
        rendered = gt.render()
        assert "Stripe" in rendered
        assert "99.9% SLA" in rendered

    def test_render_includes_config_status(self):
        gt = GroundTruth(
            config_status=ConfigurationStatus(
                agents_md_version="v2.1",
                hooks_count=5,
                mcp_servers=["filesystem", "github"],
            )
        )
        rendered = gt.render()
        assert "v2.1" in rendered
        assert "5" in rendered
        assert "filesystem" in rendered

    def test_render_includes_infrastructure(self):
        gt = GroundTruth(infrastructure_topology="3-tier: CDN → API → Postgres")
        rendered = gt.render()
        assert "3-tier" in rendered


@pytest.mark.phase2
class TestCheckpointZeroBudget:
    def test_render_shows_zero_budget(self):
        cp = Checkpoint(
            session_id="s1",
            resources=ResourceUsage(tokens_used=0, tokens_budget=0),
        )
        rendered = cp.render()
        assert "Tokens: 0/0" in rendered

    def test_render_shows_zero_time_budget(self):
        cp = Checkpoint(
            session_id="s1",
            resources=ResourceUsage(time_minutes=0, time_budget_minutes=0),
        )
        rendered = cp.render()
        assert "Time: 0/0" in rendered


@pytest.mark.phase2
class TestHandoffBriefRenderClean:
    def test_render_omits_empty_sections(self):
        brief = HandoffBrief(session_id="s1", completed_summary="Done")
        rendered = brief.render()
        assert "**Completed:** Done" in rendered
        # Empty sections should not appear
        assert "**In Progress:**" not in rendered
        assert "**Blocked:**" not in rendered
        assert "**Decisions:**" not in rendered


# === Decision Authority Defaults (Section 09 Extensions) ===


@pytest.mark.phase2
class TestDecisionAuthorityDefaults:
    def test_common_defaults_creates_all_tiers(self):
        authority = DecisionAuthority.with_common_defaults()
        assert len(authority.enforced) >= 1
        assert len(authority.autonomous) >= 1
        assert len(authority.propose) >= 1
        assert len(authority.escalate) >= 1

    def test_common_defaults_has_concrete_examples(self):
        authority = DecisionAuthority.with_common_defaults()
        for assignment in authority.assignments:
            assert assignment.examples, f"'{assignment.decision}' has no examples"

    def test_common_defaults_architecture_is_propose(self):
        authority = DecisionAuthority.with_common_defaults()
        arch = [a for a in authority.assignments if "architecture" in a.decision.lower()]
        assert arch, "Should have an architecture decision"
        assert arch[0].tier == DecisionTier.PROPOSE

    def test_common_defaults_code_pattern_is_autonomous(self):
        authority = DecisionAuthority.with_common_defaults()
        code = [a for a in authority.assignments if "code pattern" in a.decision.lower()]
        assert code, "Should have a code pattern decision"
        assert code[0].tier == DecisionTier.AUTONOMOUS

    def test_common_defaults_security_is_escalate(self):
        authority = DecisionAuthority.with_common_defaults()
        security = [a for a in authority.assignments if "security" in a.decision.lower()]
        assert security, "Should have a security decision"
        assert security[0].tier == DecisionTier.ESCALATE

    def test_maturity_calibration_greenfield(self):
        authority = DecisionAuthority.project_maturity_calibration(
            is_greenfield=True, has_strong_tests=True,
        )
        assert len(authority.calibration_rules) == 2
        conditions = {r.condition for r in authority.calibration_rules}
        assert CalibrationCondition.GREENFIELD in conditions
        assert CalibrationCondition.STRONG_TEST_COVERAGE in conditions

    def test_maturity_calibration_external_facing(self):
        authority = DecisionAuthority.project_maturity_calibration(
            is_external_facing=True,
        )
        assert len(authority.calibration_rules) == 1
        assert authority.calibration_rules[0].condition == CalibrationCondition.EXTERNAL_FACING
        assert "narrow" in authority.calibration_rules[0].effect.lower()

    def test_maturity_calibration_no_conditions(self):
        authority = DecisionAuthority.project_maturity_calibration()
        assert authority.calibration_rules == []
        # Should still have common defaults
        assert len(authority.assignments) > 0

    def test_maturity_calibration_all_conditions(self):
        authority = DecisionAuthority.project_maturity_calibration(
            has_strong_tests=True,
            is_greenfield=True,
            has_established_patterns=True,
            is_external_facing=True,
            has_self_healing=True,
        )
        assert len(authority.calibration_rules) == 5


# === Agent Model Extensions (Section 13) ===


@pytest.mark.phase2
class TestAgentModelExtensions:
    def test_model_rationale_field(self):
        agent = AgentDefinition(
            name="Orchestrator",
            category=AgentCategory.COMMAND,
            model_tier=ModelTier.FLAGSHIP,
            model_rationale="Needs deep reasoning for architecture decisions",
        )
        assert agent.model_rationale == "Needs deep reasoning for architecture decisions"

    def test_model_rationale_default_empty(self):
        agent = AgentDefinition(
            name="Worker",
            category=AgentCategory.ENGINEERING_BACKEND,
            model_tier=ModelTier.WORKHORSE,
        )
        assert agent.model_rationale == ""

    def test_context_budget_kb_field(self):
        agent = AgentDefinition(
            name="Analyst",
            category=AgentCategory.QUALITY,
            model_tier=ModelTier.WORKHORSE,
            context_budget_kb=200,
        )
        assert agent.context_budget_kb == 200

    def test_context_budget_kb_default_none(self):
        agent = AgentDefinition(
            name="Worker",
            category=AgentCategory.ENGINEERING_BACKEND,
            model_tier=ModelTier.WORKHORSE,
        )
        assert agent.context_budget_kb is None

    def test_context_budget_kb_rejects_zero(self):
        with pytest.raises(Exception):
            AgentDefinition(
                name="Bad",
                category=AgentCategory.ENGINEERING_BACKEND,
                model_tier=ModelTier.WORKHORSE,
                context_budget_kb=0,
            )


# === Handoff Protocol (Section 38 Extensions) ===


@pytest.mark.phase2
class TestHandoffProtocol:
    def test_validate_completeness_passes(self):
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Implement feature",
            deliverable="Code diff",
            acceptance_criteria=["Tests pass"],
            assumptions=["API stable"],
            context_files=["src/api.py"],
        )
        issues = validate_handoff_completeness(doc)
        assert issues == []

    def test_validate_completeness_warns_no_context(self):
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Do something",
            deliverable="Result",
            acceptance_criteria=["Done"],
            assumptions=["Stable"],
        )
        issues = validate_handoff_completeness(doc)
        assert any("context" in i.lower() for i in issues)

    def test_validate_acceptance_correct_receiver(self):
        doc = HandoffDocument(
            from_agent="Implementer",
            to_agent="QA",
            task="Review code",
            deliverable="PR diff",
            acceptance_criteria=["All tests pass"],
            assumptions=["No breaking changes"],
        )
        ok, reasons = validate_acceptance(doc, "QA")
        assert ok is True
        assert reasons == []

    def test_validate_acceptance_wrong_receiver(self):
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Review",
            deliverable="Code",
            acceptance_criteria=["Tests pass"],
            assumptions=["Stable"],
        )
        ok, reasons = validate_acceptance(doc, "C")
        assert ok is False
        assert any("C" in r for r in reasons)

    def test_validate_acceptance_vague_criteria(self):
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Review",
            deliverable="Code",
            acceptance_criteria=["OK"],
            assumptions=["Stable"],
        )
        ok, reasons = validate_acceptance(doc, "B")
        assert ok is False
        assert any("vague" in r.lower() for r in reasons)


# === Tool & Capability Registry (Section 12) ===


@pytest.mark.phase2
class TestToolRegistry:
    def test_create_agent_registry(self):
        reg = AgentToolRegistry(
            agent_role="Backend Implementer",
            available_tools=[
                ToolEntry(name="Read", capability="Read files"),
                ToolEntry(name="Write", capability="Write files"),
            ],
            not_available=["shell_access", "http_requests"],
        )
        assert len(reg.available_tools) == 2
        assert len(reg.not_available) == 2

    def test_overlap_rejected(self):
        with pytest.raises(Exception, match="both available and not_available"):
            AgentToolRegistry(
                agent_role="Bad",
                available_tools=[ToolEntry(name="Read", capability="Read")],
                not_available=["Read"],
            )

    def test_mcp_server_config(self):
        srv = MCPServerConfig(
            name="GitHub MCP",
            version="1.2.0",
            capability="Repo management",
            trust_level=MCPTrustLevel.OFFICIAL,
            agent_roles=["Orchestrator", "Implementer"],
        )
        assert srv.trust_level == MCPTrustLevel.OFFICIAL
        assert len(srv.agent_roles) == 2

    def test_fleet_registry_mcp_validation(self):
        registry = FleetToolRegistry(
            agent_registries=[
                AgentToolRegistry(
                    agent_role="Implementer",
                    mcp_servers=["GitHub MCP", "Ghost Server"],
                ),
            ],
            mcp_servers=[
                MCPServerConfig(name="GitHub MCP", version="1.2.0"),
            ],
        )
        violations = registry.validate_mcp_references()
        assert len(violations) == 1
        assert "Ghost Server" in violations[0]

    def test_fleet_registry_mcp_authorization(self):
        registry = FleetToolRegistry(
            agent_registries=[
                AgentToolRegistry(agent_role="QA", mcp_servers=["GitHub MCP"]),
            ],
            mcp_servers=[
                MCPServerConfig(
                    name="GitHub MCP",
                    version="1.2.0",
                    agent_roles=["Implementer"],  # QA not authorized
                ),
            ],
        )
        violations = registry.validate_mcp_agent_authorization()
        assert len(violations) == 1
        assert "QA" in violations[0]

    def test_fleet_registry_render(self):
        registry = FleetToolRegistry(
            mcp_servers=[
                MCPServerConfig(name="GitHub", version="1.0", capability="Repos"),
            ],
            agent_registries=[
                AgentToolRegistry(
                    agent_role="Dev",
                    available_tools=[ToolEntry(name="Read", capability="Read files")],
                    not_available=["shell"],
                ),
            ],
        )
        rendered = registry.render()
        assert "GitHub" in rendered
        assert "Dev" in rendered
        assert "shell" in rendered

    def test_fleet_registry_lookup(self):
        registry = FleetToolRegistry(
            agent_registries=[AgentToolRegistry(agent_role="QA")],
            mcp_servers=[MCPServerConfig(name="FS", version="1.0")],
        )
        assert registry.get_agent_registry("QA") is not None
        assert registry.get_agent_registry("Ghost") is None
        assert registry.get_mcp_server("FS") is not None
        assert registry.get_mcp_server("Ghost") is None


# === Protocol Integration (Section 14) ===


@pytest.mark.phase2
class TestProtocolIntegration:
    def test_a2a_connection(self):
        conn = A2AConnection(
            agent_a="Orchestrator",
            agent_b="External Agent",
            purpose="Cross-process task delegation",
            auth_method=A2AAuthMethod.OAUTH2,
        )
        assert conn.timeout_seconds == 300
        assert conn.bidirectional is True

    def test_protocol_registry(self):
        registry = ProtocolRegistry(
            a2a_enabled=True,
            a2a_connections=[
                A2AConnection(agent_a="A", agent_b="B", purpose="test"),
            ],
        )
        assert len(registry.get_connections_for("A")) == 1
        assert len(registry.get_connections_for("C")) == 0

    def test_validate_a2a_agents(self):
        registry = ProtocolRegistry(
            a2a_connections=[
                A2AConnection(agent_a="Real", agent_b="Ghost"),
            ],
        )
        violations = registry.validate_agents_exist({"Real", "Other"})
        assert len(violations) == 1
        assert "Ghost" in violations[0]


# === Failure Recovery (Section 22) ===


@pytest.mark.phase2
class TestRecoveryLadder:
    def test_ladder_order(self):
        assert RECOVERY_LADDER_ORDER == [
            RecoveryStep.RETRY,
            RecoveryStep.FALLBACK,
            RecoveryStep.BACKTRACK,
            RecoveryStep.ISOLATE,
            RecoveryStep.ESCALATE,
        ]

    def test_default_config(self):
        ladder = RecoveryLadder()
        assert ladder.retry.max_retries == 3
        assert ladder.log_all_recovery_actions is True

    def test_validate_readiness_missing_template(self):
        ladder = RecoveryLadder(escalation_template_ready=False)
        issues = ladder.validate_readiness()
        assert any("escalation template" in i.lower() for i in issues)

    def test_validate_readiness_missing_fallback(self):
        ladder = RecoveryLadder(escalation_template_ready=True)
        issues = ladder.validate_readiness()
        assert any("fallback" in i.lower() for i in issues)

    def test_validate_readiness_passes(self):
        ladder = RecoveryLadder(
            escalation_template_ready=True,
            fallback=FallbackConfig(
                description="Use simpler algorithm",
                quality_floor="Correct but slower",
            ),
        )
        assert ladder.validate_readiness() == []

    def test_recovery_record_valid_progression(self):
        record = RecoveryRecord(
            step=RecoveryStep.RETRY,
            description="Tried different approach",
            next_step=RecoveryStep.FALLBACK,
        )
        assert record.next_step == RecoveryStep.FALLBACK

    def test_recovery_record_rejects_skip(self):
        with pytest.raises(Exception, match="skip"):
            RecoveryRecord(
                step=RecoveryStep.RETRY,
                description="Tried once",
                next_step=RecoveryStep.ESCALATE,  # skips fallback, backtrack, isolate
            )

    def test_recovery_record_rejects_backward(self):
        with pytest.raises(Exception, match="ladder"):
            RecoveryRecord(
                step=RecoveryStep.BACKTRACK,
                description="Going back",
                next_step=RecoveryStep.RETRY,  # going backward
            )

    def test_recovery_record_no_next_step_ok(self):
        record = RecoveryRecord(
            step=RecoveryStep.RETRY,
            description="Succeeded on retry",
        )
        assert record.next_step is None


# === Context Budget Cross-Validation (Section 13) ===


@pytest.mark.phase2
class TestContextBudgetCrossValidation:
    def test_fits_budget(self):
        profile = ContextProfile(
            agent_role="Test",
            entries=[
                ContextEntry(name="small", slot=ContextSlot.STANDING, source="a.md", estimated_lines=100),
            ],
        )
        assert profile.validate_fits_budget(100) == []

    def test_exceeds_budget(self):
        profile = ContextProfile(
            agent_role="Bloated",
            entries=[
                ContextEntry(name="huge", slot=ContextSlot.STANDING, source="a.md", estimated_lines=100_000),
            ],
        )
        violations = profile.validate_fits_budget(100)
        assert len(violations) == 1
        assert "budget" in violations[0].lower()
