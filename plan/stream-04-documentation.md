# Stream 4: Documentation — From 6/10 to 10/10

> *"Great codebases optimize for the reader, not the writer." — Pattern across all Tier 1 codebases*

**Current score:** 6/10
**Target score:** 10/10

**Gap summary:** AGENTS.md, CONTRIBUTING.md, 5 ADRs, CHANGELOG, API.md exist. Missing: ADMIRAL_STYLE.md, LICENSE, Code of Conduct, runbook, troubleshooting guide, inline "why" comments.

---

## 4.1 Core Project Documents

- [ ] **D-01: Create ADMIRAL_STYLE.md**
  - **Description:** TigerBeetle-style coding standard document. Cover: naming conventions (when to use kebab-case vs snake_case), error handling patterns, jq usage patterns, exit code taxonomy, comment standards (when and how to write "why" comments), testing requirements (what needs tests, what level of coverage), and commit message format. This is the single reference that settles all style debates.
  - **Done when:** Covers all conventions. Referenced from CONTRIBUTING.md and AGENTS.md.
  - **Files:** `ADMIRAL_STYLE.md` (new), `CONTRIBUTING.md`, `AGENTS.md`
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **D-02: Add CODE_OF_CONDUCT.md**
  - **Description:** Contributor Covenant v2.1. Standard open-source community health file. Required for responsible open-source governance and expected by contributors.
  - **Done when:** Exists at repo root. Referenced from CONTRIBUTING.md.
  - **Files:** `CODE_OF_CONDUCT.md` (new), `CONTRIBUTING.md`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **D-03: Add LICENSE file**
  - **Description:** MIT license at repo root. Already declared in package.json but no LICENSE file exists. This is a blocking gap for any open-source contribution — without a LICENSE file, the code has no explicit license grant.
  - **Done when:** LICENSE exists at repo root with correct year and holder.
  - **Files:** `LICENSE` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

---

## 4.2 Inline Documentation

- [ ] **D-04: Add inline "why" comments to hooks**
  - **Description:** Audit all 13 hooks and add "why" comments for non-obvious logic. Focus areas: regex patterns (why this pattern and not a simpler one), thresholds (why this number), state mutations (why this field changes here), exit code decisions (why fail-open vs fail-closed here), jq filters (what this complex filter extracts and why). Magic numbers must reference their source (spec section, ADR, or research).
  - **Done when:** Every non-obvious decision has a "why" comment. Magic numbers reference sources. New contributor can understand each hook by reading comments alone.
  - **Files:** all `.hooks/*.sh`, `admiral/lib/state.sh`
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **D-05: Add usage examples to templates**
  - **Description:** Each template gets a comment block explaining when and how to use it. Templates without context are templates nobody uses. Include: purpose, when to use, example invocation, expected output.
  - **Done when:** Each template has usage example in comment block.
  - **Files:** `admiral/templates/*.json`, `admiral/templates/*.md`, `CONTRIBUTING.md`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

---

## 4.3 Architecture Decision Records

- [ ] **D-06: Add ADR for hook payload schema**
  - **Description:** Document why JSON over stdin/stdout (not environment variables, not files), why fail-open on malformed payloads, and the schema evolution strategy (how schemas change without breaking existing hooks).
  - **Done when:** `docs/adr/006-hook-payload-schema.md` exists with Status, Context, Decision, Consequences.
  - **Files:** `docs/adr/006-hook-payload-schema.md` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** Part 3 — Enforcement
  - **Depends on:** —

- [ ] **D-07: Add ADR for event ID generation**
  - **Description:** Document UUID vs timestamp+counter vs ULID trade-offs. Why the chosen approach was selected, what alternatives were considered, and what the migration path looks like if the choice needs to change.
  - **Done when:** `docs/adr/007-event-id-generation.md` exists with Status, Context, Decision, Consequences.
  - **Files:** `docs/adr/007-event-id-generation.md` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **D-12: Add ADR for Standing Orders enforcement**
  - **Description:** Document which Standing Orders are hook-enforced (hard blocks), which are advisory (logged but not blocked), and which are guidance-only (documentation without runtime checks). Explain the rationale for each tier assignment.
  - **Done when:** `docs/adr/008-standing-order-enforcement-tiers.md` exists with Status, Context, Decision, Consequences.
  - **Files:** `docs/adr/008-standing-order-enforcement-tiers.md` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** Parts 8-9 — Standing Orders
  - **Depends on:** —

- [ ] **D-13: Architecture decision record for fleet orchestration approach**
  - **Description:** Document the chosen approach for fleet orchestration: how agents are discovered, how tasks are routed to agents, how parallel execution is managed, and how agent handoffs work. Compare alternatives: centralized dispatcher vs peer-to-peer vs hybrid. Document why the chosen approach suits the Admiral model (71 defined agent roles, brain-level tiering, Standing Order governance). This ADR is foundational for Streams 7-10 (spec implementation) fleet work.
  - **Done when:** `docs/adr/009-fleet-orchestration.md` exists with Status, Context, Decision, Consequences. Alternatives section covers at least 3 approaches.
  - **Files:** `docs/adr/009-fleet-orchestration.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 3 — Fleet Orchestration
  - **Depends on:** —

- [ ] **D-14: ADR for brain level graduation criteria**
  - **Description:** Document the criteria for graduating agents between brain levels (B1 -> B2 -> B3). What metrics, behaviors, or milestones trigger graduation? Is it automatic or manual? What happens to an agent's context and memory during graduation? What safeguards prevent premature graduation or regression? This ADR defines the rules that the brain system implements.
  - **Done when:** `docs/adr/010-brain-level-graduation.md` exists with Status, Context, Decision, Consequences. Graduation criteria are specific and measurable.
  - **Files:** `docs/adr/010-brain-level-graduation.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 7 — Brain System
  - **Depends on:** —

---

## 4.4 Operational Documentation

- [ ] **D-08: Create operational runbook**
  - **Description:** Production deployment, monitoring, and troubleshooting guide for control plane and hooks. Covers: setup and configuration, common failure modes and recovery procedures, monitoring and alerting, backup and restore, upgrade procedures. Written for operators, not developers.
  - **Done when:** Runbook covers setup, common failures, and recovery procedures. At least 10 failure scenarios documented with resolution steps.
  - **Files:** `docs/operations/runbook.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **D-09: Create hook troubleshooting guide**
  - **Description:** Common hook failures, how to debug, how to test locally. For each of the 13 hooks: what it does, what can go wrong, how to diagnose, how to fix. Includes command-line examples for testing hooks in isolation.
  - **Done when:** Guide covers all 13 hooks with failure modes and debugging steps.
  - **Files:** `docs/operations/hook-troubleshooting.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **D-10: Create Brain user guide**
  - **Description:** How to use brain_query, brain_record, brain_retrieve, brain_audit CLI tools. Covers: what each tool does, when to use it, command-line syntax, examples with expected output, common mistakes.
  - **Done when:** Guide with examples for each tool. A new user can use the brain system by following the guide.
  - **Files:** `docs/brain-user-guide.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 7 — Brain System
  - **Depends on:** —

- [ ] **D-11: Create security model document**
  - **Description:** Document threat model, attack surfaces, defense layers, and security assumptions. Cover: what the system trusts (and why), what it doesn't trust, how each defense layer works, what attacks are mitigated and which are out of scope. This is the document a security reviewer reads first.
  - **Done when:** Comprehensive security model covering threat model, attack surfaces, and all 5 quarantine layers.
  - **Files:** `docs/security/security-model.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 12 — Security
  - **Depends on:** —

---

## 4.5 Contributor & Reference Documentation

- [ ] **D-15: Glossary of Admiral Framework terms**
  - **Description:** Define all Admiral-specific terminology for spec readers and contributors. Terms to include: Standing Order, Brain Level (B1/B2/B3), Hook, Adapter, Fleet, Agent Role, Quarantine Layer, Event Stream, Control Plane, Session State, Execution Trace, Runaway Detector, Ring Buffer, Journal Ingester, Fail-Open, Fail-Closed, and any other domain-specific terms. Each entry: term, definition, example usage, related terms. This prevents misunderstandings and makes the spec accessible to newcomers.
  - **Done when:** Glossary contains ≥25 terms. Each term has definition and example. Cross-referenced from CONTRIBUTING.md and spec documents.
  - **Files:** `docs/glossary.md` (new), `CONTRIBUTING.md` (add reference)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **D-16: Quick-start tutorial for new contributors**
  - **Description:** Step-by-step guide for making a first contribution. Covers: clone, install dependencies, run tests, understand project structure, find a "good first issue", make a change, run linters, commit, open a PR. Written assuming zero prior knowledge of the project. Includes screenshots or terminal output examples at each step. The goal: a new contributor can open their first PR within 30 minutes of cloning.
  - **Done when:** Tutorial covers clone-to-PR flow. Tested by someone unfamiliar with the project. Time-to-first-PR ≤ 30 minutes.
  - **Files:** `docs/tutorials/quick-start.md` (new), `CONTRIBUTING.md` (add link)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** D-02, D-03

- [ ] **D-17: Hook development guide**
  - **Description:** How to create a new hook from scratch. Covers: hook anatomy (adapter vs implementation), hook lifecycle (load, validate, execute, emit, report), required files and naming conventions, JSON schema for input/output, testing strategy (unit, integration, snapshot), registration process, and a worked example building a complete hook from zero. This is the guide that makes the hook system extensible beyond the core team.
  - **Done when:** Guide includes a complete worked example. A developer can create a new hook by following the guide without reading source code. Guide covers all hook types (pre_tool_use, post_tool_use, session_start, etc.).
  - **Files:** `docs/tutorials/hook-development.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 3 — Enforcement
  - **Depends on:** D-01, Q-03

- [ ] **D-18: FAQ document addressing common questions**
  - **Description:** Compile and answer the most common questions about the Admiral Framework. Categories: (1) General — what is Admiral, how does it differ from other agent frameworks, (2) Architecture — why bash hooks, why file-based state, why zero runtime deps, (3) Development — how to run tests, how to debug hooks, how to add a new Standing Order, (4) Operations — how to deploy, how to monitor, how to handle failures, (5) Security — what is the threat model, how does quarantine work. Source questions from actual contributor interactions, GitHub issues, and anticipated confusion points.
  - **Done when:** FAQ contains ≥20 questions across all categories. Each answer is concise (2-4 sentences) with links to detailed documentation where appropriate.
  - **Files:** `docs/faq.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **D-19: API versioning strategy document**
  - **Description:** Document the strategy for versioning the Admiral API (both the control plane HTTP API and the hook I/O schemas). Cover: versioning scheme (semver, date-based, or custom), backward compatibility guarantees, deprecation policy (how long old versions are supported), migration guides (how consumers upgrade), and breaking change process (how breaking changes are proposed, reviewed, and communicated). This is critical for any project that external consumers depend on.
  - **Done when:** Strategy document covers versioning scheme, compatibility guarantees, deprecation policy, and breaking change process. Referenced from API.md and CONTRIBUTING.md.
  - **Files:** `docs/api-versioning.md` (new), `control-plane/API.md` (add reference)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** A-03
