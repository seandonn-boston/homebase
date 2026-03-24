#!/bin/bash
# Admiral Framework — Spec Compliance Test Runner
# Runs all spec compliance tests and produces a summary report.
# Exit code: 0=all pass, 1=failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0
PART_RESULTS=()

run_part() {
  local part_name="$1"
  local test_file="$2"

  if [ ! -f "$test_file" ]; then
    TOTAL_SKIP=$((TOTAL_SKIP + 1))
    PART_RESULTS+=("SKIP: $part_name — test file not found")
    return
  fi

  local rc=0
  local output
  output=$(bash "$test_file" 2>&1) || rc=$?

  # Extract pass/fail counts from last line
  local pass fail
  pass=$(echo "$output" | sed -n 's/.*\([0-9][0-9]*\) passed.*/\1/p' | tail -1)
  fail=$(echo "$output" | sed -n 's/.*\([0-9][0-9]*\) failed.*/\1/p' | tail -1)
  [ -z "$pass" ] && pass=0
  [ -z "$fail" ] && fail=0

  if [ "$rc" -eq 0 ]; then
    TOTAL_PASS=$((TOTAL_PASS + pass))
    PART_RESULTS+=("PASS: $part_name ($pass tests)")
  else
    TOTAL_PASS=$((TOTAL_PASS + pass))
    TOTAL_FAIL=$((TOTAL_FAIL + fail))
    PART_RESULTS+=("FAIL: $part_name ($pass passed, $fail failed)")
  fi
}

echo "=== Admiral Spec Compliance Test Suite ==="
echo ""

run_part "Part 1 — Strategy" "$SCRIPT_DIR/test_part01_strategy.sh"
run_part "Part 2 — Context" "$SCRIPT_DIR/test_part02_context.sh"
run_part "Part 3 — Enforcement" "$SCRIPT_DIR/test_part03_enforcement.sh"
run_part "Part 4 — Fleet" "$SCRIPT_DIR/test_part04_fleet.sh"
run_part "Part 5 — Brain" "$SCRIPT_DIR/test_part05_brain.sh"
run_part "Part 6 — Execution" "$SCRIPT_DIR/test_part06_execution.sh"
run_part "Part 7 — Quality" "$SCRIPT_DIR/test_part07_quality.sh"
run_part "Part 8 — Operations" "$SCRIPT_DIR/test_part08_operations.sh"
run_part "Part 9 — Platform" "$SCRIPT_DIR/test_part09_platform.sh"
run_part "Part 10 — Admiral" "$SCRIPT_DIR/test_part10_admiral.sh"
run_part "Part 11 — Protocols" "$SCRIPT_DIR/test_part11_protocols.sh"
run_part "Part 12 — Data Ecosystem" "$SCRIPT_DIR/test_part12_data.sh"
run_part "Part 13 — MCP" "$SCRIPT_DIR/test_part13_mcp.sh"
run_part "Reference Constants" "$SCRIPT_DIR/test_reference_constants.sh"

echo "--- Results by Part ---"
for result in "${PART_RESULTS[@]}"; do
  echo "  $result"
done

echo ""
echo "========================================="
echo "Spec Compliance: $TOTAL_PASS passed, $TOTAL_FAIL failed, $TOTAL_SKIP skipped"
echo "========================================="

if [ "$TOTAL_FAIL" -gt 0 ]; then
  exit 1
fi
