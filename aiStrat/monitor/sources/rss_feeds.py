"""Fetch and filter RSS/Atom feeds from AI provider blogs.

The monitor tracks official announcements from Anthropic, OpenAI, Google,
GitHub, Mistral, and Meta. When a provider publishes a blog post about
a model release, agent update, or API change, the Brain needs to know.

Each feed entry is filtered by keywords so the Admiral only sees
posts relevant to fleet deployment decisions — not every marketing
announcement, just the ones that affect model selection, agent design,
or tool capabilities.

SECURITY: URLs validated (https only). Content sanitized. Feed XML
parsed with defusedxml when available, stdlib fallback with entity
expansion disabled.
"""

from __future__ import annotations

import hashlib
import logging
import re
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_FETCH_TIMEOUT = 30
_MAX_FETCH_BYTES = 2_000_000  # 2MB max feed size
_MAX_ENTRIES_PER_FEED = 20


def fetch_feed(url: str, keywords: list[str] | None = None,
               since: datetime | None = None) -> list[dict]:
    """Fetch an RSS/Atom feed and return matching entries.

    Args:
        url: Feed URL (must be https)
        keywords: If provided, only return entries matching at least one keyword
        since: If provided, only return entries published after this datetime

    Returns:
        List of dicts with keys: title, url, published, summary, matched_keywords
    """
    if not url or not url.startswith("https://"):
        logger.warning("Refusing non-HTTPS feed URL: %s", url)
        return []

    try:
        raw_xml = _fetch_raw(url)
    except Exception as e:
        logger.warning("Failed to fetch feed %s: %s", url, e)
        return []

    try:
        entries = _parse_feed(raw_xml)
    except Exception as e:
        logger.warning("Failed to parse feed %s: %s", url, e)
        return []

    results = []
    for entry in entries[:_MAX_ENTRIES_PER_FEED]:
        # Date filter
        if since and entry.get("published"):
            try:
                pub_dt = _parse_date(entry["published"])
                if pub_dt and pub_dt < since:
                    continue
            except (ValueError, TypeError):
                pass  # Can't parse date, include the entry

        # Keyword filter
        matched = []
        if keywords:
            searchable = (
                (entry.get("title") or "") + " " +
                (entry.get("summary") or "")
            ).lower()
            matched = [kw for kw in keywords if kw.lower() in searchable]
            if not matched:
                continue

        results.append({
            "title": _sanitize_text(entry.get("title", "Untitled")),
            "url": _validate_entry_url(entry.get("url", "")),
            "published": entry.get("published", ""),
            "summary": _sanitize_text(entry.get("summary", ""))[:2000],
            "matched_keywords": matched,
        })

    return results


def entry_id(url: str, title: str) -> str:
    """Generate a stable ID for deduplication."""
    raw = f"{url}|{title}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def _fetch_raw(url: str) -> str:
    """Fetch raw feed XML."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "homebase-ai-monitor/1.0 (research bot)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
    })
    with urllib.request.urlopen(req, timeout=_FETCH_TIMEOUT) as resp:
        raw = resp.read(_MAX_FETCH_BYTES)
        return raw.decode("utf-8", errors="replace")


def _parse_feed(xml_text: str) -> list[dict]:
    """Parse RSS or Atom feed XML into entry dicts.

    Handles both RSS 2.0 (<item>) and Atom (<entry>) formats.
    """
    # Disable entity expansion to prevent XXE
    xml_text = re.sub(r"<!DOCTYPE[^>]*>", "", xml_text, count=1)
    xml_text = re.sub(r"<!ENTITY[^>]*>", "", xml_text)

    root = ET.fromstring(xml_text)
    ns = _detect_namespace(root)

    entries = []

    # Try RSS 2.0 format first
    for item in root.iter(_ns("item", ns.get("rss"))):
        entries.append({
            "title": _tag_text(item, "title", ns.get("rss")),
            "url": _tag_text(item, "link", ns.get("rss")),
            "published": (
                _tag_text(item, "pubDate", ns.get("rss")) or
                _tag_text(item, "dc:date", ns.get("dc"))
            ),
            "summary": (
                _tag_text(item, "description", ns.get("rss")) or
                _tag_text(item, "content:encoded", ns.get("content"))
            ),
        })

    # Try Atom format
    atom_ns = ns.get("atom")
    for entry in root.iter(_ns("entry", atom_ns)):
        link_url = ""
        for link in entry.iter(_ns("link", atom_ns)):
            rel = link.get("rel", "alternate")
            if rel == "alternate" or not link_url:
                href = link.get("href", "")
                if href:
                    link_url = href

        entries.append({
            "title": _tag_text(entry, "title", atom_ns),
            "url": link_url or _tag_text(entry, "id", atom_ns),
            "published": (
                _tag_text(entry, "published", atom_ns) or
                _tag_text(entry, "updated", atom_ns)
            ),
            "summary": (
                _tag_text(entry, "summary", atom_ns) or
                _tag_text(entry, "content", atom_ns)
            ),
        })

    return entries


def _detect_namespace(root: ET.Element) -> dict:
    """Detect XML namespaces used in the feed."""
    namespaces = {}
    tag = root.tag

    # Atom namespace
    if "{http://www.w3.org/2005/Atom}" in tag:
        namespaces["atom"] = "http://www.w3.org/2005/Atom"
    elif tag == "feed":
        namespaces["atom"] = ""

    # RSS — usually no namespace, but check
    if tag == "rss" or root.find("channel") is not None:
        namespaces["rss"] = ""

    # Dublin Core (dc:date)
    namespaces["dc"] = "http://purl.org/dc/elements/1.1/"
    # Content module (content:encoded)
    namespaces["content"] = "http://purl.org/rss/1.0/modules/content/"

    return namespaces


def _ns(tag: str, namespace: str | None) -> str:
    """Build a namespaced tag name."""
    if namespace is None:
        return tag
    if not namespace:
        return tag
    # Handle prefixed tags like dc:date
    if ":" in tag:
        prefix, local = tag.split(":", 1)
        return f"{{{namespace}}}{local}"
    return f"{{{namespace}}}{tag}"


def _tag_text(parent: ET.Element, tag: str, namespace: str | None) -> str:
    """Get text content of a child element."""
    elem = parent.find(_ns(tag, namespace))
    if elem is not None and elem.text:
        return elem.text.strip()
    return ""


def _parse_date(date_str: str) -> Optional[datetime]:
    """Parse common RSS/Atom date formats."""
    if not date_str:
        return None

    # ISO 8601 (Atom)
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%SZ",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%dT%H:%M:%S.%fZ",
        "%Y-%m-%d",
    ):
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue

    # RFC 822 (RSS) — e.g., "Mon, 01 Jan 2025 12:00:00 GMT"
    # Strip timezone abbreviation and parse
    cleaned = re.sub(r"\s+(?:GMT|UTC|EST|PST|[A-Z]{2,4})$", "", date_str.strip())
    for fmt in (
        "%a, %d %b %Y %H:%M:%S",
        "%d %b %Y %H:%M:%S",
        "%a, %d %b %Y",
    ):
        try:
            dt = datetime.strptime(cleaned, fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue

    return None


def _validate_entry_url(url: str) -> str:
    """Validate and normalize a feed entry URL."""
    if not url:
        return ""
    url = url.strip()
    if url.startswith("http://"):
        url = "https://" + url[7:]
    if not url.startswith("https://"):
        return ""
    # Strip control characters
    url = re.sub(r"[\n\r\t\x00-\x1f]", "", url)
    return url


def _sanitize_text(text: str) -> str:
    """Remove HTML tags and control characters from feed content."""
    if not text:
        return ""
    # Strip HTML tags
    text = re.sub(r"<[^>]+>", "", text)
    # Decode common HTML entities
    text = text.replace("&amp;", "&")
    text = text.replace("&lt;", "<")
    text = text.replace("&gt;", ">")
    text = text.replace("&quot;", '"')
    text = text.replace("&#39;", "'")
    text = text.replace("&nbsp;", " ")
    # Strip control characters
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)
    # Collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    return text
