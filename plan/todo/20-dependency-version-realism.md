# TODO: Dependency & Version Realism (Phase 15)

> Source: `plan/ROADMAP.md` Phase 15, `plan/stream-38-dependency-version-realism.md`

**Resolves rating-review weakness:** Version fiction (TS ^6.0.2, @types/node ^25.5.0 pinned ahead of GA).

**Phase exit:** `npm install && npm test` succeeds on a clean clone of every package on Linux + macOS CI.

---

## Pinning & Lockfiles

- [ ] **DV-01** — Audit every `package.json` for unreleased pins. Output `docs/audit-versions.md`.
- [ ] **DV-02** — Pin TypeScript, `@types/node`, Biome, Stryker to current GA versions in every package.
- [ ] **DV-03** — Regenerate every `package-lock.json` from a clean state.

## Engines & Reproducibility

- [ ] **DV-04** — Add `engines` field to every `package.json` matching `.nvmrc`.
- [ ] **DV-05** — Document any intentional pre-release pins with rationale and graduation plan.

## CI Validation

- [ ] **DV-06** — Add CI matrix that resolves dependencies on `ubuntu-latest` + `macos-latest` for `control-plane/` and `admiral/`.
- [ ] **DV-07** — Add `engines` validation step that fails CI if a package declares an incompatible Node version.
