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
from admiral.models.authority import DecisionTier


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
