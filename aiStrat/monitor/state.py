"""Persistent state for the monitor — tracks what we've already seen.

State is stored as a JSON file committed to the repo, so it survives
across GitHub Actions runs and local invocations alike.

Tracked state:
  - Last scan timestamp
  - Known releases per repo (tag → publish date)
  - Known repos from discovery (full_name → star count at last scan)
  - Processed feed items (url hash → title)
"""

from __future__ import annotations

import json
import os
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

DEFAULT_STATE = {
    "last_scan": None,
    "releases": {},      # repo → { tag: published_at }
    "repos": {},         # full_name → { stars: N, first_seen: iso_date }
    "feed_items": {},    # url_hash → { title: str, seen_at: iso_date }
    "scan_count": 0,
}


class MonitorState:
    """Read/write persistent monitor state."""

    def __init__(self, state_file: str):
        self.state_file = state_file
        self.data = self._load()

    def _load(self) -> dict:
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file) as f:
                    data = json.load(f)
                    # Merge with defaults for forward-compatibility
                    return {**DEFAULT_STATE, **data}
            except (json.JSONDecodeError, OSError) as e:
                logger.warning("Failed to load state from %s: %s", self.state_file, e)
        return dict(DEFAULT_STATE)

    def save(self) -> None:
        """Write state to disk."""
        self.data["last_scan"] = datetime.now(timezone.utc).isoformat()
        self.data["scan_count"] = self.data.get("scan_count", 0) + 1
        os.makedirs(os.path.dirname(self.state_file) or ".", exist_ok=True)
        with open(self.state_file, "w") as f:
            json.dump(self.data, f, indent=2, default=str)

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
        """Return change in stars since last scan."""
        prev = self.get_repo_stars(full_name)
        return current_stars - prev if prev else 0

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
