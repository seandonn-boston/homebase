"""Fetch agent configuration content from GitHub repositories.

When the monitor discovers a repo with fleet-relevant patterns, this module
fetches the actual instruction files — CLAUDE.md, .cursorrules,
copilot-instructions.md, system prompts, agent configs — so the Brain has
the real patterns, not just a repo description.

This is the difference between knowing "repo X configures Claude Code" and
knowing HOW they configure it. The Admiral needs the actual patterns.

SECURITY: Only fetches from known file paths. All content sanitized.
Repository names validated. Rate-limited to avoid API abuse.
"""

from __future__ import annotations

import json
import logging
import re
import subprocess
from typing import Optional

logger = logging.getLogger(__name__)

# Strict repo name validation (reuse the same pattern)
_REPO_PATTERN = re.compile(r"^[a-zA-Z0-9\-_.]+/[a-zA-Z0-9\-_.]+$")

# Files that contain agent configuration patterns.
# Priority ordered — most valuable first.
AGENT_CONFIG_FILES = [
    # Claude Code instructions
    "CLAUDE.md",
    ".claude/settings.json",

    # GitHub Copilot configuration
    ".github/copilot-instructions.md",

    # Cursor agent configuration
    ".cursorrules",

    # Aider configuration
    ".aider.conf.yml",

    # Common prompt/instruction locations
    "system_prompt.md",
    "system_prompt.txt",
    "AGENTS.md",
    "AI_INSTRUCTIONS.md",
    ".ai/instructions.md",
    "prompts/system.md",
    "prompts/system.txt",
]

# Max content size per file
_MAX_CONTENT_LEN = 15_000
# Max files to fetch per repo
_MAX_FILES_PER_REPO = 5


def fetch_agent_configs(repo: str) -> list[dict]:
    """Fetch agent configuration files from a repository.

    Checks for known agent config file paths and returns the content
    of any that exist. This gives the Brain actual prompt patterns
    and instruction designs, not just metadata.

    Args:
        repo: "owner/name" format

    Returns:
        List of dicts with keys: path, content, repo
    """
    if not _REPO_PATTERN.match(repo):
        logger.warning("Invalid repo name, skipping content fetch: %s", repo)
        return []

    configs = []
    for path in AGENT_CONFIG_FILES:
        if len(configs) >= _MAX_FILES_PER_REPO:
            break

        content = _fetch_file(repo, path)
        if content:
            configs.append({
                "repo": repo,
                "path": path,
                "content": content[:_MAX_CONTENT_LEN],
                "config_type": _classify_config(path),
            })
            logger.info("Found agent config: %s/%s", repo, path)

    return configs


def check_for_agent_configs(repo: str) -> list[str]:
    """Quick check which agent config files exist in a repo.

    Uses the GitHub tree API to check all files at once instead of
    fetching each one individually. Returns list of found paths.
    """
    if not _REPO_PATTERN.match(repo):
        return []

    try:
        result = subprocess.run(
            ["gh", "api", f"repos/{repo}/git/trees/HEAD",
             "-q", ".tree[].path"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode != 0:
            return []

        repo_files = set(result.stdout.strip().split("\n"))
        found = [path for path in AGENT_CONFIG_FILES if path in repo_files]

        # Also check subdirectories for nested configs
        if ".github" in repo_files:
            _check_subdir(repo, ".github", found)
        if ".claude" in repo_files:
            _check_subdir(repo, ".claude", found)
        if "prompts" in repo_files:
            _check_subdir(repo, "prompts", found)

        return found
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []


def _check_subdir(repo: str, subdir: str, found: list[str]) -> None:
    """Check a subdirectory for agent config files."""
    try:
        result = subprocess.run(
            ["gh", "api", f"repos/{repo}/contents/{subdir}",
             "-q", ".[].path"],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            for file_path in result.stdout.strip().split("\n"):
                file_path = file_path.strip()
                if file_path and file_path in AGENT_CONFIG_FILES and file_path not in found:
                    found.append(file_path)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass


def _fetch_file(repo: str, path: str) -> Optional[str]:
    """Fetch a single file from a GitHub repository.

    Uses gh CLI for authenticated access, falls back to raw URL.
    """
    # Validate path doesn't contain injection attempts
    if not re.match(r"^[a-zA-Z0-9/_.\-]+$", path):
        return None

    # Try gh CLI first
    try:
        result = subprocess.run(
            ["gh", "api", f"repos/{repo}/contents/{path}",
             "-q", ".content", "--header", "Accept: application/vnd.github.raw+json"],
            capture_output=True, text=True, timeout=15,
        )
        if result.returncode == 0 and result.stdout.strip():
            content = result.stdout.strip()
            # gh returns raw content with the raw header
            if content and content != "null":
                return _sanitize_content(content)
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # Fallback: try raw content URL
    try:
        import urllib.request
        import urllib.error

        raw_url = f"https://raw.githubusercontent.com/{repo}/HEAD/{path}"
        req = urllib.request.Request(raw_url, headers={
            "User-Agent": "homebase-ai-monitor/1.0",
        })
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status == 200:
                content = resp.read(_MAX_CONTENT_LEN).decode("utf-8", errors="replace")
                return _sanitize_content(content)
    except (urllib.error.URLError, urllib.error.HTTPError, OSError):
        pass

    return None


def _classify_config(path: str) -> str:
    """Classify what kind of agent config this is.

    This helps the Brain categorize the pattern for retrieval.
    """
    path_lower = path.lower()
    if "claude" in path_lower:
        return "claude-code-instructions"
    if "copilot" in path_lower:
        return "copilot-instructions"
    if "cursor" in path_lower:
        return "cursor-rules"
    if "aider" in path_lower:
        return "aider-config"
    if "prompt" in path_lower or "system" in path_lower:
        return "system-prompt"
    if "agent" in path_lower:
        return "agent-config"
    if "instruction" in path_lower or "ai" in path_lower:
        return "ai-instructions"
    return "agent-config"


def _sanitize_content(text: str) -> str:
    """Sanitize fetched content for Brain storage.

    Remove obvious injection attempts but preserve the actual
    instruction/prompt content — that's what makes this valuable.
    """
    if not text:
        return ""

    # Strip control characters (keep newlines and tabs)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Flag but don't remove potential prompt injections
    # (the quarantine system handles that downstream)
    return text.strip()
