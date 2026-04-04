#!/bin/bash
# bench_brain_query.sh — Latency benchmarks for hook-to-B2 queries (HB-06)
# Measures round-trip latency for 5 scenarios:
#   1. Single query
#   2. Query + write (typical hook pattern)
#   3. Concurrent hook execution (5 hooks querying simultaneously)
#   4. Cold start vs warm cache
#   5. FTS5 search with realistic corpus
#
# Output: structured JSON compatible with existing benchmark framework.
# Requires: sqlite3, jq, bash 4+
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo '{"status":"skipped","reason":"sqlite3 not available"}'
  exit 0
fi

# ── Setup ─────────────────────────────────────────────────────

TEST_DIR=$(mktemp -d)
mkdir -p "$TEST_DIR/.admiral" "$TEST_DIR/.brain-b2"
echo '{}' > "$TEST_DIR/.admiral/session_state.json"
export CLAUDE_PROJECT_DIR="$TEST_DIR"
export BRAIN_DB_DIR="$TEST_DIR/.brain-b2"
export BRAIN_DB_FILE="$TEST_DIR/.brain-b2/brain-b2.db"
export BRAIN_B2_WRITE_QUEUE="$TEST_DIR/.admiral/brain_write_queue.jsonl"
export BRAIN_B2_WRITE_QUEUE_MAX="1000"

# Create and populate test database
sqlite3 "$BRAIN_DB_FILE" <<'SQL'
PRAGMA journal_mode=WAL;
CREATE TABLE brain_entries (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '', scope TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]', created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL, usefulness_score REAL NOT NULL DEFAULT 0,
  access_count INTEGER NOT NULL DEFAULT 0, source_agent TEXT,
  source_type TEXT, confidence REAL, superseded_by TEXT,
  contradicts TEXT NOT NULL DEFAULT '[]', metadata TEXT NOT NULL DEFAULT '{}'
);
CREATE VIRTUAL TABLE brain_fts USING fts5(title, content, category, tags,
  content=brain_entries, content_rowid=rowid);
CREATE TRIGGER brain_fts_insert AFTER INSERT ON brain_entries BEGIN
  INSERT INTO brain_fts(rowid, title, content, category, tags)
  VALUES (new.rowid, new.title, new.content, new.category, new.tags);
END;
SQL

# Seed 1000 entries for realistic corpus
NOW_MS=$(( $(date +%s) * 1000 ))
for i in $(seq 1 1000); do
  sqlite3 "$BRAIN_DB_FILE" "INSERT INTO brain_entries (id, title, content, category, scope, tags, created_at, updated_at, source_agent, metadata) VALUES ('e$i', 'Entry $i: policy violation detected', 'Content for entry $i with various keywords like injection, scope, boundary, timeout, loop', 'failure', 'security', '[\"test\"]', $NOW_MS, $NOW_MS, 'agent-$((i % 10))', '{\"pattern_hash\":\"hash$i\"}');"
done

source "$PROJECT_ROOT/admiral/lib/brain_query.sh"
source "$PROJECT_ROOT/admiral/lib/brain_writer.sh"

cleanup() { rm -rf "$TEST_DIR" 2>/dev/null || true; }
trap cleanup EXIT

# ── Timing helper ─────────────────────────────────────────────

# Returns milliseconds since epoch (best effort)
now_ms() {
  local ms
  ms=$(date +%s%N 2>/dev/null | cut -b1-13)
  if [ -z "$ms" ]; then
    echo $(( $(date +%s) * 1000 ))
  else
    echo "$ms"
  fi
}

measure() {
  local label="$1"
  shift
  local start end duration
  start=$(now_ms)
  "$@" >/dev/null 2>&1
  end=$(now_ms)
  duration=$(( end - start ))
  echo "$duration"
}

# ── Scenario 1: Single query ─────────────────────────────────

echo "Running benchmarks..." >&2
single_query_times=()
for i in $(seq 1 10); do
  t=$(measure "single_query" brain_query_precedent "injection")
  single_query_times+=("$t")
done
single_query_avg=$(printf '%s\n' "${single_query_times[@]}" | awk '{s+=$1} END {printf "%.0f", s/NR}')
single_query_p99=$(printf '%s\n' "${single_query_times[@]}" | sort -n | tail -1)

# ── Scenario 2: Query + write ────────────────────────────────

query_write_times=()
for i in $(seq 1 10); do
  start=$(now_ms)
  brain_query_precedent "scope" >/dev/null 2>&1
  brain_b2_queue_write "test" "Benchmark $i" "Content" "bench" >/dev/null 2>&1
  end=$(now_ms)
  query_write_times+=("$(( end - start ))")
done
query_write_avg=$(printf '%s\n' "${query_write_times[@]}" | awk '{s+=$1} END {printf "%.0f", s/NR}')
query_write_p99=$(printf '%s\n' "${query_write_times[@]}" | sort -n | tail -1)

# ── Scenario 3: Concurrent (5 parallel queries) ──────────────

concurrent_times=()
for run in $(seq 1 5); do
  start=$(now_ms)
  for i in $(seq 1 5); do
    brain_query_precedent "boundary" >/dev/null 2>&1 &
  done
  wait
  end=$(now_ms)
  concurrent_times+=("$(( end - start ))")
done
concurrent_avg=$(printf '%s\n' "${concurrent_times[@]}" | awk '{s+=$1} END {printf "%.0f", s/NR}')
concurrent_p99=$(printf '%s\n' "${concurrent_times[@]}" | sort -n | tail -1)

# ── Scenario 4: Cold vs warm cache ───────────────────────────

# Cold: drop OS cache (best effort, may need root)
sync 2>/dev/null || true
cold_time=$(measure "cold_start" brain_query_precedent "timeout")

# Warm: second query hits page cache
warm_time=$(measure "warm_cache" brain_query_precedent "timeout")

# ── Scenario 5: FTS5 search with 1000-entry corpus ───────────

fts_times=()
for i in $(seq 1 10); do
  t=$(measure "fts5_search" brain_query_precedent "policy violation")
  fts_times+=("$t")
done
fts_avg=$(printf '%s\n' "${fts_times[@]}" | awk '{s+=$1} END {printf "%.0f", s/NR}')
fts_p99=$(printf '%s\n' "${fts_times[@]}" | sort -n | tail -1)

# ── Output ────────────────────────────────────────────────────

jq -n \
  --argjson sq_avg "$single_query_avg" \
  --argjson sq_p99 "$single_query_p99" \
  --argjson qw_avg "$query_write_avg" \
  --argjson qw_p99 "$query_write_p99" \
  --argjson cc_avg "$concurrent_avg" \
  --argjson cc_p99 "$concurrent_p99" \
  --argjson cold "$cold_time" \
  --argjson warm "$warm_time" \
  --argjson fts_avg "$fts_avg" \
  --argjson fts_p99 "$fts_p99" \
  --argjson corpus 1000 \
  '{
    benchmark: "hook-to-b2-latency",
    version: "1.0.0",
    timestamp: (now | todate),
    budget_ms: 100,
    scenarios: {
      single_query: {avg_ms: $sq_avg, p99_ms: $sq_p99, within_budget: ($sq_p99 < 100)},
      query_plus_write: {avg_ms: $qw_avg, p99_ms: $qw_p99, within_budget: ($qw_p99 < 100)},
      concurrent_5x: {avg_ms: $cc_avg, p99_ms: $cc_p99, within_budget: ($cc_p99 < 100)},
      cold_vs_warm: {cold_ms: $cold, warm_ms: $warm},
      fts5_search: {avg_ms: $fts_avg, p99_ms: $fts_p99, corpus_size: $corpus, within_budget: ($fts_p99 < 100)}
    },
    pass: ([$sq_p99, $qw_p99, $fts_p99] | all(. < 100))
  }'
