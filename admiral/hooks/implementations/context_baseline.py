"""Context Baseline hook.

SessionStart: Fires once at session start.
Measures initial context window utilization, records baseline metrics
for comparison by context_health_check.

From Section 08:
    Exit 0: baseline recorded. Stdout: initial context utilization metrics.
"""

from __future__ import annotations

import json
import sys
from typing import Any

# Module-level baseline storage (persists within session)
_baseline: dict[str, Any] | None = None


def get_baseline() -> dict[str, Any] | None:
    """Get the recorded baseline (for context_health_check)."""
    return _baseline


def reset() -> None:
    """Reset baseline (for testing or new sessions)."""
    global _baseline
    _baseline = None


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the context baseline hook.

    Args:
        payload: Hook input with context.standing_context_tokens and context.total_capacity.

    Returns:
        (exit_code, stdout, stderr)
    """
    global _baseline

    context = payload.get("context", {})
    standing_tokens = context.get("standing_context_tokens", 0)
    total_capacity = context.get("total_capacity", 0)

    if total_capacity <= 0:
        return 0, json.dumps({"warning": "No total_capacity provided"}), ""

    utilization = standing_tokens / total_capacity if total_capacity > 0 else 0.0

    _baseline = {
        "standing_context_tokens": standing_tokens,
        "total_capacity": total_capacity,
        "initial_utilization": round(utilization, 4),
        "available_capacity": total_capacity - standing_tokens,
    }

    return 0, json.dumps(_baseline), ""


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    code, stdout, stderr = execute(payload)
    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)
    sys.exit(code)
