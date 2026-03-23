#!/bin/bash
# admiral/tests/test_helpers.sh — Shared test assertion helpers
#
# Source this file at the top of every test script instead of
# redefining assert functions. Provides: assert_eq, assert_true,
# assert_contains, assert_not_empty, assert_file_exists, skip_test,
# report_results.

PASS=0
FAIL=0
SKIP=0
ERRORS=""

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name (expected '$expected', got '$actual')\n"
    echo "FAIL: $test_name (expected '$expected', got '$actual')"
  fi
}

assert_true() {
  local test_name="$1"
  local condition="$2"
  if [ "$condition" = "true" ] || [ "$condition" = "0" ] || [ "$condition" = "1" ]; then
    # For assert_true, "1" means the value itself is truthy (non-zero)
    # "0" means a successful exit code. "true" means literal true.
    # Callers should pass "true"/"false" or exit codes.
    if [ "$condition" = "false" ]; then
      FAIL=$((FAIL + 1))
      ERRORS+="  FAIL: $test_name\n"
      echo "FAIL: $test_name"
    else
      PASS=$((PASS + 1))
    fi
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name\n"
    echo "FAIL: $test_name"
  fi
}

assert_contains() {
  local test_name="$1"
  local needle="$2"
  local haystack="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name (expected to contain '$needle')\n"
    echo "FAIL: $test_name — expected to contain: $needle"
  fi
}

assert_not_empty() {
  local test_name="$1"
  local value="$2"
  if [ -n "$value" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name — output was empty\n"
    echo "FAIL: $test_name — output was empty"
  fi
}

assert_file_exists() {
  local test_name="$1"
  local file_path="$2"
  if [ -e "$file_path" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name (file not found: $file_path)\n"
    echo "FAIL: $test_name — file not found: $file_path"
  fi
}

# For testing exit codes
assert_exit() {
  local test_name="$1"
  local expected_rc="$2"
  local actual_rc="$3"
  assert_eq "$test_name" "$expected_rc" "$actual_rc"
}

# For detecting patterns (like assert_detected/assert_clean in injection tests)
assert_detected() {
  local test_name="$1"
  local rc="$2"
  if [ "$rc" -ne 0 ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name — expected detection\n"
    echo "FAIL: $test_name — expected detection"
  fi
}

assert_clean() {
  local test_name="$1"
  local rc="$2"
  if [ "$rc" -eq 0 ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name — false positive\n"
    echo "FAIL: $test_name — false positive"
  fi
}

skip_test() {
  local test_name="$1"
  local reason="${2:-}"
  SKIP=$((SKIP + 1))
  echo "SKIP: $test_name${reason:+ ($reason)}"
}

report_results() {
  local suite_name="$1"
  echo ""
  echo "=== $suite_name: $PASS passed, $FAIL failed${SKIP:+, $SKIP skipped} ==="
  if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "Failures:"
    echo -e "$ERRORS"
    exit 1
  fi
}
