#!/usr/bin/env bash
# Q-14: Hook idempotency verification
# Verifies running any hook twice with same input produces same output.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/../../.hooks"

PASS=0
FAIL=0
TOTAL=0

PAYLOAD='{"session_id":"idem-test","tool_name":"Read","tool_input":{"file_path":"/tmp/test.txt"},"tool_output":"hello"}'

echo "Hook Idempotency Verification"
echo "=============================="

# Test idempotent hooks (not state-mutating adapters)
IDEMPOTENT_HOOKS=(
  "$HOOKS_DIR/loop_detector.sh"
  "$HOOKS_DIR/prohibitions_enforcer.sh"
  "$HOOKS_DIR/scope_boundary_guard.sh"
  "$HOOKS_DIR/zero_trust_validator.sh"
  "$HOOKS_DIR/compliance_ethics_advisor.sh"
  "$HOOKS_DIR/brain_context_router.sh"
  "$HOOKS_DIR/context_health_check.sh"
  "$HOOKS_DIR/pre_work_validator.sh"
  "$HOOKS_DIR/token_budget_tracker.sh"
)

for hook in "${IDEMPOTENT_HOOKS[@]}"; do
  [ -f "$hook" ] || continue
  name=$(basename "$hook" .sh)
  TOTAL=$((TOTAL + 1))

  # Fresh state for each test
  TMPDIR=$(mktemp -d)
  cp -r "$(cd "$SCRIPT_DIR/../.." && pwd)/admiral" "$TMPDIR/admiral"
  mkdir -p "$TMPDIR/.admiral"
  echo '{"session_id":"idem","tool_call_count":5,"tokens_used":100,"hook_state":{}}' > "$TMPDIR/.admiral/session_state.json"
  export CLAUDE_PROJECT_DIR="$TMPDIR"

  # Run 1
  rc1=0
  out1=$(echo "$PAYLOAD" | timeout 10 bash "$hook" 2>/dev/null) || rc1=$?

  # Reset state for run 2
  echo '{"session_id":"idem","tool_call_count":5,"tokens_used":100,"hook_state":{}}' > "$TMPDIR/.admiral/session_state.json"

  # Run 2
  rc2=0
  out2=$(echo "$PAYLOAD" | timeout 10 bash "$hook" 2>/dev/null) || rc2=$?

  if [ "$rc1" -eq "$rc2" ] && [ "$out1" = "$out2" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $name — not idempotent"
    echo "  Run 1: exit=$rc1 output='${out1:0:80}'"
    echo "  Run 2: exit=$rc2 output='${out2:0:80}'"
  fi

  rm -rf "$TMPDIR"
done

echo ""
echo "idempotency tests: $PASS/$TOTAL passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
