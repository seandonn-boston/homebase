"""Proof that semantic retrieval works with real embeddings.

This test demonstrates that the Brain's retrieval pipeline returns
semantically relevant results — not random matches. It requires
the openai package and OPENAI_API_KEY environment variable.

Run with: pytest aiStrat/brain/tests/test_semantic_retrieval.py -v

If OPENAI_API_KEY is not set, all tests are skipped (not failed).
"""

from __future__ import annotations

import os

import pytest

# Skip entire module if no API key
pytestmark = pytest.mark.skipif(
    not os.environ.get("OPENAI_API_KEY"),
    reason="OPENAI_API_KEY not set — skipping semantic retrieval tests",
)


@pytest.fixture
def brain():
    """Bootstrap a Brain with real OpenAI embeddings."""
    from brain.core.embeddings import OpenAIEmbeddingProvider
    from brain.mcp.auth import Scope
    from brain.services.bootstrap import bootstrap

    return bootstrap(
        embedding_provider=OpenAIEmbeddingProvider(),
        api_keys={"test-key": ("test-user", Scope.ADMIN)},
        strict_mode=False,
    )


TOKEN = "test-key"


def _record(brain, title: str, content: str, category: str = "pattern"):
    """Helper to record an entry."""
    result = brain.server.brain_record(
        project="test", category=category, title=title,
        content=content, token=TOKEN, provenance="seed",
    )
    assert "id" in result, f"Record failed: {result}"
    return result["id"]


def test_semantic_similarity_ranks_relevant_results_higher(brain):
    """The core value proposition: related queries find related entries."""
    # Seed entries on different topics
    _record(brain, "Database connection pooling",
            "Use connection pools to reuse database connections and reduce latency. "
            "Configure pool size based on expected concurrent queries.")
    _record(brain, "CSS grid layout patterns",
            "CSS grid enables two-dimensional layouts. Use grid-template-columns "
            "and grid-template-rows for responsive designs.")
    _record(brain, "Python async event loops",
            "asyncio provides an event loop for concurrent I/O operations. "
            "Use async/await syntax for non-blocking code.")
    _record(brain, "SQL query optimization",
            "Add indexes on frequently queried columns. Use EXPLAIN ANALYZE "
            "to identify slow query plans. Avoid SELECT * in production.")

    # Query about databases — should rank database entries above CSS/Python
    results = brain.server.brain_query(
        query="How should I optimize my database queries?",
        token=TOKEN, min_score=0.0, limit=4,
    )

    assert len(results) >= 2, f"Expected at least 2 results, got {len(results)}"

    # Top 2 results should be the database-related entries
    top_titles = {r["title"] for r in results[:2]}
    assert "SQL query optimization" in top_titles, (
        f"Expected 'SQL query optimization' in top 2, got: {[r['title'] for r in results[:2]]}"
    )
    assert "Database connection pooling" in top_titles, (
        f"Expected 'Database connection pooling' in top 2, got: {[r['title'] for r in results[:2]]}"
    )

    # CSS should NOT be the top result for a database query
    assert results[0]["title"] != "CSS grid layout patterns", (
        "CSS entry should not rank first for a database query"
    )


def test_unrelated_query_scores_lower_than_related(brain):
    """Unrelated content has lower similarity than related content."""
    _record(brain, "Kubernetes pod autoscaling",
            "Configure HPA to scale pods based on CPU and memory utilization. "
            "Set resource requests and limits for predictable scaling.")
    _record(brain, "Renaissance painting techniques",
            "Chiaroscuro uses strong contrasts between light and dark. "
            "Sfumato creates soft transitions between colors and tones.")

    results = brain.server.brain_query(
        query="How do I scale my containers in production?",
        token=TOKEN, min_score=0.0, limit=2,
    )

    assert len(results) == 2
    # Kubernetes entry should score higher than renaissance art
    k8s = next(r for r in results if "Kubernetes" in r["title"])
    art = next(r for r in results if "Renaissance" in r["title"])
    assert k8s["score"] > art["score"], (
        f"Kubernetes ({k8s['score']}) should score higher than "
        f"Renaissance art ({art['score']}) for a container scaling query"
    )


def test_category_inference_combined_with_semantic(brain):
    """Category hints and semantic similarity work together."""
    _record(brain, "We chose React over Vue",
            "Decision: React selected for the frontend framework. "
            "Rationale: larger ecosystem, better TypeScript support.",
            category="decision")
    _record(brain, "React performance patterns",
            "Use React.memo and useMemo to avoid unnecessary re-renders. "
            "Virtualize long lists with react-window.",
            category="pattern")

    # Query with decision-category language
    results = brain.server.brain_query(
        query="What did we decide about the frontend framework?",
        token=TOKEN, min_score=0.0, limit=2,
    )

    assert len(results) == 2
    # Decision entry should rank first (semantic + category boost)
    assert results[0]["title"] == "We chose React over Vue", (
        f"Expected decision entry first, got: {results[0]['title']}"
    )
