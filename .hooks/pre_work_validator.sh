#!/bin/bash
# Admiral Framework — Pre-Work Validator (PreToolUse)
# Enforces SO-15: Pre-Work Validation
# Checks that essential context is loaded before substantive work begins.
# Fires on the first Write/Edit/Bash tool call — after that, tracks validation state.
# Advisory only — emits warnings but NEVER hard-blocks (always exit 0).
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

source "$PROJECT_DIR/admiral/lib/state.sh"

# Read payload from stdin
PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')

# Only validate before substantive (write) operations
case "$TOOL_NAME" in
  Write|Edit|NotebookEdit) ;;
  Bash)
    COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // ""')
    # Only check bash commands that modify state
    case "$COMMAND" in
      git\ commit*|git\ push*|npm\ *|yarn\ *|pip\ *) ;;
      *) exit 0 ;;
    esac
    ;;
  *) exit 0 ;;
esac

# Load session state
STATE=$(load_state 2>/dev/null) || STATE='{}'

# Check if pre-work validation has already passed this session
VALIDATED=$(echo "$STATE" | jq -r '.hook_state.pre_work_validator.validated // false')
if [ "$VALIDATED" = "true" ]; then
  exit 0
fi

ALERTS=""

# (a) Check Standing Orders loaded (clear end goal context)
SO_PRESENT=$(echo "$STATE" | jq -r '.context.standing_context_present // [] | length')
if [ "$SO_PRESENT" -eq 0 ]; then
  ALERTS+="PRE-WORK (SO-15): Standing context not detected. Ensure Standing Orders are loaded before beginning substantive work. "
fi

# (b) Check budget defined
TOKEN_BUDGET=$(echo "$STATE" | jq -r '.token_budget // 0')
TOOL_CALL_COUNT=$(echo "$STATE" | jq -r '.tool_call_count // 0')
# Only warn about budget if we're past the initial exploration phase (>5 tool calls)
if [ "$TOKEN_BUDGET" -le 0 ] && [ "$TOOL_CALL_COUNT" -gt 5 ]; then
  ALERTS+="PRE-WORK (SO-15): No token budget defined for this session. Consider setting a budget to enable resource tracking. "
fi

# (c) Check that read operations happened before write (context gathering)
if [ "$TOOL_CALL_COUNT" -lt 2 ]; then
  ALERTS+="PRE-WORK (SO-15): First substantive operation with fewer than 2 prior tool calls. SO-15 requires sufficient context before beginning work — consider reading relevant files first. "
fi

# If all checks pass, mark as validated so we don't re-check
if [ -z "$ALERTS" ]; then
  STATE=$(echo "$STATE" | jq '.hook_state.pre_work_validator = {"validated": true}')
  echo "$STATE" | save_state 2>/dev/null || true
  exit 0
fi

# Emit advisory
jq -n --arg ctx "$ALERTS" '{
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow",
    "additionalContext": $ctx
  }
}'

exit 0
