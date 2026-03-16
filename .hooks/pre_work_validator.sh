#!/bin/bash
# Admiral Framework — Pre-Work Validator (PreToolUse)
# Enforces SO-15: Pre-Work Validation
# Checks that essential context is loaded before substantive work begins.
# Fires on the first Write/Edit/Bash tool call — after that, tracks validation state.
# Advisory only — emits warnings but NEVER hard-blocks (always exit 0).
# Expects session_state in payload (passed by pre_tool_use_adapter).
# Returns hook_state and advisory context via JSON output — never writes state directly.
# Timeout: 5s
set -euo pipefail

# Read payload from stdin (includes session_state from adapter)
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

# Read session state from payload (passed by adapter — no independent load_state)
STATE=$(echo "$PAYLOAD" | jq '.session_state // {}')

# Check if pre-work validation has already passed this session
VALIDATED=$(echo "$STATE" | jq -r '.hook_state.pre_work_validator.validated // false')
if [ "$VALIDATED" = "true" ]; then
  echo '{"hook_state": {"pre_work_validator": {"validated": true}}}'
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

# If all checks pass, signal validated state back to adapter
if [ -z "$ALERTS" ]; then
  echo '{"hook_state": {"pre_work_validator": {"validated": true}}}'
  exit 0
fi

# Return advisory context and current (unvalidated) state
jq -n --arg ctx "$ALERTS" '{
  "hook_state": {"pre_work_validator": {"validated": false}},
  "additionalContext": $ctx
}'

exit 0
