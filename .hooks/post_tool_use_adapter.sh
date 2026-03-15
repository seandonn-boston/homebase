#!/bin/bash
# Admiral Framework — PostToolUse Hook Adapter
# Translates Claude Code PostToolUse payload to Admiral hook contracts.
# Fires in order: token_budget_tracker, loop_detector, context_health_check (every 10th)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Source shared libraries
source "$PROJECT_DIR/admiral/lib/state.sh"

# Read Claude Code payload from stdin
PAYLOAD=$(cat)

# Extract fields
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')

# Load and update session state
STATE=$(load_state)
TOOL_CALL_COUNT=$(echo "$STATE" | jq -r '.tool_call_count')
TOOL_CALL_COUNT=$((TOOL_CALL_COUNT + 1))

# Update tool call count
STATE=$(echo "$STATE" | jq --argjson c "$TOOL_CALL_COUNT" '.tool_call_count = $c')

# Collect hook output messages
MESSAGES=""

# --- Hook 1: token_budget_tracker ---
if [ -x "$SCRIPT_DIR/token_budget_tracker.sh" ]; then
  TRACKER_OUTPUT=""
  TRACKER_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/token_budget_tracker.sh" 2>/dev/null) || true
  if [ -n "$TRACKER_OUTPUT" ]; then
    # Parse updated tokens from tracker output
    NEW_TOKENS=$(echo "$TRACKER_OUTPUT" | jq -r '.tokens_used // empty' 2>/dev/null)
    if [ -n "$NEW_TOKENS" ]; then
      STATE=$(echo "$STATE" | jq --argjson t "$NEW_TOKENS" '.tokens_used = $t')
    fi
    ALERT=$(echo "$TRACKER_OUTPUT" | jq -r '.alert // empty' 2>/dev/null)
    if [ -n "$ALERT" ]; then
      MESSAGES+="[Budget] $ALERT\n"
    fi
  fi
fi

# Update utilization
TOKENS_USED=$(echo "$STATE" | jq -r '.tokens_used')
TOKEN_BUDGET=$(echo "$STATE" | jq -r '.token_budget')
if [ "$TOKEN_BUDGET" -gt 0 ]; then
  UTILIZATION=$(echo "$STATE" | jq --argjson u "$TOKENS_USED" --argjson b "$TOKEN_BUDGET" '.context.current_utilization = ($u / $b)')
  STATE="$UTILIZATION"
fi

# --- Hook 2: loop_detector ---
if [ -x "$SCRIPT_DIR/loop_detector.sh" ]; then
  LOOP_OUTPUT=""
  LOOP_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/loop_detector.sh" 2>/dev/null) || {
    LOOP_EXIT=$?
    if [ $LOOP_EXIT -eq 2 ]; then
      MESSAGES+="[Loop] Loop detected. Move to recovery ladder.\n"
    fi
  }
  if [ -n "$LOOP_OUTPUT" ]; then
    # Update loop detector state if returned
    LOOP_STATE=$(echo "$LOOP_OUTPUT" | jq '.hook_state.loop_detector // empty' 2>/dev/null)
    if [ -n "$LOOP_STATE" ] && [ "$LOOP_STATE" != "null" ]; then
      STATE=$(echo "$STATE" | jq --argjson ls "$LOOP_STATE" '.hook_state.loop_detector = $ls')
    fi
  fi
fi

# --- Hook 3: context_health_check (every 10th tool call) ---
if [ $((TOOL_CALL_COUNT % 10)) -eq 0 ] && [ -x "$SCRIPT_DIR/context_health_check.sh" ]; then
  HEALTH_OUTPUT=""
  HEALTH_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/context_health_check.sh" 2>/dev/null) || {
    HEALTH_EXIT=$?
    if [ $HEALTH_EXIT -ge 1 ]; then
      HEALTH_MSG=$(echo "$HEALTH_OUTPUT" | head -1 2>/dev/null || echo "Context health issue detected")
      MESSAGES+="[Context] $HEALTH_MSG\n"
    fi
  }
fi

# Save updated state
echo "$STATE" | save_state

# Log event
EVENT_LOG="$PROJECT_DIR/.admiral/event_log.jsonl"
TRACE_ID=$(echo "$STATE" | jq -r '.trace_id // "unknown"')
jq -n --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg trace "$TRACE_ID" \
      --arg tool "$TOOL_NAME" \
      --argjson count "$TOOL_CALL_COUNT" \
      --argjson tokens "$TOKENS_USED" \
      '{event: "post_tool_use", timestamp: $ts, trace_id: $trace, tool: $tool, tool_call_count: $count, tokens_used: $tokens}' \
      >> "$EVENT_LOG" 2>/dev/null || true

# Output system message if there are alerts
if [ -n "$MESSAGES" ]; then
  MSG_TEXT=$(echo -e "$MESSAGES")
  jq -n --arg msg "$MSG_TEXT" '{
    "continue": true,
    "suppressOutput": false,
    "systemMessage": $msg
  }'
else
  echo '{"continue": true}'
fi

exit 0
