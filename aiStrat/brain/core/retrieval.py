"""Six-signal ranked retrieval pipeline for the Fleet Brain.

Implements the retrieval ranking from admiral/part5-brain.md, Section 17:

1. Semantic similarity (cosine distance) — primary signal
2. Project relevance — current project entries rank higher
3. Recency — newer entries rank higher when similarity is close
4. Usefulness — higher net usefulness scores rank higher
5. Currency — superseded entries excluded by default
6. Category match — implied category from query boosts matching entries

Reference: admiral/part5-brain.md, Sections 15 and 17.
"""

from __future__ import annotations

import time
from typing import Optional

from .embeddings import EmbeddingProvider, cosine_similarity
from .models import Entry, EntryCategory, ScoredEntry
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
    "error": EntryCategory.FAILURE,
    "pattern": EntryCategory.PATTERN,
    "approach": EntryCategory.PATTERN,
    "best practice": EntryCategory.PATTERN,
    "context": EntryCategory.CONTEXT,
    "environment": EntryCategory.CONTEXT,
    "stack": EntryCategory.CONTEXT,
}

# Tuning weights for combining signals
WEIGHT_SIMILARITY = 0.50
WEIGHT_PROJECT = 0.15
WEIGHT_RECENCY = 0.10
WEIGHT_USEFULNESS = 0.10
WEIGHT_CATEGORY = 0.15


def _infer_category(query: str) -> Optional[EntryCategory]:
    """Attempt to infer an entry category from query text."""
    query_lower = query.lower()
    for hint, category in _CATEGORY_HINTS.items():
        if hint in query_lower:
            return category
    return None


def _recency_score(entry: Entry, max_age_days: float = 180.0) -> float:
    """Score from 0.0 to 1.0 based on how recent the entry is.

    Entries created today score 1.0. Entries older than max_age_days score 0.0.
    """
    age = entry.age_days
    if age >= max_age_days:
        return 0.0
    return 1.0 - (age / max_age_days)


def _usefulness_score(entry: Entry, max_usefulness: int = 50) -> float:
    """Normalize usefulness to 0.0–1.0 range.

    Caps at max_usefulness to prevent a single entry from dominating.
    """
    if max_usefulness == 0:
        return 0.5
    clamped = max(0, min(entry.usefulness, max_usefulness))
    return clamped / max_usefulness


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

    Applies six ranking signals:
    1. Semantic similarity (cosine)
    2. Project relevance boost
    3. Recency
    4. Usefulness
    5. Currency (superseded filtering)
    6. Category match boost

    Returns scored entries sorted by combined score, descending.
    """
    # Get the query embedding
    query_embedding = embedding_provider.embed(query_text)

    # Fetch candidate entries
    candidates = store.list_entries(
        project=None,  # Fetch all, we'll score project relevance
        category=category,
        current_only=current_only,
    )

    if not candidates:
        return []

    # Infer category from query if not explicitly provided
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

        # Signal 4: Usefulness
        usefulness = _usefulness_score(entry)

        # Signal 5: Currency (already filtered by current_only above)
        # No additional scoring needed — superseded entries are excluded

        # Signal 6: Category match
        category_boost = 0.0
        if inferred_category and entry.category == inferred_category:
            category_boost = 1.0

        # Combine signals
        combined = (
            WEIGHT_SIMILARITY * sim
            + WEIGHT_PROJECT * project_boost
            + WEIGHT_RECENCY * recency
            + WEIGHT_USEFULNESS * usefulness
            + WEIGHT_CATEGORY * category_boost
        )

        scored.append(ScoredEntry(entry=entry, score=combined))

        # Track access
        store.increment_access(entry.id)

    # Sort by combined score, descending
    scored.sort(key=lambda s: s.score, reverse=True)

    return scored[:limit]
