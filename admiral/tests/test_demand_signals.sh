#!/bin/bash
# test_demand_signals.sh — Tests for B-03 demand signal tracking
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
export BRAIN_DIR="$PROJECT_ROOT/.brain"

DEMAND_DIR="$BRAIN_DIR/_demand"
BRAIN_AUDIT="$PROJECT_ROOT/admiral/bin/brain_audit"

# Source brain retriever
source "$PROJECT_ROOT/admiral/lib/brain_retriever.sh"

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

cleanup() {
  rm -rf "$DEMAND_DIR" 2>/dev/null || true
}

cleanup

echo "Testing demand signal tracking (B-03)"
echo "======================================="
echo ""

# Test 1: Zero-result query creates demand signal
echo "1. Zero-result query creates demand signal"
result=$(brain_retrieve_context "zzz_totally_nonexistent_topic_12345" "" 3)
signal_count=$(ls "$DEMAND_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Demand signal created" "true" "$([ "$signal_count" -ge 1 ] && echo true || echo false)"

# Test 2: Demand signal is valid JSON
echo ""
echo "2. Demand signal is valid JSON"
latest=$(ls -t "$DEMAND_DIR"/*.json 2>/dev/null | head -1)
if [ -n "$latest" ]; then
  json_valid=$(jq empty "$latest" 2>/dev/null && echo true || echo false)
  assert_eq "Signal is valid JSON" "true" "$json_valid"
  has_keyword=$(jq 'has("keyword")' "$latest" | tr -d '\r')
  assert_eq "Signal has keyword" "true" "$has_keyword"
  has_ts=$(jq 'has("timestamp")' "$latest" | tr -d '\r')
  assert_eq "Signal has timestamp" "true" "$has_ts"
  has_type=$(jq 'has("type")' "$latest" | tr -d '\r')
  assert_eq "Signal has type" "true" "$has_type"
  signal_type=$(jq -r '.type' "$latest" | tr -d '\r')
  assert_eq "Type is demand_signal" "demand_signal" "$signal_type"
else
  echo "  FAIL: No signal file found"
  fail=$((fail + 4))
fi

# Test 3: Multiple queries create multiple signals
echo ""
echo "3. Multiple demand signals"
brain_retrieve_context "another_nonexistent_topic_xyz" "" 3 > /dev/null
brain_retrieve_context "yet_another_missing_topic_abc" "" 3 > /dev/null
signal_count=$(ls "$DEMAND_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
assert_eq "Multiple signals created" "true" "$([ "$signal_count" -ge 3 ] && echo true || echo false)"

# Test 4: Successful query does NOT create demand signal
echo ""
echo "4. Successful query no demand signal"
before_count=$(ls "$DEMAND_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
brain_retrieve_context "adapter" "helm" 3 > /dev/null
after_count=$(ls "$DEMAND_DIR"/*.json 2>/dev/null | wc -l | tr -d ' ')
assert_eq "No new signal on success" "$before_count" "$after_count"

# Test 5: brain_audit --demand works
echo ""
echo "5. brain_audit --demand"
output=$(bash "$BRAIN_AUDIT" --demand 2>&1)
assert_eq "Demand report runs" "true" "$(echo "$output" | grep -q "Demand Signal Report" && echo true || echo false)"
assert_eq "Shows signal count" "true" "$(echo "$output" | grep -q "Total demand signals:" && echo true || echo false)"

# Test 6: brain_audit --demand with no signals
echo ""
echo "6. Empty demand report"
cleanup
output=$(bash "$BRAIN_AUDIT" --demand 2>&1)
assert_eq "Reports zero signals" "true" "$(echo "$output" | grep -q "Total demand signals: 0" && echo true || echo false)"

cleanup

echo ""
echo "======================================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
