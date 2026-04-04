#!/bin/bash
# Admiral Framework — Review Checklist Tests (QA-08)
# Tests file classification, checklist generation, risk levels, and JSON output.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

SCRIPT="${SCRIPT_DIR}/../review_checklist.sh"

echo "========================================"
echo " Test Suite: review_checklist.sh (QA-08)"
echo "========================================"
echo ""

setup

OUTPUT_FILE="${TMPDIR_BASE}/output.json"

run_checklist() {
  bash "$SCRIPT" --json "$@" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

run_checklist_md() {
  bash "$SCRIPT" "$@" 2>/dev/null || true
}

# ---------------------------------------------------------------------------
# Section 1: No files — graceful empty output
# ---------------------------------------------------------------------------
echo "--- Section 1: No files ---"

OUTPUT=$(run_checklist)
assert_valid_json "1.1 No files — valid JSON" "$OUTPUT_FILE"
assert_contains "1.1 No files — has checklist key" "$OUTPUT" '"checklist"'

echo ""

# ---------------------------------------------------------------------------
# Section 2: High-risk file classification
# ---------------------------------------------------------------------------
echo "--- Section 2: High-risk classification ---"

# Hooks files are high risk per risk_profiles.json
HIGH_FILE=".hooks/some_hook.sh"
OUTPUT=$(run_checklist "$HIGH_FILE")
assert_valid_json "2.1 High-risk file — valid JSON" "$OUTPUT_FILE"
RISK=$(echo "$OUTPUT" | jq -r '.checklist.overall_risk' 2>/dev/null | tr -d '\r' || echo "low")
assert_eq "2.1 High-risk file — overall_risk is high" "high" "$RISK"

# High risk requires 2 reviewers
MIN_REV=$(echo "$OUTPUT" | jq '.checklist.min_reviewers' 2>/dev/null | tr -d '\r' || echo "1")
assert_eq "2.2 High-risk — min_reviewers is 2" "2" "$MIN_REV"

# High risk checklist contains security items
assert_contains "2.3 High-risk — security item in checklist" "$OUTPUT" "Security"

echo ""

# ---------------------------------------------------------------------------
# Section 3: Low-risk file classification (tests / docs)
# ---------------------------------------------------------------------------
echo "--- Section 3: Low-risk classification ---"

LOW_FILE="admiral/quality/tests/test_something.sh"
OUTPUT=$(run_checklist "$LOW_FILE")
assert_valid_json "3.1 Low-risk file — valid JSON" "$OUTPUT_FILE"
RISK_LOW=$(echo "$OUTPUT" | jq -r '.checklist.overall_risk' 2>/dev/null | tr -d '\r' || echo "high")
assert_eq "3.1 Low-risk file — overall_risk is low" "low" "$RISK_LOW"

echo ""

# ---------------------------------------------------------------------------
# Section 4: Medium-risk file (default for admiral/ source)
# ---------------------------------------------------------------------------
echo "--- Section 4: Medium-risk classification ---"

MED_FILE="admiral/brain/some_module.sh"
OUTPUT=$(run_checklist "$MED_FILE")
assert_valid_json "4.1 Medium-risk file — valid JSON" "$OUTPUT_FILE"
RISK_MED=$(echo "$OUTPUT" | jq -r '.checklist.overall_risk' 2>/dev/null | tr -d '\r' || echo "high")
assert_eq "4.1 Medium-risk file — overall_risk is medium" "medium" "$RISK_MED"

echo ""

# ---------------------------------------------------------------------------
# Section 5: Mixed risk — overall risk is max(files)
# ---------------------------------------------------------------------------
echo "--- Section 5: Mixed risk files ---"

OUTPUT=$(run_checklist ".hooks/hook.sh" "admiral/quality/tests/test_x.sh")
assert_valid_json "5.1 Mixed risk — valid JSON" "$OUTPUT_FILE"
RISK_MIX=$(echo "$OUTPUT" | jq -r '.checklist.overall_risk' 2>/dev/null | tr -d '\r' || echo "low")
assert_eq "5.1 Mixed risk — overall_risk is high (max)" "high" "$RISK_MIX"

echo ""

# ---------------------------------------------------------------------------
# Section 6: Checklist items array structure
# ---------------------------------------------------------------------------
echo "--- Section 6: Checklist item structure ---"

OUTPUT=$(run_checklist "admiral/quality/metrics_collector.sh")
assert_valid_json "6.1 Item structure — valid JSON" "$OUTPUT_FILE"
assert_contains "6.1 Item structure — has checklist_items" "$OUTPUT" '"checklist_items"'
ITEM_COUNT=$(echo "$OUTPUT" | jq '.checklist.checklist_items | length' 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "6.1 Item structure — at least 1 item" "0" "$ITEM_COUNT"

# Each item has text, auto_verified, and checked
FIRST_ITEM=$(echo "$OUTPUT" | jq '.checklist.checklist_items[0]' 2>/dev/null || echo "{}")
assert_contains "6.2 Item fields — has text" "$FIRST_ITEM" '"text"'
assert_contains "6.3 Item fields — has auto_verified" "$FIRST_ITEM" '"auto_verified"'
assert_contains "6.4 Item fields — has checked" "$FIRST_ITEM" '"checked"'

echo ""

# ---------------------------------------------------------------------------
# Section 7: Markdown output (non-JSON mode)
# ---------------------------------------------------------------------------
echo "--- Section 7: Markdown output ---"

MD_OUTPUT=$(run_checklist_md "admiral/quality/metrics_collector.sh" 2>/dev/null || true)
assert_contains "7.1 Markdown — contains PR Review Checklist header" \
  "$MD_OUTPUT" "PR Review Checklist"
assert_contains "7.2 Markdown — contains Risk Level" "$MD_OUTPUT" "Risk Level"
assert_contains "7.3 Markdown — contains Files Changed" "$MD_OUTPUT" "Files Changed"
assert_contains "7.4 Markdown — contains checklist items" "$MD_OUTPUT" "- [ ]"

echo ""

# ---------------------------------------------------------------------------
# Section 8: Security config file classified as high risk
# ---------------------------------------------------------------------------
echo "--- Section 8: Config file classification ---"

OUTPUT=$(run_checklist "admiral/config/pipeline_manifest.json")
assert_valid_json "8.1 Config file — valid JSON" "$OUTPUT_FILE"
RISK_CFG=$(echo "$OUTPUT" | jq -r '.checklist.overall_risk' 2>/dev/null | tr -d '\r' || echo "low")
assert_eq "8.1 Config file — risk is high" "high" "$RISK_CFG"

echo ""

teardown
print_results "test_review_checklist.sh"
