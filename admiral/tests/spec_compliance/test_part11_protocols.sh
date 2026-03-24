#!/bin/bash
# Spec Compliance: Part 11 — Protocols
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PASS=0; FAIL=0
assert() { if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi; }

echo "=== Part 11 — Protocols Compliance ==="
source "$REPO_ROOT/admiral/config/reference_constants.sh" 2>/dev/null
assert "CONTEXT_HONESTY_MIN_CONFIDENCE_PCT=80" "$([ "$CONTEXT_HONESTY_MIN_CONFIDENCE_PCT" = "80" ] && echo true || echo false)"
assert "A2A_REQUEST_TIMEOUT_S=300" "$([ "$A2A_REQUEST_TIMEOUT_S" = "300" ] && echo true || echo false)"

echo ""
echo "Part 11: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
