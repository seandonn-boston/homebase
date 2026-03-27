# Brain User Guide

The Admiral Brain is a persistent memory system that stores decisions, patterns, and lessons across sessions. This guide covers the B1 (file-based) tier CLI tools.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `brain_record` | Store a new brain entry |
| `brain_query` | Search entries by keyword |
| `brain_retrieve` | Get a specific entry by ID |
| `brain_audit` | Audit brain health and integrity |
| `brain_consolidate` | Merge duplicate or related entries |

---

## Recording Knowledge

```bash
# Record a decision
admiral/bin/brain_record \
  --type decision \
  --category architecture \
  --content "Chose JSON over YAML for hook payloads because jq is the only dependency" \
  --tags "hooks,json,adr-005"

# Record a pattern (reusable solution)
admiral/bin/brain_record \
  --type pattern \
  --category testing \
  --content "Property-based tests with fast-check catch edge cases unit tests miss" \
  --tags "testing,fast-check,property-based"

# Record a failure lesson
admiral/bin/brain_record \
  --type lesson \
  --category operations \
  --content "OAuth tokens need workflow scope to push CI changes" \
  --tags "ci,github,oauth"
```

### Entry Types

| Type | When to use |
|------|------------|
| `decision` | Architectural choices, trade-offs, rationale |
| `pattern` | Reusable solutions, best practices |
| `lesson` | Failures, mistakes, things that didn't work |
| `context` | Project state, environment facts |

---

## Querying Knowledge

```bash
# Search by keyword
admiral/bin/brain_query "hook payload"

# Search by tag
admiral/bin/brain_query --tag "architecture"

# Search by type
admiral/bin/brain_query --type decision

# Recent entries
admiral/bin/brain_query --recent 10
```

The query returns JSON results:

```json
[
  {
    "id": "brain-1711500000-a1b2c3d4",
    "type": "decision",
    "category": "architecture",
    "content": "Chose JSON over YAML...",
    "tags": ["hooks", "json", "adr-005"],
    "created_at": "2026-03-27T10:00:00Z"
  }
]
```

---

## Retrieving Specific Entries

```bash
# Get by ID
admiral/bin/brain_retrieve "brain-1711500000-a1b2c3d4"
```

Returns the full entry with all metadata.

---

## Auditing Brain Health

```bash
# Full audit
admiral/bin/brain_audit

# Output includes:
# - Total entry count
# - Entries by type (decision, pattern, lesson, context)
# - Entries by category
# - Duplicate detection
# - Stale entry warnings (>30 days without access)
# - Integrity check (valid JSON, required fields)
```

---

## Consolidating Entries

```bash
# Merge duplicates interactively
admiral/bin/brain_consolidate

# The consolidator:
# 1. Identifies entries with similar content (keyword overlap)
# 2. Proposes merges
# 3. Preserves the most recent version
# 4. Archives consolidated entries
```

---

## Brain Tiers

| Tier | Storage | Search | Status |
|------|---------|--------|--------|
| **B1** | JSON files in `.brain/` | Keyword (grep) | Active |
| **B2** | pgvector database | Semantic (vector similarity) | Requires setup |
| **B3** | Self-organizing | Autonomous pattern recognition | Not implemented |

### Graduation

The Brain advances tiers based on measurable criteria (ADR-009):
- B1 to B2: hit rate >= 85%, precision >= 90%, 100+ entries
- B2 to B3: reuse rate >= 70%, semantic precision >= 85%

Use `admiral/brain/graduation.ts` to assess readiness.

---

## How Hooks Use the Brain

The `brain_context_router` hook (PostToolUse) automatically:
- Records loop detector patterns to the Brain
- Records scope boundary violations
- Tracks how often the Brain is consulted before decisions

The `pre_work_validator` hook checks that Standing Orders and Brain context are loaded before work begins.

---

## File Layout

```
.brain/
  entries/           # Individual entry JSON files
  index.jsonl        # Append-only index for fast lookup
  consolidation.log  # History of merge operations
```

All Brain files are git-tracked. Changes appear in diffs and can be reviewed.
