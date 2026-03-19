# Stream 26: Developer Experience — First-Class Contributor Journey

> *"The best documentation is a working example. The best onboarding is a single command. The best architecture is one that makes the wrong thing hard and the right thing obvious." — Kelsey Hightower (paraphrased)*

**Scope:** Everything needed to make contributing to Admiral a joy. Covers development environment setup, interactive guides, hot reload, hook scaffolding, local CI, error message quality, IDE configuration, debugging guides, example-driven documentation, changelog automation, and new contributor onboarding. This stream treats developer experience as a product — contributors are users of the development workflow, and that workflow deserves the same rigor as the runtime.

**Why this stream exists:** The Admiral Framework spans bash hooks, TypeScript control plane, JSON schemas, markdown specifications, and shell-based governance infrastructure. That breadth creates friction for new contributors. Every minute a contributor spends figuring out how to set up, test, debug, or validate their changes is a minute they are not improving the framework. This stream eliminates that friction systematically.

---

## 26.1 Environment Setup

- [ ] **DX-01: Dev container configuration**
  - **Description:** Create a VS Code dev container (`.devcontainer/`) with all dependencies pre-installed: Node.js (matching control plane requirements), jq, shellcheck, shfmt, biome, bash 5+, curl, and git. Include the recommended VS Code extensions (ShellCheck, Biome, Markdown All in One). The container should start with all dependencies available and no additional setup required. Include a `postCreateCommand` that runs `npm install` in the control plane directory. Test that the full test suite passes inside the container.
  - **Done when:** Opening the repo in VS Code offers the dev container. Container starts with all tools available. `make test` (or equivalent) passes inside the container without additional setup. Container build time is < 5 minutes.
  - **Files:** `.devcontainer/devcontainer.json` (new), `.devcontainer/Dockerfile` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** DX-02

- [ ] **DX-02: One-command setup**
  - **Description:** Create a `make setup` target (or `./setup.sh`) that installs all dependencies, validates the environment, and runs initial tests. The script should: (1) check for required system dependencies (bash 5+, jq, node, npm) and report missing ones with install instructions per platform (macOS/Linux), (2) install npm dependencies for the control plane, (3) set up git hooks (link `.githooks/` to `.git/hooks/`), (4) run the full test suite to verify the setup, (5) print a success message with next steps. The script must be idempotent — running it twice produces the same result. It must work on both macOS and Linux.
  - **Done when:** A fresh clone followed by `make setup` produces a fully working development environment. The script reports clear errors for missing dependencies with platform-specific install instructions. Running setup twice is safe. All tests pass after setup.
  - **Files:** `Makefile` (new or modify), `setup.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **DX-08: IDE configuration templates**
  - **Description:** Provide shared VS Code settings, launch configurations, and recommended extensions. Settings: tab size, format on save, file associations (`.sh` files use shellcheck, `.ts` files use biome). Launch configurations: debug control plane server, run specific test file, run hook tests. Recommended extensions: ShellCheck, Biome, Markdown lint, JSON schema validator. Store in `.vscode/` with a `.vscode/settings.json.template` (not committed as `settings.json` to avoid overwriting personal settings). Include a `make ide` target that copies templates into place if no local settings exist.
  - **Done when:** `.vscode/` directory contains launch configurations and extension recommendations. Settings template exists with documented customization points. `make ide` copies templates without overwriting existing local settings. Launch configurations work for debugging the control plane and running tests.
  - **Files:** `.vscode/extensions.json` (new), `.vscode/launch.json` (new), `.vscode/settings.json.template` (new), `Makefile` (modify — add ide target)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

---

## 26.2 Development Workflow

- [ ] **DX-04: Hot reload for control plane**
  - **Description:** Auto-restart the control plane server on file changes during development. Use `node --watch` (Node.js 18+) or a lightweight file watcher that monitors `control-plane/src/` for `.ts` file changes and automatically restarts the server. The restart should preserve the event log and state — only the server process restarts, not the data. Include a `make dev` target that starts the server in watch mode with appropriate environment variables for development (debug logging, relaxed rate limits). Log a clear message on each restart showing what file triggered it.
  - **Done when:** `make dev` starts the control plane with file watching. Editing a `.ts` file triggers automatic restart within 2 seconds. Event log and state survive restarts. The triggering file is logged on each restart.
  - **Files:** `Makefile` (modify — add dev target), `control-plane/src/dev.ts` (new — dev server wrapper, if needed)
  - **Size:** S (< 1 hour)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **DX-05: Hook development CLI**
  - **Description:** Create a command-line tool to scaffold, test, and validate new hooks. `admiral hook scaffold <name>` generates a new hook file from a template with the standard header (purpose, exit codes, Standing Order reference), the standard JSON input parsing boilerplate, error handling, and structured logging. `admiral hook test <name>` runs the hook with sample input and displays the output. `admiral hook validate <name>` checks the hook against conventions: ShellCheck passes, header comment present, exit codes documented, fail-open behavior implemented (per ADR-004). The scaffold template encodes all best practices so new hooks start correct by default.
  - **Done when:** `scaffold` generates a working hook from template that passes `validate`. `test` runs a hook with configurable sample input. `validate` checks ShellCheck, header, exit codes, and fail-open behavior. Generated hooks follow all existing conventions.
  - **Files:** `admiral/cli/hook-cli.sh` (new), `admiral/cli/templates/hook-template.sh` (new), `admiral/tests/test_hook_cli.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** ADR-004 (fail-open)
  - **Depends on:** —

- [ ] **DX-06: Local CI runner**
  - **Description:** Create a `make ci` target that runs the full CI pipeline locally before pushing. The local CI should run the same checks as GitHub Actions in the same order: (1) shellcheck on all `.sh` files, (2) biome check on all `.ts` files, (3) TypeScript compilation, (4) control plane unit tests, (5) hook tests, (6) quarantine tests, (7) documentation validation (if P-02 is implemented). Report results in a summary table showing pass/fail per check with timing. Fail fast on the first error by default, with a `--continue` flag to run all checks regardless of failures. Local CI should complete in < 2 minutes for a clean codebase.
  - **Done when:** `make ci` runs all CI checks locally. Output shows pass/fail per check with timing. Default behavior fails fast. `--continue` flag runs all checks. Total runtime < 2 minutes on a clean codebase.
  - **Files:** `Makefile` (modify — add ci target), `admiral/scripts/local_ci.sh` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **DX-11: Changelog automation**
  - **Description:** Auto-generate changelog entries from conventional commits. Parse commit messages following the conventional commits format (feat:, fix:, docs:, refactor:, test:, chore:) and group them into a changelog organized by category. Generate changelog for unreleased changes and for tagged releases. Include commit hash links and scope information. Support a `make changelog` target for preview and integrate into the release workflow. Breaking changes (commits with `BREAKING CHANGE:` footer or `!` after type) are highlighted prominently.
  - **Done when:** `make changelog` generates a changelog from conventional commits. Entries are grouped by type (Features, Bug Fixes, etc.). Breaking changes are highlighted. Changelog includes commit hash links. Release workflow generates changelog for tagged versions.
  - **Files:** `admiral/scripts/generate_changelog.sh` (new), `Makefile` (modify — add changelog target)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

---

## 26.3 Documentation and Guides

- [ ] **DX-03: Interactive development guide**
  - **Description:** Create a step-by-step walkthrough for common development tasks: (1) adding a new hook (from scaffold to CI), (2) adding a new control plane API endpoint, (3) adding a new Standing Order, (4) adding a new brain entry type, (5) modifying the quarantine pipeline, (6) adding a new attack corpus entry. Each walkthrough includes: prerequisites, step-by-step commands, expected output at each step, and verification commands to confirm the task was completed correctly. The guide should be usable by a developer who has never seen the codebase.
  - **Done when:** Walkthroughs exist for all 6 common tasks. Each walkthrough has been tested by following it from scratch. Steps include exact commands and expected output. A new contributor can complete each walkthrough without asking for help.
  - **Files:** `docs/dev-guide/README.md` (new), `docs/dev-guide/add-hook.md` (new), `docs/dev-guide/add-api-endpoint.md` (new), `docs/dev-guide/add-standing-order.md` (new), `docs/dev-guide/add-brain-entry.md` (new), `docs/dev-guide/modify-quarantine.md` (new), `docs/dev-guide/add-attack-scenario.md` (new)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** DX-02, DX-05

- [ ] **DX-07: Error message improvement audit**
  - **Description:** Review all error messages across hooks, control plane, and CLI tools for clarity and actionability. Every error message should answer three questions: (1) what went wrong, (2) why it matters, and (3) what to do about it. Audit categories: hooks (exit codes and stderr messages), control plane (API error responses and server startup errors), CLI tools (argument validation errors), and test output (assertion failure messages). Replace cryptic messages like "Error: invalid input" with actionable messages like "Error: Hook payload missing required field 'tool_name'. Expected JSON with fields: tool_name, tool_input. See docs/hooks.md for payload format." Track improvements with before/after examples.
  - **Done when:** All error messages in hooks, control plane, and CLI tools have been audited. Messages answer what/why/what-to-do. At least 20 messages have been improved with documented before/after. No error message says only "error" or "invalid input" without context.
  - **Files:** Multiple files across `.hooks/`, `control-plane/src/`, `admiral/cli/` (modify), `docs/error-message-audit.md` (new — tracking document)
  - **Size:** L (3+ hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **DX-09: Debugging guide**
  - **Description:** Document how to debug hooks (bash), control plane (TypeScript), and brain queries. For hooks: how to enable debug output (`set -x`), how to capture and inspect hook input/output, how to test a hook in isolation with crafted JSON input, common hook failure modes and their symptoms. For control plane: how to attach a debugger (VS Code launch config), how to enable verbose logging, how to inspect event streams and traces, how to profile memory and CPU. For brain queries: how to test queries directly against the MCP server, how to inspect query results and relevance scores, how to debug missing or irrelevant results. Include troubleshooting decision trees for common symptoms.
  - **Done when:** Debugging guide covers all three component types. Each section includes concrete commands and examples. Troubleshooting decision trees exist for at least 5 common symptoms (hook not firing, hook blocking unexpectedly, server crash, slow queries, missing events). Guide has been validated by using it to debug a real issue.
  - **Files:** `docs/debugging-guide.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

- [ ] **DX-10: Example-driven documentation**
  - **Description:** Create working code examples for every API endpoint and tool. Each example includes: the exact HTTP request (curl command), expected response (with realistic sample data), error responses (what happens with invalid input), and a brief explanation of when and why to use this endpoint. Examples are executable — a developer can copy-paste the curl command and get the documented response from a running control plane. Include examples for: event stream API, trace API, health endpoint, agent status, brain query (when available), and all hook input/output formats. Store examples alongside the API they document, not in a separate examples directory.
  - **Done when:** Every public API endpoint has at least one working example. Examples are copy-paste executable against a running control plane. Error cases are documented with examples. Examples are tested in CI (a smoke test that starts the server and runs example curl commands).
  - **Files:** `docs/api-examples/` (new directory), `docs/api-examples/events.md` (new), `docs/api-examples/traces.md` (new), `docs/api-examples/health.md` (new), `docs/api-examples/agents.md` (new), `docs/api-examples/hooks.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** —

---

## 26.4 Contributor Onboarding

- [ ] **DX-12: Good first issues catalog**
  - **Description:** Tag and maintain a list of approachable issues for new contributors. Identify at least 15 issues across the codebase that meet the "good first issue" criteria: (1) well-scoped (completable in a single PR), (2) self-contained (does not require understanding the full architecture), (3) has clear acceptance criteria, (4) touches only one component (hooks OR control plane OR docs, not multiple), (5) has a suggested approach or starting point. Categorize issues by component and difficulty (beginner, intermediate). Include a contributing guide that explains how to pick an issue, set up the development environment, make changes, run tests, and submit a PR.
  - **Done when:** At least 15 issues are cataloged with good-first-issue labels. Each issue has acceptance criteria and a suggested starting point. Contributing guide explains the end-to-end contribution workflow. Issues span at least 3 different components. Catalog is maintained as part of the release process.
  - **Files:** `CONTRIBUTING.md` (new or modify), `docs/good-first-issues.md` (new)
  - **Size:** M (1-3 hours)
  - **Spec ref:** —
  - **Depends on:** DX-02, DX-06

---

## 26.5 Pre-Flight Verification

- [ ] **DX-13: Pre-Flight Checklist tooling**
  - **Description:** Implement automated verification against profile-specific requirements (Starter/Team/Governed/Production/Enterprise). 54 verification items across 5 profiles. The checklist evaluates: project readiness (5 gates), profile-specific requirements, and negative items (what Starter explicitly does NOT need). Outputs structured pass/fail report with remediation suggestions.
  - **Files:** `admiral/bin/preflight.sh`, `admiral/config/preflight-profiles.json`
  - **Size:** L (3+ hours)
  - **Spec ref:** Appendices — Pre-Flight Checklist (Appendix A)

---

## Stream 26 Summary

| Subsection | Items | Total Size |
|---|---|---|
| 26.1 Environment Setup | DX-01, DX-02, DX-08 | 2M + 1S |
| 26.2 Development Workflow | DX-04, DX-05, DX-06, DX-11 | 1S + 3M |
| 26.3 Documentation and Guides | DX-03, DX-07, DX-09, DX-10 | 2L + 2M |
| 26.4 Contributor Onboarding | DX-12 | 1M |
| 26.5 Pre-Flight Verification | DX-13 | 1L |
| **Totals** | **13 items** | **3L + 8M + 2S** |

**Critical path:** DX-02 (one-command setup) is the foundation — everything else assumes a working development environment. DX-01 (dev container) depends on DX-02 (it wraps the setup script). DX-03 (interactive guide) depends on DX-02 and DX-05 (hook CLI). DX-12 (good first issues) depends on DX-02 and DX-06 (local CI).

**Recommended execution order:**
1. **Foundation:** DX-02 (one-command setup), DX-04 (hot reload), DX-08 (IDE config) — immediate productivity gains, no dependencies.
2. **Tooling:** DX-05 (hook CLI), DX-06 (local CI), DX-11 (changelog) — developer workflow improvements.
3. **Documentation:** DX-03 (interactive guide), DX-09 (debugging guide), DX-10 (API examples) — knowledge capture.
4. **Polish:** DX-01 (dev container), DX-07 (error message audit), DX-12 (good first issues) — refinement and onboarding.
