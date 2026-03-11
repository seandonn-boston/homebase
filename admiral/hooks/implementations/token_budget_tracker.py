"""Token Budget Tracker hook.

PostToolUse: Fires after every tool invocation.
Tracks cumulative token usage and emits warnings at thresholds.

From Section 08:
    At 80% utilization: stdout warning ("Token budget at 80%: {used}/{limit}").
    At 90% utilization: stdout escalation alert for Orchestrator.
"""

from __future__ import annotations

import json
import sys
from typing import Any


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the token budget tracker hook.

    Args:
        payload: Hook input with session_state.tokens_used and session_state.token_budget.

    Returns:
        (exit_code, stdout, stderr)
    """
    session_state = payload.get("session_state", {})
    tokens_used = session_state.get("tokens_used", 0)
    token_budget = session_state.get("token_budget", 0)

    if token_budget <= 0:
        return 0, json.dumps({"tokens_used": tokens_used, "status": "no_budget_set"}), ""

    utilization = tokens_used / token_budget

    result = {
        "tokens_used": tokens_used,
        "token_budget": token_budget,
        "utilization": round(utilization, 4),
    }

    if utilization >= 0.9:
        result["alert"] = "ESCALATION"
        result["message"] = (
            f"Token budget at 90%: {tokens_used}/{token_budget}. "
            f"Escalation alert for Orchestrator."
        )
        return 0, json.dumps(result), ""

    if utilization >= 0.8:
        result["alert"] = "WARNING"
        result["message"] = f"Token budget at 80%: {tokens_used}/{token_budget}."
        return 0, json.dumps(result), ""

    result["status"] = "ok"
    return 0, json.dumps(result), ""


if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    code, stdout, stderr = execute(payload)
    if stdout:
        print(stdout)
    if stderr:
        print(stderr, file=sys.stderr)
    sys.exit(code)
