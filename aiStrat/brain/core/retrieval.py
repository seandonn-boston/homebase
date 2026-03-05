"""Eight-signal ranked retrieval pipeline for the Fleet Brain.

1. Semantic similarity (cosine distance) — primary signal
2. Project relevance — current project entries rank higher
3. Recency — newer entries rank higher when similarity is close
4. Usefulness — higher net usefulness scores rank higher (bounded)
5. Currency — superseded entries excluded by default
6. Category match — inferred category from query boosts matching entries
7. Provenance — human/seed entries weighted higher than monitor/agent
8. Speculative discount — entries marked speculative are penalized
"""

from __future__ import annotations

import re
import time
from collections import Counter
from typing import Optional

from .embeddings import EmbeddingProvider, cosine_similarity
from .models import Entry, EntryCategory, Provenance, ScoredEntry
from .store import BrainStore


# Category hint keywords — maps query terms to likely categories
_CATEGORY_HINTS: dict[str, EntryCategory] = {
    "decided": EntryCategory.DECISION,
    "chose": EntryCategory.DECISION,
    "decision": EntryCategory.DECISION,
    "why did we": EntryCategory.DECISION,
    "result": EntryCategory.OUTCOME,
    "outcome": EntryCategory.OUTCOME,
    "happened": EntryCategory.OUTCOME,
    "lesson": EntryCategory.LESSON,
    "learned": EntryCategory.LESSON,
    "mistake": EntryCategory.LESSON,
    "failed": EntryCategory.FAILURE,
    "failure": EntryCategory.FAILURE,
    "went wrong": EntryCategory.FAILURE,
    "broke": EntryCategory.FAILURE,
    "pattern": EntryCategory.PATTERN,
    "approach": EntryCategory.PATTERN,
    "best practice": EntryCategory.PATTERN,
    "context": EntryCategory.CONTEXT,
    "environment": EntryCategory.CONTEXT,
    "stack": EntryCategory.CONTEXT,
}

# "error" removed from hints — too broad (matches "error handling", "error recovery")
# Use "went wrong" or "failure" for explicit failure queries.

# Tuning weights for combining signals
WEIGHT_SIMILARITY = 0.45
WEIGHT_PROJECT = 0.15
WEIGHT_RECENCY = 0.05
WEIGHT_USEFULNESS = 0.10
WEIGHT_CATEGORY = 0.10
WEIGHT_PROVENANCE = 0.05
WEIGHT_SPECULATIVE = 0.10  # Penalty applied to entries with speculative metadata

# Speculative penalty — entries marked speculative=True get this multiplier
# (0.0 = fully discounted, 1.0 = no discount). 0.3 means speculative entries
# contribute only 30% of the speculative weight, vs 100% for verified entries.
_SPECULATIVE_DISCOUNT = 0.3

# Provenance trust scores (0.0 to 1.0)
_PROVENANCE_SCORES: dict[Provenance, float] = {
    Provenance.HUMAN: 1.0,
    Provenance.SEED: 0.8,
    Provenance.SYSTEM: 0.7,
    Provenance.AGENT: 0.5,
    Provenance.MONITOR: 0.3,
}

# Max entries per category in results (diversity enforcement)
_MAX_PER_CATEGORY = 3


def _infer_category(query: str) -> Optional[EntryCategory]:
    """Attempt to infer an entry category from query text.

    Uses word-boundary matching to prevent false positives
    (e.g., "error handling strategy" should NOT match "error" → FAILURE).
    """
    query_lower = query.lower()
    for hint, category in _CATEGORY_HINTS.items():
        if re.search(r'\b' + re.escape(hint) + r'\b', query_lower):
            return category
    return None


def _recency_score(entry: Entry, max_age_days: float = 180.0) -> float:
    """Score from 0.0 to 1.0 based on how recent the entry is."""
    age = entry.age_days
    if age >= max_age_days:
        return 0.0
    return 1.0 - (age / max_age_days)


def _usefulness_score(entry: Entry, max_usefulness: int = 50) -> float:
    """Normalize usefulness to 0.0–1.0 range.

    Preserves negative signal: negative usefulness maps to [0.0, 0.5),
    zero maps to 0.5, positive maps to (0.5, 1.0].
    """
    if max_usefulness == 0:
        return 0.5
    clamped = max(-max_usefulness, min(entry.usefulness, max_usefulness))
    # Map [-max, +max] to [0.0, 1.0]
    return (clamped + max_usefulness) / (2 * max_usefulness)


def _provenance_score(entry: Entry) -> float:
    """Score based on entry provenance (source trust).

    Unknown provenance values get 0.0 (untrusted), not 0.3.
    """
    return _PROVENANCE_SCORES.get(entry.provenance, 0.0)


def _speculative_score(entry: Entry) -> float:
    """Score based on whether the entry is marked as speculative.

    Returns 1.0 for verified entries (no speculative flag or speculative=False).
    Returns _SPECULATIVE_DISCOUNT for entries with speculative=True.
    This ensures unverified claims (model benchmarks, market stats) are
    ranked below verified knowledge in retrieval results.
    """
    is_speculative = entry.metadata.get("speculative", False)
    if is_speculative is True or is_speculative == "true":
        return _SPECULATIVE_DISCOUNT
    return 1.0


def _enforce_diversity(scored: list[ScoredEntry], limit: int) -> list[ScoredEntry]:
    """Enforce category diversity in results.

    No more than _MAX_PER_CATEGORY entries from any single category.
    When a category exceeds the limit, the lowest-scoring entry from
    that category is replaced with the next-best from an
    underrepresented category.
    """
    if len(scored) <= limit:
        return scored

    result: list[ScoredEntry] = []
    category_counts: Counter[str] = Counter()
    overflow: list[ScoredEntry] = []

    for entry in scored:
        cat = entry.entry.category.value
        if category_counts[cat] < _MAX_PER_CATEGORY:
            result.append(entry)
            category_counts[cat] += 1
            if len(result) >= limit:
                break
        else:
            overflow.append(entry)

    # Fill remaining slots from overflow if we haven't hit limit
    while len(result) < limit and overflow:
        result.append(overflow.pop(0))

    return result


def query(
    store: BrainStore,
    embedding_provider: EmbeddingProvider,
    query_text: str,
    project: Optional[str] = None,
    category: Optional[EntryCategory] = None,
    limit: int = 10,
    min_score: float = 0.7,
    current_only: bool = True,
) -> list[ScoredEntry]:
    """Execute a ranked retrieval query against the Brain.

    Applies eight ranking signals and enforces result diversity.
    """
    query_embedding = embedding_provider.embed(query_text)

    candidates = store.list_entries(
        project=project,
        category=category,
        current_only=current_only,
    )

    if not candidates:
        return []

    inferred_category = category or _infer_category(query_text)

    scored: list[ScoredEntry] = []

    for entry in candidates:
        if entry.embedding is None:
            continue

        # Signal 1: Semantic similarity
        sim = cosine_similarity(query_embedding, entry.embedding)
        if sim < min_score:
            continue

        # Signal 2: Project relevance
        project_boost = 1.0 if (project and entry.project == project) else 0.0

        # Signal 3: Recency
        recency = _recency_score(entry)

        # Signal 4: Usefulness (bounded, preserves negative signal)
        usefulness = _usefulness_score(entry)

        # Signal 5: Currency (already filtered above)

        # Signal 6: Category match
        category_boost = 0.0
        if inferred_category and entry.category == inferred_category:
            category_boost = 1.0

        # Signal 7: Provenance trust
        provenance = _provenance_score(entry)

        # Signal 8: Speculative discount
        speculative = _speculative_score(entry)

        # Combine signals
        combined = (
            WEIGHT_SIMILARITY * sim
            + WEIGHT_PROJECT * project_boost
            + WEIGHT_RECENCY * recency
            + WEIGHT_USEFULNESS * usefulness
            + WEIGHT_CATEGORY * category_boost
            + WEIGHT_PROVENANCE * provenance
            + WEIGHT_SPECULATIVE * speculative
        )

        scored.append(ScoredEntry(entry=entry, score=combined))

    # Sort by combined score, descending
    scored.sort(key=lambda s: s.score, reverse=True)

    # Apply diversity enforcement
    results = _enforce_diversity(scored, limit)

    # Increment access counts ONLY for entries actually returned
    for se in results:
        store.increment_access(se.entry.id)

    return results
