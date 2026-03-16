# IP Filing Cover Memo — Admiral Framework

**DRAFT — Prepared for Patent Counsel Review**
**Date:** March 16, 2026
**Prepared by:** Sean Donn

---

## Overview

The Admiral Framework is a comprehensive, model-agnostic specification for autonomous AI agent fleet orchestration. It defines how organizations structure, secure, coordinate, and govern fleets of AI agents operating with increasing autonomy. The framework comprises 114 specification files across 22 groups, with working reference implementations.

This memo accompanies **three provisional patent application drafts** and **two trademark filing checklists** for counsel review.

---

## Filing Summary

### Provisional Patents

| # | Title | Priority Date | Commit | Filing Priority |
|---|---|---|---|---|
| 1 | Context-Pressure-Aware Enforcement Spectrum for AI Agent Systems | 2026-03-13 | `50ffb14` | HIGHEST — File first |
| 2 | Progressive Institutional Memory Architecture for AI Agent Fleets | 2026-03-14 | `49bd0db` | HIGH — File second |
| 3 | Intent Engineering: Structured Methodology for Human-to-AI Instruction Decomposition | 2026-03-14 | `701258d` | HIGH — File third |

### Trademarks

| Mark | Classes | Filing Basis |
|---|---|---|
| ADMIRAL FRAMEWORK | 42, 41 | Intent-to-use (1(b)) |
| INTENT ENGINEERING | 42, 41 | Intent-to-use (1(b)) |

---

## Priority Date Evidence

All invention dates are documented via git history analysis in `research/invention-dates.md`. Each patent opportunity maps to a specific git commit hash with timestamp, providing verifiable priority date evidence. The git repository is hosted on GitHub at `seandonn-boston/homebase` with continuous commit history from March 13, 2026 onward.

Full invention date extraction methodology: `research/extract-invention-dates.sh`.

---

## Competitive Landscape

Filing urgency is elevated by three competitive developments:

1. **McKinsey "Agentic Organization" Framework (March 2026)** — Five-pillar governance model with embedding control agents. Conceptual overlap but no implementable specification, no enforcement spectrum, no institutional memory architecture. Threat level: VERY HIGH for idea-level competition.

2. **Singapore IMDA Model AI Governance Framework (January 2026)** — Action-space risk framing overlaps with Admiral's capability declarations. Guidelines only, not operational specification. Threat level: HIGH for regulatory momentum.

3. **Google A2A Protocol, OpenAI Agents SDK, Microsoft Agent Framework** — Agent runtime competition. These build/run agents but do not address governance, enforcement, or institutional memory. Threat level: MEDIUM for market attention capture.

No competitor has filed patents in the specific intersection of: context-pressure-aware enforcement + fleet-wide institutional memory + formal decision authority taxonomy + structured intent engineering methodology.

Detailed analysis: `research/competitive-landscape-2026.md`, `research/idea-competitors-2026.md`.

---

## Patent Strategy

### Recommended Filing Order

**Month 1 (immediate):** Provisionals #1 (Enforcement Spectrum) and #2 (Brain Architecture) — strongest novelty, most concrete implementations, highest competitive risk.

**Month 2:** Provisional #3 (Intent Engineering) — establishes priority on an emerging professional discipline before competitors name and claim it.

**Months 3-6:** Consider additional provisionals on Agent Identity (#9), Quarantine Immune System (#10), and Decision Authority Taxonomy (#3) — all with strong novelty assessments. See `research/patent-opportunity-analysis.md` for full 23-opportunity analysis.

**Month 10-11:** Convert provisionals to full utility patents with expanded dependent claims from related innovations.

### Dependent Claims Strategy

Each provisional includes dependent claims that draw from related innovations:

- Patent #1 (Enforcement Spectrum) includes dependent claims from Self-Healing Governance Loops (#4) and Standing Orders (#5)
- Patent #2 (Brain Architecture) includes dependent claims from Five-Layer Quarantine Immune System (#10)
- Patent #3 (Intent Engineering) includes dependent claims linking to the enforcement spectrum and Brain knowledge protocol

### Defensive Patent Pledge Consideration

Two strategic paths are under evaluation:

1. **Doctrine-as-product (ITIL/TOGAF model):** Broad defensive pledge — no assertion against non-asserting entities. Revenue from consulting, certification, and ecosystem licensing.
2. **Full platform (SaaS/runtime):** Narrower pledge — open spec for internal use, licenses for commercial implementations building on patented mechanisms.

Counsel guidance requested on pledge strategy.

---

## Trademark Strategy

Both marks are currently in active use in pre-commercial documentation, specifications, and sales materials. Neither has been offered commercially as a service yet, warranting intent-to-use filings.

**Clearance search recommendation:** Commission full clearance searches for both marks before filing. "Admiral" has existing registrations in unrelated classes; "Intent Engineering" appears to be unregistered as a mark.

---

## Budget Estimate

| Item | Estimated Cost |
|---|---|
| 3 provisional patents (counsel prep + filing) | $4,500–$9,000 |
| 2 trademark applications (2 classes each, intent-to-use) | $1,000–$2,000 |
| Trademark clearance searches (2 marks) | $600–$1,200 |
| **Total estimated range** | **$6,100–$12,200** |

---

## Attached Documents

1. `provisional-1-enforcement-spectrum.md` — Patent draft #1
2. `provisional-2-brain-architecture.md` — Patent draft #2
3. `provisional-3-intent-engineering.md` — Patent draft #3
4. `trademark-checklist-admiral-framework.md` — TM filing checklist
5. `trademark-checklist-intent-engineering.md` — TM filing checklist

## Supporting Materials (in repository)

- `research/invention-dates.md` — Priority date evidence for all 23 innovations
- `research/patent-opportunity-analysis.md` — Full 23-opportunity analysis with strength assessments
- `aiStrat/admiral/spec/` — Complete specification (12 parts + appendices)
- `research/competitive-landscape-2026.md` — Competitive analysis
- `research/idea-competitors-2026.md` — Idea-level competitor positioning
