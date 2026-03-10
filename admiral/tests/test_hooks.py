"""Tests for hook runtime engine.

Phase 1: Hook discovery, dependency resolution, execution order,
timeout handling, self-healing loops, and all 8 hook implementations.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

import pytest

from admiral.hooks.engine import HookEngine, HookResult, HookChainResult
from admiral.hooks.lifecycle import HookEvent
from admiral.hooks.manifest import HookManifest
from admiral.hooks.self_healing import SelfHealingLoop, SelfHealingResult

from admiral.hooks.implementations import (
    token_budget_tracker,
    token_budget_gate,
    loop_detector,
    context_baseline,
    context_health_check,
    tier_validation,
    identity_validation,
    governance_heartbeat_monitor,
)


def _make_handler(exit_code: int = 0, stdout: str = "", stderr: str = ""):
    """Create a test hook handler that returns fixed results."""
    def handler(payload: dict[str, Any]) -> HookResult:
        return HookResult(
            hook_name="test",
            event=HookEvent.PRE_TOOL_USE,
            exit_code=exit_code,
            stdout=stdout,
            stderr=stderr,
            duration_ms=1.0,
        )
    return handler


def _make_manifest(
    name: str,
    events: list[HookEvent] | None = None,
    requires: list[str] | None = None,
) -> HookManifest:
    return HookManifest(
        name=name,
        version="1.0.0",
        events=events or [HookEvent.PRE_TOOL_USE],
        timeout_ms=5000,
        requires=requires or [],
        input_contract="v1",
        description=f"Test hook: {name}",
    )


# === Hook Engine Tests ===

@pytest.mark.phase1
class TestHookEngine:
    def test_register_hook(self, hook_engine):
        manifest = _make_manifest("test_hook")
        hook_engine.register(manifest, handler=_make_handler())
        assert "test_hook" in hook_engine.registered_hooks

    def test_register_duplicate_fails(self, hook_engine):
        manifest = _make_manifest("test_hook")
        hook_engine.register(manifest, handler=_make_handler())
        with pytest.raises(ValueError, match="already registered"):
            hook_engine.register(manifest, handler=_make_handler())

    def test_register_requires_executable_or_handler(self, hook_engine):
        manifest = _make_manifest("test_hook")
        with pytest.raises(ValueError, match="must have either"):
            hook_engine.register(manifest)

    def test_execute_passing_hook(self, hook_engine):
        manifest = _make_manifest("passing_hook")
        hook_engine.register(manifest, handler=_make_handler(exit_code=0))
        result = hook_engine.execute(HookEvent.PRE_TOOL_USE, {})
        assert result.passed is True

    def test_execute_failing_hook(self, hook_engine):
        manifest = _make_manifest("failing_hook")
        hook_engine.register(manifest, handler=_make_handler(exit_code=1, stdout="Error!"))
        result = hook_engine.execute(HookEvent.PRE_TOOL_USE, {})
        assert result.passed is False
        assert result.aborted is True

    def test_fail_fast_chain(self, hook_engine):
        """First failure stops the chain — remaining hooks don't execute."""
        hook_engine.register(
            _make_manifest("hook_a"),
            handler=_make_handler(exit_code=0),
        )
        hook_engine.register(
            _make_manifest("hook_b"),
            handler=_make_handler(exit_code=1, stdout="Failed"),
        )
        hook_engine.register(
            _make_manifest("hook_c"),
            handler=_make_handler(exit_code=0),
        )
        result = hook_engine.execute(HookEvent.PRE_TOOL_USE, {})
        assert result.passed is False
        # hook_c should not have been executed
        assert len(result.results) == 2

    def test_dependency_resolution(self, hook_engine):
        """Dependencies execute before dependents."""
        hook_engine.register(
            _make_manifest("tracker", events=[HookEvent.POST_TOOL_USE]),
            handler=_make_handler(),
        )
        hook_engine.register(
            _make_manifest("gate", events=[HookEvent.POST_TOOL_USE], requires=["tracker"]),
            handler=_make_handler(),
        )
        order = hook_engine.resolve_execution_order(HookEvent.POST_TOOL_USE)
        assert order.index("tracker") < order.index("gate")

    def test_circular_dependency_detection(self, hook_engine):
        hook_engine.register(
            _make_manifest("hook_a", requires=["hook_b"]),
            handler=_make_handler(),
        )
        hook_engine.register(
            _make_manifest("hook_b", requires=["hook_a"]),
            handler=_make_handler(),
        )
        errors = hook_engine.validate_dependencies()
        assert len(errors) == 1
        assert "Circular" in errors[0]

    def test_missing_dependency_detection(self, hook_engine):
        hook_engine.register(
            _make_manifest("hook_a", requires=["nonexistent"]),
            handler=_make_handler(),
        )
        errors = hook_engine.validate_dependencies()
        assert len(errors) == 1
        assert "nonexistent" in errors[0]

    def test_no_hooks_for_event(self, hook_engine):
        result = hook_engine.execute(HookEvent.PRE_TOOL_USE, {})
        assert result.passed is True
        assert len(result.results) == 0

    def test_hooks_per_event(self, hook_engine):
        hook_engine.register(
            _make_manifest("pre_hook", events=[HookEvent.PRE_TOOL_USE]),
            handler=_make_handler(),
        )
        hook_engine.register(
            _make_manifest("post_hook", events=[HookEvent.POST_TOOL_USE]),
            handler=_make_handler(),
        )
        pre = hook_engine.get_hooks_for_event(HookEvent.PRE_TOOL_USE)
        post = hook_engine.get_hooks_for_event(HookEvent.POST_TOOL_USE)
        assert len(pre) == 1
        assert pre[0].name == "pre_hook"
        assert len(post) == 1
        assert post[0].name == "post_hook"


# === Hook Manifest Tests ===

@pytest.mark.phase1
class TestHookManifest:
    def test_valid_manifest(self):
        m = HookManifest(
            name="token_budget_gate",
            version="1.0.0",
            events=[HookEvent.PRE_TOOL_USE],
            timeout_ms=5000,
            input_contract="v1",
            description="Blocks tool invocations that would exceed the session token budget.",
        )
        assert m.name == "token_budget_gate"
        assert m.timeout_seconds == 5.0

    def test_invalid_name_pattern(self):
        with pytest.raises(Exception):
            HookManifest(
                name="INVALID-Name",
                version="1.0.0",
                events=[HookEvent.PRE_TOOL_USE],
                timeout_ms=5000,
                input_contract="v1",
                description="This should fail validation",
            )

    def test_timeout_bounds(self):
        with pytest.raises(Exception):
            HookManifest(
                name="test",
                version="1.0.0",
                events=[HookEvent.PRE_TOOL_USE],
                timeout_ms=50,  # Below 100 minimum
                input_contract="v1",
                description="This should fail validation",
            )

    def test_unique_events_required(self):
        with pytest.raises(Exception):
            HookManifest(
                name="test",
                version="1.0.0",
                events=[HookEvent.PRE_TOOL_USE, HookEvent.PRE_TOOL_USE],
                timeout_ms=5000,
                input_contract="v1",
                description="This should fail validation",
            )


# === Self-Healing Loop Tests ===

@pytest.mark.phase1
class TestSelfHealing:
    def test_first_failure_allows_retry(self):
        loop = SelfHealingLoop(max_retries=3)
        result = loop.record_failure("test_hook", "Error: something broke")
        assert result.should_retry is True
        assert result.hook_retries == 1

    def test_max_retries_breaks_loop(self):
        loop = SelfHealingLoop(max_retries=3)
        for _ in range(2):
            result = loop.record_failure("test_hook", "Same error")
        # Third failure should break
        result = loop.record_failure("test_hook", "Same error")
        assert result.should_retry is False
        assert "recovery ladder" in result.message.lower()

    def test_session_max_retries(self):
        loop = SelfHealingLoop(max_retries=5, max_session_retries=3)
        for i in range(3):
            result = loop.record_failure("test_hook", f"Error {i}")
        result = loop.record_failure("test_hook", "Another error")
        assert result.should_retry is False
        assert "session retries" in result.message.lower()

    def test_success_resets_counters(self):
        loop = SelfHealingLoop(max_retries=3)
        loop.record_failure("test_hook", "Error")
        loop.record_failure("test_hook", "Error")
        loop.record_success("test_hook")
        # After success, counter should be reset
        result = loop.record_failure("test_hook", "Error")
        assert result.should_retry is True
        assert result.hook_retries == 1

    def test_different_errors_tracked_separately(self):
        loop = SelfHealingLoop(max_retries=3)
        loop.record_failure("hook_a", "Error type 1")
        loop.record_failure("hook_a", "Error type 2")
        # Different errors should each have count 1
        result = loop.record_failure("hook_a", "Error type 1")
        assert result.should_retry is True

    def test_error_signature_consistency(self):
        sig1 = SelfHealingLoop.compute_error_signature("hook", "Error: foo")
        sig2 = SelfHealingLoop.compute_error_signature("hook", "Error: foo")
        sig3 = SelfHealingLoop.compute_error_signature("hook", "Error: bar")
        assert sig1 == sig2
        assert sig1 != sig3


# === Hook Implementation Tests ===

@pytest.mark.phase1
class TestTokenBudgetTracker:
    def test_normal_usage(self):
        code, stdout, stderr = token_budget_tracker.execute({
            "session_state": {"tokens_used": 50_000, "token_budget": 200_000}
        })
        assert code == 0
        assert '"status": "ok"' in stdout

    def test_warning_at_80_percent(self):
        code, stdout, stderr = token_budget_tracker.execute({
            "session_state": {"tokens_used": 160_000, "token_budget": 200_000}
        })
        assert code == 0
        assert "WARNING" in stdout

    def test_escalation_at_90_percent(self):
        code, stdout, stderr = token_budget_tracker.execute({
            "session_state": {"tokens_used": 180_000, "token_budget": 200_000}
        })
        assert code == 0
        assert "ESCALATION" in stdout

    def test_no_budget_set(self):
        code, stdout, stderr = token_budget_tracker.execute({
            "session_state": {"tokens_used": 100, "token_budget": 0}
        })
        assert code == 0
        assert "no_budget_set" in stdout


@pytest.mark.phase1
class TestTokenBudgetGate:
    def test_budget_available(self):
        code, stdout, stderr = token_budget_gate.execute({
            "session_state": {"tokens_used": 50_000, "token_budget": 200_000}
        })
        assert code == 0

    def test_budget_exhausted(self):
        code, stdout, stderr = token_budget_gate.execute({
            "session_state": {"tokens_used": 200_000, "token_budget": 200_000}
        })
        assert code == 1
        assert "exhausted" in stdout.lower()

    def test_no_budget_allows(self):
        code, stdout, stderr = token_budget_gate.execute({
            "session_state": {"tokens_used": 999_999, "token_budget": 0}
        })
        assert code == 0


@pytest.mark.phase1
class TestLoopDetector:
    def setup_method(self):
        loop_detector.reset()

    def test_no_error_passes(self):
        code, stdout, stderr = loop_detector.execute({
            "result": {"exit_code": 0, "error": ""},
            "agent_identity": "agent-1",
        })
        assert code == 0

    def test_repeated_errors_detected(self):
        for _ in range(2):
            code, _, _ = loop_detector.execute({
                "result": {"exit_code": 1, "error": "TypeError: foo is not a function"},
                "agent_identity": "agent-1",
            })
            assert code == 0

        code, stdout, _ = loop_detector.execute({
            "result": {"exit_code": 1, "error": "TypeError: foo is not a function"},
            "agent_identity": "agent-1",
        })
        assert code == 1
        assert "Loop detected" in stdout

    def test_total_error_threshold(self):
        loop_detector.reset(max_same=100, max_total=5)
        for i in range(4):
            code, _, _ = loop_detector.execute({
                "result": {"exit_code": 1, "error": f"Different error {i}"},
                "agent_identity": "agent-1",
            })
            assert code == 0

        code, stdout, _ = loop_detector.execute({
            "result": {"exit_code": 1, "error": "Yet another error"},
            "agent_identity": "agent-1",
        })
        assert code == 1
        assert "total error count" in stdout.lower()


@pytest.mark.phase1
class TestContextBaseline:
    def setup_method(self):
        context_baseline.reset()

    def test_records_baseline(self):
        code, stdout, stderr = context_baseline.execute({
            "context": {
                "standing_context_tokens": 20_000,
                "total_capacity": 200_000,
            }
        })
        assert code == 0
        baseline = context_baseline.get_baseline()
        assert baseline is not None
        assert baseline["initial_utilization"] == 0.1
        assert baseline["available_capacity"] == 180_000


@pytest.mark.phase1
class TestContextHealthCheck:
    def test_healthy_context(self):
        code, stdout, stderr = context_health_check.execute({
            "context": {
                "current_utilization": 0.5,
                "standing_context_present": ["Identity", "Authority", "Constraints", "Knowledge"],
            }
        })
        assert code == 0
        assert "healthy" in stdout

    def test_high_utilization_alert(self):
        code, stdout, stderr = context_health_check.execute({
            "context": {
                "current_utilization": 0.9,
                "standing_context_present": ["Identity", "Authority", "Constraints"],
            }
        })
        assert code == 1
        assert "critical" in stdout

    def test_missing_critical_sections(self):
        code, stdout, stderr = context_health_check.execute({
            "context": {
                "current_utilization": 0.5,
                "standing_context_present": ["Identity"],  # Missing Authority, Constraints
            }
        })
        assert code == 1
        assert "Authority" in stdout or "Constraints" in stdout


@pytest.mark.phase1
class TestTierValidation:
    def test_tier_matches(self):
        code, stdout, stderr = tier_validation.execute({
            "agent_identity": "backend-impl",
            "model_id": "claude-sonnet-4.6",
            "tier_assignment": "workhorse",
            "degradation_policy": {},
        })
        assert code == 0
        assert "ok" in stdout

    def test_tier_exceeds(self):
        code, stdout, stderr = tier_validation.execute({
            "agent_identity": "backend-impl",
            "model_id": "claude-opus-4.6",
            "tier_assignment": "workhorse",
            "degradation_policy": {},
        })
        assert code == 0  # Flagship >= Workhorse

    def test_tier_violation_blocked(self):
        code, stdout, stderr = tier_validation.execute({
            "agent_identity": "orchestrator",
            "model_id": "claude-haiku-4.5",
            "tier_assignment": "flagship",
            "degradation_policy": {"blocked": "true"},
        })
        assert code == 1
        assert "violation" in stdout.lower()

    def test_no_model_fails(self):
        code, stdout, stderr = tier_validation.execute({
            "agent_identity": "test",
            "model_id": "",
            "tier_assignment": "workhorse",
            "degradation_policy": {},
        })
        assert code == 1


@pytest.mark.phase1
class TestIdentityValidation:
    def test_no_artifact_configured(self):
        code, stdout, stderr = identity_validation.execute({
            "agent_identity": "test",
            "project_config": {},
        })
        assert code == 0
        assert "skipped" in stdout

    def test_missing_artifact(self):
        code, stdout, stderr = identity_validation.execute({
            "agent_identity": "test",
            "project_config": {
                "auth_artifact_path": "/nonexistent/path/auth.json",
            },
        })
        assert code == 1
        assert "missing" in stdout.lower()

    def test_valid_artifact(self, tmp_path):
        auth_file = tmp_path / "auth.json"
        auth_file.write_text('{"valid": true}')
        code, stdout, stderr = identity_validation.execute({
            "agent_identity": "test",
            "project_config": {
                "auth_artifact_path": str(auth_file),
            },
        })
        assert code == 0
        assert "valid" in stdout


@pytest.mark.phase1
class TestGovernanceHeartbeatMonitor:
    def setup_method(self):
        governance_heartbeat_monitor.reset()

    def test_all_healthy(self):
        import time
        heartbeats = {
            agent: {"timestamp": time.time(), "confidence_self_assessment": 0.9}
            for agent in governance_heartbeat_monitor.DEFAULT_EXPECTED_AGENTS
        }
        code, stdout, stderr = governance_heartbeat_monitor.execute({
            "expected_agents": governance_heartbeat_monitor.DEFAULT_EXPECTED_AGENTS,
            "received_heartbeats": heartbeats,
        })
        assert code == 0
        assert "healthy" in stdout

    def test_missing_heartbeat_alert(self):
        governance_heartbeat_monitor.reset()
        # Miss twice to trigger alert (2 consecutive misses threshold)
        for _ in range(2):
            code, stdout, stderr = governance_heartbeat_monitor.execute({
                "expected_agents": ["Token Budgeter"],
                "received_heartbeats": {},
            })
        assert code == 1
        assert "ADMIRAL_DIRECT" in stdout

    def test_low_confidence_alert(self):
        import time
        code, stdout, stderr = governance_heartbeat_monitor.execute({
            "expected_agents": ["Token Budgeter"],
            "received_heartbeats": {
                "Token Budgeter": {
                    "timestamp": time.time(),
                    "confidence_self_assessment": 0.3,  # Below 0.5 threshold
                },
            },
        })
        assert code == 1
        assert "low_confidence" in stdout
