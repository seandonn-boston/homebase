#!/bin/bash
# Admiral Framework — PostToolUse Hook Adapter
# Translates Claude Code PostToolUse payload to Admiral hook contracts.
# Fires in order: token_budget_tracker, loop_detector, context_health_check (every 10th), zero_trust_validator, compliance_ethics_advisor, brain_context_router
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

# Read Claude Code payload from stdin
PAYLOAD=$(cat)

# Extract fields
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')

# Ensure hook error log directory exists
mkdir -p "$PROJECT_DIR/.admiral"
HOOK_ERROR_LOG="$PROJECT_DIR/.admiral/hook_errors.log"

# Load session state — fail-open if state is corrupt
STATE=$(load_state 2>>"$HOOK_ERROR_LOG") || STATE='{}'
# Validate loaded state is parseable JSON
if ! echo "$STATE" | jq empty 2>/dev/null; then
  # State is corrupt — reset it and continue
  init_session_state "recovery-$(date +%s)"
  STATE=$(load_state 2>/dev/null) || STATE='{}'
fi

TOOL_CALL_COUNT=$(echo "$STATE" | jq -r '.tool_call_count // 0')
TOOL_CALL_COUNT=$((TOOL_CALL_COUNT + 1))

# Update tool call count
STATE=$(echo "$STATE" | jq --argjson c "$TOOL_CALL_COUNT" '.tool_call_count = $c')

# Collect hook output messages
MESSAGES=""

# --- Hook 1: token_budget_tracker (isolated) ---
if [ -x "$SCRIPT_DIR/token_budget_tracker.sh" ]; then
  TRACKER_OUTPUT=""
  TRACKER_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/token_budget_tracker.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$TRACKER_OUTPUT" ]; then
    NEW_TOKENS=$(echo "$TRACKER_OUTPUT" | jq -r '.tokens_used // empty' 2>/dev/null) || true
    if [ -n "$NEW_TOKENS" ]; then
      STATE=$(echo "$STATE" | jq --argjson t "$NEW_TOKENS" '.tokens_used = $t')
    fi
    ALERT=$(echo "$TRACKER_OUTPUT" | jq -r '.alert // empty' 2>/dev/null) || true
    if [ -n "$ALERT" ]; then
      MESSAGES+="[Budget] $ALERT\n"
    fi
  fi
fi

# Update tokens_used for event logging
TOKENS_USED=$(echo "$STATE" | jq -r '.tokens_used // 0')

# Extract agent identity for event logging
SESSION_ID=$(echo "$STATE" | jq -r '.session_id // "unknown"')
AGENT_ID="${ADMIRAL_AGENT_ID:-claude-code}"
AGENT_NAME="${ADMIRAL_AGENT_NAME:-Claude Code Agent}"

# --- Hook 2: loop_detector (isolated, advisory only) ---
if [ -x "$SCRIPT_DIR/loop_detector.sh" ]; then
  LOOP_OUTPUT=""
  LOOP_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/loop_detector.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$LOOP_OUTPUT" ]; then
    # Update loop detector state if returned
    LOOP_STATE=$(echo "$LOOP_OUTPUT" | jq '.hook_state.loop_detector // empty' 2>/dev/null) || true
    if [ -n "$LOOP_STATE" ] && [ "$LOOP_STATE" != "null" ]; then
      STATE=$(echo "$STATE" | jq --argjson ls "$LOOP_STATE" '.hook_state.loop_detector = $ls')
    fi
    # Capture advisory alert from loop detector
    LOOP_ALERT=$(echo "$LOOP_OUTPUT" | jq -r '.alert // empty' 2>/dev/null) || true
    if [ -n "$LOOP_ALERT" ]; then
      MESSAGES+="[Loop] $LOOP_ALERT\n"
    fi
  fi
fi

# --- Hook 3: context_health_check (every 10th tool call, isolated, advisory only) ---
if [ $((TOOL_CALL_COUNT % 10)) -eq 0 ] && [ -x "$SCRIPT_DIR/context_health_check.sh" ]; then
  HEALTH_OUTPUT=""
  HEALTH_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/context_health_check.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$HEALTH_OUTPUT" ]; then
    HEALTH_ALERT=$(echo "$HEALTH_OUTPUT" | jq -r '.alert // empty' 2>/dev/null) || true
    if [ -n "$HEALTH_ALERT" ]; then
      MESSAGES+="[Context] $HEALTH_ALERT\n"
    fi
  fi
fi

# --- Hook 4: zero_trust_validator (SO-12, isolated, advisory only) ---
if [ -x "$SCRIPT_DIR/zero_trust_validator.sh" ]; then
  ZT_OUTPUT=""
  ZT_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/zero_trust_validator.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$ZT_OUTPUT" ]; then
    ZT_STATE=$(echo "$ZT_OUTPUT" | jq '.hook_state.zero_trust // empty' 2>/dev/null) || true
    if [ -n "$ZT_STATE" ] && [ "$ZT_STATE" != "null" ]; then
      STATE=$(echo "$STATE" | jq --argjson zs "$ZT_STATE" '.hook_state.zero_trust = $zs')
    fi
    ZT_ALERT=$(echo "$ZT_OUTPUT" | jq -r '.alert // empty' 2>/dev/null) || true
    if [ -n "$ZT_ALERT" ]; then
      MESSAGES+="[Zero-Trust] $ZT_ALERT\n"
    fi
  fi
fi

# --- Hook 5: compliance_ethics_advisor (SO-14, isolated, advisory only) ---
if [ -x "$SCRIPT_DIR/compliance_ethics_advisor.sh" ]; then
  COMP_OUTPUT=""
  COMP_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/compliance_ethics_advisor.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$COMP_OUTPUT" ]; then
    COMP_STATE=$(echo "$COMP_OUTPUT" | jq '.hook_state.compliance // empty' 2>/dev/null) || true
    if [ -n "$COMP_STATE" ] && [ "$COMP_STATE" != "null" ]; then
      STATE=$(echo "$STATE" | jq --argjson cs "$COMP_STATE" '.hook_state.compliance = $cs')
    fi
    COMP_ALERT=$(echo "$COMP_OUTPUT" | jq -r '.alert // empty' 2>/dev/null) || true
    if [ -n "$COMP_ALERT" ]; then
      MESSAGES+="[Compliance] $COMP_ALERT\n"
    fi
  fi
fi

# --- Hook 6: governance_heartbeat_monitor (S-03, isolated, advisory only) ---
if [ -f "$SCRIPT_DIR/governance_heartbeat_monitor.sh" ]; then
  GHM_OUTPUT=""
  GHM_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | bash "$SCRIPT_DIR/governance_heartbeat_monitor.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$GHM_OUTPUT" ]; then
    GHM_STATE=$(echo "$GHM_OUTPUT" | jq '.hook_state.heartbeat_monitor // empty' 2>/dev/null) || true
    if [ -n "$GHM_STATE" ] && [ "$GHM_STATE" != "null" ]; then
      STATE=$(echo "$STATE" | jq --argjson hs "$GHM_STATE" '.hook_state.heartbeat_monitor = $hs')
    fi
    GHM_ALERT=$(echo "$GHM_OUTPUT" | jq -r '.alert // empty' 2>/dev/null) || true
    if [ -n "$GHM_ALERT" ]; then
      MESSAGES+="[Heartbeat] $GHM_ALERT\n"
    fi
  fi
fi

# --- Hook 7: brain_context_router (isolated, advisory only) ---
if [ -x "$SCRIPT_DIR/brain_context_router.sh" ]; then
  BRAIN_OUTPUT=""
  BRAIN_OUTPUT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/brain_context_router.sh" 2>>"$HOOK_ERROR_LOG") || true
  if [ -n "$BRAIN_OUTPUT" ]; then
    BRAIN_STATE=$(echo "$BRAIN_OUTPUT" | jq '.hook_state.brain_context_router // empty' 2>/dev/null) || true
    if [ -n "$BRAIN_STATE" ] && [ "$BRAIN_STATE" != "null" ]; then
      STATE=$(echo "$STATE" | jq --argjson bs "$BRAIN_STATE" '.hook_state.brain_context_router = $bs')
    fi
    BRAIN_ALERT=$(echo "$BRAIN_OUTPUT" | jq -r '.alert // empty' 2>/dev/null) || true
    if [ -n "$BRAIN_ALERT" ]; then
      MESSAGES+="[Context Routing] $BRAIN_ALERT\n"
    fi
  fi
fi

# Save updated state (fail-open: if save fails, continue anyway)
echo "$STATE" | save_state 2>>"$HOOK_ERROR_LOG" || true

# Log events to JSONL — enriched schema for control plane ingestion
EVENT_LOG="$PROJECT_DIR/.admiral/event_log.jsonl"
TRACE_ID=$(echo "$STATE" | jq -r '.trace_id // "unknown"')
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
