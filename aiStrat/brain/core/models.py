"""Data models for the Fleet Brain.

Defines the core types: entries (the atomic unit of knowledge),
entry links (relationships between entries), and supporting enums.

v4: Added ALLOWED_METADATA_KEYS whitelist, provenance field,
    superseded_at timestamp, typed metadata.

Reference: admiral/part5-brain.md, Section 15.
"""

from __future__ import annotations

import uuid
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

# Metadata key whitelist — only these keys are stored. Unknown keys are stripped.
# Reference: REVIEW.md Section 8.1.6 — Metadata schema poisoning (MEDIUM fix).
ALLOWED_METADATA_KEYS: frozenset[str] = frozenset({
    "tags",
    "source_url",
    "confidence",
    "verified_date",
    "speculative",
    "provenance",
    "tool_version",
    "model_name",
    "benchmark_scores",
    "scan_date",
    "finding_type",
    "scan_source",
})


class EntryCategory(Enum):
    """What kind of knowledge an entry captures."""

    DECISION = "decision"
    OUTCOME = "outcome"
    LESSON = "lesson"
    CONTEXT = "context"
    FAILURE = "failure"
    PATTERN = "pattern"


class LinkType(Enum):
    """Relationship between two entries in the knowledge graph."""

    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    SUPERSEDES = "supersedes"
    ELABORATES = "elaborates"
    CAUSED_BY = "caused_by"


class AuthorityTier(Enum):
    """Decision authority tier that produced the entry."""

    ENFORCED = "enforced"
    AUTONOMOUS = "autonomous"
    PROPOSE = "propose"
    ESCALATE = "escalate"


@dataclass
class Entry:
    """The atomic unit of knowledge in the Brain.

    An entry records a decision, outcome, lesson, context snapshot,
    failure mode, or reusable pattern — with semantic embedding for
    vector search.
    """

    # Classification
    project: str
    category: EntryCategory
    title: str
    content: str

    # Identity — UUID string in standard 8-4-4-4-12 format for Postgres compatibility.
    # Timestamps are Unix floats in-memory; the Postgres adapter converts to TIMESTAMPTZ.
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    # Semantic search
    embedding: Optional[list[float]] = None

    # Metadata — only ALLOWED_METADATA_KEYS are stored
    metadata: dict = field(default_factory=dict)

    # Provenance — tracks entry origin for trust weighting
    source_agent: Optional[str] = None
    source_session: Optional[str] = None
    authority_tier: Optional[AuthorityTier] = None
    provenance: str = "agent"  # one of: human, seed, monitor, agent, system

    # Strengthening
    access_count: int = 0
    usefulness: int = 0
    superseded_by: Optional[str] = None
    superseded_at: Optional[float] = None

    @property
    def is_current(self) -> bool:
        """True if this entry has not been superseded."""
        return self.superseded_by is None

    @property
    def age_days(self) -> float:
        """Days since this entry was created."""
        return (time.time() - self.created_at) / 86400


@dataclass
class EntryLink:
    """A directed relationship between two entries."""

    source_id: str
    target_id: str
    link_type: LinkType
    created_at: float = field(default_factory=time.time)


@dataclass
class ScoredEntry:
    """An entry returned from a query with its relevance score."""

    entry: Entry
    score: float
