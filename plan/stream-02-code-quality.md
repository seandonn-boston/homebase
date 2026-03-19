# Stream 2: Code Quality & Consistency — From 6/10 to 10/10

> *"One style, everywhere, enforced by tooling." — The pattern across all pristine repos*

**Current score:** 6/10
**Target score:** 10/10

**Gap summary:** Biome, ShellCheck, pre-commit hooks, strict TS in place. Missing: coverage gates, security scanning, jq helpers, typed error hierarchy. Bash hooks vary in jq patterns, error handling. Naming inconsistencies (kebab vs snake). Config scattered across 3+ locations.

---

## 2.1 Bash Hook Standardization

- [ ] **Q-01: Create shared jq helpers library**
  - **Description:** Extract common jq patterns into a shared library. Functions: `jq_get_field()`, `jq_set_field()`, `jq_array_append()`, `jq_validate()`. Refactor all hooks to use these helpers instead of inline jq invocations. This eliminates inconsistent jq patterns and reduces the surface area for jq-related bugs.
  - **Done when:** All hooks use shared helpers, no inconsistent jq patterns remain.
  - **Files:** `admiral/lib/jq_helpers.sh` (new), all `.hooks/*.sh`
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **Q-02: Standardize hook error handling pattern**
  - **Description:** Create shared error handling pattern in `admiral/lib/hook_utils.sh`. Functions: `hook_log()`, `hook_fail_soft()`, `hook_fail_hard()`, `hook_pass()`. Every hook should use these instead of ad-hoc error handling. This ensures consistent exit codes, logging format, and fail-open/fail-closed behavior per ADR-004.
  - **Done when:** All 13 hooks use shared functions. No ad-hoc error handling patterns remain.
  - **Files:** `admiral/lib/hook_utils.sh` (new), all `.hooks/*.sh`
  - **Size:** L (3+ hours)
  - **Spec ref:** ADR-004
  - **Depends on:** —

- [ ] **Q-03: Document and enforce hook header standard**
  - **Description:** Define mandatory header for every hook script: purpose, exit codes, dependencies, Standing Order reference, last modified date. Create a CI validation script that checks all hooks for header compliance. This makes hooks self-documenting and ensures new hooks follow the standard.
  - **Done when:** All 13 hooks have consistent headers. CI checks enforce compliance.
  - **Files:** all `.hooks/*.sh`, `admiral/tests/test_hook_headers.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **Q-04: Eliminate hook config loading duplication**
  - **Description:** Extract repeated config loading and secret detection patterns into shared library. Currently multiple hooks independently load config.json, parse similar fields, and perform similar secret detection. Centralizing this reduces duplication and ensures consistent behavior.
  - **Done when:** No duplicated config loading patterns across hooks. Single source of truth for config access.
  - **Files:** `admiral/lib/hook_config.sh` (new), `.hooks/*.sh`
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** Q-01

---

## 2.2 TypeScript Quality Improvements

- [ ] **Q-05: Replace Date.now() event IDs with crypto.randomUUID()**
  - **Description:** Current event IDs use Date.now() which is collision-prone under concurrent writes. Replace with crypto.randomUUID() for collision-safe IDs. New format: `evt_<uuid>`. This eliminates a class of subtle bugs where events can overwrite each other.
  - **Done when:** Uses crypto.randomUUID(), ID format `evt_<uuid>`. All existing tests updated.
  - **Files:** `control-plane/src/events.ts`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **Q-06: Add typed error hierarchy**
  - **Description:** Create AdmiralError base class plus specific error types: NotFoundError, ValidationError, StateCorruptionError, IngestionError. Replace all `err instanceof Error ? err.message : String(err)` patterns with typed catches. This enables precise error handling, better logging, and clearer error messages for users.
  - **Done when:** No `err instanceof Error ? err.message : String(err)` patterns remain. All thrown errors extend AdmiralError.
  - **Files:** `control-plane/src/errors.ts` (new), `control-plane/src/server.ts`, `control-plane/src/ingest.ts`
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **Q-07: Document TypeScript export conventions**
  - **Description:** Add a "TypeScript Exports" section to CONTRIBUTING.md defining when to use named exports vs default exports, what belongs in index.ts, and the public API surface contract. This prevents confusion about what is part of the public API.
  - **Done when:** CONTRIBUTING.md has "TypeScript Exports" section. index.ts follows documented conventions.
  - **Files:** `CONTRIBUTING.md`, `control-plane/src/index.ts`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **Q-08: Improve server.ts URL routing**
  - **Description:** Replace manual url.split("/") with declarative route table. Eliminate `agentId !== "resume"` guard. A declarative routing pattern makes the API surface visible at a glance and reduces the risk of routing bugs.
  - **Done when:** Declarative routing in place. All server tests pass. No manual URL parsing.
  - **Files:** `control-plane/src/server.ts`, `control-plane/src/server.test.ts`
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

---

## 2.3 Cross-Cutting Quality Improvements

- [ ] **Q-09: ShellCheck strict mode for all hooks**
  - **Description:** Enable strict ShellCheck directives across all bash scripts. Specifically enable SC2086 (double-quote to prevent globbing and word splitting), SC2046 (quote command substitutions), SC2035 (use ./* glob), and SC2155 (declare and assign separately). Add `# shellcheck enable=all` or equivalent strict configuration. Fix all violations surfaced by strict mode. This catches an entire class of bash bugs that default ShellCheck settings miss.
  - **Done when:** All `.hooks/*.sh` and `admiral/lib/*.sh` scripts pass ShellCheck with strict mode enabled. Zero warnings. CI enforces strict mode.
  - **Files:** all `.hooks/*.sh`, `admiral/lib/*.sh`, `.shellcheckrc` (new or modify)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **Q-10: Consistent logging format across all bash scripts**
  - **Description:** Define and enforce a structured JSON logging format for all bash scripts. Every log line should be valid JSON with fields: `timestamp`, `level` (debug/info/warn/error), `component` (hook name or library), `message`, and optional `context` object. Create a `log_json()` helper in `admiral/lib/hook_utils.sh` that formats output consistently. This enables log aggregation, searching, and monitoring across the entire hook system.
  - **Done when:** All hooks and libraries use `log_json()` for output. Log output is parseable by `jq`. No unstructured stderr output remains.
  - **Files:** `admiral/lib/hook_utils.sh` (modify), all `.hooks/*.sh`, all `admiral/lib/*.sh`
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** Q-02

- [ ] **Q-11: Dead code elimination audit**
  - **Description:** Systematically find and remove unused functions, variables, and unreachable code paths across both TypeScript and bash codebases. For TypeScript, use the compiler's `noUnusedLocals` and `noUnusedParameters` flags plus manual review. For bash, grep for function definitions and verify each has at least one call site. Document any code that appears dead but is intentionally kept (e.g., public API surface, future use) with explicit comments.
  - **Done when:** Zero unused functions or variables in TypeScript (compiler flags enabled). Every bash function has at least one call site or an explicit "public API" comment. Dead code removed or documented.
  - **Files:** `control-plane/tsconfig.json`, various `.ts` and `.sh` files
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **Q-12: TypeScript strict null checks enforcement**
  - **Description:** Enable `strictNullChecks` in tsconfig.json if not already enabled. Fix all resulting type errors. Strict null checks force explicit handling of null/undefined values, eliminating an entire category of runtime errors (the "billion dollar mistake"). Every nullable value must be explicitly checked before use.
  - **Done when:** `strictNullChecks: true` in tsconfig.json. Zero type errors. No `as any` casts added to suppress null check errors (use proper type narrowing instead).
  - **Files:** `control-plane/tsconfig.json`, various `control-plane/src/*.ts` files
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **Q-13: Consistent exit code taxonomy across all hooks**
  - **Description:** Define a formal exit code taxonomy for all hooks and enforce it. Proposed taxonomy: 0 = success (pass-through), 1 = general error (fail-open), 2 = block/reject (fail-closed), 3 = configuration error, 4 = dependency error (missing jq, etc.), 126 = hook disabled, 127 = hook not found. Document the taxonomy in ADMIRAL_STYLE.md. Audit all hooks to ensure they use the correct codes. Create a shared constant file or header comment that defines the codes.
  - **Done when:** Exit code taxonomy documented. All hooks use correct exit codes per taxonomy. CI test validates exit codes for known scenarios.
  - **Files:** `admiral/lib/exit_codes.sh` (new), all `.hooks/*.sh`, `ADMIRAL_STYLE.md`
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** Q-02, D-01

- [ ] **Q-14: Hook idempotency verification**
  - **Description:** Verify and enforce that running any hook twice with the same input produces the same output (idempotency). Some hooks modify state (session_state.json, event_log.jsonl), so idempotency must be defined carefully: the hook's stdout/stderr output and exit code must be identical, and state mutations must be convergent (applying the same change twice results in the same state as applying it once). Create a test that runs each hook twice with identical input and verifies output equality.
  - **Done when:** Every hook produces identical output when run twice with same input. State mutations are convergent. Test suite verifies idempotency for all hooks.
  - **Files:** `admiral/tests/test_hook_idempotency.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —
