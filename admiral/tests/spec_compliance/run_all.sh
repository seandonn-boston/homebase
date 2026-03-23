#!/bin/bash
# Admiral Framework — Spec Compliance Test Runner
# Runs all spec compliance tests and reports aggregate results.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0
FAILED_SUITES=""

for test_file in "$SCRIPT_DIR"/test_part*.sh; do
  [ -f "$test_file" ] || continue
  SUITE_NAME=$(basename "$test_file" .sh)
  echo ""
  echo "========================================"
  echo "  Running: $SUITE_NAME"
  echo "========================================"

  EXIT=0
  OUTPUT=$(bash "$test_file" 2>&1) || EXIT=$?
  echo "$OUTPUT"

  # Extract pass/fail counts from last line matching "Results:"
  PASS=$(echo "$OUTPUT" | grep -oP '\d+(?= passed)' | tail -1)
  FAIL=$(echo "$OUTPUT" | grep -oP '\d+(?= failed)' | tail -1)
  SKIP=$(echo "$OUTPUT" | grep -oP '\d+(?= skipped)' | tail -1)

  TOTAL_PASS=$((TOTAL_PASS + ${PASS:-0}))
  TOTAL_FAIL=$((TOTAL_FAIL + ${FAIL:-0}))
  TOTAL_SKIP=$((TOTAL_SKIP + ${SKIP:-0}))

  if [ "$EXIT" -ne 0 ]; then
    FAILED_SUITES+="  $SUITE_NAME\n"
  fi
done

echo ""
echo "========================================"
echo "  SPEC COMPLIANCE AGGREGATE"
echo "========================================"
echo "  Total: $((TOTAL_PASS + TOTAL_FAIL + TOTAL_SKIP)) assertions"
echo "  Passed: $TOTAL_PASS"
echo "  Failed: $TOTAL_FAIL"
echo "  Skipped: $TOTAL_SKIP"
if [ -n "$FAILED_SUITES" ]; then
  echo ""
  echo "  Failed suites:"
  echo -e "$FAILED_SUITES"
  exit 1
fi
echo "  All suites passed."
exit 0
