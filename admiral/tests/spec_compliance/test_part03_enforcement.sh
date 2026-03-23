#!/bin/bash
# Spec Compliance: Part 3 — Enforcement
# Tests: Hook exit codes, enforcement vs monitoring classification,
#        loop detection, token budget, self-healing constants, hook timeouts
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 3: Enforcement ---"

# Exit code conventions match spec
assert_eq "exit pass is 0" "0" "$RC_EXIT_PASS"
assert_eq "exit fail is 1" "1" "$RC_EXIT_FAIL"
assert_eq "exit block is 2" "2" "$RC_EXIT_BLOCK"

# Monitoring hooks always exit 0 (never hard-block)
for hook in token_budget_tracker loop_detector context_health_check brain_context_router; do
  HOOK_FILE="$PROJECT_DIR/.hooks/${hook}.sh"
  if [ -f "$HOOK_FILE" ]; then
    LAST_EXIT=$(grep -c 'exit 0' "$HOOK_FILE")
    assert_true "$hook ends with exit 0" \
      "$([ "$LAST_EXIT" -gt 0 ] && echo true || echo false)"
    # Verify no exit 2 (hard block) in monitoring hooks
    HAS_BLOCK=$(grep -c 'exit 2' "$HOOK_FILE" 2>/dev/null) || HAS_BLOCK=0
    assert_eq "$hook has no exit 2 (monitoring must not block)" "0" "$HAS_BLOCK"
  fi
done

# Enforcement hooks can hard-block (exit 2)
PROHIB="$PROJECT_DIR/.hooks/prohibitions_enforcer.sh"
if [ -f "$PROHIB" ]; then
  HAS_BLOCK=$(grep -c 'exit 2' "$PROHIB" 2>/dev/null) || HAS_BLOCK=0
  assert_true "prohibitions_enforcer can hard-block" \
    "$([ "$HAS_BLOCK" -gt 0 ] && echo true || echo false)"
fi

# Token budget thresholds match spec (80% WARNING, 90% ESCALATION)
assert_eq "budget warning threshold is 80%" "80" "$RC_BUDGET_WARNING_PCT"
assert_eq "budget escalation threshold is 90%" "90" "$RC_BUDGET_ESCALATION_PCT"

# Loop detection constants match spec
assert_eq "max same error is 3" "3" "$RC_MAX_SAME_ERROR"
assert_eq "max total errors is 10" "10" "$RC_MAX_TOTAL_ERRORS"
assert_eq "success decay is 1" "1" "$RC_SUCCESS_DECAY"

# Self-healing constants match spec
assert_eq "self-heal max retries is 3" "3" "$RC_SELF_HEAL_MAX_RETRIES"
assert_eq "self-heal max session retries is 10" "10" "$RC_SELF_HEAL_MAX_SESSION_RETRIES"

# Hook timeout defaults
assert_eq "default hook timeout is 30000ms" "30000" "$RC_HOOK_TIMEOUT_DEFAULT"
assert_eq "budget hook timeout is 5000ms" "5000" "$RC_HOOK_TIMEOUT_BUDGET"
assert_eq "loop hook timeout is 5000ms" "5000" "$RC_HOOK_TIMEOUT_LOOP"
assert_eq "timeout minimum is 100ms" "100" "$RC_HOOK_TIMEOUT_MIN"
assert_eq "timeout maximum is 300000ms" "300000" "$RC_HOOK_TIMEOUT_MAX"

# Three-handler adapter pattern exists
assert_file_exists "session_start adapter" "$PROJECT_DIR/.hooks/session_start_adapter.sh"
assert_file_exists "pre_tool_use adapter" "$PROJECT_DIR/.hooks/pre_tool_use_adapter.sh"
assert_file_exists "post_tool_use adapter" "$PROJECT_DIR/.hooks/post_tool_use_adapter.sh"

report_results "Part 3: Enforcement"
