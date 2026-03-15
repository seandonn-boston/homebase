# Specification Debt

> **Audience:** Spec authors and reviewers. This document tracks known areas where the Admiral Framework specification is aspirational rather than validated, where claims outpace evidence, or where internal consistency could be improved. Modeled after `spec-gaps.md`, which successfully tracked and resolved 14 vague behavioral claims.
>
> **Update policy:** Add entries when gaps are discovered. Resolve entries when evidence is provided or spec language is adjusted to match reality. Keep resolved entries as historical records.

-----

## Active Debt

### ~~SD-01: Hook Coverage vs. Enforcement Spectrum Thesis~~ → Resolved

*Moved to Resolved Debt (see below).*

-----

### SD-02: Benchmark Targets Lack Empirical Basis

**Severity:** Moderate
**Claim:** Benchmarks define targets (First-pass quality > 75%, Auto-recovery > 80%, etc.) and project improvement trajectories over time.
**Reality:** All targets are informed estimates. No Admiral-governed fleet has produced empirical measurements.
**Where it appears:** `benchmarks.md`
**Resolution path:** Run end-to-end validation on a real project; populate the "Validated" column with actual measurements. Adjust targets if reality diverges from estimates.

-----

### SD-03: Fleet Catalog Presented as Differentiator Without Validation

**Severity:** Moderate
**Claim:** "71 pre-defined roles with interface contracts don't exist anywhere else" (sales pitch).
**Reality:** Agent definitions are specifications based on production patterns, not battle-tested implementations (correctly acknowledged in `AGENTS.md`). External-facing documents present them as a competitive advantage without noting this caveat.
**Where it appears:** `sales-pitch-30min-guide.md`
**Resolution path:** Add a brief caveat in the sales pitch: "based on production patterns, refined through real-world deployment" — honest without undermining the differentiator claim.

-----

### SD-04: Monitor Immune System Layers 3-5 Are Specified But Unimplemented

**Severity:** Moderate
**Claim:** The Monitor has a five-layer immune system with deterministic semantic analysis, LLM advisory, and antibody learning.
**Reality:** Only Layers 1-2 have partial implementation. Layers 3-5 are fully specified but have no code, pseudocode, or reference implementation.
**Where it appears:** `monitor/README.md`
**Resolution path:** Either write reference implementations (even pseudocode) for Layers 3-5, or adjust the specification to clearly mark them as "design intent" rather than "architecture specification."

-----

### SD-05: Data Ecosystem (Part 12) Is the Thinnest Doctrine Part

**Severity:** Low (improved in v0.8.1)
**Claim:** Part 12 defines a complete closed-loop data ecosystem with 6 feedback loops, 7 datasets, and 5 ecosystem agents.
**Reality:** The ecosystem is well-specified at the conceptual level. Dataset record schemas and a worked example were added in v0.8.1. However, it remains the most abstract part of the doctrine — no reference implementations exist for any feedback loop or ecosystem agent.
**Resolution path:** Continue deepening with additional worked examples. Validate at least one feedback loop end-to-end during real-world deployment.

-----

## Resolved Debt

### SD-01: Hook Coverage vs. Enforcement Spectrum Thesis

**Severity:** High (was)
**Resolved:** 2026-03-15
**Resolution:** Increased hook enforcement from 4/15 (27%) to 8/15 (53%), meeting the stated target of 8/15 minimum. Four new hooks implemented:

| Hook | Standing Order | Lifecycle | What It Enforces |
|------|---------------|-----------|-----------------|
| `scope_boundary_guard` | SO-03 (Scope Boundaries) | PreToolUse | Validates file operations against protected directory boundaries (`aiStrat/`, `.github/workflows/`, `.claude/settings`) |
| `prohibitions_enforcer` | SO-10 (Prohibitions) | PreToolUse | Detects enforcement bypass patterns, secret/credential exposure, irreversible operations |
| `zero_trust_validator` | SO-12 (Zero-Trust) | PostToolUse | Flags untrusted external data, prompt injection markers, blast radius assessment, excessive scope |
| `pre_work_validator` | SO-15 (Pre-Work Validation) | PreToolUse | Validates Standing Orders loaded, budget defined, sufficient context before first write |

**Evidence:** `standing-orders-enforcement-map.md` updated to reflect E2 coverage. All hooks follow the advisory-only pattern (never hard-block, always exit 0) consistent with the framework's fail-open design. Hook implementations in `.hooks/` directory, wired through `pre_tool_use_adapter.sh` and `post_tool_use_adapter.sh`.
**Remaining gap:** Coverage is 53%, not the 80%+ aspirational target in `benchmarks.md`. The enforcement spectrum thesis is now defensible (majority coverage) but not fully realized. Further progression tracked in the enforcement map's E3 targets.

-----

## Cross-References

- Spec gap tracking (resolved): `spec-gaps.md`
- Constants registry: `reference-constants.md`
- Benchmarks: `benchmarks.md`
- Enforcement mapping: `standing-orders-enforcement-map.md`
