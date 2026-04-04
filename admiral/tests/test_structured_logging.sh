#!/bin/bash
# shellcheck disable=SC1091,SC2012
# Admiral Framework — Structured Logging Tests (OB-01)
# Tests admiral/lib/log.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PASS=0
FAIL=0

# Use temp dir for log output — set BEFORE sourcing so the library picks them up
ADMIRAL_LOG_DIR=$(mktemp -d)
export ADMIRAL_LOG_DIR
export ADMIRAL_LOG_FILE="${ADMIRAL_LOG_DIR}/admiral.jsonl"
export ADMIRAL_LOG_LEVEL="debug"
export ADMIRAL_CORRELATION_ID="test-trace-123"

# Source the log library
# shellcheck source=../lib/log.sh
source "$PROJECT_DIR/admiral/lib/log.sh"

cleanup() {
  rm -rf "$ADMIRAL_LOG_DIR"
}
trap cleanup EXIT

assert_eq() {
  local test_name="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: $test_name (expected='$expected', got='$actual')"
  fi
}

assert_contains() {
  local test_name="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: $test_name (expected to contain '$needle')"
  fi
}

echo "=== Structured Logging Tests (OB-01) ==="

# Test 1: log_structured produces valid JSON
echo "--- Basic log entry ---"
log_structured info "test_component" "Hello world" '{"key":"value"}' 2>/dev/null
ENTRY=$(tail -1 "$ADMIRAL_LOG_FILE")
echo "$ENTRY" | jq empty 2>/dev/null
assert_eq "Log entry is valid JSON" "0" "$?"

# Test 2: Required fields present
LEVEL=$(echo "$ENTRY" | jq -r '.level')
COMPONENT=$(echo "$ENTRY" | jq -r '.component')
MESSAGE=$(echo "$ENTRY" | jq -r '.message')
CID=$(echo "$ENTRY" | jq -r '.correlation_id')
TS=$(echo "$ENTRY" | jq -r '.timestamp')
assert_eq "Level is info" "info" "$LEVEL"
assert_eq "Component is test_component" "test_component" "$COMPONENT"
assert_eq "Message is Hello world" "Hello world" "$MESSAGE"
assert_eq "Correlation ID is test-trace-123" "test-trace-123" "$CID"
assert_contains "Timestamp is ISO8601" "$TS" "T"

# Test 3: Context is preserved
CTX_KEY=$(echo "$ENTRY" | jq -r '.context.key')
assert_eq "Context key preserved" "value" "$CTX_KEY"

# Test 4: Convenience wrappers
log_debug "test_comp" "debug msg" 2>/dev/null
log_warn "test_comp" "warn msg" 2>/dev/null
log_error "test_comp" "error msg" 2>/dev/null

LINE_COUNT=$(wc -l < "$ADMIRAL_LOG_FILE" | tr -d ' ')
assert_eq "4 entries written (1 info + 3 convenience)" "4" "$LINE_COUNT"

# Test 5: Level filtering
export ADMIRAL_LOG_LEVEL="warn"
# Re-source to pick up new level
source "$PROJECT_DIR/admiral/lib/log.sh"
log_debug "test" "should be filtered" 2>/dev/null
log_info "test" "should be filtered" 2>/dev/null
log_warn "test" "should appear" 2>/dev/null

NEW_COUNT=$(wc -l < "$ADMIRAL_LOG_FILE" | tr -d ' ')
assert_eq "Level filtering works (only warn logged, +1)" "5" "$NEW_COUNT"

# Test 6: Invalid JSON context falls back gracefully
export ADMIRAL_LOG_LEVEL="debug"
source "$PROJECT_DIR/admiral/lib/log.sh"
log_structured info "test" "bad context" "not-json" 2>/dev/null
LAST=$(tail -1 "$ADMIRAL_LOG_FILE")
echo "$LAST" | jq empty 2>/dev/null
assert_eq "Invalid context still produces valid JSON" "0" "$?"

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
