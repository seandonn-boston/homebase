"""Track releases for watched repositories.

Uses the GitHub CLI (`gh`) for authenticated API access.
Falls back to unauthenticated REST if gh is unavailable.

SECURITY: All repository names are validated against a strict pattern
before being used in subprocess calls or URL construction.
"""

from __future__ import annotations

import json
import re
import subprocess
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# Strict pattern: owner/repo where both are alphanumeric + hyphens + dots + underscores
_REPO_PATTERN = re.compile(r"^[a-zA-Z0-9\-_.]+/[a-zA-Z0-9\-_.]+$")


def _validate_repo(repo: str) -> str:
    """Validate a repository name before use in commands or URLs.

    Raises ValueError if the name contains unexpected characters
    that could be used for injection.
    """
    if not _REPO_PATTERN.match(repo):
        raise ValueError(
            f"Invalid repository name: {repo!r}. "
            f"Must match 'owner/name' with only alphanumeric, hyphens, dots, underscores."
        )
    return repo


def fetch_releases(repo: str, since: Optional[datetime] = None, limit: int = 10) -> list[dict]:
    """Fetch recent releases for a repository.

    Args:
        repo: "owner/name" format (validated before use)
        since: Only return releases published after this datetime
        limit: Max releases to return

    Returns:
        List of release dicts with keys: tag, name, published_at, url, body, prerelease
    """
    repo = _validate_repo(repo)

    if since is None:
        since = datetime.now(timezone.utc) - timedelta(days=7)

    releases = _fetch_via_gh(repo, limit)
    if releases is None:
        releases = _fetch_via_rest(repo, limit)

    # Filter to releases after `since`
    filtered = []
    for r in releases:
        pub = r.get("published_at")
        if pub and _parse_dt(pub) > since:
            filtered.append({
                "repo": repo,
                "tag": r.get("tag_name", r.get("tag", "")),
                "name": r.get("name", ""),
                "published_at": pub,
                "url": r.get("html_url", r.get("url", "")),
                "body": (r.get("body") or "")[:2000],  # Truncate long bodies
                "prerelease": r.get("is_prerelease", r.get("prerelease", False)),
            })

    return filtered


def _fetch_via_gh(repo: str, limit: int) -> Optional[list[dict]]:
    """Fetch releases using the GitHub CLI."""
    try:
        result = subprocess.run(
            ["gh", "api", f"repos/{repo}/releases", "--paginate", "-q",
             f".[:{limit}] | .[] | {{tag_name: .tag_name, name: .name, "
             f"published_at: .published_at, html_url: .html_url, "
             f"body: .body, prerelease: .prerelease}}"],
            capture_output=True, text=True, timeout=30,
        )
        if result.returncode != 0:
            logger.debug("gh api failed for %s: %s", repo, result.stderr.strip())
            return None

        releases = []
        for line in result.stdout.strip().split("\n"):
            if line.strip():
                try:
                    releases.append(json.loads(line))
                except json.JSONDecodeError:
                    continue
        return releases
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return None


def _fetch_via_rest(repo: str, limit: int) -> list[dict]:
    """Fetch releases using the GitHub REST API (unauthenticated)."""
    import urllib.request
    import urllib.error

    url = f"https://api.github.com/repos/{repo}/releases?per_page={limit}"
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "homebase-ai-monitor/1.0",
    })
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read().decode())
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError) as e:
        logger.warning("REST API failed for %s: %s", repo, e)
        return []


def fetch_repo_info(repo: str) -> Optional[dict]:
    """Fetch basic repo metadata (stars, description, updated_at)."""
    repo = _validate_repo(repo)
    try:
        result = subprocess.run(
            ["gh", "api", f"repos/{repo}", "-q",
             '{stargazers_count: .stargazers_count, description: .description, '
             'updated_at: .updated_at, pushed_at: .pushed_at, '
             'html_url: .html_url, topics: .topics, '
             'open_issues_count: .open_issues_count}'],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0 and result.stdout.strip():
            return json.loads(result.stdout.strip())
    except (FileNotFoundError, subprocess.TimeoutExpired, json.JSONDecodeError):
        pass
    return None


def _parse_dt(dt_str: str) -> datetime:
    """Parse an ISO 8601 datetime string."""
    # Handle GitHub's format: 2026-03-01T12:00:00Z
    dt_str = dt_str.replace("Z", "+00:00")
    return datetime.fromisoformat(dt_str)
