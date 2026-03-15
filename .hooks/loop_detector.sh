#!/bin/bash
# Admiral Framework — Loop Detector (PostToolUse)
# Tracks (agent_id, error_signature) tuples across invocations.
# Triggers at: 3 same-error OR 10 total errors in session.
# Exit 0: no loop. Exit 2: loop detected (hard block).
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

source "$PROJECT_DIR/admiral/lib/state.sh"

# Constants
MAX_SAME_ERROR=3
MAX_TOTAL_ERRORS=10

# Read payload from stdin
PAYLOAD=$(cat)

# Extract tool response and check for errors
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')
TOOL_RESPONSE=$(echo "$PAYLOAD" | jq -r '.tool_response // empty' 2>/dev/null)

# Check if the tool response indicates an error
# Look for non-zero exit codes in Bash tool responses, or error patterns
IS_ERROR=false
if [ -n "$TOOL_RESPONSE" ]; then
  # Check for Bash exit code > 0
  BASH_EXIT=$(echo "$TOOL_RESPONSE" | jq -r '.exit_code // empty' 2>/dev/null)
  if [ -n "$BASH_EXIT" ] && [ "$BASH_EXIT" != "0" ]; then
    IS_ERROR=true
  fi
  # Check for error strings in output
  ERROR_TEXT=$(echo "$TOOL_RESPONSE" | jq -r '.stderr // .error // empty' 2>/dev/null)
  if [ -n "$ERROR_TEXT" ]; then
    IS_ERROR=true
  fi
fi

if [ "$IS_ERROR" = "false" ]; then
  # No error — output current state unchanged
  echo "$PAYLOAD" | jq '.session_state.hook_state.loop_detector // {"error_counts": {}, "total_errors": 0}'
  exit 0
fi

# Error detected — compute signature and track
AGENT_ID=$(echo "$PAYLOAD" | jq -r '.session_state.session_id // "unknown"')
ERROR_MSG="${ERROR_TEXT:-$(echo "$TOOL_RESPONSE" | jq -r 'tostring' 2>/dev/null | head -c 200)}"
SIG=$(compute_loop_sig "$AGENT_ID" "$ERROR_MSG")

# Load loop detector state
LOOP_STATE=$(echo "$PAYLOAD" | jq '.session_state.hook_state.loop_detector // {"error_counts": {}, "total_errors": 0}')
CURRENT_COUNT=$(echo "$LOOP_STATE" | jq -r ".error_counts[\"$SIG\"] // 0")
TOTAL_ERRORS=$(echo "$LOOP_STATE" | jq -r '.total_errors // 0')

# Increment counts
NEW_COUNT=$((CURRENT_COUNT + 1))
NEW_TOTAL=$((TOTAL_ERRORS + 1))

# Update state
LOOP_STATE=$(echo "$LOOP_STATE" | jq \
  --arg sig "$SIG" \
  --argjson count "$NEW_COUNT" \
  --argjson total "$NEW_TOTAL" \
  '.error_counts[$sig] = $count | .total_errors = $total')

# Check thresholds
if [ "$NEW_COUNT" -ge "$MAX_SAME_ERROR" ]; then
  echo "{\"hook_state\": {\"loop_detector\": $LOOP_STATE}}"
  echo "Loop detected: error signature '${SIG}' repeated ${NEW_COUNT} times. Move to recovery ladder (SO-06)." >&2
  exit 2
fi

if [ "$NEW_TOTAL" -ge "$MAX_TOTAL_ERRORS" ]; then
  echo "{\"hook_state\": {\"loop_detector\": $LOOP_STATE}}"
  echo "Loop detected: ${NEW_TOTAL} total errors in session (max: ${MAX_TOTAL_ERRORS}). Move to recovery ladder (SO-06)." >&2
  exit 2
fi

# No loop — output updated state
echo "{\"hook_state\": {\"loop_detector\": $LOOP_STATE}}"
exit 0
