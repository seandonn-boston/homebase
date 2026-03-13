<!-- Admiral Framework v0.2.0-alpha -->
# Monitor Digest Format Specification

> **Status:** Specification only.

Daily/weekly scan results are written as markdown digest files for human review.

-----

## File Location

```
monitor/digests/{YYYY-MM-DD}.md
```

One file per scan day. Weekly deep scans append to the daily file with a `## Weekly Deep Scan` section.

-----

## Digest Structure

```markdown
# AI Landscape Monitor — {YYYY-MM-DD}

Scan type: {full|models|patterns|releases|discover}
Duration: {N} seconds
Sources polled: {N}
Findings: {N} ({H} high-priority)

## High-Priority Findings

{findings flagged as high-priority, requiring immediate Admiral attention}

## Model Releases

| Provider | Model | Version | Date | Notes |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## SDK & Tool Releases

| Tool | Version | Changes | Impact |
|---|---|---|---|
| ... | ... | ... | ... |

## Trending & Patterns

{new repos, emerging patterns, community momentum shifts}

## Seed Candidates

{Brain entry candidates generated from this scan, all with approved: false}

| # | Category | Title | Source | Confidence |
|---|---|---|---|---|
| ... | ... | ... | ... | ... |

## Errors & Warnings

{any source polling failures, quarantine rejections, or anomalies}
```

-----

## Review Workflow

1. Monitor generates digest automatically
2. CI commits digest to repository
3. High-priority findings create GitHub issues (if configured)
4. Admiral reviews digest and approves/rejects seed candidates
5. Approved candidates are ingested into the Brain
