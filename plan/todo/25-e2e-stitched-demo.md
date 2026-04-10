# TODO: End-to-End Stitched System Demo (Phase 20)

> Source: `plan/ROADMAP.md` Phase 20, `plan/stream-43-e2e-stitched-system-demo.md`

**Resolves rating-review weakness:** No end-to-end stitched demo across `.hooks/`, `admiral/`, `control-plane/`, `mcp-server/`. Phase 11 proved orchestration *within* control-plane only.

**Phase exit:** `scripts/demo-stitched.sh` exists, exits 0 on success, exercises ≥5 components, runs in CI on every PR in <60s.

---

## Demo Script

- [ ] **DM-01** — Design the demo flow as a numbered sequence in `docs/demo-walkthrough.md` touching ≥5 components.
- [ ] **DM-02** — Implement `scripts/demo-stitched.sh` executing each step with structured per-step pass/fail report.
- [ ] **DM-03** — Use real components for every layer except the LLM call. Code review confirms zero stubs in the call chain.

## Bad-Path Coverage

- [ ] **DM-04** — Add a hard-block scenario (e.g., Bash with `--no-verify`) verifying `prohibitions_enforcer.sh` exits 2.
- [ ] **DM-05** — Add a Brain B1 round-trip scenario (write via `brain_writer.sh`, query via MCP server brain tool).

## Documentation

- [ ] **DM-06** — Write `docs/demo-walkthrough.md` narrating the flow with `file:line` references for every component.
- [ ] **DM-07** — Capture asciicast or screenshot of the demo running successfully; link from README.

## CI Integration

- [ ] **DM-08** — Wire `scripts/demo-stitched.sh` to CI on every PR to main; fail build on demo failure; <60s runtime.
