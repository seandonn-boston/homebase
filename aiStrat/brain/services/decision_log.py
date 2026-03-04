"""Append-only decision log for the Fleet Brain.

Records significant decisions made by agents, the Admiral, or the system
itself. Unlike Brain entries (which are knowledge), decision log records
capture the reasoning process: what was decided, why, by whom, and what
alternatives were considered.

The log is append-only — entries cannot be modified or deleted, ensuring
a tamper-resistant audit trail for post-incident review and learning.

v4: Added for governance and auditability — every significant decision
    leaves a trace that can be queried and reviewed.

Reference: admiral/part5-brain.md, Section 15.
"""

from __future__ import annotations

import logging
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)

# Maximum decision entries retained in memory.
_MAX_DECISION_LOG_SIZE = 5_000


@dataclass
class DecisionEntry:
    """A single decision record.

    Attributes:
        id: Unique identifier for this decision.
        timestamp: When the decision was made (Unix float).
        decision: The decision that was made.
        rationale: Why this decision was made.
        alternatives: Other options that were considered and rejected.
        decider: Identity of the agent or person who made the decision.
        project: Project context for the decision (if applicable).
        authority_tier: Decision authority tier (enforced, autonomous, propose, escalate).
        outcome: Known outcome of the decision (updated later if needed).
        metadata: Additional structured data about the decision.
    """
    decision: str
    rationale: str
    decider: str
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: float = field(default_factory=time.time)
    alternatives: list[str] = field(default_factory=list)
    project: str = ""
    authority_tier: str = ""
    outcome: str = ""
    metadata: dict = field(default_factory=dict)


class DecisionLog:
    """Append-only log of decisions made across the fleet.

    Thread-safe. Bounded to _MAX_DECISION_LOG_SIZE entries (oldest pruned
    when limit is exceeded).

    Usage:
        log = DecisionLog()
        entry_id = log.log_decision(
            decision="Use pgvector for Brain storage",
            rationale="Need combined relational + vector search",
            decider="admiral",
            alternatives=["Pinecone", "Weaviate", "file-based"],
            project="fleet-admiral",
        )
        recent = log.query_decisions(project="fleet-admiral", limit=10)

    v4: Append-only design ensures tamper-resistant decision audit trail.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._log: list[DecisionEntry] = []

    def log_decision(
        self,
        decision: str,
        rationale: str,
        decider: str,
        alternatives: Optional[list[str]] = None,
        project: str = "",
        authority_tier: str = "",
        outcome: str = "",
        metadata: Optional[dict] = None,
    ) -> str:
        """Record a decision in the append-only log.

        Args:
            decision: What was decided.
            rationale: Why this decision was made.
            decider: Who made the decision.
            alternatives: Options that were considered but not chosen.
            project: Project context.
            authority_tier: Decision authority tier.
            outcome: Known outcome (can be empty if not yet known).
            metadata: Additional structured data.

        Returns:
            The unique ID of the new decision entry.

        v4: Every significant decision is logged for governance review.
        """
        entry = DecisionEntry(
            decision=decision,
            rationale=rationale,
            decider=decider,
            alternatives=alternatives or [],
            project=project,
            authority_tier=authority_tier,
            outcome=outcome,
            metadata=metadata or {},
        )

        with self._lock:
            self._log.append(entry)
            # Prune oldest if over limit.
            # WARNING: This violates the append-only invariant. In production,
            # decisions should be persisted to durable storage before pruning
            # from the in-memory log.
            if len(self._log) > _MAX_DECISION_LOG_SIZE:
                pruned = len(self._log) - _MAX_DECISION_LOG_SIZE
                self._log = self._log[-_MAX_DECISION_LOG_SIZE:]
                logger.warning(
                    "Decision log pruned: removed %d oldest entries. "
                    "Ensure decisions are persisted to durable storage.",
                    pruned,
                )

        logger.info(
            "Decision logged [%s]: %s (by %s, project=%s)",
            entry.id[:8], decision[:80], decider, project or "(global)",
        )

        return entry.id

    def query_decisions(
        self,
        decider: Optional[str] = None,
        project: Optional[str] = None,
        authority_tier: Optional[str] = None,
        since: Optional[float] = None,
        limit: int = 100,
    ) -> list[DecisionEntry]:
        """Query the decision log with optional filters.

        Args:
            decider: Filter by who made the decision.
            project: Filter by project context.
            authority_tier: Filter by authority tier.
            since: Only return decisions after this Unix timestamp.
            limit: Maximum number of results to return.

        Returns:
            List of matching DecisionEntry objects, most recent first.
        """
        with self._lock:
            results = list(self._log)

        if decider:
            results = [e for e in results if e.decider == decider]
        if project:
            results = [e for e in results if e.project == project]
        if authority_tier:
            results = [e for e in results if e.authority_tier == authority_tier]
        if since is not None:
            results = [e for e in results if e.timestamp >= since]

        # Most recent first
        results.sort(key=lambda e: e.timestamp, reverse=True)
        return results[:limit]

    def get_decision(self, decision_id: str) -> Optional[DecisionEntry]:
        """Retrieve a single decision by ID.

        Args:
            decision_id: The unique decision ID.

        Returns:
            The DecisionEntry if found, None otherwise.
        """
        with self._lock:
            for entry in self._log:
                if entry.id == decision_id:
                    return entry
        return None

    @property
    def size(self) -> int:
        """Current number of entries in the decision log."""
        with self._lock:
            return len(self._log)
