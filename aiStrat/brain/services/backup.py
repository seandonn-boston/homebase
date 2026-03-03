"""Brain backup and restore operations.

Provides export/import of Brain state to JSON and timestamped snapshots
for disaster recovery. All operations work against BrainStore's in-memory
structures, serializing entries, links, and audit trail.

v4: Added for operational resilience — ensures Brain state can be
    persisted, transferred, and restored without data loss.

Reference: admiral/part5-brain.md, Section 15.
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import asdict
from pathlib import Path
from typing import Optional

from ..core.models import Entry, EntryCategory, EntryLink, LinkType, AuthorityTier
from ..core.store import AuditEntry, BrainStore

logger = logging.getLogger(__name__)


# ── Serialization helpers ────────────────────────────────────────

def _entry_to_dict(entry: Entry) -> dict:
    """Convert an Entry to a JSON-serializable dict."""
    d = {
        "id": entry.id,
        "project": entry.project,
        "category": entry.category.value,
        "title": entry.title,
        "content": entry.content,
        "created_at": entry.created_at,
        "updated_at": entry.updated_at,
        "embedding": entry.embedding,
        "metadata": entry.metadata,
        "source_agent": entry.source_agent,
        "source_session": entry.source_session,
        "authority_tier": entry.authority_tier.value if entry.authority_tier else None,
        "provenance": entry.provenance,
        "access_count": entry.access_count,
        "usefulness": entry.usefulness,
        "superseded_by": entry.superseded_by,
        "superseded_at": entry.superseded_at,
    }
    return d


def _dict_to_entry(d: dict) -> Entry:
    """Reconstruct an Entry from a serialized dict."""
    authority = None
    if d.get("authority_tier"):
        authority = AuthorityTier(d["authority_tier"])

    return Entry(
        id=d["id"],
        project=d["project"],
        category=EntryCategory(d["category"]),
        title=d["title"],
        content=d["content"],
        created_at=d.get("created_at", time.time()),
        updated_at=d.get("updated_at", time.time()),
        embedding=d.get("embedding"),
        metadata=d.get("metadata", {}),
        source_agent=d.get("source_agent"),
        source_session=d.get("source_session"),
        authority_tier=authority,
        provenance=d.get("provenance", "agent"),
        access_count=d.get("access_count", 0),
        usefulness=d.get("usefulness", 0),
        superseded_by=d.get("superseded_by"),
        superseded_at=d.get("superseded_at"),
    )


def _link_to_dict(link: EntryLink) -> dict:
    """Convert an EntryLink to a JSON-serializable dict."""
    return {
        "source_id": link.source_id,
        "target_id": link.target_id,
        "link_type": link.link_type.value,
        "created_at": link.created_at,
    }


def _dict_to_link(d: dict) -> EntryLink:
    """Reconstruct an EntryLink from a serialized dict."""
    return EntryLink(
        source_id=d["source_id"],
        target_id=d["target_id"],
        link_type=LinkType(d["link_type"]),
        created_at=d.get("created_at", time.time()),
    )


def _audit_to_dict(entry: AuditEntry) -> dict:
    """Convert an AuditEntry to a JSON-serializable dict."""
    return {
        "timestamp": entry.timestamp,
        "operation": entry.operation,
        "caller_identity": entry.caller_identity,
        "entry_id": entry.entry_id,
        "old_value": entry.old_value,
        "new_value": entry.new_value,
        "details": entry.details,
    }


def _dict_to_audit(d: dict) -> AuditEntry:
    """Reconstruct an AuditEntry from a serialized dict."""
    return AuditEntry(
        timestamp=d.get("timestamp", time.time()),
        operation=d.get("operation", ""),
        caller_identity=d.get("caller_identity", ""),
        entry_id=d.get("entry_id", ""),
        old_value=d.get("old_value"),
        new_value=d.get("new_value"),
        details=d.get("details", ""),
    )


# ── Public API ───────────────────────────────────────────────────

def export_brain(store: BrainStore, output_path: str) -> dict:
    """Serialize the full Brain state (entries, links, audit) to JSON.

    Args:
        store: The BrainStore instance to export.
        output_path: File path to write the JSON export.

    Returns:
        Summary dict with counts of exported entries, links, and audit records.

    v4: Captures complete Brain state for backup, migration, or debugging.
    """
    # Gather all entries (including superseded)
    entries = store.list_entries(current_only=False)
    entry_dicts = [_entry_to_dict(e) for e in entries]

    # Gather all links by collecting from each entry
    seen_links: list[EntryLink] = []
    seen_link_keys: set[tuple] = set()
    for entry in entries:
        for link in store.get_links(entry.id, depth=1):
            key = (link.source_id, link.target_id, link.link_type.value)
            if key not in seen_link_keys:
                seen_link_keys.add(key)
                seen_links.append(link)
    link_dicts = [_link_to_dict(lk) for lk in seen_links]

    # Gather audit log
    audit_entries = store.audit.query(limit=10_000)
    audit_dicts = [_audit_to_dict(a) for a in audit_entries]

    export_data = {
        "version": "v4",
        "exported_at": time.time(),
        "counts": {
            "entries": len(entry_dicts),
            "links": len(link_dicts),
            "audit_records": len(audit_dicts),
        },
        "entries": entry_dicts,
        "links": link_dicts,
        "audit": audit_dicts,
    }

    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", encoding="utf-8") as f:
        json.dump(export_data, f, indent=2, ensure_ascii=False)

    logger.info(
        "Brain exported: %d entries, %d links, %d audit records -> %s",
        len(entry_dicts), len(link_dicts), len(audit_dicts), output_path,
    )

    return export_data["counts"]


def import_brain(
    store: BrainStore,
    input_path: str,
    verify: bool = True,
) -> dict:
    """Load Brain state from a JSON export.

    Entries, links, and audit records are loaded into the store.
    If verify=True, counts are checked against the manifest.

    Args:
        store: The BrainStore instance to populate.
        input_path: Path to the JSON file to import.
        verify: If True, verify loaded counts match the manifest.

    Returns:
        Summary dict with counts of imported entries, links, and audit records.

    Raises:
        ValueError: If verify=True and counts do not match the manifest.
        FileNotFoundError: If input_path does not exist.

    v4: Supports full Brain restore from backup or cross-environment migration.
    """
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    manifest_counts = data.get("counts", {})

    # Import entries
    imported_entries = 0
    for entry_dict in data.get("entries", []):
        entry = _dict_to_entry(entry_dict)
        store.add_entry(entry, caller="backup-import")
        imported_entries += 1

    # Import links
    imported_links = 0
    for link_dict in data.get("links", []):
        link = _dict_to_link(link_dict)
        try:
            store.add_link(link)
            imported_links += 1
        except ValueError as e:
            logger.warning("Skipped link during import: %s", e)

    # Import audit records
    imported_audit = 0
    for audit_dict in data.get("audit", []):
        audit_entry = _dict_to_audit(audit_dict)
        store.audit.append(audit_entry)
        imported_audit += 1

    result = {
        "entries": imported_entries,
        "links": imported_links,
        "audit_records": imported_audit,
    }

    if verify:
        expected_entries = manifest_counts.get("entries", 0)
        expected_links = manifest_counts.get("links", 0)
        if imported_entries != expected_entries:
            raise ValueError(
                f"Entry count mismatch: imported {imported_entries}, "
                f"expected {expected_entries}"
            )
        if imported_links != expected_links:
            raise ValueError(
                f"Link count mismatch: imported {imported_links}, "
                f"expected {expected_links}"
            )

    logger.info(
        "Brain imported: %d entries, %d links, %d audit records from %s",
        imported_entries, imported_links, imported_audit, input_path,
    )

    return result


def snapshot(store: BrainStore, snapshot_dir: str) -> str:
    """Create a timestamped snapshot of the Brain.

    The snapshot is a JSON file named with an ISO-style timestamp
    for easy chronological sorting.

    Args:
        store: The BrainStore instance to snapshot.
        snapshot_dir: Directory where snapshots are stored.

    Returns:
        Full path to the created snapshot file.

    v4: Timestamped snapshots enable point-in-time recovery.
    """
    snapshot_path = Path(snapshot_dir)
    snapshot_path.mkdir(parents=True, exist_ok=True)

    timestamp = time.strftime("%Y%m%d_%H%M%S", time.gmtime())
    filename = f"brain_snapshot_{timestamp}.json"
    full_path = str(snapshot_path / filename)

    export_brain(store, full_path)

    logger.info("Brain snapshot created: %s", full_path)
    return full_path


def restore(store: BrainStore, snapshot_path: str) -> dict:
    """Full restore of Brain state from a snapshot.

    This is a convenience wrapper around import_brain with verification
    enabled and explicit logging of the restore operation.

    Args:
        store: The BrainStore instance to restore into.
        snapshot_path: Path to the snapshot JSON file.

    Returns:
        Summary dict with counts of restored entries, links, and audit records.

    Raises:
        FileNotFoundError: If the snapshot file does not exist.
        ValueError: If verification fails after import.

    v4: Full restore with mandatory verification for disaster recovery.
    """
    if not os.path.exists(snapshot_path):
        raise FileNotFoundError(f"Snapshot not found: {snapshot_path}")

    logger.info("Starting Brain restore from: %s", snapshot_path)
    result = import_brain(store, snapshot_path, verify=True)
    logger.info(
        "Brain restore complete: %d entries, %d links, %d audit records",
        result["entries"], result["links"], result["audit_records"],
    )
    return result
