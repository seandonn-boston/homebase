# Stream 41: Standing Orders Enforcement Closure

> Close the gap between Standing Orders policy files and actual runtime enforcement. Fill in the stubbed functions in `admiral/lib/so_enforcement.sh`, extend `zero_trust_validator.sh` to scan MCP tool responses, and reclassify advisory-only Standing Orders as hard-blocking where the false-positive risk is acceptable. **This stream resolves the project's largest credibility gap.**

**Phase:** 18 — Policy → Enforcement Closure (Credibility Closure Tier)

**Scope:** The framework's core thesis is "deterministic enforcement beats advisory guidance." Today, `admiral/lib/so_enforcement.sh` contains placeholder stub returns of `{"enforced": true, "alert": "", "severity": "info"}` for SO-01 through SO-09. Most Standing Orders resolve to advisory fail-open paths per `docs/standing-orders-enforcement-map.md`. The single MCP tool response scanning gap identified in `MCP-SECURITY-ANALYSIS.md` (line ~500) — `zero_trust_validator.sh` only scans WebFetch/WebSearch — is also unresolved. This stream closes all of these.

**Resolves rating-review weakness:** "Policy ≠ enforcement — Standing Orders stubbed, advisory fail-open paths contradict the core thesis."

**Principle:** A policy that does not block is a suggestion. Suggestions are what the framework was built to replace.

---

## 41.1 Standing Order Enforcement Functions

- [ ] **PE-01: Inventory current stub functions in `so_enforcement.sh`**
  - **Description:** Read `admiral/lib/so_enforcement.sh` and produce a stub inventory: for each SO-01..SO-16 function, classify as `stub` (returns placeholder), `partial` (some logic, advisory-only), or `complete` (real enforcement). Output in `docs/so-enforcement-inventory.md`. This drives the per-SO work in PE-02..PE-09.
  - **Done when:** Stub inventory exists with status per SO function.
  - **Files:** `docs/so-enforcement-inventory.md` (new)
  - **Size:** S
  - **Depends on:** —

- [ ] **PE-02: Implement SO-01 (Mission Alignment) enforcement**
  - **Description:** Replace the stub in `so_enforce_01_mission_alignment()` with real logic. The function must read the current task from session state, compare against the declared mission in `admiral/standing-orders/01-mission-alignment.json`, and return `{"enforced": true, "violations": [...], "severity": ...}`. Severity escalation: `info` for tangential drift, `warn` for off-mission, `block` for prohibited mission categories. Default posture: advisory until violation count exceeds threshold.
  - **Done when:** SO-01 function returns real evaluations against mission state. Test cases cover on-mission, off-mission, and prohibited categories.
  - **Files:** `admiral/lib/so_enforcement.sh`, `admiral/tests/test_so_enforcement.sh`
  - **Size:** M
  - **Depends on:** PE-01, Phase 17 (regression safety)

- [ ] **PE-03: Implement SO-02..SO-09 enforcement (one per task)**
  - **Description:** Repeat the PE-02 pattern for SO-02 (Boundary Respect), SO-03 (Scope Adherence), SO-04 (Context Honesty), SO-05 (Decision Authority), SO-06 (Communication Discipline), SO-07 (Recovery Behavior), SO-08 (Quality Floor), SO-09 (Shadow MCP Servers). Each function must read its corresponding `admiral/standing-orders/<NN>-*.json` policy file and produce real enforcement decisions. SO-09 specifically must read `admiral/config/approved_mcp_servers.json` and block unapproved servers.
  - **Done when:** SO-02 through SO-09 functions are implemented with real logic and test coverage.
  - **Files:** `admiral/lib/so_enforcement.sh`, `admiral/tests/test_so_enforcement.sh`
  - **Size:** L (8 sub-tasks)
  - **Depends on:** PE-01, Phase 17

- [ ] **PE-04: Verify SO-10..SO-16 enforcement is complete**
  - **Description:** Review the existing implementations for SO-10 (Prohibitions) through SO-16 (Protocol Governance). Document the current enforcement strength of each. Flag any that are still advisory-only and produce a remediation plan. SO-10 already hard-blocks bypass attempts; SO-12 (zero-trust) and SO-16 (protocol governance) are flagged as advisory in the existing enforcement map.
  - **Done when:** Each SO-10..SO-16 has a documented enforcement strength and remediation plan if needed.
  - **Files:** `docs/so-enforcement-inventory.md`
  - **Size:** S
  - **Depends on:** PE-01

## 41.2 MCP Tool Response Scanning

- [ ] **PE-05: Extend `zero_trust_validator.sh` to scan MCP tool responses**
  - **Description:** Currently `zero_trust_validator.sh` only scans payloads from WebFetch and WebSearch tools. The MCP-SECURITY-ANALYSIS.md document flags MCP tool responses as the #1 unaddressed gap — they are equally untrusted but bypass scanning. Extend the validator to scan any MCP tool response (`tool_name` matching `mcp__*`) using the same injection pattern database in `admiral/lib/injection_detect.sh`.
  - **Done when:** `zero_trust_validator.sh` scans MCP tool responses with the same patterns as WebFetch/WebSearch. Test cases cover known-bad MCP responses (use the existing attack corpus).
  - **Files:** `.hooks/zero_trust_validator.sh`, `admiral/tests/test_zero_trust_validator.sh`
  - **Size:** M
  - **Depends on:** Phase 17

- [ ] **PE-06: Add attack corpus entries for MCP tool response injections**
  - **Description:** Extend the existing attack corpus in `admiral/security/attack-corpus/` with at least 10 MCP-tool-response injection scenarios drawn from the OWASP MCP Top 10. Each scenario must include: tool name, payload, expected detection, expected exit behavior. Run them through the extended `zero_trust_validator.sh` to confirm detection.
  - **Done when:** ≥10 new MCP-response attack scenarios exist and are detected. Test passes.
  - **Files:** `admiral/security/attack-corpus/mcp-response-*.json` (≥10 new files)
  - **Size:** M
  - **Depends on:** PE-05

## 41.3 Advisory-to-Hard-Block Promotions

- [ ] **PE-07: Promote SO-09 (Shadow MCP Servers) to hard-block**
  - **Description:** SO-09 currently exists as a policy file but has no runtime enforcement. Wire `protocol_registry_guard.sh` (which already exists in `.hooks/` per the rating review) to read `admiral/config/approved_mcp_servers.json` and exit 2 (hard-block) on any MCP server invocation that does not match the approved list. Document the promotion in `docs/standing-orders-enforcement-map.md`.
  - **Done when:** `protocol_registry_guard.sh` blocks unapproved MCP servers. Test cases cover approved + unapproved + missing-config scenarios (with fail-open fallback when config is missing per ADR-004).
  - **Files:** `.hooks/protocol_registry_guard.sh`, `admiral/tests/test_protocol_registry_guard.sh`
  - **Size:** M
  - **Depends on:** PE-03 (SO-09 function), Phase 17

- [ ] **PE-08: Promote SO-03 (Scope Boundaries) to hard-block on protected paths**
  - **Description:** SO-03 is currently advisory in `scope_boundary_guard.sh`. Promote writes to protected paths (`.git/`, `.github/workflows/`, `.hooks/`, `admiral/standing-orders/`, `aiStrat/`) to hard-block (exit 2). Reads remain advisory. Update the hook to use the protected-path list from `admiral/config/protected_paths.json`.
  - **Done when:** `scope_boundary_guard.sh` hard-blocks writes to protected paths. Reads still pass advisory. Test cases cover both.
  - **Files:** `.hooks/scope_boundary_guard.sh`, `admiral/config/protected_paths.json` (new), `admiral/tests/test_scope_boundary_guard.sh`
  - **Size:** M
  - **Depends on:** PE-03, Phase 17

## 41.4 Enforcement Completeness Matrix

- [ ] **PE-09: Produce the enforcement completeness matrix**
  - **Description:** Build a matrix in `docs/standing-orders-enforcement-map.md` with one row per Standing Order and columns: `policy file`, `enforcement function`, `hook`, `exit behavior` (advisory / hard-block / tiered), `attack corpus coverage`, `test count`. Color-code entries: green for hard-block, yellow for tiered, red for advisory-only. Target: ≥12 of 16 SOs in green or yellow.
  - **Done when:** Matrix exists with ≥12/16 SOs at green or yellow.
  - **Files:** `docs/standing-orders-enforcement-map.md` (rewritten)
  - **Size:** M
  - **Depends on:** PE-02, PE-03, PE-04, PE-05, PE-07, PE-08

- [ ] **PE-10: Update `IMPLEMENTATION_STATUS.md` and `plan/index.md`**
  - **Description:** Update `admiral/IMPLEMENTATION_STATUS.md` to reflect the new enforcement strength of every Standing Order. Update `plan/index.md` Spec Implementation row to reflect the closure of the policy/enforcement gap.
  - **Done when:** Both files reflect the post-Phase-18 reality.
  - **Files:** `admiral/IMPLEMENTATION_STATUS.md`, `plan/index.md`
  - **Size:** S
  - **Depends on:** PE-09

---

## Dependencies

| Item | Depends on |
|------|-----------|
| PE-01 (inventory) | — |
| PE-02 (SO-01) | PE-01, Phase 17 |
| PE-03 (SO-02..SO-09) | PE-01, Phase 17 |
| PE-04 (SO-10..SO-16 audit) | PE-01 |
| PE-05 (MCP scanning) | Phase 17 |
| PE-06 (MCP attack corpus) | PE-05 |
| PE-07 (SO-09 promotion) | PE-03, Phase 17 |
| PE-08 (SO-03 promotion) | PE-03, Phase 17 |
| PE-09 (matrix) | PE-02, PE-03, PE-04, PE-05, PE-07, PE-08 |
| PE-10 (status update) | PE-09 |

---

## Exit Criteria

- `admiral/lib/so_enforcement.sh` contains zero placeholder stub returns for SO-01..SO-16.
- `zero_trust_validator.sh` scans MCP tool responses with the same patterns as WebFetch/WebSearch.
- ≥10 MCP-tool-response attack scenarios exist in the attack corpus and are detected.
- SO-09 hard-blocks unapproved MCP servers via `protocol_registry_guard.sh`.
- SO-03 hard-blocks writes to protected paths.
- The enforcement completeness matrix shows ≥12/16 SOs at hard-block or tiered enforcement.
- `IMPLEMENTATION_STATUS.md` and `plan/index.md` reflect the new state.
