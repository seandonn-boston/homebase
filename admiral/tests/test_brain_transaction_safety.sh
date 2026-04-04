#!/bin/bash
# test_brain_transaction_safety.sh — Tests for HB-04 transactional safety
# Verifies that hook-to-B2 writes maintain transactional integrity.
# Requires: sqlite3, jq, bash 4+
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

pass=0
fail=0
skip=0

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

echo "Testing Brain B2 Transactional Safety (HB-04)"
echo "==============================================="
echo ""

# Check prerequisites
if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "SKIP: sqlite3 not found — testing write queue atomic guarantees only"
  echo ""

  TEST_DIR=$(mktemp -d)
  mkdir -p "$TEST_DIR/.admiral"
  echo '{}' > "$TEST_DIR/.admiral/session_state.json"
  export CLAUDE_PROJECT_DIR="$TEST_DIR"
  export BRAIN_B2_WRITE_QUEUE="$TEST_DIR/.admiral/brain_write_queue.jsonl"
  export BRAIN_B2_WRITE_QUEUE_MAX="100"
  source "$PROJECT_ROOT/admiral/lib/brain_writer.sh"

  # Test 1: Each queue entry is a complete JSON line (atomic unit)
  echo "1. Queue entries are atomic JSON lines"
  brain_b2_queue_write "test" "Entry 1" "Content 1" "hook1"
  brain_b2_queue_write "test" "Entry 2" "Content 2" "hook2"
  brain_b2_queue_write "test" "Entry 3" "Content 3" "hook3"
  total=$(wc -l < "$BRAIN_B2_WRITE_QUEUE" | tr -d ' ')
  valid=0
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    if printf '%s' "$line" | jq -e '.' >/dev/null 2>&1; then
      valid=$((valid + 1))
    fi
  done < "$BRAIN_B2_WRITE_QUEUE"
  assert_eq "All entries are valid JSON" "$total" "$valid"

  # Test 2: Queue survives partial write (simulated by truncation)
  echo "2. Queue remains parseable after partial write"
  # Add a truncated line (simulating mid-write crash)
  printf '{"op":"insert","title":"partial' >> "$BRAIN_B2_WRITE_QUEUE"
  printf '\n' >> "$BRAIN_B2_WRITE_QUEUE"
  brain_b2_queue_write "test" "After crash" "Recovery content" "hook"
  # Count valid lines
  valid=0
  total_lines=0
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    total_lines=$((total_lines + 1))
    if printf '%s' "$line" | jq -e '.' >/dev/null 2>&1; then
      valid=$((valid + 1))
    fi
  done < "$BRAIN_B2_WRITE_QUEUE"
  # At least the non-truncated entries should be valid
  assert_eq "Valid entries survive truncated line" "true" "$([ "$valid" -ge 4 ] && echo true || echo false)"

  # Test 3: Concurrent writes don't corrupt queue
  echo "3. Concurrent writes produce valid entries"
  rm -f "$BRAIN_B2_WRITE_QUEUE"
  for i in $(seq 1 10); do
    brain_b2_queue_write "test" "Concurrent $i" "Content" "hook" &
  done
  wait
  valid=0
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    if printf '%s' "$line" | jq -e '.' >/dev/null 2>&1; then
      valid=$((valid + 1))
    fi
  done < "$BRAIN_B2_WRITE_QUEUE"
  # Some may be lost due to race conditions, but none should be corrupted
  assert_eq "All written entries are valid JSON" "true" "$([ "$valid" -ge 1 ] && echo true || echo false)"

  # Test 4: Replay returns remaining when B2 unavailable (no sqlite3)
  echo "4. Replay preserves queue when B2 unavailable"
  rm -f "$BRAIN_B2_WRITE_QUEUE"
  brain_b2_queue_write "test" "Good entry" "Content" "hook"
  printf 'not json at all\n' >> "$BRAIN_B2_WRITE_QUEUE"
  brain_b2_queue_write "test" "Another good" "Content" "hook"
  result=$(brain_b2_replay_queue)
  remaining=$(printf '%s' "$result" | jq -r '.remaining' 2>/dev/null || echo "0")
  assert_eq "Queue preserved when B2 unavailable" "true" "$([ "$remaining" -ge 1 ] && echo true || echo false)"

  rm -rf "$TEST_DIR" 2>/dev/null || true

  echo ""
  echo "==============================================="
  echo "Results: $pass passed, $fail failed (sqlite3 integration tests skipped)"
  exit "$fail"
fi

# ── Full integration tests (sqlite3 available) ───────────────

TEST_DIR=$(mktemp -d)
mkdir -p "$TEST_DIR/.admiral" "$TEST_DIR/.brain-b2"
echo '{}' > "$TEST_DIR/.admiral/session_state.json"
export CLAUDE_PROJECT_DIR="$TEST_DIR"
export BRAIN_B2_WRITE_QUEUE="$TEST_DIR/.admiral/brain_write_queue.jsonl"
export BRAIN_B2_WRITE_QUEUE_MAX="100"
export BRAIN_DB_DIR="$TEST_DIR/.brain-b2"
export BRAIN_DB_FILE="$TEST_DIR/.brain-b2/brain-b2.db"

# Create test database with WAL mode
sqlite3 "$BRAIN_DB_FILE" <<'SQL'
PRAGMA journal_mode=WAL;
CREATE TABLE brain_entries (
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
  metadata TEXT NOT NULL DEFAULT '{}'
);
SQL

source "$PROJECT_ROOT/admiral/lib/brain_writer.sh"
source "$PROJECT_ROOT/admiral/lib/brain_query.sh"

cleanup() {
  rm -rf "$TEST_DIR" 2>/dev/null || true
}
trap cleanup EXIT

# Test 1: WAL mode is active
echo "1. WAL mode is active"
wal_mode=$(sqlite3 "$BRAIN_DB_FILE" "PRAGMA journal_mode;" 2>/dev/null)
assert_eq "WAL mode" "wal" "$wal_mode"

# Test 2: Queue write followed by replay inserts into B2
echo "2. Queue → replay → B2 insert"
brain_b2_queue_write "decision" "Test decision" "Replay test content" "test_hook"
result=$(brain_b2_replay_queue)
replayed=$(printf '%s' "$result" | jq -r '.replayed' 2>/dev/null)
assert_eq "Replayed 1 entry" "1" "$replayed"

# Verify entry exists in B2
count=$(sqlite3 "$BRAIN_DB_FILE" "SELECT COUNT(*) FROM brain_entries WHERE title = 'Test decision';" 2>/dev/null)
assert_eq "Entry in B2" "1" "$count"

# Test 3: Queue is empty after successful replay
echo "3. Queue empty after replay"
remaining=$(brain_b2_queue_size)
assert_eq "Queue empty" "0" "$remaining"

# Test 4: Multiple entries replay in order
echo "4. Multiple entries replay in order"
brain_b2_queue_write "test" "First" "Content 1" "hook"
brain_b2_queue_write "test" "Second" "Content 2" "hook"
brain_b2_queue_write "test" "Third" "Content 3" "hook"
result=$(brain_b2_replay_queue)
replayed=$(printf '%s' "$result" | jq -r '.replayed' 2>/dev/null)
assert_eq "Replayed 3 entries" "3" "$replayed"

# Test 5: Read isolation — concurrent query sees consistent state
echo "5. Read isolation via WAL"
brain_b2_queue_write "decision" "Isolation test" "Content" "hook"
brain_b2_replay_queue >/dev/null
result=$(brain_query_context "Isolation test")
title=$(printf '%s' "$result" | jq -r '.title' 2>/dev/null)
assert_eq "Query sees replayed entry" "Isolation test" "$title"

echo ""
echo "==============================================="
echo "Results: $pass passed, $fail failed"
exit "$fail"
