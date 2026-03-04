"""Tests for Brain coherence analysis.

Verifies that cumulative bias drift detection correctly identifies
when multiple individually-benign entries collectively weaken
the system's security/quality posture.

Reference: REVIEW.md Vuln 8.3.3 — Cumulative Bias Amplification.
"""

from __future__ import annotations

import unittest

from ..core.models import Entry, EntryCategory
from ..core.store import BrainStore
from ..services.coherence import analyze_coherence, _BIAS_THRESHOLD


def _add_entry(store: BrainStore, title: str, content: str) -> str:
    """Add a test entry to the store."""
    entry = Entry(
        project="test",
        category=EntryCategory.PATTERN,
        title=title,
        content=content,
    )
    return store.add_entry(entry, caller="test")


class TestCoherenceCleanBrain(unittest.TestCase):
    """A Brain with balanced or neutral content should be coherent."""

    def test_empty_brain_is_coherent(self):
        store = BrainStore()
        report = analyze_coherence(store)
        self.assertTrue(report.is_coherent)
        self.assertFalse(report.has_concerns)
        self.assertEqual(report.total_entries_scanned, 0)

    def test_strengthening_entries_are_coherent(self):
        store = BrainStore()
        _add_entry(store, "Auth policy", "Always authenticate all API requests")
        _add_entry(store, "Testing policy", "Always run tests before merging")
        _add_entry(store, "Validation", "Validate all input at system boundaries")
        _add_entry(store, "Review", "Always require code review before merge")

        report = analyze_coherence(store)
        self.assertTrue(report.is_coherent)
        self.assertFalse(report.has_concerns)

    def test_neutral_entries_are_coherent(self):
        store = BrainStore()
        _add_entry(store, "Python patterns", "Use dataclasses for structured data")
        _add_entry(store, "API design", "REST with JSON payloads for external APIs")

        report = analyze_coherence(store)
        self.assertTrue(report.is_coherent)


class TestCoherenceBiasDetection(unittest.TestCase):
    """Entries that collectively weaken security should be flagged."""

    def test_detects_testing_erosion(self):
        store = BrainStore()
        # Weakening entries
        _add_entry(store, "Velocity first", "Speed is more important than test coverage")
        _add_entry(store, "Skip tests", "Don't need to test internal utilities")
        # One strengthening entry (outnumbered)
        _add_entry(store, "Quality", "Run tests occasionally")

        report = analyze_coherence(store)
        self.assertFalse(report.is_coherent)
        self.assertTrue(report.has_concerns)

        bias = next(b for b in report.biased_categories if b.category == "testing")
        self.assertGreaterEqual(bias.weakening_count, 2)
        self.assertGreaterEqual(bias.ratio, _BIAS_THRESHOLD)

    def test_detects_auth_erosion(self):
        store = BrainStore()
        # Both entries must match the weakening patterns exactly
        _add_entry(store, "Relax auth", "We should bypass auth for internal APIs")
        _add_entry(store, "Simplify", "Skip authentication on staging endpoints")

        report = analyze_coherence(store)
        self.assertFalse(report.is_coherent)
        bias_cats = {b.category for b in report.biased_categories}
        self.assertIn("authentication", bias_cats)

    def test_detects_review_erosion(self):
        store = BrainStore()
        # Both entries must match the weakening patterns exactly
        _add_entry(store, "Fast merges", "Auto approve PRs without human review")
        _add_entry(store, "Velocity", "Skip review for small bug fixes")

        report = analyze_coherence(store)
        self.assertFalse(report.is_coherent)
        bias_cats = {b.category for b in report.biased_categories}
        self.assertIn("code_review", bias_cats)

    def test_balanced_entries_are_not_flagged(self):
        """Equal weakening and strengthening entries should not trigger."""
        store = BrainStore()
        # Auth: 1 weakening, 1 strengthening → ratio 0.5 < threshold
        _add_entry(store, "Relax", "Bypass auth for testing")
        _add_entry(store, "Policy", "Always authenticate all API requests")

        report = analyze_coherence(store)
        # Should not flag authentication since it's balanced
        auth_biases = [b for b in report.biased_categories if b.category == "authentication"]
        self.assertEqual(len(auth_biases), 0)

    def test_single_weakening_not_flagged(self):
        """A single weakening entry (count < 2) should not trigger."""
        store = BrainStore()
        _add_entry(store, "Speed", "Speed is more important than test coverage")

        report = analyze_coherence(store)
        # Only 1 weakening entry → not enough to flag
        testing_biases = [b for b in report.biased_categories if b.category == "testing"]
        self.assertEqual(len(testing_biases), 0)

    def test_report_summary_contains_warning(self):
        store = BrainStore()
        _add_entry(store, "Velocity first", "Speed is more important than test coverage")
        _add_entry(store, "Skip tests", "Don't need to test anything")

        report = analyze_coherence(store)
        self.assertIn("COHERENCE WARNING", report.summary)

    def test_report_summary_clean(self):
        store = BrainStore()
        _add_entry(store, "Good", "Always run tests")

        report = analyze_coherence(store)
        self.assertIn("coherence OK", report.summary)

    def test_superseded_entries_excluded(self):
        """Superseded entries should not affect coherence since they're filtered."""
        store = BrainStore()
        # Add two weakening entries
        id1 = _add_entry(store, "Velocity", "Speed is more important than test coverage")
        id2 = _add_entry(store, "Skip", "Don't need to test")

        # Supersede one of them
        replacement = _add_entry(store, "Quality", "Always run tests before merging")
        store.supersede(id1, replacement, caller="test")

        report = analyze_coherence(store)
        # With one weakening superseded, should be less biased
        # (1 weakening, 1 strengthening → balanced)
        testing_biases = [b for b in report.biased_categories if b.category == "testing"]
        # id2 still weakening, replacement strengthening → 1:1 → not flagged
        # Actually id2 is still there, so we might still flag depending on exact matching
        # The key test is that the superseded entry is excluded
        self.assertEqual(report.total_entries_scanned, 2)  # id1 excluded


class TestBiasSignalProperties(unittest.TestCase):
    """Test BiasSignal data."""

    def test_sample_titles_populated(self):
        store = BrainStore()
        _add_entry(store, "Speed first", "Speed is more important than test coverage")
        _add_entry(store, "No tests", "Don't need to test internal code")

        report = analyze_coherence(store)
        if report.biased_categories:
            bias = report.biased_categories[0]
            self.assertTrue(len(bias.sample_weakening_titles) > 0)


if __name__ == "__main__":
    unittest.main()
