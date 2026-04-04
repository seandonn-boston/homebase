#!/bin/bash
# Admiral Framework — PostToolUse Hook Adapter
# Translates Claude Code PostToolUse payload to Admiral hook contracts.
# Fires in order: token_budget_tracker, loop_detector, context_health_check (every 10th), zero_trust_validator, compliance_ethics_advisor, brain_context_router, repeat_audit_logger
# DESIGN PRINCIPLE: All hooks are advisory-only (exit 0). No hook can block tool use.
# Hook failures are isolated — one failing hook cannot cascade into others.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Source shared libraries — fail-open if missing
if [ -f "$PROJECT_DIR/admiral/lib/state.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/state.sh"
else
  # Fail-open: if state library is missing, output continue and exit
  echo '{"continue": true}'
  exit 0
fi

# Source jq helpers -- fail-open if missing
if [ -f "$PROJECT_DIR/admiral/lib/jq_helpers.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/jq_helpers.sh"
fi

# Read Claude Code payload from stdin
PAYLOAD=$(cat)

# Extract fields
TOOL_NAME=$(jq_get "$PAYLOAD" '.tool_name' 'unknown')

# Ensure hook error log directory exists
mkdir -p "$PROJECT_DIR/.admiral"
HOOK_ERROR_LOG="$PROJECT_DIR/.admiral/hook_errors.log"

# Load session state — fail-open if state is corrupt
STATE=$(load_state 2>>"$HOOK_ERROR_LOG") || STATE='{}'
# Validate loaded state is parseable JSON
if ! jq_is_valid "$STATE"; then
  # State is corrupt — reset it and continue
  init_session_state "recovery-$(date +%s)"
  STATE=$(load_state 2>/dev/null) || STATE='{}'
fi

TOOL_CALL_COUNT=$(jq_get "$STATE" '.tool_call_count' '0')
TOOL_CALL_COUNT=$((TOOL_CALL_COUNT + 1))

# Update tool call count
STATE=$(jq_set "$STATE" '.tool_call_count' "$TOOL_CALL_COUNT")

# Collect hook output messages
MESSAGES=""

# --- Hook 1: token_budget_tracker (isolated) ---
if [ -x "$SCRIPT_DIR/token_budget_tracker.sh" ]; then
  TRACKER_OUTPUT=""
  TRACKER_OUTPUT=$(jq_merge "$PAYLOAD" 'session_state' "$STATE" | "$SCRIPT_DIR/token_budget_tracker.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$TRACKER_OUTPUT" ]; then
    NEW_TOKENS=$(jq_get "$TRACKER_OUTPUT" '.tokens_used') || true
    if [ -n "$NEW_TOKENS" ]; then
      STATE=$(jq_set "$STATE" '.tokens_used' "$NEW_TOKENS")
    fi
    ALERT=$(jq_get "$TRACKER_OUTPUT" '.alert') || true
    if [ -n "$ALERT" ]; then
      MESSAGES+="[Budget] $ALERT\n"
    fi
  fi
fi

# Update tokens_used for event logging
TOKENS_USED=$(jq_get "$STATE" '.tokens_used' '0')

# Extract agent identity for event logging
SESSION_ID=$(jq_get "$STATE" '.session_id' 'unknown')
AGENT_ID="${ADMIRAL_AGENT_ID:-claude-code}"
AGENT_NAME="${ADMIRAL_AGENT_NAME:-Claude Code Agent}"

# --- Hook 2: loop_detector (isolated, advisory only) ---
if [ -x "$SCRIPT_DIR/loop_detector.sh" ]; then
  LOOP_OUTPUT=""
  LOOP_OUTPUT=$(jq_merge "$PAYLOAD" 'session_state' "$STATE" | "$SCRIPT_DIR/loop_detector.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$LOOP_OUTPUT" ]; then
    # Update loop detector state if returned
    LOOP_STATE=$(jq_get "$LOOP_OUTPUT" '.hook_state.loop_detector') || true
    if [ -n "$LOOP_STATE" ] && [ "$LOOP_STATE" != "null" ]; then
      STATE=$(jq_set "$STATE" '.hook_state.loop_detector' "$LOOP_STATE")
    fi
    # Capture advisory alert from loop detector
    LOOP_ALERT=$(jq_get "$LOOP_OUTPUT" '.alert') || true
    if [ -n "$LOOP_ALERT" ]; then
      MESSAGES+="[Loop] $LOOP_ALERT\n"
    fi
  fi
fi

# --- Hook 3: context_health_check (every 10th tool call, isolated, advisory only) ---
if [ $((TOOL_CALL_COUNT % 10)) -eq 0 ] && [ -x "$SCRIPT_DIR/context_health_check.sh" ]; then
  HEALTH_OUTPUT=""
  HEALTH_OUTPUT=$(jq_merge "$PAYLOAD" 'session_state' "$STATE" | "$SCRIPT_DIR/context_health_check.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$HEALTH_OUTPUT" ]; then
    HEALTH_ALERT=$(jq_get "$HEALTH_OUTPUT" '.alert') || true
    if [ -n "$HEALTH_ALERT" ]; then
      MESSAGES+="[Context] $HEALTH_ALERT\n"
    fi
  fi
fi

# --- Hook 4: zero_trust_validator (SO-12, isolated, advisory only) ---
if [ -x "$SCRIPT_DIR/zero_trust_validator.sh" ]; then
  ZT_OUTPUT=""
  ZT_OUTPUT=$(jq_merge "$PAYLOAD" 'session_state' "$STATE" | "$SCRIPT_DIR/zero_trust_validator.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$ZT_OUTPUT" ]; then
    ZT_STATE=$(jq_get "$ZT_OUTPUT" '.hook_state.zero_trust') || true
    if [ -n "$ZT_STATE" ] && [ "$ZT_STATE" != "null" ]; then
      STATE=$(jq_set "$STATE" '.hook_state.zero_trust' "$ZT_STATE")
    fi
    ZT_ALERT=$(jq_get "$ZT_OUTPUT" '.alert') || true
    if [ -n "$ZT_ALERT" ]; then
      MESSAGES+="[Zero-Trust] $ZT_ALERT\n"
    fi
  fi
fi

# --- Hook 5: compliance_ethics_advisor (SO-14, isolated, advisory only) ---
if [ -x "$SCRIPT_DIR/compliance_ethics_advisor.sh" ]; then
  COMP_OUTPUT=""
  COMP_OUTPUT=$(jq_merge "$PAYLOAD" 'session_state' "$STATE" | "$SCRIPT_DIR/compliance_ethics_advisor.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$COMP_OUTPUT" ]; then
    COMP_STATE=$(jq_get "$COMP_OUTPUT" '.hook_state.compliance') || true
    if [ -n "$COMP_STATE" ] && [ "$COMP_STATE" != "null" ]; then
      STATE=$(jq_set "$STATE" '.hook_state.compliance' "$COMP_STATE")
    fi
    COMP_ALERT=$(jq_get "$COMP_OUTPUT" '.alert') || true
    if [ -n "$COMP_ALERT" ]; then
      MESSAGES+="[Compliance] $COMP_ALERT\n"
    fi
  fi
fi

# --- Hook 6: brain_context_router (isolated, advisory only) ---
if [ -x "$SCRIPT_DIR/brain_context_router.sh" ]; then
  BRAIN_OUTPUT=""
  BRAIN_OUTPUT=$(jq_merge "$PAYLOAD" 'session_state' "$STATE" | "$SCRIPT_DIR/brain_context_router.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$BRAIN_OUTPUT" ]; then
    BRAIN_STATE=$(jq_get "$BRAIN_OUTPUT" '.hook_state.brain_context_router') || true
    if [ -n "$BRAIN_STATE" ] && [ "$BRAIN_STATE" != "null" ]; then
      STATE=$(jq_set "$STATE" '.hook_state.brain_context_router' "$BRAIN_STATE")
    fi
    BRAIN_ALERT=$(jq_get "$BRAIN_OUTPUT" '.alert') || true
    if [ -n "$BRAIN_ALERT" ]; then
      MESSAGES+="[Context Routing] $BRAIN_ALERT\n"
    fi
  fi
fi

# --- Hook 7: repeat_audit_logger (iteration boundary detection, isolated, advisory only) ---
# Scans tool output for REPEAT iteration markers and logs to repeat_audit.jsonl.
# Tracks last known iteration in session state to avoid duplicate entries.
if [ -x "$SCRIPT_DIR/repeat_audit_logger.sh" ]; then
  TOOL_OUTPUT=$(jq_get "$PAYLOAD" '.tool_output') || TOOL_OUTPUT=""
  # Match "REPEAT iteration N" or "REPEAT ITERATION N" (from output contract)
  ITER_MATCH=$(echo "$TOOL_OUTPUT" | grep -oiE 'REPEAT (iteration|ITERATION) [0-9]+' | head -1) || true
  if [ -n "$ITER_MATCH" ]; then
    ITER_NUM=$(echo "$ITER_MATCH" | grep -oE '[0-9]+')
    LAST_ITER=$(jq_get "$STATE" '.hook_state.repeat_audit.last_iteration' '-1')
    # Only log if this is a new iteration (avoid duplicates from multi-line output)
    if [ "$ITER_NUM" != "$LAST_ITER" ]; then
      # Extract status from output contract pattern "STATUS: [Complete | Blocked | Terminated]"
      ITER_STATUS=$(echo "$TOOL_OUTPUT" | grep -oE 'STATUS: \w+' | head -1 | sed 's/STATUS: //') || ITER_STATUS="in_progress"
      # Extract task chain if present
      ITER_TASK=$(echo "$TOOL_OUTPUT" | grep -oE 'TASK EXECUTION:.*' | head -1 | sed 's/TASK EXECUTION: //') || ITER_TASK=""
      # Extract repeatFlag status
      ITER_RF=$(echo "$TOOL_OUTPUT" | grep -oE 'REPEATFLAG: .*' | head -1 | sed 's/REPEATFLAG: //') || ITER_RF=""
      # Extract endRepeat status
      ITER_ER=$(echo "$TOOL_OUTPUT" | grep -oE 'ENDREPEAT: .*' | head -1 | sed 's/ENDREPEAT: //') || ITER_ER=""
      # Extract exit strategy status
      ITER_ES=$(echo "$TOOL_OUTPUT" | grep -oE 'EXIT STRATEGY: .*' | head -1 | sed 's/EXIT STRATEGY: //') || ITER_ES=""
      # Fire the audit logger
      jq -n \
        --argjson iter "$ITER_NUM" \
        --arg status "${ITER_STATUS:-in_progress}" \
        --arg task "$ITER_TASK" \
        --arg rf "$ITER_RF" \
        --arg er "$ITER_ER" \
        --arg es "$ITER_ES" \
        '{iteration: $iter, status: $status, task: $task, repeatFlag: $rf, endRepeat: $er, exitStrategy: $es}' \
        | "$SCRIPT_DIR/repeat_audit_logger.sh" 2>>"$HOOK_ERROR_LOG" || true
      # Update state with last seen iteration
      STATE=$(jq_set "$STATE" '.hook_state.repeat_audit' "{\"last_iteration\": $ITER_NUM}")
      MESSAGES+="[Repeat Audit] Iteration $ITER_NUM logged\n"
    fi
  fi
fi

# Save updated state (fail-open: if save fails, continue anyway)
echo "$STATE" | save_state 2>>"$HOOK_ERROR_LOG" || true

# Log events to JSONL — enriched schema for control plane ingestion
EVENT_LOG="$PROJECT_DIR/.admiral/event_log.jsonl"
TRACE_ID=$(jq_get "$STATE" '.trace_id' 'unknown')
EVENT_TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Primary event: tool_called
jq -n --arg ts "$EVENT_TS" \
      --arg trace "$TRACE_ID" \
      --arg sid "$SESSION_ID" \
      --arg aid "$AGENT_ID" \
      --arg aname "$AGENT_NAME" \
      --arg tool "$TOOL_NAME" \
      --argjson count "$TOOL_CALL_COUNT" \
      --argjson tokens "$TOKENS_USED" \
      '{event: "tool_called", timestamp: $ts, trace_id: $trace, session_id: $sid, agent_id: $aid, agent_name: $aname, tool: $tool, tool_call_count: $count, tokens_used: $tokens}' \
      >> "$EVENT_LOG" 2>/dev/null || true

# Token spent event (if tokens changed)
if [ "$TOKENS_USED" -gt 0 ]; then
  ESTIMATED=$(estimate_tokens "$TOOL_NAME")
  jq -n --arg ts "$EVENT_TS" \
        --arg trace "$TRACE_ID" \
        --arg sid "$SESSION_ID" \
        --arg aid "$AGENT_ID" \
        --arg aname "$AGENT_NAME" \
        --argjson count "$ESTIMATED" \
        --argjson total "$TOKENS_USED" \
        '{event: "token_spent", timestamp: $ts, trace_id: $trace, session_id: $sid, agent_id: $aid, agent_name: $aname, token_count: $count, token_total: $total}' \
        >> "$EVENT_LOG" 2>/dev/null || true
fi

# Policy violation events (one per alert)
if [ -n "$MESSAGES" ]; then
  echo "$MESSAGES" | while IFS= read -r line; do
    [ -z "$line" ] && continue
    jq -n --arg ts "$EVENT_TS" \
          --arg trace "$TRACE_ID" \
          --arg sid "$SESSION_ID" \
          --arg aid "$AGENT_ID" \
          --arg aname "$AGENT_NAME" \
          --arg detail "$line" \
          '{event: "policy_violation", timestamp: $ts, trace_id: $trace, session_id: $sid, agent_id: $aid, agent_name: $aname, detail: $detail}' \
          >> "$EVENT_LOG" 2>/dev/null || true
  done
fi

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
