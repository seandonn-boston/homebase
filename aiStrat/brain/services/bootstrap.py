"""Fleet Brain initialization and wiring.

Creates and wires together all Brain components including authentication,
quarantine enforcement, and audit trailing.

Usage:
    from brain.services.bootstrap import bootstrap
    brain = bootstrap(api_keys={"my-key": ("admin-user", Scope.ADMIN)})
    brain.server.brain_record(project="myproject", token="my-key", ...)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

from ..core.embeddings import EmbeddingProvider, MockEmbeddingProvider
from ..core.store import BrainStore
from ..mcp.auth import APIKeyAuthProvider, AuthProvider, NoAuthProvider, Scope
from ..mcp.server import BrainServer

logger = logging.getLogger(__name__)


@dataclass
class Brain:
    """Container for all Brain components."""

    store: BrainStore
    embeddings: EmbeddingProvider
    server: BrainServer


def _resolve_embeddings() -> EmbeddingProvider:
    """Attempt to create a real embedding provider, fall back to mock.

    Tries OpenAIEmbeddingProvider first (requires openai package + OPENAI_API_KEY).
    Falls back to MockEmbeddingProvider with a clear warning.
    """
    try:
        from ..core.embeddings import OpenAIEmbeddingProvider
        provider = OpenAIEmbeddingProvider()
        logger.info("Using OpenAIEmbeddingProvider (real semantic embeddings)")
        return provider
    except (ImportError, Exception) as e:
        logger.warning(
            "OpenAI embeddings unavailable (%s). Falling back to MockEmbeddingProvider. "
            "Semantic retrieval will NOT work — install 'aistrat[openai]' and set "
            "OPENAI_API_KEY for real embeddings.",
            e,
        )
        return MockEmbeddingProvider()


def bootstrap(
    embedding_provider: EmbeddingProvider | None = None,
    auth_provider: AuthProvider | None = None,
    api_keys: dict[str, tuple[str, Scope]] | None = None,
    strict_mode: bool = True,
) -> Brain:
    """Wire up and return a fully-initialized Brain.

    Args:
        embedding_provider: Custom embedding provider. If not provided,
            attempts OpenAIEmbeddingProvider, then falls back to Mock.
        auth_provider: Custom auth provider. If not provided, uses
            APIKeyAuthProvider with api_keys (if given) or NoAuthProvider
            with strict_mode=False for testing only.
        api_keys: Mapping of API keys to (identity, scope) tuples.
            Used to create APIKeyAuthProvider if auth_provider not given.
        strict_mode: If True (default), reject writes when quarantine
            is unavailable. Set False only for isolated testing.

    Returns:
        Brain container with store, embeddings, and MCP server.
    """
    store = BrainStore()
    embeddings = embedding_provider or _resolve_embeddings()

    # Resolve auth provider
    if auth_provider is not None:
        resolved_auth = auth_provider
    elif api_keys:
        resolved_auth = APIKeyAuthProvider(api_keys)
    elif not strict_mode:
        resolved_auth = NoAuthProvider()
    else:
        resolved_auth = None  # Server will reject all authenticated calls

    server = BrainServer(
        store=store,
        embedding_provider=embeddings,
        auth_provider=resolved_auth,
        strict_mode=strict_mode,
    )

    return Brain(
        store=store,
        embeddings=embeddings,
        server=server,
    )
