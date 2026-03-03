"""Fleet Brain initialization and wiring.

Creates and wires together all Brain components. Follows the same
bootstrap pattern as broker/services/bootstrap.py.

Usage:
    from brain.services.bootstrap import bootstrap
    brain = bootstrap()  # In-memory mode
    brain.server.brain_record(project="myproject", ...)
"""

from __future__ import annotations

from dataclasses import dataclass

from ..core.embeddings import EmbeddingProvider, MockEmbeddingProvider
from ..core.store import BrainStore
from ..mcp.server import BrainServer


@dataclass
class Brain:
    """Container for all Brain components."""

    store: BrainStore
    embeddings: EmbeddingProvider
    server: BrainServer


def bootstrap(
    embedding_provider: EmbeddingProvider | None = None,
) -> Brain:
    """Wire up and return a fully-initialized Brain.

    Args:
        embedding_provider: Custom embedding provider. Defaults to
            MockEmbeddingProvider for development/testing.

    Returns:
        Brain container with store, embeddings, and MCP server.
    """
    store = BrainStore()
    embeddings = embedding_provider or MockEmbeddingProvider()
    server = BrainServer(store=store, embedding_provider=embeddings)

    return Brain(
        store=store,
        embeddings=embeddings,
        server=server,
    )
