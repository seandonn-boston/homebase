"""Tests for the Fleet Brain store, retrieval, and MCP server.

Validates the core pipeline: record → embed → store → query → retrieve.

v4: Updated for authentication, audit trail, scoped authorization,
    usefulness bounds, circular supersession detection, provenance,
    metadata whitelist, and result diversity.
"""

from __future__ import annotations

import time
import unittest

from ..core.models import Entry, EntryCategory, LinkType
from ..core.retrieval import (
    _infer_category,
    _recency_score,
    _usefulness_score,
    _provenance_score,
    _enforce_diversity,
    query,
)
from ..core.store import AuditEntry, AuditLog
from ..mcp.auth import Scope, AuthenticationError, AuthorizationError
from ..services.bootstrap import bootstrap

# Standard test token for all tests — requires bootstrap with matching api_keys
_TEST_TOKEN = "test-key-v4"
_ADMIN_TOKEN = "admin-key-v4"
_READ_TOKEN = "read-key-v4"


def _make_brain():
    """Create a Brain with test API keys."""
    return bootstrap(
        api_keys={
            _TEST_TOKEN: ("test-user", Scope.WRITE),
            _ADMIN_TOKEN: ("admin-user", Scope.ADMIN),
            _READ_TOKEN: ("read-user", Scope.READ),
        },
        strict_mode=False,
    )


class TestBrainRecord(unittest.TestCase):
    """Test brain_record tool."""

    def setUp(self) -> None:
        self.brain = _make_brain()

    def test_record_returns_id(self) -> None:
        result = self.brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Chose JWT for auth",
            content="Stateless API requires token-based auth.",
            token=_TEST_TOKEN,
        )
        self.assertIn("id", result)
        self.assertTrue(len(result["id"]) > 0)

    def test_record_stores_entry(self) -> None:
        result = self.brain.server.brain_record(
            project="test-project",
            category="lesson",
            title="URL-encode DB credentials",
            content="Prisma fails silently with special chars in DB URL.",
            token=_TEST_TOKEN,
        )
        entry = self.brain.store.get_entry(result["id"])
        self.assertIsNotNone(entry)
        self.assertEqual(entry.title, "URL-encode DB credentials")
        self.assertEqual(entry.category, EntryCategory.LESSON)

    def test_record_generates_embedding(self) -> None:
        result = self.brain.server.brain_record(
            project="test-project",
            category="pattern",
            title="Contract-first parallelism",
            content="Define interface contracts before parallel work.",
            token=_TEST_TOKEN,
        )
        entry = self.brain.store.get_entry(result["id"])
        self.assertIsNotNone(entry.embedding)
        self.assertEqual(len(entry.embedding), 1536)

    def test_record_with_links(self) -> None:
        r1 = self.brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Use Postgres",
            content="Chose Postgres for relational + vector support.",
            token=_TEST_TOKEN,
        )
        r2 = self.brain.server.brain_record(
            project="test-project",
            category="outcome",
            title="Postgres works well",
            content="All queries under 50ms.",
            links=[{"target_id": r1["id"], "link_type": "supports"}],
            token=_TEST_TOKEN,
        )
        links = self.brain.store.get_links(r2["id"])
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0].link_type, LinkType.SUPPORTS)

    def test_record_rejects_unauthenticated(self) -> None:
        with self.assertRaises(AuthenticationError):
            self.brain.server.brain_record(
                project="test", category="decision",
                title="t", content="c",
            )

    def test_record_rejects_read_scope(self) -> None:
        with self.assertRaises(AuthorizationError):
            self.brain.server.brain_record(
                project="test", category="decision",
                title="t", content="c", token=_READ_TOKEN,
            )

    def test_record_strips_unknown_metadata_keys(self) -> None:
        result = self.brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Test metadata",
            content="Content",
            metadata={"tags": ["test"], "evil_key": "payload", "source_url": "https://x.com"},
            token=_TEST_TOKEN,
        )
        entry = self.brain.store.get_entry(result["id"])
        self.assertIn("tags", entry.metadata)
        self.assertIn("source_url", entry.metadata)
        self.assertNotIn("evil_key", entry.metadata)


class TestBrainRetrieve(unittest.TestCase):
    """Test brain_retrieve tool."""

    def setUp(self) -> None:
        self.brain = _make_brain()
        self.entry_id = self.brain.server.brain_record(
            project="test-project",
            category="failure",
            title="Migration failed silently",
            content="DB migration passed but data was not migrated.",
            token=_TEST_TOKEN,
        )["id"]

    def test_retrieve_by_id(self) -> None:
        result = self.brain.server.brain_retrieve(id=self.entry_id, token=_READ_TOKEN)
        self.assertEqual(result["id"], self.entry_id)
        self.assertEqual(result["category"], "failure")
        self.assertEqual(result["title"], "Migration failed silently")

    def test_retrieve_increments_access(self) -> None:
        self.brain.server.brain_retrieve(id=self.entry_id, token=_READ_TOKEN)
        self.brain.server.brain_retrieve(id=self.entry_id, token=_READ_TOKEN)
        entry = self.brain.store.get_entry(self.entry_id)
        self.assertEqual(entry.access_count, 2)

    def test_retrieve_nonexistent_raises(self) -> None:
        with self.assertRaises(ValueError):
            self.brain.server.brain_retrieve(id="nonexistent", token=_READ_TOKEN)


class TestBrainStrengthen(unittest.TestCase):
    """Test brain_strengthen tool."""

    def setUp(self) -> None:
        self.brain = _make_brain()
        self.entry_id = self.brain.server.brain_record(
            project="test-project",
            category="lesson",
            title="Always test migrations",
            content="Run migrations in a test environment first.",
            token=_TEST_TOKEN,
        )["id"]

    def test_strengthen_positive(self) -> None:
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=True, token=_TEST_TOKEN)
        self.assertEqual(result["usefulness"], 1)

    def test_strengthen_negative(self) -> None:
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=False, token=_TEST_TOKEN)
        self.assertEqual(result["usefulness"], -1)

    def test_strengthen_accumulates(self) -> None:
        self.brain.server.brain_strengthen(id=self.entry_id, useful=True, token=_TEST_TOKEN)
        self.brain.server.brain_strengthen(id=self.entry_id, useful=True, token=_TEST_TOKEN)
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=False, token=_TEST_TOKEN)
        self.assertEqual(result["usefulness"], 1)

    def test_strengthen_bounded_at_max(self) -> None:
        """v4: Usefulness clamped at [-100, 100] (Vuln 8.1.2)."""
        entry = self.brain.store.get_entry(self.entry_id)
        entry.usefulness = 99
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=True, token=_TEST_TOKEN)
        self.assertEqual(result["usefulness"], 100)
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=True, token=_TEST_TOKEN)
        self.assertEqual(result["usefulness"], 100)  # clamped

    def test_strengthen_bounded_at_min(self) -> None:
        entry = self.brain.store.get_entry(self.entry_id)
        entry.usefulness = -99
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=False, token=_TEST_TOKEN)
        self.assertEqual(result["usefulness"], -100)
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=False, token=_TEST_TOKEN)
        self.assertEqual(result["usefulness"], -100)  # clamped


class TestBrainSupersede(unittest.TestCase):
    """Test brain_supersede tool."""

    def setUp(self) -> None:
        self.brain = _make_brain()
        self.old_id = self.brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Use session cookies",
            content="Session-based auth for simplicity.",
            token=_TEST_TOKEN,
        )["id"]
        self.new_id = self.brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Switch to JWT",
            content="Need stateless auth for horizontal scaling.",
            token=_TEST_TOKEN,
        )["id"]

    def test_supersede_marks_old_entry(self) -> None:
        self.brain.server.brain_supersede(old_id=self.old_id, new_id=self.new_id, token=_ADMIN_TOKEN)
        old_entry = self.brain.store.get_entry(self.old_id)
        self.assertEqual(old_entry.superseded_by, self.new_id)
        self.assertFalse(old_entry.is_current)

    def test_supersede_creates_link(self) -> None:
        self.brain.server.brain_supersede(old_id=self.old_id, new_id=self.new_id, token=_ADMIN_TOKEN)
        links = self.brain.store.get_links(self.new_id)
        supersede_links = [l for l in links if l.link_type == LinkType.SUPERSEDES]
        self.assertEqual(len(supersede_links), 1)

    def test_superseded_entries_excluded_from_listing(self) -> None:
        self.brain.server.brain_supersede(old_id=self.old_id, new_id=self.new_id, token=_ADMIN_TOKEN)
        current = self.brain.store.list_entries(project="test-project", current_only=True)
        ids = [e.id for e in current]
        self.assertNotIn(self.old_id, ids)
        self.assertIn(self.new_id, ids)

    def test_supersede_requires_admin(self) -> None:
        """v4: Supersede requires admin scope (Vuln 8.1.3)."""
        with self.assertRaises(AuthorizationError):
            self.brain.server.brain_supersede(
                old_id=self.old_id, new_id=self.new_id, token=_TEST_TOKEN,
            )

    def test_supersede_circular_rejected(self) -> None:
        """v4: Circular supersession detected and rejected."""
        self.brain.server.brain_supersede(old_id=self.old_id, new_id=self.new_id, token=_ADMIN_TOKEN)
        with self.assertRaises(ValueError):
            self.brain.store.supersede(self.new_id, self.old_id)


class TestBrainStatus(unittest.TestCase):
    """Test brain_status tool."""

    def setUp(self) -> None:
        self.brain = _make_brain()

    def test_empty_status(self) -> None:
        status = self.brain.server.brain_status()
        self.assertEqual(status["total_entries"], 0)

    def test_status_with_entries(self) -> None:
        self.brain.server.brain_record(
            project="proj-a", category="decision",
            title="Decision 1", content="Content.", token=_TEST_TOKEN,
        )
        self.brain.server.brain_record(
            project="proj-a", category="lesson",
            title="Lesson 1", content="Content.", token=_TEST_TOKEN,
        )
        self.brain.server.brain_record(
            project="proj-b", category="decision",
            title="Decision 2", content="Content.", token=_TEST_TOKEN,
        )

        status = self.brain.server.brain_status()
        self.assertEqual(status["total_entries"], 3)

        status_a = self.brain.server.brain_status(project="proj-a")
        self.assertEqual(status_a["total_entries"], 2)
        self.assertEqual(status_a["by_category"]["decision"], 1)
        self.assertEqual(status_a["by_category"]["lesson"], 1)

    def test_status_includes_audit_log_size(self) -> None:
        """v4: Status includes audit log size."""
        status = self.brain.server.brain_status()
        self.assertIn("audit_log_size", status)


class TestAuditTrail(unittest.TestCase):
    """v4: Tests for the audit trail (Vuln 8.1.8)."""

    def setUp(self) -> None:
        self.brain = _make_brain()

    def test_record_creates_audit_entry(self) -> None:
        self.brain.server.brain_record(
            project="test", category="decision",
            title="Test", content="Content", token=_TEST_TOKEN,
        )
        log = self.brain.store.audit.query(operation="record")
        self.assertEqual(len(log), 1)
        self.assertEqual(log[0].caller_identity, "test-user")

    def test_strengthen_creates_audit_entry(self) -> None:
        r = self.brain.server.brain_record(
            project="test", category="decision",
            title="Test", content="Content", token=_TEST_TOKEN,
        )
        self.brain.server.brain_strengthen(id=r["id"], useful=True, token=_TEST_TOKEN)
        log = self.brain.store.audit.query(operation="strengthen")
        self.assertEqual(len(log), 1)
        self.assertEqual(log[0].old_value, "0")
        self.assertEqual(log[0].new_value, "1")

    def test_supersede_creates_audit_entry(self) -> None:
        r1 = self.brain.server.brain_record(
            project="test", category="decision",
            title="Old", content="C", token=_TEST_TOKEN,
        )
        r2 = self.brain.server.brain_record(
            project="test", category="decision",
            title="New", content="C", token=_TEST_TOKEN,
        )
        self.brain.server.brain_supersede(
            old_id=r1["id"], new_id=r2["id"], token=_ADMIN_TOKEN,
        )
        log = self.brain.store.audit.query(operation="supersede")
        self.assertEqual(len(log), 1)
        self.assertEqual(log[0].caller_identity, "admin-user")

    def test_audit_query_by_entry_id(self) -> None:
        r = self.brain.server.brain_record(
            project="test", category="decision",
            title="Test", content="C", token=_TEST_TOKEN,
        )
        self.brain.server.brain_strengthen(id=r["id"], useful=True, token=_TEST_TOKEN)
        log = self.brain.store.audit.query(entry_id=r["id"])
        self.assertEqual(len(log), 2)  # record + strengthen

    def test_brain_audit_tool(self) -> None:
        self.brain.server.brain_record(
            project="test", category="decision",
            title="Test", content="C", token=_TEST_TOKEN,
        )
        results = self.brain.server.brain_audit(token=_READ_TOKEN)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["operation"], "record")


class TestRetrievalSignals(unittest.TestCase):
    """Test the 7-signal ranked retrieval pipeline."""

    def test_infer_category_decision(self) -> None:
        self.assertEqual(_infer_category("why did we choose Postgres?"), EntryCategory.DECISION)

    def test_infer_category_failure(self) -> None:
        self.assertEqual(_infer_category("what went wrong with the migration?"), EntryCategory.FAILURE)

    def test_infer_category_lesson(self) -> None:
        self.assertEqual(_infer_category("what lesson did we learn?"), EntryCategory.LESSON)

    def test_infer_category_none(self) -> None:
        self.assertIsNone(_infer_category("tell me about the project"))

    def test_infer_category_word_boundary(self) -> None:
        """v4: 'error handling' should NOT match FAILURE (Vuln 8.1.5)."""
        self.assertIsNone(_infer_category("error handling strategy"))
        self.assertEqual(_infer_category("what failed?"), EntryCategory.FAILURE)

    def test_recency_score_new_entry(self) -> None:
        entry = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c")
        score = _recency_score(entry)
        self.assertAlmostEqual(score, 1.0, places=2)

    def test_recency_score_old_entry(self) -> None:
        entry = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c")
        entry.created_at = time.time() - (200 * 86400)  # 200 days ago
        score = _recency_score(entry)
        self.assertEqual(score, 0.0)

    def test_usefulness_score_center(self) -> None:
        """v4: Zero usefulness maps to 0.5 (preserves negative signal)."""
        entry = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c")
        self.assertEqual(_usefulness_score(entry), 0.5)

    def test_usefulness_score_positive_max(self) -> None:
        entry = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c")
        entry.usefulness = 100
        self.assertEqual(_usefulness_score(entry, max_usefulness=50), 1.0)

    def test_usefulness_score_negative(self) -> None:
        """v4: Negative usefulness maps to (0.0, 0.5)."""
        entry = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c")
        entry.usefulness = -25
        score = _usefulness_score(entry, max_usefulness=50)
        self.assertGreater(score, 0.0)
        self.assertLess(score, 0.5)

    def test_provenance_score(self) -> None:
        """v4: Human > seed > agent > monitor (Vuln 8.1.4)."""
        e_human = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c", provenance="human")
        e_seed = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c", provenance="seed")
        e_agent = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c", provenance="agent")
        e_monitor = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c", provenance="monitor")
        self.assertGreater(_provenance_score(e_human), _provenance_score(e_seed))
        self.assertGreater(_provenance_score(e_seed), _provenance_score(e_agent))
        self.assertGreater(_provenance_score(e_agent), _provenance_score(e_monitor))

    def test_query_returns_scored_entries(self) -> None:
        brain = _make_brain()
        brain.server.brain_record(
            project="test-project", category="decision",
            title="Chose Postgres for the database",
            content="Relational model plus pgvector for embeddings.",
            token=_TEST_TOKEN,
        )
        brain.server.brain_record(
            project="test-project", category="pattern",
            title="Contract-first API design",
            content="Define OpenAPI spec before implementing endpoints.",
            token=_TEST_TOKEN,
        )

        results = query(
            store=brain.store,
            embedding_provider=brain.embeddings,
            query_text="database decision",
            project="test-project",
            min_score=0.0,
        )
        self.assertGreater(len(results), 0)
        self.assertIsInstance(results[0].score, float)

    def test_query_project_boost(self) -> None:
        brain = _make_brain()
        brain.server.brain_record(
            project="project-a", category="decision",
            title="Chose Redis for caching",
            content="In-memory caching for low latency.",
            token=_TEST_TOKEN,
        )
        brain.server.brain_record(
            project="project-b", category="decision",
            title="Chose Redis for caching",
            content="In-memory caching for low latency.",
            token=_TEST_TOKEN,
        )

        results = query(
            store=brain.store,
            embedding_provider=brain.embeddings,
            query_text="caching decision",
            project="project-a",
            min_score=0.0,
        )
        if len(results) >= 2:
            project_a_entries = [r for r in results if r.entry.project == "project-a"]
            project_b_entries = [r for r in results if r.entry.project == "project-b"]
            if project_a_entries and project_b_entries:
                self.assertGreater(project_a_entries[0].score, project_b_entries[0].score)

    def test_query_excludes_superseded(self) -> None:
        brain = _make_brain()
        old = brain.server.brain_record(
            project="test-project", category="decision",
            title="Use MySQL", content="Simple SQL database.",
            token=_TEST_TOKEN,
        )
        new = brain.server.brain_record(
            project="test-project", category="decision",
            title="Switch to Postgres", content="Need pgvector support.",
            token=_TEST_TOKEN,
        )
        brain.server.brain_supersede(old_id=old["id"], new_id=new["id"], token=_ADMIN_TOKEN)

        results = query(
            store=brain.store,
            embedding_provider=brain.embeddings,
            query_text="database decision",
            min_score=0.0,
            current_only=True,
        )
        result_ids = [r.entry.id for r in results]
        self.assertNotIn(old["id"], result_ids)

    def test_query_empty_store(self) -> None:
        brain = _make_brain()
        results = query(
            store=brain.store,
            embedding_provider=brain.embeddings,
            query_text="anything",
            min_score=0.0,
        )
        self.assertEqual(results, [])

    def test_query_skips_entries_without_embedding(self) -> None:
        brain = _make_brain()
        entry = Entry(
            project="test-project",
            category=EntryCategory.DECISION,
            title="No embedding",
            content="This entry has no vector.",
            embedding=None,
        )
        brain.store.add_entry(entry)

        results = query(
            store=brain.store,
            embedding_provider=brain.embeddings,
            query_text="no embedding",
            min_score=0.0,
        )
        result_ids = [r.entry.id for r in results]
        self.assertNotIn(entry.id, result_ids)


class TestCircularLinks(unittest.TestCase):
    """v4: Tests for cycle detection in link traversal (Vuln 8.1.1)."""

    def test_cycle_terminates(self) -> None:
        brain = _make_brain()
        # Create 3 entries linked in a cycle
        ids = []
        for i in range(3):
            e = Entry(
                project="test", category=EntryCategory.PATTERN,
                title=f"Entry {i}", content=f"Content {i}",
                embedding=[0.1] * 1536,
            )
            ids.append(brain.store.add_entry(e))

        from ..core.models import EntryLink
        brain.store.add_link(EntryLink(source_id=ids[0], target_id=ids[1], link_type=LinkType.SUPPORTS))
        brain.store.add_link(EntryLink(source_id=ids[1], target_id=ids[2], link_type=LinkType.SUPPORTS))
        brain.store.add_link(EntryLink(source_id=ids[2], target_id=ids[0], link_type=LinkType.SUPPORTS))

        # Should terminate without infinite loop
        links = brain.store.get_links(ids[0], depth=5)
        self.assertGreater(len(links), 0)
        self.assertLessEqual(len(links), 10)


if __name__ == "__main__":
    unittest.main()
