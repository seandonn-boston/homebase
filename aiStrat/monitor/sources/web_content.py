"""Fetch and extract content from web pages (blog posts, docs, release notes).

When a new model release is detected, this module fetches the associated
official content (blog posts, documentation pages) so the Brain has the
full context — not just a truncated release body.

SECURITY: Only fetches from URLs on allowlisted domains. All URLs are
validated (https only). Content is sanitized before storage.
"""

from __future__ import annotations

import hashlib
import html
import logging
import re
import urllib.error
import urllib.request
from typing import Optional

logger = logging.getLogger(__name__)

_MAX_FETCH_BYTES = 1_000_000     # 1MB max fetch
_MAX_EXTRACTED_LEN = 10_000      # 10K chars max extracted text
_FETCH_TIMEOUT = 20              # seconds

ALLOWED_DOMAINS = frozenset([
    "anthropic.com",
    "www.anthropic.com",
    "docs.anthropic.com",
    "openai.com",
    "platform.openai.com",
    "ai.google.dev",
    "blog.google",
    "ai.meta.com",
    "docs.mistral.ai",
    "mistral.ai",
    "huggingface.co",
    "github.blog",
    "github.com",
    "arxiv.org",
    "cohere.com",
    "docs.cohere.com",
    "x.ai",
])


def fetch_page_text(url: str) -> Optional[str]:
    """Fetch a web page and extract its text content.

    Only fetches from allowlisted domains. Returns extracted article
    text, or None if fetch/parse failed.
    """
    url = _validate_url(url)
    if not url:
        return None

    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "homebase-ai-monitor/1.0 (research bot)",
            "Accept": "text/html,application/xhtml+xml,text/plain",
        })
        with urllib.request.urlopen(req, timeout=_FETCH_TIMEOUT) as resp:
            final_url = resp.url
            if not _is_allowed_domain(final_url):
                logger.warning("Redirect to unallowed domain: %s -> %s", url, final_url)
                return None

            content_type = resp.headers.get("Content-Type", "")
            raw = resp.read(_MAX_FETCH_BYTES)
            charset = _detect_charset(content_type)
            text = raw.decode(charset, errors="replace")

            if "html" in content_type.lower():
                return _extract_from_html(text)
            return text[:_MAX_EXTRACTED_LEN]

    except (urllib.error.URLError, urllib.error.HTTPError, OSError) as e:
        logger.warning("Failed to fetch %s: %s", url, e)
        return None
    except Exception as e:
        logger.warning("Unexpected error fetching %s: %s", url, e)
        return None


def extract_urls_from_release(body: str) -> list[str]:
    """Extract URLs from a release body that point to official content.

    Only returns URLs on allowed domains.
    """
    if not body:
        return []

    urls = re.findall(r'https?://[^\s<>")\]]+', body)
    valid = []
    seen = set()
    for url in urls:
        url = url.rstrip(".,;:!?)")
        url = _validate_url(url)
        if url and url not in seen:
            seen.add(url)
            valid.append(url)

    return valid


def content_hash(text: str) -> str:
    """Generate a short hash for deduplication."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:16]


def _validate_url(url: str) -> str:
    """Validate and normalize a URL. Returns empty string if invalid."""
    if not url or not isinstance(url, str):
        return ""

    url = url.strip()
    if url.startswith("http://"):
        url = "https://" + url[7:]

    if not url.startswith("https://"):
        return ""

    url = re.sub(r"[\n\r\t\x00-\x1f]", "", url)

    if not _is_allowed_domain(url):
        return ""

    return url


def _is_allowed_domain(url: str) -> bool:
    """Check if a URL is on an allowed domain."""
    try:
        domain = url.split("://", 1)[1].split("/", 1)[0].split(":", 1)[0].lower()
        return domain in ALLOWED_DOMAINS or any(
            domain.endswith("." + allowed) for allowed in ALLOWED_DOMAINS
        )
    except (IndexError, ValueError):
        return False


def _detect_charset(content_type: str) -> str:
    """Extract charset from Content-Type header."""
    match = re.search(r"charset=([^\s;]+)", content_type, re.IGNORECASE)
    return match.group(1).strip('"') if match else "utf-8"


def _extract_from_html(raw_html: str) -> str:
    """Extract readable text from HTML, stripping tags and boilerplate."""
    for tag in ("script", "style", "nav", "footer", "header", "aside"):
        raw_html = re.sub(
            rf"<{tag}[^>]*>.*?</{tag}>",
            "", raw_html, flags=re.DOTALL | re.IGNORECASE,
        )

    raw_html = re.sub(r"<!--.*?-->", "", raw_html, flags=re.DOTALL)

    main_match = re.search(
        r"<(?:main|article)[^>]*>(.*?)</(?:main|article)>",
        raw_html, flags=re.DOTALL | re.IGNORECASE,
    )
    if main_match:
        raw_html = main_match.group(1)

    raw_html = re.sub(r"<(?:p|div|br|h[1-6]|li|tr)[^>]*>", "\n", raw_html, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", raw_html)
    text = html.unescape(text)

    lines = [line.strip() for line in text.split("\n")]
    lines = [line for line in lines if line]
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text[:_MAX_EXTRACTED_LEN]
