# aiStrat Remediation Plan

Generated from independent critical review. Organized into 5 phases with strict dependency ordering. Each phase must pass its gate before the next begins.

---

## Phase 0: Fix Bugs (No new features — just make what exists correct)

**Gate: All existing tests pass. Zero known bugs in shipped code.**

### 0.1 SQLite circular supersession IndexError
- **File:** `brain/core/sqlite_store.py:407,419`
- **Bug:** `SELECT superseded_by FROM entries` returns 1 column. Code accesses `r[1]` (needs `r[0]`).
- **Also:** Line 399 `new_row[1]` and line 411 `old_row[1]` — verify column index against the SELECT at lines ~385-394. If the SELECT is `SELECT id, superseded_by`, then `[1]` is correct for those. But line 406's SELECT is single-column.
- **Fix:** Change `r[1]` to `r[0]` on lines 407 and 419.
- **Test:** Existing `test_sqlite_store.py` circular supersession test should now pass.

### 0.2 Retrieval ignores project parameter
- **File:** `brain/core/retrieval.py:183-184`
- **Bug:** `project=None` is hardcoded instead of passing the `project` parameter.
- **Fix:** Change `project=None` to `project=project`.
- **Test:** Add test in `test_semantic_retrieval.py` — record entries in two projects, query with project filter, verify only matching project returned.

### 0.3 Entry link creation race condition
- **File:** `brain/mcp/server.py:436-442`
- **Bug:** Entry is committed, then links are added without try/except. Failed links leave entry without its links.
- **Fix:** Wrap link creation in try/except. On failure, remove the entry (rollback) or log the partial state and return a warning alongside the entry ID.
- **Simpler fix:** Validate all link targets exist BEFORE adding the entry.

### 0.4 SQLite tests broken on Windows
- **File:** `brain/tests/test_sqlite_store.py:18-21, 30+`
- **Bug:** `tempfile.mktemp()` + manual `os.unlink()` in tearDown fails on Windows because SQLite holds the file.
- **Fix:** Close the store's connection explicitly in tearDown before unlinking, OR use `tempfile.TemporaryDirectory()` context manager which handles cleanup, OR call `store.close()` (add close method to SQLiteBrainStore if missing).
- **Test:** All 17 currently-failing SQLite tests should pass on Windows.

### 0.5 Monitor test imports broken
- **File:** All files in `monitor/tests/` — they use `from aiStrat.monitor.X` (absolute imports).
- **Bug:** When pytest discovers tests via `testpaths`, the `aiStrat` package isn't necessarily on `sys.path`.
- **Fix (pick one):**
  - Change to relative imports: `from ..quarantine import quarantine` etc.
  - OR add `__init__.py` and conftest.py with proper path setup.
  - OR ensure `pyproject.toml` package discovery includes the right root.
- **Test:** `pytest aiStrat/monitor/tests/ -v` should discover and run all tests.

### 0.6 Monitor state.py — fcntl not available on Windows
- **File:** `monitor/state.py:62`
- **Bug:** `fcntl.flock()` is POSIX-only. Crashes on Windows.
- **Fix:** Conditional import with fallback. Use `msvcrt.locking()` on Windows, or use `portalocker` (add as optional dep), or use a simple lockfile approach without OS-level locks.
- **Test:** Add test that loads and saves state on current platform without error.

### 0.7 Documentation count errors
- **Files:** `brain/README.md`, docstrings
- **Fix:** "six tools" → "seven tools" (brain_audit is the 7th). "six-signal" → update to match actual signal count in retrieval.py (docstring already says "eight" at line 179 — just fix the README).

---

## Phase 1: Make Persistence Real (Brain is useless without it)

**Gate: Brain can bootstrap with SQLite, survive restart, and pass all tests on Windows.**

**Depends on:** Phase 0 complete.

### 1.1 SQLiteBrainStore — add explicit close()
- **File:** `brain/core/sqlite_store.py`
- **Task:** Add `close()` method that cleanly shuts down the connection pool/thread-local connections. Implement `__enter__`/`__exit__` for context manager usage.
- **Why:** Required for clean test teardown (0.4) and for production usage.

### 1.2 Bootstrap with SQLite by default in demo
- **File:** `scripts/demo_e2e.py`
- **Task:** Add `--persist` flag that bootstraps with `db_path="brain.db"`. Demonstrate data surviving a simulated restart (bootstrap twice, query after second bootstrap returns data from first).
- **Why:** Proves persistence works end-to-end.

### 1.3 SQLite audit log pruning efficiency
- **File:** `brain/core/sqlite_store.py:118-125`
- **Task:** Change pruning from per-INSERT to periodic (every N inserts, or on explicit maintenance call).
- **Why:** O(n) scan on every audit append is unnecessary overhead.

### 1.4 Embedding failure handling
- **Files:** `brain/mcp/server.py` (around line 424), `brain/core/embeddings.py`
- **Bug:** If embedding generation fails, entry is created with `embedding=None` and becomes unretrievable.
- **Fix:** Catch embedding failure. Either reject the entry with a clear error, or store it and add a background retry mechanism, or at minimum log a WARNING and include `"warning": "entry stored without embedding"` in the response.

---

## Phase 2: Make Tests Trustworthy (Can't build on untested foundations)

**Gate: 90%+ line coverage on brain/ and monitor/. All security-critical paths have explicit tests.**

**Depends on:** Phase 0 and Phase 1 complete.

### 2.1 Rate limiter unit tests
- **File:** New test file or section in `brain/tests/test_store.py`
- **Tests needed:**
  - Writes rejected after 60 calls in 60 seconds
  - Reads rejected after 300 calls in 60 seconds
  - Calls succeed again after window expires
  - Different identities have independent limits

### 2.2 Quarantine bypass test
- **File:** `brain/tests/test_store.py`
- **Tests needed:**
  - `strict_mode=True` + quarantine unavailable → writes rejected
  - `strict_mode=False` + quarantine unavailable → writes admitted (document this is intentional or fix it)

### 2.3 Monitor test coverage
- **File:** `monitor/tests/`
- **Tests needed (after 0.5 import fix):**
  - Quarantine: adversarial inputs that try to bypass detection (HTML entities, Unicode homoglyphs, nested encodings)
  - Seed writer: multi-marker rejection edge cases
  - State: concurrent load/save (at least on current platform)
  - Scanner: malformed version tags in `_is_major_release()`

### 2.4 Coherence analysis false positive reduction
- **File:** `brain/services/coherence.py`
- **Task:** Tighten regex patterns. Current patterns like `(?:skip|reduce|minimize)\s+test` match legitimate optimization discussions.
- **Fix:** Require more context — e.g., `skip\s+(?:all\s+)?test(?:s|ing)` vs just `skip\s+test`. Add false-positive test cases.

### 2.5 MCP transport edge cases
- **File:** `brain/tests/test_mcp_transport.py`
- **Tests needed:**
  - Oversized message handling (add max line length check to transport first)
  - Malformed JSON-RPC (missing id, wrong version, invalid method)
  - Unknown method returns proper error

---

## Phase 3: Close the Security Gaps

**Gate: No silent security bypasses. All external input validated. Quarantine is mandatory.**

**Depends on:** Phase 2 complete (tests must exist before security fixes to prevent regressions).

### 3.1 Make quarantine non-optional
- **File:** `brain/mcp/server.py:321-338`
- **Decision required:** Should `strict_mode=False` ever admit unvalidated writes? If the answer is no (recommended), remove the bypass path entirely. If yes, add a health check endpoint that exposes quarantine status so operators know it's degraded.

### 3.2 MCP transport message size limit
- **File:** `brain/mcp/transport.py:212`
- **Fix:** Before `json.loads(line)`, check `len(line) > MAX_MESSAGE_SIZE` (suggest 1MB). Return JSON-RPC error `-32600` (Invalid Request) if exceeded.

### 3.3 ReDoS mitigation in quarantine
- **File:** `monitor/quarantine.py`
- **Task:** Audit all regex patterns for catastrophic backtracking. The 50KB input cap helps but doesn't eliminate the risk.
- **Fix:** Use possessive quantifiers where possible, or add per-pattern timeouts, or simplify the most complex patterns. Consider `re2` as an optional dependency for guaranteed linear-time matching.

### 3.4 Email regex false positive reduction
- **File:** `monitor/quarantine.py:378`
- **Task:** Current email regex flags legitimate technical examples. Either narrow the pattern (require non-example domains) or move email detection to a separate "PII scan" that can be independently configured.

### 3.5 HTML entity decoding in RSS feeds
- **File:** `monitor/sources/rss_feeds.py:290-295`
- **Fix:** Replace manual `text.replace("&amp;", "&")` chain with `html.unescape()`. The manual approach misses numeric entities.

---

## Phase 4: Reduce Specification Debt (Make the docs match reality)

**Gate: Every claim in documentation is either true or explicitly marked as planned/aspirational.**

**Depends on:** Phases 0-3 complete (fix reality first, then update docs).

### 4.1 Triage the fleet catalog
- **File:** `fleet/agents/` (33 markdown files, 100 agent definitions)
- **Task:** Categorize into three tiers:
  - **Tier 1 (Core, 8-12 agents):** Orchestrator, Context Curator, QA, Triage, Backend Dev, Frontend Dev, Security, Mediator. These get implementation priority.
  - **Tier 2 (Useful, 15-20 agents):** Domain specialists, data agents, lifecycle agents. Keep specs, mark as "planned."
  - **Tier 3 (Aspirational, 60+ agents):** Scale agents, adversarial agents, meta agents. Archive to `fleet/archive/` with a note.
- **Why:** 100 agents in a project with 1 executable agent is misleading. Archiving signals intellectual honesty.

### 4.2 Mark aspirational sections in admiral/
- **Files:** All `admiral/part*.md`
- **Task:** Add implementation status markers. Every section that describes unbuilt infrastructure (hooks enforcement, swarm coordination, zero-trust identity, MCP discovery) gets a clear `> STATUS: Not yet implemented` callout.
- **Why:** The doctrine is useful as a design target. It's harmful when read as current capability.

### 4.3 Resolve specification contradictions
- **Standing Order 11 vs 12:** Agents must discover context AND never trust inherited context. Add a resolution: "Discover context, then validate it against Brain before trusting."
- **Admiral as enforcer vs. LLM drift:** Acknowledge that the Admiral is subject to context pressure. Specify what enforces the Admiral (answer: hooks + Brain + human oversight, not just self-discipline).
- **Decision Authority defined 3x:** Pick one canonical location. Others reference it.

### 4.4 Define the Context Curator
- **File:** New `fleet/agents/command/context-curator.md` (already exists but verify completeness)
- **Task:** This role is referenced in 4+ parts of the doctrine but has no concrete protocol. Define: what context it assembles, in what format, how it validates currency, what happens when context is missing.

### 4.5 Wire QA agent to Brain
- **File:** `fleet/agents/command/executable/qa_agent.py:244`
- **Task:** Add optional `--brain-db` flag that bootstraps a SQLite Brain and passes it to the agent. The "working example" should demonstrate the core framework feature.

---

## Phase 5: Complete the Platform (Make it a real system)

**Gate: Brain is discoverable as an MCP server. At least 3 agents can be instantiated and connected.**

**Depends on:** All prior phases complete.

### 5.1 Complete MCP transport
- **File:** `brain/mcp/transport.py`
- **Task:** Implement missing MCP endpoints: `resources/list`, `prompts/list`, capability negotiation. Return proper JSON-RPC errors (not `"isError": True` in success responses).
- **Deliverable:** `python -m brain.mcp.transport` starts a working MCP server on stdio.

### 5.2 Postgres adapter
- **File:** New `brain/core/postgres_store.py`
- **Task:** Implement the same interface as `BrainStore`/`SQLiteBrainStore` against Postgres + pgvector. Use the existing schema at `brain/schema/001_initial.sql` as the starting point.
- **Dependencies:** `psycopg[binary]>=3.1`, `pgvector>=0.3` (already in pyproject.toml optional deps).

### 5.3 Agent instantiation framework
- **File:** New `fleet/runtime/` module
- **Task:** Minimal agent runner that:
  1. Reads a fleet agent markdown spec
  2. Assembles the prompt (identity + authority + constraints + knowledge from Brain)
  3. Calls an LLM API
  4. Records outcomes back to Brain
- **Scope:** Start with 1 pattern (single-agent, single-task). Don't build orchestration yet.

### 5.4 Integrate coherence analysis
- **File:** `brain/mcp/server.py`
- **Task:** Add `brain_coherence` as an 8th tool. Runs `analyze_coherence()` against current store contents. Optionally trigger automatically after every N writes.

### 5.5 Hook enforcement (if using Claude Code)
- **File:** `.claude/hooks.json`
- **Task:** Expand from 3 development-time hooks to include the framework's own enforcement:
  - PreToolUse: Block writes to Brain without valid auth context
  - PostToolUse: After agent completes, verify checkpoint was created
  - Notification: Alert on coherence drift detection
- **Note:** This only applies to Claude Code sessions. For general agent usage, enforcement must come from the MCP server itself.

---

## Execution Order Summary

```
Phase 0 ─── Fix Bugs ──────────────────── ~2-3 sessions
  ├── 0.1 SQLite index bug (5 min)
  ├── 0.2 Retrieval project filter (10 min)
  ├── 0.3 Link creation race (20 min)
  ├── 0.4 SQLite test teardown (30 min)
  ├── 0.5 Monitor test imports (15 min)
  ├── 0.6 fcntl Windows compat (30 min)
  └── 0.7 Doc count fixes (5 min)

Phase 1 ─── Persistence ───────────────── ~1-2 sessions
  ├── 1.1 SQLiteBrainStore.close()
  ├── 1.2 Demo with --persist
  ├── 1.3 Audit pruning efficiency
  └── 1.4 Embedding failure handling

Phase 2 ─── Test Coverage ─────────────── ~2-3 sessions
  ├── 2.1 Rate limiter tests
  ├── 2.2 Quarantine bypass tests
  ├── 2.3 Monitor test coverage
  ├── 2.4 Coherence false positives
  └── 2.5 Transport edge cases

Phase 3 ─── Security ──────────────────── ~1-2 sessions
  ├── 3.1 Mandatory quarantine
  ├── 3.2 Message size limits
  ├── 3.3 ReDoS mitigation
  ├── 3.4 Email regex precision
  └── 3.5 HTML entity decoding

Phase 4 ─── Documentation ─────────────── ~2-3 sessions
  ├── 4.1 Fleet triage (core/planned/archive)
  ├── 4.2 Admiral status markers
  ├── 4.3 Contradiction resolution
  ├── 4.4 Context Curator definition
  └── 4.5 QA agent + Brain integration

Phase 5 ─── Platform ──────────────────── ~4-6 sessions
  ├── 5.1 MCP transport completion
  ├── 5.2 Postgres adapter
  ├── 5.3 Agent instantiation framework
  ├── 5.4 Coherence as MCP tool
  └── 5.5 Hook enforcement expansion
```

---

## Non-Goals (Explicitly Out of Scope)

- **Do not** build all 100 agents. Build 1-3, prove the pattern, let the rest follow.
- **Do not** implement swarm coordination. Single-agent and simple orchestrator patterns come first.
- **Do not** build a web UI. CLI + MCP is the interface.
- **Do not** optimize embeddings or retrieval ranking until real embeddings (OpenAI or local) are integrated. Tuning mock embeddings is waste.
- **Do not** implement the full admiral doctrine. Implement what's needed for the current working set of agents, not the theoretical maximum.
