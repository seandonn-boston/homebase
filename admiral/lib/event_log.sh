#!/bin/bash
# Admiral Framework — Unified Event Log (A-07)
# Single JSONL log for hooks and control plane.
# All events share a common schema for coherent timeline.
#
# Event format:
#   {"event": "<type>", "timestamp": "<ISO8601>", "trace_id": "<id>",
#    "source": "hook|control_plane|admin", "component": "<name>", "data": {...}}

ADMIRAL_DIR="${ADMIRAL_DIR:-${CLAUDE_PROJECT_DIR:-.}/.admiral}"
UNIFIED_LOG="${ADMIRAL_DIR}/event_log.jsonl"

# Emit a unified event with source and component metadata
emit_unified_event() {
  local event_type="$1"
  local source="$2"       # hook, control_plane, admin
  local component="$3"    # e.g., pre_tool_use_adapter, runaway_detector
  local data="${4:-{}}"
  local trace_id="${5:-}"

  if [ -z "$trace_id" ]; then
    trace_id=$(jq -r '.trace_id // "unknown"' "$ADMIRAL_DIR/session_state.json" 2>/dev/null || echo "unknown")
  fi

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  mkdir -p "$ADMIRAL_DIR"
  jq -n --arg event "$event_type" \
        --arg ts "$ts" \
        --arg trace "$trace_id" \
        --arg source "$source" \
        --arg component "$component" \
        --argjson data "$data" \
        '{event: $event, timestamp: $ts, trace_id: $trace, source: $source, component: $component, data: $data}' \
    >> "$UNIFIED_LOG" 2>/dev/null || true
}

# Query the unified log for events matching criteria
query_events() {
  local filter="${1:-.}"  # jq filter expression

  if [ ! -f "$UNIFIED_LOG" ]; then
    echo "[]"
    return 0
  fi

  jq -s "$filter" "$UNIFIED_LOG" 2>/dev/null || echo "[]"
}

# Get events since a timestamp
events_since() {
  local since="$1"
  query_events "[.[] | select(.timestamp >= \"$since\")]"
}

# Get events by source
events_by_source() {
  local source="$1"
  query_events "[.[] | select(.source == \"$source\")]"
}

# Get event count
event_count() {
  if [ ! -f "$UNIFIED_LOG" ]; then
    echo "0"
    return 0
  fi
  wc -l < "$UNIFIED_LOG" | tr -d ' '
}

# Rotate the event log when it exceeds max size (default 10MB)
rotate_log() {
  local max_size="${1:-10485760}"  # 10MB default

  if [ ! -f "$UNIFIED_LOG" ]; then
    return 0
  fi

  local size
  size=$(wc -c < "$UNIFIED_LOG" | tr -d ' ')

  if [ "$size" -gt "$max_size" ]; then
    local rotated="${UNIFIED_LOG}.$(date +%Y%m%d%H%M%S)"
    mv "$UNIFIED_LOG" "$rotated"
    emit_unified_event "log_rotated" "admin" "event_log" "{\"rotated_to\": \"$rotated\", \"size_bytes\": $size}"
  fi
}
