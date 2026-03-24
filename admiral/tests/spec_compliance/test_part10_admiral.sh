#!/bin/bash
# Spec Compliance: Part 10 — Admiral
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PASS=0; FAIL=0
assert() { if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi; }

echo "=== Part 10 — Admiral Compliance ==="
source "$REPO_ROOT/admiral/config/reference_constants.sh" 2>/dev/null
assert "TRUST_CONSECUTIVE_SUCCESS=5" "$([ "$TRUST_CONSECUTIVE_SUCCESS" = "5" ] && echo true || echo false)"
assert "FALLBACK_DETECTION_MISSED_HEARTBEATS=3" "$([ "$FALLBACK_DETECTION_MISSED_HEARTBEATS" = "3" ] && echo true || echo false)"
assert "FALLBACK_DURATION_LIMIT_S=300" "$([ "$FALLBACK_DURATION_LIMIT_S" = "300" ] && echo true || echo false)"

echo ""
echo "Part 10: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
