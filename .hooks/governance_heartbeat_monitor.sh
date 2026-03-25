#!/bin/bash
# Admiral Framework — Governance Heartbeat Monitor (S-03)
# Monitors governance agent (Sentinel, Arbiter) health via heartbeat signals.
# Runs as a PostToolUse hook — checks heartbeat freshness on each invocation.
# Alerts on missing heartbeat after threshold. Logs heartbeat history to state.
# Advisory only (exit 0) — never blocks tool use.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Source shared libraries
source "$PROJECT_DIR/admiral/lib/state.sh"

# Read payload from stdin
PAYLOAD=$(cat)

# Configuration (from reference_constants.json defaults)
HEARTBEAT_INTERVAL_S="${ADMIRAL_HEARTBEAT_INTERVAL_S:-60}"
HEARTBEAT_MISSED_THRESHOLD="${ADMIRAL_HEARTBEAT_MISSED_THRESHOLD:-2}"
HEARTBEAT_STATE_KEY=".hook_state.governance_heartbeat"

# Current timestamp
NOW=$(date +%s 2>/dev/null || python3 -c "import time; print(int(time.time()))")

# Load heartbeat state
HEARTBEAT_STATE=$(get_state_field "$HEARTBEAT_STATE_KEY" 2>/dev/null || echo '{}')
if [ -z "$HEARTBEAT_STATE" ] || [ "$HEARTBEAT_STATE" = "null" ]; then
  HEARTBEAT_STATE='{}'
fi
HEARTBEAT_STATE=$(echo "$HEARTBEAT_STATE" | tr -d '\r')

# Governance agents to monitor
GOVERNANCE_AGENTS=("sentinel" "arbiter")

advisories=""
alerts_count=0

for agent in "${GOVERNANCE_AGENTS[@]}"; do
  # Get last heartbeat time for this agent
  last_heartbeat=$(echo "$HEARTBEAT_STATE" | jq -r ".${agent}_last_heartbeat // 0" 2>/dev/null | tr -d '\r')
  missed_count=$(echo "$HEARTBEAT_STATE" | jq -r ".${agent}_missed_count // 0" 2>/dev/null | tr -d '\r')

  # If no heartbeat recorded yet, initialize (first run)
  if [ "$last_heartbeat" = "0" ] || [ "$last_heartbeat" = "null" ]; then
    # First run — record current time as baseline, no alert
    HEARTBEAT_STATE=$(echo "$HEARTBEAT_STATE" | jq \
      --arg agent "${agent}_last_heartbeat" \
      --argjson ts "$NOW" \
      --arg missed "${agent}_missed_count" \
      '. + {($agent): $ts, ($missed): 0}')
    continue
  fi

  # Calculate time since last heartbeat
  elapsed=$((NOW - last_heartbeat))

  if [ "$elapsed" -gt "$HEARTBEAT_INTERVAL_S" ]; then
    # Missed heartbeat — increment counter
    missed_count=$((missed_count + 1))
    HEARTBEAT_STATE=$(echo "$HEARTBEAT_STATE" | jq \
      --arg key "${agent}_missed_count" \
      --argjson val "$missed_count" \
      '. + {($key): $val}')

    if [ "$missed_count" -ge "$HEARTBEAT_MISSED_THRESHOLD" ]; then
      # Alert threshold exceeded
      advisories="${advisories}HEARTBEAT ALERT: $agent has missed $missed_count heartbeats (last seen ${elapsed}s ago). "
      alerts_count=$((alerts_count + 1))
    fi
  else
    # Heartbeat is fresh — reset missed count
    if [ "$missed_count" -gt 0 ]; then
      HEARTBEAT_STATE=$(echo "$HEARTBEAT_STATE" | jq \
        --arg key "${agent}_missed_count" \
        '. + {($key): 0}')
    fi
  fi
done

# Record monitoring timestamp
HEARTBEAT_STATE=$(echo "$HEARTBEAT_STATE" | jq \
  --argjson ts "$NOW" \
  '. + {"last_check": $ts}')

# Save state
set_state_field "$HEARTBEAT_STATE_KEY" "$HEARTBEAT_STATE"

# Log heartbeat check event
EVENT_LOG="$PROJECT_DIR/.admiral/event_log.jsonl"
TRACE_ID=$(get_state_field '.trace_id' 2>/dev/null || echo "unknown")
TRACE_ID=$(echo "$TRACE_ID" | tr -d '\r"')
SESSION_ID=$(get_state_field '.session_id' 2>/dev/null || echo "unknown")
SESSION_ID=$(echo "$SESSION_ID" | tr -d '\r"')
jq -cn --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --arg trace "$TRACE_ID" \
      --arg sid "$SESSION_ID" \
      --argjson alerts "$alerts_count" \
      '{event: "heartbeat_check", timestamp: $ts, trace_id: $trace, session_id: $sid, alerts: $alerts}' \
      >> "$EVENT_LOG" 2>/dev/null || true

# Output
if [ -n "$advisories" ]; then
  jq -n --arg msg "$advisories" --argjson alerts "$alerts_count" '{
    "healthy": false,
    "alerts": $alerts,
    "advisory": $msg,
    "severity": "warning"
  }'
else
  jq -n '{
    "healthy": true,
    "alerts": 0,
    "severity": "info"
  }'
fi

exit 0
