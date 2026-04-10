# TODO: Hook Test Depth (Phase 17)

> Source: `plan/ROADMAP.md` Phase 17, `plan/stream-40-hook-test-depth.md`

**Resolves rating-review weakness:** 21 hooks share 1 test file (`.hooks/tests/test_hooks.sh`).

**Phase exit:** One `test_<hook>.sh` per hook; ≥5 negative cases per hook; pipeline sequencing test passing; hook coverage metric ≥95%; CI blocks new hooks without tests.

---

## Per-Hook Test Files

- [ ] **HD-01** — Inventory existing coverage in `test_hooks.sh`. Output `docs/hook-test-coverage-baseline.md`.
- [ ] **HD-02** — Split `test_hooks.sh` into one `test_<hook>.sh` per hook (21 files). Preserve original as `test_hooks_legacy.sh` until parity confirmed.
- [ ] **HD-03** — Add ≥5 negative cases per hook (≥105 total) drawn from: malformed JSON, missing fields, empty stdin, oversized payload, Unicode, nulls, nested JSON, concurrent invocation, missing dep, corrupted state.
- [ ] **HD-04** — Verify parity with legacy monolith and delete `test_hooks_legacy.sh`.

## Pipeline Sequencing

- [ ] **HD-05** — Add `test_hook_pipeline_sequencing.sh` covering session_start → pre_tool_use → post_tool_use ordering and state consistency.
- [ ] **HD-06** — Add `test_hook_idempotency_chain.sh` running the full chain twice and asserting identical outputs.

## Coverage Metric & CI

- [ ] **HD-07** — Add `scripts/hook-coverage.sh` reporting % of hooks with ≥5 negative cases. Target ≥95%.
- [ ] **HD-08** — Add CI rule that fails the build if any `.hooks/*.sh` lacks a matching `test_*.sh`.
