#!/bin/bash
# Admiral Framework — Schema Validation Tests (A-01)
# Tests validate_hook_payload for all hook types.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/lib/schema_validate.sh"

PASS=0
FAIL=0
ERRORS=""

assert_valid() {
  local test_name="$1"
  local hook_type="$2"
  local payload="$3"
  local rc=0
  validate_hook_payload "$hook_type" "$payload" 2>/dev/null || rc=$?
  if [ "$rc" -eq 0 ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected valid, got invalid\n"
    echo "  [FAIL] $test_name"
  fi
}

assert_invalid() {
  local test_name="$1"
  local hook_type="$2"
  local payload="$3"
  local rc=0
  validate_hook_payload "$hook_type" "$payload" 2>/dev/null || rc=$?
  if [ "$rc" -eq 1 ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected invalid, got valid\n"
    echo "  [FAIL] $test_name"
  fi
}

echo "=== Schema Validation Tests ==="
echo ""

# --- PreToolUse ---
echo "--- PreToolUse payload validation ---"

assert_valid "Valid pre_tool_use payload" \
  "pre_tool_use" \
  '{"tool_name":"Bash","tool_input":{"command":"echo hi"}}'

assert_valid "pre_tool_use with only required field" \
  "pre_tool_use" \
  '{"tool_name":"Read"}'

assert_valid "pre_tool_use with extra fields" \
  "pre_tool_use" \
  '{"tool_name":"Write","tool_input":{"content":"hello"},"extra":"ignored"}'

assert_invalid "pre_tool_use missing tool_name" \
  "pre_tool_use" \
  '{"tool_input":{"command":"echo hi"}}'

assert_invalid "pre_tool_use with non-JSON" \
  "pre_tool_use" \
  "this is not json"

assert_invalid "pre_tool_use with empty object" \
  "pre_tool_use" \
  '{}'

echo ""

# --- PostToolUse ---
echo "--- PostToolUse payload validation ---"

assert_valid "Valid post_tool_use payload" \
  "post_tool_use" \
  '{"tool_name":"Bash","tool_input":{"command":"echo hi"},"tool_response":"hi"}'

assert_valid "post_tool_use with null response" \
  "post_tool_use" \
  '{"tool_name":"Read","tool_response":null}'

assert_valid "post_tool_use minimal" \
  "post_tool_use" \
  '{"tool_name":"Edit"}'

assert_invalid "post_tool_use missing tool_name" \
  "post_tool_use" \
  '{"tool_response":"some output"}'

echo ""

# --- SessionStart ---
echo "--- SessionStart payload validation ---"

assert_valid "Valid session_start payload" \
  "session_start" \
  '{"session_id":"test-123","model":"claude-sonnet-4-20250514"}'

assert_valid "session_start with no fields (none required)" \
  "session_start" \
  '{}'

assert_valid "session_start with extra fields" \
  "session_start" \
  '{"session_id":"test","model":"claude","extra":true}'

assert_invalid "session_start with non-JSON" \
  "session_start" \
  "not json"

echo ""

# --- Unknown hook type ---
echo "--- Unknown hook type (fail-open) ---"

assert_valid "Unknown hook type passes (fail-open)" \
  "custom_hook" \
  '{"anything":"goes"}'

assert_valid "Unknown hook type with invalid JSON passes (fail-open)" \
  "custom_hook" \
  "not json"

echo ""

# --- Edge cases ---
echo "--- Edge cases ---"

assert_valid "pre_tool_use with numeric tool_name (jq type check)" \
  "pre_tool_use" \
  '{"tool_name":"123"}'

assert_invalid "pre_tool_use with null tool_name" \
  "pre_tool_use" \
  '{"tool_name":null}'

echo ""

# --- Schema files exist ---
echo "--- Schema file existence ---"

for schema in hook-payload-pre-tool-use.v1.schema.json hook-payload-post-tool-use.v1.schema.json hook-payload-session-start.v1.schema.json; do
  if [ -f "$PROJECT_DIR/admiral/schemas/$schema" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $schema exists"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $schema missing\n"
    echo "  [FAIL] $schema missing"
  fi
done

echo ""
echo "========================================="
echo "Schema Validation Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
