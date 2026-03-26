#!/bin/bash
# test_governance_heartbeat.sh — Tests for S-03 governance heartbeat monitor
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOK="$PROJECT_ROOT/.hooks/governance_heartbeat_monitor.sh"
STATE_DIR="$PROJECT_ROOT/.admiral"
STATE_FILE="$STATE_DIR/session_state.json"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"

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

assert_json_field() {
  local desc="$1" json="$2" field="$3" expected="$4"
  local actual
  actual=$(echo "$json" | tr -d '\r' | jq -r "$field" 2>/dev/null)
  assert_eq "$desc" "$expected" "$actual"
}

setup() {
  mkdir -p "$STATE_DIR"
  echo '{"session_id":"heartbeat-test","trace_id":"trace-hb","tool_uses":1,"hook_state":{}}' > "$STATE_FILE"
}

cleanup() {
  rm -f "$STATE_FILE" "$STATE_DIR/event_log.jsonl" 2>/dev/null || true
}

echo "Testing governance_heartbeat_monitor.sh (S-03)"
echo "================================================"
echo ""

# Test 1: First run — initializes heartbeat state
echo "1. First run initialization"
setup
result=$(echo '{"tool_name":"Read"}' | bash "$HOOK" 2>/dev/null)
assert_json_field "Reports healthy" "$result" '.healthy' "true"
assert_json_field "Zero alerts" "$result" '.alerts' "0"

# Verify state was written
hb_state=$(jq '.hook_state.governance_heartbeat' "$STATE_FILE" 2>/dev/null | tr -d '\r')
has_sentinel=$(echo "$hb_state" | jq 'has("sentinel_last_heartbeat")' 2>/dev/null | tr -d '\r')
assert_eq "State has sentinel heartbeat" "true" "$has_sentinel"
has_arbiter=$(echo "$hb_state" | jq 'has("arbiter_last_heartbeat")' 2>/dev/null | tr -d '\r')
assert_eq "State has arbiter heartbeat" "true" "$has_arbiter"

# Test 2: Recent heartbeat — still healthy
echo ""
echo "2. Recent heartbeat (within interval)"
# State already has fresh heartbeats from test 1
result=$(echo '{"tool_name":"Read"}' | bash "$HOOK" 2>/dev/null)
assert_json_field "Still healthy" "$result" '.healthy' "true"
assert_json_field "Still zero alerts" "$result" '.alerts' "0"

# Test 3: Stale heartbeat — sentinel missed
echo ""
echo "3. Stale heartbeat detection"
setup
# Set sentinel heartbeat to 200 seconds ago (exceeds 60s interval)
NOW=$(date +%s)
STALE_TIME=$((NOW - 200))
jq --argjson t "$STALE_TIME" '.hook_state.governance_heartbeat = {
  "sentinel_last_heartbeat": $t,
  "sentinel_missed_count": 0,
  "arbiter_last_heartbeat": '"$NOW"',
  "arbiter_missed_count": 0
}' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"

result=$(echo '{"tool_name":"Read"}' | bash "$HOOK" 2>/dev/null)
# First miss — below threshold (threshold=2), so still no alert
missed=$(jq '.hook_state.governance_heartbeat.sentinel_missed_count' "$STATE_FILE" 2>/dev/null | tr -d '\r')
assert_eq "Sentinel missed count incremented" "1" "$missed"

# Test 4: Multiple misses — alert triggered
echo ""
echo "4. Alert after threshold exceeded"
setup
NOW=$(date +%s)
STALE_TIME=$((NOW - 200))
jq --argjson t "$STALE_TIME" '.hook_state.governance_heartbeat = {
  "sentinel_last_heartbeat": $t,
  "sentinel_missed_count": 1,
  "arbiter_last_heartbeat": '"$NOW"',
  "arbiter_missed_count": 0
}' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"

result=$(echo '{"tool_name":"Read"}' | bash "$HOOK" 2>/dev/null)
assert_json_field "Not healthy" "$result" '.healthy' "false"
assert_json_field "Has alerts" "$result" '.alerts' "1"
assert_json_field "Warning severity" "$result" '.severity' "warning"

# Test 5: Fresh heartbeat resets missed count
echo ""
echo "5. Fresh heartbeat resets missed count"
setup
NOW=$(date +%s)
jq --argjson t "$NOW" '.hook_state.governance_heartbeat = {
  "sentinel_last_heartbeat": $t,
  "sentinel_missed_count": 3,
  "arbiter_last_heartbeat": $t,
  "arbiter_missed_count": 2
}' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"

result=$(echo '{"tool_name":"Read"}' | bash "$HOOK" 2>/dev/null)
assert_json_field "Healthy after fresh heartbeat" "$result" '.healthy' "true"
sentinel_missed=$(jq '.hook_state.governance_heartbeat.sentinel_missed_count' "$STATE_FILE" 2>/dev/null | tr -d '\r')
assert_eq "Sentinel missed count reset" "0" "$sentinel_missed"

# Test 6: Both agents stale
echo ""
echo "6. Both agents stale"
setup
NOW=$(date +%s)
STALE_TIME=$((NOW - 200))
jq --argjson t "$STALE_TIME" '.hook_state.governance_heartbeat = {
  "sentinel_last_heartbeat": $t,
  "sentinel_missed_count": 2,
  "arbiter_last_heartbeat": $t,
  "arbiter_missed_count": 2
}' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"

result=$(echo '{"tool_name":"Read"}' | bash "$HOOK" 2>/dev/null)
assert_json_field "Not healthy" "$result" '.healthy' "false"
assert_json_field "Two alerts" "$result" '.alerts' "2"

# Test 7: Event logging
echo ""
echo "7. Event logging"
setup
echo '{"tool_name":"Read"}' | bash "$HOOK" > /dev/null 2>&1
assert_eq "Event log exists" "true" "$([ -f "$STATE_DIR/event_log.jsonl" ] && echo true || echo false)"
last_line=$(tail -1 "$STATE_DIR/event_log.jsonl" 2>/dev/null || echo '{}')
last_event=$(echo "$last_line" | tr -d '\r' | jq -r '.event // "none"' 2>/dev/null || echo "none")
assert_eq "Heartbeat check event logged" "heartbeat_check" "$last_event"

# Test 8: Output is always valid JSON
echo ""
echo "8. Output validity"
setup
result=$(echo '{}' | bash "$HOOK" 2>/dev/null)
json_valid=$(echo "$result" | tr -d '\r' | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Output is valid JSON" "true" "$json_valid"

# Test 9: Exit code is always 0 (advisory only)
echo ""
echo "9. Exit code behavior"
setup
NOW=$(date +%s)
STALE_TIME=$((NOW - 500))
jq --argjson t "$STALE_TIME" '.hook_state.governance_heartbeat = {
  "sentinel_last_heartbeat": $t,
  "sentinel_missed_count": 10,
  "arbiter_last_heartbeat": $t,
  "arbiter_missed_count": 10
}' "$STATE_FILE" > "${STATE_FILE}.tmp" && mv "${STATE_FILE}.tmp" "$STATE_FILE"

exit_code=0
echo '{"tool_name":"Read"}' | bash "$HOOK" > /dev/null 2>&1 || exit_code=$?
assert_eq "Always exits 0 (advisory)" "0" "$exit_code"

cleanup

echo ""
echo "================================================"
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
