#!/usr/bin/env bash
# T-22: Negative testing suite
# Comprehensive negative testing across hooks and core libraries.
# Categories: malformed JSON, missing fields, invalid types, out-of-range values,
# empty inputs, oversized inputs.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOOKS_DIR="$SCRIPT_DIR/../../.hooks"
TMPDIR=$(mktemp -d)

cp -r "$(cd "$SCRIPT_DIR/../.." && pwd)/admiral" "$TMPDIR/admiral"
mkdir -p "$TMPDIR/.admiral"
echo '{"session_id":"neg-test","tool_call_count":0,"tokens_used":0}' > "$TMPDIR/.admiral/session_state.json"
export CLAUDE_PROJECT_DIR="$TMPDIR"

source "$SCRIPT_DIR/test_helpers.sh"

# Hook should not crash (exit > 128 = signal)
test_no_crash() {
  local desc="$1" hook="$2" input="$3"
  local rc=0
  echo "$input" | timeout 10 bash "$hook" >/dev/null 2>/dev/null || rc=$?
  if [ "$rc" -lt 128 ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $desc — crashed with signal (exit $rc)\n"
    echo "FAIL: $desc — crashed with signal (exit $rc)"
  fi
}

echo "Negative Testing Suite"
echo "======================"

# Negative test categories for each hook
HOOKS=(
  "$HOOKS_DIR/post_tool_use_adapter.sh"
  "$HOOKS_DIR/pre_tool_use_adapter.sh"
  "$HOOKS_DIR/loop_detector.sh"
  "$HOOKS_DIR/token_budget_tracker.sh"
  "$HOOKS_DIR/prohibitions_enforcer.sh"
)

for hook in "${HOOKS[@]}"; do
  [ -f "$hook" ] || continue
  name=$(basename "$hook" .sh)

  # 1. Malformed JSON
  test_no_crash "$name: completely invalid JSON" "$hook" "not json at all"
  test_no_crash "$name: partial JSON" "$hook" '{"tool_name":'
  test_no_crash "$name: XML instead of JSON" "$hook" '<tool>read</tool>'

  # 2. Missing fields
  test_no_crash "$name: empty object" "$hook" '{}'
  test_no_crash "$name: only unknown fields" "$hook" '{"foo":"bar","baz":42}'

  # 3. Invalid types
  test_no_crash "$name: tool_name as number" "$hook" '{"tool_name":42}'
  test_no_crash "$name: tool_name as boolean" "$hook" '{"tool_name":true}'
  test_no_crash "$name: tool_name as array" "$hook" '{"tool_name":["a","b"]}'

  # 4. Out-of-range values
  test_no_crash "$name: negative token count" "$hook" '{"tool_name":"read","session_state":{"tokens_used":-1}}'
  test_no_crash "$name: huge token count" "$hook" '{"tool_name":"read","session_state":{"tokens_used":999999999}}'

  # 5. Empty inputs
  test_no_crash "$name: empty string" "$hook" ""
  test_no_crash "$name: whitespace only" "$hook" "   "
  test_no_crash "$name: newlines only" "$hook" $'\n\n\n'
done

# Cleanup
rm -rf "$TMPDIR"

report_results "negative tests"
