"""Brain coherence analysis — detect cumulative bias and drift.

An attacker can plant 30-50 individually reasonable Brain entries that
collectively bias agent behavior (Vuln 8.3.3). Each entry passes quarantine
because no single entry contains injection patterns. But together, they
erode security posture, testing standards, or review processes.

This module detects such cumulative drift by:

1. Scanning all current entries for keyword clusters in security-sensitive
   categories (testing, auth, validation, review).
2. Counting entries that weaken vs. strengthen each category.
3. Flagging categories where weakening entries dominate.

Run periodically (e.g., after bulk imports or monitor ingestion) to detect
gradual drift before it affects agent behavior.

Reference: REVIEW.md Vuln 8.3.3 — Context Window Cumulative Bias Amplification.
"""

from __future__ import annotations

import logging
import re
from collections import Counter
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


# Security-sensitive categories and their keyword patterns.
# Each category has "weakening" patterns (entries that reduce security/quality)
# and "strengthening" patterns (entries that increase it).
_COHERENCE_CATEGORIES: dict[str, dict[str, list[str]]] = {
    "testing": {
        "weakening": [
            r"speed\s+(?:is\s+)?more\s+important\s+than\s+(?:test|coverage)",
            r"(?:skip|reduce|minimize)\s+test",
            r"(?:don'?t|no)\s+need\s+(?:to\s+)?test",
            r"testing\s+(?:slows?|blocks?|delays?)",
            r"(?:100|full|complete)\s+%?\s*coverage\s+(?:is\s+)?(?:un(?:necessary|realistic)|waste)",
        ],
        "strengthening": [
            r"(?:always|must|require)\s+(?:run\s+)?tests?",
            r"test\s+(?:first|driven|coverage)",
            r"quality\s+(?:gates?|checks?)",
            r"self-healing\s+(?:quality|test)",
        ],
    },
    "authentication": {
        "weakening": [
            r"(?:skip|bypass|disable)\s+auth",
            r"(?:staging|dev|internal)\s+(?:doesn'?t?|don'?t)\s+need\s+(?:full\s+)?auth",
            r"trust\s+(?:client|user)[\s-]+provided",
            r"(?:simplify|relax)\s+auth",
        ],
        "strengthening": [
            r"zero[\s-]?trust",
            r"(?:always|must|require)\s+auth(?:enticate)?",
            r"(?:mTLS|OAuth|JWT|RBAC)\s+(?:required|enforced)",
        ],
    },
    "input_validation": {
        "weakening": [
            r"(?:skip|don'?t|no\s+need)\s+(?:for\s+)?(?:input\s+)?validation",
            r"internal\s+(?:api|traffic|service)s?\s+(?:can|should)\s+skip",
            r"trust\s+internal\s+(?:input|data|traffic)",
        ],
        "strengthening": [
            r"validate\s+(?:all|every|each)\s+input",
            r"(?:never|don'?t)\s+trust\s+(?:user|client|external)\s+input",
            r"sanitize\s+(?:before|prior)",
        ],
    },
    "code_review": {
        "weakening": [
            r"(?:skip|bypass|auto[\s-]?approve)\s+(?:code\s+)?review",
            r"review\s+(?:slows?|blocks?|delays?)",
            r"(?:auto|automatic)\s+(?:merge|approve)",
            r"velocity\s+(?:over|more\s+important\s+than)\s+review",
        ],
        "strengthening": [
            r"(?:always|must|require)\s+(?:code\s+)?review",
            r"adversarial\s+review",
            r"peer\s+review",
        ],
    },
    "error_handling": {
        "weakening": [
            r"(?:return|expose|include)\s+(?:full\s+)?stack\s+traces?",
            r"(?:expose|return)\s+(?:env(?:ironment)?\s+var|internal\s+error)",
            r"verbose\s+errors?\s+(?:in|to)\s+(?:prod|client|response)",
        ],
        "strengthening": [
            r"(?:sanitize|redact|filter)\s+error",
            r"(?:generic|safe)\s+error\s+(?:message|response)",
            r"(?:never|don'?t)\s+expose\s+(?:stack|internal|env)",
        ],
    },
}


@dataclass
class BiasSignal:
    """A detected bias in a coherence category."""
    category: str
    weakening_count: int
    strengthening_count: int
    ratio: float  # weakening / (weakening + strengthening), 0.0 = all strengthening
    sample_weakening_titles: list[str] = field(default_factory=list)


@dataclass
class CoherenceReport:
    """Result of a Brain coherence analysis."""
    total_entries_scanned: int
    biased_categories: list[BiasSignal] = field(default_factory=list)
    is_coherent: bool = True
    summary: str = ""

    @property
    def has_concerns(self) -> bool:
        return len(self.biased_categories) > 0


# Threshold: if weakening entries exceed this ratio, flag the category
_BIAS_THRESHOLD = 0.6  # 60%+ weakening = biased


def analyze_coherence(store) -> CoherenceReport:
    """Analyze Brain entries for cumulative bias drift.

    Scans all current entries and checks whether security-sensitive
    categories have accumulated entries that collectively weaken
    the system's posture.

    Args:
        store: A BrainStore instance (or any object with list_entries()).

    Returns:
        CoherenceReport with flagged categories and bias signals.
    """
    entries = store.list_entries(current_only=True)
    biased: list[BiasSignal] = []

    for category, patterns in _COHERENCE_CATEGORIES.items():
        weakening_entries: list[str] = []
        strengthening_count = 0

        for entry in entries:
            text = f"{entry.title} {entry.content}".lower()

            # Check weakening patterns
            is_weakening = False
            for pat in patterns["weakening"]:
                if re.search(pat, text, re.IGNORECASE):
                    is_weakening = True
                    weakening_entries.append(entry.title)
                    break

            if is_weakening:
                continue

            # Check strengthening patterns
            for pat in patterns["strengthening"]:
                if re.search(pat, text, re.IGNORECASE):
                    strengthening_count += 1
                    break

        total = len(weakening_entries) + strengthening_count
        if total == 0:
            continue

        ratio = len(weakening_entries) / total

        if ratio >= _BIAS_THRESHOLD and len(weakening_entries) >= 2:
            biased.append(BiasSignal(
                category=category,
                weakening_count=len(weakening_entries),
                strengthening_count=strengthening_count,
                ratio=ratio,
                sample_weakening_titles=weakening_entries[:5],
            ))

    is_coherent = len(biased) == 0
    summary_parts = []
    if biased:
        for b in biased:
            summary_parts.append(
                f"  {b.category}: {b.weakening_count} weakening vs "
                f"{b.strengthening_count} strengthening ({b.ratio:.0%} weakening)"
            )
        summary = (
            f"COHERENCE WARNING: {len(biased)} category(ies) show bias drift:\n"
            + "\n".join(summary_parts)
        )
    else:
        summary = f"Brain coherence OK — {len(entries)} entries scanned, no bias detected."

    report = CoherenceReport(
        total_entries_scanned=len(entries),
        biased_categories=biased,
        is_coherent=is_coherent,
        summary=summary,
    )

    if not is_coherent:
        logger.warning(report.summary)
    else:
        logger.info(report.summary)

    return report
