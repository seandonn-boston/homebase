# Stream 20: Data Ecosystem — Knowledge That Grows

> *"The only sustainable competitive advantage is an organization's ability to learn faster than the competition." — Peter Senge*

**Scope:** Implement the full data ecosystem where agents both consume and produce knowledge. Based on Part 12 of the Admiral Framework spec — the closed-loop architecture, knowledge graph linking, feedback loops, and ecosystem agents. This stream transforms the Brain from a passive knowledge store into an active, self-improving knowledge ecosystem where every agent interaction makes the system smarter.

**Why this matters:** Without the data ecosystem, the Brain is a notebook — useful but static. With it, the Brain becomes a living system: knowledge that proves useful is strengthened, knowledge that leads to bad outcomes is superseded, and patterns that emerge across sessions compound into institutional intelligence. The data ecosystem is the mechanism by which the fleet learns from its own experience.

---

## 20.1 Knowledge Graph

- [ ] **DE-01: Knowledge graph implementation**
  - **Description:** Implement the Brain entry link system that connects related knowledge entries into a navigable graph. Link types from the spec: `supports` (entry A reinforces entry B), `contradicts` (entry A conflicts with entry B), `supersedes` (entry A replaces entry B), `related_to` (entries share a topic), `derived_from` (entry A was produced from entry B), and `caused_by` (entry A was caused by event/decision B). The implementation must support: creating links with confidence scores, traversing links in both directions, multi-hop queries (e.g., "find all entries that support entries derived from entry X"), and link strength that adjusts based on outcome data. Store links in the existing Brain database schema with a new `entry_links` table.
  - **Done when:** Entry links can be created with type, confidence, and directionality. Multi-hop traversal works (at least 3 hops). Link queries integrate with existing `brain_query` interface. Links are persisted in the database. Tests verify all six link types, bidirectional traversal, and multi-hop queries.
  - **Files:** `admiral/brain/links.sh` (new), `admiral/brain/schema/entry_links.sql` (new), `admiral/brain/tests/test_links.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 5 — Brain Architecture (entry_links); Part 12 — Enrichment & Attribution (automatic linking)
  - **Depends on:** —

---

## 20.2 Knowledge Maintenance Agents

- [ ] **DE-02: Knowledge gardener agent**
  - **Description:** Implement an automated maintenance agent that keeps the Brain healthy. The gardener performs: (1) staleness detection — identify entries not accessed within the decay window (90 days default per spec) and flag them for review or archival; (2) contradiction detection — find entries linked with `contradicts` and surface them for resolution; (3) duplicate consolidation — identify semantically similar entries (cosine similarity > 0.95) that should be merged; (4) orphan detection — find entries with no links and no recent access that may be noise; (5) metadata hygiene — flag entries missing required metadata fields (category, tags, source_agent). The gardener runs on a configurable schedule and produces a maintenance report.
  - **Done when:** Gardener detects stale entries, contradictions, near-duplicates, orphans, and metadata gaps. Produces a structured maintenance report with recommended actions. Does not modify entries autonomously — all changes are Propose-tier (requires Admiral approval). Tests verify detection of each maintenance category with synthetic Brain data.
  - **Files:** `admiral/brain/gardener.sh` (new), `admiral/brain/tests/test_gardener.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 5 — Brain Architecture (decay awareness, supersession); Part 12 — Dataset Lifecycle
  - **Depends on:** DE-01

- [ ] **DE-03: Knowledge curator agent**
  - **Description:** Implement an agent that improves Brain entry quality. The curator performs: (1) metadata enrichment — add missing tags, categories, and source attribution to entries that lack them; (2) format standardization — ensure entries follow the canonical Brain entry format (title, content, category, metadata); (3) description enhancement — for entries with terse or unclear descriptions, propose improved descriptions that capture the intent behind the knowledge; (4) link suggestion — propose new links between entries that appear semantically related but are not yet linked; (5) quality scoring — assign a quality score (0-1) to each entry based on completeness, clarity, and linkage. The curator produces improvement proposals, not direct edits.
  - **Done when:** Curator identifies entries needing improvement across all five categories. Produces structured improvement proposals with before/after comparisons. Quality scoring is computed for all entries. Tests verify proposal generation for each improvement type.
  - **Files:** `admiral/brain/curator.sh` (new), `admiral/brain/tests/test_curator.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 5 — Knowledge Protocol; Part 12 — Ecosystem Agents (analogous to Engagement Analyst)
  - **Depends on:** DE-01

- [ ] **DE-04: Knowledge harvester agent**
  - **Description:** Implement an agent that automatically extracts knowledge from development artifacts. The harvester monitors: (1) code changes — extract patterns, architectural decisions, and convention changes from diffs; (2) PR descriptions — capture rationale, trade-offs, and context from pull request descriptions; (3) commit messages — identify decision records, bug fixes (with root causes), and refactoring motivations; (4) code review comments — extract reviewer feedback patterns, common issues, and accepted/rejected approaches. Extracted knowledge is formatted as Brain entry proposals with appropriate categories (decision, pattern, lesson, failure) and source attribution. The harvester respects the Data Sensitivity Protocol — no PII, credentials, or sensitive data enters the Brain.
  - **Done when:** Harvester extracts knowledge proposals from git diffs, PR descriptions, commit messages, and review comments. Proposals follow Brain entry format with source attribution. Sensitive data filtering is active. Tests verify extraction from each source type and sensitive data rejection.
  - **Files:** `admiral/brain/harvester.sh` (new), `admiral/brain/tests/test_harvester.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 12 — Stream 3: AI Agent Output; Part 11 — Data Sensitivity Protocol
  - **Depends on:** —

---

## 20.3 Feedback Loops

- [ ] **DE-05: Feedback loop — code review outcomes to Brain**
  - **Description:** Implement the feedback loop that connects code review outcomes back to Brain entries. When a code pattern suggested by a Brain entry is accepted in review, strengthen the entry (increase usefulness score). When a Brain-suggested pattern is rejected in review, weaken the entry and record the rejection reason. This creates a closed loop: the Brain suggests patterns -> agents use them -> reviewers accept or reject -> the Brain learns which patterns work. Track the acceptance/rejection ratio per Brain entry over time. Entries with consistently high rejection rates should be flagged for supersession.
  - **Done when:** Code review accept/reject events are captured and linked to the Brain entries that influenced the code. Accepted patterns strengthen entries. Rejected patterns weaken entries and record rejection reasons. Entries with >50% rejection rate are flagged. Tests verify the full loop with synthetic review outcomes.
  - **Files:** `admiral/brain/feedback/review_loop.sh` (new), `admiral/brain/feedback/tests/test_review_loop.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 12 — Loop 2: Brain Strengthening Loop; Part 12 — Outcome Attribution
  - **Depends on:** DE-01

- [ ] **DE-06: Feedback loop — test results to Brain**
  - **Description:** Implement the feedback loop that connects test outcomes back to Brain entries. When code produced using Brain-suggested patterns passes tests, strengthen the relevant entries. When tests fail, weaken the entries and record the failure mode. Track which Brain entries correlate with test success vs. failure across sessions. This provides empirical evidence for Brain entry quality — entries that lead to passing tests are demonstrably useful. Additionally, when a test failure reveals a new pattern (e.g., "this API requires null checks that the Brain entry omitted"), create a new Brain entry capturing the lesson.
  - **Done when:** Test pass/fail events are linked to the Brain entries that influenced the code under test. Pass results strengthen entries. Fail results weaken entries with failure context. New lessons are proposed as Brain entries when test failures reveal knowledge gaps. Tests verify the full loop with synthetic test outcomes.
  - **Files:** `admiral/brain/feedback/test_loop.sh` (new), `admiral/brain/feedback/tests/test_test_loop.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 12 — Loop 2: Brain Strengthening Loop; Part 7 — Quality Assurance
  - **Depends on:** DE-01

---

## 20.4 Knowledge Quality and Access

- [ ] **DE-07: Knowledge quality metrics**
  - **Description:** Implement metrics that track Brain knowledge quality over time. Metrics: (1) entry freshness — distribution of entry ages and last-access times, percentage within/outside the 90-day decay window; (2) accuracy proxy — ratio of strengthened to weakened entries (entries that lead to good vs. bad outcomes); (3) usage frequency — how often entries are accessed via brain_query, distribution of access counts; (4) contradiction rate — percentage of entries involved in `contradicts` links; (5) coverage — which project areas have Brain entries vs. which are knowledge deserts; (6) link density — average links per entry, distribution of link types. Produce a periodic "Brain Health Report" summarizing all metrics with trends.
  - **Done when:** All six metrics are computed from Brain data. Brain Health Report is generated with per-metric scores and trends. Metrics are persisted for trend tracking across sessions. Tests verify metric computation with synthetic Brain data sets of varying quality.
  - **Files:** `admiral/brain/metrics.sh` (new), `admiral/brain/tests/test_metrics.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 12 — Dataset Strategy (freshness requirements); Part 5 — Brain Architecture (health metrics)
  - **Depends on:** DE-01

- [ ] **DE-08: Cross-session knowledge transfer**
  - **Description:** Ensure knowledge from one session automatically benefits future sessions. Implement: (1) session-end knowledge capture — at session end, identify decisions, patterns, and lessons from the current session that should persist, and record them as Brain entries with session provenance; (2) session-start knowledge loading — at session start, query the Brain for entries relevant to the current task context and inject them into the agent's standing context; (3) knowledge continuity verification — detect when an agent in a new session is about to repeat an approach that failed in a prior session, and surface the failure entry proactively. This extends the existing session handoff mechanism with Brain-backed institutional memory.
  - **Done when:** Session-end knowledge capture produces Brain entries from session artifacts. Session-start loading retrieves and injects relevant entries. Continuity verification detects repeat-failure patterns. Tests verify the full lifecycle: capture at session N end, retrieval at session N+1 start, and proactive failure prevention.
  - **Files:** `admiral/brain/session_transfer.sh` (new), `admiral/brain/tests/test_session_transfer.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 11 — Session Handoffs; Part 5 — Knowledge Protocol (cross-session retrieval); Part 8 — Institutional Memory
  - **Depends on:** —

- [ ] **DE-09: Knowledge export/import**
  - **Description:** Implement Brain export and import capabilities for backup, sharing, and migration. Export format: a self-contained JSON archive containing all entries, links, metadata, and embeddings. The export must be: (1) complete — all entries and links, with full metadata; (2) portable — importable into a fresh Brain instance; (3) filtered — support exporting subsets by category, tag, project, date range, or quality score; (4) safe — run through the Data Sensitivity Protocol to strip any inadvertent PII before export. Import must handle: merging into an existing Brain (deduplication by content hash), conflict resolution (existing entry vs. imported entry), and provenance tracking (imported entries marked with import source).
  - **Done when:** Export produces a valid JSON archive of Brain contents. Filtered exports work by category, tag, and date range. Import merges into existing Brain with deduplication. Sensitivity filtering strips PII from exports. Tests verify round-trip export/import integrity and merge conflict resolution.
  - **Files:** `admiral/brain/export.sh` (new), `admiral/brain/import.sh` (new), `admiral/brain/tests/test_export_import.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** Part 12 — Dataset Strategy (data retention and compliance); Part 11 — Data Sensitivity Protocol
  - **Depends on:** DE-01

- [ ] **DE-10: Knowledge search API**
  - **Description:** Implement a REST API for querying Brain knowledge externally. Endpoints: (1) `GET /api/brain/search?q=...` — semantic search across all entries, returning ranked results with relevance scores; (2) `GET /api/brain/entry/:id` — retrieve a specific entry with its links and metadata; (3) `GET /api/brain/entry/:id/links` — retrieve all linked entries with link type and direction; (4) `GET /api/brain/health` — return Brain health metrics (from DE-07); (5) `GET /api/brain/stats` — return aggregate statistics (entry count, category distribution, freshness). The API follows the existing control plane server patterns. Authentication is required — the API respects the same access controls as direct Brain access. Rate limiting prevents abuse.
  - **Done when:** All five endpoints are implemented and return structured JSON responses. Semantic search returns relevance-ranked results. Authentication is enforced. Rate limiting is active. Tests verify all endpoints with valid and invalid requests, authentication enforcement, and rate limiting.
  - **Files:** `control-plane/src/brain-api.ts` (new), `control-plane/src/brain-api.test.ts` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** Part 10 — Admiral Brain Access (human-optimized interfaces); Part 12 — Enrichment & Attribution
  - **Depends on:** DE-07
