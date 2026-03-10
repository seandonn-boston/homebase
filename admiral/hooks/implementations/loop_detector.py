"""Loop Detector hook.

PostToolUse: Fires after every tool invocation.
Tracks (agent_id, error_signature) tuples and detects retry loops.

From Section 08:
    Triggers when: same error recurs 3+ times, OR total retry count
    across all error signatures in a session exceeds configurable maximum (default: 10).
"""

from __future__ import annotations

import hashlib
import json
import sys
from typing import Any

# Session-level state (persists across invocations within a session)
_error_counts: dict[str, int] = {}
_total_errors: int = 0
_max_same_error: int = 3
_max_total_errors: int = 10


def reset(max_same: int = 3, max_total: int = 10) -> None:
    """Reset loop detector state (for testing or new sessions)."""
    global _error_counts, _total_errors, _max_same_error, _max_total_errors
    _error_counts = {}
    _total_errors = 0
    _max_same_error = max_same
    _max_total_errors = max_total


def _compute_signature(agent_id: str, error: str) -> str:
    """Compute error signature from agent ID and error message."""
    normalized = f"{agent_id}:{error.strip().lower()}"
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the loop detector hook.

    Args:
        payload: Hook input with result.exit_code, result.error, agent_identity.

    Returns:
        (exit_code, stdout, stderr)
    """
    global _total_errors

    result = payload.get("result", {})
    exit_code = result.get("exit_code", 0)
    error_msg = result.get("error", "")
    agent_id = payload.get("agent_identity", "unknown")

    # Only track errors (non-zero exit codes)
    if exit_code == 0 or not error_msg:
        return 0, "", ""

    sig = _compute_signature(agent_id, error_msg)
    _error_counts[sig] = _error_counts.get(sig, 0) + 1
    _total_errors += 1
    count = _error_counts[sig]

    # Check same-error threshold
    if count >= _max_same_error:
        message = (
            f"Loop detected: error signature '{sig}' repeated {count} times. "
            f"Moving to recovery ladder (Section 22)."
        )
        return 1, message, ""

    # Check total-error threshold
    if _total_errors >= _max_total_errors:
        message = (
            f"Loop detected: total error count ({_total_errors}) exceeded "
            f"session maximum ({_max_total_errors}). "
            f"Moving to recovery ladder (Section 22)."
        )
        return 1, message, ""

    return 0, "", ""


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    code, stdout, stderr = execute(payload)
    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)
    sys.exit(code)
