#!/bin/bash
# Spec Compliance: Part 7 — Quality
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PASS=0; FAIL=0
assert() { if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi; }

echo "=== Part 7 — Quality Compliance ==="
source "$REPO_ROOT/admiral/config/reference_constants.sh" 2>/dev/null
assert "QUALITY_FIRST_PASS_HEALTHY_PCT=75" "$([ "$QUALITY_FIRST_PASS_HEALTHY_PCT" = "75" ] && echo true || echo false)"
assert "QUALITY_SELF_HEAL_HEALTHY_PCT=80" "$([ "$QUALITY_SELF_HEAL_HEALTHY_PCT" = "80" ] && echo true || echo false)"
assert "QA_VERIFIED_TEST_CASES=2" "$([ "$QA_VERIFIED_TEST_CASES" = "2" ] && echo true || echo false)"
assert "DRIFT_FINDING_DECLINE_PCT=30" "$([ "$DRIFT_FINDING_DECLINE_PCT" = "30" ] && echo true || echo false)"

echo ""
echo "Part 7: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
