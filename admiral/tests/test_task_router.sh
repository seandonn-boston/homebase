#!/bin/bash
# shellcheck disable=SC1091,SC2012,SC2034,SC2317
# test_task_router.sh — Tests for S-07 task routing engine
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
source "$PROJECT_ROOT/admiral/lib/task_router.sh"

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

echo "Testing task_router.sh (S-07)"
echo "=============================="
echo ""

# Test 1: Route server logic task
echo "1. Route server logic"
result=$(route_task "server_logic")
result=$(echo "$result" | tr -d '\r')
assert_json_field "Routed" "$result" '.routed' "true"
assert_json_field "Gets backend implementer" "$result" '.agent_id' "backend-implementer"

# Test 2: Route security audit
echo ""
echo "2. Route security audit"
result=$(route_task "security_audit")
result=$(echo "$result" | tr -d '\r')
assert_json_field "Routed" "$result" '.routed' "true"
assert_json_field "Gets security auditor" "$result" '.agent_id' "security-auditor"

# Test 3: Route code review
echo ""
echo "3. Route code review"
result=$(route_task "code_review")
result=$(echo "$result" | tr -d '\r')
assert_json_field "Routed" "$result" '.routed' "true"
assert_json_field "Gets QA agent" "$result" '.agent_id' "qa-agent"

# Test 4: Route UI task
echo ""
echo "4. Route UI task"
result=$(route_task "ui_component")
result=$(echo "$result" | tr -d '\r')
assert_json_field "Routed" "$result" '.routed' "true"
assert_json_field "Gets frontend implementer" "$result" '.agent_id' "frontend-implementer"

# Test 5: Route architecture task
echo ""
echo "5. Route architecture task"
result=$(route_task "architecture")
result=$(echo "$result" | tr -d '\r')
assert_json_field "Routed" "$result" '.routed' "true"
assert_json_field "Gets architect" "$result" '.agent_id' "architect"

# Test 6: Route triage task
echo ""
echo "6. Route triage task"
result=$(route_task "triage")
result=$(echo "$result" | tr -d '\r')
assert_json_field "Routed" "$result" '.routed' "true"
assert_json_field "Gets triage agent" "$result" '.agent_id' "triage-agent"

# Test 7: Route CI/CD task
echo ""
echo "7. Route CI/CD task"
result=$(route_task "ci_cd")
result=$(echo "$result" | tr -d '\r')
assert_json_field "Routed" "$result" '.routed' "true"
assert_json_field "Gets devops agent" "$result" '.agent_id' "devops-agent"

# Test 8: Has justification
echo ""
echo "8. Justification present"
result=$(route_task "server_logic")
result=$(echo "$result" | tr -d '\r')
justification=$(echo "$result" | jq -r '.justification')
assert_eq "Has justification" "true" "$([ -n "$justification" ] && echo true || echo false)"

# Test 9: Has alternatives
echo ""
echo "9. Alternatives present"
result=$(route_task "server_logic")
result=$(echo "$result" | tr -d '\r')
alt_type=$(echo "$result" | jq '.alternatives | type')
assert_eq "Alternatives is array" "\"array\"" "$alt_type"

# Test 10: File-based routing
echo ""
echo "10. File-based routing"
result=$(route_task "unknown_task_type" ".hooks/test.sh")
result=$(echo "$result" | tr -d '\r')
assert_json_field "Routed" "$result" '.routed' "true"
# .hooks/ maps to server_logic which matches backend-implementer
assert_json_field "Routes via file path" "$result" '.agent_id' "backend-implementer"

# Test 11: Priority passed through
echo ""
echo "11. Priority"
result=$(route_task "server_logic" "" "critical")
result=$(echo "$result" | tr -d '\r')
assert_json_field "Priority set" "$result" '.priority' "critical"

# Test 12: Output is valid JSON
echo ""
echo "12. Output validity"
result=$(route_task "server_logic")
json_valid=$(echo "$result" | tr -d '\r' | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Output is valid JSON" "true" "$json_valid"

echo ""
echo "=============================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
