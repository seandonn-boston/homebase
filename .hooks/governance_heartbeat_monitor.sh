#!/bin/bash
# Admiral Framework — Governance Heartbeat Monitor (PostToolUse)
# Enforces S-03: Monitor governance agent health via heartbeat signals.
# Alerts on missing heartbeat after threshold; logs heartbeat history to state.
#
# DESIGN: Advisory only (exit 0 always). Monitors Sentinel, Arbiter, Compliance Monitor.
# INPUT: JSON on stdin with tool_name, tool_input, session_state
# OUTPUT: JSON with optional alert and updated hook_state.heartbeat_monitor
set -euo pipefail

# Read payload from stdin
PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')
TOOL_CALL_COUNT=$(echo "$PAYLOAD" | jq -r '.session_state.tool_call_count // 0')

# Load heartbeat monitor state
HB_STATE=$(echo "$PAYLOAD" | jq '.session_state.hook_state.heartbeat_monitor // {
  "governance_agents": {},
  "last_check": 0,
  "alerts_sent": 0
}')

# Heartbeat threshold: alert if no heartbeat in N tool calls
HEARTBEAT_THRESHOLD="${ADMIRAL_HEARTBEAT_THRESHOLD:-50}"
# Check interval: only evaluate every N tool calls
CHECK_INTERVAL=10

ALERT=""
LAST_CHECK=$(echo "$HB_STATE" | jq -r '.last_check // 0')
ALERTS_SENT=$(echo "$HB_STATE" | jq -r '.alerts_sent // 0')

# --- Detect heartbeat signals ---
# Governance agents emit heartbeats via Bash commands containing heartbeat markers
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // ""' | head -c 2000)

  # Detect governance heartbeat signals (agents write to .admiral/heartbeats/)
  if echo "$COMMAND" | grep -qiE 'heartbeat|governance_ping|sentinel_check|arbiter_check'; then
    # Extract agent ID from command context
    HEARTBEAT_AGENT=""
    if echo "$COMMAND" | grep -qi "sentinel"; then
      HEARTBEAT_AGENT="sentinel"
    elif echo "$COMMAND" | grep -qi "arbiter"; then
      HEARTBEAT_AGENT="arbiter"
    elif echo "$COMMAND" | grep -qi "compliance"; then
      HEARTBEAT_AGENT="compliance-monitor"
    fi

    if [ -n "$HEARTBEAT_AGENT" ]; then
      HB_STATE=$(echo "$HB_STATE" | jq --arg agent "$HEARTBEAT_AGENT" \
        --argjson tc "$TOOL_CALL_COUNT" \
        --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.governance_agents[$agent] = {"last_heartbeat": $tc, "last_heartbeat_ts": $ts}')
    fi
  fi
fi

# --- Check for heartbeat file-based signals ---
# Governance agents may also write heartbeat files
HEARTBEAT_DIR="${CLAUDE_PROJECT_DIR:-.}/.admiral/heartbeats"
if [ -d "$HEARTBEAT_DIR" ]; then
  for HB_FILE in "$HEARTBEAT_DIR"/*.json; do
    [ -f "$HB_FILE" ] || continue
    HB_AGENT=$(jq -r '.agent_id // ""' "$HB_FILE" 2>/dev/null) || continue
    if [ -n "$HB_AGENT" ]; then
      HB_STATE=$(echo "$HB_STATE" | jq --arg agent "$HB_AGENT" \
        --argjson tc "$TOOL_CALL_COUNT" \
        --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
        '.governance_agents[$agent] = {"last_heartbeat": $tc, "last_heartbeat_ts": $ts}')
    fi
  done
fi

# --- Evaluate heartbeat health (every CHECK_INTERVAL tool calls) ---
if [ $((TOOL_CALL_COUNT - LAST_CHECK)) -ge "$CHECK_INTERVAL" ]; then
  HB_STATE=$(echo "$HB_STATE" | jq --argjson tc "$TOOL_CALL_COUNT" '.last_check = $tc')

  # Check each known governance agent for stale heartbeat
  STALE_AGENTS=""
  while IFS= read -r AGENT_ID; do
    [ -z "$AGENT_ID" ] && continue
    LAST_HB=$(echo "$HB_STATE" | jq -r --arg a "$AGENT_ID" '.governance_agents[$a].last_heartbeat // 0')
    GAP=$((TOOL_CALL_COUNT - LAST_HB))
    if [ "$GAP" -gt "$HEARTBEAT_THRESHOLD" ]; then
      STALE_AGENTS="${STALE_AGENTS}${AGENT_ID} (${GAP} calls since last heartbeat), "
    fi
  done < <(echo "$HB_STATE" | jq -r '.governance_agents | keys[]' 2>/dev/null)

  if [ -n "$STALE_AGENTS" ]; then
    STALE_AGENTS="${STALE_AGENTS%, }"
    ALERT="HEARTBEAT WARNING: Governance agent(s) missing heartbeat: ${STALE_AGENTS}. Threshold: ${HEARTBEAT_THRESHOLD} tool calls. Governance oversight may be degraded."
    ALERTS_SENT=$((ALERTS_SENT + 1))
    HB_STATE=$(echo "$HB_STATE" | jq --argjson a "$ALERTS_SENT" '.alerts_sent = $a')
  fi
fi

# --- Build output ---
if [ -n "$ALERT" ]; then
  jq -n --arg alert "$ALERT" --argjson state "$HB_STATE" '{
    alert: $alert,
    hook_state: { heartbeat_monitor: $state }
  }'
else
  jq -n --argjson state "$HB_STATE" '{
    hook_state: { heartbeat_monitor: $state }
  }'
fi

exit 0
