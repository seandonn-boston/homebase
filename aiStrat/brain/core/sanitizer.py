"""Sensitive data detection for Brain entries.

Enforces the non-negotiable rule: the Brain must never store PII,
passwords, secrets, API keys, or other sensitive information.

This module is called at the store level — the lowest enforcement
point — so it is impossible to bypass regardless of how entries
are added (MCP, seeds, direct store usage).

Reference: admiral/part11-protocols.md, Section 40.
"""

from __future__ import annotations

import re
from typing import Any


class SensitiveDataError(ValueError):
    """Raised when an entry contains sensitive data that must not be stored."""

    def __init__(self, field: str, violation: str) -> None:
        self.field = field
        self.violation = violation
        super().__init__(
            f"Sensitive data detected in '{field}': {violation}. "
            f"The Brain must never store PII, secrets, or credentials."
        )


# ── Detection patterns ──────────────────────────────────────────

# Email addresses
_EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
)

# US Social Security Numbers (XXX-XX-XXXX or XXXXXXXXX)
_SSN_RE = re.compile(
    r"\b\d{3}-\d{2}-\d{4}\b"
    r"|\b\d{9}\b(?=\s|$|[^0-9])",
)

# Credit card numbers (13-19 digits, optionally separated by spaces/dashes)
_CC_RE = re.compile(
    r"\b(?:\d[ -]*?){13,19}\b",
)

# US phone numbers (various formats)
_PHONE_RE = re.compile(
    r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b",
)

# API keys, tokens, and secrets (common patterns)
_SECRET_RE = re.compile(
    r"(?i)"
    r"(?:"
    r"(?:api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token"
    r"|secret[_-]?key|private[_-]?key|client[_-]?secret"
    r"|password|passwd|pwd)"
    r"\s*[:=]\s*"
    r"['\"]?[^\s'\"]{8,}['\"]?"
    r")",
)

# AWS-style keys
_AWS_KEY_RE = re.compile(
    r"\b(?:AKIA|ASIA)[A-Z0-9]{16}\b",
)

# Generic long hex/base64 tokens that look like secrets
_TOKEN_RE = re.compile(
    r"\b(?:sk|pk|rk|token|key)[_-][a-zA-Z0-9_-]{20,}\b",
)

# Connection strings with credentials
_CONN_STRING_RE = re.compile(
    r"(?i)(?:postgresql|mysql|mongodb|redis|amqp|smtp)://[^@\s]+:[^@\s]+@",
)

# Metadata keys that suggest PII storage
_SENSITIVE_METADATA_KEYS = frozenset({
    "email", "phone", "ssn", "social_security", "credit_card",
    "card_number", "password", "secret", "api_key", "token",
    "private_key", "dob", "date_of_birth", "address", "ip_address",
    "passport", "driver_license", "bank_account",
})

# All text-field patterns, paired with violation descriptions
_TEXT_PATTERNS: list[tuple[re.Pattern, str]] = [
    (_EMAIL_RE, "email address"),
    (_SSN_RE, "Social Security Number"),
    (_CC_RE, "credit card number"),
    (_PHONE_RE, "phone number"),
    (_SECRET_RE, "API key, password, or secret"),
    (_AWS_KEY_RE, "AWS access key"),
    (_TOKEN_RE, "secret token"),
    (_CONN_STRING_RE, "connection string with credentials"),
]


# ── Public API ───────────────────────────────────────────────────

def scan_text(text: str, field_name: str) -> None:
    """Scan a text field for sensitive data patterns.

    Raises SensitiveDataError if any pattern matches.
    """
    if not text:
        return

    for pattern, violation in _TEXT_PATTERNS:
        if pattern.search(text):
            raise SensitiveDataError(field_name, violation)


def scan_metadata(metadata: dict[str, Any], field_name: str = "metadata") -> None:
    """Scan metadata keys and string values for sensitive data.

    Raises SensitiveDataError if:
    - Any key name suggests PII/secret storage
    - Any string value matches a sensitive data pattern
    """
    if not metadata:
        return

    for key in metadata:
        if key.lower().replace("-", "_") in _SENSITIVE_METADATA_KEYS:
            raise SensitiveDataError(
                field_name, f"key '{key}' suggests PII/secret storage"
            )

    # Recursively scan string values
    _scan_values(metadata, field_name)


def scan_entry(
    title: str,
    content: str,
    metadata: dict[str, Any] | None = None,
    source_agent: str | None = None,
    source_session: str | None = None,
) -> None:
    """Full scan of all entry fields before storage.

    This is the single enforcement point. Called by BrainStore.add_entry().
    """
    scan_text(title, "title")
    scan_text(content, "content")
    if source_agent:
        scan_text(source_agent, "source_agent")
    if source_session:
        scan_text(source_session, "source_session")
    if metadata:
        scan_metadata(metadata)


# ── Internal helpers ─────────────────────────────────────────────

def _scan_values(obj: Any, field_name: str) -> None:
    """Recursively scan dict/list values for sensitive patterns."""
    if isinstance(obj, str):
        scan_text(obj, field_name)
    elif isinstance(obj, dict):
        for k, v in obj.items():
            _scan_values(v, f"{field_name}.{k}")
    elif isinstance(obj, (list, tuple)):
        for i, v in enumerate(obj):
            _scan_values(v, f"{field_name}[{i}]")
