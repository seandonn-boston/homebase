#!/bin/bash
# Admiral Framework — Migration Runner Tests
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATE="$ADMIRAL_DIR/bin/migrate"
UPGRADE_CHECK="$ADMIRAL_DIR/bin/upgrade_check"

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

# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$MIGRATE" ]; then
  echo "  [SKIP] migrate not found"
  exit 1
fi
echo "  migrate found."

if [ ! -f "$UPGRADE_CHECK" ]; then
  echo "  [SKIP] upgrade_check not found"
  exit 1
fi
echo "  upgrade_check found."
echo ""

# ============================================================
echo "=== Component Versions Manifest ==="

VERSIONS="$ADMIRAL_DIR/config/component_versions.json"

if jq empty "$VERSIONS" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] component_versions.json is valid JSON"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] component_versions.json is not valid JSON\n"
  echo "  [FAIL] component_versions.json is not valid JSON"
fi

# Required fields
for field in framework_version last_updated components; do
  if [ "$(jq "has(\"$field\")" "$VERSIONS")" = "true" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] Has '$field' field"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Missing '$field' field\n"
    echo "  [FAIL] Missing '$field' field"
  fi
done

# Each component must have version and files
comp_count=$(jq '.components | keys | length' "$VERSIONS")
invalid=0
while IFS= read -r comp; do
  comp="${comp%$'\r'}"
  ver=$(jq -r ".components[\"$comp\"].version // empty" "$VERSIONS")
  files_count=$(jq ".components[\"$comp\"].files | length" "$VERSIONS" 2>/dev/null || echo "0")
  if [ -z "$ver" ] || [ "$files_count" -eq 0 ]; then
    invalid=$((invalid + 1))
  fi
done < <(jq -r '.components | keys[]' "$VERSIONS")
if [ "$invalid" -eq 0 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] All $comp_count components have version and files"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] $invalid components missing version or files\n"
  echo "  [FAIL] $invalid components missing version or files"
fi
echo ""

# ============================================================
echo "=== Migration Runner — Dry Run ==="

# Clean up any prior applied log for testing
APPLIED_LOG="$ADMIRAL_DIR/migrations/.applied"
BACKUP_LOG=""
if [ -f "$APPLIED_LOG" ]; then
  BACKUP_LOG=$(mktemp)
  cp "$APPLIED_LOG" "$BACKUP_LOG"
  rm "$APPLIED_LOG"
fi

rc=0
output=$("$MIGRATE" --dry-run 2>&1) || rc=$?
assert_exit_code "Dry run exits 0" 0 "$rc"
assert_contains "Shows pending migrations" "$output" "PENDING"
assert_contains "Shows dry-run notice" "$output" "dry-run"

echo ""

# ============================================================
echo "=== Migration Runner — Apply ==="

rc=0
output=$("$MIGRATE" 2>&1) || rc=$?
assert_exit_code "Apply exits 0" 0 "$rc"
assert_contains "Shows applied migration" "$output" "APPLIED"

# Verify applied log was created
if [ -f "$APPLIED_LOG" ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Applied log created"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Applied log not created\n"
  echo "  [FAIL] Applied log not created"
fi

echo ""

# ============================================================
echo "=== Migration Runner — Idempotent ==="

rc=0
output=$("$MIGRATE" 2>&1) || rc=$?
assert_exit_code "Re-run exits 0 (no pending)" 0 "$rc"
assert_contains "Reports up to date or no pending" "$output" "0"

echo ""

# ============================================================
echo "=== Migration Runner — JSON Mode ==="

rc=0
output=$("$MIGRATE" --json 2>&1) || rc=$?
assert_exit_code "JSON mode exits 0" 0 "$rc"
if echo "$output" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] JSON output is valid"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] JSON output is not valid JSON\n"
  echo "  [FAIL] JSON output is not valid JSON"
fi
assert_contains "JSON has status field" "$output" '"status"'

echo ""

# ============================================================
echo "=== Migration Runner — Rollback ==="

rc=0
output=$("$MIGRATE" --rollback 000 --dry-run 2>&1) || rc=$?
assert_exit_code "Rollback dry-run exits 0" 0 "$rc"

echo ""

# ============================================================
echo "=== Upgrade Check ==="

rc=0
output=$("$UPGRADE_CHECK" 2>&1) || rc=$?
# May pass or warn depending on environment state
if [ "$rc" -le 1 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Upgrade check runs without hard error (exit $rc)"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Upgrade check hard error (exit $rc)\n"
  echo "  [FAIL] Upgrade check hard error (exit $rc)"
fi

rc=0
output=$("$UPGRADE_CHECK" --json 2>&1) || rc=$?
if echo "$output" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Upgrade check JSON output is valid"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Upgrade check JSON output invalid\n"
  echo "  [FAIL] Upgrade check JSON output invalid"
fi

echo ""

# Restore applied log if we backed it up
if [ -n "$BACKUP_LOG" ] && [ -f "$BACKUP_LOG" ]; then
  mv "$BACKUP_LOG" "$APPLIED_LOG"
elif [ -z "$BACKUP_LOG" ]; then
  # Clean up if we created the log during testing
  rm -f "$APPLIED_LOG"
fi

# ============================================================
echo "========================================="
echo "Migration Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
