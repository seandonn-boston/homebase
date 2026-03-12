"""Comprehensive Level 2 tests.

Edge cases, serialization roundtrips, cross-model integration,
and prompt anatomy tests. Supplements test_level2.py.
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
    PromptAnatomy,
    PromptProbe,
    PromptSection,
    ProbeType,
    ExpectedBehavior,
    ScheduleType,
    ToolPermission,
    PROMPT_SECTION_ORDER,
)
from admiral.models.authority import (
    AuthorityAssignment,
    DecisionAuthority,
    DecisionTier,
)
from admiral.models.checkpoint import (
    Checkpoint,
    DecisionLog,
    DecisionRecord,
    HandoffBrief,
    ResourceUsage,
    TaskRecord,
    TaskStatus,
)
from admiral.models.context import (
    ContextBudget,
    ContextEntry,
    ContextProfile,
    ContextSlot,
    STANDING_CONTEXT_MAX_LINES,
)
from admiral.models.fleet import (
    FleetRoster,
    RoutingRule,
    RoutingTable,
    FLEET_MAX_AGENTS,
)
from admiral.models.ground_truth import (
    GroundTruth,
    KnownIssue,
    KnownIssueSeverity,
    TechStackEntry,
)
from admiral.models.handoff import HandoffDocument, validate_handoff
from admiral.models.protocol_integration import (
    A2AAuthMethod,
    A2AConnection,
    ProtocolRegistry,
)
from admiral.models.recovery import (
    RecoveryLadder,
    RecoveryRecord,
    RecoveryStep,
    FallbackConfig,
    RECOVERY_LADDER_ORDER,
)
from admiral.models.tool_registry import (
    AgentToolRegistry,
    FleetToolRegistry,
    MCPServerConfig,
    MCPTrustLevel,
    ToolEntry,
)
from admiral.models.work import (
    ChunkState,
    Decomposition,
    QualityGate,
    WorkChunk,
)
from admiral.protocols.handoff_protocol import (
    MIN_CRITERION_LENGTH,
    validate_acceptance,
    validate_handoff_completeness,
)


# ===================== HELPERS =====================


def _make_agent(name: str, **kwargs) -> AgentDefinition:
    """Create a minimal valid agent definition."""
    defaults = {
        "category": AgentCategory.ENGINEERING_BACKEND,
        "model_tier": ModelTier.WORKHORSE,
    }
    defaults.update(kwargs)
    return AgentDefinition(name=name, **defaults)


def _make_fleet(n: int = 3) -> FleetRoster:
    """Create a fleet with n agents and simple routing."""
    agents = [_make_agent(f"Agent-{i}") for i in range(n)]
    rules = [
        RoutingRule(task_type=f"task_{i}", agent_role=f"Agent-{i}")
        for i in range(n)
    ]
    return FleetRoster(agents=agents, routing=RoutingTable(rules=rules))


# ===================== EDGE CASES =====================


@pytest.mark.phase2
class TestEdgeCases:
    """Edge case tests for boundary values, empty inputs, and rejections."""

    # --- Ground Truth ---

    def test_ground_truth_empty_is_valid(self):
        """An empty GroundTruth is valid — it's a starting point."""
        gt = GroundTruth()
        assert gt.tech_stack == []
        assert gt.glossary == {}

    def test_ground_truth_rejects_all_vague_versions(self):
        """All documented vague terms must be rejected."""
        for vague in ["latest", "stable", "current", "newest", "recent", "lts"]:
            with pytest.raises(ValidationError, match="exact"):
                TechStackEntry(name="X", version=vague)

    def test_ground_truth_accepts_exact_version(self):
        for version in ["3.12.3", "19.1", "0.2.0-alpha", "5.7.2"]:
            entry = TechStackEntry(name="X", version=version)
            assert entry.version == version

    def test_ground_truth_get_tech_case_insensitive(self):
        gt = GroundTruth(
            tech_stack=[TechStackEntry(name="React", version="19.1")]
        )
        assert gt.get_tech("react") is not None
        assert gt.get_tech("REACT") is not None
        assert gt.get_tech("Vue") is None

    def test_ground_truth_get_critical_issues_empty(self):
        gt = GroundTruth(
            known_issues=[
                KnownIssue(description="Minor bug", severity=KnownIssueSeverity.LOW),
            ]
        )
        assert gt.get_critical_issues() == []

    # --- Context Budget ---

    def test_context_budget_rejects_sum_not_100(self):
        with pytest.raises(ValidationError, match="100%"):
            ContextBudget(standing_pct=20, session_pct=50, working_pct=20)

    def test_context_budget_rejects_standing_below_min(self):
        with pytest.raises(ValidationError):
            ContextBudget(standing_pct=10, session_pct=60, working_pct=30)

    def test_context_budget_rejects_standing_above_max(self):
        with pytest.raises(ValidationError):
            ContextBudget(standing_pct=30, session_pct=50, working_pct=20)

    def test_standing_lines_at_limit(self):
        """Exactly at 150-line limit should pass."""
        profile = ContextProfile(
            agent_role="Test",
            entries=[
                ContextEntry(
                    name="Big",
                    slot=ContextSlot.STANDING,
                    source="big.md",
                    estimated_lines=STANDING_CONTEXT_MAX_LINES,
                ),
            ],
        )
        assert profile.validate_standing_limit() == []

    def test_standing_lines_over_limit(self):
        """One line over 150 should produce a violation."""
        profile = ContextProfile(
            agent_role="Test",
            entries=[
                ContextEntry(
                    name="TooBig",
                    slot=ContextSlot.STANDING,
                    source="big.md",
                    estimated_lines=STANDING_CONTEXT_MAX_LINES + 1,
                ),
            ],
        )
        violations = profile.validate_standing_limit()
        assert len(violations) == 1
        assert "151" in violations[0]

    # --- Work Decomposition ---

    def test_chunk_budget_at_exact_ceiling(self):
        """Exactly 40% should pass."""
        chunk = WorkChunk(
            id="c1",
            description="Task",
            token_budget=40_000,
            agent_total_budget=100_000,
        )
        assert chunk.token_budget == 40_000

    def test_chunk_budget_over_ceiling(self):
        """41% should fail."""
        with pytest.raises(ValidationError, match="ceiling"):
            WorkChunk(
                id="c1",
                description="Task",
                token_budget=41_000,
                agent_total_budget=100_000,
            )

    def test_chunk_budget_no_total_skips_validation(self):
        """Without agent_total_budget, ceiling check is skipped."""
        chunk = WorkChunk(id="c1", description="Task", token_budget=999_999)
        assert chunk.token_budget == 999_999

    def test_decomposition_requires_at_least_one_chunk(self):
        with pytest.raises(ValidationError):
            Decomposition(goal="Do something", chunks=[])

    def test_next_actionable_with_unmet_deps(self):
        """No chunk actionable when deps are pending."""
        decomp = Decomposition(
            goal="Test",
            chunks=[
                WorkChunk(id="a", description="First"),
                WorkChunk(id="b", description="Second", depends_on=["a"]),
            ],
        )
        # "a" is actionable (no deps), "b" is not (depends on "a")
        n = decomp.next_actionable()
        assert n is not None
        assert n.id == "a"

    def test_validate_chunk_ids_catches_bad_dep(self):
        decomp = Decomposition(
            goal="Test",
            chunks=[
                WorkChunk(id="a", description="First", depends_on=["nonexistent"]),
            ],
        )
        violations = decomp.validate_chunk_ids()
        assert len(violations) == 1
        assert "nonexistent" in violations[0]

    # --- Fleet ---

    def test_fleet_rejects_over_max(self):
        with pytest.raises(ValidationError, match="exceeds"):
            _make_fleet(FLEET_MAX_AGENTS + 1)

    def test_fleet_single_agent_valid(self):
        """Minimum fleet of 1 is valid per implementation note."""
        fleet = _make_fleet(1)
        assert len(fleet.agents) == 1

    def test_fleet_get_agent_not_found(self):
        fleet = _make_fleet(2)
        assert fleet.get_agent("nonexistent") is None

    def test_routing_no_match(self):
        table = RoutingTable(
            rules=[RoutingRule(task_type="backend", agent_role="BE")]
        )
        assert table.route("frontend") is None

    def test_routing_priority_order(self):
        table = RoutingTable(
            rules=[
                RoutingRule(task_type="code", agent_role="Junior", priority=10),
                RoutingRule(task_type="code", agent_role="Senior", priority=90),
            ]
        )
        assert table.route("code") == "Senior"

    # --- Recovery ---

    def test_recovery_ladder_no_skip(self):
        """Cannot skip from RETRY to BACKTRACK (must go through FALLBACK)."""
        with pytest.raises(ValidationError, match="skip"):
            RecoveryRecord(
                step=RecoveryStep.RETRY,
                description="Failed",
                next_step=RecoveryStep.BACKTRACK,
            )

    def test_recovery_ladder_no_backward(self):
        """Cannot go backward from FALLBACK to RETRY."""
        with pytest.raises(ValidationError, match="progress up"):
            RecoveryRecord(
                step=RecoveryStep.FALLBACK,
                description="Failed",
                next_step=RecoveryStep.RETRY,
            )

    def test_recovery_valid_progression(self):
        """Valid: RETRY → FALLBACK."""
        record = RecoveryRecord(
            step=RecoveryStep.RETRY,
            description="Tried different approach",
            next_step=RecoveryStep.FALLBACK,
        )
        assert record.next_step == RecoveryStep.FALLBACK

    def test_recovery_no_next_step_valid(self):
        """Recovery record without next_step is valid (recovery succeeded)."""
        record = RecoveryRecord(
            step=RecoveryStep.RETRY,
            description="Worked on second attempt",
        )
        assert record.next_step is None

    # --- Handoff ---

    def test_handoff_sender_equals_receiver_rejected(self):
        with pytest.raises(ValidationError, match="differ"):
            HandoffDocument(
                from_agent="A",
                to_agent="A",
                task="Self-review",
                deliverable="Code",
                acceptance_criteria=["Done and verified"],
            )

    def test_handoff_empty_acceptance_criteria_rejected(self):
        with pytest.raises(ValidationError):
            HandoffDocument(
                from_agent="A",
                to_agent="B",
                task="Review",
                deliverable="Code",
                acceptance_criteria=[],
            )

    def test_handoff_criterion_at_min_length(self):
        """Exactly MIN_CRITERION_LENGTH chars should pass acceptance validation."""
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Review",
            deliverable="Code",
            acceptance_criteria=["x" * MIN_CRITERION_LENGTH],
            assumptions=["Stable"],
        )
        ok, reasons = validate_acceptance(doc, "B")
        assert ok is True

    def test_handoff_criterion_below_min_length(self):
        """Below MIN_CRITERION_LENGTH chars should fail acceptance."""
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Review",
            deliverable="Code",
            acceptance_criteria=["x" * (MIN_CRITERION_LENGTH - 1)],
            assumptions=["Stable"],
        )
        ok, reasons = validate_acceptance(doc, "B")
        assert ok is False
        assert any("vague" in r.lower() for r in reasons)

    # --- Tool Registry ---

    def test_tool_registry_overlap_rejected(self):
        with pytest.raises(ValidationError, match="both"):
            AgentToolRegistry(
                agent_role="Test",
                available_tools=[ToolEntry(name="git")],
                not_available=["git"],
            )

    def test_tool_registry_no_overlap_valid(self):
        reg = AgentToolRegistry(
            agent_role="Test",
            available_tools=[ToolEntry(name="git")],
            not_available=["docker"],
        )
        assert len(reg.available_tools) == 1
        assert "docker" in reg.not_available

    # --- Authority ---

    def test_authority_defaults_have_all_tiers(self):
        da = DecisionAuthority.with_common_defaults()
        assert len(da.enforced) >= 1
        assert len(da.autonomous) >= 1
        assert len(da.propose) >= 1
        assert len(da.escalate) >= 1

    def test_authority_calibration_greenfield(self):
        da = DecisionAuthority.project_maturity_calibration(is_greenfield=True)
        assert any(
            r.condition.value == "greenfield" for r in da.calibration_rules
        )


# ===================== SERIALIZATION ROUNDTRIPS =====================


@pytest.mark.phase2
class TestSerializationRoundtrips:
    """Verify all Level 2 models survive JSON roundtrip."""

    def test_ground_truth_roundtrip(self):
        gt = GroundTruth(
            glossary={"fleet": "Agent collection"},
            tech_stack=[TechStackEntry(name="Python", version="3.12.3")],
            known_issues=[
                KnownIssue(
                    description="Race condition",
                    severity=KnownIssueSeverity.HIGH,
                    workaround="Add mutex",
                )
            ],
        )
        data = gt.model_dump()
        restored = GroundTruth.model_validate(data)
        assert restored.glossary == gt.glossary
        assert restored.tech_stack[0].version == "3.12.3"
        assert restored.known_issues[0].severity == KnownIssueSeverity.HIGH

    def test_ground_truth_json_roundtrip(self):
        gt = GroundTruth(
            tech_stack=[TechStackEntry(name="React", version="19.1")],
        )
        json_str = gt.model_dump_json()
        restored = GroundTruth.model_validate_json(json_str)
        assert restored.tech_stack[0].name == "React"

    def test_context_profile_roundtrip(self):
        profile = ContextProfile(
            agent_role="Backend",
            budget=ContextBudget(standing_pct=20, session_pct=55, working_pct=25),
            entries=[
                ContextEntry(
                    name="Identity",
                    slot=ContextSlot.STANDING,
                    source="agents.md",
                    estimated_lines=50,
                ),
            ],
        )
        restored = ContextProfile.model_validate(profile.model_dump())
        assert restored.agent_role == "Backend"
        assert restored.budget.standing_pct == 20
        assert len(restored.entries) == 1

    def test_work_chunk_roundtrip(self):
        chunk = WorkChunk(
            id="chunk-1",
            description="Implement auth",
            state=ChunkState.IN_PROGRESS,
            entry_state=["Schema exists"],
            exit_state=["Tests pass"],
            token_budget=30_000,
            agent_total_budget=100_000,
            quality_gates=[QualityGate(name="lint", command="ruff check")],
            depends_on=["chunk-0"],
        )
        restored = WorkChunk.model_validate(json.loads(chunk.model_dump_json()))
        assert restored.id == "chunk-1"
        assert restored.state == ChunkState.IN_PROGRESS
        assert restored.quality_gates[0].command == "ruff check"

    def test_checkpoint_roundtrip(self):
        cp = Checkpoint(
            session_id="session-001",
            completed=[
                TaskRecord(description="Setup", status=TaskStatus.COMPLETED)
            ],
            assumptions=["Database is running"],
            resources=ResourceUsage(
                tokens_used=50_000, tokens_budget=200_000, tool_calls=42
            ),
        )
        data = cp.model_dump()
        restored = Checkpoint.model_validate(data)
        assert restored.session_id == "session-001"
        assert restored.resources.tokens_used == 50_000
        assert restored.resources.tokens_remaining == 150_000
        assert len(restored.completed) == 1

    def test_handoff_roundtrip(self):
        doc = HandoffDocument(
            from_agent="Implementer",
            to_agent="QA",
            task="Review auth module",
            deliverable="PR #42 diff",
            acceptance_criteria=["All tests pass", "No security issues"],
            context_files=["src/auth/"],
            assumptions=["No breaking changes"],
        )
        restored = HandoffDocument.model_validate_json(doc.model_dump_json())
        assert restored.from_agent == "Implementer"
        assert len(restored.acceptance_criteria) == 2

    def test_fleet_roundtrip(self):
        fleet = _make_fleet(3)
        data = fleet.model_dump()
        restored = FleetRoster.model_validate(data)
        assert len(restored.agents) == 3
        assert len(restored.routing.rules) == 3

    def test_recovery_record_roundtrip(self):
        record = RecoveryRecord(
            step=RecoveryStep.RETRY,
            description="Retried with different prompt",
            attempt=2,
            outcome="success",
        )
        restored = RecoveryRecord.model_validate_json(record.model_dump_json())
        assert restored.step == RecoveryStep.RETRY
        assert restored.attempt == 2

    def test_tool_registry_roundtrip(self):
        fleet_reg = FleetToolRegistry(
            agent_registries=[
                AgentToolRegistry(
                    agent_role="Backend",
                    available_tools=[ToolEntry(name="Read", capability="Read files")],
                    not_available=["Write"],
                    mcp_servers=["db-server"],
                ),
            ],
            mcp_servers=[
                MCPServerConfig(
                    name="db-server",
                    version="1.2.3",
                    capability="Database access",
                    agent_roles=["Backend"],
                ),
            ],
        )
        restored = FleetToolRegistry.model_validate_json(
            fleet_reg.model_dump_json()
        )
        assert restored.agent_registries[0].agent_role == "Backend"
        assert restored.mcp_servers[0].version == "1.2.3"

    def test_protocol_registry_roundtrip(self):
        reg = ProtocolRegistry(
            a2a_connections=[
                A2AConnection(
                    agent_a="Orchestrator",
                    agent_b="QA",
                    auth_method=A2AAuthMethod.API_KEY,
                ),
            ],
            a2a_enabled=True,
        )
        restored = ProtocolRegistry.model_validate_json(reg.model_dump_json())
        assert restored.a2a_enabled is True
        assert restored.a2a_connections[0].auth_method == A2AAuthMethod.API_KEY

    def test_decision_log_roundtrip(self):
        log = DecisionLog()
        log.append(
            DecisionRecord(
                timestamp="2026-03-12T10:00:00",
                decision="Use Pydantic v2",
                alternatives=["dataclasses", "attrs"],
                rationale="Better validation",
                authority_tier=DecisionTier.AUTONOMOUS,
            )
        )
        data = log.model_dump()
        restored = DecisionLog.model_validate(data)
        assert len(restored.decisions) == 1
        assert restored.decisions[0].authority_tier == DecisionTier.AUTONOMOUS


# ===================== PROMPT ANATOMY (Section 04) =====================


@pytest.mark.phase2
class TestPromptAnatomy:
    """Tests for the five-section prompt anatomy from Section 04."""

    def test_section_order_is_canonical(self):
        """Identity first, Task last."""
        assert PROMPT_SECTION_ORDER[0] == PromptSection.IDENTITY
        assert PROMPT_SECTION_ORDER[-1] == PromptSection.TASK
        assert len(PROMPT_SECTION_ORDER) == 5

    def test_from_agent_populates_identity(self):
        agent = _make_agent(
            "Backend Implementer",
            description="Writes backend code.",
        )
        anatomy = PromptAnatomy.from_agent(agent)
        assert "Backend Implementer" in anatomy.identity
        assert "Writes backend code" in anatomy.identity

    def test_from_agent_populates_constraints(self):
        agent = _make_agent(
            "QA Agent",
            scope=AgentScope(
                does=["Review code"],
                does_not_do=["Fix bugs directly", "Approve own work"],
            ),
            tools=ToolPermission(
                allowed=["Read"],
                denied=["Write"],
                rationale={"Write": "QA does not modify code"},
            ),
        )
        anatomy = PromptAnatomy.from_agent(agent)
        assert "Fix bugs directly" in anatomy.constraints
        assert "Write" in anatomy.constraints
        assert "QA does not modify code" in anatomy.constraints

    def test_from_agent_populates_authority(self):
        agent = _make_agent(
            "Architect",
            decision_authority=DecisionAuthority(
                assignments=[
                    AuthorityAssignment(
                        decision="Architecture change",
                        tier=DecisionTier.PROPOSE,
                    ),
                ]
            ),
        )
        anatomy = PromptAnatomy.from_agent(agent)
        assert "PROPOSE" in anatomy.authority
        assert "Architecture change" in anatomy.authority

    def test_from_agent_leaves_knowledge_and_task_empty(self):
        """Knowledge and Task are populated at runtime, not from agent def."""
        agent = _make_agent("Test")
        anatomy = PromptAnatomy.from_agent(agent)
        assert anatomy.knowledge == ""
        assert anatomy.task == ""

    def test_render_order(self):
        """Sections render in canonical order."""
        anatomy = PromptAnatomy(
            identity="I am the Agent.",
            authority="AUTONOMOUS: naming",
            constraints="Do NOT modify schema.",
            knowledge="Stack: Python 3.12",
            task="Implement auth endpoint.",
        )
        rendered = anatomy.render()
        # Verify order: IDENTITY before AUTHORITY before CONSTRAINTS
        # before KNOWLEDGE before TASK
        idx_id = rendered.index("IDENTITY")
        idx_auth = rendered.index("AUTHORITY")
        idx_con = rendered.index("CONSTRAINTS")
        idx_know = rendered.index("KNOWLEDGE")
        idx_task = rendered.index("TASK")
        assert idx_id < idx_auth < idx_con < idx_know < idx_task

    def test_render_skips_empty_sections(self):
        anatomy = PromptAnatomy(identity="I am the Agent.")
        rendered = anatomy.render()
        assert "IDENTITY" in rendered
        assert "AUTHORITY" not in rendered
        assert "TASK" not in rendered

    def test_sections_returns_only_non_empty(self):
        anatomy = PromptAnatomy(
            identity="Agent",
            task="Do work",
        )
        sections = anatomy.sections()
        assert len(sections) == 2
        assert sections[0][0] == PromptSection.IDENTITY
        assert sections[1][0] == PromptSection.TASK

    def test_prompt_probe_creation(self):
        probe = PromptProbe(
            probe_type=ProbeType.BOUNDARY,
            description="Ask Backend to modify CSS",
            input_text="Update src/styles/main.css",
            expected=ExpectedBehavior.REFUSE,
            rationale="Backend scope excludes frontend files",
            agent_role="Backend Implementer",
        )
        assert probe.probe_type == ProbeType.BOUNDARY
        assert probe.expected == ExpectedBehavior.REFUSE

    def test_all_probe_types(self):
        for pt in ProbeType:
            probe = PromptProbe(
                probe_type=pt,
                description=f"Test {pt.value}",
                input_text="input",
                expected=ExpectedBehavior.COMPLY,
            )
            assert probe.probe_type == pt

    def test_all_expected_behaviors(self):
        for eb in ExpectedBehavior:
            probe = PromptProbe(
                probe_type=ProbeType.BOUNDARY,
                description="Test",
                input_text="input",
                expected=eb,
            )
            assert probe.expected == eb

    def test_agent_non_goals_property(self):
        agent = _make_agent(
            "Test",
            scope=AgentScope(does_not_do=["Modify schema", "Deploy to prod"]),
        )
        assert agent.non_goals == ["Modify schema", "Deploy to prod"]


# ===================== CROSS-MODEL INTEGRATION =====================


@pytest.mark.phase2
class TestCrossModelIntegration:
    """Tests that verify models compose correctly across module boundaries."""

    def test_fleet_routing_validates_against_roster(self):
        """Routing rules must reference agents that exist in the roster."""
        fleet = FleetRoster(
            agents=[_make_agent("Backend")],
            routing=RoutingTable(
                rules=[
                    RoutingRule(task_type="code", agent_role="Backend"),
                    RoutingRule(task_type="review", agent_role="Nonexistent"),
                ]
            ),
        )
        violations = fleet.validate_routing()
        assert len(violations) == 1
        assert "Nonexistent" in violations[0]

    def test_fleet_self_qa_detection(self):
        """Agent doing both implementation and QA is flagged."""
        fleet = FleetRoster(
            agents=[_make_agent("Fullstack")],
            routing=RoutingTable(
                rules=[
                    RoutingRule(task_type="implement_feature", agent_role="Fullstack"),
                    RoutingRule(task_type="code_review", agent_role="Fullstack"),
                ]
            ),
        )
        violations = fleet.validate_no_self_qa()
        assert len(violations) == 1
        assert "conflict of interest" in violations[0].lower()

    def test_tool_registry_mcp_reference_validation(self):
        """Agent MCP references must point to registered fleet servers."""
        fleet_reg = FleetToolRegistry(
            agent_registries=[
                AgentToolRegistry(
                    agent_role="Backend",
                    mcp_servers=["db-server", "ghost-server"],
                ),
            ],
            mcp_servers=[
                MCPServerConfig(name="db-server", version="1.0.0"),
            ],
        )
        violations = fleet_reg.validate_mcp_references()
        assert len(violations) == 1
        assert "ghost-server" in violations[0]

    def test_tool_registry_mcp_authorization_validation(self):
        """Agent must be authorized in the MCP server's role list."""
        fleet_reg = FleetToolRegistry(
            agent_registries=[
                AgentToolRegistry(agent_role="Frontend", mcp_servers=["db"]),
            ],
            mcp_servers=[
                MCPServerConfig(
                    name="db",
                    version="1.0.0",
                    agent_roles=["Backend"],  # Frontend not listed
                ),
            ],
        )
        violations = fleet_reg.validate_mcp_agent_authorization()
        assert len(violations) == 1
        assert "Frontend" in violations[0]

    def test_context_profile_fits_agent_budget(self):
        """Context profile estimates must fit within agent's context_budget_kb."""
        profile = ContextProfile(
            agent_role="Test",
            entries=[
                ContextEntry(
                    name="Huge",
                    slot=ContextSlot.SESSION,
                    source="big.md",
                    estimated_lines=100_000,  # ~4000KB at 40 bytes/line
                ),
            ],
        )
        violations = profile.validate_fits_budget(context_budget_kb=100)
        assert len(violations) == 1
        assert "100KB" in violations[0]

    def test_context_profile_fits_agent_budget_ok(self):
        profile = ContextProfile(
            agent_role="Test",
            entries=[
                ContextEntry(
                    name="Small",
                    slot=ContextSlot.SESSION,
                    source="small.md",
                    estimated_lines=100,  # ~4KB
                ),
            ],
        )
        violations = profile.validate_fits_budget(context_budget_kb=100)
        assert violations == []

    def test_a2a_connections_validate_against_roster(self):
        """A2A endpoints must exist in the fleet roster."""
        reg = ProtocolRegistry(
            a2a_connections=[
                A2AConnection(agent_a="Backend", agent_b="Ghost"),
            ],
        )
        violations = reg.validate_agents_exist({"Backend", "Frontend"})
        assert len(violations) == 1
        assert "Ghost" in violations[0]

    def test_recovery_ladder_readiness_check(self):
        """Recovery ladder must have escalation template and fallback described."""
        ladder = RecoveryLadder()  # defaults: not ready
        issues = ladder.validate_readiness()
        assert len(issues) == 2  # no escalation template, no fallback

        ready_ladder = RecoveryLadder(
            escalation_template_ready=True,
            fallback=FallbackConfig(
                description="Revert to last known good",
                quality_floor="Partial feature",
            ),
        )
        assert ready_ladder.validate_readiness() == []

    def test_checkpoint_decision_log_query(self):
        """Decision log queries by tier should work correctly."""
        cp = Checkpoint(session_id="test")
        cp.decision_log.append(
            DecisionRecord(
                timestamp="2026-03-12T10:00:00",
                decision="Add Pydantic",
                authority_tier=DecisionTier.PROPOSE,
            )
        )
        cp.decision_log.append(
            DecisionRecord(
                timestamp="2026-03-12T10:01:00",
                decision="Name variable 'foo'",
                authority_tier=DecisionTier.AUTONOMOUS,
            )
        )
        assert len(cp.decision_log.proposed) == 1
        assert len(cp.decision_log.escalated) == 0
        assert len(cp.decision_log.by_tier(DecisionTier.AUTONOMOUS)) == 1

    def test_handoff_completeness_with_and_without_context(self):
        """Short task without context is fine; long task without context warns."""
        short_doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Fix typo",
            deliverable="Patch",
            acceptance_criteria=["Typo is fixed in output"],
            assumptions=["File exists"],
        )
        assert validate_handoff_completeness(short_doc) == []

        long_doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="x" * 201,
            deliverable="Result",
            acceptance_criteria=["Done and verified"],
        )
        issues = validate_handoff_completeness(long_doc)
        assert any("context" in i.lower() for i in issues)

    def test_full_fleet_workflow(self):
        """End-to-end: fleet → routing → handoff → checkpoint."""
        # 1. Create fleet
        fleet = FleetRoster(
            agents=[
                _make_agent("Orchestrator", category=AgentCategory.COMMAND),
                _make_agent("Backend"),
                _make_agent("QA", category=AgentCategory.QUALITY),
            ],
            routing=RoutingTable(
                rules=[
                    RoutingRule(task_type="implement", agent_role="Backend"),
                    RoutingRule(task_type="review", agent_role="QA"),
                ]
            ),
        )
        assert fleet.validate_routing() == []

        # 2. Route a task
        target = fleet.routing.route("implement")
        assert target == "Backend"

        # 3. Backend produces a handoff to QA
        handoff = HandoffDocument(
            from_agent="Backend",
            to_agent="QA",
            task="Review the auth implementation",
            deliverable="PR diff for src/auth/",
            acceptance_criteria=["All tests pass", "No SQL injection vectors"],
            context_files=["src/auth/handler.py"],
            assumptions=["Schema is stable"],
        )
        ok, reasons = validate_acceptance(handoff, "QA")
        assert ok is True

        # 4. Create checkpoint
        cp = Checkpoint(
            session_id="session-001",
            completed=[
                TaskRecord(description="Auth implementation", status=TaskStatus.COMPLETED)
            ],
            next_tasks=["QA review", "Deploy to staging"],
            assumptions=["Schema is stable"],
        )
        rendered = cp.render()
        assert "Auth implementation" in rendered
        assert "QA review" in rendered


# ===================== RENDER METHODS =====================


@pytest.mark.phase2
class TestRenderMethods:
    """Verify render() methods produce valid structured text."""

    def test_ground_truth_render(self):
        gt = GroundTruth(
            glossary={"fleet": "Agent collection"},
            tech_stack=[TechStackEntry(name="Python", version="3.12.3")],
        )
        rendered = gt.render()
        assert "Ground Truth" in rendered
        assert "Python 3.12.3" in rendered
        assert "fleet" in rendered

    def test_handoff_render(self):
        doc = HandoffDocument(
            from_agent="A",
            to_agent="B",
            task="Review",
            deliverable="Code",
            acceptance_criteria=["Tests pass"],
        )
        rendered = doc.render()
        assert "FROM: A" in rendered
        assert "TO: B" in rendered
        assert "Tests pass" in rendered

    def test_checkpoint_render_empty_assumptions(self):
        cp = Checkpoint(session_id="test")
        rendered = cp.render()
        assert "suspicious" in rendered.lower()

    def test_handoff_brief_render(self):
        brief = HandoffBrief(
            session_id="s-001",
            completed_summary="Built auth module",
            next_session_should=["Run integration tests", "Deploy"],
        )
        rendered = brief.render()
        assert "Built auth module" in rendered
        assert "Run integration tests" in rendered

    def test_tool_registry_render(self):
        fleet_reg = FleetToolRegistry(
            agent_registries=[
                AgentToolRegistry(
                    agent_role="Backend",
                    available_tools=[ToolEntry(name="Read", capability="Read files")],
                    not_available=["Deploy"],
                ),
            ],
        )
        rendered = fleet_reg.render()
        assert "Backend" in rendered
        assert "Read" in rendered
        assert "Deploy" in rendered
