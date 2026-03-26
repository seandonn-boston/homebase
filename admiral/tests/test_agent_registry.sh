#!/bin/bash
# shellcheck disable=SC1091,SC2012,SC2034,SC2317
# test_agent_registry.sh — Tests for the agent registry (S-06)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source the registry library
# shellcheck source=../lib/agent_registry.sh
source "$PROJECT_ROOT/admiral/lib/agent_registry.sh"

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

assert_not_empty() {
  local desc="$1" actual="$2"
  if [ -n "$actual" ]; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (got empty string)"
    fail=$((fail + 1))
  fi
}

assert_contains() {
  local desc="$1" needle="$2" haystack="$3"
  if echo "$haystack" | tr -d '\r' | grep -q "$needle"; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (expected to contain '$needle')"
    fail=$((fail + 1))
  fi
}

assert_json_valid() {
  local desc="$1" json="$2"
  if echo "$json" | tr -d '\r' | jq empty 2>/dev/null; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (invalid JSON)"
    fail=$((fail + 1))
  fi
}

echo "Testing agent_registry.sh"
echo "========================="
echo ""

# Test 1: Registry loads successfully
echo "1. Registry initialization"
output=$(registry_init 2>&1 || true)
agent_count=$(registry_count | tr -d '\r')
assert_eq "Registry loads with agents" "true" "$([ "$agent_count" -gt 0 ] && echo true || echo false)"

# Test 2: Lookup by ID
echo ""
echo "2. Lookup by agent ID"
result=$(registry_get_agent "orchestrator" | tr -d '\r')
assert_json_valid "Orchestrator returns valid JSON" "$result"
assert_contains "Orchestrator has correct role" '"role"' "$result"

# Test 3: Lookup nonexistent agent
echo ""
echo "3. Lookup nonexistent agent"
result=$(registry_get_agent "nonexistent-agent-xyz" 2>/dev/null | tr -d '\r')
assert_eq "Nonexistent agent returns empty" "" "$result"

# Test 4: Find by capability
echo ""
echo "4. Find by capability"
result=$(registry_find_by_capability "task_routing" | tr -d '\r')
assert_json_valid "Capability search returns valid JSON" "$result"

# Test 5: Find by tier
echo ""
echo "5. Find by model tier"
result=$(registry_find_by_tier "tier1_flagship" | tr -d '\r')
assert_json_valid "Tier search returns valid JSON" "$result"
assert_contains "Tier 1 includes orchestrator" "orchestrator" "$result"

# Test 6: List all agents
echo ""
echo "6. List all agents"
result=$(registry_list_all | tr -d '\r')
assert_json_valid "Agent list is valid JSON" "$result"
count=$(echo "$result" | jq 'length')
assert_eq "List count matches registry count" "$agent_count" "$count"

# Test 7: Agent has required fields
echo ""
echo "7. Required fields"
result=$(registry_get_agent "orchestrator" | tr -d '\r')
for field in agent_id role model_tier capabilities tools; do
  has_field=$(echo "$result" | jq "has(\"$field\")")
  assert_eq "Orchestrator has '$field'" "true" "$has_field"
done

# Test 8: Tool permissions
echo ""
echo "8. Tool permissions"
result=$(registry_get_agent "orchestrator" | tr -d '\r')
has_tools=$(echo "$result" | jq '.tools | has("allowed")')
assert_eq "Agent has tools.allowed" "true" "$has_tools"
has_denied=$(echo "$result" | jq '.tools | has("denied")')
assert_eq "Agent has tools.denied" "true" "$has_denied"

# Test 9: Validate registry integrity
echo ""
echo "9. Registry validation"
validation_result=$(registry_validate 2>&1 | tr -d '\r')
assert_contains "Validation runs" "valid" "$validation_result"

# Test 10: Multiple agents of same tier
echo ""
echo "10. Multiple agents same tier"
tier2_agents=$(registry_find_by_tier "tier2_workhorse" | tr -d '\r')
tier2_count=$(echo "$tier2_agents" | jq 'length')
assert_eq "Multiple tier2 agents exist" "true" "$([ "$tier2_count" -gt 0 ] && echo true || echo false)"

# Test 11: Find by capability with no matches
echo ""
echo "11. Capability with no matches"
result=$(registry_find_by_capability "nonexistent_capability_xyz" | tr -d '\r')
count=$(echo "$result" | jq 'length')
assert_eq "No matches returns empty array" "0" "$count"

# Test 12: Agent paths (scope)
echo ""
echo "12. Agent scope paths"
result=$(registry_get_agent "orchestrator" | tr -d '\r')
has_paths=$(echo "$result" | jq 'has("paths")')
assert_eq "Agent has paths" "true" "$has_paths"

echo ""
echo "========================="
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
