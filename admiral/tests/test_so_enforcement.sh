#!/bin/bash
# test_so_enforcement.sh — Tests for Standing Orders enforcement library and completeness report
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

export CLAUDE_PROJECT_DIR="$PROJECT_ROOT"
source "$PROJECT_ROOT/admiral/lib/so_enforcement.sh"

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

BASIC_PAYLOAD='{"tool_name":"Read","tool_input":{"file_path":"test.txt"}}'
BASIC_STATE='{"session_id":"test","agent_id":"orchestrator","tool_call_count":5,"hook_state":{}}'

echo "Testing SO Enforcement Library (Stream 29)"
echo "============================================"
echo ""

# Test 1: All 16 SO functions exist
echo "1. All SO functions defined"
for i in $(seq -w 1 16); do
  func_name="so_${i}_"
  exists=$(type -t "$func_name"* &>/dev/null && echo true || echo false)
done
# Check via grep instead
func_count=$(grep -c '^so_[0-9][0-9]_' "$PROJECT_ROOT/admiral/lib/so_enforcement.sh" || echo "0")
assert_eq "16 SO functions" "true" "$([ "$func_count" -ge 16 ] && echo true || echo false)"

# Test 2: SO-01 returns valid JSON
echo ""
echo "2. SO-01 output"
result=$(so_01_identity_discipline "$BASIC_PAYLOAD" "$BASIC_STATE")
result=$(echo "$result" | tr -d '\r')
valid=$(echo "$result" | jq empty 2>/dev/null && echo true || echo false)
assert_eq "SO-01 valid JSON" "true" "$valid"

# Test 3: SO-04 detects absolute confidence
echo ""
echo "3. SO-04 confidence detection"
payload='{"tool_name":"Write","tool_input":{"content":"This is 100% certain to work"}}'
result=$(so_04_context_honesty "$payload" "$BASIC_STATE")
result=$(echo "$result" | tr -d '\r')
severity=$(echo "$result" | jq -r '.severity')
assert_eq "SO-04 flags absolute confidence" "warning" "$severity"

# Test 4: SO-04 no false positive on normal content
echo ""
echo "4. SO-04 no false positive"
payload='{"tool_name":"Write","tool_input":{"content":"This should work correctly"}}'
result=$(so_04_context_honesty "$payload" "$BASIC_STATE")
result=$(echo "$result" | tr -d '\r')
severity=$(echo "$result" | jq -r '.severity')
assert_eq "No false positive" "info" "$severity"

# Test 5: SO-05 detects high-impact actions
echo ""
echo "5. SO-05 high-impact detection"
payload='{"tool_name":"Edit","tool_input":{"new_string":"DROP TABLE users"}}'
result=$(so_05_decision_authority "$payload" "$BASIC_STATE")
result=$(echo "$result" | tr -d '\r')
severity=$(echo "$result" | jq -r '.severity')
assert_eq "SO-05 flags DROP TABLE" "warning" "$severity"

# Test 6: SO-07 checkpoint reminder
echo ""
echo "6. SO-07 checkpoint reminder"
state='{"session_id":"test","tool_call_count":25,"hook_state":{"checkpointing":{"last_checkpoint_tool_call":0}}}'
result=$(so_07_checkpointing "$BASIC_PAYLOAD" "$state")
result=$(echo "$result" | tr -d '\r')
alert=$(echo "$result" | jq -r '.alert')
assert_eq "SO-07 reminds after 20+ calls" "true" "$(echo "$alert" | grep -q "checkpoint" && echo true || echo false)"

# Test 7: SO-07 no reminder when recent
echo ""
echo "7. SO-07 no reminder when recent"
state='{"session_id":"test","tool_call_count":5,"hook_state":{"checkpointing":{"last_checkpoint_tool_call":3}}}'
result=$(so_07_checkpointing "$BASIC_PAYLOAD" "$state")
result=$(echo "$result" | tr -d '\r')
alert=$(echo "$result" | jq -r '.alert')
assert_eq "No reminder when recent" "" "$alert"

# Test 8: SO-13 detects sycophantic patterns
echo ""
echo "8. SO-13 sycophancy detection"
payload='{"tool_name":"Write","tool_input":{"content":"You'\''re absolutely right, couldn'\''t agree more"}}'
result=$(so_13_bias_awareness "$payload" "$BASIC_STATE")
result=$(echo "$result" | tr -d '\r')
severity=$(echo "$result" | jq -r '.severity')
assert_eq "SO-13 flags sycophancy" "warning" "$severity"

# Test 9: SO-14 detects regulated domains
echo ""
echo "9. SO-14 regulated domain detection"
payload='{"tool_name":"Write","tool_input":{"content":"This must comply with HIPAA requirements"}}'
result=$(so_14_compliance_ethics "$payload" "$BASIC_STATE")
result=$(echo "$result" | tr -d '\r')
severity=$(echo "$result" | jq -r '.severity')
assert_eq "SO-14 flags HIPAA" "warning" "$severity"

# Test 10: so_enforce_all runs all checks
echo ""
echo "10. Enforce all"
result=$(so_enforce_all "$BASIC_PAYLOAD" "$BASIC_STATE")
result=$(echo "$result" | tr -d '\r')
valid=$(echo "$result" | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Enforce all valid JSON" "true" "$valid"
has_count=$(echo "$result" | jq 'has("alert_count")')
assert_eq "Has alert_count" "true" "$has_count"

# Test 11: Completeness report runs
echo ""
echo "11. SO completeness report"
result=$(bash "$PROJECT_ROOT/admiral/bin/so_completeness_report" 2>/dev/null)
result=$(echo "$result" | tr -d '\r')
valid=$(echo "$result" | jq empty 2>/dev/null && echo true || echo false)
assert_eq "Report valid JSON" "true" "$valid"
functions=$(echo "$result" | jq '.enforcement_functions')
assert_eq "16 functions defined" "16" "$functions"

# Test 12: Completeness report structure
echo ""
echo "12. Report structure"
has_completeness=$(echo "$result" | jq 'has("completeness")')
assert_eq "Has completeness field" "true" "$has_completeness"
has_coverage=$(echo "$result" | jq 'has("coverage_percentage")')
assert_eq "Has coverage percentage" "true" "$has_coverage"

echo ""
echo "============================================"
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
