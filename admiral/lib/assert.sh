#!/bin/bash
# Admiral Framework — Shared Test Assertion Library
# Source this file in test scripts to get standard assert functions.
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/../lib/assert.sh"
#
# Provides: assert_exit_code, assert_contains, assert_not_contains,
#           assert_eq, assert_gt, assert_valid_json, assert_file_exists,
#           setup (tmpdir), teardown (cleanup), print_results

PASS=0
FAIL=0
ERRORS=""
TMPDIR_BASE=""

assert_exit_code() {
  local test_name="$1"
  local expected_code="$2"
  local actual_code="$3"
  if [ "$actual_code" -eq "$expected_code" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected exit $expected_code, got $actual_code\n"
    echo "  [FAIL] $test_name (expected exit $expected_code, got $actual_code)"
  fi
}

assert_contains() {
  local test_name="$1"
  local output="$2"
  local expected="$3"
  if echo "$output" | grep -q "$expected"; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected '$expected' in output\n"
    echo "  [FAIL] $test_name"
  fi
}

assert_not_contains() {
  local test_name="$1"
  local output="$2"
  local unexpected="$3"
  if echo "$output" | grep -q "$unexpected"; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — unexpected '$unexpected' in output\n"
    echo "  [FAIL] $test_name"
  else
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  fi
}

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$actual" = "$expected" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected '$expected', got '$actual'\n"
    echo "  [FAIL] $test_name (expected '$expected', got '$actual')"
  fi
}

assert_gt() {
  local test_name="$1"
  local min="$2"
  local actual="$3"
  if [ "$actual" -gt "$min" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name ($actual > $min)"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected >$min, got $actual\n"
    echo "  [FAIL] $test_name (expected >$min, got $actual)"
  fi
}

assert_valid_json() {
  local test_name="$1"
  local filepath="$2"
  if jq empty "$filepath" 2>/dev/null; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — '$filepath' is not valid JSON\n"
    echo "  [FAIL] $test_name"
  fi
}

assert_file_exists() {
  local test_name="$1"
  local filepath="$2"
  if [ -f "$filepath" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — file '$filepath' does not exist\n"
    echo "  [FAIL] $test_name"
  fi
}

setup() {
  TMPDIR_BASE="$(mktemp -d)"
}

teardown() {
  rm -rf "$TMPDIR_BASE"
}

print_results() {
  local suite_name="$1"
  echo "========================================="
  echo "$suite_name: $PASS passed, $FAIL failed"
  echo "========================================="
  if [ "$FAIL" -gt 0 ]; then
    echo ""
    echo "Failures:"
    echo -e "$ERRORS"
    exit 1
  fi
}
