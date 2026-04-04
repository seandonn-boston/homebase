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

# ── Fallback: Write Queue Replay (HB-05) ─────────────────────
#
# Replays queued writes to Brain B2 when it becomes available.
# Entries are processed in order (FIFO). Successfully replayed
# entries are removed from the queue. Failed entries remain for
# the next replay attempt.

# Replay the write queue to Brain B2 via sqlite3.
# Returns: JSON {"replayed": N, "failed": N, "remaining": N}
# Requires: sqlite3, BRAIN_DB_FILE from brain_query.sh
brain_b2_replay_queue() {
  local db_file="${BRAIN_DB_FILE:-${CLAUDE_PROJECT_DIR:-.}/.brain-b2/brain-b2.db}"

  if [ ! -f "$BRAIN_B2_WRITE_QUEUE" ]; then
    echo '{"replayed":0,"failed":0,"remaining":0}'
    return 0
  fi

  if [ ! -f "$db_file" ] || ! command -v sqlite3 >/dev/null 2>&1; then
    local remaining
    remaining=$(wc -l < "$BRAIN_B2_WRITE_QUEUE" 2>/dev/null | tr -d ' ')
    printf '{"replayed":0,"failed":0,"remaining":%s}' "${remaining:-0}"
    return 0
  fi

  local replayed=0
  local failed=0
  local failed_lines=""
  local ts_ms
  ts_ms=$(( $(date +%s 2>/dev/null || echo "0") * 1000 ))

  while IFS= read -r line; do
    [ -z "$line" ] && continue

    local op category title content source_hook
    op=$(printf '%s' "$line" | jq -r '.op // empty' 2>/dev/null | tr -d '\r')
    category=$(printf '%s' "$line" | jq -r '.category // ""' 2>/dev/null | tr -d '\r')
    title=$(printf '%s' "$line" | jq -r '.title // ""' 2>/dev/null | tr -d '\r')
    content=$(printf '%s' "$line" | jq -r '.content // ""' 2>/dev/null | tr -d '\r')
    source_hook=$(printf '%s' "$line" | jq -r '.source_hook // "replay"' 2>/dev/null | tr -d '\r')

    if [ "$op" != "insert" ]; then
      failed=$((failed + 1))
      failed_lines="${failed_lines}${line}
"
      continue
    fi

    # Escape single quotes for SQL
    local safe_title safe_content safe_cat safe_source
    safe_title=$(printf '%s' "$title" | sed "s/'/''/g")
    safe_content=$(printf '%s' "$content" | sed "s/'/''/g")
    safe_cat=$(printf '%s' "$category" | sed "s/'/''/g")
    safe_source=$(printf '%s' "$source_hook" | sed "s/'/''/g")

    local uuid
    uuid=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || printf '%s-%s' "$(date +%s)" "$replayed")

    if sqlite3 "$db_file" "INSERT INTO brain_entries (id, title, content, category, scope, tags, created_at, updated_at, source_agent, metadata) VALUES ('$uuid', '$safe_title', '$safe_content', '$safe_cat', '', '[]', $ts_ms, $ts_ms, '$safe_source', '{}');" 2>/dev/null; then
      replayed=$((replayed + 1))
    else
      failed=$((failed + 1))
      failed_lines="${failed_lines}${line}
"
    fi
  done < "$BRAIN_B2_WRITE_QUEUE"

  # Rewrite queue with only failed entries
  if [ "$failed" -gt 0 ]; then
    printf '%s' "$failed_lines" > "$BRAIN_B2_WRITE_QUEUE" 2>/dev/null || true
  else
    rm -f "$BRAIN_B2_WRITE_QUEUE" 2>/dev/null || true
  fi

  local remaining
  remaining=$(brain_b2_queue_size)
  printf '{"replayed":%d,"failed":%d,"remaining":%s}' "$replayed" "$failed" "$remaining"
}

# Check if B2 is available and replay queue if so.
# Intended to be called at session start or periodically.
brain_b2_check_and_replay() {
  local db_file="${BRAIN_DB_FILE:-${CLAUDE_PROJECT_DIR:-.}/.brain-b2/brain-b2.db}"

  if [ ! -f "$db_file" ] || ! command -v sqlite3 >/dev/null 2>&1; then
    return 0
  fi

  local queue_size
  queue_size=$(brain_b2_queue_size)
  if [ "$queue_size" -gt 0 ] 2>/dev/null; then
    brain_b2_replay_queue
  fi
}
