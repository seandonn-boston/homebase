"""Pluggable embedding generation for the Fleet Brain.

Defines the EmbeddingProvider protocol and implementations:
- MockEmbeddingProvider: deterministic embeddings for testing (no semantic capability)
- OpenAIEmbeddingProvider: real semantic embeddings via OpenAI API
"""

from __future__ import annotations

import hashlib
import logging
import math
from typing import Protocol

logger = logging.getLogger(__name__)

EMBEDDING_DIMENSIONS = 1536  # text-embedding-3-small default


class EmbeddingProvider(Protocol):
    """Interface for generating vector embeddings from text.

    Implementations must produce unit-normalized vectors of EMBEDDING_DIMENSIONS length.
    """

    def embed(self, text: str) -> list[float]:
        """Generate a vector embedding for the given text."""
        ...


class MockEmbeddingProvider:
    """Deterministic embedding provider for testing only.

    Produces consistent embeddings derived from text hashing.
    NOT semantically meaningful — cosine similarity between these vectors
    does not reflect semantic similarity between inputs. Use only in tests.
    """

    def embed(self, text: str) -> list[float]:
        """Generate a deterministic pseudo-embedding from text hash."""
        digest = hashlib.sha512(text.encode()).hexdigest()
        raw = []
        for i in range(EMBEDDING_DIMENSIONS):
            byte_val = int(digest[(i * 2) % len(digest):(i * 2) % len(digest) + 2], 16)
            raw.append((byte_val / 255.0) * 2 - 1)
        magnitude = math.sqrt(sum(x * x for x in raw))
        if magnitude == 0:
            return raw
        return [x / magnitude for x in raw]


class OpenAIEmbeddingProvider:
    """Real semantic embeddings via OpenAI's text-embedding-3-small.

    Produces vectors where cosine similarity reflects genuine semantic
    relatedness between inputs. Requires the `openai` package and a
    valid OPENAI_API_KEY environment variable.

    Usage:
        provider = OpenAIEmbeddingProvider()  # uses text-embedding-3-small
        vec = provider.embed("database connection pooling")
    """

    def __init__(self, model: str = "text-embedding-3-small") -> None:
        try:
            import openai  # type: ignore[import-untyped]
        except ImportError:
            raise ImportError(
                "OpenAI package required for real embeddings. "
                "Install with: pip install 'aistrat[openai]'"
            ) from None
        self._client = openai.OpenAI()
        self._model = model
        logger.info("OpenAIEmbeddingProvider initialized (model=%s)", model)

    def embed(self, text: str) -> list[float]:
        """Generate a real semantic embedding via OpenAI API.

        Includes a 30-second timeout to prevent indefinite blocking.
        """
        if not text.strip():
            return [0.0] * EMBEDDING_DIMENSIONS

        try:
            response = self._client.embeddings.create(
                input=text,
                model=self._model,
                dimensions=EMBEDDING_DIMENSIONS,
                timeout=30.0,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error("Embedding request failed: %s", e)
            raise


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)
