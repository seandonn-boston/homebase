"""Main scanner orchestrator — runs all sources and produces findings.

Two scanning missions:
1. MODEL RELEASES — Detect new LLM model releases and fetch official content
2. BEST PRACTICES — Find state-of-the-art SDLC practices using LLMs

Usage:
    python -m aiStrat.monitor.scanner              # Full scan (both missions)
    python -m aiStrat.monitor.scanner --models      # Model releases only
    python -m aiStrat.monitor.scanner --practices   # SDLC practices only
    python -m aiStrat.monitor.scanner --releases    # Legacy: repo releases only
    python -m aiStrat.monitor.scanner --discover    # Legacy: discovery only
    python -m aiStrat.monitor.scanner --dry-run     # Preview without saving state
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from datetime import datetime, timezone, timedelta
from typing import Optional

from .config import (
    WATCHED_REPOS, MODEL_PROVIDERS, SDLC_EXEMPLARS,
    SEARCH_QUERIES, QUALITY_SIGNALS, SETTINGS,
)
from .state import MonitorState
from .sources.github_releases import fetch_releases, fetch_repo_info
from .sources.github_trending import search_repos, discover_recent
from .sources.web_content import fetch_page_text, extract_urls_from_release, content_hash

logger = logging.getLogger(__name__)


class Finding:
    """A single discovery from the monitor."""

    def __init__(self, kind: str, title: str, body: str,
                 url: str = "", tags: list[str] | None = None,
                 priority: str = "normal", data: dict | None = None):
        self.kind = kind          # "model_release", "release", "new_repo", "star_surge",
                                  # "best_practice", "practice_update"
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
         models: bool = False, practices: bool = False,
         dry_run: bool = False) -> ScanResult:
    """Run a monitoring scan.

    Args:
        state: Persistent state tracker
        releases: Whether to check for new releases (all watched repos)
        discover: Whether to run discovery searches
        models: If True, run model release mission (releases + content fetch)
        practices: If True, run SDLC best practices mission
        dry_run: If True, don't update state

    Returns:
        ScanResult with all findings
    """
    result = ScanResult()
    lookback = timedelta(days=SETTINGS["lookback_days"])
    since = datetime.now(timezone.utc) - lookback

    # New focused missions
    if models:
        _scan_model_releases(state, result, since)
    if practices:
        _scan_best_practices(state, result)

    # Legacy scan paths (still work for backward compat)
    if not models and not practices:
        if releases:
            _scan_releases(state, result, since)
        if discover:
            _scan_discovery(state, result)

    if not dry_run:
        state.save()

    return result


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MISSION 1: MODEL RELEASE TRACKING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _scan_model_releases(state: MonitorState, result: ScanResult,
                         since: datetime) -> None:
    """Check model provider repos for new releases and fetch official content.

    When a new release is found:
    1. Record the release finding
    2. Extract URLs from release notes pointing to official docs/blogs
    3. Fetch content from those URLs + configured content_urls
    4. Create enriched findings with the full official content
    """
    for entry in MODEL_PROVIDERS:
        repo = entry["repo"]
        if "releases" not in entry.get("track", []):
            continue

        result.repos_checked += 1
        try:
            rels = fetch_releases(repo, since=since)
        except Exception as e:
            result.add_error(f"Failed to fetch releases for {repo}: {e}")
            continue

        for rel in rels:
            tag = rel["tag"]
            if state.is_release_known(repo, tag):
                continue

            # New model release found — always high priority
            logger.info("MODEL RELEASE: %s %s", repo, tag)

            finding = Finding(
                kind="model_release",
                title=f"Model release: {repo} {tag}",
                body=_summarize_release_body(rel["body"]),
                url=rel["url"],
                tags=entry.get("tags", []) + ["model-release"],
                priority="high",
                data={
                    "repo": repo, "tag": tag,
                    "published_at": rel["published_at"],
                    "prerelease": rel["prerelease"],
                    "full_release_body": rel["body"],
                },
            )
            result.add(finding)
            state.record_release(repo, tag, rel["published_at"])

            # Fetch official content from URLs in release notes
            body_urls = extract_urls_from_release(rel["body"])
            content_urls = entry.get("content_urls", [])
            all_urls = list(dict.fromkeys(body_urls + content_urls))  # Dedupe, preserve order

            for url in all_urls[:5]:  # Cap at 5 URLs per release
                _fetch_and_record_content(
                    state, result, url,
                    parent_repo=repo, parent_tag=tag,
                    tags=entry.get("tags", []) + ["official-content"],
                )


def _fetch_and_record_content(state: MonitorState, result: ScanResult,
                              url: str, parent_repo: str, parent_tag: str,
                              tags: list[str]) -> None:
    """Fetch a URL and create a finding with the extracted content."""
    url_id = content_hash(url)
    if state.is_feed_item_known(url_id):
        return

    logger.info("Fetching official content: %s", url)
    text = fetch_page_text(url)
    if not text:
        return

    # Truncate for the finding body but store full text in data
    summary = text[:500] + "..." if len(text) > 500 else text

    finding = Finding(
        kind="model_release",
        title=f"Official content for {parent_repo} {parent_tag}: {url}",
        body=summary,
        url=url,
        tags=tags,
        priority="high",
        data={
            "repo": parent_repo, "tag": parent_tag,
            "content_url": url,
            "full_content": text,
            "content_type": "official_docs",
        },
    )
    result.add(finding)
    state.record_feed_item(url_id, f"{parent_repo} {parent_tag}: {url}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MISSION 2: SDLC BEST PRACTICES SCANNING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _scan_best_practices(state: MonitorState, result: ScanResult) -> None:
    """Search for state-of-the-art SDLC practices using LLMs.

    Runs targeted queries focused on:
    - How repos configure Claude Code and Copilot agents
    - Prompt patterns and instruction design for dev tools
    - Working examples of LLM-assisted SDLC workflows

    Quality filtering: Only surfaces repos that pass quality signals
    (star count, practice indicators, SDLC keyword relevance).
    """
    # 1. Check SDLC exemplar repos for updates
    _scan_exemplar_updates(state, result)

    # 2. Run search queries for new best-practice repos
    _scan_practice_queries(state, result)

    # 3. Discover recently created SDLC-focused repos
    _scan_recent_sdlc_repos(state, result)


def _scan_exemplar_updates(state: MonitorState, result: ScanResult) -> None:
    """Check known best-in-class repos for new releases and star surges."""
    for entry in SDLC_EXEMPLARS:
        repo = entry["repo"]

        # Check releases
        if "releases" in entry.get("track", []):
            result.repos_checked += 1
            try:
                rels = fetch_releases(repo, since=datetime.now(timezone.utc) - timedelta(days=7))
            except Exception as e:
                result.add_error(f"Failed to fetch releases for {repo}: {e}")
                continue

            for rel in rels:
                tag = rel["tag"]
                if state.is_release_known(repo, tag):
                    continue

                is_major = _is_major_release(tag)
                finding = Finding(
                    kind="practice_update",
                    title=f"Exemplar update: {repo} {tag}",
                    body=_summarize_release_body(rel["body"]),
                    url=rel["url"],
                    tags=entry.get("tags", []) + ["practice-update"],
                    priority="high" if is_major else "normal",
                    data={
                        "repo": repo, "tag": tag,
                        "published_at": rel["published_at"],
                        "prerelease": rel["prerelease"],
                        "full_release_body": rel["body"],
                    },
                )
                result.add(finding)
                state.record_release(repo, tag, rel["published_at"])
                logger.info("Exemplar update: %s %s", repo, tag)

        # Check star surges
        if "stars" in entry.get("track", []):
            try:
                info = fetch_repo_info(repo)
            except Exception as e:
                result.add_error(f"Failed to fetch info for {repo}: {e}")
                continue

            if info:
                current_stars = info.get("stargazers_count", 0)
                delta = state.get_star_delta(repo, current_stars)
                threshold = QUALITY_SIGNALS["star_velocity_threshold"]

                if delta >= threshold:
                    finding = Finding(
                        kind="star_surge",
                        title=f"Star surge: {repo} gained {delta:,} stars",
                        body=f"{repo} went from {current_stars - delta:,} to {current_stars:,} stars since last scan.",
                        url=info.get("html_url", ""),
                        tags=entry.get("tags", []) + ["star-surge", "validation"],
                        priority="high",
                        data={"repo": repo, "stars": current_stars, "delta": delta},
                    )
                    result.add(finding)

                state.record_repo(repo, current_stars)


def _scan_practice_queries(state: MonitorState, result: ScanResult) -> None:
    """Run focused search queries for SDLC best practices."""
    for query_cfg in SEARCH_QUERIES:
        result.queries_run += 1
        try:
            repos = search_repos(
                query=query_cfg["query"],
                sort=query_cfg.get("sort", "stars"),
                per_page=SETTINGS["search_results_per_query"],
                min_stars=query_cfg.get("min_stars", QUALITY_SIGNALS["min_stars"]),
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
                # New discovery — assess quality
                quality = _assess_quality(repo)
                if quality == "skip":
                    state.record_repo(full_name, stars)
                    continue

                is_elite = stars >= QUALITY_SIGNALS["elite_star_threshold"]
                finding = Finding(
                    kind="best_practice",
                    title=f"SDLC practice: {full_name} ({stars:,} stars)",
                    body=repo.get("description", "No description"),
                    url=repo.get("url", ""),
                    tags=query_cfg.get("tags", []) + ["discovery"],
                    priority="high" if is_elite else "normal",
                    data={
                        "full_name": full_name, "stars": stars,
                        "language": repo.get("language", ""),
                        "query": query_cfg["query"],
                        "quality_tier": quality,
                    },
                )
                result.add(finding)
                logger.info("SDLC practice found: %s (%d stars, %s)", full_name, stars, quality)
            else:
                # Check for star surge on known repos
                delta = state.get_star_delta(full_name, stars)
                if delta >= QUALITY_SIGNALS["star_velocity_threshold"]:
                    finding = Finding(
                        kind="star_surge",
                        title=f"Star surge: {full_name} gained {delta:,} stars",
                        body=repo.get("description", ""),
                        url=repo.get("url", ""),
                        tags=query_cfg.get("tags", []) + ["star-surge", "validation"],
                        priority="high",
                        data={"full_name": full_name, "stars": stars, "delta": delta},
                    )
                    result.add(finding)

            state.record_repo(full_name, stars)


def _scan_recent_sdlc_repos(state: MonitorState, result: ScanResult) -> None:
    """Find recently created repos focused on LLM-assisted development."""
    sdlc_topics = [
        "ai-coding-agent", "llm-agents", "claude-code",
        "copilot", "agentic-ai", "mcp-server",
    ]
    try:
        recent = discover_recent(
            days=SETTINGS["lookback_days"],
            min_stars=QUALITY_SIGNALS["min_stars"],
            topics=sdlc_topics,
        )
        for repo in recent:
            full_name = repo["full_name"]
            if not full_name or state.is_repo_known(full_name):
                continue

            stars = repo.get("stars", 0)
            quality = _assess_quality(repo)
            if quality == "skip":
                state.record_repo(full_name, stars)
                continue

            finding = Finding(
                kind="best_practice",
                title=f"New SDLC repo: {full_name} ({stars:,} stars)",
                body=repo.get("description", "No description"),
                url=repo.get("url", ""),
                tags=["recent", "sdlc-practice", "discovery"],
                priority="high" if stars >= 1000 else "normal",
                data={
                    "full_name": full_name, "stars": stars,
                    "language": repo.get("language", ""),
                    "created_at": repo.get("created_at", ""),
                    "quality_tier": quality,
                },
            )
            result.add(finding)
            state.record_repo(full_name, stars)
    except Exception as e:
        result.add_error(f"Recent SDLC discovery failed: {e}")


def _assess_quality(repo: dict) -> str:
    """Assess whether a repo meets "best in class" quality bar.

    Returns: "elite", "high", "standard", or "skip"
    """
    stars = repo.get("stars", 0)
    description = (repo.get("description") or "").lower()

    # Elite tier — massive community validation
    if stars >= QUALITY_SIGNALS["elite_star_threshold"]:
        return "elite"

    # Check for SDLC keyword relevance in description
    sdlc_keywords = QUALITY_SIGNALS["sdlc_keywords"]
    keyword_hits = sum(1 for kw in sdlc_keywords if kw.lower() in description)

    if keyword_hits >= 2 and stars >= 1000:
        return "high"
    elif keyword_hits >= 1 and stars >= QUALITY_SIGNALS["min_stars"]:
        return "standard"

    # Not relevant enough
    return "skip"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LEGACY SCAN PATHS (kept for backward compat)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _is_major_release(tag: str) -> bool:
    """Heuristic: is this a major (non-patch) release?"""
    tag = tag.lstrip("v")
    parts = tag.split(".")
    if len(parts) >= 2:
        try:
            minor = int(parts[1])
            patch = int(parts[2]) if len(parts) > 2 else 0
            return minor == 0 or patch == 0
        except (ValueError, IndexError):
            pass
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
    parser.add_argument("--models", action="store_true",
                        help="Scan for new LLM model releases + fetch official content")
    parser.add_argument("--practices", action="store_true",
                        help="Scan for SDLC best practices using LLMs")
    parser.add_argument("--releases", action="store_true", help="Check releases (all repos)")
    parser.add_argument("--discover", action="store_true", help="Run discovery searches")
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

    # New mission flags
    do_models = args.models
    do_practices = args.practices

    # Legacy flags (if no new flags, use legacy for backward compat)
    do_releases = args.releases
    do_discover = args.discover

    # If nothing specified, run both new missions
    if not any([do_models, do_practices, do_releases, do_discover]):
        do_models = True
        do_practices = True

    print(f"AI Landscape Monitor — scan #{state.scan_count + 1}")
    if state.last_scan:
        print(f"  Last scan: {state.last_scan}")
    print(f"  Missions: ", end="")
    missions = []
    if do_models:
        missions.append("model-releases")
    if do_practices:
        missions.append("sdlc-practices")
    if do_releases:
        missions.append("releases")
    if do_discover:
        missions.append("discovery")
    print(", ".join(missions))
    print()

    result = scan(
        state,
        releases=do_releases,
        discover=do_discover,
        models=do_models,
        practices=do_practices,
        dry_run=args.dry_run,
    )

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
    return os.getcwd()


if __name__ == "__main__":
    main()
