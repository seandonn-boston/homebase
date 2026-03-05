# Continuous AI Landscape Monitor — Architecture Specification

**Automated surveillance of the AI agent ecosystem — with an immune system.**

This document specifies the architecture for the Continuous AI Landscape Monitor — the fleet's intelligence service. It scans the AI ecosystem for model releases, agent patterns, trending tools, and emerging threats, then feeds curated intelligence into the Brain through a quarantine system that neutralizes adversarial inputs before they can reach fleet memory.

## Architecture

```
                ┌──────────────────────────┐
                │    Scheduler             │
                │    (daily / weekly cron)  │
                └────────────┬─────────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │    Scanner               │
                │    (orchestrator)        │
                └──┬──────────┬──────┬─────┘
                   │          │      │
          ┌────────▼──┐  ┌───▼────┐ │
          │ Releases  │  │Trending│ │
          │ Tracker   │  │Scanner │ │
          └────────┬──┘  └───┬────┘ │
                   │         │      │
                   ▼         ▼      ▼
              ┌──────────────────────────┐
              │    Persistent State      │
              │    (atomic file writes)  │
              └──────────┬───────────────┘
                         │
              ┌──────────▼───────────────┐
              │    Digest Generator      │
              │    (markdown reports)    │
              ├──────────────────────────┤
              │    Seed Writer           │
              │    (Brain candidates)    │
              └──────────┬───────────────┘
                         │
              ┌──────────▼───────────────┐
              │    Quarantine            │
              │    (IMMUNE SYSTEM)       │
              │                          │
              │  Layer 1: Structure      │
              │  Layer 2: Injection      │
              │  Layer 3: Semantics      │
              │  Layer 4: Antibodies     │
              └──────────┬───────────────┘
                         │
                    ┌────▼─────┐
                    │  Brain   │
                    │ (safe)   │
                    └──────────┘
```

## The Immune System (Quarantine)

Every piece of external content destined for the Brain passes through a four-layer defense system:

| Layer | Defense | What It Catches |
|-------|---------|-----------------|
| **Structural** | Enforces schema, field lengths, valid categories, required fields | Malformed entries, oversized payloads, invalid categories |
| **Injection** | Encoding normalization + 70+ regex patterns scanning for prompt injection, XSS, SQL injection, command injection, secrets, PII | Adversarial content, credential exposure, data leaks |
| **Semantic** | Detects authority spoofing, false credentials, dangerous advice, behavior manipulation | Social engineering, authority escalation attempts, quality erosion |
| **Antibody** | Converts detected attacks into Brain FAILURE entries for future defense | Rate-limited (50/hour), fingerprint-deduplicated, preserves attack patterns in defanged form |

**Attack response flow:**
1. Entry is **rejected** (never reaches the Brain)
2. Attack structure is **preserved in defanged form** for forensic analysis
3. An **antibody** (FAILURE entry) is generated and planted in the Brain
4. Future agents can learn to recognize similar adversarial patterns

**Layer 2 preprocessing — encoding normalization:**
Before regex matching, all content passes through a normalization pipeline that decodes and flattens: Unicode confusables and homoglyphs (e.g., fullwidth, Cyrillic lookalikes), HTML entities (`&lt;`, `&#x3C;`, `&#60;`), URL-encoded sequences (`%3C`, double-encoded `%253C`), and mixed-encoding combinations. This ensures attackers cannot bypass injection patterns through encoding tricks. Normalization is applied to a working copy used for detection; the original content is preserved for forensic logging.

**Layer 3 implementation — LLM-based semantic classification:**
Layer 3 uses an LLM classifier invoked with a fixed, hardcoded prompt template. The classification prompt must NOT be dynamically generated or accept variable interpolation beyond the content under inspection — this prevents meta-injection where adversarial content manipulates its own classification. The prompt template checks for:
- **Authority spoofing patterns** — false claims of Admiral approval, fleet-wide directives, or system-level authority
- **False credential claims** — fabricated certifications, invented endorsements, fake provenance
- **Behavior manipulation attempts** — instructions designed to alter agent conduct, override safety constraints, or install persistent behavioral changes
- **Dangerous advice** — recommendations that would degrade security posture, disable safeguards, or introduce vulnerabilities

Content flagged by the classifier is rejected and routed to the antibody layer (Layer 4).

**What is blocked:**
- Prompt injection (instruction override, identity reassignment, jailbreaks)
- XSS (script tags, event handlers, protocol handlers)
- SQL injection (DROP TABLE, UNION SELECT, stored procedures)
- Command injection (shell commands, pipe to bash)
- Secrets (API keys, tokens, passwords, private keys, connection strings)
- PII (SSNs, email addresses, credit cards, dates of birth, addresses)
- Authority spoofing (false Admiral approval, fleet-wide directives)
- Data poisoning (behavior manipulation, fake credentials)

## Intelligence Sources

| Source Type | What It Captures | Brain Category |
|---|---|---|
| **Model/SDK releases** | New versions from 11+ providers (Anthropic, OpenAI, Google, Meta, Mistral, DeepSeek, xAI, etc.) | CONTEXT |
| **Exemplar tool updates** | Changes to 20+ tracked repos (Claude Code, Aider, Cline, Cursor, etc.) | PATTERN |
| **Agent configuration files** | CLAUDE.md, .cursorrules, and equivalent configs extracted from exemplar repos | PATTERN |
| **Trending repos** | Star-surge detection with quality filtering across targeted GitHub searches | PATTERN |
| **RSS/blog feeds** | Provider blogs, announcement feeds, documentation updates | CONTEXT |
| **Web content** | Full-text extraction from release notes, blog posts, documentation pages | CONTEXT |

## Security Design

- **All external content quarantined** before Brain ingestion — no bypass path
- **Seed candidates arrive with `approved: false`** — require Admiral review before activation
- **State persistence uses atomic writes** (temp file + rename) with file locking
- **URL validation** with org-scoped allowlists for trusted domains
- **Rate limiting** on antibody generation to prevent write amplification attacks
- **Fingerprint deduplication** to prevent duplicate antibodies from repeated attacks

## Operational Model

| Trigger | Scan Type | Cadence |
|---|---|---|
| **Daily cron** | Standard scan: releases, trending, RSS | 07:00 UTC |
| **Weekly cron** | Deep discovery: extended search queries, exemplar analysis | Monday 06:00 UTC |
| **Manual dispatch** | On-demand scan with configurable scope | As needed |

**Result routing:**
- Digest (markdown report) → committed to repo for Admiral review (see Digest Format below)
- Seed candidates → Admiral reviews and approves before Brain activation
- High-priority findings → automatic GitHub Issue creation for visibility
- State (JSON) → persisted for cross-run deduplication and delta detection

## Failure Modes

The Monitor operates under **fail-closed** semantics: if any component in the pipeline fails, content is rejected (never silently accepted).

| Failure | Response | Recovery |
|---|---|---|
| **Source unreachable** | Skip source, log the failure, continue scanning remaining sources | Automatic retry on next scheduled cycle |
| **Quarantine system failure** | Reject all pending content, halt ingestion pipeline | Alert Admiral immediately; no content reaches Brain until quarantine is confirmed operational |
| **State file corruption** | Restore from last known good state snapshot (atomic writes ensure the previous version is always available) | Alert Admiral; flag any delta between corrupted and restored state for manual review |
| **Digest generation failure** | Scan results are preserved in state; digest is retried | Alert Admiral; raw state remains available for manual inspection |
| **Antibody write failure** | The triggering content is still rejected (quarantine is upstream of antibody generation) | Log the missed antibody; retry on next detection of the same pattern |

**Guiding principle:** A Monitor that rejects safe content is an inconvenience. A Monitor that accepts unsafe content is a breach. Every ambiguous failure resolves to rejection.

## Digest Format

Digests follow a fixed markdown template for consistency and machine-parseability:

```markdown
# Monitor Digest — YYYY-MM-DD

**Scan type:** Daily | Weekly | Manual
**Sources scanned:** N of M configured sources
**Duration:** Xm Ys

## New Findings

### Model & SDK Releases
- [provider] package vX.Y.Z released (YYYY-MM-DD) — summary

### Agent Patterns
- [repo/tool] description of notable change or discovery

### Trending Repositories
- [repo] stars: N (+delta) — brief description

### Feed Intelligence
- [source] headline or summary

## Risk Flags
- [severity: HIGH|MEDIUM|LOW] description of risk or anomaly

## Quarantine Activity
- Entries processed: N
- Entries rejected: N (with breakdown by layer)
- Antibodies generated: N

## Recommended Actions
- [ ] Action item for Admiral review
```

## Relationship to the Admiral Framework

| Admiral Section | Monitor Role |
|---|---|
| Section 10 — Configuration Security | Quarantine defends against external intelligence poisoning |
| Section 13 — Model Selection | New model releases trigger tier reassessment |
| Section 17 — Intelligence Lifecycle | External intelligence channel feeding curated ecosystem data |
| Section 25 — Adaptation Protocol | Monitor findings may trigger tactical or strategic fleet adaptation |
| Section 31 — CI/CD Operations | Monitor runs as a scheduled event-driven agent (Pattern 5) |
