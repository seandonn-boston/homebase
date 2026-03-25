#!/bin/bash
# test_execution_patterns.sh — Tests for S-12 to S-17
set -euo pipefail
# shellcheck disable=SC2034,SC2317

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TEST_DIR=$(mktemp -d)
export CLAUDE_PROJECT_DIR="$TEST_DIR"
mkdir -p "$TEST_DIR/.admiral"

source "$PROJECT_ROOT/admiral/lib/parallel_coordinator.sh"
source "$PROJECT_ROOT/admiral/lib/quality_gates.sh"
source "$PROJECT_ROOT/admiral/lib/alerting.sh"
source "$PROJECT_ROOT/admiral/lib/persistent_events.sh"

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

echo "Testing Execution Patterns (S-12 to S-17)"
echo "==========================================="
echo ""

# === S-12: Parallel Coordinator ===
echo "--- S-12: Parallel Coordinator ---"

# Test 1: Create parallel plan
echo "1. Create plan"
tasks='[{"task_id":"t1","agent_id":"a1","depends_on":[],"task":"Task 1"},{"task_id":"t2","agent_id":"a2","depends_on":["t1"],"task":"Task 2"},{"task_id":"t3","agent_id":"a3","depends_on":[],"task":"Task 3"}]'
plan=$(parallel_create_plan "test-plan" "$tasks")
assert_eq "Plan file created" "true" "$([ -f "$plan" ] && echo true || echo false)"

# Test 2: Plan status
echo ""
echo "2. Plan status"
status=$(parallel_status "$plan")
status=$(echo "$status" | tr -d '\r')
total=$(echo "$status" | jq '.total')
assert_eq "3 tasks in plan" "3" "$total"
pending=$(echo "$status" | jq '.pending')
assert_eq "All pending" "3" "$pending"

# Test 3: Start and complete task
echo ""
echo "3. Task lifecycle"
parallel_start_task "$plan" "t1"
status=$(parallel_status "$plan")
running=$(echo "$status" | tr -d '\r' | jq '.running')
assert_eq "1 running" "1" "$running"

parallel_complete_task "$plan" "t1" "success"
status=$(parallel_status "$plan")
completed=$(echo "$status" | tr -d '\r' | jq '.completed')
assert_eq "1 completed" "1" "$completed"

# Test 4: Fail task
echo ""
echo "4. Fail task"
parallel_start_task "$plan" "t3"
parallel_fail_task "$plan" "t3" "timeout"
status=$(parallel_status "$plan")
failed=$(echo "$status" | tr -d '\r' | jq '.failed')
assert_eq "1 failed" "1" "$failed"

# === S-13/S-14: Quality Gates ===
echo ""
echo "--- S-13/S-14: Quality Gates ---"

# Test 5: Review checklist structure
echo "5. Review checklist"
checklist=$(quality_review_checklist)
checklist=$(echo "$checklist" | tr -d '\r')
is_array=$(echo "$checklist" | jq 'type == "array"')
assert_eq "Checklist is array" "true" "$is_array"
item_count=$(echo "$checklist" | jq 'length')
assert_eq "Has checklist items" "true" "$([ "$item_count" -ge 4 ] && echo true || echo false)"

# Test 6: Checklist items have structure
echo ""
echo "6. Checklist item structure"
first_item=$(echo "$checklist" | jq '.[0]')
has_item=$(echo "$first_item" | jq 'has("item")' | tr -d '\r')
assert_eq "Item has name" "true" "$has_item"
has_status=$(echo "$first_item" | jq 'has("status")' | tr -d '\r')
assert_eq "Item has status" "true" "$has_status"

# === S-15: Alerting ===
echo ""
echo "--- S-15: Alerting ---"

# Test 7: Send alert
echo "7. Send alert"
alert_result=$(alert_send "warning" "test_hook" "Test alert message" "log")
alert_result=$(echo "$alert_result" | tr -d '\r')
delivered=$(echo "$alert_result" | jq -r '.delivered')
assert_eq "Alert delivered" "true" "$delivered"

# Test 8: Send critical alert
echo ""
echo "8. Critical alert"
alert_send "critical" "scope_guard" "Critical scope violation" "log" > /dev/null

# Test 9: Alert summary
echo ""
echo "9. Alert summary"
summary=$(alert_summary)
summary=$(echo "$summary" | tr -d '\r')
total=$(echo "$summary" | jq '.total')
assert_eq "Has alerts" "true" "$([ "$total" -ge 2 ] && echo true || echo false)"
critical=$(echo "$summary" | jq '.critical')
assert_eq "Has critical" "true" "$([ "$critical" -ge 1 ] && echo true || echo false)"

# Test 10: Alert list
echo ""
echo "10. Alert list"
list=$(alert_list)
list=$(echo "$list" | tr -d '\r')
is_array=$(echo "$list" | jq 'type == "array"')
assert_eq "List is array" "true" "$is_array"

# Test 11: Alert list filtered
echo ""
echo "11. Filtered alert list"
list=$(alert_list "critical")
list=$(echo "$list" | tr -d '\r')
count=$(echo "$list" | jq 'length')
assert_eq "Filtered to critical" "1" "$count"

# === S-16: Persistent Events ===
echo ""
echo "--- S-16: Persistent Events ---"

# Test 12: Write event
echo "12. Write event"
event_store_write '{"event":"test_event","timestamp":"2026-03-25T00:00:00Z","data":"hello"}'
assert_eq "Event file exists" "true" "$([ -f "$EVENT_STORE_FILE" ] && echo true || echo false)"

# Test 13: Query events
echo ""
echo "13. Query events"
event_store_write '{"event":"hook_fired","timestamp":"2026-03-25T00:01:00Z","hook":"test"}'
result=$(event_store_query "hook_fired")
result=$(echo "$result" | tr -d '\r')
count=$(echo "$result" | jq 'length')
assert_eq "Finds matching events" "1" "$count"

# Test 14: Event store stats
echo ""
echo "14. Event store stats"
stats=$(event_store_stats)
stats=$(echo "$stats" | tr -d '\r')
total=$(echo "$stats" | jq '.total_events')
assert_eq "Has events" "true" "$([ "$total" -ge 2 ] && echo true || echo false)"

# === S-17: Health Report ===
echo ""
echo "--- S-17: Health Report ---"

# Test 15: Health report runs
echo "15. Health report"
export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
result=$(bash "$PROJECT_ROOT/admiral/bin/health_report" 2>/dev/null)
result=$(echo "$result" | tr -d '\r')
json_valid=$(echo "$result" | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Health report valid JSON" "true" "$json_valid"

# Test 16: Health report structure
echo ""
echo "16. Health report structure"
has_status=$(echo "$result" | jq 'has("status")')
assert_eq "Has status" "true" "$has_status"
has_subsystems=$(echo "$result" | jq 'has("subsystems")')
assert_eq "Has subsystems" "true" "$has_subsystems"
has_hooks=$(echo "$result" | jq '.subsystems | has("hooks")')
assert_eq "Has hooks subsystem" "true" "$has_hooks"
has_brain=$(echo "$result" | jq '.subsystems | has("brain")')
assert_eq "Has brain subsystem" "true" "$has_brain"

# Cleanup
rm -rf "$TEST_DIR"

echo ""
echo "==========================================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
