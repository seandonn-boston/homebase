# Monitor Scanner Specification

**Status:** Partially implemented. `scanner.sh` provides GitHub release tracking, trending repo discovery, digest generation, state management, and issue creation. RSS feeds, quarantine layers, and seed candidate generation remain specification-only.

The scanner is the data collection layer of the AI Landscape Monitor. It watches the AI ecosystem for new releases, capability shifts, emerging patterns, and developments relevant to the Admiral Framework and its users.

-----

## Scan Types

| Type | Trigger | Scope | Output |
|---|---|---|---|
| **full** | Daily 07:00 UTC, manual | All sources, all categories | Full digest + state update |
| **models** | Manual, evening check | Model releases and capability announcements | Model-focused digest section |
| **patterns** | Manual | Emerging agent patterns and architectures | Pattern-focused digest section |
| **releases** | Manual | Software releases (frameworks, tools, SDKs) | Release-focused digest section |
| **discover** | Weekly Monday 06:00 UTC, manual | New repos, new players, trend detection | Discovery digest section |

-----

## Input Sources

The scanner monitors these categories of sources (specific sources are configured in `state.json`):

1. **Model providers** — Release announcements, capability documentation, pricing changes
2. **Agent frameworks** — GitHub releases, changelogs, new framework launches
3. **Research** — Papers with practical implications for agent orchestration
4. **Community** — High-signal discussions about agent patterns, failures, and governance
5. **Regulatory** — AI governance regulations, compliance requirements relevant to agent deployment

-----

## Output

### State File

`monitor/state.json` — Persistent state tracking what has been scanned and when. Conforms to `monitor/state-schema.json`.

### Digest Files

`monitor/digests/YYYY-MM-DD.md` — Daily/weekly markdown reports. Conforms to `monitor/digest-format.md`.

### Seed Candidates

When the scanner identifies information that should be ingested into the Brain, it produces seed candidate entries. At Level 1-2, these are files for human review. At Level 3+, they pass through the quarantine layer (5-layer immune system) before Brain ingestion.

-----

## Findings Classification

| Priority | Criteria | Action |
|---|---|---|
| **HIGH** | Capability breakthrough, security vulnerability, breaking change in major framework | GitHub issue created automatically |
| **MEDIUM** | New release, significant pattern shift, regulatory development | Included in digest, flagged for review |
| **LOW** | Minor updates, incremental improvements, community discussion | Included in digest |

-----

## State Management

The scanner maintains state to avoid duplicate processing and track scan history. State includes:

- Last scan timestamp per source
- Known entity versions (to detect updates)
- Watchlist configuration (repos, providers, topics to track)
- Scan history (what ran, what was found, success/failure)

See `state-schema.json` for the complete state file schema.

-----

## Security Considerations

- Scanner has **read-only** access to external sources. No write operations to external services.
- All external content is treated as untrusted. Digest content is written to files, never shell-expanded.
- GitHub issue creation uses `--body-file` to prevent injection from external content.
- Seed candidates for Brain ingestion must pass through quarantine (Level 3+) or human review (Level 1-2).
