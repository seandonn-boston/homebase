"""MCP server exposing the Brain tools with authentication and quarantine.

Implements the Knowledge Protocol from admiral/part5-brain.md, Section 16.

Tools:
  brain_record     — Record a new entry (with quarantine validation)
  brain_query      — Semantic search across entries
  brain_retrieve   — Fetch entry by ID with link graph
  brain_strengthen — Signal usefulness of a retrieved entry
  brain_supersede  — Mark an entry as superseded (admin only)
  brain_status     — Health and statistics (unauthenticated)
  brain_audit      — Query audit trail (read scope)

All write operations pass through the immune system (quarantine module)
which validates content against prompt injection, XSS, SQL injection,
PII/secret exposure, authority spoofing, and data poisoning attacks.

v4: Added authentication, scoped authorization, metadata schema
    validation, and fail-closed quarantine.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

from ..core.embeddings import EmbeddingProvider
from ..core.models import (
    ALLOWED_METADATA_KEYS,
    AuthorityTier,
    Entry,
    EntryCategory,
    EntryLink,
    LinkType,
    Provenance,
    ScoredEntry,
)
from ..core.retrieval import query as retrieval_query
from ..core.store import BrainStore
from .auth import AuthContext, AuthenticationError, AuthorizationError, AuthProvider, Scope

logger = logging.getLogger(__name__)

# ── Quarantine availability (resolved at import time) ──────────────
_quarantine_available = False
_quarantine_fn = None
_ThreatLevel = None

try:
    from aiStrat.monitor.quarantine import quarantine as _quar_fn, ThreatLevel as _TL
    _quarantine_available = True
    _quarantine_fn = _quar_fn
    _ThreatLevel = _TL
except ImportError:
    logger.error(
        "Quarantine module not available. Brain will operate in "
        "strict mode (reject all writes) unless strict_mode=False."
    )


class BrainServer:
    """Handler for all Brain MCP tools.

    Wraps the store, embedding provider, and retrieval pipeline
    behind the MCP tool interface defined in Section 16.

    v4 changes:
    - Authentication required on all tools except brain_status
    - Scoped authorization: read/write/admin
    - Metadata schema validation with key whitelist
    - Fail-closed quarantine (strict_mode=True by default)
    """

    def __init__(
        self,
        store: BrainStore,
        embedding_provider: EmbeddingProvider,
        auth_provider: AuthProvider | None = None,
        strict_mode: bool = True,
    ) -> None:
        self._store = store
        self._embeddings = embedding_provider
        self._auth = auth_provider
        self._strict_mode = strict_mode

        if not _quarantine_available and self._strict_mode:
            logger.warning(
                "Quarantine unavailable + strict_mode=True: "
                "all brain_record calls will be rejected."
            )

    def _authenticate(self, token: str | None, required_scope: Scope) -> AuthContext:
        """Authenticate and authorize a request.

        Raises AuthenticationError or AuthorizationError.
        """
        if self._auth is None:
            raise AuthenticationError(
                "No auth provider configured. Set auth_provider in bootstrap."
            )

        if token is None:
            raise AuthenticationError("Authentication token required")

        ctx = self._auth.authenticate(token)

        if not ctx.scope.includes(required_scope):
            raise AuthorizationError(
                f"Scope '{ctx.scope.value}' insufficient; "
                f"'{required_scope.value}' required"
            )

        return ctx

    @staticmethod
    def _sanitize_metadata(metadata: dict | None) -> dict:
        """Strip unknown keys from metadata and enforce schema.

        Only keys in ALLOWED_METADATA_KEYS are retained.
        Unknown keys are logged at WARNING level.
        """
        if not metadata:
            return {}

        clean = {}
        stripped = []
        for key, value in metadata.items():
            if key in ALLOWED_METADATA_KEYS:
                clean[key] = value
            else:
                stripped.append(key)

        if stripped:
            logger.warning(
                "Stripped unknown metadata keys: %s", ", ".join(stripped)
            )

        return clean

    # ── brain_record ──────────────────────────────────────────

    def brain_record(
        self,
        project: str,
        category: str,
        title: str,
        content: str,
        token: str | None = None,
        metadata: Optional[dict] = None,
        links: Optional[list[dict]] = None,
        source_agent: Optional[str] = None,
        source_session: Optional[str] = None,
        authority_tier: Optional[str] = None,
        provenance: Optional[str] = None,
    ) -> dict[str, Any]:
        """Record a new entry in the Brain.

        Requires write scope. All entries pass through quarantine validation
        before admission. Hostile content is rejected and converted into
        antibody (FAILURE) entries.

        Returns:
            {"id": entry_id} on success
            {"rejected": True, "reason": ..., "antibody_id": ...} if blocked
        """
        ctx = self._authenticate(token, Scope.WRITE)

        # ── Metadata schema validation ──
        metadata = self._sanitize_metadata(metadata)

        # ── Quarantine gate ──
        if not _quarantine_available:
            if self._strict_mode:
                logger.error(
                    "brain_record REJECTED: quarantine unavailable in strict mode "
                    "(caller=%s, title='%s')",
                    ctx.identity, title[:80],
                )
                return {
                    "rejected": True,
                    "reason": "Quarantine module unavailable; writes blocked in strict mode",
                    "threat_level": "system_error",
                }
            else:
                logger.warning(
                    "Quarantine unavailable, strict_mode=False: admitting without validation "
                    "(caller=%s, title='%s')",
                    ctx.identity, title[:80],
                )
        else:
            candidate = {
                "title": title,
                "content": content,
                "category": category,
                "metadata": metadata,
            }

            result = _quarantine_fn(candidate)

            if not result.should_admit:
                logger.warning(
                    "Quarantine REJECTED entry '%s': %s (level: %s, caller: %s)",
                    title[:80], result.threat_summary,
                    result.threat_level.value, ctx.identity,
                )

                response: dict[str, Any] = {
                    "rejected": True,
                    "reason": result.threat_summary,
                    "threat_level": result.threat_level.value,
                }

                # If hostile/critical, create an antibody entry
                if result.antibody:
                    antibody = result.antibody
                    antibody_entry = Entry(
                        project=antibody["project"],
                        category=EntryCategory(antibody["category"]),
                        title=antibody["title"],
                        content=antibody["content"],
                        embedding=self._embeddings.embed(
                            f"{antibody['title']} {antibody['content']}"
                        ),
                        metadata=antibody["metadata"],
                        source_agent=antibody.get("source_agent", "quarantine"),
                        source_session=antibody.get("source_session"),
                        provenance=Provenance.SYSTEM,
                    )
                    antibody_id = self._store.add_entry(antibody_entry)
                    response["antibody_id"] = antibody_id
                    logger.info("Antibody created: %s (caller: %s)", antibody_id, ctx.identity)

                # If only suspicious, use the sanitized version
                if (result.sanitized_entry
                        and result.threat_level == _ThreatLevel.SUSPICIOUS):
                    logger.info(
                        "Admitting sanitized version of '%s' (caller: %s)",
                        title[:80], ctx.identity,
                    )
                    title = result.sanitized_entry.get("title", title)
                    content = result.sanitized_entry.get("content", content)
                    metadata = self._sanitize_metadata(
                        result.sanitized_entry.get("metadata", metadata)
                    )
                else:
                    return response

        cat = EntryCategory(category)
        tier = AuthorityTier(authority_tier) if authority_tier else None

        # Generate embedding from title + content
        embedding = self._embeddings.embed(f"{title} {content}")

        # Determine provenance from auth context if not explicitly set
        prov_str = provenance or "agent"
        try:
            effective_provenance = Provenance(prov_str)
        except ValueError:
            logger.warning("Invalid provenance '%s', defaulting to AGENT", prov_str)
            effective_provenance = Provenance.AGENT

        entry = Entry(
            project=project,
            category=cat,
            title=title,
            content=content,
            embedding=embedding,
            metadata=metadata,
            source_agent=source_agent or ctx.identity,
            source_session=source_session,
            authority_tier=tier,
            provenance=effective_provenance,
        )

        entry_id = self._store.add_entry(entry, caller=ctx.identity)

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
        token: str | None = None,
        project: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10,
        min_score: float = 0.7,
        current_only: bool = True,
    ) -> list[dict[str, Any]]:
        """Semantic search across entries. Requires read scope."""
        self._authenticate(token, Scope.READ)
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
        token: str | None = None,
        depth: int = 1,
    ) -> dict[str, Any]:
        """Fetch a specific entry by ID. Requires read scope."""
        self._authenticate(token, Scope.READ)

        entry = self._store.get_entry(id)
        if not entry:
            raise ValueError(f"Entry not found: {id}")

        links = self._store.get_links(id, depth=depth)

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
        token: str | None = None,
        context: Optional[str] = None,
    ) -> dict[str, Any]:
        """Signal that a retrieved entry was useful (or not). Requires write scope."""
        ctx = self._authenticate(token, Scope.WRITE)
        new_score = self._store.adjust_usefulness(id, useful, caller=ctx.identity)
        return {"id": id, "usefulness": new_score}

    # ── brain_supersede ───────────────────────────────────────

    def brain_supersede(
        self,
        old_id: str,
        new_id: str,
        token: str | None = None,
        reason: Optional[str] = None,
    ) -> dict[str, str]:
        """Mark an entry as superseded. Requires admin scope."""
        ctx = self._authenticate(token, Scope.ADMIN)
        self._store.supersede(old_id, new_id, caller=ctx.identity)
        return {"old_id": old_id, "new_id": new_id, "status": "superseded"}

    # ── brain_audit ───────────────────────────────────────────

    def brain_audit(
        self,
        entry_id: Optional[str] = None,
        operation: Optional[str] = None,
        limit: int = 100,
        token: str | None = None,
    ) -> list[dict[str, Any]]:
        """Query the audit trail. Requires read scope.

        v4: Added for Vuln 8.1.8 — no audit trail.
        """
        self._authenticate(token, Scope.READ)
        from ..core.store import AuditEntry
        entries = self._store.audit.query(
            entry_id=entry_id,
            operation=operation,
            limit=limit,
        )
        return [
            {
                "timestamp": e.timestamp,
                "operation": e.operation,
                "caller_identity": e.caller_identity,
                "entry_id": e.entry_id,
                "old_value": e.old_value,
                "new_value": e.new_value,
                "details": e.details,
            }
            for e in entries
        ]

    # ── brain_status ──────────────────────────────────────────

    def brain_status(
        self,
        project: Optional[str] = None,
    ) -> dict[str, Any]:
        """Health and statistics. No authentication required."""
        stats = self._store.status(project=project)
        stats["audit_log_size"] = self._store.audit.size
        return stats


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
        "provenance": entry.provenance.value if isinstance(entry.provenance, Provenance) else entry.provenance,
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
