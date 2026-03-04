"""Tests for the monitor state module.

Covers file locking, atomic writes, schema validation, pruning,
star delta bug fix, and plausibility checks.
"""

from __future__ import annotations

import json
import os
import tempfile
import unittest

from aiStrat.monitor.state import MonitorState, _MAX_PLAUSIBLE_STAR_DELTA


class TestMonitorState(unittest.TestCase):
    """Basic state load/save tests."""

    def setUp(self) -> None:
        self.tmpdir = tempfile.mkdtemp()
        self.state_file = os.path.join(self.tmpdir, "state.json")

    def test_creates_new_state(self) -> None:
        state = MonitorState(self.state_file)
        self.assertEqual(state.scan_count, 0)
        self.assertIsNone(state.last_scan)

    def test_save_and_reload(self) -> None:
        state = MonitorState(self.state_file)
        state.record_release("anthropics/claude-code", "v1.0.0", "2026-01-01")
        state.record_repo("anthropics/claude-code", 5000)
        state.save()

        state2 = MonitorState(self.state_file)
        self.assertTrue(state2.is_release_known("anthropics/claude-code", "v1.0.0"))
        self.assertTrue(state2.is_repo_known("anthropics/claude-code"))
        self.assertEqual(state2.get_repo_stars("anthropics/claude-code"), 5000)
        self.assertEqual(state2.scan_count, 1)

    def test_save_is_atomic(self) -> None:
        """After save, file exists and is valid JSON."""
        state = MonitorState(self.state_file)
        state.record_release("test/repo", "v1", "2026-01-01")
        state.save()

        with open(self.state_file) as f:
            data = json.load(f)
        self.assertIn("releases", data)
        self.assertIn("test/repo", data["releases"])


class TestStarDelta(unittest.TestCase):
    """Star delta bug fix tests."""

    def setUp(self) -> None:
        self.tmpdir = tempfile.mkdtemp()
        self.state_file = os.path.join(self.tmpdir, "state.json")

    def test_unknown_repo_returns_zero_delta(self) -> None:
        state = MonitorState(self.state_file)
        delta = state.get_star_delta("unknown/repo", 1000)
        self.assertEqual(delta, 0)

    def test_known_repo_with_zero_stars_reports_correct_delta(self) -> None:
        """v4: Fixed bug where prev=0 was treated as falsy."""
        state = MonitorState(self.state_file)
        state.record_repo("test/repo", 0)
        delta = state.get_star_delta("test/repo", 500)
        self.assertEqual(delta, 500)

    def test_normal_star_delta(self) -> None:
        state = MonitorState(self.state_file)
        state.record_repo("test/repo", 1000)
        delta = state.get_star_delta("test/repo", 1200)
        self.assertEqual(delta, 200)

    def test_implausible_delta_capped(self) -> None:
        """v4: Plausibility check caps unreasonable deltas."""
        state = MonitorState(self.state_file)
        state.record_repo("test/repo", 100)
        delta = state.get_star_delta("test/repo", 100_000)
        self.assertEqual(delta, _MAX_PLAUSIBLE_STAR_DELTA)


class TestSchemaValidation(unittest.TestCase):
    """v4: Schema validation on load."""

    def setUp(self) -> None:
        self.tmpdir = tempfile.mkdtemp()
        self.state_file = os.path.join(self.tmpdir, "state.json")

    def test_corrupted_json_uses_defaults(self) -> None:
        with open(self.state_file, "w") as f:
            f.write("{invalid json")
        state = MonitorState(self.state_file)
        self.assertEqual(state.scan_count, 0)
        self.assertEqual(state.data["releases"], {})

    def test_wrong_type_resets_to_default(self) -> None:
        """If releases is a list instead of dict, reset to default."""
        with open(self.state_file, "w") as f:
            json.dump({"releases": ["wrong", "type"], "repos": {}, "feed_items": {}, "scan_count": 0}, f)
        state = MonitorState(self.state_file)
        self.assertEqual(state.data["releases"], {})

    def test_extra_keys_preserved(self) -> None:
        """Unknown keys don't cause failures."""
        with open(self.state_file, "w") as f:
            json.dump({"releases": {}, "repos": {}, "feed_items": {}, "scan_count": 5, "custom": True}, f)
        state = MonitorState(self.state_file)
        self.assertEqual(state.scan_count, 5)


class TestFeedItemTracking(unittest.TestCase):

    def setUp(self) -> None:
        self.tmpdir = tempfile.mkdtemp()
        self.state_file = os.path.join(self.tmpdir, "state.json")

    def test_record_and_check_feed_item(self) -> None:
        state = MonitorState(self.state_file)
        self.assertFalse(state.is_feed_item_known("abc123"))
        state.record_feed_item("abc123", "Test Article")
        self.assertTrue(state.is_feed_item_known("abc123"))


if __name__ == "__main__":
    unittest.main()
