"""Thread-safe in-memory storage for the Fleet Brain.

Provides the same interface that a Postgres-backed store would,
using Python data structures and threading locks. Swap this for
a Postgres adapter in production without changing callers.

Reference: admiral/part5-brain.md, Section 15.
"""

from __future__ import annotations

import threading
import time
from typing import Optional

from .models import (
    Entry,
    EntryCategory,
    EntryLink,
    LinkType,
    ScoredEntry,
)
from .sanitizer import scan_entry


class BrainStore:
    """Thread-safe in-memory store for Brain entries and links."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._entries: dict[str, Entry] = {}
        self._links: list[EntryLink] = []

    # ── Writes ────────────────────────────────────────────────

    def add_entry(self, entry: Entry) -> str:
        """Store a new entry. Returns the entry ID.

        Raises SensitiveDataError if the entry contains PII,
        secrets, or other sensitive data. This is the lowest-level
        enforcement point — all storage paths go through here.
        """
        # Enforce BEFORE acquiring the lock — fail fast
        scan_entry(
            title=entry.title,
            content=entry.content,
            metadata=entry.metadata,
            source_agent=entry.source_agent,
            source_session=entry.source_session,
        )
        with self._lock:
            self._entries[entry.id] = entry
            return entry.id

    def add_link(self, link: EntryLink) -> None:
        """Create a relationship between two entries."""
        with self._lock:
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

            # Traverse further
            seen_ids = {entry_id}
            result = list(direct)
            frontier = set()
            for link in direct:
                frontier.add(link.source_id)
                frontier.add(link.target_id)
            frontier -= seen_ids

            for _ in range(depth - 1):
                next_frontier = set()
                for fid in frontier:
                    seen_ids.add(fid)
                    for link in self._links:
                        if link.source_id == fid or link.target_id == fid:
                            if link not in result:
                                result.append(link)
                            next_frontier.add(link.source_id)
                            next_frontier.add(link.target_id)
                frontier = next_frontier - seen_ids
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

    def adjust_usefulness(self, entry_id: str, useful: bool) -> int:
        """Increment or decrement an entry's usefulness signal.

        Returns the updated usefulness score.
        """
        with self._lock:
            entry = self._entries.get(entry_id)
            if not entry:
                raise ValueError(f"Entry not found: {entry_id}")
            entry.usefulness += 1 if useful else -1
            entry.updated_at = time.time()
            return entry.usefulness

    def supersede(self, old_id: str, new_id: str) -> None:
        """Mark an entry as superseded by another."""
        with self._lock:
            old_entry = self._entries.get(old_id)
            new_entry = self._entries.get(new_id)
            if not old_entry:
                raise ValueError(f"Old entry not found: {old_id}")
            if not new_entry:
                raise ValueError(f"New entry not found: {new_id}")
            old_entry.superseded_by = new_id
            old_entry.updated_at = time.time()
            # Also create a supersedes link
            self.add_link(EntryLink(
                source_id=new_id,
                target_id=old_id,
                link_type=LinkType.SUPERSEDES,
            ))

    # ── Statistics ────────────────────────────────────────────

    def status(self, project: Optional[str] = None) -> dict:
        """Health and statistics for the Brain."""
        with self._lock:
            entries = list(self._entries.values())

        if project:
            entries = [e for e in entries if e.project == project]

        if not entries:
            return {
                "total_entries": 0,
                "by_category": {},
                "avg_usefulness": 0.0,
                "total_access_count": 0,
                "superseded_count": 0,
                "link_count": len(self._links),
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
            "link_count": len(self._links),
        }
