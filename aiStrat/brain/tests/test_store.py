"""Tests for the Fleet Brain store, retrieval, and MCP server.

Validates the core pipeline: record → embed → store → query → retrieve.
"""

from __future__ import annotations

import time
import unittest

from ..core.models import Entry, EntryCategory, LinkType
from ..core.retrieval import (
    _infer_category,
    _recency_score,
    _usefulness_score,
    query,
)
from ..services.bootstrap import bootstrap


class TestBrainRecord(unittest.TestCase):
    """Test brain_record tool."""

    def setUp(self) -> None:
        self.brain = bootstrap()

    def test_record_returns_id(self) -> None:
        result = self.brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Chose JWT for auth",
            content="Stateless API requires token-based auth.",
        )
        self.assertIn("id", result)
        self.assertTrue(len(result["id"]) > 0)

    def test_record_stores_entry(self) -> None:
        result = self.brain.server.brain_record(
            project="test-project",
            category="lesson",
            title="URL-encode DB credentials",
            content="Prisma fails silently with special chars in DB URL.",
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
        )
        r2 = self.brain.server.brain_record(
            project="test-project",
            category="outcome",
            title="Postgres works well",
            content="All queries under 50ms.",
            links=[{"target_id": r1["id"], "link_type": "supports"}],
        )
        links = self.brain.store.get_links(r2["id"])
        self.assertEqual(len(links), 1)
        self.assertEqual(links[0].link_type, LinkType.SUPPORTS)


class TestBrainRetrieve(unittest.TestCase):
    """Test brain_retrieve tool."""

    def setUp(self) -> None:
        self.brain = bootstrap()
        self.entry_id = self.brain.server.brain_record(
            project="test-project",
            category="failure",
            title="Migration failed silently",
            content="DB migration passed but data was not migrated.",
        )["id"]

    def test_retrieve_by_id(self) -> None:
        result = self.brain.server.brain_retrieve(id=self.entry_id)
        self.assertEqual(result["id"], self.entry_id)
        self.assertEqual(result["category"], "failure")
        self.assertEqual(result["title"], "Migration failed silently")

    def test_retrieve_increments_access(self) -> None:
        self.brain.server.brain_retrieve(id=self.entry_id)
        self.brain.server.brain_retrieve(id=self.entry_id)
        entry = self.brain.store.get_entry(self.entry_id)
        self.assertEqual(entry.access_count, 2)

    def test_retrieve_nonexistent_raises(self) -> None:
        with self.assertRaises(ValueError):
            self.brain.server.brain_retrieve(id="nonexistent")


class TestBrainStrengthen(unittest.TestCase):
    """Test brain_strengthen tool."""

    def setUp(self) -> None:
        self.brain = bootstrap()
        self.entry_id = self.brain.server.brain_record(
            project="test-project",
            category="lesson",
            title="Always test migrations",
            content="Run migrations in a test environment first.",
        )["id"]

    def test_strengthen_positive(self) -> None:
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=True)
        self.assertEqual(result["usefulness"], 1)

    def test_strengthen_negative(self) -> None:
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=False)
        self.assertEqual(result["usefulness"], -1)

    def test_strengthen_accumulates(self) -> None:
        self.brain.server.brain_strengthen(id=self.entry_id, useful=True)
        self.brain.server.brain_strengthen(id=self.entry_id, useful=True)
        result = self.brain.server.brain_strengthen(id=self.entry_id, useful=False)
        self.assertEqual(result["usefulness"], 1)


class TestBrainSupersede(unittest.TestCase):
    """Test brain_supersede tool."""

    def setUp(self) -> None:
        self.brain = bootstrap()
        self.old_id = self.brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Use session cookies",
            content="Session-based auth for simplicity.",
        )["id"]
        self.new_id = self.brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Switch to JWT",
            content="Need stateless auth for horizontal scaling.",
        )["id"]

    def test_supersede_marks_old_entry(self) -> None:
        self.brain.server.brain_supersede(old_id=self.old_id, new_id=self.new_id)
        old_entry = self.brain.store.get_entry(self.old_id)
        self.assertEqual(old_entry.superseded_by, self.new_id)
        self.assertFalse(old_entry.is_current)

    def test_supersede_creates_link(self) -> None:
        self.brain.server.brain_supersede(old_id=self.old_id, new_id=self.new_id)
        links = self.brain.store.get_links(self.new_id)
        supersede_links = [l for l in links if l.link_type == LinkType.SUPERSEDES]
        self.assertEqual(len(supersede_links), 1)

    def test_superseded_entries_excluded_from_listing(self) -> None:
        self.brain.server.brain_supersede(old_id=self.old_id, new_id=self.new_id)
        current = self.brain.store.list_entries(project="test-project", current_only=True)
        ids = [e.id for e in current]
        self.assertNotIn(self.old_id, ids)
        self.assertIn(self.new_id, ids)


class TestBrainStatus(unittest.TestCase):
    """Test brain_status tool."""

    def setUp(self) -> None:
        self.brain = bootstrap()

    def test_empty_status(self) -> None:
        status = self.brain.server.brain_status()
        self.assertEqual(status["total_entries"], 0)

    def test_status_with_entries(self) -> None:
        self.brain.server.brain_record(
            project="proj-a",
            category="decision",
            title="Decision 1",
            content="Content.",
        )
        self.brain.server.brain_record(
            project="proj-a",
            category="lesson",
            title="Lesson 1",
            content="Content.",
        )
        self.brain.server.brain_record(
            project="proj-b",
            category="decision",
            title="Decision 2",
            content="Content.",
        )

        # All projects
        status = self.brain.server.brain_status()
        self.assertEqual(status["total_entries"], 3)

        # Filtered to proj-a
        status_a = self.brain.server.brain_status(project="proj-a")
        self.assertEqual(status_a["total_entries"], 2)
        self.assertEqual(status_a["by_category"]["decision"], 1)
        self.assertEqual(status_a["by_category"]["lesson"], 1)


class TestRetrievalSignals(unittest.TestCase):
    """Test the 6-signal ranked retrieval pipeline."""

    def test_infer_category_decision(self) -> None:
        self.assertEqual(_infer_category("why did we choose Postgres?"), EntryCategory.DECISION)

    def test_infer_category_failure(self) -> None:
        self.assertEqual(_infer_category("what went wrong with the migration?"), EntryCategory.FAILURE)

    def test_infer_category_lesson(self) -> None:
        self.assertEqual(_infer_category("what lesson did we learn?"), EntryCategory.LESSON)

    def test_infer_category_none(self) -> None:
        self.assertIsNone(_infer_category("tell me about the project"))

    def test_recency_score_new_entry(self) -> None:
        entry = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c")
        score = _recency_score(entry)
        self.assertAlmostEqual(score, 1.0, places=2)

    def test_recency_score_old_entry(self) -> None:
        entry = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c")
        entry.created_at = time.time() - (200 * 86400)  # 200 days ago
        score = _recency_score(entry)
        self.assertEqual(score, 0.0)

    def test_usefulness_score_zero(self) -> None:
        entry = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c")
        self.assertEqual(_usefulness_score(entry), 0.0)

    def test_usefulness_score_capped(self) -> None:
        entry = Entry(project="p", category=EntryCategory.DECISION, title="t", content="c")
        entry.usefulness = 100
        self.assertEqual(_usefulness_score(entry, max_usefulness=50), 1.0)

    def test_query_returns_scored_entries(self) -> None:
        brain = bootstrap()
        brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Chose Postgres for the database",
            content="Relational model plus pgvector for embeddings.",
        )
        brain.server.brain_record(
            project="test-project",
            category="pattern",
            title="Contract-first API design",
            content="Define OpenAPI spec before implementing endpoints.",
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
        brain = bootstrap()
        brain.server.brain_record(
            project="project-a",
            category="decision",
            title="Chose Redis for caching",
            content="In-memory caching for low latency.",
        )
        brain.server.brain_record(
            project="project-b",
            category="decision",
            title="Chose Redis for caching",
            content="In-memory caching for low latency.",
        )

        results = query(
            store=brain.store,
            embedding_provider=brain.embeddings,
            query_text="caching decision",
            project="project-a",
            min_score=0.0,
        )
        # With identical content, the project-a entry should score higher
        if len(results) >= 2:
            project_a_entries = [r for r in results if r.entry.project == "project-a"]
            project_b_entries = [r for r in results if r.entry.project == "project-b"]
            if project_a_entries and project_b_entries:
                self.assertGreater(project_a_entries[0].score, project_b_entries[0].score)

    def test_query_excludes_superseded(self) -> None:
        brain = bootstrap()
        old = brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Use MySQL",
            content="Simple SQL database.",
        )
        new = brain.server.brain_record(
            project="test-project",
            category="decision",
            title="Switch to Postgres",
            content="Need pgvector support.",
        )
        brain.server.brain_supersede(old_id=old["id"], new_id=new["id"])

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
        brain = bootstrap()
        results = query(
            store=brain.store,
            embedding_provider=brain.embeddings,
            query_text="anything",
            min_score=0.0,
        )
        self.assertEqual(results, [])

    def test_query_skips_entries_without_embedding(self) -> None:
        brain = bootstrap()
        # Manually add an entry without an embedding
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


if __name__ == "__main__":
    unittest.main()
