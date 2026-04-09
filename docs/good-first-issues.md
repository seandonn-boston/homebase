# Good First Issues

Well-scoped, self-contained issues for new contributors. Each includes component, difficulty, and context.

## How to Contribute

1. Pick an issue below
2. Read `CONTRIBUTING.md` for workflow and standards
3. Run `make setup` to get your environment ready
4. Create a branch: `git checkout -b fix/issue-description`
5. Make changes, add tests, run `make ci`
6. Open a PR targeting `main`

---

## Easy (< 1 hour)

### 1. Add missing ShellCheck directives
**Component:** Hooks | **Files:** `.hooks/*.sh`

Some hooks have `shellcheck disable` comments that could be removed by fixing the underlying issue (e.g., unused variables, unquoted expansions). Pick a hook, remove one suppression, fix the code.

### 2. Improve a hook error message
**Component:** Hooks | **Files:** `.hooks/*.sh`, `admiral/lib/*.sh`

Pick an error message from `docs/audits/error-message-audit.md` (#3-#20) and implement the suggested improvement.

### 3. Add test for edge case in RingBuffer
**Component:** Control Plane | **Files:** `control-plane/src/ring-buffer.test.ts`

The RingBuffer has good coverage but could use tests for: push after clear, filter on empty buffer, eviction count after multiple clears.

### 4. Add jq helper function
**Component:** Admiral Lib | **Files:** `admiral/lib/jq_helpers.sh`

Add a `jq_keys` helper that extracts all keys from a JSON object, matching the pattern of existing helpers (`jq_get`, `jq_arr_len`, etc.).

### 5. Improve setup.sh platform detection
**Component:** DX | **Files:** `setup.sh`

Add WSL detection (check for `/proc/version` containing "microsoft") and display WSL-specific instructions.

---

## Medium (1-3 hours)

### 6. Add hook execution timing to post_tool_use_adapter
**Component:** Hooks | **Files:** `.hooks/post_tool_use_adapter.sh`

Record the elapsed time for each hook execution and emit it as structured log data. Useful for identifying slow hooks.

### 7. Add `admiral hook diff` command
**Component:** DX | **Files:** `admiral/bin/hook`

Add a `diff` subcommand that shows how a hook differs from the scaffold template — useful for understanding what custom logic was added.

### 8. Add fleet agent count to health endpoint
**Component:** Control Plane | **Files:** `control-plane/src/server.ts`

Extend `/health` to include the number of agents in the fleet registry.

### 9. Add JSON schema for preflight profiles
**Component:** DX | **Files:** `scripts/preflight.sh`

Define profiles as a JSON config file instead of hardcoded checks, making it easier to add new profiles.

### 10. Add test for TaskQueue priority edge cases
**Component:** Control Plane | **Files:** `control-plane/src/task-queue.test.ts`

Test: enqueue 100 tasks with random priorities, verify dequeue order is strictly correct.

### 11. Add changelog date range filter
**Component:** DX | **Files:** `scripts/changelog.sh`

Add `--since` and `--until` date flags to filter commits by date range.

### 12. Add brain entry expiration check
**Component:** Brain | **Files:** `admiral/lib/brain_query.sh`

Add `brain_query_expired` function that finds entries older than a configurable threshold.

---

## Harder (3+ hours)

### 13. Add ASCII dashboard to CLI
**Component:** Control Plane | **Files:** `control-plane/src/cli.ts`

Add a `--dashboard` flag that shows a live ASCII dashboard with event counts, alert status, and session state.

### 14. Add hook dependency graph
**Component:** DX | **Files:** `admiral/bin/hook`

Add a `deps` subcommand that analyzes `source` statements in hooks and produces a dependency graph.

### 15. Add scan rule linter
**Component:** Monitoring | **Files:** `monitor/`

Validate custom scan rules (JSON/YAML) against a schema, checking for required fields and valid check commands.

---

## Labels

When creating GitHub issues from this list:
- `good first issue` — all items
- `difficulty:easy` / `difficulty:medium` / `difficulty:hard`
- Component label: `hooks`, `control-plane`, `dx`, `brain`, `monitoring`
