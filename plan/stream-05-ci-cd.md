# Stream 5: CI/CD & Infrastructure — From 7/10 to 10/10

> *"Multi-stage pipelines: lint -> build -> test -> coverage -> integration -> release" — Pattern across all pristine repos*

**Current score:** 7/10
**Target score:** 10/10

**Gap summary:** Build+test+lint+coverage+shellcheck+audit+spec-validation in place. Missing: coverage gates, matrix builds, security scanning, benchmarks, integration tests.

---

## 5.1 Quality Gates

- [ ] **C-01: Add coverage threshold gate**
  - **Description:** Parse coverage output in CI and fail below threshold. Start with a realistic threshold based on current coverage, then ratchet up over time as coverage improves. The threshold should be stored in a config file so it can be updated without modifying the workflow. Coverage regressions are the most common form of quality decay — this gate prevents them.
  - **Done when:** CI fails on coverage regression. Threshold is configurable and documented.
  - **Files:** `.github/workflows/control-plane-ci.yml`
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **C-08: Dependency license audit**
  - **Description:** Verify all dependencies are license-compatible in CI. Scan package.json dependencies and their transitive dependencies for license compatibility. Block on GPL or other copyleft licenses that are incompatible with the project license. Warn on unknown or missing licenses.
  - **Done when:** CI fails on incompatible licenses. License report generated on every build.
  - **Files:** `.github/workflows/control-plane-ci.yml`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **C-09: Reproducible build verification**
  - **Description:** Verify TypeScript builds are deterministic. Run the build twice in CI and compare output hashes. Non-deterministic builds indicate hidden state dependencies (timestamps, random values, file ordering) that can cause "works on my machine" failures.
  - **Done when:** Two consecutive builds produce identical output. CI verifies determinism.
  - **Files:** `.github/workflows/control-plane-ci.yml`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

---

## 5.2 Cross-Platform & Security

- [ ] **C-02: Add matrix CI builds**
  - **Description:** Run TypeScript tests on ubuntu + macOS. Run hook tests on both. Admiral hooks use bash utilities (flock, sha256sum, date) that behave differently across platforms. Matrix builds catch platform-specific bugs before they reach contributors on other OSes.
  - **Done when:** Matrix includes ubuntu + macOS, both pass. Platform-specific failures identified and fixed.
  - **Files:** `.github/workflows/control-plane-ci.yml`, `.github/workflows/hook-tests.yml`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **C-03: Add CodeQL security scanning**
  - **Description:** GitHub Actions workflow for TypeScript + bash security analysis. Run on PRs and weekly schedule. CodeQL detects injection vulnerabilities, data flow issues, and security anti-patterns. Blocks on high/critical findings.
  - **Done when:** `.github/workflows/codeql.yml` exists. Blocks on high/critical findings. Weekly scan scheduled.
  - **Files:** `.github/workflows/codeql.yml` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** Part 12 — Security
  - **Depends on:** —

---

## 5.3 Integration & Performance

- [ ] **C-04: Add integration test stage**
  - **Description:** Test hooks + control plane together end-to-end: start server, run hooks, verify events appear in the event stream, verify alerts fire correctly. This is the test that proves the two halves of the system work together, not just independently.
  - **Done when:** Integration job passes in CI. Tests cover server + hook + event flow.
  - **Files:** `.github/workflows/integration-tests.yml` (new), `admiral/tests/test_integration_e2e.sh` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** A-02

- [ ] **C-05: Add benchmark regression detection**
  - **Description:** Run benchmarks in CI and compare against stored baselines. Warn (don't block) on >10% regression. Post benchmark comparison as a PR comment so performance impact is visible during code review. Store baselines as CI artifacts.
  - **Done when:** CI comments on PRs for perf changes. Baselines stored and compared automatically.
  - **Files:** `.github/workflows/benchmarks.yml` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** T-11, T-12, T-13

- [ ] **C-14: End-to-end smoke test in CI**
  - **Description:** Add a smoke test that starts the control plane server, hits the health endpoint, verifies a 200 response, sends a test event, queries it back, and shuts down cleanly. This is the minimum viable integration test — if this passes, the system is fundamentally working. Runs on every PR. Fast (< 30 seconds).
  - **Done when:** Smoke test starts server, hits health endpoint, verifies 200, sends and retrieves an event, shuts down. Runs in < 30 seconds. Passes on every PR.
  - **Files:** `.github/workflows/control-plane-ci.yml` (modify — add smoke test job), `admiral/tests/test_smoke.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

---

## 5.4 Developer Experience & Automation

- [ ] **C-06: Enable git hooks in CI**
  - **Description:** Ensure CI uses project git hooks (pre-commit checks). Currently git hooks only run locally if developers configure them. CI should run the same checks to guarantee nothing bypasses local hooks. Document the local setup in CONTRIBUTING.md.
  - **Done when:** CI uses project hooks. CONTRIBUTING.md documents local setup.
  - **Files:** `.github/workflows/*.yml`, `CONTRIBUTING.md`
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **C-07: Automated changelog generation**
  - **Description:** Generate CHANGELOG.md from conventional commits automatically on merge to main. Use conventional-changelog or similar tool. This eliminates manual changelog maintenance and ensures every change is documented.
  - **Done when:** CHANGELOG auto-updates on merge to main. Follows Keep a Changelog format.
  - **Files:** `.github/workflows/changelog.yml` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **C-10: Automated release tagging workflow**
  - **Description:** Create a GitHub Actions workflow that automatically tags releases using semantic versioning derived from conventional commits. `feat:` commits bump minor, `fix:` commits bump patch, `BREAKING CHANGE:` bumps major. The workflow: (1) determines the next version from commit history since last tag, (2) creates a git tag, (3) generates a GitHub Release with auto-generated release notes, (4) updates package.json version. Runs only on merge to main. Requires no manual version management.
  - **Done when:** Merging to main auto-creates a semver tag and GitHub Release. Version derived from conventional commits. Release notes auto-generated.
  - **Files:** `.github/workflows/release.yml` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** C-07

- [ ] **C-11: PR size limits**
  - **Description:** Add a CI check that warns when a PR exceeds 500 lines changed (additions + deletions, excluding generated files and lock files). Large PRs are harder to review, more likely to contain bugs, and slower to merge. The check should post a comment suggesting the PR be split, but not block merge (soft warning). Configure exclusions for generated files, lock files, and test fixtures.
  - **Done when:** PRs > 500 lines receive a warning comment. Generated files excluded from count. Warning is informational (does not block merge).
  - **Files:** `.github/workflows/pr-size.yml` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **C-12: Stale branch cleanup automation**
  - **Description:** Add a scheduled workflow that identifies and optionally deletes branches that have been merged or have had no activity for 30+ days. Stale branches clutter the repository and make it harder to find active work. The workflow should: (1) list branches merged into main (safe to delete), (2) list branches with no commits in 30+ days (warn), (3) auto-delete merged branches, (4) create an issue listing stale unmerged branches for manual review.
  - **Done when:** Weekly workflow runs. Merged branches auto-deleted. Stale unmerged branches listed in an issue for review.
  - **Files:** `.github/workflows/stale-branches.yml` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **C-13: CI build caching optimization**
  - **Description:** Optimize CI build times by caching node_modules (keyed on package-lock.json hash), TypeScript incremental build artifacts (.tsbuildinfo), and ShellCheck binary. Current CI installs everything from scratch on every run. Caching can reduce CI time by 30-60%. Use GitHub Actions cache action with proper cache keys and restore keys.
  - **Done when:** CI caches node_modules, TypeScript incremental builds, and ShellCheck. Cache hit rate > 80% on typical PR workflows. CI time reduced measurably.
  - **Files:** `.github/workflows/control-plane-ci.yml` (modify), `.github/workflows/hook-tests.yml` (modify)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **C-15: Dependency update automation**
  - **Description:** Configure Dependabot or Renovate to automatically create PRs for dependency updates. Configure: (1) weekly schedule for minor/patch updates, (2) monthly schedule for major updates, (3) auto-merge for patch updates that pass CI, (4) group related updates into single PRs (e.g., all @types/* packages), (5) ignore known-problematic updates via ignore list. This ensures dependencies stay current without manual tracking.
  - **Done when:** Dependabot/Renovate configured. PRs auto-created for updates. Patch updates auto-merge when CI passes. Update groups configured.
  - **Files:** `.github/dependabot.yml` (new) or `renovate.json` (new)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —
