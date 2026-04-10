# Stream 38: Dependency & Version Realism

> Pin every TypeScript, Node, and tooling dependency to actually-shipped releases so `npm install` resolves cleanly on a clean clone for any contributor.

**Phase:** 15 — Dependency & Version Realism (Credibility Closure Tier)

**Scope:** The current `control-plane/package.json` and `admiral/package.json` pin `typescript: ^6.0.2` and `@types/node: ^25.5.0`, both ahead of generally-available releases. The lockfile-to-reality drift is a silent contributor blocker — installation fails before the docs are read. This stream pins every dependency to the latest GA, regenerates lockfiles, adds `engines` fields, and proves on CI that a clean-clone install + test cycle works on Linux and macOS.

**Resolves rating-review weakness:** "Version fiction — TS ^6.0.2, @types/node ^25.5.0 pinned ahead of GA."

**Principle:** A dependency you cannot install is a dependency you do not have. Reproducibility is a precondition for every other phase in the Credibility Closure Tier.

---

## 38.1 Pinning & Lockfiles

- [ ] **DV-01: Audit every `package.json` for unreleased pins**
  - **Description:** Run `npm outdated` and inspect every `package.json` in the repo (`control-plane/`, `admiral/`, `mcp-server/`, `fleet/`, `monitor/`, `platform/`). Identify any version specifier that resolves to a pre-release, beta, or non-existent version. Produce a table of `package | current pin | resolved version | latest GA` for the audit.
  - **Done when:** `audit-versions.md` exists with the full table. Every flagged pin has a recommended GA replacement.
  - **Files:** `docs/audit-versions.md` (new)
  - **Size:** S
  - **Depends on:** —

- [ ] **DV-02: Pin TypeScript, @types/node, Biome, Stryker to current GA**
  - **Description:** Update every `package.json` flagged in DV-01. Pin TypeScript to the latest GA 5.x (or current GA major). Pin `@types/node` to current LTS (Node 22 LTS as of writing). Pin Biome to current 1.x/2.x shipped. Pin Stryker to latest shipped. Use exact-version pins (no `^` or `~`) for build-critical tools to lock reproducibility.
  - **Done when:** Every `package.json` resolves to a GA version. No pre-release specifiers remain.
  - **Files:** `control-plane/package.json`, `admiral/package.json`, `mcp-server/package.json`, `fleet/package.json`, `monitor/package.json`, `platform/package.json`
  - **Size:** M
  - **Depends on:** DV-01

- [ ] **DV-03: Regenerate lockfiles from clean state**
  - **Description:** Delete `node_modules/` and `package-lock.json` in every package, then run `npm install` to regenerate the lockfile from the new pins. Commit the regenerated lockfiles. Verify each lockfile resolves without warnings or peer-dep conflicts.
  - **Done when:** Every package has a clean, committed lockfile. `npm install` produces zero warnings on clean clone.
  - **Files:** `*/package-lock.json` (regenerated)
  - **Size:** S
  - **Depends on:** DV-02

## 38.2 Engines Field & Reproducibility

- [ ] **DV-04: Add `engines` field to every `package.json`**
  - **Description:** Add an `engines` field declaring the supported Node and npm versions to every `package.json`. Use the same Node version across all packages (the `.nvmrc` value). Document why each version was chosen in `docs/audit-versions.md`.
  - **Done when:** Every `package.json` declares `engines.node` and `engines.npm`. `.nvmrc` matches.
  - **Files:** All `*/package.json`, `.nvmrc`
  - **Size:** S
  - **Depends on:** DV-02

- [ ] **DV-05: Document any intentional pre-release pins with rationale**
  - **Description:** If any dependency must remain on a pre-release for technical reasons (e.g., a feature only available in beta), document the rationale, the upstream tracking issue, and the planned graduation date in `docs/audit-versions.md`. Default position: zero pre-release pins.
  - **Done when:** Either zero pre-release pins exist, or every pre-release pin has a documented rationale and graduation plan.
  - **Files:** `docs/audit-versions.md`
  - **Size:** S
  - **Depends on:** DV-02

## 38.3 CI Validation

- [ ] **DV-06: Add CI matrix that resolves dependencies on Linux + macOS**
  - **Description:** Extend the existing CI workflows to run a `npm ci` matrix on `ubuntu-latest` and `macos-latest`. The matrix must execute the full install + build + test cycle for `control-plane/` and `admiral/`. Fail the CI if any package fails to install or test on either platform.
  - **Done when:** CI workflow runs `npm ci && npm test` on both Linux and macOS for `control-plane/` and `admiral/`. Both pass green.
  - **Files:** `.github/workflows/control-plane-ci.yml`, `.github/workflows/admiral-ci.yml` (new)
  - **Size:** M
  - **Depends on:** DV-03, Phase 16 (admiral test runner repair must land before admiral-ci.yml is meaningful)

- [ ] **DV-07: Add `engines` validation step to CI**
  - **Description:** Add a CI step that validates the `engines` field in every `package.json` matches the actual Node version on the runner. Fail the build if a package declares an incompatible version.
  - **Done when:** CI fails if any `package.json` declares an `engines.node` that does not match the runner's Node version.
  - **Files:** `.github/workflows/control-plane-ci.yml`, `scripts/validate-engines.sh` (new)
  - **Size:** S
  - **Depends on:** DV-04

---

## Dependencies

| Item | Depends on |
|------|-----------|
| DV-01 (audit) | — |
| DV-02 (pin) | DV-01 |
| DV-03 (lockfiles) | DV-02 |
| DV-04 (engines) | DV-02 |
| DV-05 (rationale doc) | DV-02 |
| DV-06 (CI matrix) | DV-03, Phase 16 (for admiral CI) |
| DV-07 (engines validation) | DV-04 |

---

## Exit Criteria

- `npm install` succeeds on a clean clone in every package directory with zero warnings.
- `npm test` runs in both `control-plane/` and `admiral/` (admiral path becomes available after Phase 16 lands).
- Every `package.json` has an `engines` field matching `.nvmrc`.
- CI matrix validates installs on Linux and macOS.
- Zero pre-release pins remain (or every remaining pre-release pin has a documented rationale).
