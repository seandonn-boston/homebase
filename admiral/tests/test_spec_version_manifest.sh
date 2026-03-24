#!/bin/bash
# Admiral Framework — Spec Version Manifest Tests
# Validates the manifest is well-formed and components exist.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$ADMIRAL_DIR/.." && pwd)"
MANIFEST="$ADMIRAL_DIR/config/spec_version_manifest.json"

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

if [ ! -f "$MANIFEST" ]; then
  echo "  [SKIP] Manifest not found at $MANIFEST"
  exit 1
fi

if jq empty "$MANIFEST" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Manifest is valid JSON"
else
  echo "  [FAIL] Manifest is not valid JSON"
  exit 1
fi
echo ""

# ============================================================
echo "=== Required Top-Level Fields ==="

for field in schema_version spec_version generated description components spec_parts_summary; do
  if [ "$(jq "has(\"$field\")" "$MANIFEST")" = "true" ]; then
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
echo "=== Component Count ==="

comp_count=$(jq '.components | length' "$MANIFEST")
assert_gt "Has substantial component list" 20 "$comp_count"
echo ""

# ============================================================
echo "=== Component Schema Validation ==="

# Every component must have: component, spec_part, status, compliance
invalid=0
for ((i=0; i<comp_count; i++)); do
  for field in component spec_part status compliance; do
    val=$(jq -r ".components[$i].$field // empty" "$MANIFEST")
    if [ -z "$val" ]; then
      invalid=$((invalid + 1))
      FAIL=$((FAIL + 1))
      name=$(jq -r ".components[$i].component // \"index $i\"" "$MANIFEST")
      ERRORS+="  [FAIL] Component '$name' missing '$field'\n"
      echo "  [FAIL] Component '$name' missing '$field'"
    fi
  done
done
if [ "$invalid" -eq 0 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] All components have required fields"
fi
echo ""

# ============================================================
echo "=== Status Values Valid ==="

invalid_status=$(jq '[.components[].status] | map(select(. != "implemented" and . != "partial" and . != "not_implemented" and . != "planned")) | length' "$MANIFEST")
assert_eq "All status values are valid enums" "0" "$invalid_status"
echo ""

# ============================================================
echo "=== Compliance Values Valid ==="

invalid_compliance=$(jq '[.components[].compliance] | map(select(. != "full" and . != "partial" and . != "none")) | length' "$MANIFEST")
assert_eq "All compliance values are valid enums" "0" "$invalid_compliance"
echo ""

# ============================================================
echo "=== Partial Compliance Has Gap Description ==="

partial_without_gap=$(jq '[.components[] | select(.compliance == "partial" and (.gap == null or .gap == ""))] | length' "$MANIFEST")
assert_eq "All partial-compliance components have gap description" "0" "$partial_without_gap"
echo ""

# ============================================================
echo "=== Component Files Exist ==="

missing_files=0
while IFS= read -r comp_path; do
  comp_path="${comp_path%$'\r'}"
  full_path="$REPO_ROOT/$comp_path"
  if [ -e "$full_path" ]; then
    PASS=$((PASS + 1))
  else
    missing_files=$((missing_files + 1))
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Component file missing: $comp_path\n"
    echo "  [FAIL] Component file missing: $comp_path"
  fi
done < <(jq -r '.components[].component' "$MANIFEST")

if [ "$missing_files" -eq 0 ]; then
  echo "  [PASS] All $comp_count component files exist"
fi
echo ""

# ============================================================
echo "=== Spec Parts Summary ==="

parts_count=$(jq '.spec_parts_summary | length' "$MANIFEST")
assert_gt "Has spec parts summary" 10 "$parts_count"

# Check Part 1 has the most full-compliance components
part1_full=$(jq '.spec_parts_summary[] | select(.part == "Part 1 — Strategy") | .full_compliance' "$MANIFEST")
assert_gt "Part 1 Strategy has full-compliance components" 5 "$part1_full"
echo ""

# ============================================================
echo "=== Compliance Gap Indicator ==="

# Count components with full vs partial compliance
full_count=$(jq '[.components[] | select(.compliance == "full")] | length' "$MANIFEST")
partial_count=$(jq '[.components[] | select(.compliance == "partial")] | length' "$MANIFEST")

assert_gt "Has fully compliant components" 5 "$full_count"
assert_gt "Has partially compliant components (shows gaps)" 5 "$partial_count"

echo "  Info: $full_count full, $partial_count partial compliance"
echo ""

# ============================================================
echo "========================================="
echo "Spec Version Manifest Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
