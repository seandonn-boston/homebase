"""Generate markdown digests from scan results.

Each scan produces a dated digest file summarizing all findings,
organized by priority and type. These serve as both human-readable
reports and input for seed candidate generation.
"""

from __future__ import annotations

import os
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
        "release": "New Releases",
        "new_repo": "Newly Discovered Repositories",
        "star_surge": "Star Surges",
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
    """Render a single finding as markdown list items."""
    lines = []
    priority_marker = "**[!]** " if finding.priority == "high" else ""
    lines.append(f"### {priority_marker}{finding.title}")
    lines.append("")

    if finding.body:
        lines.append(f"{finding.body}")
        lines.append("")

    if finding.url:
        lines.append(f"Link: {finding.url}")
        lines.append("")

    if finding.tags:
        lines.append(f"Tags: {', '.join(finding.tags)}")
        lines.append("")

    # Embed key data points
    data = finding.data
    if data.get("stars"):
        lines.append(f"Stars: {data['stars']:,}")
    if data.get("delta"):
        lines.append(f"Star change: +{data['delta']:,}")
    if data.get("language"):
        lines.append(f"Language: {data['language']}")
    if data.get("published_at"):
        lines.append(f"Published: {data['published_at']}")

    lines.append("")
    return lines
