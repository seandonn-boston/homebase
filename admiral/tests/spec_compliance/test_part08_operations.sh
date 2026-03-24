#!/bin/bash
# Spec Compliance: Part 8 — Operations
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PASS=0; FAIL=0
assert() { if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"; else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi; }

echo "=== Part 8 — Operations Compliance ==="
assert "session_summary exists" "$([ -x "$REPO_ROOT/admiral/bin/session_summary" ] && echo true || echo false)"
assert "version_audit exists" "$([ -x "$REPO_ROOT/admiral/bin/version_audit" ] && echo true || echo false)"

source "$REPO_ROOT/admiral/config/reference_constants.sh" 2>/dev/null
assert "SCOPE_EXPANSION_STRATEGIC_PCT=15" "$([ "$SCOPE_EXPANSION_STRATEGIC_PCT" = "15" ] && echo true || echo false)"
assert "ESCALATION_PLATEAU_SESSIONS=3" "$([ "$ESCALATION_PLATEAU_SESSIONS" = "3" ] && echo true || echo false)"
assert "LLM_CALL_ELIMINATION_RATE_MIN_PCT=30" "$([ "$LLM_CALL_ELIMINATION_RATE_MIN_PCT" = "30" ] && echo true || echo false)"

echo ""
echo "Part 8: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
