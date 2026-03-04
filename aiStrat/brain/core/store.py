"""Thread-safe in-memory storage for the Fleet Brain.

Provides the same interface that a Postgres-backed store would,
using Python data structures and threading locks. Swap this for
a Postgres adapter in production without changing callers.

v4: Added usefulness bounds, cycle detection, supersession chain
    protection, max traversal limits, audit trail.

Reference: admiral/part5-brain.md, Section 15.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass, field
from typing import Optional

from .models import (
    Entry,
    EntryCategory,
    EntryLink,
    LinkType,
    ScoredEntry,
)

logger = logging.getLogger(__name__)

# ── Safety limits ──────────────────────────────────────────────────
_MAX_TRAVERSAL_NODES = 500  # Max nodes visited in get_links() traversal
_USEFULNESS_MIN = -100
_USEFULNESS_MAX = 100
_MAX_AUDIT_LOG_SIZE = 10_000  # Max audit entries kept in memory


# ── Audit trail ───────────────────────────────────────────────────

@dataclass
class AuditEntry:
    """A record of a mutation or significant access in the Brain.

    v4: Added for Vuln 8.1.8 — no audit trail.
    """
    timestamp: float = field(default_factory=time.time)
    operation: str = ""           # record, strengthen, supersede, unsupersede, access
    caller_identity: str = ""     # Who performed the operation
    entry_id: str = ""            # Which entry was affected
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    details: str = ""


class AuditLog:
    """Append-only audit log for Brain operations.

    Thread-safe. Bounded to _MAX_AUDIT_LOG_SIZE entries (oldest pruned).
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._log: list[AuditEntry] = []

    def append(self, entry: AuditEntry) -> None:
        with self._lock:
            self._log.append(entry)
            # Prune oldest if over limit
            if len(self._log) > _MAX_AUDIT_LOG_SIZE:
                self._log = self._log[-_MAX_AUDIT_LOG_SIZE:]

    def query(
        self,
        entry_id: Optional[str] = None,
        operation: Optional[str] = None,
        caller: Optional[str] = None,
        since: Optional[float] = None,
        limit: int = 100,
    ) -> list[AuditEntry]:
        """Query audit log with optional filters."""
        with self._lock:
            results = list(self._log)

        if entry_id:
            results = [e for e in results if e.entry_id == entry_id]
        if operation:
            results = [e for e in results if e.operation == operation]
        if caller:
            results = [e for e in results if e.caller_identity == caller]
        if since:
            results = [e for e in results if e.timestamp >= since]

        # Return most recent first, limited
        results.sort(key=lambda e: e.timestamp, reverse=True)
        return results[:limit]

    @property
    def size(self) -> int:
        with self._lock:
            return len(self._log)


class BrainStore:
    """Thread-safe in-memory store for Brain entries and links.

    v4: Includes audit trail for all mutations.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._entries: dict[str, Entry] = {}
        self._links: list[EntryLink] = []
        self.audit = AuditLog()

    # ── Writes ────────────────────────────────────────────────

    def add_entry(self, entry: Entry, caller: str = "") -> str:
        """Store a new entry. Returns the entry ID."""
        with self._lock:
            self._entries[entry.id] = entry
        self.audit.append(AuditEntry(
            operation="record",
            caller_identity=caller or entry.source_agent or "",
            entry_id=entry.id,
            new_value=entry.title[:200],
            details=f"category={entry.category.value}, project={entry.project}",
        ))
        return entry.id

    def add_link(self, link: EntryLink) -> None:
        """Create a relationship between two entries."""
        with self._lock:
            self._add_link_unlocked(link)

    def _add_link_unlocked(self, link: EntryLink) -> None:
        """Inner add_link logic — caller must already hold self._lock."""
        if link.source_id not in self._entries:
            raise ValueError(f"Source entry not found: {link.source_id}")
        if link.target_id not in self._entries:
            raise ValueError(f"Target entry not found: {link.target_id}")
        # Avoid duplicates
        for existing in self._links:
            if (existing.source_id == link.source_id
                    and existing.target_id == link.target_id
                    and existing.link_type == link.link_type):
                return
        self._links.append(link)

    # ── Reads ─────────────────────────────────────────────────

    def get_entry(self, entry_id: str) -> Optional[Entry]:
        """Retrieve an entry by ID."""
        with self._lock:
            return self._entries.get(entry_id)

    def get_links(self, entry_id: str, depth: int = 1) -> list[EntryLink]:
        """Get all links originating from or targeting an entry.

        When depth > 1, follows links transitively up to the given depth.
        Includes cycle detection and max traversal node limit to prevent DoS.
        """
        with self._lock:
            if depth < 1:
                return []
            direct = [
                link for link in self._links
                if link.source_id == entry_id or link.target_id == entry_id
            ]
            if depth == 1:
                return list(direct)

            # Traverse with cycle detection and node limit
            seen_ids = {entry_id}
            total_visited = 1
            result = list(direct)
            frontier = set()
            for link in direct:
                frontier.add(link.source_id)
                frontier.add(link.target_id)
            frontier -= seen_ids

            for _ in range(depth - 1):
                if total_visited >= _MAX_TRAVERSAL_NODES:
                    logger.warning(
                        "get_links: max traversal nodes (%d) reached for entry %s",
                        _MAX_TRAVERSAL_NODES, entry_id,
                    )
                    break

                next_frontier = set()
                for fid in frontier:
                    if total_visited >= _MAX_TRAVERSAL_NODES:
                        break
                    seen_ids.add(fid)
                    total_visited += 1
                    for link in self._links:
                        if link.source_id == fid or link.target_id == fid:
                            if link not in result:
                                result.append(link)
                            # Only add to frontier if not already seen
                            other = link.target_id if link.source_id == fid else link.source_id
                            if other not in seen_ids:
                                next_frontier.add(other)

                frontier = next_frontier
                if not frontier:
                    break

            return result

    def list_entries(
        self,
        project: Optional[str] = None,
        category: Optional[EntryCategory] = None,
        current_only: bool = True,
    ) -> list[Entry]:
        """List entries with optional filtering."""
        with self._lock:
            results = list(self._entries.values())

        if project:
            results = [e for e in results if e.project == project]
        if category:
            results = [e for e in results if e.category == category]
        if current_only:
            results = [e for e in results if e.is_current]

        return results

    # ── Mutations ─────────────────────────────────────────────

    def increment_access(self, entry_id: str) -> None:
        """Record that an entry was retrieved."""
        with self._lock:
            entry = self._entries.get(entry_id)
            if entry:
                entry.access_count += 1

    def adjust_usefulness(self, entry_id: str, useful: bool, caller: str = "") -> int:
        """Increment or decrement an entry's usefulness signal.

        Bounded to [_USEFULNESS_MIN, _USEFULNESS_MAX] to prevent
        score inflation attacks.

        Returns the updated usefulness score.
        """
        with self._lock:
            entry = self._entries.get(entry_id)
            if not entry:
                raise ValueError(f"Entry not found: {entry_id}")
            old_value = entry.usefulness
            delta = 1 if useful else -1
            new_value = entry.usefulness + delta
            clamped = max(_USEFULNESS_MIN, min(_USEFULNESS_MAX, new_value))
            if clamped != new_value:
                logger.warning(
                    "Usefulness clamped for entry %s: attempted %d, clamped to %d",
                    entry_id, new_value, clamped,
                )
            entry.usefulness = clamped
            entry.updated_at = time.time()
            result = entry.usefulness
        self.audit.append(AuditEntry(
            operation="strengthen",
            caller_identity=caller,
            entry_id=entry_id,
            old_value=str(old_value),
            new_value=str(result),
            details=f"useful={useful}",
        ))
        return result

    def supersede(self, old_id: str, new_id: str, caller: str = "") -> None:
        """Mark an entry as superseded by another.

        Includes circular supersession detection.
        """
        with self._lock:
            old_entry = self._entries.get(old_id)
            new_entry = self._entries.get(new_id)
            if not old_entry:
                raise ValueError(f"Old entry not found: {old_id}")
            if not new_entry:
                raise ValueError(f"New entry not found: {new_id}")

            # Circular supersession detection: check BOTH directions.
            # Forward: walk superseded_by chain from new_id — if we reach
            # old_id, the link would create a cycle.
            visited = {new_id}
            current = new_entry
            while current.superseded_by:
                if current.superseded_by == old_id:
                    raise ValueError(
                        f"Circular supersession: {old_id} is already downstream of {new_id}"
                    )
                if current.superseded_by in visited:
                    break  # Already-detected chain loop
                visited.add(current.superseded_by)
                current = self._entries.get(current.superseded_by)
                if not current:
                    break

            # Backward: walk superseded_by chain from old_id — if old_id
            # is already upstream of new_id via existing chains, the link
            # would create a cycle (e.g. A→B→C, then supersede(C, A)).
            visited_back = {old_id}
            current = old_entry
            while current.superseded_by:
                if current.superseded_by == new_id:
                    raise ValueError(
                        f"Circular supersession: {new_id} is already upstream of {old_id}"
                    )
                if current.superseded_by in visited_back:
                    break
                visited_back.add(current.superseded_by)
                current = self._entries.get(current.superseded_by)
                if not current:
                    break

            now = time.time()
            old_entry.superseded_by = new_id
            old_entry.superseded_at = now
            old_entry.updated_at = now

            self._add_link_unlocked(EntryLink(
                source_id=new_id,
                target_id=old_id,
                link_type=LinkType.SUPERSEDES,
            ))
        self.audit.append(AuditEntry(
            operation="supersede",
            caller_identity=caller,
            entry_id=old_id,
            new_value=new_id,
            details=f"old_entry={old_id} superseded by new_entry={new_id}",
        ))

    def unsupersede(self, entry_id: str, caller: str = "") -> None:
        """Restore a superseded entry if within the undo window (24h)."""
        with self._lock:
            entry = self._entries.get(entry_id)
            if not entry:
                raise ValueError(f"Entry not found: {entry_id}")
            if entry.superseded_by is None:
                raise ValueError(f"Entry {entry_id} is not superseded")
            if entry.superseded_at and (time.time() - entry.superseded_at) > 86400:
                raise ValueError(
                    f"Undo window expired for entry {entry_id} "
                    f"(superseded {(time.time() - entry.superseded_at) / 3600:.1f}h ago)"
                )
            old_superseder = entry.superseded_by
            entry.superseded_by = None
            entry.superseded_at = None
            entry.updated_at = time.time()
        self.audit.append(AuditEntry(
            operation="unsupersede",
            caller_identity=caller,
            entry_id=entry_id,
            old_value=old_superseder,
            details=f"entry {entry_id} restored (was superseded by {old_superseder})",
        ))

    # ── Statistics ────────────────────────────────────────────

    def status(self, project: Optional[str] = None) -> dict:
        """Health and statistics for the Brain."""
        with self._lock:
            entries = list(self._entries.values())
            link_count = len(self._links)

        if project:
            entries = [e for e in entries if e.project == project]

        if not entries:
            return {
                "total_entries": 0,
                "by_category": {},
                "avg_usefulness": 0.0,
                "total_access_count": 0,
                "superseded_count": 0,
                "link_count": link_count,
            }

        by_category: dict[str, int] = {}
        total_usefulness = 0
        total_access = 0
        superseded = 0

        for entry in entries:
            cat = entry.category.value
            by_category[cat] = by_category.get(cat, 0) + 1
            total_usefulness += entry.usefulness
            total_access += entry.access_count
            if not entry.is_current:
                superseded += 1

        return {
            "total_entries": len(entries),
            "by_category": by_category,
            "avg_usefulness": total_usefulness / len(entries),
            "total_access_count": total_access,
            "superseded_count": superseded,
            "link_count": link_count,
        }
