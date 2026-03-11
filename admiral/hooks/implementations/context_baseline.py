"""Context Baseline hook.

SessionStart: Fires once at session start.
Measures initial context window utilization, records baseline metrics
for comparison by context_health_check.

From Section 08:
    Exit 0: baseline recorded. Stdout: initial context utilization metrics.

Baseline data is returned on stdout for the runtime to persist and inject into
future hook payloads (``hook_state.context_baseline``), rather than being stored
in a module-level global that would be lost across subprocess invocations.
"""

from __future__ import annotations

import json
import sys
from typing import Any


def get_baseline(payload: dict[str, Any]) -> dict[str, Any] | None:
    """Get a previously recorded baseline from the runtime payload.

    The runtime is expected to persist the baseline returned by ``execute()``
    and inject it as ``payload["hook_state"]["context_baseline"]`` in later
    hook invocations (e.g. context_health_check).
    """
    return payload.get("hook_state", {}).get("context_baseline")


def reset() -> dict[str, Any]:
    """Return an empty baseline state (for testing or new sessions)."""
    return {}


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the context baseline hook.

    The computed baseline is returned on stdout as a JSON object containing
    ``hook_state.context_baseline`` so the runtime can persist it.

    Args:
        payload: Hook input with context.standing_context_tokens and context.total_capacity.

    Returns:
        (exit_code, stdout, stderr)
    """
    context = payload.get("context", {})
    standing_tokens = context.get("standing_context_tokens", 0)
    total_capacity = context.get("total_capacity", 0)

    if total_capacity <= 0:
        return 0, json.dumps({"warning": "No total_capacity provided"}), ""

    utilization = standing_tokens / total_capacity if total_capacity > 0 else 0.0

    baseline = {
        "standing_context_tokens": standing_tokens,
        "total_capacity": total_capacity,
        "initial_utilization": round(utilization, 4),
        "available_capacity": total_capacity - standing_tokens,
    }

    return 0, json.dumps({"hook_state": {"context_baseline": baseline}, **baseline}), ""


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    code, stdout, stderr = execute(payload)
    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)
    sys.exit(code)
