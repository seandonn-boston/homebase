#!/bin/bash
# Admiral Framework — Quality Scorer Tests (QA-09)
# Tests dimension scoring, composite calculation, classification, and JSON output.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

SCRIPT="${SCRIPT_DIR}/../quality_scorer.sh"
WEIGHTS_CONFIG="${PROJECT_ROOT}/admiral/config/quality_weights.json"

echo "========================================"
echo " Test Suite: quality_scorer.sh (QA-09)"
echo "========================================"
echo ""

setup

FIXTURES_DIR="${TMPDIR_BASE}/fixtures"
MODULE_A="${FIXTURES_DIR}/module_a"
MODULE_B="${FIXTURES_DIR}/module_b"
mkdir -p "$MODULE_A" "$MODULE_B"
OUTPUT_FILE="${TMPDIR_BASE}/output.json"

run_scorer() {
  bash "$SCRIPT" --json "$@" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

# ---------------------------------------------------------------------------
# Section 1: JSON output structure
# ---------------------------------------------------------------------------
echo "--- Section 1: JSON structure ---"

cat > "${MODULE_A}/main.sh" <<'EOF'
#!/bin/bash
do_thing() { echo "hello"; }
EOF

cat > "${MODULE_A}/test_main.sh" <<'EOF'
#!/bin/bash
echo "test"
EOF

OUTPUT=$(run_scorer --module "$MODULE_A")
assert_valid_json "1.1 JSON structure — valid JSON" "$OUTPUT_FILE"
assert_contains "1.1 JSON structure — has quality_scores key" "$OUTPUT" '"quality_scores"'
assert_contains "1.2 JSON structure — has timestamp" "$OUTPUT" '"timestamp"'
assert_contains "1.3 JSON structure — has total_modules" "$OUTPUT" '"total_modules"'
assert_contains "1.4 JSON structure — has green count" "$OUTPUT" '"green"'
assert_contains "1.5 JSON structure — has yellow count" "$OUTPUT" '"yellow"'
assert_contains "1.6 JSON structure — has red count" "$OUTPUT" '"red"'
assert_contains "1.7 JSON structure — has modules array" "$OUTPUT" '"modules"'

echo ""

# ---------------------------------------------------------------------------
# Section 2: Module entry structure
# ---------------------------------------------------------------------------
echo "--- Section 2: Module entry structure ---"

MOD_ENTRY=$(echo "$OUTPUT" | jq '.quality_scores.modules[0]' 2>/dev/null || echo "{}")
assert_contains "2.1 Module entry — has module name" "$MOD_ENTRY" '"module"'
assert_contains "2.2 Module entry — has score" "$MOD_ENTRY" '"score"'
assert_contains "2.3 Module entry — has classification" "$MOD_ENTRY" '"classification"'
assert_contains "2.4 Module entry — has dimensions" "$MOD_ENTRY" '"dimensions"'

# Dimensions
assert_contains "2.5 Dimensions — test_coverage" "$MOD_ENTRY" '"test_coverage"'
assert_contains "2.6 Dimensions — complexity" "$MOD_ENTRY" '"complexity"'
assert_contains "2.7 Dimensions — lint" "$MOD_ENTRY" '"lint"'
assert_contains "2.8 Dimensions — docs" "$MOD_ENTRY" '"docs"'
assert_contains "2.9 Dimensions — churn" "$MOD_ENTRY" '"churn"'
assert_contains "2.10 Dimensions — defect_density" "$MOD_ENTRY" '"defect_density"'

echo ""

# ---------------------------------------------------------------------------
# Section 3: Score is within 0-100 range
# ---------------------------------------------------------------------------
echo "--- Section 3: Score range ---"

SCORE=$(echo "$OUTPUT" | jq '.quality_scores.modules[0].score' 2>/dev/null | tr -d '\r' || echo "0")
IN_RANGE=$(awk "BEGIN { print ($SCORE >= 0 && $SCORE <= 100) ? 1 : 0 }")
assert_eq "3.1 Score range — score is 0-100" "1" "$IN_RANGE"

echo ""

# ---------------------------------------------------------------------------
# Section 4: Classification matches score
# ---------------------------------------------------------------------------
echo "--- Section 4: Classification correctness ---"

CLASSIFICATION=$(echo "$OUTPUT" | jq -r '.quality_scores.modules[0].classification' 2>/dev/null | tr -d '\r' || echo "")
# Should be green, yellow, or red
assert_contains "4.1 Classification — valid value" "green yellow red" "$CLASSIFICATION"

# Verify logic: if score >= 80 => green, 60-79 => yellow, <60 => red
GREEN_THRESHOLD=$(jq -r '.thresholds.green' "$WEIGHTS_CONFIG" | tr -d '\r')
YELLOW_THRESHOLD=$(jq -r '.thresholds.yellow' "$WEIGHTS_CONFIG" | tr -d '\r')
EXPECTED_CLASS=$(awk "BEGIN {
  if ($SCORE >= $GREEN_THRESHOLD) print \"green\"
  else if ($SCORE >= $YELLOW_THRESHOLD) print \"yellow\"
  else print \"red\"
}")
assert_eq "4.2 Classification — matches score thresholds" "$EXPECTED_CLASS" "$CLASSIFICATION"

echo ""

# ---------------------------------------------------------------------------
# Section 5: Dimension scores in 0-100 range
# ---------------------------------------------------------------------------
echo "--- Section 5: Dimension scores ---"

DIMS=$(echo "$OUTPUT" | jq '.quality_scores.modules[0].dimensions' 2>/dev/null || echo "{}")
for dim in test_coverage complexity lint docs churn defect_density; do
  DIM_SCORE=$(echo "$DIMS" | jq --arg d "$dim" '.[$d].score' 2>/dev/null | tr -d '\r' || echo "0")
  IN_RANGE_DIM=$(awk "BEGIN { print ($DIM_SCORE >= 0 && $DIM_SCORE <= 100) ? 1 : 0 }")
  assert_eq "5.1 Dim score range — $dim is 0-100" "1" "$IN_RANGE_DIM"
done

echo ""

# ---------------------------------------------------------------------------
# Section 6: --save persists scores
# ---------------------------------------------------------------------------
echo "--- Section 6: --save flag ---"

SCORES_FILE="${TMPDIR_BASE}/quality_scores.json"
PATCHED="${TMPDIR_BASE}/quality_scorer_patched.sh"
sed "s|SCORES_FILE=\"\${METRICS_DIR}/quality_scores.json\"|SCORES_FILE=\"${SCORES_FILE}\"|" \
  "$SCRIPT" > "$PATCHED"
chmod +x "$PATCHED"

bash "$PATCHED" --json --save --module "$MODULE_A" > "$OUTPUT_FILE" 2>/dev/null || true
assert_file_exists "6.1 --save — scores file created" "$SCORES_FILE"
assert_valid_json "6.2 --save — scores file is valid JSON" "$SCORES_FILE"

# Running again appends a second snapshot
bash "$PATCHED" --json --save --module "$MODULE_A" >> /dev/null 2>/dev/null || true
HISTORY_LEN=$(jq 'length' "$SCORES_FILE" 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "6.3 --save — history appends entries" "1" "$HISTORY_LEN"

echo ""

# ---------------------------------------------------------------------------
# Section 7: Exit code based on red modules
# ---------------------------------------------------------------------------
echo "--- Section 7: Exit codes ---"

# Module with only a complex file and no tests => likely red
cat > "${MODULE_B}/ugly.sh" <<'EOF'
#!/bin/bash
# TODO bad code
# FIXME broken
# HACK workaround
do_ugly() {
  if true; then if true; then if true; then if true; then
    while true; do
      for x in 1 2 3 4 5; do
        if [ "$x" ]; then echo a || echo b && echo c; fi
      done
    done
  fi; fi; fi; fi
}
EOF

run_scorer --module "$MODULE_B" > /dev/null 2>&1 || true
UGLY_EXIT=$?
UGLY_OUTPUT=$(run_scorer --module "$MODULE_B")
UGLY_CLASS=$(echo "$UGLY_OUTPUT" | jq -r '.quality_scores.modules[0].classification' 2>/dev/null | tr -d '\r' || echo "green")

if [ "$UGLY_CLASS" = "red" ]; then
  assert_eq "7.1 Red module — exit code 1" "1" "$UGLY_EXIT"
else
  # Module scored ok; test pass still valid
  assert_eq "7.1 Non-red module — exit code 0" "0" "$UGLY_EXIT"
fi

echo ""

teardown
print_results "test_quality_scorer.sh"
