#!/bin/bash
# test_enforcement_coverage.sh — Tests for the enforcement coverage report script
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COVERAGE_SCRIPT="$PROJECT_ROOT/admiral/bin/enforcement_coverage.sh"
MAP_FILE="$PROJECT_ROOT/admiral/docs/standing-orders-enforcement-map.json"

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
  if echo "$haystack" | grep -q "$needle"; then
    echo "  PASS: $desc"
    pass=$((pass + 1))
  else
    echo "  FAIL: $desc (expected to contain '$needle')"
    fail=$((fail + 1))
  fi
}

echo "Testing enforcement_coverage.sh"
echo "================================"
echo ""

# Test 1: Script exists and is executable
echo "1. Script existence and executability"
assert_eq "Script exists" "true" "$([ -f "$COVERAGE_SCRIPT" ] && echo true || echo false)"
assert_eq "Script is executable" "true" "$([ -x "$COVERAGE_SCRIPT" ] && echo true || echo false)"

# Test 2: Map file is valid JSON
echo ""
echo "2. Enforcement map JSON validity"
assert_eq "Map file exists" "true" "$([ -f "$MAP_FILE" ] && echo true || echo false)"
jq_valid="$(jq empty "$MAP_FILE" 2>/dev/null && echo true || echo false)"
assert_eq "Map file is valid JSON" "true" "$jq_valid"

# Test 3: Map file has all 16 SOs
echo ""
echo "3. Standing Orders completeness"
so_count=$(jq '.standing_orders | length' "$MAP_FILE" | tr -d '\r')
assert_eq "16 Standing Orders in map" "16" "$so_count"

# Test 4: Summary fields are consistent
echo ""
echo "4. Summary consistency"
summary_total=$(jq '.summary.total_standing_orders' "$MAP_FILE" | tr -d '\r')
assert_eq "Summary total matches array length" "$so_count" "$summary_total"

hook_enforced=$(jq '.summary.hook_enforced' "$MAP_FILE" | tr -d '\r')
actual_hook_enforced=$(jq '[.standing_orders[] | select(.hooks | length > 0)] | length' "$MAP_FILE" | tr -d '\r')
assert_eq "Hook enforced count matches" "$hook_enforced" "$actual_hook_enforced"

# Test 5: Each SO has required fields
echo ""
echo "5. Required fields per SO"
missing_fields=0
for field in id title enforcement_type hooks coverage gap phase3_plan; do
  count=$(jq "[.standing_orders[] | select(has(\"$field\"))] | length" "$MAP_FILE" | tr -d '\r')
  if [ "$count" != "16" ]; then
    echo "  FAIL: Field '$field' missing from some SOs ($count/16)"
    missing_fields=$((missing_fields + 1))
    fail=$((fail + 1))
  fi
done
if [ "$missing_fields" -eq 0 ]; then
  echo "  PASS: All required fields present in all SOs"
  pass=$((pass + 1))
fi

# Test 6: Enforcement types are valid
echo ""
echo "6. Enforcement type validity"
valid_types='["hard-block","soft-warning","instruction-embedded","guidance-only"]'
invalid=$(jq --argjson valid "$valid_types" '[.standing_orders[].enforcement_type] | map(select(. as $t | $valid | index($t) | not))' "$MAP_FILE" | tr -d '\r')
assert_eq "All enforcement types valid" "[]" "$invalid"

# Test 7: Hook references point to real files
echo ""
echo "7. Hook file existence"
all_hooks_exist="true"
while IFS= read -r hook_name; do
  hook_name=$(echo "$hook_name" | tr -d '\r"')
  if [ -n "$hook_name" ] && [ ! -f "$PROJECT_ROOT/.hooks/$hook_name" ]; then
    echo "  FAIL: Referenced hook '$hook_name' not found in .hooks/"
    all_hooks_exist="false"
    fail=$((fail + 1))
  fi
done < <(jq -r '.standing_orders[].hooks[]?.name' "$MAP_FILE")
if [ "$all_hooks_exist" = "true" ]; then
  echo "  PASS: All referenced hooks exist on disk"
  pass=$((pass + 1))
fi

# Test 8: Coverage script runs and produces JSON
echo ""
echo "8. Coverage script output"
output=$(bash "$COVERAGE_SCRIPT" 2>&1 || true)
assert_contains "Outputs coverage percentage" "Coverage:" "$output"
assert_contains "Outputs JSON summary" "JSON Summary:" "$output"
assert_contains "Reports critical gaps" "CRITICAL GAPS:" "$output"

# Test 9: Known enforcement mappings are correct
echo ""
echo "9. Known enforcement correctness"
so03_type=$(jq -r '.standing_orders[] | select(.id == "SO-03") | .enforcement_type' "$MAP_FILE" | tr -d '\r')
assert_eq "SO-03 is hard-block" "hard-block" "$so03_type"

so10_type=$(jq -r '.standing_orders[] | select(.id == "SO-10") | .enforcement_type' "$MAP_FILE" | tr -d '\r')
assert_eq "SO-10 is hard-block" "hard-block" "$so10_type"

so14_cov=$(jq -r '.standing_orders[] | select(.id == "SO-14") | .coverage' "$MAP_FILE" | tr -d '\r')
assert_eq "SO-14 is critical_gap" "critical_gap" "$so14_cov"

so04_type=$(jq -r '.standing_orders[] | select(.id == "SO-04") | .enforcement_type' "$MAP_FILE" | tr -d '\r')
assert_eq "SO-04 is guidance-only" "guidance-only" "$so04_type"

# Test 10: Coverage script exits 1 when critical gaps exist
echo ""
echo "10. Exit code behavior"
exit_code=0
bash "$COVERAGE_SCRIPT" > /dev/null 2>&1 || exit_code=$?
assert_eq "Exits 1 with critical gaps" "1" "$exit_code"

echo ""
echo "================================"
echo "Results: $pass passed, $fail failed"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
