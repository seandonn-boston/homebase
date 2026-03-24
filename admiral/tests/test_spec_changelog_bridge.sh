#!/bin/bash
# Admiral Framework — Spec Changelog Bridge Tests
# Validates the changelog bridge document structure and freshness score.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BRIDGE="$ADMIRAL_DIR/config/spec_changelog_bridge.json"

PASS=0
FAIL=0
ERRORS=""

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

# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$BRIDGE" ]; then
  echo "  [SKIP] Bridge not found at $BRIDGE"
  exit 1
fi

if jq empty "$BRIDGE" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Bridge is valid JSON"
else
  echo "  [FAIL] Bridge is not valid JSON"
  exit 1
fi
echo ""

# ============================================================
echo "=== Required Top-Level Fields ==="

for field in schema_version current_spec_version generated description versions freshness_summary; do
  if [ "$(jq "has(\"$field\")" "$BRIDGE")" = "true" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] Has '$field' field"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Missing '$field' field\n"
    echo "  [FAIL] Missing '$field' field"
  fi
done
echo ""

# ============================================================
echo "=== Version Entries ==="

version_count=$(jq '.versions | length' "$BRIDGE")
assert_gt "Has multiple version entries" 5 "$version_count"

# Each version must have: version, date, changes
invalid=0
for ((i=0; i<version_count; i++)); do
  for field in version date changes; do
    val=$(jq -r ".versions[$i].$field // empty" "$BRIDGE")
    if [ -z "$val" ] && [ "$field" != "changes" ]; then
      invalid=$((invalid + 1))
    fi
    if [ "$field" = "changes" ]; then
      changes_len=$(jq ".versions[$i].changes | length" "$BRIDGE")
      if [ "$changes_len" -eq 0 ]; then
        invalid=$((invalid + 1))
      fi
    fi
  done
done
if [ "$invalid" -eq 0 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] All version entries have required fields"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] $invalid version entries missing required fields\n"
  echo "  [FAIL] $invalid version entries missing required fields"
fi
echo ""

# ============================================================
echo "=== Change Entry Schema ==="

# Every change must have: description, spec_parts_affected, impl_status
total_changes=$(jq '[.versions[].changes[]] | length' "$BRIDGE")
assert_gt "Has substantial change entries" 20 "$total_changes"

invalid_changes=0
for ((i=0; i<version_count; i++)); do
  changes_len=$(jq ".versions[$i].changes | length" "$BRIDGE")
  for ((j=0; j<changes_len; j++)); do
    for field in description spec_parts_affected impl_status; do
      has=$(jq ".versions[$i].changes[$j] | has(\"$field\")" "$BRIDGE")
      if [ "$has" != "true" ]; then
        invalid_changes=$((invalid_changes + 1))
      fi
    done
  done
done
if [ "$invalid_changes" -eq 0 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] All change entries have required fields"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] $invalid_changes change entries missing required fields\n"
  echo "  [FAIL] $invalid_changes change entries missing required fields"
fi
echo ""

# ============================================================
echo "=== Implementation Status Values ==="

invalid_status=$(jq '[.versions[].changes[].impl_status] | map(select(. != "reflected" and . != "partial" and . != "not_started")) | length' "$BRIDGE")
assert_eq "All impl_status values are valid" "0" "$invalid_status"
echo ""

# ============================================================
echo "=== Gap Documentation ==="

# Changes with not_started or partial status should have a gap field
missing_gaps=$(jq '[.versions[].changes[] | select(.impl_status == "not_started" or .impl_status == "partial") | select(.gap == null or .gap == "")] | length' "$BRIDGE")
assert_eq "All non-reflected changes have gap description" "0" "$missing_gaps"
echo ""

# ============================================================
echo "=== Freshness Summary ==="

for field in total_changes reflected partial not_started freshness_score_pct calculation; do
  if [ "$(jq ".freshness_summary | has(\"$field\")" "$BRIDGE")" = "true" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] freshness_summary has '$field'"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] freshness_summary missing '$field'\n"
    echo "  [FAIL] freshness_summary missing '$field'"
  fi
done

# Verify counts add up
summary_total=$(jq '.freshness_summary.total_changes' "$BRIDGE")
summary_reflected=$(jq '.freshness_summary.reflected' "$BRIDGE")
summary_partial=$(jq '.freshness_summary.partial' "$BRIDGE")
summary_not_started=$(jq '.freshness_summary.not_started' "$BRIDGE")
computed_sum=$((summary_reflected + summary_partial + summary_not_started))
assert_eq "Freshness counts sum to total" "$summary_total" "$computed_sum"

# Verify total matches actual change count
assert_eq "Total matches actual change entries" "$total_changes" "$summary_total"

# Score should be between 0 and 100
score=$(jq '.freshness_summary.freshness_score_pct' "$BRIDGE")
if [ "$score" -ge 0 ] && [ "$score" -le 100 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Freshness score in valid range (${score}%)"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Freshness score out of range: $score\n"
  echo "  [FAIL] Freshness score out of range: $score"
fi
echo ""

# ============================================================
echo "=== Version Ordering ==="

# First version entry should be the newest (highest version number)
first_version=$(jq -r '.versions[0].version' "$BRIDGE")
last_version=$(jq -r ".versions[$((version_count - 1))].version" "$BRIDGE")
# Extract major.minor for numeric comparison (v0.10 > v0.2)
first_minor=$(echo "$first_version" | sed 's/v0\.\([0-9]*\).*/\1/')
last_minor=$(echo "$last_version" | sed 's/v0\.\([0-9]*\).*/\1/')
if [ "$first_minor" -gt "$last_minor" ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Versions in descending order ($first_version > $last_version)"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Versions not in descending order\n"
  echo "  [FAIL] Versions not in descending order ($first_version vs $last_version)"
fi
echo ""

# ============================================================
echo "========================================="
echo "Spec Changelog Bridge Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
