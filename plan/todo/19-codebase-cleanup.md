# TODO: Codebase Cleanup & Refactoring (Phase 14)

Source: plan/ROADMAP.md Phase 14

---

## Suppression Removal

- [x] **CL-01** — Audit and address all shellcheck/biome/eslint suppressions. Fix underlying issues where possible; document as accepted where suppressions are genuinely necessary (e.g., SC2016 for intentional attack vectors).
- [x] **CL-02** — Verify zero suppressions in non-test code. Test files may retain justified suppressions with explanatory comments.

## Dead Code

- [x] **CL-03** — Identify and remove unused functions, variables, and exports across TypeScript modules.
- [x] **CL-04** — Identify and remove orphaned files (created but never imported/referenced).

## Deduplication

- [x] **CL-05** — Extract shared utilities from repeated patterns across shell scripts and TypeScript modules.

## Naming Conventions

- [x] **CL-06** — Normalize file names, function names, and variable names per ADMIRAL_STYLE.md.

## Operational Fine-Tuning

- [x] **CL-07** — Tighten error handling, improve logging consistency across hooks and control plane.
