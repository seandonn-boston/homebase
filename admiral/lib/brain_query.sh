#!/bin/bash
# Admiral Framework — Brain Query Library (HB-01/HB-02)
# Hook-side query helpers for reading context from Brain B2 (SQLite/FTS5).
#
# Access pattern: Direct SQLite CLI (per ADR-010).
# All functions return structured JSON, timeout after 50ms,
# and return empty/default results on B2 unavailability.
#
# Usage: source this file from any hook, then call query functions.
#   . admiral/lib/brain_query.sh
#   result=$(brain_query_precedent "injection detected")

# ── Configuration ─────────────────────────────────────────────

BRAIN_QUERY_TIMEOUT_MS="${BRAIN_QUERY_TIMEOUT_MS:-50}"
BRAIN_DB_DIR="${BRAIN_DB_DIR:-${CLAUDE_PROJECT_DIR:-.}/.brain-b2}"
BRAIN_DB_FILE="${BRAIN_DB_DIR}/brain-b2.db"

# Convert ms to seconds for timeout command (minimum 0.05s)
_brain_timeout_sec() {
  local ms="${1:-50}"
  # Use awk for floating point division
  awk "BEGIN { printf \"%.3f\", $ms / 1000 }"
}

BRAIN_TIMEOUT_SEC=$(_brain_timeout_sec "$BRAIN_QUERY_TIMEOUT_MS")

# ── Internal helpers ──────────────────────────────────────────

# Check if Brain B2 database is available
_brain_b2_available() {
  [ -f "$BRAIN_DB_FILE" ] && command -v sqlite3 >/dev/null 2>&1
}

# Execute a sqlite3 query with timeout. Returns empty string on failure.
# Usage: _brain_sql "SELECT ..." [db_path]
_brain_sql() {
  local query="$1"
  local db="${2:-$BRAIN_DB_FILE}"

  if ! _brain_b2_available; then
    return 1
  fi

  local result
  result=$(timeout "$BRAIN_TIMEOUT_SEC" sqlite3 -json "$db" "$query" 2>/dev/null) || return 1
  echo "$result"
}

# Log query latency for monitoring (non-blocking)
_brain_log_latency() {
  local func_name="$1"
  local start_ms="$2"
  local end_ms
  end_ms=$(date +%s%N 2>/dev/null | cut -b1-13)

  # Fallback if nanosecond timestamps not available
  if [ -z "$end_ms" ] || [ -z "$start_ms" ]; then
    return 0
  fi

  local latency_ms=$(( end_ms - start_ms ))

  # Emit as structured event if bridge is available
  if [ -f "${CLAUDE_PROJECT_DIR:-.}/.admiral/event_log.jsonl" ]; then
    local ts
    ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "unknown")
    printf '{"event":"brain_query","timestamp":"%s","data":{"function":"%s","latency_ms":%d}}\n' \
      "$ts" "$func_name" "$latency_ms" \
      >> "${CLAUDE_PROJECT_DIR:-.}/.admiral/event_log.jsonl" 2>/dev/null || true
  fi
}

# Get current timestamp in milliseconds (best-effort)
_brain_now_ms() {
  date +%s%N 2>/dev/null | cut -b1-13
}

# ── Public query functions ────────────────────────────────────

# Search for prior decisions matching a pattern using FTS5.
# Returns JSON array of matching entries, or "[]" on failure.
# Usage: brain_query_precedent "injection detected"
brain_query_precedent() {
  local pattern="$1"
  local start_ms
  start_ms=$(_brain_now_ms)

  if [ -z "$pattern" ]; then
    echo "[]"
    return 0
  fi

  # Sanitize pattern for FTS5 query (escape double quotes)
  local safe_pattern
  safe_pattern=$(printf '%s' "$pattern" | sed 's/"/""/g')

  local result
  result=$(_brain_sql "SELECT id, title, content, category, created_at, usefulness_score FROM brain_entries WHERE id IN (SELECT id FROM brain_entries WHERE rowid IN (SELECT rowid FROM brain_fts WHERE brain_fts MATCH '\"$safe_pattern\"')) ORDER BY usefulness_score DESC, created_at DESC LIMIT 10;")

  if [ $? -ne 0 ] || [ -z "$result" ]; then
    echo "[]"
  else
    echo "$result"
  fi

  _brain_log_latency "brain_query_precedent" "$start_ms"
}

# Count recent violations by an agent within a time window.
# Returns JSON: {"count": N, "recent": [...]}
# Usage: brain_query_violations "agent-id" "3600" (last hour)
brain_query_violations() {
  local agent_id="$1"
  local window_seconds="${2:-3600}"
  local start_ms
  start_ms=$(_brain_now_ms)

  if [ -z "$agent_id" ]; then
    echo '{"count":0,"recent":[]}'
    return 0
  fi

  local cutoff_ms
  cutoff_ms=$(( $(date +%s) * 1000 - window_seconds * 1000 ))

  local result
  result=$(_brain_sql "SELECT id, title, content, created_at FROM brain_entries WHERE category = 'failure' AND source_agent = '$agent_id' AND created_at >= $cutoff_ms ORDER BY created_at DESC LIMIT 20;")

  if [ $? -ne 0 ] || [ -z "$result" ]; then
    echo '{"count":0,"recent":[]}'
  else
    local count
    count=$(printf '%s' "$result" | jq 'length' 2>/dev/null || echo "0")
    printf '{"count":%s,"recent":%s}' "$count" "$result"
  fi

  _brain_log_latency "brain_query_violations" "$start_ms"
}

# Retrieve a specific context entry by key (title exact match).
# Returns JSON object or "null" if not found.
# Usage: brain_query_context "deployment-policy"
brain_query_context() {
  local key="$1"
  local start_ms
  start_ms=$(_brain_now_ms)

  if [ -z "$key" ]; then
    echo "null"
    return 0
  fi

  # Escape single quotes in key
  local safe_key
  safe_key=$(printf '%s' "$key" | sed "s/'/''/g")

  local result
  result=$(_brain_sql "SELECT id, title, content, category, scope, tags, created_at, updated_at, usefulness_score FROM brain_entries WHERE title = '$safe_key' LIMIT 1;")

  if [ $? -ne 0 ] || [ -z "$result" ] || [ "$result" = "[]" ]; then
    echo "null"
  else
    # Return first (and only) result
    printf '%s' "$result" | jq '.[0] // null' 2>/dev/null || echo "null"
  fi

  _brain_log_latency "brain_query_context" "$start_ms"
}

# Check if a specific pattern hash has been seen before.
# Returns JSON: {"seen": true/false, "count": N, "last_seen": timestamp}
# Usage: brain_check_pattern "sha256hash"
brain_check_pattern() {
  local pattern_hash="$1"
  local start_ms
  start_ms=$(_brain_now_ms)

  if [ -z "$pattern_hash" ]; then
    echo '{"seen":false,"count":0,"last_seen":null}'
    return 0
  fi

  # Search in metadata for pattern_hash field
  local safe_hash
  safe_hash=$(printf '%s' "$pattern_hash" | sed "s/'/''/g")

  local result
  result=$(_brain_sql "SELECT COUNT(*) as count, MAX(created_at) as last_seen FROM brain_entries WHERE category = 'pattern' AND metadata LIKE '%\"pattern_hash\":\"$safe_hash\"%';")

  if [ $? -ne 0 ] || [ -z "$result" ] || [ "$result" = "[]" ]; then
    echo '{"seen":false,"count":0,"last_seen":null}'
  else
    local count last_seen
    count=$(printf '%s' "$result" | jq '.[0].count // 0' 2>/dev/null || echo "0")
    last_seen=$(printf '%s' "$result" | jq '.[0].last_seen // null' 2>/dev/null || echo "null")
    if [ "$count" -gt 0 ] 2>/dev/null; then
      printf '{"seen":true,"count":%s,"last_seen":%s}' "$count" "$last_seen"
    else
      echo '{"seen":false,"count":0,"last_seen":null}'
    fi
  fi

  _brain_log_latency "brain_check_pattern" "$start_ms"
}

# ── Health check ──────────────────────────────────────────────

# Check if Brain B2 is available and responsive.
# Returns JSON: {"available": true/false, "db_path": "...", "entry_count": N}
brain_b2_health() {
  if ! _brain_b2_available; then
    printf '{"available":false,"db_path":"%s","entry_count":0}' "$BRAIN_DB_FILE"
    return 0
  fi

  local count
  count=$(_brain_sql "SELECT COUNT(*) as count FROM brain_entries;" 2>/dev/null)

  if [ $? -ne 0 ] || [ -z "$count" ]; then
    printf '{"available":false,"db_path":"%s","entry_count":0}' "$BRAIN_DB_FILE"
  else
    local n
    n=$(printf '%s' "$count" | jq '.[0].count // 0' 2>/dev/null || echo "0")
    printf '{"available":true,"db_path":"%s","entry_count":%s}' "$BRAIN_DB_FILE" "$n"
  fi
}
