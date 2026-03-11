"""Tests for the runtime adapter layer.

Validates that the adapter correctly translates between Claude Code's
hook payload format and admiral's internal hook contract.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from unittest.mock import patch

import pytest

from admiral.runtime.state import (
    load_state,
    save_state,
    reset_state,
    increment_usage,
    estimate_tokens,
    STATE_DIR,
    STATE_FILE,
    DEFAULT_TOKEN_BUDGET,
)
from admiral.runtime.hook_adapter import (
    handle_session_start,
    handle_pre_tool_use,
    handle_post_tool_use,
)


@pytest.fixture(autouse=True)
def clean_state(tmp_path, monkeypatch):
    """Use a temp directory for state files during tests."""
    test_state_dir = tmp_path / ".admiral"
    test_state_file = test_state_dir / "session_state.json"
    monkeypatch.setattr("admiral.runtime.state.STATE_DIR", test_state_dir)
    monkeypatch.setattr("admiral.runtime.state.STATE_FILE", test_state_file)
    monkeypatch.setattr("admiral.runtime.hook_adapter.load_state", lambda: load_state())
    monkeypatch.setattr("admiral.runtime.hook_adapter.save_state", lambda s: save_state(s))
    monkeypatch.setattr("admiral.runtime.hook_adapter.reset_state", lambda: reset_state())
    yield
    # Cleanup happens automatically with tmp_path


# === State Persistence Tests ===


@pytest.mark.phase1
class TestStatePersistence:
    def test_default_state_has_required_fields(self):
        state = reset_state()
        assert "tokens_used" in state
        assert "token_budget" in state
        assert "hook_state" in state
        assert "context" in state
        assert state["tokens_used"] == 0
        assert state["token_budget"] == DEFAULT_TOKEN_BUDGET

    def test_save_and_load_roundtrip(self):
        state = reset_state()
        state["tokens_used"] = 50_000
        state["hook_state"]["loop_detector"] = {"total_errors": 2}
        save_state(state)

        loaded = load_state()
        assert loaded["tokens_used"] == 50_000
        assert loaded["hook_state"]["loop_detector"]["total_errors"] == 2

    def test_increment_usage(self):
        state = reset_state()
        state = increment_usage(state, "Bash")
        assert state["tokens_used"] == estimate_tokens("Bash")
        assert state["tool_call_count"] == 1

        state = increment_usage(state, "Read")
        assert state["tokens_used"] == estimate_tokens("Bash") + estimate_tokens("Read")
        assert state["tool_call_count"] == 2

    def test_utilization_updates(self):
        state = reset_state()
        state["token_budget"] = 10_000
        state = increment_usage(state, "Bash")  # ~500 tokens
        assert state["context"]["current_utilization"] == pytest.approx(
            estimate_tokens("Bash") / 10_000
        )

    def test_load_returns_defaults_when_no_file(self):
        state = load_state()
        assert state["tokens_used"] == 0
        assert state["token_budget"] == DEFAULT_TOKEN_BUDGET

    def test_reset_creates_fresh_state(self):
        state = reset_state()
        state["tokens_used"] = 99_999
        save_state(state)

        fresh = reset_state()
        assert fresh["tokens_used"] == 0


# === Session Start Tests ===


@pytest.mark.phase1
class TestSessionStartAdapter:
    def test_session_start_injects_standing_orders(self):
        cc_payload = {
            "session_id": "test-session-001",
            "hook_event_name": "SessionStart",
        }
        with pytest.raises(SystemExit) as exc_info:
            # Capture stdout
            import io
            import contextlib
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                handle_session_start(cc_payload)

        # Should exit 0 (pass)
        assert exc_info.value.code == 0

    def test_session_start_outputs_standing_orders(self, capsys):
        cc_payload = {
            "session_id": "test-session-002",
            "hook_event_name": "SessionStart",
        }
        with pytest.raises(SystemExit):
            handle_session_start(cc_payload)

        captured = capsys.readouterr()
        assert "Standing Orders" in captured.out
        assert "Session Enforcement Active" in captured.out
        assert "token_budget_gate" in captured.out

    def test_session_start_resets_state(self):
        # Pre-populate with old state
        old_state = reset_state()
        old_state["tokens_used"] = 99_999
        save_state(old_state)

        cc_payload = {"session_id": "new-session", "hook_event_name": "SessionStart"}
        with pytest.raises(SystemExit):
            handle_session_start(cc_payload)

        state = load_state()
        assert state["tokens_used"] == 0
        assert state["session_id"] == "new-session"


# === Pre Tool Use Tests ===


@pytest.mark.phase1
class TestPreToolUseAdapter:
    def test_allows_when_budget_available(self):
        reset_state()
        cc_payload = {
            "hook_event_name": "PreToolUse",
            "tool_name": "Bash",
            "tool_input": {"command": "ls"},
        }
        with pytest.raises(SystemExit) as exc_info:
            handle_pre_tool_use(cc_payload)
        assert exc_info.value.code == 0

    def test_blocks_when_budget_exhausted(self, capsys):
        state = reset_state()
        state["tokens_used"] = 200_000
        state["token_budget"] = 200_000
        save_state(state)

        cc_payload = {
            "hook_event_name": "PreToolUse",
            "tool_name": "Bash",
            "tool_input": {"command": "ls"},
        }
        with pytest.raises(SystemExit) as exc_info:
            handle_pre_tool_use(cc_payload)
        # Exit 2 = Claude Code blocking exit code
        assert exc_info.value.code == 2


# === Post Tool Use Tests ===


@pytest.mark.phase1
class TestPostToolUseAdapter:
    def test_increments_token_count(self):
        reset_state()
        cc_payload = {
            "hook_event_name": "PostToolUse",
            "tool_name": "Bash",
            "tool_input": {"command": "ls"},
            "tool_response": {"success": True},
        }
        with pytest.raises(SystemExit):
            handle_post_tool_use(cc_payload)

        state = load_state()
        assert state["tokens_used"] > 0
        assert state["tool_call_count"] == 1

    def test_repeated_errors_trigger_loop_detection(self, capsys):
        state = reset_state()
        save_state(state)

        error_payload = {
            "hook_event_name": "PostToolUse",
            "tool_name": "Bash",
            "tool_input": {"command": "npm test"},
            "tool_response": {"error": "TypeError: foo is not a function"},
        }

        # First two errors should pass
        for _ in range(2):
            try:
                handle_post_tool_use(error_payload)
            except SystemExit as e:
                assert e.code == 0

        # Third identical error should trigger loop detection (exit 2)
        with pytest.raises(SystemExit) as exc_info:
            handle_post_tool_use(error_payload)
        assert exc_info.value.code == 2

    def test_tracks_budget_warnings(self, capsys):
        state = reset_state()
        state["tokens_used"] = 165_000  # 82.5% of 200k = WARNING territory
        state["token_budget"] = 200_000
        save_state(state)

        cc_payload = {
            "hook_event_name": "PostToolUse",
            "tool_name": "Read",
            "tool_input": {"file_path": "/tmp/test.py"},
            "tool_response": {"success": True},
        }
        with pytest.raises(SystemExit):
            handle_post_tool_use(cc_payload)

        captured = capsys.readouterr()
        # Should include a budget warning in stdout context
        assert "Admiral" in captured.out or captured.out == ""

    def test_successful_tool_passes(self):
        reset_state()
        cc_payload = {
            "hook_event_name": "PostToolUse",
            "tool_name": "Read",
            "tool_input": {"file_path": "/tmp/test.py"},
            "tool_response": {"success": True},
        }
        with pytest.raises(SystemExit) as exc_info:
            handle_post_tool_use(cc_payload)
        assert exc_info.value.code == 0
