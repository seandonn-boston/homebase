"""SQLite-backed persistence adapter for the Fleet Brain.

Provides the same interface as BrainStore but persists data to a SQLite
database file. Knowledge survives process restarts, server crashes, and
deployments.

Uses SQLite's JSON1 extension for metadata and a simple float-array
column for embeddings (no vector index — use Postgres + pgvector for
production-scale ANN search).

Usage:
    from brain.core.sqlite_store import SQLiteBrainStore
    store = SQLiteBrainStore("brain.db")
    # Same API as BrainStore
"""

from __future__ import annotations

import json
import logging
import sqlite3
import threading
import time
from typing import Optional

from .models import (
    AuthorityTier,
    Entry,
    EntryCategory,
    EntryLink,
    LinkType,
    Provenance,
    ScoredEntry,
)

logger = logging.getLogger(__name__)

_USEFULNESS_MIN = -100
_USEFULNESS_MAX = 100
_MAX_TRAVERSAL_NODES = 500
_MAX_AUDIT_LOG_SIZE = 10_000

# ── Schema ───────────────────────────────────────────────────

_SCHEMA = """
CREATE TABLE IF NOT EXISTS entries (
    id              TEXT PRIMARY KEY,
    created_at      REAL NOT NULL,
    updated_at      REAL NOT NULL,
    project         TEXT NOT NULL,
    category        TEXT NOT NULL,
    title           TEXT NOT NULL,
    content         TEXT NOT NULL,
    embedding       TEXT,          -- JSON-encoded float array
    metadata        TEXT NOT NULL DEFAULT '{}',
    source_agent    TEXT,
    source_session  TEXT,
    authority_tier  TEXT,
    provenance      TEXT NOT NULL DEFAULT 'agent',
    access_count    INTEGER NOT NULL DEFAULT 0,
    usefulness      INTEGER NOT NULL DEFAULT 0,
    superseded_by   TEXT,
    superseded_at   REAL
);

CREATE INDEX IF NOT EXISTS idx_entries_project_category
    ON entries (project, category);
CREATE INDEX IF NOT EXISTS idx_entries_created_at
    ON entries (created_at);
CREATE INDEX IF NOT EXISTS idx_entries_superseded
    ON entries (superseded_by);

CREATE TABLE IF NOT EXISTS entry_links (
    source_id   TEXT NOT NULL,
    target_id   TEXT NOT NULL,
    link_type   TEXT NOT NULL,
    created_at  REAL NOT NULL,
    PRIMARY KEY (source_id, target_id, link_type)
);

CREATE TABLE IF NOT EXISTS audit_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp       REAL NOT NULL,
    operation       TEXT NOT NULL,
    caller_identity TEXT NOT NULL DEFAULT '',
    entry_id        TEXT NOT NULL DEFAULT '',
    old_value       TEXT,
    new_value       TEXT,
    details         TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp
    ON audit_log (timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_entry_id
    ON audit_log (entry_id);
"""


# ── Audit wrapper ──────────────────────────────────────────

class _SQLiteAuditLog:
    """Audit log backed by SQLite."""

    def __init__(self, db_path: str) -> None:
        self._db_path = db_path

    def _conn(self) -> sqlite3.Connection:
        return sqlite3.connect(self._db_path)

    def append(self, entry) -> None:
        with self._conn() as conn:
            conn.execute(
                "INSERT INTO audit_log (timestamp, operation, caller_identity, "
                "entry_id, old_value, new_value, details) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (entry.timestamp, entry.operation, entry.caller_identity,
                 entry.entry_id, entry.old_value, entry.new_value, entry.details),
            )
            # Prune if over limit
            count = conn.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]
            if count > _MAX_AUDIT_LOG_SIZE:
                conn.execute(
                    "DELETE FROM audit_log WHERE id IN "
                    "(SELECT id FROM audit_log ORDER BY timestamp ASC LIMIT ?)",
                    (count - _MAX_AUDIT_LOG_SIZE,),
                )

    def query(
        self,
        entry_id: Optional[str] = None,
        operation: Optional[str] = None,
        caller: Optional[str] = None,
        since: Optional[float] = None,
        limit: int = 100,
    ) -> list:
        from .store import AuditEntry
        conditions = []
        params: list = []
        if entry_id:
            conditions.append("entry_id = ?")
            params.append(entry_id)
        if operation:
            conditions.append("operation = ?")
            params.append(operation)
        if caller:
            conditions.append("caller_identity = ?")
            params.append(caller)
        if since:
            conditions.append("timestamp >= ?")
            params.append(since)

        where = " AND ".join(conditions) if conditions else "1=1"
        sql = f"SELECT timestamp, operation, caller_identity, entry_id, old_value, new_value, details FROM audit_log WHERE {where} ORDER BY timestamp DESC LIMIT ?"
        params.append(limit)

        with self._conn() as conn:
            rows = conn.execute(sql, params).fetchall()

        return [
            AuditEntry(
                timestamp=row[0], operation=row[1], caller_identity=row[2],
                entry_id=row[3], old_value=row[4], new_value=row[5], details=row[6],
            )
            for row in rows
        ]

    @property
    def size(self) -> int:
        with self._conn() as conn:
            return conn.execute("SELECT COUNT(*) FROM audit_log").fetchone()[0]


# ── SQLite Brain Store ─────────────────────────────────────

class SQLiteBrainStore:
    """SQLite-backed store for Brain entries and links.

    Thread-safe via SQLite's built-in locking + Python threading lock.
    Provides the same interface as BrainStore for drop-in replacement.
    """

    def __init__(self, db_path: str = "brain.db") -> None:
        self._db_path = db_path
        self._lock = threading.Lock()
        self._init_db()
        self.audit = _SQLiteAuditLog(db_path)

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _init_db(self) -> None:
        with self._conn() as conn:
            conn.executescript(_SCHEMA)
        logger.info("SQLite Brain store initialized: %s", self._db_path)

    @staticmethod
    def _entry_from_row(row: tuple) -> Entry:
        embedding = json.loads(row[7]) if row[7] else None
        metadata = json.loads(row[8]) if row[8] else {}
        authority_tier = AuthorityTier(row[11]) if row[11] else None
        provenance = Provenance(row[12]) if row[12] else Provenance.AGENT

        entry = Entry(
            project=row[3],
            category=EntryCategory(row[4]),
            title=row[5],
            content=row[6],
            embedding=embedding,
            metadata=metadata,
            source_agent=row[9],
            source_session=row[10],
            authority_tier=authority_tier,
            provenance=provenance,
        )
        entry.id = row[0]
        entry.created_at = row[1]
        entry.updated_at = row[2]
        entry.access_count = row[13]
        entry.usefulness = row[14]
        entry.superseded_by = row[15]
        entry.superseded_at = row[16]
        return entry

    # ── Writes ────────────────────────────────────────────────

    def add_entry(self, entry: Entry, caller: str = "") -> str:
        from .store import AuditEntry
        embedding_json = json.dumps(entry.embedding) if entry.embedding else None
        metadata_json = json.dumps(entry.metadata)

        with self._lock, self._conn() as conn:
            conn.execute(
                "INSERT INTO entries (id, created_at, updated_at, project, category, "
                "title, content, embedding, metadata, source_agent, source_session, "
                "authority_tier, provenance, access_count, usefulness, superseded_by, "
                "superseded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (entry.id, entry.created_at, entry.updated_at, entry.project,
                 entry.category.value, entry.title, entry.content, embedding_json,
                 metadata_json, entry.source_agent, entry.source_session,
                 entry.authority_tier.value if entry.authority_tier else None,
                 entry.provenance.value, entry.access_count, entry.usefulness,
                 entry.superseded_by, entry.superseded_at),
            )

        self.audit.append(AuditEntry(
            operation="record",
            caller_identity=caller or entry.source_agent or "",
            entry_id=entry.id,
            new_value=entry.title[:200],
            details=f"category={entry.category.value}, project={entry.project}",
        ))
        return entry.id

    def add_link(self, link: EntryLink) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO entry_links (source_id, target_id, link_type, created_at) "
                "VALUES (?, ?, ?, ?)",
                (link.source_id, link.target_id, link.link_type.value, link.created_at),
            )

    # ── Reads ─────────────────────────────────────────────────

    def get_entry(self, entry_id: str) -> Optional[Entry]:
        with self._conn() as conn:
            row = conn.execute(
                "SELECT * FROM entries WHERE id = ?", (entry_id,)
            ).fetchone()
        return self._entry_from_row(row) if row else None

    def get_links(self, entry_id: str, depth: int = 1) -> list[EntryLink]:
        if depth < 1:
            return []

        with self._conn() as conn:
            rows = conn.execute(
                "SELECT source_id, target_id, link_type, created_at FROM entry_links "
                "WHERE source_id = ? OR target_id = ?",
                (entry_id, entry_id),
            ).fetchall()

        links = [
            EntryLink(source_id=r[0], target_id=r[1],
                      link_type=LinkType(r[2]), created_at=r[3])
            for r in rows
        ]

        if depth == 1:
            return links

        # Multi-depth traversal with cycle detection
        seen_ids = {entry_id}
        result = list(links)
        frontier = set()
        for link in links:
            frontier.add(link.source_id)
            frontier.add(link.target_id)
        frontier -= seen_ids
        total_visited = 1

        for _ in range(depth - 1):
            if total_visited >= _MAX_TRAVERSAL_NODES or not frontier:
                break
            next_frontier = set()
            for fid in frontier:
                if total_visited >= _MAX_TRAVERSAL_NODES:
                    break
                seen_ids.add(fid)
                total_visited += 1
                with self._conn() as conn:
                    rows = conn.execute(
                        "SELECT source_id, target_id, link_type, created_at FROM entry_links "
                        "WHERE source_id = ? OR target_id = ?",
                        (fid, fid),
                    ).fetchall()
                for r in rows:
                    link = EntryLink(source_id=r[0], target_id=r[1],
                                     link_type=LinkType(r[2]), created_at=r[3])
                    if link not in result:
                        result.append(link)
                    other = r[1] if r[0] == fid else r[0]
                    if other not in seen_ids:
                        next_frontier.add(other)
            frontier = next_frontier

        return result

    def list_entries(
        self,
        project: Optional[str] = None,
        category: Optional[EntryCategory] = None,
        current_only: bool = True,
    ) -> list[Entry]:
        conditions = []
        params: list = []
        if project:
            conditions.append("project = ?")
            params.append(project)
        if category:
            conditions.append("category = ?")
            params.append(category.value)
        if current_only:
            conditions.append("superseded_by IS NULL")

        where = " AND ".join(conditions) if conditions else "1=1"
        with self._conn() as conn:
            rows = conn.execute(f"SELECT * FROM entries WHERE {where}", params).fetchall()

        return [self._entry_from_row(row) for row in rows]

    # ── Mutations ─────────────────────────────────────────────

    def increment_access(self, entry_id: str) -> None:
        with self._lock, self._conn() as conn:
            conn.execute(
                "UPDATE entries SET access_count = access_count + 1 WHERE id = ?",
                (entry_id,),
            )

    def adjust_usefulness(self, entry_id: str, useful: bool, caller: str = "") -> int:
        from .store import AuditEntry
        delta = 1 if useful else -1
        with self._lock, self._conn() as conn:
            row = conn.execute(
                "SELECT usefulness FROM entries WHERE id = ?", (entry_id,)
            ).fetchone()
            if not row:
                raise ValueError(f"Entry not found: {entry_id}")
            old_value = row[0]
            new_value = max(_USEFULNESS_MIN, min(_USEFULNESS_MAX, old_value + delta))
            conn.execute(
                "UPDATE entries SET usefulness = ?, updated_at = ? WHERE id = ?",
                (new_value, time.time(), entry_id),
            )
        self.audit.append(AuditEntry(
            operation="strengthen",
            caller_identity=caller,
            entry_id=entry_id,
            old_value=str(old_value),
            new_value=str(new_value),
            details=f"useful={useful}",
        ))
        return new_value

    def supersede(self, old_id: str, new_id: str, caller: str = "") -> None:
        from .store import AuditEntry
        with self._lock, self._conn() as conn:
            old_row = conn.execute("SELECT id, superseded_by FROM entries WHERE id = ?", (old_id,)).fetchone()
            new_row = conn.execute("SELECT id, superseded_by FROM entries WHERE id = ?", (new_id,)).fetchone()
            if not old_row:
                raise ValueError(f"Old entry not found: {old_id}")
            if not new_row:
                raise ValueError(f"New entry not found: {new_id}")

            # Circular supersession detection (forward from new_id)
            visited = {new_id}
            current_id = new_row[1]  # superseded_by
            while current_id:
                if current_id == old_id:
                    raise ValueError(f"Circular supersession: {old_id} is already downstream of {new_id}")
                if current_id in visited:
                    break
                visited.add(current_id)
                r = conn.execute("SELECT superseded_by FROM entries WHERE id = ?", (current_id,)).fetchone()
                current_id = r[1] if r else None

            # Backward from old_id
            visited_back = {old_id}
            current_id = old_row[1]
            while current_id:
                if current_id == new_id:
                    raise ValueError(f"Circular supersession: {new_id} is already upstream of {old_id}")
                if current_id in visited_back:
                    break
                visited_back.add(current_id)
                r = conn.execute("SELECT superseded_by FROM entries WHERE id = ?", (current_id,)).fetchone()
                current_id = r[1] if r else None

            now = time.time()
            conn.execute(
                "UPDATE entries SET superseded_by = ?, superseded_at = ?, updated_at = ? WHERE id = ?",
                (new_id, now, now, old_id),
            )
            conn.execute(
                "INSERT OR IGNORE INTO entry_links (source_id, target_id, link_type, created_at) "
                "VALUES (?, ?, ?, ?)",
                (new_id, old_id, LinkType.SUPERSEDES.value, now),
            )

        self.audit.append(AuditEntry(
            operation="supersede",
            caller_identity=caller,
            entry_id=old_id,
            new_value=new_id,
            details=f"old_entry={old_id} superseded by new_entry={new_id}",
        ))

    def unsupersede(self, entry_id: str, caller: str = "") -> None:
        from .store import AuditEntry
        with self._lock, self._conn() as conn:
            row = conn.execute(
                "SELECT superseded_by, superseded_at FROM entries WHERE id = ?",
                (entry_id,),
            ).fetchone()
            if not row:
                raise ValueError(f"Entry not found: {entry_id}")
            if row[0] is None:
                raise ValueError(f"Entry {entry_id} is not superseded")
            if row[1] and (time.time() - row[1]) > 86400:
                raise ValueError(f"Undo window expired for entry {entry_id}")
            old_superseder = row[0]
            conn.execute(
                "UPDATE entries SET superseded_by = NULL, superseded_at = NULL, "
                "updated_at = ? WHERE id = ?",
                (time.time(), entry_id),
            )
        self.audit.append(AuditEntry(
            operation="unsupersede",
            caller_identity=caller,
            entry_id=entry_id,
            old_value=old_superseder,
            details=f"entry {entry_id} restored (was superseded by {old_superseder})",
        ))

    # ── Statistics ────────────────────────────────────────────

    def status(self, project: Optional[str] = None) -> dict:
        with self._conn() as conn:
            if project:
                entries = conn.execute(
                    "SELECT category, usefulness, access_count, superseded_by FROM entries WHERE project = ?",
                    (project,),
                ).fetchall()
            else:
                entries = conn.execute(
                    "SELECT category, usefulness, access_count, superseded_by FROM entries"
                ).fetchall()
            link_count = conn.execute("SELECT COUNT(*) FROM entry_links").fetchone()[0]

        if not entries:
            return {
                "total_entries": 0, "by_category": {},
                "avg_usefulness": 0.0, "total_access_count": 0,
                "superseded_count": 0, "link_count": link_count,
            }

        by_category: dict[str, int] = {}
        total_usefulness = 0
        total_access = 0
        superseded = 0
        for cat, useful, access, sup_by in entries:
            by_category[cat] = by_category.get(cat, 0) + 1
            total_usefulness += useful
            total_access += access
            if sup_by is not None:
                superseded += 1

        return {
            "total_entries": len(entries),
            "by_category": by_category,
            "avg_usefulness": total_usefulness / len(entries),
            "total_access_count": total_access,
            "superseded_count": superseded,
            "link_count": link_count,
        }
