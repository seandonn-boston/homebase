"""Tests for the Fleet Brain store, retrieval, and MCP server.

Validates the core pipeline: record → embed → store → query → retrieve.
"""

from __future__ import annotations

import unittest

from ..core.models import EntryCategory, LinkType
from ..core.sanitizer import SensitiveDataError
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


class TestSensitiveDataRejection(unittest.TestCase):
    """Test that the Brain rejects PII, secrets, and sensitive data."""

    def setUp(self) -> None:
        self.brain = bootstrap()

    def test_rejects_email_in_content(self) -> None:
        with self.assertRaises(SensitiveDataError):
            self.brain.server.brain_record(
                project="test",
                category="lesson",
                title="Auth debugging",
                content="User john.doe@example.com had an auth failure.",
            )

    def test_rejects_email_in_title(self) -> None:
        with self.assertRaises(SensitiveDataError):
            self.brain.server.brain_record(
                project="test",
                category="context",
                title="Issue reported by admin@company.org",
                content="The admin reported slow queries.",
            )

    def test_rejects_ssn(self) -> None:
        with self.assertRaises(SensitiveDataError):
            self.brain.server.brain_record(
                project="test",
                category="context",
                title="User identity",
                content="SSN is 123-45-6789 for verification.",
            )

    def test_rejects_api_key(self) -> None:
        with self.assertRaises(SensitiveDataError):
            self.brain.server.brain_record(
                project="test",
                category="decision",
                title="API config",
                content="Set api_key=FAKE_KEY_abc123def456ghi789jkl012mno",
            )

    def test_rejects_aws_key(self) -> None:
        with self.assertRaises(SensitiveDataError):
            self.brain.server.brain_record(
                project="test",
                category="context",
                title="AWS setup",
                content="Access key is AKIAIOSFODNN7EXAMPLE.",
            )

    def test_rejects_connection_string(self) -> None:
        with self.assertRaises(SensitiveDataError):
            self.brain.server.brain_record(
                project="test",
                category="context",
                title="DB config",
                content="Connect to postgresql://admin:s3cret@db.example.com:5432/prod",
            )

    def test_rejects_secret_token(self) -> None:
        with self.assertRaises(SensitiveDataError):
            self.brain.server.brain_record(
                project="test",
                category="decision",
                title="Token setup",
                content="Use token key_test_4eC39HqLyjWDarjtT1zdp7dc for payments.",
            )

    def test_rejects_sensitive_metadata_keys(self) -> None:
        with self.assertRaises(SensitiveDataError):
            self.brain.server.brain_record(
                project="test",
                category="context",
                title="User context",
                content="Recorded user preferences.",
                metadata={"email": "user@example.com"},
            )

    def test_rejects_password_in_metadata_values(self) -> None:
        with self.assertRaises(SensitiveDataError):
            self.brain.server.brain_record(
                project="test",
                category="context",
                title="Config notes",
                content="Service configuration.",
                metadata={"config": "password=hunter2insecure"},
            )

    def test_accepts_clean_entries(self) -> None:
        """Entries with knowledge (not data) must be accepted."""
        result = self.brain.server.brain_record(
            project="test",
            category="pattern",
            title="Always validate webhook signatures",
            content="Webhook payloads must be verified using HMAC signatures "
                    "before processing. This prevents replay attacks.",
            metadata={"tags": ["security", "webhooks"]},
        )
        self.assertIn("id", result)

    def test_accepts_credential_reference_without_value(self) -> None:
        """Referencing where credentials live (not their values) is fine."""
        result = self.brain.server.brain_record(
            project="test",
            category="decision",
            title="Credential storage approach",
            content="All database credentials are stored in the vault "
                    "under prod/db/primary. Agents access via broker only.",
        )
        self.assertIn("id", result)

    def test_no_sensitive_data_stored_after_rejection(self) -> None:
        """After rejection, nothing should be persisted."""
        try:
            self.brain.server.brain_record(
                project="test",
                category="lesson",
                title="Bad entry",
                content="Contact admin@example.com for help.",
            )
        except SensitiveDataError:
            pass
        status = self.brain.server.brain_status()
        self.assertEqual(status["total_entries"], 0)


if __name__ == "__main__":
    unittest.main()
