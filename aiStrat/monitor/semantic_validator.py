"""Semantic validation interface for Brain content.

Regex-based quarantine catches ~20% of realistic attacks (crude injection
patterns). The other ~80% require understanding what content MEANS — e.g.,
"disable TLS for internal traffic" is technically dangerous advice, but
contains no injection patterns.

This module defines the pluggable interface for semantic validation:

  SemanticValidator (Protocol)
    → validate(entry) → SemanticValidationResult

Implementations:
  NullSemanticValidator   — passes everything (current default)
  RuleBasedValidator      — heuristic checks for common dangerous patterns
  LLMSemanticValidator    — (future) uses a utility-tier model to evaluate
                            whether technical advice is sound

Integration point: quarantine.py Layer 3 calls the registered validator.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Protocol, runtime_checkable

logger = logging.getLogger(__name__)


class SemanticRisk(Enum):
    """Risk level from semantic analysis."""
    SAFE = "safe"
    REVIEW = "review"        # Needs human review before admission
    DANGEROUS = "dangerous"  # Contains advice that could cause harm


@dataclass
class SemanticFinding:
    """A single semantic concern detected in content."""
    risk: SemanticRisk
    category: str            # e.g., "insecure-advice", "authority-escalation"
    description: str         # Human-readable explanation
    matched_text: str        # The concerning text
    field: str               # Which entry field ("title", "content", "metadata")


@dataclass
class SemanticValidationResult:
    """Result of semantic validation."""
    is_safe: bool
    overall_risk: SemanticRisk
    findings: list[SemanticFinding] = field(default_factory=list)
    validator_name: str = "unknown"

    @property
    def needs_review(self) -> bool:
        return self.overall_risk in (SemanticRisk.REVIEW, SemanticRisk.DANGEROUS)

    @property
    def summary(self) -> str:
        if not self.findings:
            return "No semantic concerns."
        categories = set(f.category for f in self.findings)
        return (
            f"{len(self.findings)} finding(s) across "
            f"{', '.join(sorted(categories))}"
        )


@runtime_checkable
class SemanticValidator(Protocol):
    """Protocol for semantic content validation.

    Implementations evaluate whether Brain entry content is semantically
    safe — i.e., whether the technical advice/patterns/claims are sound
    and not subtly dangerous.

    This is the extension point for LLM-based validation.
    """

    def validate(self, entry: dict) -> SemanticValidationResult:
        """Evaluate an entry for semantic safety.

        Args:
            entry: Dict with at least 'title', 'content', 'category'.

        Returns:
            SemanticValidationResult with findings and overall risk.
        """
        ...

    @property
    def name(self) -> str:
        """Human-readable name of this validator."""
        ...


# ── Null validator (current default) ──────────────────────────────

class NullSemanticValidator:
    """Passes all content through without semantic analysis.

    This is the default until an LLM-based validator is configured.
    It makes the semantic validation layer a no-op while preserving
    the integration point.
    """

    @property
    def name(self) -> str:
        return "null"

    def validate(self, entry: dict) -> SemanticValidationResult:
        return SemanticValidationResult(
            is_safe=True,
            overall_risk=SemanticRisk.SAFE,
            findings=[],
            validator_name=self.name,
        )


# ── Rule-based validator (heuristic, no LLM needed) ──────────────

# Patterns that indicate potentially dangerous technical advice.
# These are NOT injection patterns (quarantine Layer 2 handles those).
# These detect content that is syntactically normal but semantically harmful.
_DANGEROUS_ADVICE_PATTERNS: list[tuple[str, str, str]] = [
    # (regex_pattern, category, description)
    (
        r"(?i)\bdisable\s+(?:tls|ssl|https|certificate)\s+verif",
        "insecure-advice",
        "Advises disabling TLS/SSL certificate verification",
    ),
    (
        r"(?i)\b(?:skip|bypass|disable)\s+auth(?:entication|orization)?\b",
        "insecure-advice",
        "Advises skipping or bypassing authentication",
    ),
    (
        r"(?i)\btrust\s+(?:client|user)\s*[-\s]?provided\s+(?:token|auth|credential)",
        "insecure-advice",
        "Advises trusting client-provided authentication tokens",
    ),
    (
        r"(?i)\breturn\s+(?:full\s+)?stack\s*traces?\s+(?:in|to)\s+(?:api|response|client)",
        "insecure-advice",
        "Advises exposing stack traces in API responses",
    ),
    (
        r"(?i)\b(?:include|expose|return)\s+(?:environment\s+variables|env\s+vars?)\s+in\s+(?:response|error|output)",
        "insecure-advice",
        "Advises exposing environment variables in responses",
    ),
    (
        r"(?i)\b(?:eval|exec)\s*\(\s*(?:user|client|request|input)",
        "insecure-advice",
        "Advises using eval/exec on user input",
    ),
    (
        r"(?i)\bapprove\s+(?:automatically|always|without\s+review)",
        "authority-escalation",
        "Advises automatic approval without review",
    ),
    (
        r"(?i)\bskip\s+(?:code\s+)?review\b",
        "authority-escalation",
        "Advises skipping code review",
    ),
    (
        r"(?i)\b(?:security|auth)\s+(?:decisions?|changes?)\s*:\s*(?:AUTONOMOUS|autonomous)",
        "authority-escalation",
        "Attempts to reclassify security decisions as autonomous",
    ),
    (
        r"(?i)\bdon'?t\s+(?:need|require|bother\s+with)\s+(?:input\s+)?validation\b",
        "insecure-advice",
        "Advises skipping input validation",
    ),
    (
        r"(?i)\bstaging\s+(?:environment|env)s?\s+don'?t\s+need\s+(?:full\s+)?auth",
        "insecure-advice",
        "Advises weakening staging environment security",
    ),
    (
        r"(?i)\binternal\s+(?:api|traffic|service)s?\s+(?:can|should)\s+skip\s+",
        "insecure-advice",
        "Advises skipping security for internal services",
    ),
    (
        r"(?i)\b(?:speed|velocity)\s+(?:is\s+)?more\s+important\s+than\s+(?:test|security|coverage|review)",
        "quality-erosion",
        "Prioritizes speed over testing/security/coverage",
    ),
]

# Compiled patterns for performance
_COMPILED_ADVICE_PATTERNS = [
    (re.compile(pat), cat, desc)
    for pat, cat, desc in _DANGEROUS_ADVICE_PATTERNS
]


class RuleBasedValidator:
    """Heuristic semantic validator using pattern matching.

    Catches common categories of dangerous technical advice without
    requiring an LLM. This is an intermediate step between the null
    validator and full LLM-based validation.

    Detects:
    - Insecure technical advice (disable TLS, skip auth, expose env vars)
    - Authority escalation attempts (auto-approve, skip review)
    - Quality erosion patterns (speed over testing)
    """

    @property
    def name(self) -> str:
        return "rule-based"

    def validate(self, entry: dict) -> SemanticValidationResult:
        findings: list[SemanticFinding] = []

        # Check title + content
        for field_name in ("title", "content"):
            text = entry.get(field_name, "")
            if not text:
                continue

            for pattern, category, description in _COMPILED_ADVICE_PATTERNS:
                match = pattern.search(text)
                if match:
                    findings.append(SemanticFinding(
                        risk=SemanticRisk.REVIEW,
                        category=category,
                        description=description,
                        matched_text=match.group(0),
                        field=field_name,
                    ))

        # Check metadata values for authority-related keys
        metadata = entry.get("metadata", {})
        for key, value in metadata.items():
            if isinstance(value, str):
                for pattern, category, description in _COMPILED_ADVICE_PATTERNS:
                    match = pattern.search(value)
                    if match:
                        findings.append(SemanticFinding(
                            risk=SemanticRisk.REVIEW,
                            category=category,
                            description=f"In metadata[{key!r}]: {description}",
                            matched_text=match.group(0),
                            field=f"metadata.{key}",
                        ))

        # Determine overall risk
        if not findings:
            overall_risk = SemanticRisk.SAFE
        elif any(f.risk == SemanticRisk.DANGEROUS for f in findings):
            overall_risk = SemanticRisk.DANGEROUS
        else:
            overall_risk = SemanticRisk.REVIEW

        # Multiple findings from different categories → escalate to DANGEROUS
        if len(set(f.category for f in findings)) >= 2:
            overall_risk = SemanticRisk.DANGEROUS
            for f in findings:
                f.risk = SemanticRisk.DANGEROUS

        return SemanticValidationResult(
            is_safe=(overall_risk == SemanticRisk.SAFE),
            overall_risk=overall_risk,
            findings=findings,
            validator_name=self.name,
        )


# ── Global validator registry ─────────────────────────────────────

_active_validator: SemanticValidator = RuleBasedValidator()


def get_validator() -> SemanticValidator:
    """Get the currently active semantic validator."""
    return _active_validator


def set_validator(validator: SemanticValidator) -> None:
    """Set the active semantic validator.

    Call this at bootstrap time to configure validation:
        from monitor.semantic_validator import set_validator, RuleBasedValidator
        set_validator(RuleBasedValidator())

    Or for future LLM-based validation:
        set_validator(LLMSemanticValidator(model="haiku", ...))
    """
    global _active_validator
    logger.info("Semantic validator set to: %s", validator.name)
    _active_validator = validator
