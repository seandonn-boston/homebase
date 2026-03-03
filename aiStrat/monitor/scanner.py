"""Main scanner orchestrator — runs all sources and produces findings.

Usage:
    python -m aiStrat.monitor.scanner              # Full scan
    python -m aiStrat.monitor.scanner --releases    # Releases only
    python -m aiStrat.monitor.scanner --discover    # Discovery only
    python -m aiStrat.monitor.scanner --dry-run     # Preview without saving state
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timezone, timedelta
from typing import Optional

from .config import WATCHED_REPOS, SEARCH_QUERIES, SETTINGS
from .state import MonitorState
from .sources.github_releases import fetch_releases, fetch_repo_info
from .sources.github_trending import search_repos, discover_recent

logger = logging.getLogger(__name__)


class Finding:
    """A single discovery from the monitor."""

    def __init__(self, kind: str, title: str, body: str,
                 url: str = "", tags: list[str] | None = None,
                 priority: str = "normal", data: dict | None = None):
        self.kind = kind          # "release", "new_repo", "star_surge", "trending"
        self.title = title
        self.body = body
        self.url = url
        self.tags = tags or []
        self.priority = priority  # "high", "normal", "low"
        self.data = data or {}
        self.timestamp = datetime.now(timezone.utc).isoformat()


class ScanResult:
    """Aggregated results from a full scan."""

    def __init__(self):
        self.findings: list[Finding] = []
        self.errors: list[str] = []
        self.repos_checked: int = 0
        self.queries_run: int = 0

    @property
    def has_findings(self) -> bool:
        return len(self.findings) > 0

    @property
    def high_priority(self) -> list[Finding]:
        return [f for f in self.findings if f.priority == "high"]

    def add(self, finding: Finding) -> None:
        self.findings.append(finding)

    def add_error(self, msg: str) -> None:
        self.errors.append(msg)
        logger.warning(msg)


def scan(state: MonitorState, releases: bool = True, discover: bool = True,
         dry_run: bool = False) -> ScanResult:
    """Run a full monitoring scan.

    Args:
        state: Persistent state tracker
        releases: Whether to check for new releases
        discover: Whether to run discovery searches
        dry_run: If True, don't update state

    Returns:
        ScanResult with all findings
    """
    result = ScanResult()
    lookback = timedelta(days=SETTINGS["lookback_days"])
    since = datetime.now(timezone.utc) - lookback

    if releases:
        _scan_releases(state, result, since)

    if discover:
        _scan_discovery(state, result)

    if not dry_run:
        state.save()

    return result


def _scan_releases(state: MonitorState, result: ScanResult, since: datetime) -> None:
    """Check watched repos for new releases."""
    for entry in WATCHED_REPOS:
        repo = entry["repo"]
        if "releases" not in entry.get("track", []):
            continue

        result.repos_checked += 1
        try:
            releases = fetch_releases(repo, since=since)
        except Exception as e:
            result.add_error(f"Failed to fetch releases for {repo}: {e}")
            continue

        for rel in releases:
            tag = rel["tag"]
            if state.is_release_known(repo, tag):
                continue

            # New release found
            is_major = _is_major_release(tag)
            priority = "high" if is_major else "normal"
            prerelease_label = " [PRE-RELEASE]" if rel["prerelease"] else ""

            finding = Finding(
                kind="release",
                title=f"New release: {repo} {tag}{prerelease_label}",
                body=_summarize_release_body(rel["body"]),
                url=rel["url"],
                tags=entry.get("tags", []) + ["release"],
                priority=priority,
                data={"repo": repo, "tag": tag, "published_at": rel["published_at"],
                      "prerelease": rel["prerelease"]},
            )
            result.add(finding)
            state.record_release(repo, tag, rel["published_at"])
            logger.info("New release: %s %s", repo, tag)

    # Also check star counts for watched repos with "stars" tracking
    for entry in WATCHED_REPOS:
        repo = entry["repo"]
        if "stars" not in entry.get("track", []):
            continue

        try:
            info = fetch_repo_info(repo)
        except Exception as e:
            result.add_error(f"Failed to fetch info for {repo}: {e}")
            continue

        if info:
            current_stars = info.get("stargazers_count", 0)
            delta = state.get_star_delta(repo, current_stars)
            threshold = SETTINGS["star_velocity_threshold"]

            if delta >= threshold:
                finding = Finding(
                    kind="star_surge",
                    title=f"Star surge: {repo} gained {delta:,} stars",
                    body=f"{repo} went from {current_stars - delta:,} to {current_stars:,} stars since last scan.",
                    url=info.get("html_url", ""),
                    tags=entry.get("tags", []) + ["star-surge"],
                    priority="high",
                    data={"repo": repo, "stars": current_stars, "delta": delta},
                )
                result.add(finding)

            state.record_repo(repo, current_stars)


def _scan_discovery(state: MonitorState, result: ScanResult) -> None:
    """Run search queries to discover new or trending repos."""
    for query_cfg in SEARCH_QUERIES:
        result.queries_run += 1
        try:
            repos = search_repos(
                query=query_cfg["query"],
                sort=query_cfg.get("sort", "stars"),
                per_page=SETTINGS["search_results_per_query"],
                min_stars=query_cfg.get("min_stars", SETTINGS["discovery_min_stars"]),
            )
        except Exception as e:
            result.add_error(f"Search failed for '{query_cfg['query']}': {e}")
            continue

        for repo in repos:
            full_name = repo["full_name"]
            if not full_name:
                continue

            stars = repo.get("stars", 0)

            if not state.is_repo_known(full_name):
                # Brand new discovery
                finding = Finding(
                    kind="new_repo",
                    title=f"New discovery: {full_name} ({stars:,} stars)",
                    body=repo.get("description", "No description"),
                    url=repo.get("url", ""),
                    tags=query_cfg.get("tags", []) + ["discovery"],
                    priority="normal",
                    data={"full_name": full_name, "stars": stars,
                          "language": repo.get("language", ""),
                          "query": query_cfg["query"]},
                )
                result.add(finding)
                logger.info("New repo discovered: %s (%d stars)", full_name, stars)
            else:
                # Check for star surge on known discovery repos too
                delta = state.get_star_delta(full_name, stars)
                if delta >= SETTINGS["star_velocity_threshold"]:
                    finding = Finding(
                        kind="star_surge",
                        title=f"Star surge: {full_name} gained {delta:,} stars",
                        body=repo.get("description", ""),
                        url=repo.get("url", ""),
                        tags=query_cfg.get("tags", []) + ["star-surge"],
                        priority="high",
                        data={"full_name": full_name, "stars": stars, "delta": delta},
                    )
                    result.add(finding)

            state.record_repo(full_name, stars)

    # Also run a broad "recently created" discovery
    try:
        recent = discover_recent(
            days=SETTINGS["lookback_days"],
            min_stars=SETTINGS["discovery_min_stars"],
        )
        for repo in recent:
            full_name = repo["full_name"]
            if not full_name or state.is_repo_known(full_name):
                continue

            stars = repo.get("stars", 0)
            finding = Finding(
                kind="new_repo",
                title=f"Recently created: {full_name} ({stars:,} stars)",
                body=repo.get("description", "No description"),
                url=repo.get("url", ""),
                tags=["recent", "discovery"],
                priority="normal" if stars < 1000 else "high",
                data={"full_name": full_name, "stars": stars,
                      "language": repo.get("language", ""),
                      "created_at": repo.get("created_at", "")},
            )
            result.add(finding)
            state.record_repo(full_name, stars)
    except Exception as e:
        result.add_error(f"Recent discovery failed: {e}")


def _is_major_release(tag: str) -> bool:
    """Heuristic: is this a major (non-patch) release?"""
    tag = tag.lstrip("v")
    parts = tag.split(".")
    if len(parts) >= 2:
        try:
            # x.0.0 or x.y.0 where y is even → major/minor
            minor = int(parts[1])
            patch = int(parts[2]) if len(parts) > 2 else 0
            return minor == 0 or patch == 0
        except (ValueError, IndexError):
            pass
    # Non-semver tags: flag as potentially major
    return True


def _summarize_release_body(body: str, max_len: int = 500) -> str:
    """Truncate release notes to a reasonable summary."""
    if not body:
        return "No release notes provided."
    body = body.strip()
    if len(body) <= max_len:
        return body
    return body[:max_len].rsplit(" ", 1)[0] + "..."


# ── CLI entry point ──

def main() -> None:
    parser = argparse.ArgumentParser(description="AI Landscape Monitor")
    parser.add_argument("--releases", action="store_true", help="Only check releases")
    parser.add_argument("--discover", action="store_true", help="Only run discovery")
    parser.add_argument("--dry-run", action="store_true", help="Don't save state")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    # Determine root directory
    root = _find_repo_root()
    state_path = os.path.join(root, SETTINGS["state_file"])
    state = MonitorState(state_path)

    # If neither flag set, run both
    do_releases = args.releases or (not args.releases and not args.discover)
    do_discover = args.discover or (not args.releases and not args.discover)

    print(f"AI Landscape Monitor — scan #{state.scan_count + 1}")
    if state.last_scan:
        print(f"  Last scan: {state.last_scan}")
    print()

    result = scan(state, releases=do_releases, discover=do_discover, dry_run=args.dry_run)

    # Print summary
    print(f"Scan complete: {len(result.findings)} findings, {len(result.errors)} errors")
    print(f"  Repos checked: {result.repos_checked}")
    print(f"  Queries run: {result.queries_run}")

    if result.high_priority:
        print(f"\n{'='*60}")
        print(f"  HIGH PRIORITY ({len(result.high_priority)})")
        print(f"{'='*60}")
        for f in result.high_priority:
            print(f"  [{f.kind}] {f.title}")
            if f.url:
                print(f"    {f.url}")

    if result.findings:
        print(f"\nAll findings:")
        for f in result.findings:
            marker = "!!" if f.priority == "high" else "  "
            print(f"  {marker} [{f.kind}] {f.title}")

    if result.errors:
        print(f"\nErrors:")
        for e in result.errors:
            print(f"  - {e}")

    # Generate digest
    from .digest import write_digest
    digest_dir = os.path.join(root, SETTINGS["digest_dir"])
    digest_path = write_digest(result, digest_dir)
    if digest_path:
        print(f"\nDigest written to: {digest_path}")

    # Generate seed candidates
    from .seed_writer import write_seed_candidates
    seed_path = write_seed_candidates(result, digest_dir)
    if seed_path:
        print(f"Seed candidates written to: {seed_path}")

    if args.dry_run:
        print("\n(dry run — state not saved)")


def _find_repo_root() -> str:
    """Walk up from this file to find the repo root."""
    path = os.path.dirname(os.path.abspath(__file__))
    for _ in range(10):
        if os.path.isdir(os.path.join(path, ".git")):
            return path
        parent = os.path.dirname(path)
        if parent == path:
            break
        path = parent
    # Fallback
    return os.getcwd()


if __name__ == "__main__":
    main()
