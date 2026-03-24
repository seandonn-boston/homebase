#!/bin/bash
# Admiral Framework — Standing Orders Rendering Tests (T-17)
# Verifies all 16 Standing Orders render correctly from source files.
# Tests missing SO files for graceful degradation.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/lib/standing_orders.sh"

PASS=0
FAIL=0
ERRORS=""
TMPDIR_BASE=""

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

echo "=== Standing Orders Rendering Tests ==="
echo ""

# --- Test: All 16 SOs render ---
echo "--- All SOs present ---"
OUTPUT=$(render_standing_orders)

# Check header
assert_contains "Header present" "$OUTPUT" "STANDING ORDERS"

# Check all 16 SOs appear
for i in $(seq 1 16); do
  so_num=$(printf '%02d' "$i")
  assert_contains "SO-$so_num rendered" "$OUTPUT" "SO-$so_num"
done

# Check output format has rules (dashes)
assert_contains "Rules have bullet points" "$OUTPUT" "  - "

# Check enforcement section exists
assert_contains "Enforcement section present" "$OUTPUT" "ENFORCEMENT"

echo ""

# --- Test: Output is non-trivial ---
echo "--- Output quality ---"
OUTPUT_LEN=${#OUTPUT}
if [ "$OUTPUT_LEN" -gt 5000 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Output is substantial (${OUTPUT_LEN} chars)"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Output too short (${OUTPUT_LEN} chars, expected >5000)"
fi

echo ""

# --- Test: Graceful degradation with missing SO files ---
echo "--- Graceful degradation ---"
TMPDIR_BASE=$(mktemp -d)
mkdir -p "$TMPDIR_BASE/standing-orders"
cp "$PROJECT_DIR/admiral/standing-orders/so01-identity-discipline.json" "$TMPDIR_BASE/standing-orders/"

SO_DIR="$TMPDIR_BASE/standing-orders" OUTPUT_PARTIAL=$(render_standing_orders)
assert_contains "Partial render includes SO-01" "$OUTPUT_PARTIAL" "SO-01"

# Count how many SOs appear — should be 1
SO_COUNT=$(echo "$OUTPUT_PARTIAL" | grep -c "SO-0" || true)
if [ "$SO_COUNT" -ge 1 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Partial render shows $SO_COUNT SO(s)"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Partial render should show at least 1 SO"
fi

rm -rf "$TMPDIR_BASE"

echo ""

# --- Test: Empty SO directory ---
echo "--- Empty SO directory ---"
TMPDIR_BASE=$(mktemp -d)
mkdir -p "$TMPDIR_BASE/standing-orders"

SO_DIR="$TMPDIR_BASE/standing-orders" OUTPUT_EMPTY=$(render_standing_orders)
assert_contains "Empty dir still produces header" "$OUTPUT_EMPTY" "STANDING ORDERS"

rm -rf "$TMPDIR_BASE"

echo ""
echo "========================================="
echo "Standing Orders Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
