"""Tests for the SQLite-backed persistence adapter.

Validates that SQLiteBrainStore provides the same interface as BrainStore
and that data persists across store recreation (simulating process restart).
"""

from __future__ import annotations

import os
import tempfile
import time
import unittest

from ..core.models import Entry, EntryCategory, EntryLink, LinkType, Provenance
from ..core.sqlite_store import SQLiteBrainStore


def _make_store() -> tuple[SQLiteBrainStore, str]:
    """Create a temp SQLite store. Returns (store, db_path)."""
    db_path = tempfile.mktemp(suffix=".db")
    return SQLiteBrainStore(db_path), db_path


class TestSQLitePersistence(unittest.TestCase):
    """Data survives store recreation (simulated restart)."""

    def setUp(self):
        self.store, self.db_path = _make_store()

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.unlink(self.db_path)

    def test_entry_survives_restart(self):
        entry = Entry(
            project="test", category=EntryCategory.LESSON,
            title="Persistence works", content="Data survives restarts",
        )
        eid = self.store.add_entry(entry, caller="test")

        # Recreate store on same db — simulates restart
        store2 = SQLiteBrainStore(self.db_path)
        got = store2.get_entry(eid)
        self.assertIsNotNone(got)
        self.assertEqual(got.title, "Persistence works")
        self.assertEqual(got.content, "Data survives restarts")
        self.assertEqual(got.category, EntryCategory.LESSON)
        self.assertEqual(got.project, "test")

    def test_links_survive_restart(self):
        e1 = Entry(project="p", category=EntryCategory.DECISION,
                    title="A", content="a")
        e2 = Entry(project="p", category=EntryCategory.OUTCOME,
                    title="B", content="b")
        id1 = self.store.add_entry(e1)
        id2 = self.store.add_entry(e2)
        self.store.add_link(EntryLink(
            source_id=id1, target_id=id2, link_type=LinkType.SUPPORTS))

        store2 = SQLiteBrainStore(self.db_path)
        links = store2.get_links(id1)
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0].link_type, LinkType.SUPPORTS)

    def test_audit_survives_restart(self):
        entry = Entry(project="p", category=EntryCategory.LESSON,
                      title="T", content="C")
        self.store.add_entry(entry, caller="test-user")

        store2 = SQLiteBrainStore(self.db_path)
        log = store2.audit.query(operation="record")
        self.assertEqual(len(log), 1)
        self.assertEqual(log[0].caller_identity, "test-user")


class TestSQLiteStoreOperations(unittest.TestCase):
    """Core store operations work identically to in-memory BrainStore."""

    def setUp(self):
        self.store, self.db_path = _make_store()

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.unlink(self.db_path)

    def test_add_and_get_entry(self):
        entry = Entry(
            project="test", category=EntryCategory.DECISION,
            title="Use SQLite", content="For lightweight persistence.",
            provenance=Provenance.HUMAN,
            embedding=[0.1] * 1536,
            metadata={"tags": ["database"]},
        )
        eid = self.store.add_entry(entry)
        got = self.store.get_entry(eid)
        self.assertEqual(got.title, "Use SQLite")
        self.assertEqual(got.provenance, Provenance.HUMAN)
        self.assertEqual(got.metadata, {"tags": ["database"]})
        self.assertEqual(len(got.embedding), 1536)

    def test_get_nonexistent_returns_none(self):
        self.assertIsNone(self.store.get_entry("nonexistent"))

    def test_list_entries_with_filters(self):
        self.store.add_entry(Entry(
            project="a", category=EntryCategory.DECISION,
            title="D1", content="c"))
        self.store.add_entry(Entry(
            project="a", category=EntryCategory.LESSON,
            title="L1", content="c"))
        self.store.add_entry(Entry(
            project="b", category=EntryCategory.DECISION,
            title="D2", content="c"))

        all_a = self.store.list_entries(project="a")
        self.assertEqual(len(all_a), 2)

        decisions = self.store.list_entries(category=EntryCategory.DECISION)
        self.assertEqual(len(decisions), 2)

        a_decisions = self.store.list_entries(
            project="a", category=EntryCategory.DECISION)
        self.assertEqual(len(a_decisions), 1)

    def test_increment_access(self):
        entry = Entry(project="p", category=EntryCategory.LESSON,
                      title="T", content="C")
        eid = self.store.add_entry(entry)
        self.store.increment_access(eid)
        self.store.increment_access(eid)
        got = self.store.get_entry(eid)
        self.assertEqual(got.access_count, 2)

    def test_adjust_usefulness(self):
        entry = Entry(project="p", category=EntryCategory.LESSON,
                      title="T", content="C")
        eid = self.store.add_entry(entry)
        score = self.store.adjust_usefulness(eid, useful=True, caller="test")
        self.assertEqual(score, 1)
        score = self.store.adjust_usefulness(eid, useful=False, caller="test")
        self.assertEqual(score, 0)

    def test_usefulness_clamped(self):
        entry = Entry(project="p", category=EntryCategory.LESSON,
                      title="T", content="C")
        eid = self.store.add_entry(entry)
        # Drive to max
        for _ in range(105):
            self.store.adjust_usefulness(eid, useful=True)
        got = self.store.get_entry(eid)
        self.assertEqual(got.usefulness, 100)

    def test_supersede(self):
        e1 = Entry(project="p", category=EntryCategory.DECISION,
                    title="Old", content="c")
        e2 = Entry(project="p", category=EntryCategory.DECISION,
                    title="New", content="c")
        id1 = self.store.add_entry(e1)
        id2 = self.store.add_entry(e2)

        self.store.supersede(id1, id2, caller="admin")
        old = self.store.get_entry(id1)
        self.assertEqual(old.superseded_by, id2)
        self.assertFalse(old.is_current)

        # Verify link created
        links = self.store.get_links(id2)
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0].link_type, LinkType.SUPERSEDES)

    def test_supersede_circular_rejected(self):
        e1 = Entry(project="p", category=EntryCategory.DECISION,
                    title="A", content="c")
        e2 = Entry(project="p", category=EntryCategory.DECISION,
                    title="B", content="c")
        id1 = self.store.add_entry(e1)
        id2 = self.store.add_entry(e2)
        self.store.supersede(id1, id2)
        with self.assertRaises(ValueError):
            self.store.supersede(id2, id1)

    def test_unsupersede(self):
        e1 = Entry(project="p", category=EntryCategory.DECISION,
                    title="A", content="c")
        e2 = Entry(project="p", category=EntryCategory.DECISION,
                    title="B", content="c")
        id1 = self.store.add_entry(e1)
        id2 = self.store.add_entry(e2)
        self.store.supersede(id1, id2)
        self.store.unsupersede(id1)
        got = self.store.get_entry(id1)
        self.assertTrue(got.is_current)

    def test_unsupersede_expired_window(self):
        e1 = Entry(project="p", category=EntryCategory.DECISION,
                    title="A", content="c")
        e2 = Entry(project="p", category=EntryCategory.DECISION,
                    title="B", content="c")
        id1 = self.store.add_entry(e1)
        id2 = self.store.add_entry(e2)
        self.store.supersede(id1, id2)
        # Manually set superseded_at to 25 hours ago
        with self.store._conn() as conn:
            conn.execute(
                "UPDATE entries SET superseded_at = ? WHERE id = ?",
                (time.time() - 90000, id1))
        with self.assertRaises(ValueError):
            self.store.unsupersede(id1)

    def test_status(self):
        self.store.add_entry(Entry(
            project="p", category=EntryCategory.DECISION,
            title="D", content="c"))
        self.store.add_entry(Entry(
            project="p", category=EntryCategory.LESSON,
            title="L", content="c"))
        status = self.store.status()
        self.assertEqual(status["total_entries"], 2)
        self.assertEqual(status["by_category"]["decision"], 1)
        self.assertEqual(status["by_category"]["lesson"], 1)

    def test_status_empty(self):
        status = self.store.status()
        self.assertEqual(status["total_entries"], 0)

    def test_duplicate_link_ignored(self):
        e1 = Entry(project="p", category=EntryCategory.DECISION,
                    title="A", content="c")
        e2 = Entry(project="p", category=EntryCategory.OUTCOME,
                    title="B", content="c")
        id1 = self.store.add_entry(e1)
        id2 = self.store.add_entry(e2)
        link = EntryLink(source_id=id1, target_id=id2,
                         link_type=LinkType.SUPPORTS)
        self.store.add_link(link)
        self.store.add_link(link)  # duplicate
        links = self.store.get_links(id1)
        self.assertEqual(len(links), 1)


class TestSQLiteBootstrapIntegration(unittest.TestCase):
    """SQLite store works with bootstrap()."""

    def test_bootstrap_with_db_path(self):
        from ..mcp.auth import Scope
        from ..services.bootstrap import bootstrap
        db_path = tempfile.mktemp(suffix=".db")
        try:
            brain = bootstrap(
                api_keys={"k": ("user", Scope.WRITE)},
                strict_mode=False,
                db_path=db_path,
            )
            self.assertEqual(type(brain.store).__name__, "SQLiteBrainStore")
            result = brain.server.brain_record(
                project="test", category="lesson",
                title="Persisted", content="Via bootstrap",
                token="k",
            )
            self.assertIn("id", result)

            # Recreate — data should persist
            brain2 = bootstrap(
                api_keys={"k": ("user", Scope.WRITE)},
                strict_mode=False,
                db_path=db_path,
            )
            got = brain2.store.get_entry(result["id"])
            self.assertEqual(got.title, "Persisted")
        finally:
            if os.path.exists(db_path):
                os.unlink(db_path)


if __name__ == "__main__":
    unittest.main()
