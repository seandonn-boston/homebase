"""Session state persistence for admiral hooks.

Maintains a JSON sidecar file (.admiral/session_state.json) that tracks:
- Token usage estimates
- Hook state (loop detector counters, context baseline, etc.)
- Session metadata

This bridges Claude Code (which doesn't expose token counts to hooks)
with admiral hooks (which expect session_state in their payload).
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any


STATE_DIR = Path(".admiral")
STATE_FILE = STATE_DIR / "session_state.json"

# Rough token estimates per tool invocation (conservative)
TOOL_TOKEN_ESTIMATES = {
    "Bash": 500,
    "Read": 1000,
    "Write": 800,
    "Edit": 600,
    "Glob": 300,
    "Grep": 500,
    "WebFetch": 2000,
    "WebSearch": 1500,
    "Agent": 5000,
    "NotebookEdit": 800,
}
DEFAULT_TOKEN_ESTIMATE = 500
DEFAULT_TOKEN_BUDGET = 200_000


def _ensure_dir() -> None:
    STATE_DIR.mkdir(exist_ok=True)


def load_state() -> dict[str, Any]:
    """Load session state from disk, or return fresh defaults."""
    if STATE_FILE.exists():
        try:
            with STATE_FILE.open() as f:
                return json.load(f)
        except (json.JSONDecodeError, OSError):
            pass
    return _default_state()


def save_state(state: dict[str, Any]) -> None:
    """Persist session state to disk."""
    _ensure_dir()
    with STATE_FILE.open("w") as f:
        json.dump(state, f, indent=2)


def reset_state() -> dict[str, Any]:
    """Reset to fresh state (called at session start)."""
    state = _default_state()
    save_state(state)
    return state


def _default_state() -> dict[str, Any]:
    return {
        "session_id": "",
        "started_at": time.time(),
        "tokens_used": 0,
        "token_budget": DEFAULT_TOKEN_BUDGET,
        "tool_call_count": 0,
        "hook_state": {},
        "context": {
            "standing_context_tokens": 0,
            "total_capacity": DEFAULT_TOKEN_BUDGET,
            "current_utilization": 0.0,
            "standing_context_present": [],
        },
    }


def estimate_tokens(tool_name: str) -> int:
    """Estimate tokens consumed by a tool invocation."""
    return TOOL_TOKEN_ESTIMATES.get(tool_name, DEFAULT_TOKEN_ESTIMATE)


def increment_usage(state: dict[str, Any], tool_name: str) -> dict[str, Any]:
    """Update token usage estimate after a tool call."""
    tokens = estimate_tokens(tool_name)
    state["tokens_used"] = state.get("tokens_used", 0) + tokens
    state["tool_call_count"] = state.get("tool_call_count", 0) + 1
    budget = state.get("token_budget", DEFAULT_TOKEN_BUDGET)
    if budget > 0:
        state["context"]["current_utilization"] = state["tokens_used"] / budget
    return state
