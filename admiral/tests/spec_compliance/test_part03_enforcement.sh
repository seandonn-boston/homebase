#!/bin/bash
# Spec Compliance: Part 3 — Deterministic Enforcement
# Verifies hooks, exit codes, loop detection, token tracking
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
PASS=0; FAIL=0

assert() {
  if [ "$2" = "true" ]; then PASS=$((PASS+1)); echo "  [PASS] $1"
  else FAIL=$((FAIL+1)); echo "  [FAIL] $1"; fi
}

echo "=== Part 3 — Enforcement Compliance ==="

# Hook adapters exist
assert "pre_tool_use_adapter exists" "$([ -f "$REPO_ROOT/.hooks/pre_tool_use_adapter.sh" ] && echo true || echo false)"
assert "post_tool_use_adapter exists" "$([ -f "$REPO_ROOT/.hooks/post_tool_use_adapter.sh" ] && echo true || echo false)"

# Core enforcement hooks
assert "token_budget_tracker exists" "$([ -f "$REPO_ROOT/.hooks/token_budget_tracker.sh" ] && echo true || echo false)"
assert "loop_detector exists" "$([ -f "$REPO_ROOT/.hooks/loop_detector.sh" ] && echo true || echo false)"
assert "prohibitions_enforcer exists" "$([ -f "$REPO_ROOT/.hooks/prohibitions_enforcer.sh" ] && echo true || echo false)"
assert "scope_boundary_guard exists" "$([ -f "$REPO_ROOT/.hooks/scope_boundary_guard.sh" ] && echo true || echo false)"
assert "zero_trust_validator exists" "$([ -f "$REPO_ROOT/.hooks/zero_trust_validator.sh" ] && echo true || echo false)"

# Exit code constants match spec (0=pass, 1=soft fail, 2=hard block)
source "$REPO_ROOT/admiral/config/reference_constants.sh" 2>/dev/null
assert "EXIT_PASS=0" "$([ "$EXIT_PASS" = "0" ] && echo true || echo false)"
assert "EXIT_FAIL_SOFT=1" "$([ "$EXIT_FAIL_SOFT" = "1" ] && echo true || echo false)"
assert "EXIT_BLOCK_HARD=2" "$([ "$EXIT_BLOCK_HARD" = "2" ] && echo true || echo false)"

# Loop detection thresholds match spec
assert "MAX_SAME_ERROR=3" "$([ "$LOOP_MAX_SAME_ERROR" = "3" ] && echo true || echo false)"
assert "MAX_TOTAL_ERRORS=10" "$([ "$LOOP_MAX_TOTAL_ERRORS" = "10" ] && echo true || echo false)"
assert "SUCCESS_DECAY=1" "$([ "$LOOP_SUCCESS_DECAY" = "1" ] && echo true || echo false)"

# Token alert thresholds
assert "Warning at 80%" "$([ "$TOKEN_ALERT_WARNING_PCT" = "80" ] && echo true || echo false)"
assert "Escalation at 90%" "$([ "$TOKEN_ALERT_ESCALATION_PCT" = "90" ] && echo true || echo false)"

# Self-healing constants
assert "Max retries=3" "$([ "$SELF_HEAL_MAX_RETRIES" = "3" ] && echo true || echo false)"
assert "Max session retries=10" "$([ "$SELF_HEAL_MAX_SESSION_RETRIES" = "10" ] && echo true || echo false)"

echo ""
echo "Part 3: $PASS passed, $FAIL failed"
[ "$FAIL" -gt 0 ] && exit 1 || exit 0
