#!/usr/bin/env python3
"""Claude Code hook adapter for admiral Level 1 enforcement.

Translates between Claude Code's hook payload format and admiral's
internal hook contract. Called by .claude/hooks.json entries.

Usage:
    echo '<claude_code_payload>' | python -m admiral.runtime.hook_adapter <hook_name>

Exit codes follow Claude Code convention:
    0 = pass (stdout may contain context for agent)
    2 = block (stderr contains reason shown to agent)

Supported hooks:
    session_start     — Fires context_baseline, injects Standing Orders
    pre_tool_use      — Fires token_budget_gate
    post_tool_use     — Fires token_budget_tracker, loop_detector, context_health_check
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

# Ensure admiral package is importable
_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from admiral.runtime.state import (
    load_state,
    save_state,
    reset_state,
    increment_usage,
)
from admiral.hooks.implementations import (
    token_budget_gate,
    token_budget_tracker,
    loop_detector,
    context_baseline,
    context_health_check,
)
from admiral.protocols.standing_orders import render_standing_orders


def _read_stdin() -> dict:
    """Read Claude Code's JSON payload from stdin."""
    try:
        raw = sys.stdin.read()
        if raw.strip():
            return json.loads(raw)
    except (json.JSONDecodeError, OSError):
        pass
    return {}


def _block(reason: str) -> None:
    """Exit 2 to block the action, showing reason to agent."""
    sys.stderr.write(reason)
    sys.exit(2)


def _pass(context: str = "") -> None:
    """Exit 0 to allow, optionally injecting context."""
    if context:
        sys.stdout.write(context)
    sys.exit(0)


def handle_session_start(cc_payload: dict) -> None:
    """SessionStart: reset state, record baseline, inject Standing Orders."""
    state = reset_state()
    state["session_id"] = cc_payload.get("session_id", "")

    # Build admiral payload for context_baseline
    admiral_payload = {
        "event": "SessionStart",
        "context": state["context"],
        "hook_state": state.get("hook_state", {}),
    }

    # Fire context_baseline hook
    code, stdout, _stderr = context_baseline.execute(admiral_payload)
    if stdout:
        try:
            data = json.loads(stdout)
            hook_state = data.get("hook_state", {})
            state["hook_state"].update(hook_state)
            # Update context from baseline measurements
            if "context_baseline" in hook_state:
                baseline = hook_state["context_baseline"]
                state["context"]["standing_context_tokens"] = baseline.get(
                    "standing_context_tokens",
                    state["context"]["standing_context_tokens"],
                )
        except (json.JSONDecodeError, TypeError):
            pass

    save_state(state)

    # Inject Standing Orders into agent context (stdout on SessionStart
    # gets added to Claude's context window)
    orders_text = render_standing_orders()
    context_parts = [
        "## Admiral Level 1 — Standing Orders\n",
        orders_text,
        "\n## Session Enforcement Active",
        "\nHooks: token_budget_gate, token_budget_tracker, loop_detector, context_health_check",
        f"\nToken budget: {state['token_budget']:,}",
    ]
    _pass("\n".join(context_parts))


def handle_pre_tool_use(cc_payload: dict) -> None:
    """PreToolUse: check token budget gate."""
    state = load_state()

    admiral_payload = {
        "event": "PreToolUse",
        "session_state": {
            "tokens_used": state.get("tokens_used", 0),
            "token_budget": state.get("token_budget", 0),
        },
    }

    code, stdout, _stderr = token_budget_gate.execute(admiral_payload)
    if code != 0:
        save_state(state)
        reason = "Token budget exhausted. Session should wrap up."
        if stdout:
            try:
                data = json.loads(stdout)
                reason = data.get("message", reason)
            except (json.JSONDecodeError, TypeError):
                reason = stdout
        _block(reason)

    _pass()


def handle_post_tool_use(cc_payload: dict) -> None:
    """PostToolUse: track tokens, detect loops, check context health."""
    state = load_state()
    tool_name = cc_payload.get("tool_name", "")

    # Update token estimate
    state = increment_usage(state, tool_name)

    # --- token_budget_tracker ---
    admiral_payload = {
        "event": "PostToolUse",
        "session_state": {
            "tokens_used": state.get("tokens_used", 0),
            "token_budget": state.get("token_budget", 0),
        },
    }
    code, stdout, _stderr = token_budget_tracker.execute(admiral_payload)
    tracker_alert = None
    if stdout:
        try:
            data = json.loads(stdout)
            if data.get("alert"):
                tracker_alert = data.get("message", data["alert"])
        except (json.JSONDecodeError, TypeError):
            pass

    # --- loop_detector ---
    # Translate tool_response into result format for loop detector
    tool_response = cc_payload.get("tool_response", {})
    # Detect errors: tool_response may have error fields
    error_text = ""
    exit_code = 0
    if isinstance(tool_response, dict):
        if tool_response.get("error"):
            error_text = str(tool_response["error"])
            exit_code = 1
        elif tool_response.get("stderr") and not tool_response.get("success", True):
            error_text = str(tool_response["stderr"])
            exit_code = 1

    loop_payload = {
        "event": "PostToolUse",
        "result": {"exit_code": exit_code, "error": error_text},
        "agent_identity": state.get("session_id", "solo-agent"),
        "hook_state": state.get("hook_state", {}),
    }
    lcode, lstdout, _lstderr = loop_detector.execute(loop_payload)
    if lstdout:
        try:
            ldata = json.loads(lstdout)
            hs = ldata.get("hook_state", {})
            state["hook_state"].update(hs)
            if lcode != 0 and ldata.get("loop_detected"):
                save_state(state)
                _block(ldata.get("message", "Loop detected. Moving to recovery ladder."))
        except (json.JSONDecodeError, TypeError):
            pass

    # --- context_health_check ---
    # Maintain standing context sections list
    standing = state.get("context", {}).get("standing_context_present", [])
    if not standing:
        # At Level 1, standing context is always: Identity, Authority, Constraints
        standing = ["Identity", "Authority", "Constraints"]
        state["context"]["standing_context_present"] = standing

    health_payload = {
        "event": "PostToolUse",
        "context": {
            "current_utilization": state.get("context", {}).get("current_utilization", 0),
            "standing_context_present": standing,
        },
    }
    hcode, hstdout, _hstderr = context_health_check.execute(health_payload)

    save_state(state)

    # Build context feedback for the agent
    feedback_parts = []
    if tracker_alert:
        feedback_parts.append(f"[Admiral] {tracker_alert}")
    if hcode != 0 and hstdout:
        try:
            hdata = json.loads(hstdout)
            issues = hdata.get("issues", [])
            for issue in issues:
                feedback_parts.append(f"[Admiral] Context: {issue}")
        except (json.JSONDecodeError, TypeError):
            pass

    # PostToolUse exit 2 shows stderr to agent but doesn't block
    # (tool already executed). We use exit 0 with stdout context instead.
    if feedback_parts:
        _pass("\n".join(feedback_parts))
    else:
        _pass()


def main() -> None:
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: python -m admiral.runtime.hook_adapter <hook_name>\n")
        sys.exit(1)

    hook_name = sys.argv[1]
    cc_payload = _read_stdin()

    handlers = {
        "session_start": handle_session_start,
        "pre_tool_use": handle_pre_tool_use,
        "post_tool_use": handle_post_tool_use,
    }

    handler = handlers.get(hook_name)
    if handler is None:
        sys.stderr.write(f"Unknown hook: {hook_name}\n")
        sys.exit(1)

    handler(cc_payload)


if __name__ == "__main__":
    main()
