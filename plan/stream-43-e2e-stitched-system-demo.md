# Stream 43: End-to-End Stitched System Demo

> Build and CI-wire a single runnable demo that exercises the full Admiral stack in one flow: session start → hook fires → `admiral/lib` writes state → control-plane ingests → MCP server exposes the result → Standing Order enforcement blocks a known-bad action. Phase 11 (Stream 36) proved orchestration *within* `control-plane/`; this stream proves cross-component integration across `.hooks/`, `admiral/`, `control-plane/`, and `mcp-server/`.

**Phase:** 20 — End-to-End Stitched System Demo (Credibility Closure Tier)

**Scope:** No runnable demo currently stitches hooks → admiral lib → control-plane → MCP together. Each component has its own tests, but the question "does the whole thing work as one system?" has never been answered. This stream creates `scripts/demo-stitched.sh` — a single script exercising at least 5 distinct components — wires it to CI, and documents the flow with file:line references.

**Resolves rating-review weakness:** "No end-to-end integration — isolated modules, no stitched demo."

**Principle:** A system that has not been exercised end-to-end has not been tested. Compliance crosswalks (Phase 13) and enterprise positioning depend on demonstrable depth, not on per-component test coverage.

---

## 43.1 Demo Script

- [ ] **DM-01: Design the demo flow**
  - **Description:** Document the demo flow as a numbered sequence in `docs/demo-walkthrough.md`. The flow must touch at least 5 components: `.hooks/`, `admiral/lib/`, `control-plane/src/`, `mcp-server/src/`, `admiral/standing-orders/`. The canonical sequence: (1) session start, (2) PreToolUse with valid payload, (3) PreToolUse with bad payload (verify hard-block), (4) PostToolUse with valid payload, (5) control-plane event ingestion verified, (6) MCP server query for resulting brain entry, (7) Standing Order compliance check.
  - **Done when:** Demo flow document exists with numbered steps and component-per-step mapping.
  - **Files:** `docs/demo-walkthrough.md` (new)
  - **Size:** M
  - **Depends on:** Phases 16, 17, 18, 19 (so all components are real)

- [ ] **DM-02: Implement `scripts/demo-stitched.sh`**
  - **Description:** Build the bash driver script that executes each step from DM-01. Use a temporary working directory under `/tmp/admiral-demo-$$` so the demo does not pollute the repo. For each step, capture stdout/stderr/exit code and assert against expected values. Print a structured report at the end: `{step: 1, name: "session_start", expected: 0, actual: 0, status: "PASS"}` per step. Exit 0 on all-pass, 1 on any failure.
  - **Done when:** `scripts/demo-stitched.sh` exists, executes the full flow, and reports per-step pass/fail.
  - **Files:** `scripts/demo-stitched.sh` (new)
  - **Size:** L
  - **Depends on:** DM-01

- [ ] **DM-03: Use real components, mock only LLM calls**
  - **Description:** The demo must invoke real `.hooks/` scripts, real `admiral/lib/` libraries, the real `control-plane/` server (or its in-process invocation), and the real `mcp-server/`. The only allowed mock is the LLM call itself (use a hardcoded fake tool input/output payload). Network calls and disk writes are real (in the temp directory).
  - **Done when:** The demo uses real components for every layer except the LLM. Code review confirms zero stubs in the call chain.
  - **Files:** `scripts/demo-stitched.sh`
  - **Size:** M
  - **Depends on:** DM-02

## 43.2 Bad-Path Coverage

- [ ] **DM-04: Add a hard-block scenario**
  - **Description:** Extend the demo to include a deliberately bad payload that should trigger a Standing Order hard-block (e.g., a Bash command containing `--no-verify`, which `prohibitions_enforcer.sh` is documented to block). Assert that the hook exits 2, the tool call is denied, and the event is logged. This validates that Phase 18's enforcement closure actually fires end-to-end.
  - **Done when:** Demo includes a hard-block scenario that succeeds (i.e., the bad action is blocked).
  - **Files:** `scripts/demo-stitched.sh`
  - **Size:** M
  - **Depends on:** DM-02, Phase 18

- [ ] **DM-05: Add a Brain B1 round-trip scenario**
  - **Description:** Extend the demo to write a Brain B1 entry via `brain_writer.sh`, query it back via the MCP server's brain tool, and assert the round-trip succeeds. This validates the full Brain → MCP → consumer chain.
  - **Done when:** Demo includes a Brain B1 round-trip that succeeds.
  - **Files:** `scripts/demo-stitched.sh`
  - **Size:** M
  - **Depends on:** DM-02

## 43.3 Documentation

- [ ] **DM-06: Write `docs/demo-walkthrough.md` with file:line references**
  - **Description:** Narrate the demo flow in prose, with explicit `file:line` references to every component invoked. For example: "Step 1 calls `.hooks/session_start_adapter.sh:24`, which sources `admiral/lib/state.sh:48`, which writes to `.admiral/session_state.json`." The walkthrough is the canonical artifact for explaining how Admiral works to a new contributor.
  - **Done when:** `demo-walkthrough.md` exists with prose narration and `file:line` references for every step.
  - **Files:** `docs/demo-walkthrough.md`
  - **Size:** L
  - **Depends on:** DM-02, DM-04, DM-05

- [ ] **DM-07: Add demo screenshot/asciicast**
  - **Description:** Capture an asciicast (or terminal screenshot) of the demo running successfully. Embed in `docs/demo-walkthrough.md` and link from `README.md`. This is the marketing artifact for the demo.
  - **Done when:** Asciicast or screenshot exists and is linked from README.
  - **Files:** `docs/demo-walkthrough.md`, `README.md`, `docs/assets/demo.cast` (new)
  - **Size:** S
  - **Depends on:** DM-06

## 43.4 CI Integration

- [ ] **DM-08: Wire demo to CI**
  - **Description:** Add a CI job to `.github/workflows/control-plane-ci.yml` (or a new workflow) that runs `scripts/demo-stitched.sh` on every PR to main. The demo must complete in <60 seconds (no LLM calls, no network egress). Fail the build if the demo fails.
  - **Done when:** CI runs the demo on every PR and fails the build on demo failure.
  - **Files:** `.github/workflows/demo-ci.yml` (new) or extension of existing
  - **Size:** S
  - **Depends on:** DM-02, DM-04, DM-05

---

## Dependencies

| Item | Depends on |
|------|-----------|
| DM-01 (design) | Phases 16, 17, 18, 19 |
| DM-02 (script) | DM-01 |
| DM-03 (real components) | DM-02 |
| DM-04 (hard-block scenario) | DM-02, Phase 18 |
| DM-05 (brain round-trip) | DM-02 |
| DM-06 (walkthrough doc) | DM-02, DM-04, DM-05 |
| DM-07 (asciicast) | DM-06 |
| DM-08 (CI) | DM-02, DM-04, DM-05 |

---

## Exit Criteria

- `scripts/demo-stitched.sh` exists and exits 0 on success.
- The demo touches ≥5 distinct components (`.hooks/`, `admiral/lib/`, `control-plane/src/`, `mcp-server/src/`, `admiral/standing-orders/`).
- The demo includes a hard-block scenario and a Brain round-trip scenario.
- `docs/demo-walkthrough.md` narrates the flow with `file:line` references.
- The demo runs in CI on every PR to main and completes in <60 seconds.
- Asciicast or screenshot is linked from README.
