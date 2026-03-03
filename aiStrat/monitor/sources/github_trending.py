"""Discover trending and newly popular AI repositories on GitHub.

Uses GitHub's search API to find repos matching configured queries,
then compares against previous state to identify what's new or surging.

SECURITY: Search queries are validated to prevent shell metacharacter
injection. Repository data from API responses is treated as untrusted
and normalized through _normalize() before use.
"""

from __future__ import annotations

import json
import re
import subprocess
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# Search queries must not contain shell metacharacters
_UNSAFE_QUERY_CHARS = re.compile(r"[;|&`$(){}\\]")


def search_repos(query: str, sort: str = "stars", per_page: int = 30,
                 min_stars: int = 100) -> list[dict]:
    """Search GitHub for repositories matching a query.

    Args:
        query: GitHub search query string (supports qualifiers)
        sort: Sort field — "stars", "updated", "forks"
        per_page: Number of results to return
        min_stars: Minimum star count filter

    Returns:
        List of repo dicts with standardized keys.
    """
    if _UNSAFE_QUERY_CHARS.search(query):
        raise ValueError(f"Search query contains unsafe characters: {query!r}")
    if sort not in ("stars", "updated", "forks"):
        raise ValueError(f"Invalid sort field: {sort!r}")

    full_query = f"{query} stars:>={min_stars}"
    repos = _search_via_gh(full_query, sort, per_page)
    if repos is None:
        repos = _search_via_rest(full_query, sort, per_page)

    return [_normalize(r) for r in repos]


def discover_recent(days: int = 7, min_stars: int = 100,
                    topics: Optional[list[str]] = None) -> list[dict]:
    """Find repos created or significantly updated in the last N days.

    Args:
        days: Look back this many days
        min_stars: Minimum stars to surface
        topics: Optional list of topic filters

    Returns:
        List of normalized repo dicts, sorted by stars descending.
    """
    since = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%d")

    results = []
    topic_list = topics or ["ai-agents", "mcp-server", "llm-agents", "agentic-ai", "claude-code"]
    for topic in topic_list:
        query = f"topic:{topic} created:>={since} stars:>={min_stars}"
        found = _search_via_gh(query, "stars", 20)
        if found is None:
            found = _search_via_rest(query, "stars", 20)
        results.extend(found)

    # Also check for pushed-recently (actively developed)
    for topic in topic_list:
        query = f"topic:{topic} pushed:>={since} stars:>={min_stars}"
        found = _search_via_gh(query, "updated", 20)
        if found is None:
            found = _search_via_rest(query, "updated", 20)
        results.extend(found)

    # Deduplicate by full_name
    seen = set()
    unique = []
    for r in results:
        norm = _normalize(r)
        if norm["full_name"] not in seen:
            seen.add(norm["full_name"])
            unique.append(norm)

    return sorted(unique, key=lambda r: r["stars"], reverse=True)


def _search_via_gh(query: str, sort: str, per_page: int) -> Optional[list[dict]]:
    """Search using the GitHub CLI."""
    try:
        result = subprocess.run(
            ["gh", "search", "repos", query,
             "--sort", sort, "--limit", str(per_page), "--json",
             "fullName,description,stargazersCount,updatedAt,createdAt,url,language"],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            logger.debug("gh search failed: %s", result.stderr.strip())
            return None

        data = json.loads(result.stdout)
        return data if isinstance(data, list) else []
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        return None


def _search_via_rest(query: str, sort: str, per_page: int) -> list[dict]:
    """Search using the GitHub REST API (unauthenticated)."""
    import urllib.request
    import urllib.error
    import urllib.parse

    encoded = urllib.parse.quote(query)
    url = (f"https://api.github.com/search/repositories"
           f"?q={encoded}&sort={sort}&per_page={per_page}")
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "homebase-ai-monitor/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            return data.get("items", [])
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as e:
        logger.warning("REST search failed: %s", e)
        return []


def _normalize(repo: dict) -> dict:
    """Normalize GitHub API response to a consistent format."""
    return {
        "full_name": repo.get("fullName") or repo.get("full_name", ""),
        "description": repo.get("description") or "",
        "stars": repo.get("stargazersCount") or repo.get("stargazers_count", 0),
        "language": repo.get("language") or "",
        "url": repo.get("url") or repo.get("html_url", ""),
        "updated_at": repo.get("updatedAt") or repo.get("updated_at", ""),
        "created_at": repo.get("createdAt") or repo.get("created_at", ""),
    }
