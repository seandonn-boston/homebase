#!/bin/bash
# Spec Compliance: Part 2 — Context
# Verifies context baseline, health check, standing orders injection
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PASS=0; FAIL=0

assert() {
  if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi
}

echo "=== Part 2 — Context Compliance ==="

# Session start adapter exists (injects standing orders)
assert "session_start_adapter exists" "$([ -f "$REPO_ROOT/.hooks/session_start_adapter.sh" ] && echo true || echo false)"

# Context baseline hook exists
assert "context_baseline exists" "$([ -f "$REPO_ROOT/.hooks/context_baseline.sh" ] && echo true || echo false)"

# Context health check exists
assert "context_health_check exists" "$([ -f "$REPO_ROOT/.hooks/context_health_check.sh" ] && echo true || echo false)"

# Standing orders directory exists
assert "standing-orders directory exists" "$([ -d "$REPO_ROOT/admiral/standing-orders" ] && echo true || echo false)"

# Context allocation ranges defined in constants
source "$REPO_ROOT/admiral/config/reference_constants.sh" 2>/dev/null
assert "Standing context min 15%" "$([ "$CONTEXT_STANDING_MIN_PCT" = "15" ] && echo true || echo false)"
assert "Standing context max 25%" "$([ "$CONTEXT_STANDING_MAX_PCT" = "25" ] && echo true || echo false)"
assert "Session context min 50%" "$([ "$CONTEXT_SESSION_MIN_PCT" = "50" ] && echo true || echo false)"
assert "Working context min 20%" "$([ "$CONTEXT_WORKING_MIN_PCT" = "20" ] && echo true || echo false)"
assert "Allocation sum 100%" "$([ "$CONTEXT_ALLOCATION_SUM" = "100" ] && echo true || echo false)"

# Standing context ceiling
assert "Standing context ceiling 50K" "$([ "$STANDING_CONTEXT_CEILING_TOKENS" = "50000" ] && echo true || echo false)"

echo ""
echo "Part 2: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
