#!/bin/bash
# Admiral Framework — Loop Detector (PostToolUse)
# Tracks (agent_id, error_signature) tuples across invocations.
# Advisory only — NEVER hard-blocks (always exit 0).
# Emits warnings when loop patterns are detected.
# Successful tool calls decay error counts to prevent monotonic accumulation.
#
# Error signature approach: Each unique error is hashed (SHA-256, first 16 chars)
# from agent_id + normalized error message. This enables tracking specific error
# patterns without storing full error text in state, and makes comparison O(1).
#
# Decay mechanism: On each successful tool call, total_errors is decremented by
# successDecay (default 1). This prevents transient errors from accumulating
# into false-positive loop warnings over long sessions.
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Source brain writer for automatic entry creation (B-01)
if [ -f "$PROJECT_DIR/admiral/lib/brain_writer.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/brain_writer.sh"
fi

source "$PROJECT_DIR/admiral/lib/state.sh"
if [ -f "$PROJECT_DIR/admiral/lib/jq_helpers.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/jq_helpers.sh"
fi

# Load thresholds from central config via hook_config.sh
MAX_SAME_ERROR=$(config_max_same_error)
MAX_TOTAL_ERRORS=$(config_max_total_errors)
SUCCESS_DECAY=$(config_success_decay)

# Read payload from stdin
PAYLOAD=$(cat)

# Extract tool response and check for errors
# shellcheck disable=SC2034  # TOOL_NAME reserved for future use in error signatures
TOOL_NAME=$(jq_get "$PAYLOAD" '.tool_name' 'unknown')
TOOL_RESPONSE=$(jq_get "$PAYLOAD" '.tool_response')

# Check if the tool response indicates an error
IS_ERROR=false
ERROR_TEXT=""
if [ -n "$TOOL_RESPONSE" ]; then
  # Check for Bash exit code > 0
  BASH_EXIT=$(jq_get "$TOOL_RESPONSE" '.exit_code')
  if [ -n "$BASH_EXIT" ] && [ "$BASH_EXIT" != "0" ]; then
    IS_ERROR=true
  fi
  # Check for error strings in output
  ERROR_TEXT=$(jq_get "$TOOL_RESPONSE" '.stderr // .error')
  if [ -n "$ERROR_TEXT" ]; then
    IS_ERROR=true
  fi
fi

# Load loop detector state
LOOP_STATE=$(echo "$PAYLOAD" | jq '.session_state.hook_state.loop_detector // {"error_counts": {}, "total_errors": 0}')
TOTAL_ERRORS=$(jq_get "$LOOP_STATE" '.total_errors' '0')
ALERT=""

if [ "$IS_ERROR" = "false" ]; then
  # Success — decay total error count toward zero
  if [ "$TOTAL_ERRORS" -gt 0 ]; then
    NEW_TOTAL=$((TOTAL_ERRORS - SUCCESS_DECAY))
    [ "$NEW_TOTAL" -lt 0 ] && NEW_TOTAL=0
    LOOP_STATE=$(jq_set "$LOOP_STATE" '.total_errors' "$NEW_TOTAL")
  fi
  echo "{\"hook_state\": {\"loop_detector\": $LOOP_STATE}}"
  exit 0
fi

# Error detected — compute signature and track
# Use session_id as the agent identifier — in multi-agent scenarios,
# each agent runs in its own session, so session_id is agent-scoped.
SESSION_ID=$(jq_get "$PAYLOAD" '.session_state.session_id' 'unknown')
ERROR_MSG="${ERROR_TEXT:-$(echo "$TOOL_RESPONSE" | jq -r 'tostring' 2>/dev/null | head -c 200)}"
SIG=$(compute_loop_sig "$SESSION_ID" "$ERROR_MSG")

CURRENT_COUNT=$(echo "$LOOP_STATE" | jq -r --arg sig "$SIG" '.error_counts[$sig] // 0')

# Increment counts
NEW_COUNT=$((CURRENT_COUNT + 1))
NEW_TOTAL=$((TOTAL_ERRORS + 1))

# Update state
LOOP_STATE=$(echo "$LOOP_STATE" | jq \
  --arg sig "$SIG" \
  --argjson count "$NEW_COUNT" \
  --argjson total "$NEW_TOTAL" \
  '.error_counts[$sig] = $count | .total_errors = $total')

# Check thresholds — emit advisory alerts, NEVER block
if [ "$NEW_COUNT" -ge "$MAX_SAME_ERROR" ]; then
  ALERT+="LOOP WARNING: Error signature '${SIG}' repeated ${NEW_COUNT} times. Consider recovery ladder (SO-06). Try a different approach. "
    # Record pattern to Brain (B-01)
    if type brain_record_pattern &>/dev/null; then
      brain_record_pattern "loop_detector" "error_loop" "Signature $SIG repeated $NEW_COUNT times"
    fi
fi

if [ "$NEW_TOTAL" -ge "$MAX_TOTAL_ERRORS" ]; then
  ALERT+="LOOP WARNING: ${NEW_TOTAL} total errors in session (threshold: ${MAX_TOTAL_ERRORS}). Consider pausing to reassess approach."
fi

# Output updated state with alert (if any)
if [ -n "$ALERT" ]; then
  echo "{\"hook_state\": {\"loop_detector\": $LOOP_STATE}, \"alert\": $(jq_to_json_string "$ALERT")}"
else
  echo "{\"hook_state\": {\"loop_detector\": $LOOP_STATE}}"
fi
exit 0
