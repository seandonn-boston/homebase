#!/bin/bash
# Admiral Framework — Regression Gate Tests (QA-10)
# Tests regression detection, threshold enforcement, --allow-regression flag,
# and quality impact report structure.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

SCRIPT="${SCRIPT_DIR}/../regression_gate.sh"
SCORER="${SCRIPT_DIR}/../quality_scorer.sh"

echo "========================================"
echo " Test Suite: regression_gate.sh (QA-10)"
echo "========================================"
echo ""

setup

OUTPUT_FILE="${TMPDIR_BASE}/output.json"
SCORES_FILE="${TMPDIR_BASE}/quality_scores.json"

# Build a mock quality_scorer that returns controlled scores
make_mock_scorer() {
  local scores_json="$1"
  local mock_scorer="${TMPDIR_BASE}/mock_scorer.sh"
  cat > "$mock_scorer" <<SCORER_EOF
#!/bin/bash
echo '${scores_json}'
SCORER_EOF
  chmod +x "$mock_scorer"
  echo "$mock_scorer"
}

# Patch regression_gate to use mock scorer and a controlled scores history file
make_gate() {
  local mock_scorer="$1"
  local history_file="$2"
  local patched="${TMPDIR_BASE}/regression_gate_patched.sh"
  sed \
    -e "s|SCORER=\"\${SCRIPT_DIR}/quality_scorer.sh\"|SCORER=\"${mock_scorer}\"|" \
    -e "s|SCORES_FILE=\"\${SCRIPT_DIR}/metrics/quality_scores.json\"|SCORES_FILE=\"${history_file}\"|" \
    "$SCRIPT" > "$patched"
  chmod +x "$patched"
  echo "$patched"
}

run_gate() {
  local gate="$1"
  shift
  bash "$gate" --json "$@" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

# ---------------------------------------------------------------------------
# Section 1: No regressions — pass
# ---------------------------------------------------------------------------
echo "--- Section 1: No regression ---"

SCORES_CURRENT=$(jq -n '{quality_scores: {timestamp: "2026-03-26T00:00:00Z", total_modules: 1,
  green: 1, yellow: 0, red: 0,
  modules: [{module: "admiral/lib", score: 85, classification: "green",
    dimensions: {test_coverage: {score: 90, raw: 90}, complexity: {score: 80, raw: 5},
      lint: {score: 100, raw: 0}, docs: {score: 85, raw: 0.85},
      churn: {score: 90, raw: 50}, defect_density: {score: 95, raw: 0.5}}}]}}')

SCORES_BASE=$(jq -n '[{timestamp: "2026-03-20T00:00:00Z", scores: [{module: "admiral/lib", score: 82, classification: "green"}]}]')

echo "$SCORES_BASE" > "$SCORES_FILE"
MOCK=$(make_mock_scorer "$SCORES_CURRENT")
GATE=$(make_gate "$MOCK" "$SCORES_FILE")

OUTPUT=$(run_gate "$GATE")
assert_valid_json "1.1 No regression — valid JSON" "$OUTPUT_FILE"
STATUS=$(echo "$OUTPUT" | jq -r '.regression_gate.gate_status' 2>/dev/null | tr -d '\r' || echo "fail")
assert_eq "1.1 No regression — gate_status is pass" "pass" "$STATUS"

RCOUNT=$(echo "$OUTPUT" | jq '.regression_gate.regression_count' 2>/dev/null | tr -d '\r' || echo "1")
assert_eq "1.2 No regression — regression_count is 0" "0" "$RCOUNT"

echo ""

# ---------------------------------------------------------------------------
# Section 2: Score drops below red threshold (60)
# ---------------------------------------------------------------------------
echo "--- Section 2: Threshold breach ---"

SCORES_RED=$(jq -n '{quality_scores: {timestamp: "2026-03-26T00:00:00Z", total_modules: 1,
  green: 0, yellow: 0, red: 1,
  modules: [{module: "admiral/lib", score: 45, classification: "red",
    dimensions: {test_coverage: {score: 30, raw: 30}, complexity: {score: 50, raw: 12},
      lint: {score: 40, raw: 15}, docs: {score: 20, raw: 0.2},
      churn: {score: 50, raw: 500}, defect_density: {score: 30, raw: 8.0}}}]}}')

SCORES_BASE2=$(jq -n '[{timestamp: "2026-03-20T00:00:00Z", scores: [{module: "admiral/lib", score: 78, classification: "yellow"}]}]')

echo "$SCORES_BASE2" > "$SCORES_FILE"
MOCK2=$(make_mock_scorer "$SCORES_RED")
GATE2=$(make_gate "$MOCK2" "$SCORES_FILE")

OUTPUT2=$(run_gate "$GATE2")
assert_valid_json "2.1 Threshold breach — valid JSON" "$OUTPUT_FILE"
STATUS2=$(echo "$OUTPUT2" | jq -r '.regression_gate.gate_status' 2>/dev/null | tr -d '\r' || echo "pass")
assert_eq "2.1 Threshold breach — gate_status is fail" "fail" "$STATUS2"

RCOUNT2=$(echo "$OUTPUT2" | jq '.regression_gate.regression_count' 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "2.2 Threshold breach — regression_count > 0" "0" "$RCOUNT2"

# Verify exit code 1
bash "$GATE2" --json > /dev/null 2>&1
EXIT2=$?
assert_eq "2.3 Threshold breach — exit code 1" "1" "$EXIT2"

echo ""

# ---------------------------------------------------------------------------
# Section 3: >10 point decline triggers regression
# ---------------------------------------------------------------------------
echo "--- Section 3: Point decline ---"

SCORES_DECLINE=$(jq -n '{quality_scores: {timestamp: "2026-03-26T00:00:00Z", total_modules: 1,
  green: 0, yellow: 1, red: 0,
  modules: [{module: "admiral/lib", score: 65, classification: "yellow",
    dimensions: {test_coverage: {score: 60, raw: 60}, complexity: {score: 70, raw: 8},
      lint: {score: 80, raw: 5}, docs: {score: 55, raw: 0.55},
      churn: {score: 70, raw: 200}, defect_density: {score: 75, raw: 1.5}}}]}}')

# Base was 80, current is 65 — decline of 15 points (>10 threshold)
SCORES_BASE3=$(jq -n '[{timestamp: "2026-03-20T00:00:00Z", scores: [{module: "admiral/lib", score: 80, classification: "green"}]}]')

echo "$SCORES_BASE3" > "$SCORES_FILE"
MOCK3=$(make_mock_scorer "$SCORES_DECLINE")
GATE3=$(make_gate "$MOCK3" "$SCORES_FILE")

OUTPUT3=$(run_gate "$GATE3")
assert_valid_json "3.1 Point decline — valid JSON" "$OUTPUT_FILE"
STATUS3=$(echo "$OUTPUT3" | jq -r '.regression_gate.gate_status' 2>/dev/null | tr -d '\r' || echo "pass")
assert_eq "3.1 Point decline — gate_status is fail" "fail" "$STATUS3"

REG_TYPE=$(echo "$OUTPUT3" | jq -r '.regression_gate.regressions[0].type' 2>/dev/null | tr -d '\r' || echo "")
assert_eq "3.2 Point decline — regression type is decline" "decline" "$REG_TYPE"

echo ""

# ---------------------------------------------------------------------------
# Section 4: --allow-regression flag
# ---------------------------------------------------------------------------
echo "--- Section 4: --allow-regression flag ---"

OUTPUT4=$(run_gate "$GATE2" --allow-regression "Known issue, will fix in QA-11")
assert_valid_json "4.1 allow-regression — valid JSON" "$OUTPUT_FILE"
STATUS4=$(echo "$OUTPUT4" | jq -r '.regression_gate.gate_status' 2>/dev/null | tr -d '\r' || echo "fail")
assert_eq "4.1 allow-regression — gate_status is allowed" "allowed" "$STATUS4"

RATIONALE=$(echo "$OUTPUT4" | jq -r '.regression_gate.allow_regression_rationale' 2>/dev/null | tr -d '\r' || echo "")
assert_contains "4.2 allow-regression — rationale recorded" "$RATIONALE" "Known issue"

bash "$GATE2" --json --allow-regression "rationale" > /dev/null 2>&1
EXIT4=$?
assert_eq "4.3 allow-regression — exit code 0" "0" "$EXIT4"

echo ""

# ---------------------------------------------------------------------------
# Section 5: JSON structure
# ---------------------------------------------------------------------------
echo "--- Section 5: JSON structure ---"

OUTPUT5=$(run_gate "$GATE" )
assert_contains "5.1 Structure — has regression_gate key" "$OUTPUT5" '"regression_gate"'
assert_contains "5.2 Structure — has timestamp" "$OUTPUT5" '"timestamp"'
assert_contains "5.3 Structure — has current_branch" "$OUTPUT5" '"current_branch"'
assert_contains "5.4 Structure — has base_branch" "$OUTPUT5" '"base_branch"'
assert_contains "5.5 Structure — has gate_status" "$OUTPUT5" '"gate_status"'
assert_contains "5.6 Structure — has regression_count" "$OUTPUT5" '"regression_count"'
assert_contains "5.7 Structure — has improvement_count" "$OUTPUT5" '"improvement_count"'
assert_contains "5.8 Structure — has regressions array" "$OUTPUT5" '"regressions"'
assert_contains "5.9 Structure — has improvements array" "$OUTPUT5" '"improvements"'

echo ""

# ---------------------------------------------------------------------------
# Section 6: Improvements detected
# ---------------------------------------------------------------------------
echo "--- Section 6: Improvement tracking ---"

# Current score higher than base
SCORES_IMPROVED=$(jq -n '{quality_scores: {timestamp: "2026-03-26T00:00:00Z", total_modules: 1,
  green: 1, yellow: 0, red: 0,
  modules: [{module: "admiral/lib", score: 92, classification: "green",
    dimensions: {test_coverage: {score: 95, raw: 95}, complexity: {score: 90, raw: 4},
      lint: {score: 100, raw: 0}, docs: {score: 90, raw: 0.9},
      churn: {score: 85, raw: 80}, defect_density: {score: 98, raw: 0.1}}}]}}')

SCORES_BASE_OLD=$(jq -n '[{timestamp: "2026-03-10T00:00:00Z", scores: [{module: "admiral/lib", score: 78, classification: "yellow"}]}]')

echo "$SCORES_BASE_OLD" > "$SCORES_FILE"
MOCK6=$(make_mock_scorer "$SCORES_IMPROVED")
GATE6=$(make_gate "$MOCK6" "$SCORES_FILE")

OUTPUT6=$(run_gate "$GATE6")
assert_valid_json "6.1 Improvement — valid JSON" "$OUTPUT_FILE"
STATUS6=$(echo "$OUTPUT6" | jq -r '.regression_gate.gate_status' 2>/dev/null | tr -d '\r' || echo "fail")
assert_eq "6.1 Improvement — gate_status is pass" "pass" "$STATUS6"

ICOUNT=$(echo "$OUTPUT6" | jq '.regression_gate.improvement_count' 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "6.2 Improvement — improvement_count > 0" "0" "$ICOUNT"

echo ""

teardown
print_results "test_regression_gate.sh"
