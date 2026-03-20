# Provisional Patent Application Draft #2

# Progressive Institutional Memory Architecture for Autonomous AI Agent Fleets

**DRAFT — For Patent Counsel Review**
**Date:** March 16, 2026
**Inventor:** Sean Donn
**Priority Date:** March 14, 2026
**Priority Evidence:** Git commit `49bd0db`, repository `seandonn-boston/helm`

---

## 1. Title of Invention

Progressive Institutional Memory Architecture for Autonomous AI Agent Fleets

---

## 2. Technical Field

This invention relates to knowledge management systems for autonomous AI agent fleets, and more particularly to a progressive multi-level knowledge architecture with semantic retrieval, knowledge lifecycle signals, and a defense system for protecting institutional memory from adversarial external intelligence.

---

## 3. Background of the Invention

### The Problem

Autonomous AI agents powered by large language models are fundamentally **amnesiac** — they lose all session context when a session ends. This creates three critical problems in fleet operations:

1. **Session amnesia:** An agent that spent 2 hours learning a codebase's architecture starts from zero in the next session. Lessons learned, decisions made, and failures encountered are lost. The fleet cannot compound knowledge over time.

2. **Cross-agent knowledge silos:** In a multi-agent fleet, Agent A may discover that "Prisma migrations fail silently when the database URL contains special characters." Agent B, working on a related task, has no access to this lesson. Each agent operates in isolation, repeating mistakes that other agents have already solved.

3. **No semantic retrieval:** When persistent storage exists (checkpoint files, logs), retrieval is keyword-based. A query for "How did we handle authentication?" will not find entries about "login flow," "auth middleware," "JWT implementation," or "session management" — despite these being semantically identical topics. Keyword search produces false negatives on meaning-equivalent queries.

### Limitations of Existing Approaches

**Retrieval-Augmented Generation (RAG)** systems retrieve documents to augment LLM context. They do not provide: typed knowledge entries (decision vs. outcome vs. lesson vs. failure), inter-entry relationships (supports, contradicts, supersedes), knowledge lifecycle signals (strengthening from use, decay from disuse), or defense against adversarial content injection.

**Vector databases** (Pinecone, Weaviate, Chroma) provide semantic similarity search. They are storage engines, not knowledge management systems. They lack: entry categorization, provenance tracking, relationship graphs, graduated trust levels, or quarantine systems for external intelligence.

**Enterprise knowledge bases** (Confluence, SharePoint, wikis) store human-authored documents. They do not support: automated knowledge capture by AI agents, semantic retrieval via embeddings, strengthening/decay lifecycle signals, or cross-agent concurrent access with identity-bound audit trails.

**File-based persistence** (checkpoint files, handoff documents) works for single-agent, single-session use. It breaks down with concurrent agent access (no locking model), cross-project queries (files are siloed by directory), semantic retrieval (files support keyword search only), and scale (hundreds of files overwhelm agent context windows).

No existing system provides:
- A progressive architecture that scales from files to full database as needs justify
- Knowledge lifecycle management with strengthening and decay signals
- Fleet-wide semantic retrieval across agents and projects
- Defense against adversarial content injected into the knowledge base

---

## 4. Summary of the Invention

The present invention provides a **three-level progressive institutional memory architecture** for AI agent fleets:

**Level B1 (File-Based):** JSON files in a `.brain/` directory, one per knowledge entry, tracked in version control. Retrieval via keyword search. Zero infrastructure overhead. Validates the core hypothesis that persistent semantic memory improves fleet performance.

**Level B2 (SQLite + Vector Embeddings):** Single-file SQLite database with vector columns for semantic search via cosine similarity. Embeddings capture meaning, not keywords. No server infrastructure required. Adds semantic retrieval, access tracking, and usefulness scoring.

**Level B3 (Postgres + pgvector):** Full enterprise knowledge system with HNSW vector indexes, typed inter-entry relationships (supports, contradicts, supersedes, elaborates, caused_by), zero-trust access control with identity tokens, sensitivity classification, and a five-layer quarantine system for external intelligence.

Advancement between levels is governed by **measured metrics** — not organizational maturity or business size:
- Advance from B1 to B2 when keyword search misses semantically relevant entries more than 30% of the time
- Advance from B2 to B3 when concurrent agent access causes lock contention or cross-project queries are needed
- Each level must operate for at least 2 weeks before advancement

The invention further provides:
- **Knowledge lifecycle management** with strengthening signals (retrieval and successful use increase a score), decay warnings (entries not retrieved over a configurable period), and supersession chains (superseded entries link to replacements rather than being deleted)
- A **five-layer quarantine immune system** for external intelligence, where the load-bearing security layers operate without LLM involvement
- **Intent-rich knowledge capture** — entries store decisions with rationale, not just facts, enabling agents to retrieve context that helps them make tradeoffs

---

## 5. Detailed Description

### 5.1 Progressive Architecture with Graduation Criteria

The Brain architecture defines three implementation levels. Each subsequent level adds capabilities while maintaining backward compatibility with entries created at lower levels.

| Level | Storage | Retrieval | Graduation Criteria |
|---|---|---|---|
| B1: File-Based | JSON files in `.brain/` directory, git-tracked | Keyword search via grep, manual lookup | Advance when keyword search misses semantically relevant entries >30% of the time |
| B2: SQLite + Embeddings | Single SQLite file with vector column | Cosine similarity search (threshold ≥0.7) | Advance when concurrent access causes lock contention or cross-project queries needed |
| B3: Full Brain | Postgres + pgvector, HNSW indexes, MCP server | Multi-signal retrieval pipeline with confidence levels | Maximum level — no further advancement |

**Measurable advancement thresholds** (B2 → B3): Retrieval hit rate ≥85%, precision ≥90%, reuse rate ≥30% of entries accessed 2+ times, with ≥5% improvement over the 2-week baseline.

**Anti-pattern prevention:** The system explicitly prevents premature advancement. Deploying B3 infrastructure (Postgres + pgvector + MCP + identity tokens) for a fleet that has not validated the persistent memory hypothesis at B1 wastes resources and introduces unnecessary complexity. The graduation criteria enforce evidence-based scaling.

*Reference implementation: `aiStrat/admiral/spec/part5-brain.md`, Section "Start Simple: Validating the Brain Hypothesis"; `aiStrat/brain/level1-spec.md`, `level2-spec.md`, `level3-spec.md`*

### 5.2 Knowledge Entry Schema

The atomic unit of the Brain is the **knowledge entry**. Each entry contains:

| Field | Purpose |
|---|---|
| Classification | Category: decision, outcome, lesson, context, failure, or pattern |
| Title | Dense summary for embedding and display |
| Content | Full detail including rationale, alternatives considered, context |
| Vector Embedding | Mathematical representation of meaning (title + content concatenated) |
| Provenance | Creating agent identity, session, project, timestamp |
| Sensitivity | Classification level controlling access scope |
| Entry Links | Typed relationships to other entries |
| Strengthening Score | Increases with retrieval and successful use |
| Decay Tracking | Last accessed timestamp, decay warning status |
| Supersession Chain | Link to replacement entry if superseded |

**Entry Categories:**

| Category | What It Captures | Example |
|---|---|---|
| Decision | A choice made, alternatives considered, rationale, authority tier | "Chose JWT over session cookies because the API must be stateless for horizontal scaling" |
| Outcome | The result of a decision or task | "JWT implementation completed. Auth middleware passes all 47 test cases" |
| Lesson | A reusable insight extracted from experience | "Prisma migrations fail silently when the database URL contains special characters" |
| Context | A snapshot of environment state at a point in time | "Tech stack as of 2026-02-15: Next.js 15.2, Postgres 16, pgvector 0.8.0" |
| Failure | A failure mode encountered, diagnosis, and resolution | "Specialist drifted into orchestrator decisions. Root cause: missing boundary in agent definition" |
| Pattern | A reusable solution or anti-pattern | "Contract-first parallelism reduces handoff rejection rate from 18% to 3%" |

**Intent-rich capture:** The Brain deliberately stores decisions with rationale — not just facts. "We chose Postgres over MongoDB" is a fact that provides no decision-making context. "We chose Postgres over MongoDB because we valued transactional consistency over schema flexibility for this domain" is intent-rich knowledge that helps future agents make similar tradeoffs.

*Reference implementation: `aiStrat/admiral/spec/part5-brain.md`, Section "Entry Categories"; `aiStrat/brain/schema/001_initial.sql`*

### 5.3 Semantic Retrieval via Vector Embeddings

Traditional keyword search matches text. Vector search matches meaning:

```
Query: "How did we handle user authentication?"

Keyword search returns:
  ✓ Records containing "authentication"
  ✗ Misses "login flow," "auth middleware," "session management," "JWT implementation"

Vector search returns:
  ✓ All of the above — embeddings are semantically close
  ✓ Also: "OAuth consideration we rejected" (related decision)
  ✓ Also: "Rate limiting on auth endpoints" (related context)
```

**Embedding generation:** The system embeds the concatenation of `title + content` using a dedicated embedding model (e.g., text-embedding-3-small at 1536 dimensions). Title provides dense summary; content provides full detail. Re-embedding occurs when content is updated.

**Multi-signal retrieval pipeline (B3):** At the full Brain level, retrieval combines multiple signals:
1. Semantic similarity (cosine distance between query embedding and entry embeddings)
2. Recency (more recent entries ranked higher, configurable weight)
3. Strengthening score (frequently used entries ranked higher)
4. Relevance to querying agent's current project and role

Results are returned with confidence levels, enabling the querying agent to assess reliability.

*Reference implementation: `aiStrat/admiral/spec/part5-brain.md`, Section "Vector Embeddings: Meaning, Not Keywords"*

### 5.4 Knowledge Lifecycle: Strengthening and Decay

Unlike static knowledge bases, the Brain treats knowledge as a living system with lifecycle signals:

**Strengthening:** When an entry is retrieved and the retrieving agent reports successful use (the knowledge was applicable and helpful), the entry's strengthening score increases. High-strengthening entries surface faster in future queries. This creates a positive feedback loop: useful knowledge becomes more discoverable.

**Decay:** Entries not retrieved over a configurable period receive decay warnings. Decay does not delete entries — it signals that the knowledge may be stale and should be reviewed. Decay warnings surface in the Control Plane for human review.

**Supersession chains:** When knowledge is updated (e.g., a decision is reversed, a lesson is refined), the old entry is not deleted. Instead, a new entry is created with a `supersedes` link to the old entry. The old entry receives a `superseded_by` link to the new entry. This preserves institutional history while ensuring current knowledge surfaces first.

**Health metrics:**
- Supersession rate <10% of entries per quarter indicates healthy knowledge evolution
- Supersession rate >15% per quarter triggers an audit of entry creation practices
- Entries with zero retrievals after 30 days receive decay warnings

*Reference implementation: `aiStrat/admiral/spec/part5-brain.md`, Sections "Strengthening and Decay", "Supersession Chains"*

### 5.5 Recursion Prevention: The Möbius Loop

The Brain architecture prevents infinite recursion through structural separation of concerns:

- **Demand signals** (queries about what knowledge is needed) write to `.brain/_demand/` — a separate directory
- **Contradiction scans** (checking for conflicting entries) read from `.brain/{project}/` — the main knowledge store
- **Self-instrumentation** (the Brain recording information about its own operation) writes to `.brain/_meta/` — this triggers a scan which terminates because meta-entries do not reference themselves

No path exists for infinite recursion because each operation has a different origin directory and no operation triggers itself. This is an architectural constraint, not a runtime check — the recursion is impossible by structure, not prevented by careful coding.

*Reference implementation: `aiStrat/admiral/spec/part5-brain.md`; `.brain/` directory structure*

### 5.6 Five-Layer Quarantine Immune System

External intelligence injected into the Brain (from third-party sources, other organizations, or untrusted agents) passes through a five-layer defense system before gaining access to the retrieval pipeline:

**Layer 1: Structural Validation** — Deterministic checks for format compliance, required field presence, schema conformance, and size limits. No AI involvement. Rejects malformed entries immediately.

**Layer 2: Injection Pattern Detection** — 70+ regex patterns scanning for prompt injection, authority spoofing, data exfiltration attempts, context manipulation, and role override attempts. Categories specific to AI agent security (not present in traditional web application security). No AI involvement.

**Layer 3: LLM-Airgapped Semantic Analysis** — Bayesian classification, TF-IDF authority-pattern scoring, and credential fabrication detection. Performs semantic analysis WITHOUT any LLM engagement. This is the critical design principle: the load-bearing security layers operate without using an LLM, breaking the circular dependency where an AI judges content specifically designed to manipulate AIs.

**Layer 4: LLM Advisory Layer** — An LLM reviews quarantined content but can ONLY reject, never approve. This breaks the adversarial symmetry: even if the content fools the LLM into thinking it's benign, the LLM cannot admit it — only Layers 1-3 can approve. The LLM serves as an additional rejection filter, not an approval authority.

**Layer 5: Antibody Generation** — Detected adversarial content is automatically converted into a FAILURE knowledge entry documenting the attack pattern, vector, and signatures. This trains the system to recognize similar attacks in the future without manual rule updates. The defense system improves from every attack it encounters.

**Critical design principle:** Layers 1-3 are completely LLM-free. Content designed to manipulate LLMs cannot influence its own admission because the admission decision does not involve an LLM. The LLM advisory layer (Layer 4) has reject-only authority — an additional filter that can catch patterns Layers 1-3 miss, but cannot override their judgment.

*Reference implementation: `aiStrat/admiral/spec/part3-enforcement.md`, Section "External Intelligence Quarantine"; `admiral/lib/injection_detect.sh`*

### 5.7 Cross-Agent, Cross-Project Retrieval

At B3, the Brain supports fleet-wide retrieval:

- Any agent can query knowledge from any project (subject to sensitivity classification and access control)
- Identity tokens (HMAC-SHA256 or JWT) are required for all Brain operations
- Every operation is logged in an append-only audit trail attributing actions to specific agent identities
- Sensitivity labels control query scope (entries classified above an agent's clearance are not returned)

This enables fleet-wide institutional learning: a lesson learned by one agent on one project benefits every agent on every project that queries for related knowledge.

*Reference implementation: `aiStrat/brain/schema/001_initial.sql`; `aiStrat/admiral/spec/part5-brain.md`, Section "Zero-Trust Access Control"*

---

## 6. Claims

### Independent Claims

**Claim 1.** A knowledge management system for autonomous AI agent fleets, comprising:
- (a) a progressive multi-level architecture with at least three implementation levels of increasing capability, wherein each level provides a superset of the previous level's functionality;
- (b) measurable graduation criteria governing advancement between levels, including at least: a retrieval miss rate threshold for advancing from keyword-based to semantic retrieval, and a concurrent access threshold for advancing from single-file to server-based storage;
- (c) a minimum operational period requirement at each level before advancement is permitted;
- wherein infrastructure complexity scales only when empirically justified by measured metrics, preventing premature deployment of enterprise-grade systems before simpler approaches reach their limits.

**Claim 2.** A knowledge lifecycle management method for AI agent fleets, comprising:
- (a) recording knowledge entries with typed classifications (at least: decision, outcome, lesson, failure, pattern) and vector embeddings capturing semantic meaning;
- (b) increasing a strengthening score for entries upon retrieval and confirmed successful use, causing high-use entries to surface more prominently in future queries;
- (c) generating decay warnings for entries not retrieved within a configurable time period, signaling potential staleness without deleting the entry;
- (d) maintaining supersession chains wherein updated knowledge creates a new entry linked to the entry it supersedes, preserving institutional history while ensuring current knowledge surfaces first;
- wherein the knowledge system exhibits biological-like properties of strengthening through use and weakening through disuse, self-organizing around the fleet's actual information needs.

**Claim 3.** A defense system for protecting AI agent knowledge bases from adversarial external intelligence, comprising:
- (a) a first validation layer performing deterministic structural checks without AI involvement;
- (b) a second validation layer performing pattern-based injection detection using a curated library of AI-agent-specific attack signatures, without AI involvement;
- (c) a third validation layer performing semantic analysis using statistical methods (Bayesian classification, TF-IDF scoring) without any large language model engagement;
- (d) a fourth validation layer using a large language model with reject-only authority — capable of flagging suspicious content for rejection but incapable of approving content for admission;
- (e) an antibody generation mechanism that converts detected adversarial content into knowledge entries documenting the attack pattern, enabling recognition of similar future attacks;
- wherein the load-bearing security layers (a), (b), and (c) operate without LLM involvement, breaking the circular dependency where an AI judges content specifically designed to manipulate AIs.

### Dependent Claims

**Claim 4.** The system of Claim 1, wherein:
- the first level comprises file-based storage with one JSON file per knowledge entry, tracked in version control, with keyword-based retrieval;
- the second level comprises a single-file database with vector embedding columns enabling semantic similarity search via cosine distance with a configurable similarity threshold;
- the third level comprises a server-based relational database with vector indexes, typed inter-entry relationships, zero-trust access control, and multi-agent concurrent access.

**Claim 5.** The method of Claim 2, further comprising:
- storing typed inter-entry relationships including at least: supports, contradicts, supersedes, elaborates, and caused_by;
- enabling knowledge graph traversal via these relationships for multi-hop retrieval;
- computing confidence levels for retrieval results based on a combination of semantic similarity, recency, strengthening score, and relevance to the querying agent's current context.

**Claim 6.** The method of Claim 2, wherein knowledge entries capture intent-rich content comprising:
- for decision entries: the choice made, alternatives considered, rationale for selection, and the authority tier under which the decision was made;
- for failure entries: the failure mode, diagnosis, resolution, and root cause;
- for pattern entries: the reusable solution or anti-pattern with measured impact;
- wherein the stored rationale enables future agents to understand not just what was decided but why, supporting informed tradeoff analysis in novel situations.

**Claim 7.** The system of Claim 1, further comprising:
- a multi-signal retrieval pipeline combining semantic similarity, recency, strengthening score, and role-relevance to produce ranked results;
- cross-agent, cross-project retrieval subject to sensitivity classification and identity-bound access control;
- an append-only audit log recording every knowledge operation with agent identity, timestamp, operation type, and affected entries;
- wherein fleet-wide retrieval enables institutional learning where a lesson learned by one agent benefits every agent querying for related knowledge.

**Claim 8.** The defense system of Claim 3, wherein the curated injection detection library comprises patterns specific to AI agent security including:
- prompt injection attempts designed to override agent instructions;
- authority spoofing attempts designed to escalate an agent's trust level;
- role override attempts designed to change an agent's assigned role;
- system prompt extraction attempts designed to leak agent configuration;
- meta-level instruction manipulation designed to alter agent behavioral constraints;
- wherein these categories do not exist in traditional web application security frameworks.

**Claim 9.** The system of Claim 1, further comprising a recursion prevention architecture wherein:
- demand signals (queries about needed knowledge) write to a first directory;
- knowledge scans read from a second directory;
- self-instrumentation writes to a third directory;
- no operation's output directory serves as another operation's input directory;
- wherein infinite recursion is prevented by architectural structure rather than runtime checks.

**Claim 10.** The defense system of Claim 3, wherein the antibody generation mechanism:
- extracts attack signatures (patterns, vectors, and methods) from detected adversarial content;
- creates a failure-type knowledge entry containing the extracted signatures;
- makes the failure entry available to future quarantine evaluations;
- thereby enabling the defense system to improve from every encountered attack without manual rule updates.

---

## 7. Prior Art Differentiation

| System/Approach | What It Does | What It Lacks vs. This Invention |
|---|---|---|
| RAG Systems (LangChain, LlamaIndex) | Retrieve documents to augment LLM context | No typed knowledge entries; no lifecycle signals (strengthening/decay); no inter-entry relationships; no quarantine for adversarial content; no progressive architecture with graduation criteria |
| Vector Databases (Pinecone, Weaviate, Chroma) | Semantic similarity search on vector embeddings | Storage engines only — no knowledge management; no entry categorization; no provenance tracking; no lifecycle signals; no defense system |
| Enterprise Knowledge Bases (Confluence, SharePoint) | Human-authored document storage and retrieval | No automated AI agent capture; no semantic retrieval via embeddings; no strengthening/decay; no concurrent multi-agent access with identity tokens |
| File-Based Persistence (checkpoints, logs) | Single-agent, single-session state storage | No concurrent access model; no cross-project queries; no semantic retrieval; no knowledge lifecycle; does not scale beyond hundreds of files |
| MLflow / Weights & Biases | ML experiment tracking and artifact storage | Model-training focused; no agent decision/lesson/failure capture; no semantic retrieval; no fleet-wide knowledge sharing |
| Knowledge Graphs (Neo4j, Amazon Neptune) | Typed relationships between entities | No vector embeddings for semantic search; no lifecycle signals; no progressive architecture; no AI-agent-specific quarantine system |

---

## 8. Figures List

1. **Figure 1: Progressive Architecture Levels** — Three-tier diagram showing B1 (files) → B2 (SQLite + embeddings) → B3 (Postgres + pgvector) with graduation criteria arrows between levels.

2. **Figure 2: Knowledge Entry Schema** — Entity diagram showing the knowledge entry with all fields (classification, content, embedding, provenance, sensitivity, links, strengthening, decay, supersession).

3. **Figure 3: Strengthening and Decay Lifecycle** — Timeline diagram showing an entry being created, strengthened through retrieval, decaying from disuse, and being superseded by a newer entry with chain links.

4. **Figure 4: Multi-Signal Retrieval Pipeline** — Flow diagram showing query → embedding → similarity search → recency weighting → strengthening weighting → role-relevance filtering → ranked results with confidence levels.

5. **Figure 5: Five-Layer Quarantine Immune System** — Defense-in-depth diagram showing external content passing through Layers 1-5, with LLM-free annotation on Layers 1-3 and reject-only annotation on Layer 4.

6. **Figure 6: Recursion Prevention Architecture** — Directory structure diagram showing separated I/O paths for demand signals, knowledge scans, and self-instrumentation, with "no circular path" annotation.

---

## 9. Specification References

| Component | Repository Path |
|---|---|
| Core specification | `aiStrat/admiral/spec/part5-brain.md` |
| B1 level spec | `aiStrat/brain/level1-spec.md` |
| B2 level spec | `aiStrat/brain/level2-spec.md` |
| B3 level spec | `aiStrat/brain/level3-spec.md` |
| Postgres schema | `aiStrat/brain/schema/001_initial.sql` |
| Data ecosystem schema | `aiStrat/brain/schema/002_data_ecosystem.sql` |
| Brain CLI tools | `admiral/bin/brain_record`, `brain_query`, `brain_retrieve`, `brain_audit` |
| Brain context router hook | `.hooks/brain_context_router.sh` |
| Injection detection library | `admiral/lib/injection_detect.sh` |
| Quarantine specification | `aiStrat/admiral/spec/part3-enforcement.md`, "External Intelligence Quarantine" |
| Invention date evidence | `research/invention-dates.md`, Entry #2 |
