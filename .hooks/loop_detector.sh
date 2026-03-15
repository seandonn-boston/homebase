#!/bin/bash
# Admiral Framework — Loop Detector (PostToolUse)
# Tracks (agent_id, error_signature) tuples across invocations.
# Advisory only — NEVER hard-blocks (always exit 0).
# Emits warnings when loop patterns are detected.
# Successful tool calls decay error counts to prevent monotonic accumulation.
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

source "$PROJECT_DIR/admiral/lib/state.sh"

# Constants — advisory thresholds (warnings, not blocks)
MAX_SAME_ERROR=3
MAX_TOTAL_ERRORS=10
# Decay: each success reduces total_errors by 1 (floor 0)
SUCCESS_DECAY=1

# Read payload from stdin
PAYLOAD=$(cat)

# Extract tool response and check for errors
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')
TOOL_RESPONSE=$(echo "$PAYLOAD" | jq -r '.tool_response // empty' 2>/dev/null)

# Check if the tool response indicates an error
IS_ERROR=false
ERROR_TEXT=""
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

# Load loop detector state
LOOP_STATE=$(echo "$PAYLOAD" | jq '.session_state.hook_state.loop_detector // {"error_counts": {}, "total_errors": 0}')
TOTAL_ERRORS=$(echo "$LOOP_STATE" | jq -r '.total_errors // 0')
ALERT=""

if [ "$IS_ERROR" = "false" ]; then
  # Success — decay total error count toward zero
  if [ "$TOTAL_ERRORS" -gt 0 ]; then
    NEW_TOTAL=$((TOTAL_ERRORS - SUCCESS_DECAY))
    [ "$NEW_TOTAL" -lt 0 ] && NEW_TOTAL=0
    LOOP_STATE=$(echo "$LOOP_STATE" | jq --argjson total "$NEW_TOTAL" '.total_errors = $total')
  fi
  echo "{\"hook_state\": {\"loop_detector\": $LOOP_STATE}}"
  exit 0
fi

# Error detected — compute signature and track
AGENT_ID=$(echo "$PAYLOAD" | jq -r '.session_state.session_id // "unknown"')
ERROR_MSG="${ERROR_TEXT:-$(echo "$TOOL_RESPONSE" | jq -r 'tostring' 2>/dev/null | head -c 200)}"
SIG=$(compute_loop_sig "$AGENT_ID" "$ERROR_MSG")

CURRENT_COUNT=$(echo "$LOOP_STATE" | jq -r ".error_counts[\"$SIG\"] // 0")

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
  ALERT="LOOP WARNING: Error signature '${SIG}' repeated ${NEW_COUNT} times. Consider recovery ladder (SO-06). Try a different approach."
fi

if [ "$NEW_TOTAL" -ge "$MAX_TOTAL_ERRORS" ]; then
  ALERT="LOOP WARNING: ${NEW_TOTAL} total errors in session (threshold: ${MAX_TOTAL_ERRORS}). Consider pausing to reassess approach."
fi

# Output updated state with alert (if any)
if [ -n "$ALERT" ]; then
  echo "{\"hook_state\": {\"loop_detector\": $LOOP_STATE}, \"alert\": $(echo "$ALERT" | jq -Rs '.')}"
else
  echo "{\"hook_state\": {\"loop_detector\": $LOOP_STATE}}"
fi
exit 0
