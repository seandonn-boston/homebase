"""Escalation routing for the Fleet Brain.

When an agent encounters a situation that exceeds its authority tier or
requires human judgment, it creates an escalation report. The EscalationRouter
tracks these reports, assigns tracking IDs, and provides a queryable log
of outstanding and resolved escalations.

Severity levels:
    - low: Informational, can wait for next review cycle.
    - medium: Should be reviewed within hours.
    - high: Requires prompt attention.
    - critical: Immediate action required; may warrant an emergency halt.

v4: Added for governance — ensures decisions beyond agent authority are
    surfaced to the appropriate authority (Admiral or human operator).

Reference: admiral/part3-enforcement.md (decision authority tiers),
           admiral/part5-brain.md, Section 15.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)

# Maximum escalation records retained in memory.
_MAX_ESCALATION_LOG_SIZE = 2_000


class EscalationSeverity(Enum):
    """Severity classification for escalation reports."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class EscalationStatus(Enum):
    """Lifecycle status of an escalation."""
    OPEN = "open"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"


@dataclass
class EscalationReport:
    """A single escalation report.

    Attributes:
        id: Unique tracking ID for this escalation.
        title: Brief summary of the escalation.
        description: Detailed explanation of the situation.
        severity: How urgent this escalation is.
        status: Current lifecycle status.
        reporter: Identity of the agent or component that escalated.
        project: Project context (if applicable).
        created_at: When the escalation was created (Unix float).
        updated_at: When the escalation was last updated.
        resolution: How the escalation was resolved (filled on resolution).
        resolved_by: Who resolved the escalation.
        metadata: Additional structured data.
    """
    title: str
    description: str
    severity: EscalationSeverity
    reporter: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    status: EscalationStatus = EscalationStatus.OPEN
    project: str = ""
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    resolution: str = ""
    resolved_by: str = ""
    metadata: dict = field(default_factory=dict)


class EscalationRouter:
    """Routes and tracks escalation reports from fleet agents.

    Thread-safe. Maintains an in-memory log of escalations with
    status tracking from creation through resolution.

    Usage:
        router = EscalationRouter()
        tracking_id = router.escalate(
            title="Anomalous write pattern in monitor-agent",
            description="50 entries in 10 seconds from a single source",
            severity="high",
            reporter="quarantine-system",
            project="fleet-admiral",
        )
        open_escalations = router.list_escalations(status="open")
        router.resolve(tracking_id, "False alarm — batch import", "admiral")

    v4: Centralized escalation tracking for fleet governance.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._escalations: list[EscalationReport] = []

    def escalate(
        self,
        title: str,
        description: str,
        severity: str | EscalationSeverity,
        reporter: str,
        project: str = "",
        metadata: Optional[dict] = None,
    ) -> str:
        """Create a new escalation report.

        Args:
            title: Brief summary of the issue.
            description: Full details of the situation requiring escalation.
            severity: One of "low", "medium", "high", "critical" (or EscalationSeverity).
            reporter: Identity of the escalating agent or component.
            project: Project context.
            metadata: Additional structured data.

        Returns:
            Unique tracking ID for the escalation.

        v4: Every escalation gets a tracking ID for follow-up and audit.
        """
        if isinstance(severity, str):
            severity = EscalationSeverity(severity.lower())

        report = EscalationReport(
            title=title,
            description=description,
            severity=severity,
            reporter=reporter,
            project=project,
            metadata=metadata or {},
        )

        with self._lock:
            self._escalations.append(report)
            # Prune oldest RESOLVED/DISMISSED only — never discard OPEN/ACKNOWLEDGED
            if len(self._escalations) > _MAX_ESCALATION_LOG_SIZE:
                active = [
                    e for e in self._escalations
                    if e.status in (EscalationStatus.OPEN, EscalationStatus.ACKNOWLEDGED)
                ]
                closed = [
                    e for e in self._escalations
                    if e.status not in (EscalationStatus.OPEN, EscalationStatus.ACKNOWLEDGED)
                ]
                # Keep all active + most recent closed up to limit
                keep_closed = _MAX_ESCALATION_LOG_SIZE - len(active)
                if keep_closed > 0:
                    closed = closed[-keep_closed:]
                else:
                    closed = []
                pruned = len(self._escalations) - len(active) - len(closed)
                self._escalations = active + closed
                if pruned > 0:
                    logger.info("Escalation log pruned: removed %d resolved entries", pruned)

        logger.warning(
            "ESCALATION [%s] %s: %s (reporter=%s, project=%s)",
            severity.value.upper(),
            report.id[:8],
            title,
            reporter,
            project or "(global)",
        )

        return report.id

    def list_escalations(
        self,
        status: Optional[str | EscalationStatus] = None,
        severity: Optional[str | EscalationSeverity] = None,
        reporter: Optional[str] = None,
        project: Optional[str] = None,
        limit: int = 100,
    ) -> list[EscalationReport]:
        """Query escalation reports with optional filters.

        Args:
            status: Filter by status (open, acknowledged, resolved, dismissed).
            severity: Filter by severity level.
            reporter: Filter by reporter identity.
            project: Filter by project context.
            limit: Maximum number of results to return.

        Returns:
            List of matching EscalationReport objects, most recent first.
        """
        if isinstance(status, str):
            status = EscalationStatus(status.lower())
        if isinstance(severity, str):
            severity = EscalationSeverity(severity.lower())

        with self._lock:
            results = list(self._escalations)

        if status is not None:
            results = [e for e in results if e.status == status]
        if severity is not None:
            results = [e for e in results if e.severity == severity]
        if reporter:
            results = [e for e in results if e.reporter == reporter]
        if project:
            results = [e for e in results if e.project == project]

        # Most recent first
        results.sort(key=lambda e: e.created_at, reverse=True)
        return results[:limit]

    def get_escalation(self, escalation_id: str) -> Optional[EscalationReport]:
        """Retrieve a single escalation by tracking ID.

        Args:
            escalation_id: The unique escalation tracking ID.

        Returns:
            The EscalationReport if found, None otherwise.
        """
        with self._lock:
            for report in self._escalations:
                if report.id == escalation_id:
                    return report
        return None

    def acknowledge(self, escalation_id: str, by: str) -> bool:
        """Mark an escalation as acknowledged.

        Args:
            escalation_id: Tracking ID of the escalation.
            by: Identity of the acknowledging party.

        Returns:
            True if the escalation was found and updated, False otherwise.
        """
        with self._lock:
            for report in self._escalations:
                if report.id == escalation_id:
                    report.status = EscalationStatus.ACKNOWLEDGED
                    report.updated_at = time.time()
                    logger.info(
                        "Escalation %s acknowledged by %s",
                        escalation_id[:8], by,
                    )
                    return True
        return False

    def resolve(
        self,
        escalation_id: str,
        resolution: str,
        resolved_by: str,
    ) -> bool:
        """Mark an escalation as resolved.

        Args:
            escalation_id: Tracking ID of the escalation.
            resolution: Description of how the issue was resolved.
            resolved_by: Identity of the resolving party.

        Returns:
            True if the escalation was found and resolved, False otherwise.

        v4: Resolution records ensure escalations have documented outcomes.
        """
        with self._lock:
            for report in self._escalations:
                if report.id == escalation_id:
                    report.status = EscalationStatus.RESOLVED
                    report.resolution = resolution
                    report.resolved_by = resolved_by
                    report.updated_at = time.time()
                    logger.info(
                        "Escalation %s resolved by %s: %s",
                        escalation_id[:8], resolved_by, resolution[:80],
                    )
                    return True
        return False

    @property
    def open_count(self) -> int:
        """Number of currently open escalations."""
        with self._lock:
            return sum(
                1 for e in self._escalations
                if e.status in (EscalationStatus.OPEN, EscalationStatus.ACKNOWLEDGED)
            )
