#!/bin/bash
# Spec Compliance: Part 6 — Execution
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PASS=0; FAIL=0
assert() { if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi; }

echo "=== Part 6 — Execution Compliance ==="
source "$REPO_ROOT/admiral/config/reference_constants.sh" 2>/dev/null
assert "CHUNK_BUDGET_CEILING_PCT=40" "$([ "$CHUNK_BUDGET_CEILING_PCT" = "40" ] && echo true || echo false)"
assert "QUALITY_DEGRADATION_ONSET_PCT=60" "$([ "$QUALITY_DEGRADATION_ONSET_PCT" = "60" ] && echo true || echo false)"
assert "OVER_DECOMPOSITION_SIGNAL_PCT=20" "$([ "$OVER_DECOMPOSITION_SIGNAL_PCT" = "20" ] && echo true || echo false)"
assert "SWARM_ERROR_RATE_THRESHOLD_PCT=30" "$([ "$SWARM_ERROR_RATE_THRESHOLD_PCT" = "30" ] && echo true || echo false)"

echo ""
echo "Part 6: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
