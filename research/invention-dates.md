# Admiral Framework — Invention Date Documentation

**Generated:** 2026-03-16
**Purpose:** Phase 4.1 — Document invention dates for all 23 patentable innovations
**Method:** Git history analysis (commit messages, diff content, file creation dates)
**Source:** `research/patent-opportunity-analysis.md`

---

## Summary

This document records the earliest git commit establishing each of the 23 patent opportunities
identified in the Admiral Framework. These dates serve as evidence of invention priority for
provisional patent filings.

---

## Invention Dates

| # | Innovation | Tier | Priority | Earliest Date | Commit | Summary |
|---|---|---|---|---|---|---|
| **1** | The Enforcement Spectrum | 1 | HIGHEST | 2026-03-13 | `50ffb14` | Merge pull request #67 from seandonn-boston/claude/admiral-control-plane-mvp-... |
| **2** | Fleet-Wide Institutional Memory (The Brain) | 1 | HIGH | 2026-03-14 | `49bd0db` | Reframe sales pitch around human visibility and control over autonomous AI work |
| **3** | Decision Authority Taxonomy | 1 | HIGH | 2026-03-14 | `fa42d6a` | Update sales pitch with AI Work OS reframe, expanded competitive landscape, a... |
| **4** | Self-Healing Governance Loops | 1 | MEDIUM | 2026-03-15 | `10beba1` | docs: wire Brain consultation into all decision-making docs |
| **5** | Standing Orders as Mechanical Behavioral Invariants | 1 | MEDIUM | 2026-03-14 | `0bd066f` | Fix all cross-references for admiral/ subdirectory reorganization |
| **6** | Closed-Loop Data Ecosystem | 1 | MEDIUM | 2026-03-13 | `46281a2` | Merge pull request #68 from seandonn-boston/claude/closed-loop-data-ecosystem... |
| **7** | Progressive Component Scaling | 1 | LOW | 2026-03-14 | `f073fdf` | feat: redesign adoption system to per-component scaling + fix 15 spec defects |
| **8** | Intent Engineering Methodology | 2 | HIGH | 2026-03-14 | `701258d` | Reorganize admiral/ into spec/, extensions/, reference/ subdirectories |
| **9** | Agent Identity with Non-Delegable Tokens | 2 | HIGH | 2026-03-15 | `420925f` | feat: implement Admiral Framework MVP (Phase 4) — governed agent with enfor... |
| **10** | Five-Layer Quarantine Immune System | 2 | HIGH | 2026-03-15 | `420925f` | feat: implement Admiral Framework MVP (Phase 4) — governed agent with enfor... |
| **11** | Context Window Stratification | 2 | MEDIUM-HIGH | 2026-03-15 | `420925f` | feat: implement Admiral Framework MVP (Phase 4) — governed agent with enfor... |
| **12** | A2A Protocol with Agent Cards | 2 | MEDIUM | 2026-03-15 | `ad6e7fd` | docs: expand patent analysis from 7 to 23 distinct opportunities |
| **13** | Fleet Catalog with Role Architecture | 2 | MEDIUM | 2026-03-14 | `ad291a2` | Add critical codebase assessment (v0.3.1-alpha) |
| **14** | Governance Agents | 2 | MEDIUM-HIGH | 2026-03-13 | `f5a2be7` | Merge pull request #69 from seandonn-boston/claude/update-anthropic-research-... |
| **15** | Multi-Agent Handoff Protocol | 2 | MEDIUM | 2026-03-15 | `10beba1` | docs: wire Brain consultation into all decision-making docs |
| **16** | Orchestrator Degradation | 2 | MEDIUM | 2026-03-15 | `ad6e7fd` | docs: expand patent analysis from 7 to 23 distinct opportunities |
| **17** | Metered Service Broker | 3 | LOW-MEDIUM | — | `—` | No matching commits found |
| **18** | AI Landscape Monitor | 3 | LOW-MEDIUM | 2026-03-15 | `ad6e7fd` | docs: expand patent analysis from 7 to 23 distinct opportunities |
| **19** | Spec-First Pipeline | 3 | LOW | 2026-03-15 | `10beba1` | docs: wire Brain consultation into all decision-making docs |
| **20** | Strategic Adaptation Protocol | 3 | LOW-MEDIUM | — | `—` | No matching commits found |
| **21** | Agentic Engineering Ladder | 3 | MEDIUM | 2026-03-13 | `f5a2be7` | Merge pull request #69 from seandonn-boston/claude/update-anthropic-research-... |
| **22** | Fleet Pause/Resume Protocol | 3 | LOW | 2026-03-15 | `ad6e7fd` | docs: expand patent analysis from 7 to 23 distinct opportunities |
| **23** | Execution Trace Forest Builder | 3 | LOW | 2026-03-13 | `f5a2be7` | Merge pull request #69 from seandonn-boston/claude/update-anthropic-research-... |

---

## Detailed Findings

### #1: The Enforcement Spectrum

**Tier:** 1 | **Priority:** HIGHEST

**Search patterns:** `enforcement.spectrum,hard enforcement,firm guidance,soft guidance,hook.*lifecycle,deterministic.*enforcement,enforcement.*tier`
**Relevant paths:** `admiral/spec/part3* .hooks/ admiral/standing-orders/`

**Earliest relevant commits:**

```
2026-03-15 420925f feat: implement Admiral Framework MVP (Phase 4) — governed agent with enforced hooks
2026-03-15 cf4daf2 feat: add context source routing logic (long context vs RAG vs escalate)
2026-03-15 d2c2960 feat: resolve SD-01 spec-debt — increase hook enforcement from 4/15 to 8/15
2026-03-16 d34c4d5 fix: eliminate redundant state loads, add hook test suite (34/34 passing)
```

---

### #2: Fleet-Wide Institutional Memory (The Brain)

**Tier:** 1 | **Priority:** HIGH

**Search patterns:** `brain.*architecture,institutional.memory,knowledge.*entry,strengthening.*decay,supersession.*chain,semantic.*retrieval,brain.*level`
**Relevant paths:** `admiral/spec/part5* brain/ .brain/ admiral/bin/brain_*`

**Earliest relevant commits:**

```
2026-03-15 420925f feat: implement Admiral Framework MVP (Phase 4) — governed agent with enforced hooks
2026-03-15 cf4daf2 feat: add context source routing logic (long context vs RAG vs escalate)
2026-03-16 3e5d465 docs: add traced session brain entries (B1 round-trip demo data)
2026-03-16 cd64cc3 docs: identify unresolved internal contradictions in framework claims
```

---

### #3: Decision Authority Taxonomy

**Tier:** 1 | **Priority:** HIGH

**Search patterns:** `decision.authority,autonomous.*propose.*escalate,trust.calibration,authority.*tier,four.tier`
**Relevant paths:** `admiral/spec/part1* admiral/spec/part3* AGENTS.md`

**Earliest relevant commits:**

```
2026-03-14 fa42d6a Update sales pitch with AI Work OS reframe, expanded competitive landscape, and tone adjustment
2026-03-15 10beba1 docs: wire Brain consultation into all decision-making docs
2026-03-15 420925f feat: implement Admiral Framework MVP (Phase 4) — governed agent with enforced hooks
```

---

### #4: Self-Healing Governance Loops

**Tier:** 1 | **Priority:** MEDIUM

**Search patterns:** `self.heal,recovery.ladder,cycle.detection,error.*signature.*tuple,governance.*loop`
**Relevant paths:** `admiral/spec/part3* .hooks/ admiral/spec/part10*`

**Earliest relevant commits:**

```
2026-03-15 420925f feat: implement Admiral Framework MVP (Phase 4) — governed agent with enforced hooks
2026-03-15 cf4daf2 feat: add context source routing logic (long context vs RAG vs escalate)
2026-03-15 d2c2960 feat: resolve SD-01 spec-debt — increase hook enforcement from 4/15 to 8/15
2026-03-16 d34c4d5 fix: eliminate redundant state loads, add hook test suite (34/34 passing)
```

---

### #5: Standing Orders as Mechanical Behavioral Invariants

**Tier:** 1 | **Priority:** MEDIUM

**Search patterns:** `standing.order,behavioral.invariant,mechanical.*invariant,SO-[0-9]`
**Relevant paths:** `admiral/standing-orders/ admiral/spec/part11*`

**Earliest relevant commits:**

```
2026-03-14 0bd066f Fix all cross-references for admiral/ subdirectory reorganization
2026-03-14 701258d Reorganize admiral/ into spec/, extensions/, reference/ subdirectories
2026-03-14 ad291a2 Add critical codebase assessment (v0.3.1-alpha)
2026-03-15 10beba1 docs: wire Brain consultation into all decision-making docs
2026-03-15 420925f feat: implement Admiral Framework MVP (Phase 4) — governed agent with enforced hooks
```

---

### #6: Closed-Loop Data Ecosystem

**Tier:** 1 | **Priority:** MEDIUM

**Search patterns:** `closed.loop.*data,outcome.attribution,data.*ecosystem,feedback.*loop.*agent`
**Relevant paths:** `admiral/spec/part12* monitor/`

**Earliest relevant commits:**

```
2026-03-13 46281a2 Merge pull request #68 from seandonn-boston/claude/closed-loop-data-ecosystem-kDkDL
2026-03-14 ba24f27 Add Part 12: Closed-Loop Data Ecosystem specification
2026-03-14 f073fdf feat: redesign adoption system to per-component scaling + fix 15 spec defects
2026-03-15 4107d83 docs: expand patent analysis with full-platform scenario
```

---

### #7: Progressive Component Scaling

**Tier:** 1 | **Priority:** LOW

**Search patterns:** `progressive.*scal,dependency.*matrix,component.*level,starter.*team.*governed,B1.*B2.*B3`
**Relevant paths:** `admiral/spec/index.md admiral/reference/`

**Earliest relevant commits:**

```
2026-03-14 f073fdf feat: redesign adoption system to per-component scaling + fix 15 spec defects
2026-03-14 f9113d0 feat: update remaining spec files to per-component notation
2026-03-15 fe0fa1c docs: resolve version inconsistencies, narrative contradictions, and spec debt
```

---

### #8: Intent Engineering Methodology

**Tier:** 2 | **Priority:** HIGH

**Search patterns:** `intent.engineer,six.element,goal.*priority.*constraint,prompt.anatomy,beyond.*prompt`
**Relevant paths:** `admiral/spec/part2* admiral/spec/part6* fleet/prompt-anatomy*`

**Earliest relevant commits:**

```
2026-03-14 701258d Reorganize admiral/ into spec/, extensions/, reference/ subdirectories
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
2026-03-16 bd78e74 feat: implement Phase 3 Reference Implementation Wedge
```

---

### #9: Agent Identity with Non-Delegable Tokens

**Tier:** 2 | **Priority:** HIGH

**Search patterns:** `agent.identity,non.delegable,identity.*token,zero.trust.*agent,authority.*self.*escalat`
**Relevant paths:** `admiral/spec/part3* admiral/spec/part10*`

**Earliest relevant commits:**

```
2026-03-15 420925f feat: implement Admiral Framework MVP (Phase 4) — governed agent with enforced hooks
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
2026-03-16 bd78e74 feat: implement Phase 3 Reference Implementation Wedge
```

---

### #10: Five-Layer Quarantine Immune System

**Tier:** 2 | **Priority:** HIGH

**Search patterns:** `quarantine.*immune,five.layer,injection.*detect,llm.airgap,antibody.*generat`
**Relevant paths:** `admiral/spec/part3* admiral/lib/injection_detect* monitor/`

**Earliest relevant commits:**

```
2026-03-15 420925f feat: implement Admiral Framework MVP (Phase 4) — governed agent with enforced hooks
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
2026-03-16 4daec94 feat: resolve SD-04 spec-debt — implement Monitor quarantine Layers 3-5
```

---

### #11: Context Window Stratification

**Tier:** 2 | **Priority:** MEDIUM-HIGH

**Search patterns:** `context.*window.*strat,primacy.*recency,loading.*order.*protocol,context.*health,context.*sacrifice`
**Relevant paths:** `admiral/spec/part2* .hooks/session_start* .hooks/context_*`

**Earliest relevant commits:**

```
2026-03-15 420925f feat: implement Admiral Framework MVP (Phase 4) — governed agent with enforced hooks
2026-03-15 4515ff6 Close Phase 4.4 gaps: update QUICKSTART, add e2e session log, bump to v0.6.0-alpha
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
2026-03-15 f09f18e fix: eliminate all deadlock vectors from hook infrastructure
```

---

### #12: A2A Protocol with Agent Cards

**Tier:** 2 | **Priority:** MEDIUM

**Search patterns:** `agent.card,a2a.*protocol,agent.to.agent,json.rpc.*agent,cross.fleet.*collaborat`
**Relevant paths:** `admiral/spec/part4*`

**Earliest relevant commits:**

```
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
```

---

### #13: Fleet Catalog with Role Architecture

**Tier:** 2 | **Priority:** MEDIUM

**Search patterns:** `fleet.*catalog,role.*architecture,interface.*contract,sender.delivers,receiver.returns,routing.*rule`
**Relevant paths:** `admiral/spec/part6* admiral/spec/part8* fleet/`

**Earliest relevant commits:**

```
2026-03-14 ad291a2 Add critical codebase assessment (v0.3.1-alpha)
2026-03-14 ba24f27 Add Part 12: Closed-Loop Data Ecosystem specification
2026-03-14 fa42d6a Update sales pitch with AI Work OS reframe, expanded competitive landscape, and tone adjustment
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
2026-03-15 cf4daf2 feat: add context source routing logic (long context vs RAG vs escalate)
```

---

### #14: Governance Agents

**Tier:** 2 | **Priority:** MEDIUM-HIGH

**Search patterns:** `governance.*agent,drift.*monitor,hallucination.*audit,bias.*sentinel,loop.*breaker,red.*team.*agent`
**Relevant paths:** `admiral/spec/part8* admiral/spec/part10* control-plane/src/runaway*`

**Earliest relevant commits:**

```
2026-03-13 f5a2be7 Merge pull request #69 from seandonn-boston/claude/update-anthropic-research-u2PA0
2026-03-14 49bd0db Reframe sales pitch around human visibility and control over autonomous AI work
2026-03-14 e815d1b docs: critical codebase review v2 — rating 6.8/10
2026-03-14 f073fdf feat: redesign adoption system to per-component scaling + fix 15 spec defects
2026-03-15 fd9aabe fix: SPC baseline isolation and interval flush ordering, add tests
```

---

### #15: Multi-Agent Handoff Protocol

**Tier:** 2 | **Priority:** MEDIUM

**Search patterns:** `handoff.*protocol,task.*handoff,mediator.*agent,handoff.*verif`
**Relevant paths:** `admiral/spec/part6* admiral/spec/part7*`

**Earliest relevant commits:**

```
2026-03-15 10beba1 docs: wire Brain consultation into all decision-making docs
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
```

---

### #16: Orchestrator Degradation

**Tier:** 2 | **Priority:** MEDIUM

**Search patterns:** `orchestrator.*degrad,fallback.*decompos,fleet.*pause,heartbeat.*miss`
**Relevant paths:** `admiral/spec/part8* admiral/spec/part10*`

**Earliest relevant commits:**

```
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
```

---

### #17: Metered Service Broker

**Tier:** 3 | **Priority:** LOW-MEDIUM

**Search patterns:** `metered.*service,per.second.*bill,credential.*vault,session.*broker,billing.*engine`
**Relevant paths:** `admiral/spec/part8*`

**Earliest relevant commits:**

```
(no matching commits found)
```

---

### #18: AI Landscape Monitor

**Tier:** 3 | **Priority:** LOW-MEDIUM

**Search patterns:** `landscape.*monitor,rss.*scan,seed.*candidate,model.*provider.*scan`
**Relevant paths:** `admiral/spec/part9* monitor/`

**Earliest relevant commits:**

```
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
```

---

### #19: Spec-First Pipeline

**Tier:** 3 | **Priority:** LOW

**Search patterns:** `spec.first.*pipeline,phase.*artifact,mission.*template,requirements.*spec.*design.*spec`
**Relevant paths:** `admiral/spec/part1* admiral/spec/part6*`

**Earliest relevant commits:**

```
2026-03-15 10beba1 docs: wire Brain consultation into all decision-making docs
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
```

---

### #20: Strategic Adaptation Protocol

**Tier:** 3 | **Priority:** LOW-MEDIUM

**Search patterns:** `cascade.*map,adaptation.*protocol,artifact.*depend,fleet.*pause.*protocol,strategic.*shift`
**Relevant paths:** `admiral/spec/part8*`

**Earliest relevant commits:**

```
(no matching commits found)
```

---

### #21: Agentic Engineering Ladder

**Tier:** 3 | **Priority:** MEDIUM

**Search patterns:** `agentic.*engineering.*ladder,nine.rung,prompt.*context.*intent.*constraint,autonomy.*engineering`
**Relevant paths:** `thesis/agentic-engineering-ladder*`

**Earliest relevant commits:**

```
2026-03-13 f5a2be7 Merge pull request #69 from seandonn-boston/claude/update-anthropic-research-u2PA0
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
```

---

### #22: Fleet Pause/Resume Protocol

**Tier:** 3 | **Priority:** LOW

**Search patterns:** `fleet.*pause.*resume,checkpoint.*continu,coordinated.*pause,resume.*rehydrat`
**Relevant paths:** `admiral/spec/part7* admiral/spec/part8*`

**Earliest relevant commits:**

```
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
```

---

### #23: Execution Trace Forest Builder

**Tier:** 3 | **Priority:** LOW

**Search patterns:** `trace.*forest,reasoning.*tree,trace.*node,ascii.*tree.*agent,flat.*event.*hierarchi`
**Relevant paths:** `control-plane/src/trace* admiral/spec/part7*`

**Earliest relevant commits:**

```
2026-03-13 f5a2be7 Merge pull request #69 from seandonn-boston/claude/update-anthropic-research-u2PA0
2026-03-15 ad6e7fd docs: expand patent analysis from 7 to 23 distinct opportunities
```

---

*Generated by `research/extract-invention-dates.sh` — Phase 4.1 of [plan/index.md](../plan/index.md)*
