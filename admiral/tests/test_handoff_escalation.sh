#!/bin/bash
# test_handoff_escalation.sh — Tests for S-10 (handoff) and S-11 (escalation)
set -euo pipefail
# shellcheck disable=SC2034,SC2317

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TEST_DIR=$(mktemp -d)
export CLAUDE_PROJECT_DIR="$TEST_DIR"
mkdir -p "$TEST_DIR/admiral/bin"
cp "$PROJECT_ROOT/admiral/bin/brain_record" "$TEST_DIR/admiral/bin/"
chmod +x "$TEST_DIR/admiral/bin/brain_record"

source "$PROJECT_ROOT/admiral/lib/handoff.sh"
source "$PROJECT_ROOT/admiral/lib/escalation.sh"

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

echo "Testing Handoff Protocol (S-10)"
echo "================================"
echo ""

# Test 1: Create handoff
echo "1. Create handoff"
filepath=$(handoff_create "orchestrator" "backend-implementer" "Implement API endpoint" "Working endpoint with tests")
assert_eq "File created" "true" "$([ -f "$filepath" ] && echo true || echo false)"

# Test 2: Handoff has required fields
echo ""
echo "2. Required fields"
status=$(jq -r '.status' "$filepath" | tr -d '\r')
assert_eq "Status is pending" "pending" "$status"
from=$(jq -r '.from_agent' "$filepath" | tr -d '\r')
assert_eq "From agent set" "orchestrator" "$from"

# Test 3: Validate handoff
echo ""
echo "3. Validate handoff"
result=$(handoff_validate "$filepath")
valid=$(echo "$result" | tr -d '\r' | jq -r '.valid')
assert_eq "Handoff is valid" "true" "$valid"

# Test 4: Accept handoff
echo ""
echo "4. Accept handoff"
handoff_accept "$filepath"
status=$(jq -r '.status' "$filepath" | tr -d '\r')
assert_eq "Status is accepted" "accepted" "$status"

# Test 5: Complete handoff
echo ""
echo "5. Complete handoff"
handoff_complete "$filepath"
status=$(jq -r '.status' "$filepath" | tr -d '\r')
assert_eq "Status is completed" "completed" "$status"
has_completed_at=$(jq 'has("completed_at")' "$filepath" | tr -d '\r')
assert_eq "Has completed_at" "true" "$has_completed_at"

# Test 6: Reject handoff
echo ""
echo "6. Reject handoff"
fp2=$(handoff_create "orchestrator" "qa-agent" "Review code" "Review report")
handoff_reject "$fp2" "Agent unavailable"
status=$(jq -r '.status' "$fp2" | tr -d '\r')
assert_eq "Status is rejected" "rejected" "$status"
reason=$(jq -r '.rejection_reason' "$fp2" | tr -d '\r')
assert_eq "Has rejection reason" "Agent unavailable" "$reason"

# Test 7: List handoffs
echo ""
echo "7. List handoffs"
result=$(handoff_list)
result=$(echo "$result" | tr -d '\r')
count=$(echo "$result" | jq 'length')
assert_eq "Lists all handoffs" "true" "$([ "$count" -ge 2 ] && echo true || echo false)"

# Test 8: List with status filter
echo ""
echo "8. List filtered"
result=$(handoff_list "completed")
result=$(echo "$result" | tr -d '\r')
count=$(echo "$result" | jq 'length')
assert_eq "Filters by status" "1" "$count"

# Test 9: Self-handoff rejected
echo ""
echo "9. Self-handoff validation"
exit_code=0
handoff_create "agent-a" "agent-a" "Task" "Deliverable" 2>/dev/null || exit_code=$?
assert_eq "Self-handoff rejected" "1" "$exit_code"

# Test 10: Missing fields rejected
echo ""
echo "10. Missing fields"
exit_code=0
handoff_create "" "agent-b" "" "" 2>/dev/null || exit_code=$?
assert_eq "Missing fields rejected" "1" "$exit_code"

echo ""
echo ""
echo "Testing Escalation Pipeline (S-11)"
echo "==================================="
echo ""

# Test 11: Create escalation
echo "11. Create escalation"
filepath=$(escalation_create "backend-implementer" "scope" "Need to modify protected file" "aiStrat/ needs update")
assert_eq "File created" "true" "$([ -f "$filepath" ] && echo true || echo false)"
status=$(jq -r '.status' "$filepath" | tr -d '\r')
assert_eq "Status is intake" "intake" "$status"

# Test 12: Intake step completed
echo ""
echo "12. Intake step"
intake_done=$(jq '.steps.intake.completed' "$filepath" | tr -d '\r')
assert_eq "Intake completed" "true" "$intake_done"

# Test 13: Brain precedent query
echo ""
echo "13. Brain precedent query"
escalation_query_precedent "$filepath"
brain_done=$(jq '.steps.brain_query.completed' "$filepath" | tr -d '\r')
assert_eq "Brain query completed" "true" "$brain_done"

# Test 14: Generate resolution paths
echo ""
echo "14. Resolution paths"
escalation_generate_paths "$filepath" '["Request Admiral override", "Work around the protected file", "Escalate to human"]'
paths_done=$(jq '.steps.resolution_paths.completed' "$filepath" | tr -d '\r')
assert_eq "Paths generated" "true" "$paths_done"
path_count=$(jq '.steps.resolution_paths.paths | length' "$filepath" | tr -d '\r')
assert_eq "3 paths" "3" "$path_count"

# Test 15: Admiral decision
echo ""
echo "15. Admiral decision"
escalation_decide "$filepath" "Grant temporary override" "One-time exception for spec update"
decided=$(jq '.steps.admiral_decision.completed' "$filepath" | tr -d '\r')
assert_eq "Decision recorded" "true" "$decided"
status=$(jq -r '.status' "$filepath" | tr -d '\r')
assert_eq "Status is decided" "decided" "$status"

# Test 16: Record outcome
echo ""
echo "16. Outcome recording"
escalation_record_outcome "$filepath" "Override granted, file updated" "Spec updated successfully"
outcome_done=$(jq '.steps.outcome.completed' "$filepath" | tr -d '\r')
assert_eq "Outcome recorded" "true" "$outcome_done"
status=$(jq -r '.status' "$filepath" | tr -d '\r')
assert_eq "Status is resolved" "resolved" "$status"

# Test 17: Invalid category rejected
echo ""
echo "17. Invalid escalation category"
exit_code=0
escalation_create "agent" "invalid_category" "Test" "Context" 2>/dev/null || exit_code=$?
assert_eq "Invalid category rejected" "1" "$exit_code"

# Test 18: List escalations
echo ""
echo "18. List escalations"
result=$(escalation_list)
result=$(echo "$result" | tr -d '\r')
count=$(echo "$result" | jq 'length')
assert_eq "Lists escalations" "true" "$([ "$count" -ge 1 ] && echo true || echo false)"

# Cleanup
rm -rf "$TEST_DIR"

echo ""
echo "==================================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
