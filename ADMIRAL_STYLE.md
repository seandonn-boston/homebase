# Admiral Style Guide (D-01)

Coding conventions for the Admiral Framework. All contributors should follow these patterns.

---

## Bash / Shell Scripts

### Naming

- Hook scripts: `snake_case.sh` (e.g., `zero_trust_validator.sh`)
- Library scripts: `snake_case.sh` in `admiral/lib/`
- Strategy tools: `snake_case.sh` in `admiral/strategy/`
- Test scripts: `test_*.sh` in `.hooks/tests/` or `admiral/tests/`

### Structure

Every hook script must start with:

```bash
#!/bin/bash
# Admiral Framework — <Description> (<Hook Type>)
# Enforces <Standing Order or spec reference>
# <One-line summary of what it does>
# Timeout: <N>s
set -euo pipefail
```

### Exit Codes

| Code | Meaning | Used By |
|------|---------|---------|
| 0 | Pass / advisory only | All fail-open hooks |
| 2 | Hard-block (deny) | `scope_boundary_guard`, `prohibitions_enforcer` |

Never use exit code 1 for hook decisions — reserve it for unexpected errors.

### jq Patterns

Use shared helpers from `admiral/lib/jq_helpers.sh`:

```bash
source "$PROJECT_DIR/admiral/lib/jq_helpers.sh"

# Instead of: echo "$PAYLOAD" | jq -r '.tool_name // "unknown"'
# Use:
TOOL_NAME=$(jq_tool_name "$PAYLOAD")
```

Available helpers: `jq_get_field`, `jq_set_field`, `jq_array_append`, `jq_validate`, `jq_tool_name`, `jq_file_path`, `jq_command`, `jq_project_dir`.

### Error Handling

Use shared helpers from `admiral/lib/hook_utils.sh`:

```bash
source "$PROJECT_DIR/admiral/lib/hook_utils.sh"

# Advisory (fail-open): hook_fail_soft "message"
# Blocking (fail-closed): hook_fail_hard "message"
# No alert: hook_pass
# Logging: hook_log "hook_name" "message"
```

### Hook Design Principles

1. **Fail-open by default** — hooks should never block unless explicitly designed to (scope guard, prohibitions)
2. **Isolated execution** — one hook failure must not cascade to others
3. **JSON on stdout only** — all non-JSON output goes to stderr or log files
4. **Idempotent** — hooks may be called multiple times with the same payload
5. **Under 5 seconds** — all hooks must complete within their timeout budget

### ShellCheck

All shell scripts must pass ShellCheck with no warnings. Common fixes:

- Use `"$var"` not `$var` (SC2086)
- Use `local` for function variables
- Mark intentionally unused variables with `_` prefix (SC2034)

---

## TypeScript (Control Plane)

### Naming

- Files: `kebab-case.ts` (e.g., `ring-buffer.ts`)
- Tests: `*.test.ts` alongside source files
- Classes: `PascalCase` (e.g., `EventStream`, `ExecutionTrace`)
- Interfaces: `PascalCase` (e.g., `AgentEvent`, `TraceNode`)
- Functions/methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE` for module-level, `camelCase` for local

### Structure

```typescript
/**
 * Admiral <Component Name>
 *
 * <One-line description of purpose>
 */

import type { ... } from "./dependency";

export interface Config { ... }
export class Component { ... }
```

### Testing

- Use `node:test` and `node:assert/strict` (no external test frameworks)
- Test file naming: `<module>.test.ts`
- Describe blocks mirror class/module names
- Each public method gets at least one test
- Edge cases: empty inputs, null/undefined, boundary values

### Error Handling

- Prefer explicit error types over generic `Error`
- Never swallow errors silently — log or rethrow
- Use `try/catch` at system boundaries, not deep in business logic

---

## YAML / JSON Configuration

- YAML for human-edited configs (templates, manifests)
- JSON for machine-generated/validated data (schemas, state)
- JSON schemas use `*.schema.json` naming
- All schemas go in the directory of the component they validate

---

## Git Conventions

### Commit Messages

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`

Scopes: task IDs (e.g., `SEC-13`, `Q-01`), component names (e.g., `hooks`, `control-plane`)

Examples:
- `feat(SEC-13): extend zero-trust injection scanning to all tool responses`
- `test(T-01): add EventStream eviction edge case tests`
- `docs(D-01): create ADMIRAL_STYLE.md`

### Branches

- Feature branches: `claude/<description>-<id>`
- Never push directly to `main`

---

## Directory Structure

```
.hooks/              # Hook scripts (executed by Claude Code)
.hooks/tests/        # Hook integration tests
admiral/lib/         # Shared bash libraries
admiral/strategy/    # Strategy Triangle tooling
admiral/tests/       # Admiral framework tests
admiral/config/      # Configuration and constants
control-plane/       # TypeScript control plane
docs/                # Documentation and proposals
plan/                # Project plan and roadmap
aiStrat/             # Frozen spec (read-only)
```

---

## Comments

- Every file starts with a header comment explaining purpose and spec reference
- Inline comments explain *why*, not *what*
- Do not add comments to self-evident code
- Use `# ---` section dividers in long scripts for visual grouping
