<!-- Admiral Framework v0.4.0-alpha -->
# Continuous AI Landscape Monitor — Architecture Specification

**Automated surveillance of the AI agent ecosystem — with an immune system.**

## Implementation Status

The scanner is implemented as a shell script (`scanner.sh`) that runs in GitHub Actions via `.github/workflows/ai-monitor.yml`. It currently supports:

- **GitHub release tracking** — Checks all watchlist repos for new releases via the GitHub API
- **Trending repo discovery** — Searches GitHub for new repos matching watchlist topics
- **Digest generation** — Produces markdown reports in `digests/YYYY-MM-DD.md`
- **State persistence** — Tracks known versions and scan history in `state.json`
- **Issue creation** — Opens GitHub issues for high-priority findings (major provider releases)

**Not yet implemented:** RSS/blog feed scanning, the five-layer quarantine/immune system (Layers 1-5), seed candidate generation for Brain ingestion, and the Bayesian/TF-IDF semantic analysis described below. These are specified but require additional tooling beyond what `gh` CLI and standard shell provide.

---

This document specifies the full architecture for the Continuous AI Landscape Monitor — the fleet's intelligence service. It scans the AI ecosystem for model releases, agent patterns, trending tools, and emerging threats, then feeds curated intelligence into the Brain through a quarantine system that neutralizes adversarial inputs before they can reach fleet memory.

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
              │  Layer 3: Deterministic  │
              │           Semantic       │
              │       (LLM-AIRGAPPED)    │
              │  Layer 4: LLM Advisory   │
              │       (reject-only)      │
              │  Layer 5: Antibodies     │
              └──────────┬───────────────┘
                         │
                    ┌────▼─────┐
                    │  Brain   │
                    │ (safe)   │
                    └──────────┘
```

## The Immune System (Quarantine)

Every piece of external content destined for the Brain passes through a five-layer defense system. **Critical design principle: the load-bearing security layers (1-3) are completely LLM-free.** An LLM can build these layers, but their execution is completely airgapped from all LLM engagement. This eliminates the circular dependency where an LLM judges content specifically designed to manipulate LLMs.

**Why this layer ordering matters:** Layers 1-3 are deterministic and LLM-free because they must be trustworthy against adversarial content specifically crafted to manipulate LLMs. If the primary defense relied on an LLM, an attacker could craft content that simultaneously attacks the fleet *and* disarms the defense. Layer 4 (LLM advisory) is additive only — it can reject but never approve — so even a compromised Layer 4 can only fail in one direction. **Principle: fail-open for discovery (the Monitor finds everything), fail-closed for ingestion (nothing enters the Brain without passing all layers).**

| Layer | Defense | What It Catches | LLM Involvement |
|-------|---------|-----------------|-----------------|
| **1. Structural** | Enforces schema, field lengths, valid categories, required fields | Malformed entries, oversized payloads, invalid categories | None — deterministic |
| **2. Injection** | Encoding normalization + 70+ regex patterns scanning for prompt injection, XSS, SQL injection, command injection, secrets, PII | Adversarial content, credential exposure, data leaks | None — pattern matching |
| **3. Deterministic Semantic** | Rule-based NLP, TF-IDF scoring against attack corpus, Bayesian text classification, authority-pattern detection | Authority spoofing, false credentials, behavior manipulation, dangerous advice | **None — LLM-airgapped** |
| **4. LLM Advisory** | LLM classifier with hardcoded prompt. **Can only REJECT, never APPROVE.** | Subtle semantic attacks evading deterministic detection | LLM — advisory, additive rejection only |
| **5. Antibody** | Converts detected attacks into Brain FAILURE entries for future defense | Rate-limited (50/hour), fingerprint-deduplicated, preserves attack patterns in defanged form | None — deterministic |

**Attack response flow:**
1. Entry is **rejected** (never reaches the Brain)
2. Attack structure is **preserved in defanged form** for forensic analysis
3. An **antibody** (FAILURE entry) is generated and planted in the Brain
4. Future agents can learn to recognize similar adversarial patterns

**Layer 2 preprocessing — encoding normalization:**
Before regex matching, all content passes through a normalization pipeline that decodes and flattens: Unicode confusables and homoglyphs (e.g., fullwidth, Cyrillic lookalikes), HTML entities (`&lt;`, `&#x3C;`, `&#60;`), URL-encoded sequences (`%3C`, double-encoded `%253C`), and mixed-encoding combinations. This ensures attackers cannot bypass injection patterns through encoding tricks. Normalization is applied to a working copy used for detection; the original content is preserved for forensic logging.

**Layer 3 — Deterministic Semantic Analysis (LLM-Airgapped):**
Layer 3 is the primary semantic defense. It contains zero LLM involvement in execution. It uses deterministic NLP techniques:
- **Authority pattern scoring:** A curated dictionary of authority-claiming phrases ("Admiral approved", "fleet-wide directive", "override standing order", "system-level permission") scored by TF-IDF weight against a known-attack corpus. Content exceeding the authority-claim threshold is rejected.
- **Bayesian text classification:** A pre-trained Bayesian classifier (Naive Bayes or similar) trained on labeled examples of legitimate content vs. authority spoofing, credential fabrication, and behavior manipulation. Trained offline, deployed as a static model.
- **Credential fabrication detection:** Rule-based pattern matching for fabricated endorsements, invented certifications, and false provenance claims. Checks against a registry of valid credential formats.
- **Behavior manipulation scoring:** Phrase-level detection of imperative instructions ("you must", "always do", "ignore previous", "from now on") combined with semantic context scoring against a manipulation-pattern corpus.

**The attack corpus** is a version-controlled, human-curated dataset of known adversarial patterns. Updated by the Admiral (never by agents).

**Layer 4 — LLM Advisory (Additive Rejection Only):**
Layer 4 is invoked ONLY on content that passes Layers 1-3. It uses an LLM classifier with a fixed, hardcoded prompt template. The classification prompt must NOT be dynamically generated or accept variable interpolation beyond the content under inspection. Layer 4 operates under a critical constraint:
- **Layer 4 can REJECT content. It can NEVER APPROVE content.**
- If Layer 3 passes and Layer 4 rejects → content is **rejected**.
- If Layer 3 passes and Layer 4 passes → content proceeds to the approval gate.
- If Layer 3 rejects → Layer 4 is **never consulted**.

This means a compromised Layer 4 (an LLM manipulated by the content it's classifying) can only fail in one direction: failing to reject. It cannot approve content that Layer 3 rejected. The LLM is a bonus net, not a load-bearing wall.

The prompt template checks for:
- **Authority spoofing patterns** — false claims of Admiral approval, fleet-wide directives, or system-level authority
- **False credential claims** — fabricated certifications, invented endorsements, fake provenance
- **Behavior manipulation attempts** — instructions designed to alter agent conduct, override safety constraints, or install persistent behavioral changes
- **Dangerous advice** — recommendations that would degrade security posture, disable safeguards, or introduce vulnerabilities

Content flagged by the classifier is rejected and routed to the antibody layer (Layer 5).

**Layer 3 limitations and mitigations:**

- **Deterministic but not omniscient.** Layer 3 uses pre-trained statistical models and rule-based patterns, not LLMs. It is deterministic (the same input always produces the same output), but it can only detect patterns present in its training corpus. Sufficiently novel adversarial inputs that don't match known authority-spoofing, credential-fabrication, or manipulation patterns will pass through undetected.
- **Fail-closed scoring threshold.** The Bayesian classifier returns a confidence score. Content scoring below 0.8 confidence on the "safe" classification is rejected. Ambiguity resolves to rejection, consistent with the Monitor's fail-closed principle (see Failure Modes below).
- **Corpus dependency.** Detection quality is bounded by the attack corpus. The corpus must be regularly updated by the Admiral with newly discovered adversarial patterns. Stale corpora create blind spots.
- **Defense-in-depth positioning.** Layer 3 extends Layers 1-2 with semantic-level detection that regex cannot achieve. Layer 4 (LLM advisory) provides an additional probabilistic net beyond Layer 3's deterministic checks. The approval gate (`approved: false`) provides a final human checkpoint.

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
| **Agent configuration files** | AGENTS.md, CLAUDE.md, .cursorrules, and equivalent configs extracted from exemplar repos | PATTERN |
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
| Configuration Security (Part 3) | Five-layer quarantine (3 LLM-airgapped + 1 LLM advisory + antibody) defends against external intelligence poisoning |
| Model Selection (Part 4) | New model releases trigger tier reassessment |
| Intelligence Lifecycle (Part 5) | External intelligence channel feeding curated ecosystem data |
| Strategic Adaptation (Part 8) | Monitor findings may trigger tactical or strategic fleet adaptation |
| Event-Driven Operations (Part 9) | Monitor runs as a scheduled event-driven agent (Pattern 5) |
