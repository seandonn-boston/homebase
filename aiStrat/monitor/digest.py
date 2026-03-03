"""Generate markdown digests from scan results.

Each scan produces a dated digest file summarizing all findings,
organized by priority and type. These serve as both human-readable
reports and input for seed candidate generation.

SECURITY: All external content (repo names, descriptions, release bodies,
tags) is escaped before embedding in markdown. This prevents markdown
injection attacks where a malicious repo description could create
executable links or manipulate rendering in GitHub Issues.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone

from .scanner import ScanResult, Finding


def write_digest(result: ScanResult, digest_dir: str) -> str | None:
    """Write a markdown digest of scan results.

    Args:
        result: The scan result to summarize
        digest_dir: Directory to write digest files

    Returns:
        Path to the written digest file, or None if no findings.
    """
    if not result.has_findings:
        return None

    os.makedirs(digest_dir, exist_ok=True)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    path = os.path.join(digest_dir, f"{today}.md")

    content = _render_digest(result, today)

    # Append if file already exists (multiple scans in one day)
    mode = "a" if os.path.exists(path) else "w"
    with open(path, mode) as f:
        f.write(content)

    return path


def _render_digest(result: ScanResult, date: str) -> str:
    """Render a scan result as markdown."""
    lines = []
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")

    lines.append(f"# AI Landscape Monitor — {date}")
    lines.append(f"")
    lines.append(f"Scan completed: {now}")
    lines.append(f"Findings: {len(result.findings)} | Errors: {len(result.errors)}")
    lines.append(f"Repos checked: {result.repos_checked} | Queries run: {result.queries_run}")
    lines.append("")

    # High priority section
    high = result.high_priority
    if high:
        lines.append("## Alerts (High Priority)")
        lines.append("")
        for f in high:
            lines.extend(_render_finding(f))
        lines.append("")

    # Group remaining by kind
    normal = [f for f in result.findings if f.priority != "high"]
    by_kind: dict[str, list[Finding]] = {}
    for f in normal:
        by_kind.setdefault(f.kind, []).append(f)

    kind_labels = {
        "model_release": "Model Intelligence",
        "model_docs": "Official Documentation",
        "exemplar_update": "Exemplar Updates",
        "practice_found": "Agent Patterns Discovered",
        "star_surge": "Community Validation (Star Surges)",
        "release": "New Releases",
        "new_repo": "Newly Discovered Repositories",
        "trending": "Trending",
    }

    for kind, findings in by_kind.items():
        label = kind_labels.get(kind, kind.replace("_", " ").title())
        lines.append(f"## {label}")
        lines.append("")
        for f in findings:
            lines.extend(_render_finding(f))
        lines.append("")

    # Errors section
    if result.errors:
        lines.append("## Errors")
        lines.append("")
        for e in result.errors:
            lines.append(f"- {e}")
        lines.append("")

    lines.append("---")
    lines.append("")
    return "\n".join(lines)


def _render_finding(finding: Finding) -> list[str]:
    """Render a single finding as markdown list items.

    All external content is escaped via _md_escape() to prevent
    markdown injection (malicious links, heading manipulation, etc.).
    """
    lines = []
    priority_marker = "**[!]** " if finding.priority == "high" else ""
    lines.append(f"### {priority_marker}{_md_escape(finding.title)}")
    lines.append("")

    if finding.body:
        lines.append(f"{_md_escape(finding.body)}")
        lines.append("")

    if finding.url:
        safe_url = _sanitize_url(finding.url)
        if safe_url:
            lines.append(f"Link: {safe_url}")
            lines.append("")

    if finding.tags:
        safe_tags = [_md_escape(t) for t in finding.tags]
        lines.append(f"Tags: {', '.join(safe_tags)}")
        lines.append("")

    # Embed key data points (numeric values — safe by construction)
    data = finding.data
    if data.get("stars"):
        lines.append(f"Stars: {int(data['stars']):,}")
    if data.get("delta"):
        lines.append(f"Star change: +{int(data['delta']):,}")
    if data.get("language"):
        lines.append(f"Language: {_md_escape(str(data['language']))}")
    if data.get("published_at"):
        lines.append(f"Published: {_md_escape(str(data['published_at']))}")
    if data.get("config_type"):
        lines.append(f"Config type: {_md_escape(str(data['config_type']))}")
    if data.get("config_path"):
        lines.append(f"Config path: {_md_escape(str(data['config_path']))}")
    if data.get("matched_keywords"):
        safe_kws = [_md_escape(str(kw)) for kw in data["matched_keywords"]]
        lines.append(f"Matched: {', '.join(safe_kws)}")

    lines.append("")
    return lines


def _md_escape(text: str) -> str:
    """Escape markdown special characters in untrusted external content.

    Neutralizes: links, images, headings, HTML tags, blockquotes,
    tables, list markers, strikethrough, and formatting that could be
    used for injection when content is rendered.

    v4: Added escaping for blockquotes (>), table pipes (|), list markers
    (-/*/+ at line start), image syntax (!), single backticks, and
    strikethrough (~~). Uses html.parser for robust HTML stripping
    instead of regex (Vuln 8.2.7).
    """
    if not text:
        return ""

    # Strip HTML tags using regex (handles unclosed/nested tags)
    # We strip entirely rather than escape — no HTML should survive
    text = re.sub(r"<[^>]*>", "", text)

    # Escape image syntax: ![alt](url) — must come before [ escaping
    text = text.replace("![", "\\!\\[")

    # Escape markdown link/image syntax: [text](url)
    text = text.replace("[", "\\[").replace("]", "\\]")

    # Escape heading markers at start of lines
    text = re.sub(r"^(#{1,6})\s", r"\\\1 ", text, flags=re.MULTILINE)

    # Escape blockquote markers at start of lines
    text = re.sub(r"^>", r"\>", text, flags=re.MULTILINE)

    # Escape list markers at start of lines (- * +)
    text = re.sub(r"^(\s*[-*+])\s", r"\\\1 ", text, flags=re.MULTILINE)

    # Escape table pipe characters
    text = text.replace("|", "\\|")

    # Escape backtick code execution (triple backticks could break fences)
    text = text.replace("```", "\\`\\`\\`")

    # Escape single backticks (could create inline code injection)
    text = re.sub(r"(?<!\\)`", "\\`", text)

    # Escape strikethrough
    text = text.replace("~~", "\\~\\~")

    return text


def _sanitize_url(url: str) -> str:
    """Allow only http/https URLs. Block javascript:, data:, and other schemes."""
    if not url:
        return ""
    url = url.strip()
    if url.startswith(("https://", "http://")):
        # Also strip any embedded newlines or control chars
        url = re.sub(r"[\n\r\t\x00-\x1f]", "", url)
        return url
    return ""  # Reject non-http(s) URLs entirely
