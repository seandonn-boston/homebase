# Admiral Framework — Coding Style Guide (D-01)

Style rules for all code in the Helm repository. Concise, actionable, enforceable.

---

## 1. Naming Conventions

### Files and Directories

| Type | Convention | Example |
|------|-----------|---------|
| Bash hooks | `snake_case.sh`, matches `^[a-z][a-z0-9_]*\.sh$` | `session_start_adapter.sh` |
| Bash libraries | `snake_case.sh` in `admiral/lib/` | `jq_helpers.sh` |
| TypeScript source | `camelCase.ts` | `eventStream.ts` |
| TypeScript tests | `camelCase.test.ts` | `eventStream.test.ts` |
| JSON schemas | `kebab-case.v{N}.schema.json` in `admiral/schemas/` | `agent-definition.v1.schema.json` |
| Brain entries | `{YYYYMMDD-HHmmss}-{category}-{slug}.json` | `20260320-141500-config-init.json` |
| Directories | `kebab-case` or existing convention | `standing-orders/` |

### Bash Identifiers

- **Local variables:** `snake_case` with `local` keyword: `local hook_name="..."`
- **Environment/exported:** `UPPER_SNAKE_CASE`: `PROJECT_DIR`, `HOOK_TIMEOUT`
- **Functions:** `snake_case`, verb-first: `jq_get_field()`, `hook_fail_soft()`
- **Constants:** `readonly UPPER_SNAKE_CASE`

### TypeScript Identifiers

- **Variables/functions:** `camelCase`
- **Classes/types/interfaces:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE` for true constants, `camelCase` for derived values
- **Enums:** `PascalCase` name, `PascalCase` members

---

## 2. Bash Hook Standards

Every hook script must:

```bash
#!/bin/bash
set -euo pipefail
```

**Required sourcing** (in order):

```bash
source "$PROJECT_DIR/admiral/lib/jq_helpers.sh"
source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
```

**Structured JSON output rules:**
- stdout is reserved for hook output JSON consumed by the adapter pipeline
- stderr is for logging only (use `hook_log`)
- All output must be valid JSON parseable by `jq`
- Use `hook_pass`, `hook_fail_soft`, `hook_fail_hard`, or `hook_pass_with_context` for all exit paths

**Never:**
- `echo` raw strings to stdout (use jq to construct JSON)
- Use `exit 1` directly (use `hook_fail_soft` instead)
- Swallow errors silently without logging

---

## 3. Exit Code Taxonomy

| Code | Name | Meaning | When to Use |
|------|------|---------|-------------|
| `0` | Success / Soft-fail | Pass or advisory warning | Default. Hook approves or warns without blocking. |
| `1` | Fail-open | Hook itself errored | Hook crashed but must not block the agent (ADR-004). |
| `2` | Hard-block | Deny action | Standing Order violation that must be blocked. Use sparingly. |
| `3` | Config error | Misconfiguration | Missing config file, invalid schema, bad environment. |
| `4` | Dependency error | Missing dependency | `jq` not found, required file missing, service unavailable. |

**Rule:** When in doubt, exit 0. Hard-blocks (exit 2) require a Standing Order reference justifying the block.

---

## 4. Error Handling — Fail-Open Philosophy (ADR-004)

**Principle:** A broken hook must never block the agent. Enforcement failures degrade to advisory.

- **Fail-open (default):** Hook errors, missing data, parse failures -> `hook_fail_soft()` or `exit 0`
- **Fail-closed (exception):** Only for Standing Order violations where allowing the action would cause irreversible harm -> `hook_fail_hard()`

**Patterns from `hook_utils.sh`:**

```bash
# Advisory warning — logs + exits 0
hook_fail_soft "my_hook" "Suspicious pattern detected, but allowing"

# Hard block — logs + exits 2 (requires SO justification)
hook_fail_hard "my_hook" "SO-03 violation: spec file modification blocked"

# Clean pass
hook_pass

# Pass with context injected into agent prompt
hook_pass_with_context "Reminder: this file is in the frozen spec directory"
```

**Guard pattern for missing dependencies:**

```bash
if ! command -v jq &>/dev/null; then
  echo '{"level":"ERROR","component":"my_hook","message":"jq not found"}' >&2
  exit 0  # fail-open
fi
```

---

## 5. jq Patterns

- **Always source the shared library:** `source "$PROJECT_DIR/admiral/lib/jq_helpers.sh"`
- **Prefer helpers over inline jq:** Use `jq_get_field`, `jq_set_field`, `jq_array_append`, `jq_validate`
- **Always provide defaults:** `jq_get_field "$JSON" ".field" "fallback"`
- **Suppress jq stderr:** Inline jq calls must use `2>/dev/null`
- **Use `--argjson` for non-string values**, `--arg` for strings
- **Validate before processing:** `if jq_validate "$input"; then ...`

```bash
# Good — uses helper with fallback
local tool_name
tool_name=$(jq_get_field "$PAYLOAD" ".tool_name" "unknown")

# Bad — inline with no fallback, no error suppression
tool_name=$(echo "$PAYLOAD" | jq -r '.tool_name')
```

---

## 6. Comment Standards

### Hook Header Blocks (required)

Every hook and library file must start with:

```bash
#!/bin/bash
# Admiral Framework — <Name> (<Work Item ID>)
# <One-line description>
#
# Purpose: <Why this exists — 1-3 lines>
#
# SO reference: <Which Standing Order(s) this enforces/supports>
# Dependencies: <External tools, sourced libraries>
#
# Exit codes:
#   0 — <when>
#   2 — <when, if applicable>
```

### Inline Comments

- Explain **why**, not what: `# Fail-open: jq missing shouldn't block agent`
- No obvious comments: avoid `# increment counter` on `counter=$((counter + 1))`
- Mark workarounds: `# WORKAROUND: <issue-ref> — <explanation>`
- Mark TODOs: `# TODO(<work-item>): <description>`

---

## 7. Testing Requirements

| Scope | Requirement |
|-------|------------|
| Every bash hook | Corresponding test in `.hooks/tests/` or `admiral/tests/` |
| Every TS module | Corresponding `*.test.ts` file |
| Every bug fix | Regression test proving the fix |
| Coverage gate | 60% minimum (enforced in CI) |

**Bash tests:** Use the test harness in `.hooks/tests/test_hooks.sh`. Assert exit codes and JSON output shape.

**TypeScript tests:** Use `node:test` + `node:assert/strict`. No test frameworks.

```bash
# Run all tests
cd control-plane && npm run build && npm test
bash .hooks/tests/test_hooks.sh
bash admiral/tests/test_brain_b1.sh
```

---

## 8. TypeScript Conventions

- **Strict mode:** `"strict": true` in tsconfig — no exceptions
- **Zero runtime dependencies:** Node.js built-ins only
- **Named exports only:** No `export default`
- **No `as any`:** Use proper types or `unknown` with type guards
- **Error hierarchy:** Extend `AdmiralError` for domain errors
- **IDs:** Use `crypto.randomUUID()` — no external UUID libraries
- **Formatting:** Biome (`npm run lint`) — do not override rules
- **File naming:** `camelCase.ts` for source, `camelCase.test.ts` for tests
- **Test runner:** `node:test` with `node:assert/strict`

```typescript
// Good
export function calculateBudget(tokens: number): BudgetResult { ... }
export class BudgetExceededError extends AdmiralError { ... }
const traceId = crypto.randomUUID();

// Bad
export default function calculateBudget(tokens: any): any { ... }
const traceId = uuid.v4();  // external dependency
```

---

## 9. JSON Schema Conventions

- Schemas live in `admiral/schemas/` with versioned names: `<name>.v{N}.schema.json`
- Validate at boundaries: hook input, Brain entry write, API request/response
- Use `$schema: "https://json-schema.org/draft/2020-12/schema"`
- All fields must have `description` properties
- Use `additionalProperties: false` unless extension is intentional
- Schema changes require a version bump (new file, not in-place edit)

---

## 10. Standing Orders References

Every hook must document which Standing Order(s) it enforces:

- In the **file header:** `# SO reference: SO-03 (Spec Integrity)`
- In **hard-block messages:** `"SO-03 violation: spec file modification blocked"`
- In **test assertions:** Verify the SO reference appears in hook output

Standing Orders source: `admiral/standing-orders/`
Spec reference: `aiStrat/admiral/spec/part11-protocols.md`

If a hook does not enforce a specific SO, it must still document its relationship:
`# SO reference: Supports SO-12 (Zero-Trust) via input validation`

---

## Quick Reference

| Rule | Summary |
|------|---------|
| Default exit | `0` (fail-open) |
| Hard-block exit | `2` (requires SO justification) |
| JSON output | stdout only, via `hook_utils.sh` helpers |
| Logging | stderr only, via `hook_log` |
| jq usage | Prefer `jq_helpers.sh`, always fallback, always `2>/dev/null` |
| TS exports | Named only, no defaults |
| TS deps | Zero runtime dependencies |
| Tests | Required for every hook and module, 60% coverage gate |
| Comments | Header block required, inline = "why" not "what" |
| Schemas | Versioned, validated at boundaries |
