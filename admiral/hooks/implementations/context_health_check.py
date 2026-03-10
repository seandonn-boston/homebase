"""Context Health Check hook.

PostToolUse: Fires every N tool invocations (configurable, default: 10).
Monitors context window health against thresholds.

From Section 08:
    Exit non-zero: "Context health critical" when:
    (a) utilization exceeds threshold (default: 85%) without sacrifice order activation, OR
    (b) critical context (Identity, Authority, Constraints) is missing from active context.
"""

from __future__ import annotations

import json
import sys
from typing import Any

# Critical context sections that must always be present
CRITICAL_SECTIONS = {"Identity", "Authority", "Constraints"}

# Default threshold
DEFAULT_UTILIZATION_THRESHOLD = 0.85


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the context health check hook.

    Args:
        payload: Hook input with context.current_utilization and
                 context.standing_context_present.

    Returns:
        (exit_code, stdout, stderr)
    """
    context = payload.get("context", {})
    utilization = context.get("current_utilization", 0.0)
    present_sections = set(context.get("standing_context_present", []))
    threshold = context.get("utilization_threshold", DEFAULT_UTILIZATION_THRESHOLD)

    issues = []

    # Check utilization threshold
    if utilization > threshold:
        issues.append(
            f"Context utilization ({utilization:.1%}) exceeds threshold "
            f"({threshold:.1%}) without sacrifice order activation."
        )

    # Check critical sections
    missing = CRITICAL_SECTIONS - present_sections
    if missing:
        issues.append(
            f"Critical context missing from active context: {sorted(missing)}. "
            f"These sections must never be sacrificed."
        )

    if issues:
        result = {
            "status": "critical",
            "issues": issues,
            "utilization": round(utilization, 4),
            "missing_critical": sorted(missing) if missing else [],
        }
        return 1, json.dumps(result), ""

    result = {
        "status": "healthy",
        "utilization": round(utilization, 4),
    }
    return 0, json.dumps(result), ""


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    code, stdout, stderr = execute(payload)
    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)
    sys.exit(code)
