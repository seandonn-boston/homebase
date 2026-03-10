"""Token Budget Gate hook.

PreToolUse: Fires before every tool invocation.
Blocks execution if the session token budget is exhausted.

From Section 08:
    Exit 0: budget available, proceed.
    Exit non-zero (block): "Token budget exhausted: {used}/{limit}. Session terminated."
"""

from __future__ import annotations

import json
import sys
from typing import Any


def execute(payload: dict[str, Any]) -> tuple[int, str, str]:
    """Execute the token budget gate hook.

    Args:
        payload: Hook input with session_state.tokens_used and session_state.token_budget.

    Returns:
        (exit_code, stdout, stderr)
    """
    session_state = payload.get("session_state", {})
    tokens_used = session_state.get("tokens_used", 0)
    token_budget = session_state.get("token_budget", 0)

    if token_budget <= 0:
        # No budget set — allow (budget enforcement is optional)
        return 0, "", ""

    if tokens_used >= token_budget:
        message = (
            f"Token budget exhausted: {tokens_used}/{token_budget}. "
            f"Session terminated."
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
