#!/bin/bash
# Admiral Framework — Trend Analyzer Tests (QA-05)
# Tests historical metric reading, moving averages, trend detection, and alerts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

SCRIPT="${SCRIPT_DIR}/../trend_analyzer.sh"

echo "========================================"
echo " Test Suite: trend_analyzer.sh (QA-05)"
echo "========================================"
echo ""

setup

METRICS_DIR="${TMPDIR_BASE}/metrics"
mkdir -p "$METRICS_DIR"

OUTPUT_FILE="${TMPDIR_BASE}/output.json"

# Helper: run analyzer against the tmp metrics dir, routing METRICS_DIR
run_analyzer() {
  # Override METRICS_DIR by symlinking or by patching script path via env
  # We'll copy the script with a patched metrics dir path
  local patched="${TMPDIR_BASE}/trend_analyzer_patched.sh"
  sed "s|METRICS_DIR=\"\${SCRIPT_DIR}/metrics\"|METRICS_DIR=\"${METRICS_DIR}\"|" \
    "$SCRIPT" > "$patched"
  chmod +x "$patched"
  bash "$patched" --json "$@" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

# Helper: create a metric snapshot
make_snapshot() {
  local filename="$1"
  local module_name="$2"
  local coverage="$3"
  local complexity_avg="$4"

  jq -n \
    --arg ts "2026-03-${filename}T00:00:00Z" \
    --arg mod "$module_name" \
    --argjson cov "$coverage" \
    --argjson cmp "$complexity_avg" \
    '{metrics: {
        timestamp: $ts,
        churn_window_days: 30,
        modules: [{
          name: $mod,
          complexity_avg: $cmp,
          complexity_max: ($cmp + 5),
          test_coverage_pct: $cov,
          churn_lines_30d: 100,
          defect_density_per_1k: "1.00",
          lint_violations: 2,
          test_count: 3,
          test_to_code_ratio: "0.75"
        }]
      }}' > "${METRICS_DIR}/${filename}.json"
}

# ---------------------------------------------------------------------------
# Section 1: No metrics — graceful empty output
# ---------------------------------------------------------------------------
echo "--- Section 1: Empty metrics directory ---"

OUTPUT=$(run_analyzer)
# Should not fail hard even with no snapshots
assert_valid_json "1.1 No snapshots — valid JSON output" "$OUTPUT_FILE"
assert_contains "1.1 No snapshots — has trend_analysis key" "$OUTPUT" '"trend_analysis"'

echo ""

# ---------------------------------------------------------------------------
# Section 2: Single snapshot — no trend (need 3+)
# ---------------------------------------------------------------------------
echo "--- Section 2: Single snapshot ---"

make_snapshot "01" "admiral/quality" 80 8

OUTPUT=$(run_analyzer)
assert_valid_json "2.1 Single snapshot — valid JSON" "$OUTPUT_FILE"
SNAP_COUNT=$(echo "$OUTPUT" | jq '.trend_analysis.snapshots_analysed' 2>/dev/null | tr -d '\r' || echo "-1")
assert_eq "2.1 Single snapshot — 1 snapshot analysed" "1" "$SNAP_COUNT"

echo ""

# ---------------------------------------------------------------------------
# Section 3: Declining trend detection (3 consecutive drops in coverage)
# ---------------------------------------------------------------------------
echo "--- Section 3: Declining trend detection ---"

make_snapshot "02" "admiral/quality" 75 8
make_snapshot "03" "admiral/quality" 70 8
make_snapshot "04" "admiral/quality" 60 8

OUTPUT=$(run_analyzer)
assert_valid_json "3.1 Declining trend — valid JSON" "$OUTPUT_FILE"
ALERT_COUNT=$(echo "$OUTPUT" | jq '.trend_analysis.alert_count' 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "3.1 Declining trend — at least 1 alert" "0" "$ALERT_COUNT"

# Verify alert type
ALERT_TYPES=$(echo "$OUTPUT" | jq -r '.trend_analysis.alerts[].type' 2>/dev/null || true)
assert_contains "3.2 Declining trend — alert type is declining_trend or pct_decline" \
  "$ALERT_TYPES" "declining\|pct_decline"

echo ""

# ---------------------------------------------------------------------------
# Section 4: Stable trend — no alerts
# ---------------------------------------------------------------------------
echo "--- Section 4: Stable trend ---"

# New clean metrics dir
METRICS_DIR2="${TMPDIR_BASE}/metrics2"
mkdir -p "$METRICS_DIR2"

for day in 10 11 12 13; do
  jq -n \
    --arg ts "2026-03-${day}T00:00:00Z" \
    '{metrics: {
        timestamp: $ts,
        churn_window_days: 30,
        modules: [{
          name: "admiral/lib",
          complexity_avg: 6,
          complexity_max: 10,
          test_coverage_pct: 85,
          churn_lines_30d: 50,
          defect_density_per_1k: "0.50",
          lint_violations: 0,
          test_count: 5,
          test_to_code_ratio: "1.00"
        }]
      }}' > "${METRICS_DIR2}/${day}.json"
done

patched2="${TMPDIR_BASE}/trend_analyzer_patched2.sh"
sed "s|METRICS_DIR=\"\${SCRIPT_DIR}/metrics\"|METRICS_DIR=\"${METRICS_DIR2}\"|" \
  "$SCRIPT" > "$patched2"
chmod +x "$patched2"
OUTPUT2=$(bash "$patched2" --json 2>/dev/null || true)
echo "$OUTPUT2" > "$OUTPUT_FILE"

assert_valid_json "4.1 Stable trend — valid JSON" "$OUTPUT_FILE"
STABLE_ALERTS=$(echo "$OUTPUT2" | jq '.trend_analysis.alert_count' 2>/dev/null | tr -d '\r' || echo "1")
assert_eq "4.1 Stable trend — 0 alerts" "0" "$STABLE_ALERTS"

echo ""

# ---------------------------------------------------------------------------
# Section 5: JSON output structure
# ---------------------------------------------------------------------------
echo "--- Section 5: JSON structure ---"

OUTPUT=$(run_analyzer)
assert_valid_json "5.1 JSON structure — valid JSON" "$OUTPUT_FILE"
assert_contains "5.1 JSON structure — has timestamp" "$OUTPUT" '"timestamp"'
assert_contains "5.1 JSON structure — has snapshots_analysed" "$OUTPUT" '"snapshots_analysed"'
assert_contains "5.1 JSON structure — has alert_count" "$OUTPUT" '"alert_count"'
assert_contains "5.1 JSON structure — has modules array" "$OUTPUT" '"modules"'
assert_contains "5.1 JSON structure — has alerts array" "$OUTPUT" '"alerts"'

echo ""

# ---------------------------------------------------------------------------
# Section 6: --module filter
# ---------------------------------------------------------------------------
echo "--- Section 6: Module filter ---"

make_snapshot "20" "admiral/security" 70 5

OUTPUT=$(run_analyzer --module "admiral/quality")
assert_valid_json "6.1 Module filter — valid JSON" "$OUTPUT_FILE"
MOD_COUNT=$(echo "$OUTPUT" | jq '.trend_analysis.modules | length' 2>/dev/null | tr -d '\r' || echo "0")
assert_eq "6.1 Module filter — only 1 module returned" "1" "$MOD_COUNT"
assert_contains "6.1 Module filter — correct module name" "$OUTPUT" '"admiral/quality"'
assert_not_contains "6.1 Module filter — other module excluded" "$OUTPUT" '"admiral/security"'

echo ""

teardown
print_results "test_trend_analyzer.sh"
