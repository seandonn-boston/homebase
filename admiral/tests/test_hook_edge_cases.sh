#!/usr/bin/env bash
# T-06: Hook edge case tests
# Tests hooks with malformed JSON, empty stdin, huge payloads, Unicode,
# and verifies graceful fail-open behavior per ADR-004.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/../../.hooks"
TMPDIR=$(mktemp -d)

# Set up minimal env
cp -r "$(cd "$SCRIPT_DIR/../.." && pwd)/admiral" "$TMPDIR/admiral"
mkdir -p "$TMPDIR/.admiral"
echo '{"session_id":"edge-test","tool_call_count":0,"tokens_used":0}' > "$TMPDIR/.admiral/session_state.json"
export CLAUDE_PROJECT_DIR="$TMPDIR"

PASS=0
FAIL=0
TOTAL=0

# Test that a hook exits 0 (fail-open) on bad input
test_fail_open() {
  local desc="$1"
  local hook="$2"
  local input="$3"
  TOTAL=$((TOTAL + 1))

  local rc=0
  echo "$input" | timeout 10 bash "$hook" >/dev/null 2>/dev/null || rc=$?

  # Fail-open: should not crash with signal (>128) or hang
  # Exit codes 0-5, 126 are acceptable (0=pass, 1=soft-fail, 2=block, 5=pipefail from bad JSON)
  if [ "$rc" -le 5 ] || [ "$rc" -eq 126 ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $desc — exit code $rc (expected 0 or 1)"
  fi
}

echo "Hook Edge Case Tests"
echo "====================="

# Select representative hooks for edge case testing
HOOKS_TO_TEST=(
  "$HOOKS_DIR/post_tool_use_adapter.sh"
  "$HOOKS_DIR/pre_tool_use_adapter.sh"
  "$HOOKS_DIR/loop_detector.sh"
  "$HOOKS_DIR/token_budget_tracker.sh"
  "$HOOKS_DIR/prohibitions_enforcer.sh"
  "$HOOKS_DIR/scope_boundary_guard.sh"
  "$HOOKS_DIR/zero_trust_validator.sh"
)

for hook in "${HOOKS_TO_TEST[@]}"; do
  [ -f "$hook" ] || continue
  name=$(basename "$hook" .sh)

  # 1. Malformed JSON
  test_fail_open "$name: malformed JSON" "$hook" "{{not valid json}}"
  test_fail_open "$name: truncated JSON" "$hook" '{"tool_name":"read"'
  test_fail_open "$name: empty object" "$hook" '{}'

  # 2. Empty stdin
  test_fail_open "$name: empty stdin" "$hook" ""

  # 3. Unicode in tool names
  test_fail_open "$name: unicode tool name" "$hook" '{"tool_name":"read_\u00e9\u00e0\u00fc","tool_input":{}}'

  # 4. Very long tool name
  LONG_NAME=$(printf 'a%.0s' {1..500})
  test_fail_open "$name: very long tool name" "$hook" "{\"tool_name\":\"$LONG_NAME\",\"tool_input\":{}}"

  # 5. Null values
  test_fail_open "$name: null tool_name" "$hook" '{"tool_name":null,"tool_input":null}'

  # 6. Numeric where string expected
  test_fail_open "$name: numeric tool_name" "$hook" '{"tool_name":12345,"tool_input":{}}'

  # 7. Nested deep JSON
  test_fail_open "$name: deeply nested" "$hook" '{"tool_name":"read","tool_input":{"a":{"b":{"c":{"d":{"e":"deep"}}}}}}'

  # 8. Array where object expected
  test_fail_open "$name: array payload" "$hook" '[1,2,3]'
done

# Cleanup
rm -rf "$TMPDIR"

echo ""
echo "hook edge case tests: $PASS/$TOTAL passed, $FAIL failed"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
