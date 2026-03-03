"""MCP server exposing the six Brain tools.

Implements the Knowledge Protocol from admiral/part5-brain.md, Section 16.

Tools:
  brain_record     — Record a new entry
  brain_query      — Semantic search across entries
  brain_retrieve   — Fetch entry by ID with link graph
  brain_strengthen — Signal usefulness of a retrieved entry
  brain_supersede  — Mark an entry as superseded
  brain_status     — Health and statistics

This module provides the tool definitions and handlers. The actual MCP
transport (stdio, HTTP, etc.) is handled by the MCP SDK at the call site.
"""

from __future__ import annotations

from typing import Any, Optional

from ..core.embeddings import EmbeddingProvider
from ..core.models import (
    AuthorityTier,
    Entry,
    EntryCategory,
    EntryLink,
    LinkType,
    ScoredEntry,
)
from ..core.retrieval import query as retrieval_query
from ..core.store import BrainStore


class BrainServer:
    """Handler for all six Brain MCP tools.

    Wraps the store, embedding provider, and retrieval pipeline
    behind the MCP tool interface defined in Section 16.
    """

    def __init__(self, store: BrainStore, embedding_provider: EmbeddingProvider) -> None:
        self._store = store
        self._embeddings = embedding_provider

    # ── brain_record ──────────────────────────────────────────

    def brain_record(
        self,
        project: str,
        category: str,
        title: str,
        content: str,
        metadata: Optional[dict] = None,
        links: Optional[list[dict]] = None,
        source_agent: Optional[str] = None,
        source_session: Optional[str] = None,
        authority_tier: Optional[str] = None,
    ) -> dict[str, str]:
        """Record a new entry in the Brain.

        Returns: {"id": entry_id}
        """
        cat = EntryCategory(category)
        tier = AuthorityTier(authority_tier) if authority_tier else None

        # Generate embedding from title + content
        embedding = self._embeddings.embed(f"{title} {content}")

        entry = Entry(
            project=project,
            category=cat,
            title=title,
            content=content,
            embedding=embedding,
            metadata=metadata or {},
            source_agent=source_agent,
            source_session=source_session,
            authority_tier=tier,
        )

        entry_id = self._store.add_entry(entry)

        # Create any requested links
        if links:
            for link_spec in links:
                self._store.add_link(EntryLink(
                    source_id=entry_id,
                    target_id=link_spec["target_id"],
                    link_type=LinkType(link_spec["link_type"]),
                ))

        return {"id": entry_id}

    # ── brain_query ───────────────────────────────────────────

    def brain_query(
        self,
        query: str,
        project: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10,
        min_score: float = 0.7,
        current_only: bool = True,
    ) -> list[dict[str, Any]]:
        """Semantic search across entries.

        Returns: ranked entries with similarity scores.
        """
        cat = EntryCategory(category) if category else None

        scored = retrieval_query(
            store=self._store,
            embedding_provider=self._embeddings,
            query_text=query,
            project=project,
            category=cat,
            limit=limit,
            min_score=min_score,
            current_only=current_only,
        )

        return [_serialize_scored(s) for s in scored]

    # ── brain_retrieve ────────────────────────────────────────

    def brain_retrieve(
        self,
        id: str,
        depth: int = 1,
    ) -> dict[str, Any]:
        """Fetch a specific entry by ID, including its link graph.

        Returns: entry with linked entries.
        """
        entry = self._store.get_entry(id)
        if not entry:
            raise ValueError(f"Entry not found: {id}")

        links = self._store.get_links(id, depth=depth)

        # Collect linked entry IDs
        linked_ids = set()
        for link in links:
            linked_ids.add(link.source_id)
            linked_ids.add(link.target_id)
        linked_ids.discard(id)

        linked_entries = []
        for lid in linked_ids:
            linked_entry = self._store.get_entry(lid)
            if linked_entry:
                linked_entries.append(_serialize_entry(linked_entry))

        # Track access
        self._store.increment_access(id)

        result = _serialize_entry(entry)
        result["links"] = [_serialize_link(link) for link in links]
        result["linked_entries"] = linked_entries
        return result

    # ── brain_strengthen ──────────────────────────────────────

    def brain_strengthen(
        self,
        id: str,
        useful: bool,
        context: Optional[str] = None,
    ) -> dict[str, Any]:
        """Signal that a retrieved entry was useful (or not).

        Returns: {"id": entry_id, "usefulness": updated_score}
        """
        new_score = self._store.adjust_usefulness(id, useful)
        return {"id": id, "usefulness": new_score}

    # ── brain_supersede ───────────────────────────────────────

    def brain_supersede(
        self,
        old_id: str,
        new_id: str,
        reason: Optional[str] = None,
    ) -> dict[str, str]:
        """Mark an entry as superseded by a new one.

        Returns: {"old_id": ..., "new_id": ..., "status": "superseded"}
        """
        self._store.supersede(old_id, new_id)
        return {"old_id": old_id, "new_id": new_id, "status": "superseded"}

    # ── brain_status ──────────────────────────────────────────

    def brain_status(
        self,
        project: Optional[str] = None,
    ) -> dict[str, Any]:
        """Health and statistics for the Brain.

        Returns: entry counts by category, avg usefulness,
        access patterns, storage metrics.
        """
        return self._store.status(project=project)


# ── Serialization helpers ─────────────────────────────────────


def _serialize_entry(entry: Entry) -> dict[str, Any]:
    """Convert an Entry to a JSON-serializable dict."""
    return {
        "id": entry.id,
        "project": entry.project,
        "category": entry.category.value,
        "title": entry.title,
        "content": entry.content,
        "source_agent": entry.source_agent,
        "source_session": entry.source_session,
        "authority_tier": entry.authority_tier.value if entry.authority_tier else None,
        "access_count": entry.access_count,
        "usefulness": entry.usefulness,
        "superseded_by": entry.superseded_by,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
    }


def _serialize_scored(scored: ScoredEntry) -> dict[str, Any]:
    """Convert a ScoredEntry to a JSON-serializable dict."""
    result = _serialize_entry(scored.entry)
    result["score"] = round(scored.score, 4)
    return result


def _serialize_link(link: EntryLink) -> dict[str, Any]:
    """Convert an EntryLink to a JSON-serializable dict."""
    return {
        "source_id": link.source_id,
        "target_id": link.target_id,
        "link_type": link.link_type.value,
    }
