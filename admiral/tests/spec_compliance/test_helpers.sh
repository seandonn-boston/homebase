#!/bin/bash
# Shared test helpers for spec compliance tests

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
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name (expected '$expected', got '$actual')\n"
    echo "  FAIL: $test_name (expected '$expected', got '$actual')"
  fi
}

assert_true() {
  local test_name="$1"
  local condition="$2"
  if [ "$condition" = "true" ] || [ "$condition" = "0" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name\n"
    echo "  FAIL: $test_name"
  fi
}

assert_contains() {
  local test_name="$1"
  local haystack="$2"
  local needle="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name (expected to contain '$needle')\n"
    echo "  FAIL: $test_name (expected to contain '$needle')"
  fi
}

assert_file_exists() {
  local test_name="$1"
  local file_path="$2"
  if [ -e "$file_path" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name (file not found: $file_path)\n"
    echo "  FAIL: $test_name (file not found: $file_path)"
  fi
}

skip_test() {
  local test_name="$1"
  local reason="$2"
  SKIP=$((SKIP + 1))
  echo "  SKIP: $test_name ($reason)"
}

report_results() {
  local suite_name="$1"
  echo ""
  echo "=== $suite_name: $PASS passed, $FAIL failed, $SKIP skipped ==="
  if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "Failures:"
    echo -e "$ERRORS"
    exit 1
  fi
  exit 0
}
