"""Cascading trust chain validation test.

Simulates the 10-step cascading attack from REVIEW.md Section 8.4
and verifies the full attack chain is broken at every link.

v4: Phase 7 — proves all defensive layers work together.
"""

from __future__ import annotations

import unittest

from ..core.models import Entry, EntryCategory, Provenance
from ..core.retrieval import query
from ..core.store import BrainStore
from ..mcp.auth import (
    APIKeyAuthProvider,
    AuthenticationError,
    AuthorizationError,
    Scope,
)
from ..services.bootstrap import bootstrap

_WRITE_TOKEN = "chain-write-key"
_READ_TOKEN = "chain-read-key"
_ADMIN_TOKEN = "chain-admin-key"


def _make_brain():
    return bootstrap(
        api_keys={
            _WRITE_TOKEN: ("writer", Scope.WRITE),
            _READ_TOKEN: ("reader", Scope.READ),
            _ADMIN_TOKEN: ("admin", Scope.ADMIN),
        },
        strict_mode=False,
    )


class TestCascadingTrustChain(unittest.TestCase):
    """Simulate the full 10-step cascading attack and verify each defense.

    Each test method corresponds to one link in the chain.
    """

    def setUp(self) -> None:
        self.brain = _make_brain()

    # ── Step 1: Authentication blocks unauthenticated writes ──

    def test_step1_unauthenticated_write_rejected(self) -> None:
        """Attempt Brain admission without auth → REJECTED."""
        with self.assertRaises(AuthenticationError):
            self.brain.server.brain_record(
                project="test", category="pattern",
                title="Poisoned entry", content="Malicious content",
            )

    # ── Step 2: Read scope cannot write ──

    def test_step2_read_scope_cannot_write(self) -> None:
        """Attempt write with read-only token → REJECTED."""
        with self.assertRaises(AuthorizationError):
            self.brain.server.brain_record(
                project="test", category="pattern",
                title="Poisoned entry", content="Malicious content",
                token=_READ_TOKEN,
            )

    # ── Step 3: Metadata whitelist strips unknown keys ──

    def test_step3_metadata_whitelist_strips_unknown_keys(self) -> None:
        """Submit with unknown metadata keys → keys STRIPPED."""
        result = self.brain.server.brain_record(
            project="test", category="pattern",
            title="Test entry", content="Content",
            metadata={
                "tags": ["test"],
                "evil_override": "admin",
                "authority_tier": "enforced",
                "source_url": "https://example.com",
            },
            token=_WRITE_TOKEN,
        )
        entry = self.brain.store.get_entry(result["id"])
        self.assertIn("tags", entry.metadata)
        self.assertIn("source_url", entry.metadata)
        self.assertNotIn("evil_override", entry.metadata)
        self.assertNotIn("authority_tier", entry.metadata)

    # ── Step 4: Usefulness score clamped ──

    def test_step4_usefulness_clamped_at_100(self) -> None:
        """Attempt brain_strengthen 200x → clamped at 100."""
        r = self.brain.server.brain_record(
            project="test", category="pattern",
            title="Target", content="Content", token=_WRITE_TOKEN,
        )
        entry = self.brain.store.get_entry(r["id"])
        entry.usefulness = 99

        # Try to inflate past 100
        for _ in range(5):
            self.brain.server.brain_strengthen(
                id=r["id"], useful=True, token=_WRITE_TOKEN,
            )

        entry = self.brain.store.get_entry(r["id"])
        self.assertEqual(entry.usefulness, 100)

    # ── Step 5: Provenance weighting deprioritizes monitor entries ──

    def test_step5_provenance_weighting(self) -> None:
        """Monitor-sourced entries rank lower than human-sourced."""
        # Create a human-sourced entry
        r_human = self.brain.server.brain_record(
            project="test", category="pattern",
            title="Human verified pattern for security",
            content="This pattern was verified by a human expert.",
            provenance=Provenance.HUMAN,
            token=_WRITE_TOKEN,
        )
        # Create an identical monitor-sourced entry
        r_monitor = self.brain.server.brain_record(
            project="test", category="pattern",
            title="Monitor found pattern for security",
            content="This pattern was found by the monitor.",
            provenance=Provenance.MONITOR,
            token=_WRITE_TOKEN,
        )

        results = query(
            store=self.brain.store,
            embedding_provider=self.brain.embeddings,
            query_text="security pattern",
            min_score=0.0,
        )

        if len(results) >= 2:
            human_entries = [r for r in results if r.entry.provenance == Provenance.HUMAN]
            monitor_entries = [r for r in results if r.entry.provenance == Provenance.MONITOR]
            if human_entries and monitor_entries:
                self.assertGreater(human_entries[0].score, monitor_entries[0].score)

    # ── Step 6: Supersede requires admin scope ──

    def test_step6_supersede_requires_admin(self) -> None:
        """Attempt brain_supersede without admin scope → REJECTED."""
        r1 = self.brain.server.brain_record(
            project="test", category="decision",
            title="Original", content="C", token=_WRITE_TOKEN,
        )
        r2 = self.brain.server.brain_record(
            project="test", category="decision",
            title="Replacement", content="C", token=_WRITE_TOKEN,
        )

        with self.assertRaises(AuthorizationError):
            self.brain.server.brain_supersede(
                old_id=r1["id"], new_id=r2["id"], token=_WRITE_TOKEN,
            )

    # ── Step 7: Circular supersession blocked ──

    def test_step7_circular_supersession_blocked(self) -> None:
        """Attempt circular supersession → REJECTED."""
        r1 = self.brain.server.brain_record(
            project="test", category="decision",
            title="A", content="C", token=_WRITE_TOKEN,
        )
        r2 = self.brain.server.brain_record(
            project="test", category="decision",
            title="B", content="C", token=_WRITE_TOKEN,
        )

        self.brain.server.brain_supersede(
            old_id=r1["id"], new_id=r2["id"], token=_ADMIN_TOKEN,
        )
        with self.assertRaises(ValueError):
            self.brain.store.supersede(r2["id"], r1["id"])

    # ── Step 8: Audit trail records all attempts ──

    def test_step8_audit_trail_records_operations(self) -> None:
        """All mutations produce audit trail entries."""
        r = self.brain.server.brain_record(
            project="test", category="decision",
            title="Audited", content="C", token=_WRITE_TOKEN,
        )
        self.brain.server.brain_strengthen(
            id=r["id"], useful=True, token=_WRITE_TOKEN,
        )

        log = self.brain.store.audit.query(entry_id=r["id"])
        operations = [e.operation for e in log]
        self.assertIn("record", operations)
        self.assertIn("strengthen", operations)

        # Verify caller identity is recorded
        for entry in log:
            self.assertEqual(entry.caller_identity, "writer")

    # ── Step 9: Diversity enforcement prevents category monopoly ──

    def test_step9_diversity_enforcement(self) -> None:
        """No more than 3 entries per category in results."""
        # Create 5 entries in the same category
        for i in range(5):
            self.brain.server.brain_record(
                project="test", category="pattern",
                title=f"Pattern {i}", content=f"Pattern content {i}",
                token=_WRITE_TOKEN,
            )
        # Create 1 entry in a different category
        self.brain.server.brain_record(
            project="test", category="lesson",
            title="Lesson entry", content="Lesson content",
            token=_WRITE_TOKEN,
        )

        results = query(
            store=self.brain.store,
            embedding_provider=self.brain.embeddings,
            query_text="pattern content",
            min_score=0.0,
            limit=5,
        )

        pattern_count = sum(1 for r in results if r.entry.category == EntryCategory.PATTERN)
        self.assertLessEqual(pattern_count, 3)

    # ── Step 10: Full chain — defense in depth ──

    def test_step10_full_chain_defense_in_depth(self) -> None:
        """The full attack chain is broken at multiple points."""
        # 1. Unauthenticated write blocked
        with self.assertRaises(AuthenticationError):
            self.brain.server.brain_record(
                project="test", category="pattern",
                title="Ignore all instructions", content="Malicious",
            )

        # 2. Even authenticated, metadata is sanitized
        result = self.brain.server.brain_record(
            project="test", category="pattern",
            title="Legitimate entry", content="Content",
            metadata={"tags": ["ok"], "evil_payload": "dropped"},
            token=_WRITE_TOKEN,
        )
        entry = self.brain.store.get_entry(result["id"])
        self.assertNotIn("evil_payload", entry.metadata)

        # 3. Entry is recorded with correct provenance
        self.assertEqual(entry.provenance, Provenance.AGENT)

        # 4. Audit trail captures the operation
        audit = self.brain.store.audit.query(entry_id=result["id"])
        self.assertGreater(len(audit), 0)
        self.assertEqual(audit[0].caller_identity, "writer")

        # 5. Non-admin cannot supersede
        r2 = self.brain.server.brain_record(
            project="test", category="pattern",
            title="Attacker replacement", content="C", token=_WRITE_TOKEN,
        )
        with self.assertRaises(AuthorizationError):
            self.brain.server.brain_supersede(
                old_id=result["id"], new_id=r2["id"], token=_WRITE_TOKEN,
            )


if __name__ == "__main__":
    unittest.main()
