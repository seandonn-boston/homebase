#!/bin/bash
# Admiral Framework — Persistent Event Store (S-16)
# JSONL event storage on disk beyond in-memory ring buffer.
# File rotation at configurable size. Historical query support.

EVENT_STORE_DIR="${CLAUDE_PROJECT_DIR:-.}/.admiral/events"
EVENT_STORE_FILE="${EVENT_STORE_DIR}/events.jsonl"
EVENT_STORE_MAX_SIZE="${EVENT_STORE_MAX_SIZE_BYTES:-10485760}"  # 10MB default

# Initialize event store
event_store_init() {
  mkdir -p "$EVENT_STORE_DIR"
}

# Write an event to the persistent store
# Usage: event_store_write <event_json>
event_store_write() {
  local event_json="$1"
  event_store_init

  # Validate JSON
  if ! echo "$event_json" | jq empty 2>/dev/null; then
    return 1
  fi

  # Compact and append
  echo "$event_json" | jq -c '.' >> "$EVENT_STORE_FILE" 2>/dev/null

  # Check rotation
  if [ -f "$EVENT_STORE_FILE" ]; then
    local size
    size=$(wc -c < "$EVENT_STORE_FILE" 2>/dev/null | tr -d ' ')
    if [ "$size" -gt "$EVENT_STORE_MAX_SIZE" ]; then
      _rotate_event_store
    fi
  fi
}

# Rotate the event store file
_rotate_event_store() {
  local timestamp
  timestamp=$(date +%Y%m%d-%H%M%S)
  mv "$EVENT_STORE_FILE" "${EVENT_STORE_DIR}/events-${timestamp}.jsonl" 2>/dev/null || true
}

# Query events by type
# Usage: event_store_query <event_type> [max_results]
event_store_query() {
  local event_type="$1"
  local max_results="${2:-100}"

  if [ ! -f "$EVENT_STORE_FILE" ]; then
    echo "[]"
    return 0
  fi

  grep "\"event\":\"$event_type\"" "$EVENT_STORE_FILE" 2>/dev/null | \
    tail -n "$max_results" | \
    jq -cs '.' | tr -d '\r'
}

# Query events by time range
# Usage: event_store_query_range <start_time> <end_time> [max_results]
event_store_query_range() {
  local start_time="$1"
  local end_time="$2"
  local max_results="${3:-100}"

  if [ ! -f "$EVENT_STORE_FILE" ]; then
    echo "[]"
    return 0
  fi

  jq -cs --arg start "$start_time" --arg end "$end_time" \
    '[.[] | select(.timestamp >= $start and .timestamp <= $end)][:'"$max_results"']' \
    "$EVENT_STORE_FILE" | tr -d '\r'
}

# Get event store stats
event_store_stats() {
  event_store_init

  local total=0
  local file_count=0
  local total_size=0

  for f in "$EVENT_STORE_DIR"/*.jsonl; do
    [ -f "$f" ] || continue
    file_count=$((file_count + 1))
    local lines
    lines=$(wc -l < "$f" | tr -d ' ')
    total=$((total + lines))
    local size
    size=$(wc -c < "$f" | tr -d ' ')
    total_size=$((total_size + size))
  done

  jq -n --argjson total "$total" \
        --argjson files "$file_count" \
        --argjson size "$total_size" \
        '{total_events: $total, files: $files, total_size_bytes: $size}'
}
