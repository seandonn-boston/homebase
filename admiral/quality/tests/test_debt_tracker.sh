#!/bin/bash
# Admiral Framework — Debt Tracker Tests (QA-06)
# Tests TODO/FIXME/HACK scanning, complexity detection, skipped tests,
# effort estimates, risk scoring, and JSON output structure.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

SCRIPT="${SCRIPT_DIR}/../debt_tracker.sh"

echo "========================================"
echo " Test Suite: debt_tracker.sh (QA-06)"
echo "========================================"
echo ""

setup

FIXTURES_DIR="${TMPDIR_BASE}/fixtures"
mkdir -p "${FIXTURES_DIR}/module_a"
OUTPUT_FILE="${TMPDIR_BASE}/output.json"

run_tracker() {
  bash "$SCRIPT" --json "$@" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

# ---------------------------------------------------------------------------
# Section 1: TODO/FIXME/HACK detection
# ---------------------------------------------------------------------------
echo "--- Section 1: Marker detection ---"

cat > "${FIXTURES_DIR}/module_a/main.sh" <<'EOF'
#!/bin/bash
# TODO: refactor this function
do_thing() {
  # FIXME: this is broken
  echo done
  # HACK: workaround for bug
  return 0
}
EOF

OUTPUT=$(run_tracker --module "${FIXTURES_DIR}/module_a")
assert_valid_json "1.1 Marker scan — valid JSON" "$OUTPUT_FILE"
DEBT_COUNT=$(echo "$OUTPUT" | jq '.debt_report.debt_items' 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "1.1 Marker scan — debt_items > 0" "0" "$DEBT_COUNT"

# Check todo_fixme type present
TYPES=$(echo "$OUTPUT" | jq -r '.debt_report.backlog[].type' 2>/dev/null || true)
assert_contains "1.2 Type — todo_fixme present" "$TYPES" "todo_fixme"
assert_contains "1.3 Type — hack present" "$TYPES" "hack"

echo ""

# ---------------------------------------------------------------------------
# Section 2: High complexity detection
# ---------------------------------------------------------------------------
echo "--- Section 2: Complexity detection ---"

cat > "${FIXTURES_DIR}/module_a/complex.sh" <<'EOF'
#!/bin/bash
do_complex() {
  if [ "$1" = "a" ]; then
    if [ "$2" = "b" ]; then
      while true; do
        for x in 1 2 3; do
          if [ "$x" = "1" ]; then
            echo a || echo b
            echo c && echo d
            if [ "$x" = "1" ]; then
              while true; do
                if true; then
                  if true; then
                    if true; then
                      if true; then
                        echo deep
                      fi
                    fi
                  fi
                fi
              done
            fi
          fi
        done
      done
    fi
  fi
}
EOF

OUTPUT=$(run_tracker --module "${FIXTURES_DIR}/module_a")
assert_valid_json "2.1 Complexity scan — valid JSON" "$OUTPUT_FILE"
TYPES2=$(echo "$OUTPUT" | jq -r '.debt_report.backlog[].type' 2>/dev/null || true)
assert_contains "2.1 Complexity scan — complexity type present" "$TYPES2" "complexity"

echo ""

# ---------------------------------------------------------------------------
# Section 3: Skipped test detection
# ---------------------------------------------------------------------------
echo "--- Section 3: Skipped test detection ---"

mkdir -p "${FIXTURES_DIR}/module_a/tests"
cat > "${FIXTURES_DIR}/module_a/tests/main.test.ts" <<'EOF'
describe("suite", () => {
  it.skip("should do something", () => {
    expect(true).toBe(false);
  });
  xit("another skipped test", () => {});
  xdescribe("skipped group", () => {});
});
EOF

OUTPUT=$(run_tracker --module "${FIXTURES_DIR}/module_a")
assert_valid_json "3.1 Skipped tests — valid JSON" "$OUTPUT_FILE"
TYPES3=$(echo "$OUTPUT" | jq -r '.debt_report.backlog[].type' 2>/dev/null || true)
assert_contains "3.1 Skipped tests — skipped_test type present" "$TYPES3" "skipped_test"

echo ""

# ---------------------------------------------------------------------------
# Section 4: Risk scoring and priority sort
# ---------------------------------------------------------------------------
echo "--- Section 4: Risk scoring ---"

OUTPUT=$(run_tracker --module "${FIXTURES_DIR}/module_a")
FIRST_RISK=$(echo "$OUTPUT" | jq '.debt_report.backlog[0].risk_score' 2>/dev/null | tr -d '\r' || echo "0")
LAST_IDX=$(echo "$OUTPUT" | jq '.debt_report.backlog | length - 1' 2>/dev/null | tr -d '\r' || echo "0")
LAST_RISK=$(echo "$OUTPUT" | jq ".debt_report.backlog[${LAST_IDX}].risk_score" 2>/dev/null | tr -d '\r' || echo "0")

# First item should have risk >= last item (sorted descending)
IS_SORTED=$(awk "BEGIN { print ($FIRST_RISK >= $LAST_RISK) ? 1 : 0 }")
assert_eq "4.1 Risk sort — backlog sorted descending by risk_score" "1" "$IS_SORTED"

echo ""

# ---------------------------------------------------------------------------
# Section 5: Effort field present and valid
# ---------------------------------------------------------------------------
echo "--- Section 5: Effort estimates ---"

EFFORTS=$(echo "$OUTPUT" | jq -r '.debt_report.backlog[].effort' 2>/dev/null || true)
# All efforts should be S, M, or L
INVALID=$(echo "$EFFORTS" | grep -vE '^[SML]$' | wc -l | tr -d ' ')
assert_eq "5.1 Effort values — all S/M/L" "0" "$INVALID"

echo ""

# ---------------------------------------------------------------------------
# Section 6: JSON structure
# ---------------------------------------------------------------------------
echo "--- Section 6: JSON structure ---"

assert_contains "6.1 Structure — has debt_report key" "$OUTPUT" '"debt_report"'
assert_contains "6.2 Structure — has timestamp" "$OUTPUT" '"timestamp"'
assert_contains "6.3 Structure — has total_modules" "$OUTPUT" '"total_modules"'
assert_contains "6.4 Structure — has debt_items" "$OUTPUT" '"debt_items"'
assert_contains "6.5 Structure — has debt_ratio" "$OUTPUT" '"debt_ratio"'
assert_contains "6.6 Structure — has high_risk_count" "$OUTPUT" '"high_risk_count"'
assert_contains "6.7 Structure — has backlog array" "$OUTPUT" '"backlog"'

echo ""

# ---------------------------------------------------------------------------
# Section 7: --save flag
# ---------------------------------------------------------------------------
echo "--- Section 7: --save flag ---"

SAVE_OUTPUT="${TMPDIR_BASE}/save_test.json"
bash "$SCRIPT" --json --save --module "${FIXTURES_DIR}/module_a" > "$SAVE_OUTPUT" 2>/dev/null || true

# The saved file should appear in metrics dir (if it can find a path)
# Here we just verify the JSON output is still valid when --save is used
assert_valid_json "7.1 --save flag — JSON output still valid" "$SAVE_OUTPUT"

echo ""

# ---------------------------------------------------------------------------
# Section 8: Clean module has 0 debt
# ---------------------------------------------------------------------------
echo "--- Section 8: Clean module ---"

CLEAN_DIR="${TMPDIR_BASE}/clean_module"
mkdir -p "$CLEAN_DIR"
cat > "${CLEAN_DIR}/clean.sh" <<'EOF'
#!/bin/bash
do_clean() {
  echo "no issues here"
}
EOF

OUTPUT_CLEAN=$(bash "$SCRIPT" --json --module "$CLEAN_DIR" 2>/dev/null || true)
echo "$OUTPUT_CLEAN" > "$OUTPUT_FILE"
assert_valid_json "8.1 Clean module — valid JSON" "$OUTPUT_FILE"
HIGH_RISK=$(echo "$OUTPUT_CLEAN" | jq '.debt_report.high_risk_count' 2>/dev/null | tr -d '\r' || echo "1")
assert_eq "8.1 Clean module — 0 high-risk items" "0" "$HIGH_RISK"

echo ""

teardown
print_results "test_debt_tracker.sh"
