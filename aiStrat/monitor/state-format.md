<!-- Admiral Framework v0.2.0-alpha -->
# Monitor State Format Specification

> **Status:** Specification only.

The monitor persists scan state between runs to enable incremental scanning, deduplication, and trend detection.

-----

## State File Location

```
monitor/state.json
```

Committed to git via CI. Each scan updates state atomically (temp file + rename).

-----

## Schema

```json
{
  "version": "1.0.0",
  "last_scan": {
    "timestamp": "2026-03-13T07:00:00Z",
    "type": "full",
    "duration_seconds": 45,
    "sources_polled": 15,
    "findings_count": 8,
    "candidates_generated": 3,
    "errors": []
  },
  "tracked_repos": {
    "anthropics/claude-code": {
      "last_release": "v2.1.75",
      "last_checked": "2026-03-13T07:00:00Z",
      "stars_at_check": 45000
    }
  },
  "model_versions": {
    "anthropic/claude-opus-4-6": {
      "first_seen": "2026-03-01",
      "last_checked": "2026-03-13"
    }
  },
  "fingerprints": {
    "description": "SHA-256 hashes of previously seen findings for deduplication",
    "entries": ["abc123...", "def456..."]
  },
  "antibodies": {
    "description": "Defanged attack patterns learned from quarantine rejections",
    "count": 0,
    "last_generated": null
  }
}
```

-----

## Invariants

- State file must always be valid JSON
- `last_scan.timestamp` must be ISO 8601
- `fingerprints.entries` grows monotonically (fingerprints are never removed)
- Antibody generation rate-limited to 50/hour
- State file writes are atomic (temp + rename) to prevent corruption
