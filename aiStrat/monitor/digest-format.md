# Monitor Digest Format

Digest files are the primary output of the AI Landscape Monitor scanner. Each scan produces a markdown digest file stored in `monitor/digests/YYYY-MM-DD.md`.

-----

## File Naming

```
monitor/digests/YYYY-MM-DD.md
```

Multiple scans on the same day append to the same file. Weekly deep scans produce `YYYY-MM-DD-weekly.md`.

-----

## Structure

```markdown
# AI Landscape Monitor — YYYY-MM-DD

**Scan type:** full | models | patterns | releases | discover
**Scan time:** ISO 8601 timestamp
**Sources scanned:** N of M configured sources

## High Priority

> Items requiring immediate attention. These trigger GitHub issue creation.

### [Finding title]
- **Source:** [source name]
- **Category:** model_release | capability_shift | security | breaking_change | regulatory
- **Impact:** [Brief description of why this matters]
- **Action:** [Recommended response]

## Medium Priority

> Items for review at next planning session.

### [Finding title]
- **Source:** [source name]
- **Category:** [category]
- **Summary:** [Brief description]

## Low Priority

> Informational items. No action required.

- [One-line summary per item]

## Seed Candidates

> Entries recommended for Brain ingestion. Review before approving.

### [Candidate title]
- **Proposed category:** decision | pattern | failure | context | lesson
- **Proposed metadata tags:** [tag1, tag2]
- **Content preview:** [First 200 characters]
- **Source:** [origin URL or reference]

## Scan Metadata

- **Duration:** [scan duration]
- **Errors:** [any scan errors or source failures]
- **State changes:** [sources added, removed, or version-bumped]
```

-----

## Governance

- Digests are committed to the repository via CI (see `.github/workflows/ai-monitor.yml`).
- High-priority findings automatically create GitHub issues for Admiral review.
- Seed candidates require Admiral approval before Brain ingestion (Level 3+) or manual review (Level 1-2).
- All external content in digests is treated as untrusted and must not be shell-expanded.
