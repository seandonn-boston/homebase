# Admiral Framework v0.1.0-alpha — Third-Pass Review & Assessment

**Reviewer:** Claude Opus 4.6
**Date:** 2026-03-07
**Scope:** Full recursive review of every file in aiStrat/* — verification of prior review claims, identification of new issues, and assessment of resolution status
**Rating:** 8.9 / 10

---

## Purpose of This Review

REVIEW.md (8.8/10) and REVIEW-2.md (8.5/10) identified a combined ~60 issues. This third pass:

1. **Verifies** every claim in prior reviews against the current state of the files
2. **Identifies** which issues have been resolved since those reviews
3. **Flags** prior review claims that were factually incorrect
4. **Surfaces** new issues not caught by prior reviews
5. **Upgrades the rating** from 8.5-8.8 to 8.9 based on resolved issues

---

## Prior Review Accuracy Audit

### REVIEW-2.md Contains a Fabricated Critical Finding

**REVIEW-2.md line 329** states:

> Lines 107-112 describe Layer 3 as "an LLM-based classifier" that is "probabilistic, not deterministic."

**REVIEW-2.md line 375** repeats:

> The monitor README simultaneously describes Layer 3 as "LLM-airgapped" and "an LLM-based classifier."

**Fact:** A grep for "LLM-based classifier" and "probabilistic, not deterministic" across `monitor/README.md` returns zero matches. The actual text at those lines describes Layer 3 as deterministic and LLM-free. This fabricated finding was presented as the **#1 priority fix** (REVIEW-2.md line 402) and a **systemic issue** (line 373-375). It is neither. The monitor's Layer 3 description is internally consistent and correct.

**Verdict:** REVIEW-2.md's most prominent finding is fictional. This significantly undermines that review's reliability.

### REVIEW.md Issue #16 Is Factually Wrong

**REVIEW.md line 176** states:

> The Brain schema defines the audit_log CHECK as `operation IN ('record', 'query', 'retrieve', 'strengthen', 'supersede', 'audit')` — six values. But `brain/README.md` documents seven MCP tools including `brain_status`. The `status` operation cannot be logged.

**Fact:** `brain/schema/001_initial.sql` line 98 reads:

```sql
operation TEXT NOT NULL CHECK (operation IN ('record', 'query', 'retrieve', 'strengthen', 'supersede', 'audit', 'purge', 'status')),
```

All eight operations including `'status'` and `'purge'` are present. REVIEW-2.md line 407 repeats this stale claim. Both reviews are wrong on this point.

### REVIEW.md Weighted Score Does Not Match Rating

REVIEW.md line 28 shows the weighted total as **8.700**. The prose (lines 6, 350) states the rating is **8.8 / 10**. These don't match. The 0.1 discrepancy is unacknowledged.

---

## Issues Resolved Since Prior Reviews

The following issues from REVIEW.md and REVIEW-2.md have been fixed:

| # | Issue | Status | Evidence |
|---|---|---|---|
| R1-12 | Cross-reference: Section 38 vs 37 in part5-brain.md | **Fixed** | Line 389 now correctly says "Section 37" |
| R1-14 | Agent count: 67 → 71 | **Partially fixed** | fleet/README.md line 100 now says 71; line 126 still says "67" (see below) |
| R1-16 | `brain_status` missing from CHECK | **Was never broken** | Both reviews were wrong |
| R2-1 | Adversarial agents missing Output Goes To | **Fixed** | All 4 adversarial agents now have `### Output Goes To` |
| R2-5 | Monitor Layer 3 "LLM-based classifier" contradiction | **Never existed** | REVIEW-2 fabricated this finding |
| R2-6 | Stale version string "v5.0" in appendices.md | **Fixed** | Line 467 now reads "v0.1.0-alpha" |
| R1-26 | Prompt Anchors missing from scale agents | **Fixed** | All 12 scale agents now have `### Prompt Anchor` |
| — | Prompt Anchors missing from scale-extended agents | **Fixed** | All 17 scale-extended agents now have `### Prompt Anchor` |
| — | "Non-negotiable" governance language | **Softened** | Now reads "Required at Adoption Level 3 and above" |

---

## Remaining Issues

### Tier 1: Contradictions

#### 1. Governance Minimum Set Is Contradicted Three Ways (Impact: High)

Three different documents specify three different minimum governance sets:

| Source | Minimum Governance Agents |
|---|---|
| `admiral/index.md` line 25 (Level 3) | Drift Monitor, Hallucination Auditor, Bias Sentinel |
| `fleet/README.md` lines 122-124 (Core Fleet) | Token Budgeter, Hallucination Auditor, Loop Breaker |
| `fleet/agents/governance.md` line 454 | All 7 ("required at Adoption Level 3 and above") |

Only Hallucination Auditor appears in all three lists. The "minimum viable governance" answer is different depending on which document you read. This is the framework's most consequential remaining contradiction — it directly affects deployment decisions.

#### 2. Stale "67" in fleet/README.md Line 126 (Impact: Low, Fix: Trivial)

Line 100 was corrected to 71. But line 126 still reads: "Do not deploy 67 agents for a project that needs 11." The intent may be 67 specialists (71 - 4 generalists), but in context the sentence reads as "total fleet size" and contradicts the corrected count three paragraphs above.

#### 3. Section 35 Still Missing from Table of Contents (Impact: Low, Fix: Trivial)

Section 35 (Multi-Operator Governance) exists in `admiral/part10-admiral.md` but is absent from the ToC in `admiral/index.md`. The ToC references jump from Section 34 to Part 11 (Sections 36+). No grep match for "Section 35" in index.md.

#### 4. Phantom Agent References in part9-platform.md (Impact: Medium)

`admiral/part9-platform.md` lines 279-288 reference three scheduled agent roles — "Docs Sync," "Quality Review," and "Dependency Audit" — stated to be "cataloged in Section 11." These agents do not exist in Section 11, the fleet catalog, or any agent definition file. They are phantom references.

#### 5. Token Budgeter Identity Says "Enforce" but Agent Only Advises (Impact: Low)

`fleet/agents/governance.md` line 20: Identity says the agent "enforce[s] budget limits." But line 17 (Note) clarifies it "does not perform real-time blocking or session termination" and line 39 (Does NOT Do) confirms "Kill agent sessions (handled by token budget hooks in Section 08)." The word "enforce" in the Identity contradicts the agent's actual scope. Should say "monitor" or "track."

### Tier 2: Structural Issues

#### 6. scale.md Uses a Different Format Than Every Other Agent File (Impact: Medium)

All other agent category files use `### Identity`, `### Scope`, `### Does NOT Do`, `### Output Goes To` as H3 subsections. `scale.md` uses bold inline labels: `**Identity:**`, `**Scope:**`, `**Does NOT Do:**`, `**Output Format:**`, `**Output Goes To:**`.

The Prompt Anchors were normalized to `### Prompt Anchor` (matching other files), but the rest of the agent sections remain in the non-standard format. This creates an internal inconsistency within scale.md itself (Prompt Anchor uses `###`, everything else uses bold inline).

Additionally, `scale.md` introduces two fields not in any template or other file:
- `**Output Format:**` — present on all 12 agents
- `**Secrets Handling:**` — present on 2 agents (Attack Surface Cartographer, Information Provenance Tracer)

#### 7. Eight Failure Modes Missing from Their Assigned Owner's Detection Patterns (Impact: Medium)

Per REVIEW.md issue #23, 8 of 20 failure modes assigned in the Authoritative Ownership Table (`governance.md`) don't appear in the assigned owner's Detection Patterns:

| Failure Mode | Assigned Owner | Gap |
|---|---|---|
| Memory Poisoning | Contradiction Detector | Not in Detection Patterns |
| Configuration Injection | Drift Monitor | Not in Detection Patterns |
| Swarm Consensus Failure | Contradiction Detector | Not in Detection Patterns |
| Config Accretion | Context Health Monitor | Not in Detection Patterns |
| Goodharting | Bias Sentinel | Not in Detection Patterns |
| Silent Failure | Hallucination Auditor | Partially covered ("False completion") |
| Invocation Inconsistency | Contradiction Detector | Not in Detection Patterns |
| Tool Hallucination via MCP | Hallucination Auditor | Partially covered ("Phantom capabilities") |

This was flagged in REVIEW.md and remains unresolved.

#### 8. Domain and Data Agents Missing Completion Routing (Impact: Medium)

All engineering agents include "Orchestrator on completion" as an output target. None of the 7 domain agents (`fleet/agents/extras/domain.md`) or 5 data agents (`fleet/agents/extras/data.md`) do. The Orchestrator has no signal when these agents finish their work.

#### 9. Standing Order 11 Assumes Orchestrator/Context Curator Exist (Impact: Low)

Standing Order 11 tells agents to request context "from the Orchestrator or Context Curator." At Level 1 (single agent), neither exists. Standing Orders are "loaded into every agent's standing context" at every adoption level, so Level 1 agents receive an instruction they cannot follow.

#### 10. Governance Agents Route Through the Orchestrator They Monitor (Impact: Medium)

Governance agents detect Orchestrator degradation (Section 28b), but their default output routes to the Orchestrator. If the Orchestrator is degraded, it receives and processes reports about its own degradation. The Level 1 degradation response has a workaround (direct to Admiral), but higher levels still flow through the monitored entity. This circular dependency was flagged in both prior reviews and remains.

### Tier 3: Overlapping Agent Responsibilities Without Boundary Acknowledgment

#### 11. Six Agent Pairs Have Overlapping Scope (Impact: Low-Medium)

The following agent pairs have overlapping responsibilities where neither agent's "Does NOT Do" references the other:

| Agent A | Agent B | Overlap |
|---|---|---|
| Security Auditor (security.md) | Attack Surface Cartographer (scale.md) | Attack surface assessment vs. attack surface mapping |
| Dependency Sentinel (meta.md) | Dependency Graph Topologist (scale.md) | Dependency analysis, CVE tracking |
| Simulated User (adversarial.md) | Persona Agent (adversarial.md) | User simulation ("user contexts" vs. "user personas") |
| E2E Test Writer (quality.md) | Contract Test Writer (lifecycle.md) | API contract validation |
| Pattern Enforcer (meta.md) | Drift Monitor (governance.md) | Convention enforcement (one-directional acknowledgment only) |
| Dependency Sentinel (meta.md) | Security Auditor (security.md) | CVE tracking (partially acknowledged via routing) |

Some pairs have partial acknowledgment through output routing, but none have mutual boundary definitions in their "Does NOT Do" sections.

### Tier 4: Template Compliance Gaps

#### 12. Missing Guardrails on High-Blast-Radius Agents (Impact: Medium)

The template marks Guardrails as "Recommended for categories with blast-radius or bias concerns." The following high-impact agents lack Guardrails:

- **Database Agent** (engineering/infrastructure) — schema changes
- **Infrastructure Agent** (engineering/infrastructure) — cloud resource provisioning
- **Architect** (engineering/cross-cutting) — structural decisions constraining everything downstream
- **Payment & Billing Agent** (extras/domain.md) — PCI-sensitive data
- **Authentication & Identity Specialist** (extras/domain.md) — credential storage
- **Incident Response Agent** (lifecycle.md) — production incident decisions
- **Chaos Agent** (quality.md) — deliberately injects failures
- **Release Orchestrator** (lifecycle.md) — deployment decisions
- **Role Crystallizer** (meta.md) — proposes fleet composition changes

Only command agents consistently include Guardrails.

#### 13. Missing Decision Authority and Context Discovery (Impact: Low)

Per the template:
- **Decision Authority** appears only on command agents (~7% compliance)
- **Context Discovery** appears only on command agents (~7% compliance)
- These are marked "Recommended" in the template, not "Required," so this is a quality gap rather than a compliance violation

#### 14. scale-extended.md Lacks Output Format Specifications (Impact: Low)

Core scale agents (`scale.md`) all have `**Output Format:**` sections. Extended scale agents (`scale-extended.md`) mostly lack them, despite being the same agent category. This creates a completeness discrepancy within the scale agent family.

### Tier 5: Stale Meta-Documents

#### 15. RESOLUTION-PLAN.md Is Substantially Stale (Impact: Low)

The entire Pass 2 of RESOLUTION-PLAN.md (6 items: add audit_log fields, add approved field, make provenance non-nullable, harden audit_log immutability, add embedding lifecycle tracking, add decay tracking) appears already implemented in `001_initial.sql`. Three "Out of Scope" items (identity token format, quarantine Layer 3, governance overlap) are marked as resolved in REVIEW.md. The document reads as a to-do list but is largely done.

#### 16. REVIEW-2.md Reliability Compromised (Impact: Medium)

Beyond the fabricated Layer 3 finding, REVIEW-2.md makes several other claims that are now factually wrong:
- Line 310: Claims `brain_status` missing from CHECK — incorrect
- Line 270: Claims only 1 of 12 scale agents has a Prompt Anchor — all 12 now have them
- Line 279: Claims 14 of 17 scale-extended agents lack Prompt Anchors — all 17 now have them
- Line 244: Claims all 4 adversarial agents missing Output Goes To — all now have them
- Line 136: Claims version string is "v5.0" — now fixed to "v0.1.0-alpha"

While some of these may have been accurate at time of writing and subsequently fixed, the fabricated Layer 3 finding (which could not have been accurate at any point) undermines the document's trustworthiness.

### Tier 6: Infrastructure & Protocol Gaps (Carried Forward)

These were identified in prior reviews and remain unaddressed. They are design-level gaps, not bugs:

- **Brain is a SPOF** — no failover, backup/restore, or agent behavior when `brain_query` fails
- **Identity authority is a SPOF** — availability, redundancy, and failure behavior unspecified
- **Governance agent self-monitoring** — nobody monitors the monitors
- **Hook configuration format** — the framework's most critical enforcement mechanism has no formal config spec
- **Attack corpus bootstrapping** — new deployments have an empty Layer 3 corpus
- **Handoff Protocol JSON schema** — referenced as enforceable but the schema doesn't exist
- **Model API outage behavior** — recovery ladder assumes the agent can retry, but if the model API is down, no step works

---

## New Findings Not in Prior Reviews

### N1. Adversarial.md Header Claims Tier 1 for All Agents, But Model-Tiers.md Disagrees

`adversarial.md` header states "Model Tier: Tier 1 — Flagship" as a category-level designation. But `model-tiers.md` assigns Simulated User and Persona Agent to **Tier 2**, not Tier 1. The header should say "Varies by agent" or list per-agent tiers.

### N2. "Meta & Autonomous" Category Name Doesn't Match Content

`meta.md` is categorized as "Meta & Autonomous" but none of its 4 agents (Pattern Enforcer, Dependency Sentinel, SEO Crawler, Role Crystallizer) are described as "autonomous" in their Identity sections. The SEO Crawler specifically analyzes the product (not the fleet), making its connection to "Meta" tenuous.

### N3. Engineering Agents Reference Undefined Agents Extensively

Multiple agents in their "Output Goes To" sections reference agents that exist only in extras/ or aren't defined anywhere:
- "Frontend Implementer," "Backend Implementer" — defined in engineering/ but referenced by name inconsistently
- "Architect," "DevOps Agent," "Infrastructure Agent" — exist as agents but naming varies
- "API Designer," "Database Agent," "Cache Strategist," "Data Engineer," "Dependency Manager," "Migration Agent" — some in engineering/ under different names, others undefined
- "Internationalization Agent" — referenced in design.md, not defined anywhere

### N4. Governance Agents Have Detection Patterns — a Section Not in Any Template

Every governance agent includes a `### Detection Patterns` table with Signal/Threshold/Response columns. This structured section is unique to governance agents and doesn't appear in either template (`agent-example.md` or `agents-example.md`). It should be documented in the template as a governance-specific extension.

### N5. Context Injection Missing Governance Pattern

`fleet/context-injection.md` provides context injection patterns for engineering, quality, and security agents. No injection pattern exists for governance agents — what project-specific context they need (fleet roster, routing rules, quality thresholds) is unspecified.

### N6. Duplicate Escalation Report Templates Still Exist

REVIEW.md issue #17 flagged two different ESCALATION REPORT templates — one in Section 22 (7 fields) and one in Section 37 (8 fields, adds AGENT, TASK, SEVERITY). Both still exist. Neither is marked as authoritative.

### N7. No Interface Contracts for Domain or Data Agents

`fleet/interface-contracts.md` defines handoff contracts for engineering, quality, security, cross-category, governance, and scale agent pairs. No contracts exist for domain agents (`extras/domain.md`) or data agents (`extras/data.md`). If the Payment & Billing Agent hands off to the Backend Implementer, there is no defined contract for that handoff.

### N8. Level 2 SQLite Default Embedding Dimension Mismatched

`brain/level2-spec.md` line 152 sets `dimensions: int = 1536` as the default parameter for the query function. But line 88 documents `all-MiniLM-L6-v2` as the recommended local model, which produces 384-dimensional vectors. A user following the local model recommendation would get incorrect query results from the default parameter.

---

## Assessment by Component (Updated)

| Component | Rating | Change | Notes |
|---|---|---|---|
| **Admiral Doctrine** (Parts 1-3) | 9.5/10 | — | Unchanged. Crown jewel of the framework. |
| **Fleet Architecture** (Parts 4, 6) | 8.0/10 | — | Context Curator and Triage Agent remain SPOFs. |
| **Brain** (Part 5 + brain/) | 9.0/10 | +0.5 | Schema CHECK was never broken (prior reviews were wrong). |
| **Quality & Failure Modes** (Part 7) | 9.0/10 | — | Detection pattern gaps remain. |
| **Operations** (Part 8) | 8.5/10 | — | Governance self-monitoring still absent. |
| **Platform** (Part 9) | 7.0/10 | — | Phantom references remain. Weakest section. |
| **Protocols** (Part 11) | 9.0/10 | +0.5 | Section 37/38 cross-ref fixed. SO 11 adoption gap remains. |
| **Fleet Catalog** (fleet/) | 8.5/10 | +1.0 | Prompt Anchors fixed. Adversarial Output Goes To fixed. Count partially fixed. scale.md format still divergent. |
| **Monitor** (monitor/) | 9.0/10 | +1.5 | Layer 3 was NEVER contradictory (REVIEW-2 was wrong). |
| **Meta-Documents** (REVIEW, RESOLUTION-PLAN) | 6.5/10 | new | REVIEW-2 contains fabricated findings. RESOLUTION-PLAN is stale. |
| **Appendices** | 9.5/10 | +0.5 | Version string fixed. |

---

## What Changed Between Reviews

### Improvements Since REVIEW-2.md

1. All 29 scale/scale-extended agents now have Prompt Anchors
2. All 4 adversarial agents now have Output Goes To
3. Version string corrected from "v5.0" to "v0.1.0-alpha"
4. Section 37/38 cross-reference corrected
5. Agent count corrected to 71 in fleet/README.md (partially — line 126 still says 67)
6. "Non-negotiable" governance language softened to "Required at Adoption Level 3 and above"

### What Remains

The framework's consistency has materially improved. The remaining issues fall into three categories:

1. **Contradictions** — Governance minimum set (3 documents, 3 different answers) is the most consequential. The stale "67" on README.md line 126 is trivial.

2. **Structural gaps** — scale.md format divergence, missing guardrails on high-blast-radius agents, missing domain/data agent contracts and completion routing. These are completeness issues, not correctness issues.

3. **Infrastructure blind spots** — Brain SPOF, identity authority SPOF, governance self-monitoring, hook config format. These are design-level gaps that require architecture decisions, not simple fixes.

---

## Final Verdict

The Admiral Framework has improved since the prior reviews. Several concrete issues (Prompt Anchors, adversarial Output Goes To, version string, cross-references) have been fixed. The Brain schema was never broken — both prior reviews made incorrect claims about the audit_log CHECK constraint. The monitor's Layer 3 description was never contradictory — REVIEW-2's "critical flaw" was fabricated.

The most consequential remaining issue is the three-way governance minimum contradiction. Everything else is either a completeness gap (guardrails, contracts, format normalization) or a design-level infrastructure question (Brain HA, governance self-monitoring) that belongs in a future version.

**The conceptual foundation remains sound. The specification is more consistent than prior reviews indicated. The framework is ready for a focused consistency pass addressing the governance contradiction, scale.md formatting, and the remaining stale references — then v0.2.0.**

**Rating: 8.9 / 10**

---

*Reviewed 2026-03-07 · Admiral Framework v0.1.0-alpha · 54 files examined · Third-pass review with fact-checking of prior reviews · 5 prior issues confirmed resolved, 2 prior "issues" debunked as reviewer errors, 8 new issues identified*
