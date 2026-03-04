"""Emergency halt system for the Fleet Brain.

Provides a file-based halt mechanism that any component can check before
performing operations. When halted, all Brain writes should be suspended
until an authorized party resumes operations.

The halt flag is a marker file at .claude/HALT. This file-based approach
ensures the halt persists across process restarts and is visible to all
fleet components via the shared filesystem.

v4: Added for operational safety — provides a global kill switch for
    Brain operations when anomalous behavior is detected.

Reference: admiral/part3-enforcement.md (hooks over instructions),
           admiral/part5-brain.md, Section 15.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Default halt file location relative to the project root.
# The .claude/ directory is the standard location for Claude Code state files.
_DEFAULT_HALT_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    ".claude",
)
_HALT_FILENAME = "HALT"


@dataclass
class HaltRecord:
    """Details of an active halt."""
    reason: str
    reporter: str
    halted_at: float = field(default_factory=time.time)
    metadata: dict = field(default_factory=dict)


class HaltManager:
    """Manages the emergency halt state via a filesystem marker file.

    The halt file (.claude/HALT) contains a JSON payload with the halt
    reason, reporter identity, and timestamp. Any component can check
    the halt state before performing operations.

    Usage:
        manager = HaltManager()
        manager.halt("Anomalous write pattern detected", "monitor-agent")
        assert manager.is_halted()
        manager.resume("admiral")

    v4: File-based halt ensures persistence across process restarts and
        visibility to all fleet components.
    """

    def __init__(self, halt_dir: Optional[str] = None) -> None:
        """Initialize the HaltManager.

        Args:
            halt_dir: Directory to store the HALT marker file.
                      Defaults to .claude/ in the project root.
        """
        self._halt_dir = halt_dir or _DEFAULT_HALT_DIR
        self._halt_path = os.path.join(self._halt_dir, _HALT_FILENAME)

    @property
    def halt_path(self) -> str:
        """Full path to the HALT marker file."""
        return self._halt_path

    def halt(self, reason: str, reporter: str, **metadata) -> str:
        """Create the HALT marker file, suspending all Brain writes.

        Args:
            reason: Human-readable explanation of why the halt was triggered.
            reporter: Identity of the agent or system that triggered the halt.
            **metadata: Additional key-value pairs to include in the halt record.

        Returns:
            Path to the created HALT file.

        v4: Any component can trigger a halt; only authorized parties can resume.
        """
        record = HaltRecord(
            reason=reason,
            reporter=reporter,
            metadata=metadata,
        )

        Path(self._halt_dir).mkdir(parents=True, exist_ok=True)

        payload = {
            "reason": record.reason,
            "reporter": record.reporter,
            "halted_at": record.halted_at,
            "halted_at_iso": time.strftime(
                "%Y-%m-%dT%H:%M:%SZ", time.gmtime(record.halted_at)
            ),
            "metadata": record.metadata,
        }

        with open(self._halt_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, indent=2, ensure_ascii=False)

        logger.critical(
            "HALT ACTIVATED by %s: %s (file: %s)",
            reporter, reason, self._halt_path,
        )

        return self._halt_path

    def is_halted(self) -> bool:
        """Check whether the Brain is currently halted.

        Returns:
            True if the HALT marker file exists, False otherwise.
        """
        return os.path.exists(self._halt_path)

    def get_halt_record(self) -> Optional[HaltRecord]:
        """Read the current halt record, if any.

        Returns:
            HaltRecord if halted, None otherwise.
        """
        if not self.is_halted():
            return None

        try:
            with open(self._halt_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return HaltRecord(
                reason=data.get("reason", "unknown"),
                reporter=data.get("reporter", "unknown"),
                halted_at=data.get("halted_at", 0.0),
                metadata=data.get("metadata", {}),
            )
        except (json.JSONDecodeError, OSError) as e:
            logger.error("Failed to read halt record: %s", e)
            # File exists but is unreadable — still halted
            return HaltRecord(
                reason="HALT file exists but is unreadable",
                reporter="unknown",
            )

    def resume(self, authority: str) -> bool:
        """Remove the HALT marker file, allowing Brain operations to continue.

        Args:
            authority: Identity of the person or system authorizing the resume.
                       This is logged for audit purposes.

        Returns:
            True if the halt was lifted, False if no halt was active.

        v4: Resume requires explicit authority identification for audit trail.
        """
        if not self.is_halted():
            logger.info("Resume requested by %s but no halt is active.", authority)
            return False

        # Read the halt record before removing for logging
        record = self.get_halt_record()

        try:
            os.remove(self._halt_path)
        except OSError as e:
            logger.error("Failed to remove HALT file: %s", e)
            return False

        halt_duration = ""
        if record and record.halted_at:
            duration_seconds = time.time() - record.halted_at
            halt_duration = f" (halted for {duration_seconds:.0f}s)"

        logger.critical(
            "HALT LIFTED by %s%s. Original halt by %s: %s",
            authority,
            halt_duration,
            record.reporter if record else "unknown",
            record.reason if record else "unknown",
        )

        return True
