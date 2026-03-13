<!-- Admiral Framework v0.2.0-alpha -->
# Scanner Module Specification

> **Status:** Specification only. Implementation follows when the framework moves from spec to code.

The scanner is the monitor's orchestrator — it coordinates intelligence gathering from multiple sources, routes findings through the quarantine pipeline, and produces outputs for human review.

-----

## Scanner Responsibilities

1. **Source polling** — Query configured intelligence sources on schedule (daily/weekly)
2. **Finding aggregation** — Collect raw findings from all source adapters
3. **Quarantine routing** — Pass all external content through the five-layer quarantine (see `quarantine-spec.md`)
4. **Deduplication** — Fingerprint-based dedup to prevent write amplification
5. **Digest generation** — Produce human-readable markdown digests per scan
6. **Seed candidate creation** — Generate Brain seed candidates with `approved: false`
7. **State persistence** — Atomic state file writes (temp + rename pattern)
8. **Alert emission** — Flag high-priority findings for immediate Admiral attention

-----

## Intelligence Sources

| Source Type | Examples | Poll Frequency | Output |
|---|---|---|---|
| Model releases | Anthropic, OpenAI, Google, Meta, Mistral, Cohere, etc. | Daily | New model announcements, capability changes |
| SDK/tool releases | Claude Code, Copilot, Cursor, agent frameworks | Daily | Version bumps, feature additions, breaking changes |
| Trending repositories | GitHub trending, new agent frameworks | Weekly | Emerging patterns, community momentum |
| RSS/blog feeds | AI research blogs, vendor announcements | Daily | Strategic developments, research breakthroughs |
| Documentation changes | Tracked framework docs | Weekly | API changes, deprecations, new capabilities |

-----

## Scan Types

| Type | Flag | Sources Polled | Use Case |
|---|---|---|---|
| Full | `--full` (default) | All sources | Comprehensive daily/weekly scan |
| Models | `--models` | Model providers only | Quick model release check |
| Patterns | `--patterns` | Repos + blogs | Pattern and trend discovery |
| Releases | `--releases` | SDKs + tools | Release tracking |
| Discover | `--discover` | Trending + new repos | New tool discovery |

-----

## Output Contracts

### Digest File
- Path: `monitor/digests/{YYYY-MM-DD}.md`
- Format: Markdown with structured sections per source type
- Contains: findings summary, high-priority alerts, seed candidate list

### State File
- Path: `monitor/state.json`
- Format: See `state-format.md`
- Persistence: Atomic write (temp file + rename)

### Seed Candidates
- Format: Brain entry JSON with `approved: false`
- Routing: Written to digest, flagged for Admiral review
- Rate limit: 50 candidates per scan maximum

-----

## Error Handling

- Source polling failures: Log and continue (fail-open for discovery)
- Quarantine failures: Reject finding (fail-closed for ingestion)
- State write failures: Retry with backoff, alert on persistent failure
- Rate limiting: Respect upstream API rate limits with exponential backoff
