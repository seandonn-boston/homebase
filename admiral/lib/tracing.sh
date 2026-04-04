#!/bin/bash
# Admiral Framework — Distributed Tracing (OB-02)
# Trace ID generation, span creation, and context propagation.
# Compatible with OpenTelemetry trace format.
#
# Usage:
#   source admiral/lib/tracing.sh
#   trace_id=$(trace_new)
#   span_id=$(span_start "$trace_id" "hook_execution" "" '{"hook":"zero_trust"}')
#   ... do work ...
#   span_end "$span_id" "ok"

ADMIRAL_DIR="${ADMIRAL_DIR:-${CLAUDE_PROJECT_DIR:-.}/.admiral}"
TRACE_LOG="${ADMIRAL_DIR}/traces.jsonl"

# Generate a new trace ID (32 hex chars, OpenTelemetry compatible)
trace_new() {
  # Use uuidgen if available, else /dev/urandom
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]'
  else
    head -c 16 /dev/urandom 2>/dev/null | xxd -p 2>/dev/null || \
      printf '%04x%04x%04x%04x%04x%04x%04x%04x' \
        $RANDOM $RANDOM $RANDOM $RANDOM $RANDOM $RANDOM $RANDOM $RANDOM
  fi
}

# Generate a span ID (16 hex chars)
_span_id() {
  if command -v uuidgen >/dev/null 2>&1; then
    uuidgen | tr -d '-' | tr '[:upper:]' '[:lower:]' | head -c 16
  else
    head -c 8 /dev/urandom 2>/dev/null | xxd -p 2>/dev/null || \
      printf '%04x%04x%04x%04x' $RANDOM $RANDOM $RANDOM $RANDOM
  fi
}

# Start a new span
# Usage: span_start <trace_id> <operation> [parent_span_id] [attributes_json]
# Returns: span_id on stdout
span_start() {
  local trace_id="$1"
  local operation="$2"
  local parent_span_id="${3:-}"
  local attributes="${4:-"{}"}"

  local span_id
  span_id=$(_span_id)

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

  # Validate attributes
  if ! printf '%s' "$attributes" | jq empty 2>/dev/null; then
    attributes=$(jq -cn --arg a "$attributes" '{raw: $a}')
  fi

  local entry
  entry=$(jq -cn \
    --arg trace_id "$trace_id" \
    --arg span_id "$span_id" \
    --arg parent "$parent_span_id" \
    --arg op "$operation" \
    --arg ts "$ts" \
    --arg status "in_progress" \
    --argjson attrs "$attributes" \
    '{
      trace_id: $trace_id,
      span_id: $span_id,
      parent_span_id: (if $parent == "" then null else $parent end),
      operation: $op,
      start_time: $ts,
      end_time: null,
      status: $status,
      attributes: $attrs
    }')

  mkdir -p "$ADMIRAL_DIR" 2>/dev/null || true
  echo "$entry" >> "$TRACE_LOG" 2>/dev/null || true

  echo "$span_id"
}

# End a span
# Usage: span_end <span_id> [status] [attributes_json]
span_end() {
  local span_id="$1"
  local status="${2:-ok}"
  local attributes="${3:-"{}"}"

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

  if ! printf '%s' "$attributes" | jq empty 2>/dev/null; then
    attributes=$(jq -cn --arg a "$attributes" '{raw: $a}')
  fi

  local entry
  entry=$(jq -cn \
    --arg span_id "$span_id" \
    --arg ts "$ts" \
    --arg status "$status" \
    --argjson attrs "$attributes" \
    '{span_id: $span_id, end_time: $ts, status: $status, end_attributes: $attrs}')

  echo "$entry" >> "$TRACE_LOG" 2>/dev/null || true
}

# Get or create trace ID for current session
trace_current() {
  local state_file="$ADMIRAL_DIR/session_state.json"
  if [ -f "$state_file" ]; then
    local existing
    existing=$(jq -r '.trace_id // ""' "$state_file" 2>/dev/null || echo "")
    if [ -n "$existing" ] && [ "$existing" != "null" ]; then
      echo "$existing"
      return
    fi
  fi
  trace_new
}

# Reconstruct trace from log by trace ID
trace_reconstruct() {
  local trace_id="$1"
  if [ ! -f "$TRACE_LOG" ]; then
    echo "[]"
    return
  fi
  jq -cs --arg tid "$trace_id" '[.[] | select(.trace_id == $tid)]' "$TRACE_LOG"
}
