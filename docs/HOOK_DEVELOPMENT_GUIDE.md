# Admiral Framework — Hook Development Guide

> How to create, test, and integrate a new hook from scratch.

---

## Table of Contents

1. [Hook Anatomy](#hook-anatomy)
2. [Hook Lifecycle](#hook-lifecycle)
3. [Creating a New Hook](#creating-a-new-hook)
4. [Worked Example: File Size Guard](#worked-example-file-size-guard)
5. [Testing Your Hook](#testing-your-hook)
6. [Integration](#integration)
7. [Common Patterns](#common-patterns)

---

## Hook Anatomy

Every hook is a bash script in `.hooks/` that:
- Reads a JSON payload from stdin
- Performs checks or monitoring
- Outputs JSON to stdout
- Exits with a semantic exit code

### Required Header

```bash
#!/bin/bash
# Admiral Framework — <Hook Name> (<Spec Reference>)
# <One-line description of what this hook does>
# Exit codes: 0=pass/fail-open, 2=hard-block (if applicable)
# Timeout: <N>s
set -euo pipefail
```

### Standard Boilerplate

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Source shared libraries
source "$PROJECT_DIR/admiral/lib/state.sh"
if [ -f "$PROJECT_DIR/admiral/lib/hook_utils.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
fi
hook_init "your_hook_name"

# Read payload from stdin
PAYLOAD=$(cat)
```

### Exit Code Contract

| Code | Meaning | When to Use |
|------|---------|------------|
| 0 | Pass or advisory | Hook passed, or found an issue but is advisory-only |
| 1 | Error, fail-open | Hook itself failed (missing dependency, parse error) — tool proceeds |
| 2 | Hard-block | Security/critical violation — tool execution is denied |

**Rule:** Advisory hooks must NEVER exit 2. Only hooks enforcing security-critical Standing Orders may hard-block.

---

## Hook Lifecycle

Hooks fire at three lifecycle points:

### SessionStart

Fires once when a Claude Code session begins. Payload contains `session_id` and `model`.

**Use for:** Identity validation, configuration checks, context baseline, Ground Truth loading.

**Adapter:** `session_start_adapter.sh` orchestrates SessionStart hooks.

### PreToolUse

Fires before every tool call. Payload contains `tool_name` and `tool_input`.

**Use for:** Enforcement — blocking unauthorized operations before they happen.

**Adapter:** `pre_tool_use_adapter.sh` orchestrates PreToolUse hooks. If any hook exits 2, the tool call is denied.

### PostToolUse

Fires after every tool call. Payload contains `tool_name`, `tool_input`, and `tool_response`.

**Use for:** Monitoring — tracking metrics, detecting patterns, logging events.

**Adapter:** `post_tool_use_adapter.sh` orchestrates PostToolUse hooks. These hooks cannot block (already executed).

---

## Creating a New Hook

### Step 1: Decide the hook type

| Question | Answer → Type |
|----------|--------------|
| Should it prevent bad actions? | PreToolUse enforcement (may exit 2) |
| Should it monitor after the fact? | PostToolUse advisory (exit 0 only) |
| Should it run once at session start? | SessionStart |

### Step 2: Create the script

Create a new file in `.hooks/` following the naming convention: `snake_case.sh`.

### Step 3: Wire it into the adapter

Add your hook to the appropriate adapter:
- `pre_tool_use_adapter.sh` — for PreToolUse hooks
- `post_tool_use_adapter.sh` — for PostToolUse hooks
- `session_start_adapter.sh` — for SessionStart hooks

### Step 4: Add tests

Create test cases in `.hooks/tests/test_hooks.sh` or a dedicated test file.

### Step 5: Register in Claude Code settings

If the hook runs directly (not via an adapter), add it to `.claude/settings.local.json`.

---

## Worked Example: File Size Guard

Let's build a hook that warns when a Write tool creates a file larger than 1000 lines.

### Step 1: Create the hook

```bash
#!/bin/bash
# Admiral Framework — File Size Guard (Custom)
# Warns when Write creates files larger than 1000 lines.
# Exit codes: 0=pass/advisory (never blocks)
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

if [ -f "$PROJECT_DIR/admiral/lib/hook_utils.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
fi
hook_init "file_size_guard"

# Read payload from stdin
PAYLOAD=$(cat)

# Only check Write tool
TOOL_NAME=$(jq_get "$PAYLOAD" '.tool_name' 'unknown')
if [ "$TOOL_NAME" != "Write" ]; then
  hook_pass "Not a Write tool call"
  exit 0
fi

# Count lines in the content being written
CONTENT=$(jq_get "$PAYLOAD" '.tool_input.content' '')
if [ -z "$CONTENT" ]; then
  hook_pass "No content in Write payload"
  exit 0
fi

LINE_COUNT=$(echo "$CONTENT" | wc -l)
MAX_LINES=1000

if [ "$LINE_COUNT" -gt "$MAX_LINES" ]; then
  FILE_PATH=$(jq_get "$PAYLOAD" '.tool_input.file_path' 'unknown')
  hook_advisory "Large file: $FILE_PATH has $LINE_COUNT lines (threshold: $MAX_LINES)"
  exit 0
fi

hook_pass "File size within limits ($LINE_COUNT lines)"
exit 0
```

### Step 2: Make it executable

```bash
chmod +x .hooks/file_size_guard.sh
```

### Step 3: Test it manually

```bash
# Test with a small file (should pass)
echo '{"tool_name":"Write","tool_input":{"file_path":"test.txt","content":"hello\nworld"}}' \
  | .hooks/file_size_guard.sh
# Expected: exit 0, pass message

# Test with a non-Write tool (should skip)
echo '{"tool_name":"Read","tool_input":{"file_path":"test.txt"}}' \
  | .hooks/file_size_guard.sh
# Expected: exit 0, pass message
```

### Step 4: Add to the adapter

In `post_tool_use_adapter.sh`, add the hook to the advisory hooks list (the exact location depends on the adapter's hook array — look for the pattern used by other hooks).

### Step 5: Write tests

Add to `.hooks/tests/test_hooks.sh`:

```bash
# file_size_guard tests
test_hook_pass "file_size_guard" \
  '{"tool_name":"Write","tool_input":{"file_path":"small.txt","content":"hello"}}' \
  "Small file should pass"

test_hook_pass "file_size_guard" \
  '{"tool_name":"Read","tool_input":{"file_path":"test.txt"}}' \
  "Non-Write tool should pass"
```

For the large-file test, generate a payload with > 1000 lines of content.

---

## Testing Your Hook

### Manual testing

```bash
# Pipe a JSON payload to the hook
echo '{"tool_name":"Write","tool_input":{"file_path":"test.ts","content":"..."}}' \
  | .hooks/your_hook.sh

# Check exit code
echo $?

# Verify JSON output
echo '{"tool_name":"Write","tool_input":{}}' \
  | .hooks/your_hook.sh | jq .
```

### Automated testing

Add tests to `.hooks/tests/test_hooks.sh` covering:

1. **Happy path** — tool call that should pass
2. **Trigger path** — tool call that should trigger the hook's behavior
3. **Edge cases** — empty payloads, missing fields, unexpected tool names
4. **JSON validity** — output must always be valid JSON

### ShellCheck

```bash
shellcheck .hooks/your_hook.sh
```

Must pass with zero warnings at `-S warning` level.

### Idempotency

Run the hook twice with identical input — exit codes and normalized output (timestamps stripped) must match.

---

## Integration

### Adapter wiring

Hooks are called by adapters, not directly by Claude Code. To integrate:

1. **PreToolUse hooks:** Add to the hook list in `pre_tool_use_adapter.sh`
2. **PostToolUse hooks:** Add to the hook list in `post_tool_use_adapter.sh`
3. **SessionStart hooks:** Add to `session_start_adapter.sh`

### Claude Code settings

If your hook runs standalone (rare — most hooks go through adapters):

```json
{
  "hooks": {
    "PreToolUse": [
      { "command": ".hooks/your_hook.sh" }
    ]
  }
}
```

---

## Common Patterns

### Extracting payload fields

Use `jq_get` from `admiral/lib/jq_helpers.sh` — it provides default values and fail-open behavior:

```bash
TOOL_NAME=$(jq_get "$PAYLOAD" '.tool_name' 'unknown')
FILE_PATH=$(jq_get "$PAYLOAD" '.tool_input.file_path' '')
```

### Tool-specific checks

Skip irrelevant tool calls early:

```bash
case "$TOOL_NAME" in
  Write|Edit|NotebookEdit) ;; # continue
  *) hook_pass "Not a write tool"; exit 0 ;;
esac
```

### Reading session state

```bash
source "$PROJECT_DIR/admiral/lib/state.sh"
STATE=$(load_state)
AGENT_ID=$(echo "$STATE" | jq -r '.agent_id // "unknown"')
```

### Updating session state

```bash
STATE=$(load_state)
STATE=$(echo "$STATE" | jq '.hook_state.your_hook.counter += 1')
echo "$STATE" | save_state
```

### Structured output

Use `hook_utils.sh` functions:

```bash
hook_pass "Check passed"           # Exit 0, structured JSON
hook_advisory "Warning message"    # Exit 0, advisory JSON
hook_fail_soft "Error occurred"    # Exit 1, fail-open
hook_fail_hard "Security violation" # Exit 2, hard-block
```

### Heredoc-safe pattern matching

When checking Bash command content, strip heredoc bodies first to avoid false positives on documentation:

```bash
# Remove heredoc content before pattern matching
CLEAN_CMD=$(echo "$COMMAND" | sed '/<<.*EOF/,/^EOF$/d')
```

---

## Checklist

Before submitting a new hook:

- [ ] Header follows the standard template (shebang, description, exit codes, timeout)
- [ ] Uses `set -euo pipefail`
- [ ] Sources `hook_utils.sh` and calls `hook_init`
- [ ] Reads payload from stdin
- [ ] Uses `jq_get` with defaults (not raw `jq -r` without fallback)
- [ ] Outputs valid JSON on stdout
- [ ] Exit codes follow the taxonomy (0, 1, or 2 only)
- [ ] Advisory hooks never exit 2
- [ ] Passes ShellCheck at `-S warning` level
- [ ] Has happy path and trigger path tests
- [ ] Idempotent (same input produces same output)
- [ ] Added to the appropriate adapter
