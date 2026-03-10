"""Hook lifecycle events.

Implements the hook lifecycle from Section 08 — Deterministic Enforcement.

Eight lifecycle events that hooks can bind to. Each event fires at a
specific point in the agent runtime. Hooks are deterministic gates —
they fire every time, regardless of context pressure.
"""

from __future__ import annotations

from enum import Enum


class HookEvent(str, Enum):
    """Lifecycle events that hooks can bind to.

    From Section 08 and hooks/manifest.schema.json.
    """

    PRE_TOOL_USE = "PreToolUse"
    POST_TOOL_USE = "PostToolUse"
    PRE_COMMIT = "PreCommit"
    POST_COMMIT = "PostCommit"
    SESSION_START = "SessionStart"
    TASK_COMPLETED = "TaskCompleted"
    PRE_PUSH = "PrePush"
    PERIODIC = "Periodic"

    @property
    def is_blocking(self) -> bool:
        """Whether this event blocks the action (pre-events block, post-events audit)."""
        return self in (
            HookEvent.PRE_TOOL_USE,
            HookEvent.PRE_COMMIT,
            HookEvent.PRE_PUSH,
            HookEvent.SESSION_START,
        )
