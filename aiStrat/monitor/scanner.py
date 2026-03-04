"""Main scanner — feeds the Brain with intelligence the Admiral needs.

Two scanning missions, both serving fleet deployment:

1. MODEL INTELLIGENCE — What models exist, what changed, what can they do?
   Brain category: CONTEXT (snapshots of model capabilities at a point in time)

2. AGENT PATTERNS — How do the best tools configure agents, prompts,
   instructions, and tool use for software development?
   Brain category: PATTERN (reusable solutions) and LESSON (what works/doesn't)

Usage:
    python -m aiStrat.monitor.scanner              # Full scan (both missions)
    python -m aiStrat.monitor.scanner --models      # Model intelligence only
    python -m aiStrat.monitor.scanner --patterns    # Agent patterns only
    python -m aiStrat.monitor.scanner --dry-run     # Preview without saving state
"""

from __future__ import annotations

import argparse
import logging
import os
from datetime import datetime, timezone, timedelta
from typing import Optional

from .config import (
    WATCHED_REPOS, MODEL_PROVIDERS, AGENT_EXEMPLARS,
    SEARCH_QUERIES, QUALITY_SIGNALS, SETTINGS, RSS_FEEDS,
)
from .state import MonitorState
from .sources.github_releases import fetch_releases, fetch_repo_info
from .sources.github_trending import search_repos, discover_recent
from .sources.web_content import fetch_page_text, extract_urls_from_release, content_hash
from .sources.rss_feeds import fetch_feed, entry_id
from .sources.repo_content import fetch_agent_configs

logger = logging.getLogger(__name__)


class Finding:
    """A single discovery from the monitor.

    Each finding maps to a Brain entry category:
      model_release     → CONTEXT  (what models can do right now)
      model_docs        → CONTEXT  (official docs/blog content for a release)
      agent_pattern     → PATTERN  (how a tool configures its agents)
      exemplar_update   → PATTERN  (change to a tracked exemplar's approach)
      practice_found    → PATTERN  (new repo with fleet-relevant patterns)
      star_surge        → PATTERN  (community validates an approach)
      release           → CONTEXT  (general release — backward compat)
      new_repo          → CONTEXT  (general discovery — backward compat)
    """

    def __init__(self, kind: str, title: str, body: str,
                 url: str = "", tags: list[str] | None = None,
                 priority: str = "normal", data: dict | None = None):
        self.kind = kind
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


def scan(state: MonitorState, models: bool = False, patterns: bool = False,
         releases: bool = False, discover: bool = False,
         dry_run: bool = False) -> ScanResult:
    """Run a monitoring scan.

    Args:
        state: Persistent state tracker
        models: Run model intelligence mission
        patterns: Run agent patterns mission
        releases: Legacy: check all watched repos for releases
        discover: Legacy: run discovery searches
        dry_run: If True, don't update state
    """
    result = ScanResult()
    lookback = timedelta(days=SETTINGS["lookback_days"])
    since = datetime.now(timezone.utc) - lookback

    if models:
        _scan_model_intelligence(state, result, since)
    if patterns:
        _scan_agent_patterns(state, result, since)

    # Legacy paths
    if not models and not patterns:
        if releases:
            _scan_releases(state, result, since)
        if discover:
            _scan_discovery(state, result)

    if not dry_run:
        state.save()

    return result


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MISSION 1: MODEL INTELLIGENCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Admiral question: "What models exist and what tier should each role use?"
# Brain category: CONTEXT

def _scan_model_intelligence(state: MonitorState, result: ScanResult,
                             since: datetime) -> None:
    """Detect new model releases and capture official documentation.

    When a provider ships a new SDK/model release:
    1. Record the release itself (capabilities, API changes)
    2. Fetch official docs/blog content for full understanding
    3. Everything is high-priority — model changes affect fleet-wide
       tier assignment decisions.
    """
    for provider in MODEL_PROVIDERS:
        repo = provider["repo"]
        if "releases" not in provider.get("track", []):
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

            logger.info("MODEL RELEASE: %s %s", repo, tag)

            # The release itself — Brain CONTEXT entry
            finding = Finding(
                kind="model_release",
                title=f"{repo} {tag}",
                body=_summarize_release_body(rel["body"]),
                url=rel["url"],
                tags=provider.get("tags", []),
                priority="high",
                data={
                    "repo": repo, "tag": tag,
                    "published_at": rel["published_at"],
                    "prerelease": rel["prerelease"],
                    "full_release_body": rel["body"],
                    "admiral_question": provider.get("admiral_question", ""),
                },
            )
            result.add(finding)
            state.record_release(repo, tag, rel["published_at"])

            # Fetch official content — docs, blog posts
            body_urls = extract_urls_from_release(rel["body"])
            configured_urls = provider.get("content_urls", [])
            all_urls = list(dict.fromkeys(body_urls + configured_urls))

            for url in all_urls[:5]:
                _fetch_and_record_content(
                    state, result, url,
                    parent_repo=repo, parent_tag=tag,
                    tags=provider.get("tags", []) + ["official-docs"],
                    admiral_question=provider.get("admiral_question", ""),
                )

    # RSS feeds — official blog announcements about models and agents
    _scan_rss_feeds(state, result, since)


def _scan_rss_feeds(state: MonitorState, result: ScanResult,
                    since: datetime) -> None:
    """Scan RSS feeds for official announcements about models and agents.

    When Anthropic posts about Claude 4.6, or OpenAI announces Codex updates,
    or GitHub blogs about Copilot agent mode — the Brain needs that content.
    """
    for feed_cfg in RSS_FEEDS:
        url = feed_cfg["url"]
        name = feed_cfg.get("name", url)
        keywords = feed_cfg.get("keywords", [])
        tags = feed_cfg.get("tags", [])

        try:
            entries = fetch_feed(url, keywords=keywords, since=since)
        except Exception as e:
            result.add_error(f"Failed to fetch RSS feed {name}: {e}")
            continue

        for entry in entries:
            eid = entry_id(entry["url"], entry["title"])
            if state.is_feed_item_known(eid):
                continue

            logger.info("RSS: %s — %s", name, entry["title"])

            # Fetch full content if the entry has a URL
            full_content = ""
            if entry["url"]:
                full_content = fetch_page_text(entry["url"]) or ""

            finding = Finding(
                kind="model_docs",
                title=f"{name}: {entry['title']}",
                body=entry.get("summary", "")[:500],
                url=entry["url"],
                tags=tags + ["rss", "official-announcement"],
                priority="high",
                data={
                    "repo": name,
                    "tag": "",
                    "content_url": entry["url"],
                    "full_content": full_content or entry.get("summary", ""),
                    "published": entry.get("published", ""),
                    "matched_keywords": entry.get("matched_keywords", []),
                    "admiral_question": (
                        f"What did {name} announce that affects fleet configuration?"
                    ),
                },
            )
            result.add(finding)
            state.record_feed_item(eid, entry["title"])


def _fetch_and_record_content(state: MonitorState, result: ScanResult,
                              url: str, parent_repo: str, parent_tag: str,
                              tags: list[str], admiral_question: str = "") -> None:
    """Fetch a URL and create a Brain CONTEXT finding."""
    url_id = content_hash(url)
    if state.is_feed_item_known(url_id):
        return

    logger.info("Fetching official content: %s", url)
    text = fetch_page_text(url)
    if not text:
        return

    summary = text[:500] + "..." if len(text) > 500 else text

    finding = Finding(
        kind="model_docs",
        title=f"Official docs: {parent_repo} {parent_tag}",
        body=summary,
        url=url,
        tags=tags,
        priority="high",
        data={
            "repo": parent_repo, "tag": parent_tag,
            "content_url": url,
            "full_content": text,
            "admiral_question": admiral_question,
        },
    )
    result.add(finding)
    state.record_feed_item(url_id, f"{parent_repo} {parent_tag}: {url}")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MISSION 2: AGENT PATTERNS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Admiral question: "How should I configure this agent's prompt,
# instructions, tools, and boundaries?"
# Brain category: PATTERN

def _scan_agent_patterns(state: MonitorState, result: ScanResult,
                         since: datetime) -> None:
    """Find and track agent design patterns relevant to fleet configuration.

    Four sources:
    1. Exemplar updates — tracked repos that define state-of-the-art
    2. Exemplar content — actual config files (CLAUDE.md, .cursorrules, etc.)
    3. Search queries — find new repos with fleet-relevant patterns
    4. Recent discoveries — newly created repos gaining traction
    """
    _scan_exemplar_updates(state, result, since)
    _scan_exemplar_content(state, result)
    _scan_pattern_queries(state, result)
    _scan_recent_agent_repos(state, result)


def _scan_exemplar_updates(state: MonitorState, result: ScanResult,
                           since: datetime) -> None:
    """Check tracked exemplar repos for new releases.

    When Claude Code, Aider, Cline, etc. ship updates, we need to know
    what changed in their agent design — new prompt patterns, tool
    definitions, orchestration approaches.
    """
    for exemplar in AGENT_EXEMPLARS:
        repo = exemplar["repo"]

        if "releases" in exemplar.get("track", []):
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

                is_major = _is_major_release(tag)
                watch_for = exemplar.get("watch_for", [])

                finding = Finding(
                    kind="exemplar_update",
                    title=f"{repo} {tag}",
                    body=_summarize_release_body(rel["body"]),
                    url=rel["url"],
                    tags=exemplar.get("tags", []),
                    priority="high" if is_major else "normal",
                    data={
                        "repo": repo, "tag": tag,
                        "published_at": rel["published_at"],
                        "prerelease": rel["prerelease"],
                        "full_release_body": rel["body"],
                        "watch_for": watch_for,
                    },
                )
                result.add(finding)
                state.record_release(repo, tag, rel["published_at"])
                logger.info("Exemplar update: %s %s", repo, tag)

        # Star surges on exemplars = community validates their approach
        if "stars" in exemplar.get("track", []):
            try:
                info = fetch_repo_info(repo)
            except Exception as e:
                result.add_error(f"Failed to fetch info for {repo}: {e}")
                continue

            if info:
                current_stars = info.get("stargazers_count", 0)
                delta = state.get_star_delta(repo, current_stars)

                if delta >= QUALITY_SIGNALS["star_velocity_threshold"]:
                    finding = Finding(
                        kind="star_surge",
                        title=f"{repo} gained {delta:,} stars",
                        body=(
                            f"{repo} went from {current_stars - delta:,} to "
                            f"{current_stars:,} stars. Community is rapidly adopting "
                            f"this approach — review for patterns the fleet should learn."
                        ),
                        url=info.get("html_url", ""),
                        tags=exemplar.get("tags", []) + ["validation"],
                        priority="high",
                        data={"repo": repo, "stars": current_stars, "delta": delta},
                    )
                    result.add(finding)

                state.record_repo(repo, current_stars)


def _scan_exemplar_content(state: MonitorState, result: ScanResult) -> None:
    """Fetch actual agent config files from exemplar repos.

    This is where the real patterns live. When a repo has a CLAUDE.md,
    .cursorrules, or copilot-instructions.md, we fetch its content so
    the Brain has the actual instruction patterns — not just "this repo
    exists" but "here's exactly how they configure their agents."

    Only fetches on the first scan or when new releases are detected
    (content might have changed with a release).
    """
    for exemplar in AGENT_EXEMPLARS:
        repo = exemplar["repo"]
        # Check if we've already fetched content for this repo
        content_key = f"content:{repo}"
        if state.is_feed_item_known(content_key):
            # Re-fetch if there was a new release this scan
            if not any(
                f.kind == "exemplar_update" and f.data.get("repo") == repo
                for f in result.findings
            ):
                continue

        try:
            configs = fetch_agent_configs(repo)
        except Exception as e:
            result.add_error(f"Failed to fetch agent configs from {repo}: {e}")
            continue

        for cfg in configs:
            finding = Finding(
                kind="practice_found",
                title=f"Agent config: {repo}/{cfg['path']}",
                body=(
                    f"Extracted {cfg['config_type']} from {repo}. "
                    f"File: {cfg['path']}. "
                    f"This is an actual production agent configuration "
                    f"from a state-of-the-art tool."
                ),
                url=f"https://github.com/{repo}/blob/HEAD/{cfg['path']}",
                tags=exemplar.get("tags", []) + ["extracted-config", cfg["config_type"]],
                priority="high",
                data={
                    "full_name": repo,
                    "stars": 0,
                    "language": "markdown",
                    "relevance": "exemplar",
                    "config_type": cfg["config_type"],
                    "config_path": cfg["path"],
                    "full_content": cfg["content"],
                    "admiral_need": (
                        f"How does {repo} configure its agents? "
                        f"What patterns from {cfg['path']} should the fleet adopt?"
                    ),
                },
            )
            result.add(finding)
            logger.info("Extracted agent config: %s/%s", repo, cfg["path"])

        if configs:
            state.record_feed_item(content_key, f"Agent configs from {repo}")


def _scan_pattern_queries(state: MonitorState, result: ScanResult) -> None:
    """Run targeted search queries for fleet-relevant patterns.

    Each query is tied to an Admiral question. Only surface repos that
    would actually inform fleet configuration decisions.
    """
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
                relevance = _assess_fleet_relevance(repo)
                if relevance == "irrelevant":
                    state.record_repo(full_name, stars)
                    continue

                finding = Finding(
                    kind="practice_found",
                    title=f"{full_name} ({stars:,} stars)",
                    body=repo.get("description", "No description"),
                    url=repo.get("url", ""),
                    tags=query_cfg.get("tags", []),
                    priority="high" if relevance == "exemplar" else "normal",
                    data={
                        "full_name": full_name, "stars": stars,
                        "language": repo.get("language", ""),
                        "query": query_cfg["query"],
                        "relevance": relevance,
                        "admiral_need": query_cfg.get("admiral_need", ""),
                    },
                )
                result.add(finding)
                logger.info("Pattern found: %s (%d stars, %s)",
                            full_name, stars, relevance)

                # For exemplar-quality repos, extract actual agent configs
                if relevance == "exemplar":
                    _extract_discovered_configs(
                        state, result, full_name,
                        tags=query_cfg.get("tags", []),
                        admiral_need=query_cfg.get("admiral_need", ""),
                    )
            else:
                # Star surge on known repos = community validates the pattern
                delta = state.get_star_delta(full_name, stars)
                if delta >= QUALITY_SIGNALS["star_velocity_threshold"]:
                    finding = Finding(
                        kind="star_surge",
                        title=f"{full_name} gained {delta:,} stars",
                        body=repo.get("description", ""),
                        url=repo.get("url", ""),
                        tags=query_cfg.get("tags", []) + ["validation"],
                        priority="high",
                        data={"full_name": full_name, "stars": stars, "delta": delta},
                    )
                    result.add(finding)

            state.record_repo(full_name, stars)


def _scan_recent_agent_repos(state: MonitorState, result: ScanResult) -> None:
    """Find recently created repos in the agent/SDLC space."""
    agent_topics = [
        "ai-coding-agent", "llm-agents", "claude-code",
        "mcp-server", "agentic-ai", "copilot-agent",
        "ai-developer-tools", "code-generation",
    ]
    try:
        recent = discover_recent(
            days=SETTINGS["lookback_days"],
            min_stars=QUALITY_SIGNALS["min_stars"],
            topics=agent_topics,
        )
        for repo in recent:
            full_name = repo["full_name"]
            if not full_name or state.is_repo_known(full_name):
                continue

            stars = repo.get("stars", 0)
            relevance = _assess_fleet_relevance(repo)
            if relevance == "irrelevant":
                state.record_repo(full_name, stars)
                continue

            finding = Finding(
                kind="practice_found",
                title=f"New: {full_name} ({stars:,} stars)",
                body=repo.get("description", "No description"),
                url=repo.get("url", ""),
                tags=["recent", "agent-pattern"],
                priority="high" if stars >= 1000 else "normal",
                data={
                    "full_name": full_name, "stars": stars,
                    "language": repo.get("language", ""),
                    "created_at": repo.get("created_at", ""),
                    "relevance": relevance,
                },
            )
            result.add(finding)
            state.record_repo(full_name, stars)
    except Exception as e:
        result.add_error(f"Recent agent repo discovery failed: {e}")


def _extract_discovered_configs(state: MonitorState, result: ScanResult,
                                full_name: str, tags: list[str],
                                admiral_need: str = "") -> None:
    """Extract agent configs from a newly discovered exemplar-quality repo."""
    content_key = f"content:{full_name}"
    if state.is_feed_item_known(content_key):
        return

    try:
        configs = fetch_agent_configs(full_name)
    except Exception as e:
        logger.debug("Failed to extract configs from %s: %s", full_name, e)
        return

    for cfg in configs:
        finding = Finding(
            kind="practice_found",
            title=f"Extracted config: {full_name}/{cfg['path']}",
            body=(
                f"Found {cfg['config_type']} in discovered exemplar {full_name}. "
                f"This is a real-world agent configuration worth studying."
            ),
            url=f"https://github.com/{full_name}/blob/HEAD/{cfg['path']}",
            tags=tags + ["extracted-config", cfg["config_type"]],
            priority="high",
            data={
                "full_name": full_name,
                "stars": 0,
                "language": "markdown",
                "relevance": "exemplar",
                "config_type": cfg["config_type"],
                "config_path": cfg["path"],
                "full_content": cfg["content"],
                "admiral_need": admiral_need or (
                    f"What agent patterns does {full_name} use in {cfg['path']}?"
                ),
            },
        )
        result.add(finding)

    if configs:
        state.record_feed_item(content_key, f"Configs from {full_name}")


def _assess_fleet_relevance(repo: dict) -> str:
    """Assess whether a repo has patterns the Admiral can use.

    Returns: "exemplar", "relevant", or "irrelevant"

    Not just "is this popular?" but "does this demonstrate agent design,
    prompt patterns, or SDLC workflows that would inform fleet config?"
    """
    stars = repo.get("stars", 0)
    description = (repo.get("description") or "").lower()

    keywords = QUALITY_SIGNALS["fleet_relevance_keywords"]
    hits = sum(1 for kw in keywords if kw.lower() in description)

    # Exemplar: high stars AND clearly about agent/SDLC patterns
    if stars >= QUALITY_SIGNALS["elite_star_threshold"] and hits >= 1:
        return "exemplar"

    # Relevant: meaningful signal that this is about agent design for dev
    if hits >= 2 and stars >= 1000:
        return "relevant"
    if hits >= 1 and stars >= QUALITY_SIGNALS["min_stars"]:
        return "relevant"

    return "irrelevant"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LEGACY SCAN PATHS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _scan_releases(state: MonitorState, result: ScanResult, since: datetime) -> None:
    """Check all watched repos for new releases."""
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
            prerelease_label = " [PRE-RELEASE]" if rel["prerelease"] else ""

            finding = Finding(
                kind="release",
                title=f"New release: {repo} {tag}{prerelease_label}",
                body=_summarize_release_body(rel["body"]),
                url=rel["url"],
                tags=entry.get("tags", []) + ["release"],
                priority="high" if is_major else "normal",
                data={"repo": repo, "tag": tag, "published_at": rel["published_at"],
                      "prerelease": rel["prerelease"]},
            )
            result.add(finding)
            state.record_release(repo, tag, rel["published_at"])

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
            if delta >= SETTINGS["star_velocity_threshold"]:
                finding = Finding(
                    kind="star_surge",
                    title=f"Star surge: {repo} gained {delta:,} stars",
                    body=f"{repo} went from {current_stars - delta:,} to {current_stars:,} stars.",
                    url=info.get("html_url", ""),
                    tags=entry.get("tags", []) + ["star-surge"],
                    priority="high",
                    data={"repo": repo, "stars": current_stars, "delta": delta},
                )
                result.add(finding)
            state.record_repo(repo, current_stars)


def _scan_discovery(state: MonitorState, result: ScanResult) -> None:
    """Run search queries to discover new repos."""
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


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# HELPERS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _is_major_release(tag: str) -> bool:
    """Heuristic: is this a major or minor (non-patch) release?

    x.0.0 = major release (e.g., 2.0.0)
    x.y.0 = minor release (e.g., 1.2.0)
    x.y.z where z > 0 = patch release (e.g., 1.2.3)
    """
    tag = tag.lstrip("v")
    parts = tag.split(".")
    if len(parts) >= 2:
        try:
            minor = int(parts[1])
            patch = int(parts[2]) if len(parts) > 2 else 0
            # Major: x.0.0, Minor: x.y.0 — both count as "major" for priority
            return minor == 0 and patch == 0
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
                        help="Scan for new model releases + fetch official docs")
    parser.add_argument("--patterns", action="store_true",
                        help="Scan for agent design patterns and SDLC practices")
    parser.add_argument("--releases", action="store_true", help="Legacy: check all releases")
    parser.add_argument("--discover", action="store_true", help="Legacy: run discovery")
    parser.add_argument("--dry-run", action="store_true", help="Don't save state")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose logging")
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    root = _find_repo_root()
    state_path = os.path.join(root, SETTINGS["state_file"])
    state = MonitorState(state_path)

    do_models = args.models
    do_patterns = args.patterns
    do_releases = args.releases
    do_discover = args.discover

    # Default: both missions
    if not any([do_models, do_patterns, do_releases, do_discover]):
        do_models = True
        do_patterns = True

    print(f"AI Landscape Monitor — scan #{state.scan_count + 1}")
    if state.last_scan:
        print(f"  Last scan: {state.last_scan}")
    missions = []
    if do_models:
        missions.append("model-intelligence")
    if do_patterns:
        missions.append("agent-patterns")
    if do_releases:
        missions.append("releases")
    if do_discover:
        missions.append("discovery")
    print(f"  Missions: {', '.join(missions)}")
    print()

    result = scan(
        state,
        models=do_models,
        patterns=do_patterns,
        releases=do_releases,
        discover=do_discover,
        dry_run=args.dry_run,
    )

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
