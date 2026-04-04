#!/bin/bash
# Admiral Framework — Brain Writer Library (B-01, HB-03)
# Provides functions for hooks to automatically create brain entries.
# Called by enforcement hooks to record decisions, violations, patterns.
#
# Two write paths:
#   1. Brain B1 (JSON files): via brain_record CLI (original)
#   2. Brain B2 (SQLite): via async write queue (HB-03, ADR-010)
#
# B2 writes are non-blocking and fire-and-forget. If the write queue
# is full or unavailable, writes are silently dropped (fail-open per ADR-004).

BRAIN_WRITER_PROJECT="${BRAIN_WRITER_PROJECT:-helm}"

# ── B2 Write Queue Configuration ──────────────────────────────
BRAIN_B2_WRITE_QUEUE="${BRAIN_B2_WRITE_QUEUE:-${CLAUDE_PROJECT_DIR:-.}/.admiral/brain_write_queue.jsonl}"
BRAIN_B2_WRITE_QUEUE_MAX="${BRAIN_B2_WRITE_QUEUE_MAX:-1000}"

# Write a brain entry from a hook. Non-blocking — failures are logged, not raised.
# Usage: brain_write <category> <title> <content> [source_hook]
brain_write() {
  local category="$1"
  local title="$2"
  local content="$3"
  local source_hook="${4:-hook}"

  local project_dir="${CLAUDE_PROJECT_DIR:-.}"
  local brain_record="$project_dir/admiral/bin/brain_record"

  if [ ! -x "$brain_record" ]; then
    return 0
  fi

  # Non-blocking: suppress all output to avoid polluting hook JSON responses
  "$brain_record" "$BRAIN_WRITER_PROJECT" "$category" "$title" "$content" "$source_hook" >/dev/null 2>&1 || true
}

# Record a policy violation (from prohibitions_enforcer, scope_boundary_guard)
brain_record_violation() {
  local hook_name="$1"
  local violation_type="$2"
  local details="$3"
  local tool_name="${4:-unknown}"

  brain_write "failure" \
    "Policy violation: $violation_type" \
    "Hook: $hook_name. Tool: $tool_name. $details" \
    "$hook_name"
}

# Record a pattern detection (from loop_detector, context_health_check)
brain_record_pattern() {
  local hook_name="$1"
  local pattern_name="$2"
  local details="$3"

  brain_write "pattern" \
    "Pattern detected: $pattern_name" \
    "Hook: $hook_name. $details" \
    "$hook_name"
}

# Record a decision made by a hook
brain_record_decision() {
  local hook_name="$1"
  local decision="$2"
  local rationale="$3"

  brain_write "decision" \
    "$decision" \
    "Hook: $hook_name. Rationale: $rationale" \
    "$hook_name"
}

# Record a lesson learned from hook outcomes
brain_record_lesson() {
  local hook_name="$1"
  local lesson="$2"
  local context="$3"

  brain_write "lesson" \
    "$lesson" \
    "Hook: $hook_name. Context: $context" \
    "$hook_name"
}

# ── Brain B2 Async Write Queue (HB-03, ADR-010) ──────────────
#
# Non-blocking writes to a JSONL queue file. The control plane
# ingests this queue and writes to Brain B2 (SQLite) asynchronously.
# Queue is bounded (FIFO eviction when full).

# Append an entry to the B2 write queue. Non-blocking, fire-and-forget.
# Usage: brain_b2_queue_write <category> <title> <content> [source_hook] [metadata_json]
brain_b2_queue_write() {
  local category="$1"
  local title="$2"
  local content="$3"
  local source_hook="${4:-hook}"
  local default_meta='{}'
  local metadata
  metadata=$(printf '%s' "${5:-$default_meta}" | tr -d '\r')

  # Ensure queue directory exists
  local queue_dir
  queue_dir=$(dirname "$BRAIN_B2_WRITE_QUEUE")
  mkdir -p "$queue_dir" 2>/dev/null || true

  # Build JSON entry
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null | tr -d '\r' || echo "unknown")
  local ts_ms
  ts_ms=$(( $(date +%s 2>/dev/null || echo "0") * 1000 ))

  local session_id
  session_id=$(jq -r '.session_id // "unknown"' "${CLAUDE_PROJECT_DIR:-.}/.admiral/session_state.json" 2>/dev/null | tr -d '\r' || echo "unknown")

  local trace_id
  trace_id=$(jq -r '.trace_id // "unknown"' "${CLAUDE_PROJECT_DIR:-.}/.admiral/session_state.json" 2>/dev/null | tr -d '\r' || echo "unknown")

  local entry
  entry=$(jq -cn --arg cat "$category" --arg title "$title" --arg content "$content" --arg source "$source_hook" --arg ts "$ts" --argjson ts_ms "$ts_ms" --arg session "$session_id" --arg trace "$trace_id" --argjson meta "$metadata" '{op:"insert",category:$cat,title:$title,content:$content,source_hook:$source,timestamp:$ts,timestamp_ms:$ts_ms,session_id:$session,trace_id:$trace,metadata:$meta}' 2>/dev/null | tr -d '\r') || return 0

  # Enforce queue size limit (FIFO eviction)
  if [ -f "$BRAIN_B2_WRITE_QUEUE" ]; then
    local line_count
    line_count=$(wc -l < "$BRAIN_B2_WRITE_QUEUE" 2>/dev/null || echo "0")
    if [ "$line_count" -ge "$BRAIN_B2_WRITE_QUEUE_MAX" ]; then
      # Evict oldest entries to make room
      local keep=$(( BRAIN_B2_WRITE_QUEUE_MAX - 1 ))
      local tmp_file="${BRAIN_B2_WRITE_QUEUE}.tmp"
      tail -n "$keep" "$BRAIN_B2_WRITE_QUEUE" > "$tmp_file" 2>/dev/null
      mv "$tmp_file" "$BRAIN_B2_WRITE_QUEUE" 2>/dev/null || true
    fi
  fi

  # Append to queue (non-blocking)
  printf '%s\n' "$entry" >> "$BRAIN_B2_WRITE_QUEUE" 2>/dev/null || true
}

# Variant that builds metadata from key-value pairs instead of a JSON string.
# Avoids CRLF and quoting issues on Windows.
# Usage: brain_b2_queue_write_with_extra <category> <title> <content> <source_hook> [key1 val1 key2 val2 ...]
brain_b2_queue_write_with_extra() {
  local category="$1"
  local title="$2"
  local content="$3"
  local source_hook="${4:-hook}"
  shift 4

  # Build metadata JSON from remaining key-value pairs
  local meta="{}"
  while [ $# -ge 2 ]; do
    local key="$1"
    local val="$2"
    shift 2
    meta=$(printf '%s' "$meta" | jq -c --arg k "$key" --arg v "$val" '. + {($k): $v}' 2>/dev/null | tr -d '\r' || echo '{}')
  done

  brain_b2_queue_write "$category" "$title" "$content" "$source_hook" "$meta"
}

# Record a decision to Brain B2 write queue.
# Usage: brain_b2_record_decision <hook_name> <decision> <rationale>
brain_b2_record_decision() {
  local hook_name="$1"
  local decision="$2"
  local rationale="$3"

  brain_b2_queue_write "decision" \
    "$decision" \
    "Hook: $hook_name. Rationale: $rationale" \
    "$hook_name"
}

# Record a violation to Brain B2 write queue.
# Usage: brain_b2_record_violation <hook_name> <agent_id> <violation_type> <details>
brain_b2_record_violation() {
  local hook_name="$1"
  local agent_id="$2"
  local violation_type="$3"
  local details="$4"

  brain_b2_queue_write_with_extra "failure" \
    "Policy violation: $violation_type" \
    "Hook: $hook_name. Agent: $agent_id. $details" \
    "$hook_name" \
    "agent_id" "$agent_id" \
    "violation_type" "$violation_type"
}

# Record a pattern to Brain B2 write queue.
# Usage: brain_b2_record_pattern <pattern_hash> <pattern_type> <metadata_json>
brain_b2_record_pattern() {
  local pattern_hash="$1"
  local pattern_type="$2"
  local metadata="${3:-{}}"

  brain_b2_queue_write_with_extra "pattern" \
    "Pattern: $pattern_type" \
    "Hash: $pattern_hash" \
    "pattern_detector" \
    "pattern_hash" "$pattern_hash" \
    "pattern_type" "$pattern_type"
}

# Get current B2 write queue size (for monitoring).
brain_b2_queue_size() {
  if [ ! -f "$BRAIN_B2_WRITE_QUEUE" ]; then
    echo "0"
    return 0
  fi
  wc -l < "$BRAIN_B2_WRITE_QUEUE" 2>/dev/null | tr -d ' '
}
