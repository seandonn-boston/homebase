"""Persistent state for the monitor — tracks what we've already seen.

State is stored as a JSON file committed to the repo, so it survives
across GitHub Actions runs and local invocations alike.

Tracked state:
  - Last scan timestamp
  - Known releases per repo (tag → publish date)
  - Known repos from discovery (full_name → star count at last scan)
  - Processed feed items (url hash → title)

Includes file locking (fcntl.flock), atomic writes (temp + os.replace),
schema validation, pruning of old entries, and plausibility checks for
star surges.
"""

from __future__ import annotations

import copy
import fcntl
import json
import logging
import os
import tempfile
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)

DEFAULT_STATE = {
    "last_scan": None,
    "releases": {},      # repo → { tag: published_at }
    "repos": {},         # full_name → { stars: N, first_seen: iso_date }
    "feed_items": {},    # url_hash → { title: str, seen_at: iso_date }
    "scan_count": 0,
}

# Pruning thresholds
_RELEASE_MAX_AGE_DAYS = 90
_REPO_MAX_AGE_DAYS = 180
_FEED_ITEM_MAX_AGE_DAYS = 30

# Star delta plausibility — flag surges above this as suspicious
_MAX_PLAUSIBLE_STAR_DELTA = 5000


class MonitorState:
    """Read/write persistent monitor state.

    Thread-safe file I/O with locking and atomic writes.
    """

    def __init__(self, state_file: str):
        self.state_file = state_file
        self.data = self._load()

    def _load(self) -> dict:
        if os.path.exists(self.state_file):
            try:
                lock_path = self.state_file + ".lock"
                fd_lock = os.open(lock_path, os.O_CREAT | os.O_RDWR)
                try:
                    fcntl.flock(fd_lock, fcntl.LOCK_SH)
                    with open(self.state_file) as f:
                        data = json.load(f)
                finally:
                    fcntl.flock(fd_lock, fcntl.LOCK_UN)
                    os.close(fd_lock)

                # Schema validation — reset invalid types to defaults
                validated = copy.deepcopy(DEFAULT_STATE)
                for key in DEFAULT_STATE:
                    if key in data:
                        expected_type = type(DEFAULT_STATE[key])
                        if expected_type is not type(None) and not isinstance(data[key], expected_type):
                            logger.warning(
                                "State schema violation: '%s' expected %s, got %s. Using default.",
                                key, expected_type.__name__, type(data[key]).__name__,
                            )
                        else:
                            validated[key] = data[key]
                return validated
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("Failed to load state from %s: %s — using defaults", self.state_file, e)
        return copy.deepcopy(DEFAULT_STATE)

    def save(self) -> None:
        """Write state to disk atomically with file locking.

        Uses temp file + os.replace for atomicity, fcntl for locking,
        and prunes old entries before writing.
        """
        self.data["last_scan"] = datetime.now(timezone.utc).isoformat()
        self.data["scan_count"] = self.data.get("scan_count", 0) + 1

        # Prune old entries before saving
        self._prune()

        state_dir = os.path.dirname(self.state_file) or "."
        os.makedirs(state_dir, exist_ok=True)

        # Atomic write: acquire exclusive lock on state file (or .lock file),
        # write to temp, then os.replace.
        # CRITICAL FIX: Lock the state file itself, NOT the temp file.
        # Locking the temp file provides zero coordination between writers.
        lock_path = self.state_file + ".lock"
        fd_lock = os.open(lock_path, os.O_CREAT | os.O_RDWR)
        try:
            fcntl.flock(fd_lock, fcntl.LOCK_EX)
            fd, tmp_path = tempfile.mkstemp(dir=state_dir, suffix=".tmp")
            try:
                with os.fdopen(fd, "w") as f:
                    json.dump(self.data, f, indent=2, default=str)
                os.replace(tmp_path, self.state_file)
            except Exception:
                try:
                    os.unlink(tmp_path)
                except OSError:
                    pass
                raise
        finally:
            fcntl.flock(fd_lock, fcntl.LOCK_UN)
            os.close(fd_lock)

    def _prune(self) -> None:
        """Remove stale entries to prevent unbounded state growth."""
        now = datetime.now(timezone.utc)

        # Prune old releases (>90 days)
        for repo in list(self.data.get("releases", {})):
            tags = self.data["releases"][repo]
            pruned = {}
            for tag, published_at in tags.items():
                try:
                    dt = datetime.fromisoformat(str(published_at))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    if (now - dt).days <= _RELEASE_MAX_AGE_DAYS:
                        pruned[tag] = published_at
                except (ValueError, TypeError):
                    pruned[tag] = published_at  # Keep unparseable
            if pruned:
                self.data["releases"][repo] = pruned
            else:
                del self.data["releases"][repo]

        # Prune old feed items (>30 days)
        feed_items = self.data.get("feed_items", {})
        pruned_feeds = {}
        for item_id, info in feed_items.items():
            try:
                seen = datetime.fromisoformat(str(info.get("seen_at", "")))
                if seen.tzinfo is None:
                    seen = seen.replace(tzinfo=timezone.utc)
                if (now - seen).days <= _FEED_ITEM_MAX_AGE_DAYS:
                    pruned_feeds[item_id] = info
            except (ValueError, TypeError):
                pruned_feeds[item_id] = info  # Keep unparseable
        self.data["feed_items"] = pruned_feeds

    # ── Release tracking ──

    def is_release_known(self, repo: str, tag: str) -> bool:
        return tag in self.data["releases"].get(repo, {})

    def record_release(self, repo: str, tag: str, published_at: str) -> None:
        if repo not in self.data["releases"]:
            self.data["releases"][repo] = {}
        self.data["releases"][repo][tag] = published_at

    def get_known_releases(self, repo: str) -> dict:
        return self.data["releases"].get(repo, {})

    # ── Repo discovery tracking ──

    def is_repo_known(self, full_name: str) -> bool:
        return full_name in self.data["repos"]

    def get_repo_stars(self, full_name: str) -> int:
        return self.data["repos"].get(full_name, {}).get("stars", 0)

    def record_repo(self, full_name: str, stars: int) -> None:
        now = datetime.now(timezone.utc).isoformat()
        if full_name in self.data["repos"]:
            self.data["repos"][full_name]["stars"] = stars
            self.data["repos"][full_name]["last_seen"] = now
        else:
            self.data["repos"][full_name] = {
                "stars": stars,
                "first_seen": now,
                "last_seen": now,
            }

    def get_star_delta(self, full_name: str, current_stars: int) -> int:
        """Return change in stars since last scan.

        Fixed bug where prev=0 was treated as falsy, hiding real star
        surges for repos with 0 recorded stars. Now checks repo existence
        explicitly. Also caps implausible deltas.
        """
        if full_name not in self.data.get("repos", {}):
            return 0  # Truly unknown repo — no delta to report

        prev = self.get_repo_stars(full_name)
        delta = current_stars - prev

        # Plausibility check: cap unreasonably large deltas
        if abs(delta) > _MAX_PLAUSIBLE_STAR_DELTA:
            logger.warning(
                "Implausible star delta for %s: %+d (prev=%d, current=%d). "
                "Possible state tampering. Capping to %d.",
                full_name, delta, prev, current_stars, _MAX_PLAUSIBLE_STAR_DELTA,
            )
            delta = _MAX_PLAUSIBLE_STAR_DELTA if delta > 0 else -_MAX_PLAUSIBLE_STAR_DELTA

        return delta

    # ── Feed item tracking ──

    def is_feed_item_known(self, item_id: str) -> bool:
        return item_id in self.data["feed_items"]

    def record_feed_item(self, item_id: str, title: str) -> None:
        self.data["feed_items"][item_id] = {
            "title": title,
            "seen_at": datetime.now(timezone.utc).isoformat(),
        }

    # ── Metadata ──

    @property
    def last_scan(self) -> str | None:
        return self.data.get("last_scan")

    @property
    def scan_count(self) -> int:
        return self.data.get("scan_count", 0)
