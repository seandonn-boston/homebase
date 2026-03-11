"""Loop Detector hook.

PostToolUse: Fires after every tool invocation.
Tracks (agent_id, error_signature) tuples and detects retry loops.

From Section 08:
    Triggers when: same error recurs 3+ times, OR total retry count
    across all error signatures in a session exceeds configurable maximum (default: 10).

State is carried via the runtime payload (``hook_state.loop_detector``) so that
tracking survives subprocess invocations.  The runtime is responsible for
persisting the returned state dict and injecting it into subsequent payloads.
"""

from __future__ import annotations

import hashlib
import json
import sys
from typing import Any

# Default thresholds
_DEFAULT_MAX_SAME_ERROR: int = 3
_DEFAULT_MAX_TOTAL_ERRORS: int = 10


def reset(max_same: int = 3, max_total: int = 10) -> dict[str, Any]:
    """Return a fresh loop detector state dict (for testing or new sessions)."""
    return {
        "error_counts": {},
        "total_errors": 0,
        "max_same_error": max_same,
        "max_total_errors": max_total,
    }


def _compute_signature(agent_id: str, error: str) -> str:
    """Compute error signature from agent ID and error message."""
    normalized = f"{agent_id}:{error.strip().lower()}"
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the loop detector hook.

    State is read from ``payload["hook_state"]["loop_detector"]`` and the
    updated state is returned as a JSON object on stdout so the runtime can
    persist it for the next invocation.

    Args:
        payload: Hook input with result.exit_code, result.error, agent_identity,
                 and optionally hook_state.loop_detector.

    Returns:
        (exit_code, stdout, stderr)
    """
    # Recover persisted state from payload, or start fresh
    hook_state = payload.get("hook_state", {}).get("loop_detector", {})
    error_counts: dict[str, int] = dict(hook_state.get("error_counts", {}))
    total_errors: int = hook_state.get("total_errors", 0)
    max_same_error: int = hook_state.get("max_same_error", _DEFAULT_MAX_SAME_ERROR)
    max_total_errors: int = hook_state.get("max_total_errors", _DEFAULT_MAX_TOTAL_ERRORS)

    result = payload.get("result", {})
    exit_code = result.get("exit_code", 0)
    error_msg = result.get("error", "")
    agent_id = payload.get("agent_identity", "unknown")

    # Only track errors (non-zero exit codes)
    if exit_code == 0 or not error_msg:
        return 0, "", ""

    sig = _compute_signature(agent_id, error_msg)
    error_counts[sig] = error_counts.get(sig, 0) + 1
    total_errors += 1
    count = error_counts[sig]

    # Build updated state to return
    updated_state = {
        "error_counts": error_counts,
        "total_errors": total_errors,
        "max_same_error": max_same_error,
        "max_total_errors": max_total_errors,
    }

    # Check same-error threshold
    if count >= max_same_error:
        message = json.dumps({
            "loop_detected": True,
            "reason": f"error signature '{sig}' repeated {count} times",
            "message": (
                f"Loop detected: error signature '{sig}' repeated {count} times. "
                f"Moving to recovery ladder (Section 22)."
            ),
            "hook_state": {"loop_detector": updated_state},
        })
        return 1, message, ""

    # Check total-error threshold
    if total_errors >= max_total_errors:
        message = json.dumps({
            "loop_detected": True,
            "reason": f"total error count ({total_errors}) exceeded session maximum ({max_total_errors})",
            "message": (
                f"Loop detected: total error count ({total_errors}) exceeded "
                f"session maximum ({max_total_errors}). "
                f"Moving to recovery ladder (Section 22)."
            ),
            "hook_state": {"loop_detector": updated_state},
        })
        return 1, message, ""

    return 0, json.dumps({"hook_state": {"loop_detector": updated_state}}), ""


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    code, stdout, stderr = execute(payload)
    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)
    sys.exit(code)
