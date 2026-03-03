"""Pluggable embedding generation for the Fleet Brain.

Defines the EmbeddingProvider protocol and implementations:
- MockEmbeddingProvider: deterministic embeddings for testing
- OpenAIEmbeddingProvider: real embeddings via OpenAI API

Reference: admiral/part5-brain.md, Section 17 (Embed stage).
"""

from __future__ import annotations

import hashlib
import math
from typing import Protocol


EMBEDDING_DIMENSIONS = 1536


class EmbeddingProvider(Protocol):
    """Interface for generating vector embeddings from text.

    Any implementation must produce vectors of EMBEDDING_DIMENSIONS length.
    The embedding model is a utility-tier concern (Section 13) — small, fast, cheap.
    """

    def embed(self, text: str) -> list[float]:
        """Generate a vector embedding for the given text."""
        ...


class MockEmbeddingProvider:
    """Deterministic embedding provider for testing.

    Produces consistent embeddings derived from text hashing.
    Not semantically meaningful, but stable and fast.
    """

    def embed(self, text: str) -> list[float]:
        """Generate a deterministic pseudo-embedding from text hash."""
        digest = hashlib.sha512(text.encode()).hexdigest()
        # Extend the hash to fill the embedding dimensions
        raw = []
        for i in range(EMBEDDING_DIMENSIONS):
            byte_val = int(digest[(i * 2) % len(digest):(i * 2) % len(digest) + 2], 16)
            raw.append((byte_val / 255.0) * 2 - 1)  # Scale to [-1, 1]
        # Normalize to unit vector
        magnitude = math.sqrt(sum(x * x for x in raw))
        if magnitude == 0:
            return raw
        return [x / magnitude for x in raw]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)
