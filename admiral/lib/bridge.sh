#!/bin/bash
# Admiral Framework — Hook/Control-Plane Bridge (A-02)
# Shared signal mechanism for bidirectional event flow.
#
# Hooks → Control Plane: event_log.jsonl (already exists)
# Control Plane → Hooks: signal_bus.jsonl (new)
#
# Usage: source this file, then call bridge functions

ADMIRAL_DIR="${ADMIRAL_DIR:-${CLAUDE_PROJECT_DIR:-.}/.admiral}"
EVENT_LOG="${ADMIRAL_DIR}/event_log.jsonl"
SIGNAL_BUS="${ADMIRAL_DIR}/signal_bus.jsonl"

# Emit a structured event to the event log (hooks → control plane)
emit_event() {
  local event_type="$1"
  local data="${2:-{}}"
  local trace_id="${3:-$(jq -r '.trace_id // "unknown"' "$ADMIRAL_DIR/session_state.json" 2>/dev/null || echo "unknown")}"

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  mkdir -p "$ADMIRAL_DIR"
  jq -n --arg event "$event_type" \
        --arg ts "$ts" \
        --arg trace "$trace_id" \
        --argjson data "$data" \
        '{event: $event, timestamp: $ts, trace_id: $trace, data: $data}' \
    >> "$EVENT_LOG" 2>/dev/null || true
}

# Read pending signals from the control plane (control plane → hooks)
# Returns JSON array of unprocessed signals, or empty array
read_signals() {
  local signal_type="${1:-}"

  if [ ! -f "$SIGNAL_BUS" ]; then
    echo "[]"
    return 0
  fi

  if [ -n "$signal_type" ]; then
    jq -s --arg type "$signal_type" '[.[] | select(.signal == $type)]' "$SIGNAL_BUS" 2>/dev/null || echo "[]"
  else
    jq -s '.' "$SIGNAL_BUS" 2>/dev/null || echo "[]"
  fi
}

# Check if a specific signal is active (e.g., "agent_paused")
has_signal() {
  local signal_type="$1"

  if [ ! -f "$SIGNAL_BUS" ]; then
    return 1
  fi

  local count
  count=$(jq -s --arg type "$signal_type" '[.[] | select(.signal == $type)] | length' "$SIGNAL_BUS" 2>/dev/null || echo "0")

  [ "$count" -gt 0 ]
}

# Write a signal to the bus (used by control plane or admin tools)
write_signal() {
  local signal_type="$1"
  local data="${2:-{}}"

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  mkdir -p "$ADMIRAL_DIR"
  jq -n --arg signal "$signal_type" \
        --arg ts "$ts" \
        --argjson data "$data" \
        '{signal: $signal, timestamp: $ts, data: $data}' \
    >> "$SIGNAL_BUS" 2>/dev/null || true
}

# Clear processed signals from the bus
clear_signals() {
  local signal_type="${1:-}"

  if [ ! -f "$SIGNAL_BUS" ]; then
    return 0
  fi

  if [ -n "$signal_type" ]; then
    # Remove only signals of the specified type
    local remaining
    remaining=$(jq -s --arg type "$signal_type" '[.[] | select(.signal != $type)]' "$SIGNAL_BUS" 2>/dev/null || echo "[]")
    if [ "$remaining" = "[]" ]; then
      rm -f "$SIGNAL_BUS"
    else
      echo "$remaining" | jq -c '.[]' > "${SIGNAL_BUS}.tmp" 2>/dev/null
      mv "${SIGNAL_BUS}.tmp" "$SIGNAL_BUS"
    fi
  else
    rm -f "$SIGNAL_BUS"
  fi
}
