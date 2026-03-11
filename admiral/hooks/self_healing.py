"""Self-healing loop implementation.

Implements the self-healing loop from Section 08:

    Agent action
      → PostToolUse hook executes check
        → Exit 0: proceed
        → Exit non-zero: stdout fed back to agent as error context
          → Agent attempts fix → Hook re-executes
            → Exit 0: proceed
            → Exit non-zero: cycle counter increments
              → Counter < MAX_RETRIES: agent retries
              → Counter >= MAX_RETRIES: permanent failure → recovery ladder

Cycle detection: tracks (hook_name, error_signature) tuples. If the same
error signature appears in consecutive retries, the loop is broken immediately.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field


@dataclass
class RetryRecord:
    """Tracks retry attempts for a specific hook + error combination."""

    hook_name: str
    error_signature: str
    count: int = 1


@dataclass
class SelfHealingLoop:
    """Manages retry detection and cycle breaking for hook execution.

    Key behaviors:
        - Tracks (hook_name, error_signature) tuples across invocations
        - Breaks loop when same error recurs 3+ times
        - Breaks loop when total retries exceed session maximum (default: 10)
        - On break: returns message directing agent to recovery ladder
    """

    max_retries: int = 3
    max_session_retries: int = 10
    _records: dict[str, RetryRecord] = field(default_factory=dict)
    _total_retries: int = 0
    _last_signature: str | None = None

    @staticmethod
    def compute_error_signature(hook_name: str, error_output: str) -> str:
        """Compute a stable signature for an error output.

        Uses SHA-256 of the normalized error to detect identical errors
        across consecutive retries.
        """
        normalized = error_output.strip().lower()
        content = f"{hook_name}:{normalized}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()[:16]

    def record_failure(self, hook_name: str, error_output: str) -> SelfHealingResult:
        """Record a hook failure and determine if the loop should continue.

        Returns:
            SelfHealingResult indicating whether to retry or break.
        """
        signature = self.compute_error_signature(hook_name, error_output)
        key = f"{hook_name}:{signature}"
        self._total_retries += 1

        # Check session-wide retry limit
        if self._total_retries > self.max_session_retries:
            return SelfHealingResult(
                should_retry=False,
                message=(
                    f"Self-healing loop terminated: total session retries "
                    f"({self._total_retries}) exceeded maximum ({self.max_session_retries}). "
                    f"Moving to recovery ladder."
                ),
                total_retries=self._total_retries,
                hook_retries=self._records.get(key, RetryRecord(hook_name, signature)).count,
            )

        # Check consecutive identical errors
        if self._last_signature == signature and key in self._records:
            self._records[key].count += 1
        elif key in self._records:
            self._records[key].count += 1
        else:
            self._records[key] = RetryRecord(hook_name, signature)

        self._last_signature = signature
        record = self._records[key]

        if record.count >= self.max_retries:
            return SelfHealingResult(
                should_retry=False,
                message=(
                    f"Self-healing loop terminated: identical error after "
                    f"{record.count} retries. Moving to recovery ladder step 2 (fallback)."
                ),
                total_retries=self._total_retries,
                hook_retries=record.count,
            )

        return SelfHealingResult(
            should_retry=True,
            message=error_output,
            total_retries=self._total_retries,
            hook_retries=record.count,
        )

    def record_success(self, hook_name: str) -> None:
        """Record a successful hook execution (resets relevant counters)."""
        # Clear records for this hook (the fix worked)
        keys_to_remove = [k for k in self._records if k.startswith(f"{hook_name}:")]
        for key in keys_to_remove:
            del self._records[key]
        self._last_signature = None

    def reset(self) -> None:
        """Reset all tracking state (e.g., new session)."""
        self._records.clear()
        self._total_retries = 0
        self._last_signature = None


@dataclass
class SelfHealingResult:
    """Result of a self-healing retry evaluation."""

    should_retry: bool
    message: str
    total_retries: int
    hook_retries: int
