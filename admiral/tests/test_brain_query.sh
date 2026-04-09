#!/bin/bash
# test_brain_query.sh — Tests for HB-01/HB-02 hook-to-B2 query helpers
# Tests Brain query functions against a temporary SQLite database.
# Requires: sqlite3, jq, bash 4+
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

pass=0
fail=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (expected '$expected', got '$actual')"
    fail=$((fail + 1))
  fi
}

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (expected to contain '$needle', got '$haystack')"
    fail=$((fail + 1))
  fi
}

assert_json_field() {
  local desc="$1" json="$2" field="$3" expected="$4"
  local actual
  actual=$(printf '%s' "$json" | jq -r "$field" 2>/dev/null || echo "PARSE_ERROR")
  assert_eq "$desc" "$expected" "$actual"
}

echo "Testing brain_query.sh (HB-01/HB-02)"
echo "======================================"
echo ""

# Check prerequisites
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "SKIP: sqlite3 not found — skipping integration tests"
  echo "  Testing fallback behavior only"
  echo ""

  # Even without sqlite3, we can test fallback behavior
  TEST_DB_DIR=$(mktemp -d)
  export BRAIN_DB_DIR="$TEST_DB_DIR"
  export BRAIN_DB_FILE="$TEST_DB_DIR/brain-b2.db"
  export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"

  # Source the library
  source "$PROJECT_ROOT/admiral/lib/brain_query.sh"

  echo "1. Fallback: brain_query_precedent returns [] when B2 unavailable"
  result=$(brain_query_precedent "test pattern")
  assert_eq "Returns empty array" "[]" "$result"

  echo "2. Fallback: brain_query_violations returns empty when B2 unavailable"
  result=$(brain_query_violations "agent-1" "3600")
  assert_json_field "Count is 0" "$result" ".count" "0"

  echo "3. Fallback: brain_query_context returns null when B2 unavailable"
  result=$(brain_query_context "test-key")
  assert_eq "Returns null" "null" "$result"

  echo "4. Fallback: brain_check_pattern returns not-seen when B2 unavailable"
  result=$(brain_check_pattern "abc123")
  assert_json_field "Not seen" "$result" ".seen" "false"

  echo "5. Fallback: brain_b2_health reports unavailable"
  result=$(brain_b2_health)
  assert_json_field "Not available" "$result" ".available" "false"

  echo "6. Empty arguments return defaults"
  assert_eq "Empty precedent" "[]" "$(brain_query_precedent "")"
  assert_eq "Empty context" "null" "$(brain_query_context "")"

  rm -rf "$TEST_DB_DIR" 2>/dev/null || true

  echo ""
  echo "Results: $pass passed, $fail failed, 6 skipped (no sqlite3)"
  exit "$fail"
fi

# ── Full integration tests (sqlite3 available) ───────────────

TEST_DB_DIR=$(mktemp -d)
export BRAIN_DB_DIR="$TEST_DB_DIR"
export BRAIN_DB_FILE="$TEST_DB_DIR/brain-b2.db"
export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"

# Create a test B2 database with the same schema
sqlite3 "$BRAIN_DB_FILE" <<'SQL'
CREATE TABLE IF NOT EXISTS brain_entries (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  scope TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  usefulness_score REAL NOT NULL DEFAULT 0,
  access_count INTEGER NOT NULL DEFAULT 0,
  source_agent TEXT,
  source_type TEXT,
  confidence REAL,
  superseded_by TEXT,
  contradicts TEXT NOT NULL DEFAULT '[]',
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE VIRTUAL TABLE IF NOT EXISTS brain_fts USING fts5(
  title, content, category, tags,
  content=brain_entries, content_rowid=rowid
);

CREATE TRIGGER IF NOT EXISTS brain_fts_insert AFTER INSERT ON brain_entries BEGIN
  INSERT INTO brain_fts(rowid, title, content, category, tags)
  VALUES (new.rowid, new.title, new.content, new.category, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS brain_fts_update AFTER UPDATE ON brain_entries BEGIN
  INSERT INTO brain_fts(brain_fts, rowid, title, content, category, tags)
  VALUES ('delete', old.rowid, old.title, old.content, old.category, old.tags);
  INSERT INTO brain_fts(rowid, title, content, category, tags)
  VALUES (new.rowid, new.title, new.content, new.category, new.tags);
END;

CREATE TABLE IF NOT EXISTS brain_links (
  id TEXT PRIMARY KEY,
  from_entry TEXT NOT NULL,
  to_entry TEXT NOT NULL,
  link_type TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1.0,
  created_at INTEGER NOT NULL,
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS demand_signals (
  id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  agent_id TEXT,
  results_found INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS brain_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO brain_meta(key, value) VALUES ('schema_version', '1');
SQL

# Seed test data
NOW_MS=$(( $(date +%s) * 1000 ))
HOUR_AGO_MS=$(( NOW_MS - 3600000 ))
DAY_AGO_MS=$(( NOW_MS - 86400000 ))

sqlite3 "$BRAIN_DB_FILE" <<SQL
INSERT INTO brain_entries (id, title, content, category, scope, tags, created_at, updated_at, usefulness_score, source_agent, metadata)
VALUES
  ('e1', 'Injection detected in tool call', 'SQL injection attempt in database query parameter', 'failure', 'security', '["injection","security"]', $NOW_MS, $NOW_MS, 5.0, 'security-auditor', '{}'),
  ('e2', 'Deployment policy', 'All deployments require approval from tier-1 agent', 'decision', 'operations', '["deployment","policy"]', $HOUR_AGO_MS, $HOUR_AGO_MS, 8.0, 'orchestrator', '{}'),
  ('e3', 'Loop pattern detected', 'Agent repeated same tool call 5 times', 'pattern', 'detection', '["loop","pattern"]', $DAY_AGO_MS, $DAY_AGO_MS, 3.0, 'agent-1', '{"pattern_hash":"abc123"}'),
  ('e4', 'Scope violation by agent-1', 'Attempted write to read-only directory', 'failure', 'security', '["violation","scope"]', $NOW_MS, $NOW_MS, 2.0, 'agent-1', '{}'),
  ('e5', 'Scope boundary crossed', 'Agent accessed file outside permitted paths', 'failure', 'security', '["violation","boundary"]', $HOUR_AGO_MS, $HOUR_AGO_MS, 4.0, 'agent-1', '{}');
SQL

# Source the library
source "$PROJECT_ROOT/admiral/lib/brain_query.sh"

cleanup() {
  rm -rf "$TEST_DB_DIR" 2>/dev/null || true
}
trap cleanup EXIT

# ── Test: brain_b2_health ─────────────────────────────────────

echo "1. brain_b2_health reports available"
result=$(brain_b2_health)
assert_json_field "Available" "$result" ".available" "true"
assert_json_field "Has entries" "$result" ".entry_count" "5"

# ── Test: brain_query_precedent ───────────────────────────────

echo ""
echo "2. brain_query_precedent — FTS5 search"
result=$(brain_query_precedent "injection")
count=$(printf '%s' "$result" | jq 'length' 2>/dev/null || echo "0")
assert_eq "Finds injection entry" "true" "$([ "$count" -ge 1 ] && echo true || echo false)"

echo "3. brain_query_precedent — no results"
result=$(brain_query_precedent "nonexistent_term_xyz")
assert_eq "Returns empty for no match" "[]" "$result"

echo "4. brain_query_precedent — empty input"
result=$(brain_query_precedent "")
assert_eq "Returns empty for empty input" "[]" "$result"

# ── Test: brain_query_violations ──────────────────────────────

echo ""
echo "5. brain_query_violations — finds agent violations"
result=$(brain_query_violations "agent-1" "86400")
count=$(printf '%s' "$result" | jq '.count' 2>/dev/null || echo "0")
assert_eq "Finds violations for agent-1" "true" "$([ "$count" -ge 2 ] && echo true || echo false)"

echo "6. brain_query_violations — no violations for unknown agent"
result=$(brain_query_violations "unknown-agent" "86400")
assert_json_field "Zero count" "$result" ".count" "0"

echo "7. brain_query_violations — empty agent ID"
result=$(brain_query_violations "" "3600")
assert_json_field "Zero count for empty" "$result" ".count" "0"

# ── Test: brain_query_context ─────────────────────────────────

echo ""
echo "8. brain_query_context — finds exact title"
result=$(brain_query_context "Deployment policy")
assert_json_field "Found deployment policy" "$result" ".title" "Deployment policy"
assert_json_field "Correct category" "$result" ".category" "decision"

echo "9. brain_query_context — not found"
result=$(brain_query_context "nonexistent-key")
assert_eq "Returns null" "null" "$result"

echo "10. brain_query_context — empty input"
result=$(brain_query_context "")
assert_eq "Returns null for empty" "null" "$result"

# ── Test: brain_check_pattern ─────────────────────────────────

echo ""
echo "11. brain_check_pattern — finds known pattern"
result=$(brain_check_pattern "abc123")
assert_json_field "Pattern seen" "$result" ".seen" "true"
assert_json_field "Count >= 1" "$result" ".count" "1"

echo "12. brain_check_pattern — unknown pattern"
result=$(brain_check_pattern "unknown_hash_xyz")
assert_json_field "Not seen" "$result" ".seen" "false"
assert_json_field "Zero count" "$result" ".count" "0"

echo "13. brain_check_pattern — empty input"
result=$(brain_check_pattern "")
assert_json_field "Not seen for empty" "$result" ".seen" "false"

# ── Test: Fallback when B2 unavailable ────────────────────────

echo ""
echo "14. Fallback: queries return defaults when B2 unavailable"
SAVE_DB_FILE="$BRAIN_DB_FILE"
export BRAIN_DB_FILE="/nonexistent/path/brain.db"

result=$(brain_query_precedent "test")
assert_eq "Precedent fallback" "[]" "$result"

result=$(brain_query_violations "agent-1" "3600")
assert_json_field "Violations fallback count" "$result" ".count" "0"

result=$(brain_query_context "test")
assert_eq "Context fallback" "null" "$result"

result=$(brain_check_pattern "test")
assert_json_field "Pattern fallback" "$result" ".seen" "false"

export BRAIN_DB_FILE="$SAVE_DB_FILE"

# ── Summary ───────────────────────────────────────────────────

echo ""
echo "======================================"
echo "Results: $pass passed, $fail failed"
exit "$fail"
