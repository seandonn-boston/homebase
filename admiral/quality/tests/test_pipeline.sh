#!/bin/bash
# Admiral Framework — Quality Pipeline Tests (QA-03)
# Tests stage execution, JSON output structure, fail-fast, blocker halting,
# and exit codes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

PIPELINE="${SCRIPT_DIR}/../pipeline.sh"

echo "========================================"
echo " Test Suite: pipeline.sh (QA-03)"
echo "========================================"
echo ""

setup

FIXTURES_DIR="${TMPDIR_BASE}/fixtures"
mkdir -p "$FIXTURES_DIR"

OUTPUT_FILE="${TMPDIR_BASE}/output.json"

# ---------------------------------------------------------------------------
# Helper: run pipeline against a scoped path, capture JSON to OUTPUT_FILE
# ---------------------------------------------------------------------------
run_pipeline() {
  bash "$PIPELINE" --json "$@" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

# ---------------------------------------------------------------------------
# Section 1: JSON output structure
# ---------------------------------------------------------------------------
echo "--- Section 1: JSON Output Structure ---"

# 1.1 Pipeline with all stages on a clean path emits valid JSON
OUTPUT=$(run_pipeline --path "$FIXTURES_DIR" --stages "coverage")
assert_valid_json "1.1 Pipeline JSON — valid JSON" "$OUTPUT_FILE"
assert_contains "1.1 Pipeline JSON — has 'pipeline' key" "$OUTPUT" '"pipeline"'
assert_contains "1.1 Pipeline JSON — has 'timestamp' key" "$OUTPUT" '"timestamp"'
assert_contains "1.1 Pipeline JSON — has 'stages' key" "$OUTPUT" '"stages"'
assert_contains "1.1 Pipeline JSON — has 'overall' key" "$OUTPUT" '"overall"'
assert_contains "1.1 Pipeline JSON — has 'duration_ms' key" "$OUTPUT" '"duration_ms"'

# 1.2 Each stage entry has expected fields
OUTPUT=$(run_pipeline --path "$FIXTURES_DIR" --stages "coverage")
assert_contains "1.2 Stage entry — has 'name'" "$OUTPUT" '"name"'
assert_contains "1.2 Stage entry — has 'status'" "$OUTPUT" '"status"'
assert_contains "1.2 Stage entry — has 'duration_ms'" "$OUTPUT" '"duration_ms"'
assert_contains "1.2 Stage entry — has 'issues'" "$OUTPUT" '"issues"'
assert_contains "1.2 Stage entry — has 'detail'" "$OUTPUT" '"detail"'

echo ""

# ---------------------------------------------------------------------------
# Section 2: Stage selection via --stages
# ---------------------------------------------------------------------------
echo "--- Section 2: Stage Selection ---"

# 2.1 --stages coverage produces one stage entry
OUTPUT=$(run_pipeline --path "$FIXTURES_DIR" --stages "coverage")
STAGE_COUNT=$(echo "$OUTPUT" | jq '.pipeline.stages | length' 2>/dev/null | tr -d '\r' || echo "0")
# All 6 stages run but non-selected are skipped — verify coverage stage present
assert_contains "2.1 Single stage — coverage stage present" "$OUTPUT" '"coverage"'

# 2.2 --stages lint,typecheck — both stages present, others skipped
OUTPUT=$(run_pipeline --path "$FIXTURES_DIR" --stages "lint,typecheck")
assert_contains "2.2 Two stages — lint present" "$OUTPUT" '"lint"'
assert_contains "2.2 Two stages — typecheck present" "$OUTPUT" '"typecheck"'

# 2.3 Skipped stages appear with status skip
OUTPUT=$(run_pipeline --path "$FIXTURES_DIR" --stages "coverage")
SKIP_COUNT=$(echo "$OUTPUT" | jq '[.pipeline.stages[] | select(.status == "skip")] | length' 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "2.3 Non-selected stages — at least 4 skipped" 3 "$SKIP_COUNT"

echo ""

# ---------------------------------------------------------------------------
# Section 3: Overall status
# ---------------------------------------------------------------------------
echo "--- Section 3: Overall Status ---"

# 3.1 Coverage stage on empty fixtures — no coverage report — should pass (informational)
OUTPUT=$(run_pipeline --path "$FIXTURES_DIR" --stages "coverage")
OVERALL=$(echo "$OUTPUT" | jq -r '.pipeline.overall' 2>/dev/null | tr -d '\r' || echo "unknown")
assert_eq "3.1 Coverage on empty dir — overall pass" "pass" "$OVERALL"

# 3.2 Pipeline with no failing stages — overall pass
OUTPUT=$(run_pipeline --path "$FIXTURES_DIR" --stages "coverage")
assert_contains "3.2 No failures — overall pass" "$OUTPUT" '"pass"'

echo ""

# ---------------------------------------------------------------------------
# Section 4: --fail-fast flag
# ---------------------------------------------------------------------------
echo "--- Section 4: Fail-fast ---"

# Create a mock bad script that makes the test stage fail
BAD_TEST_DIR="${TMPDIR_BASE}/bad-tests"
mkdir -p "$BAD_TEST_DIR"
cat > "${BAD_TEST_DIR}/test_failing.sh" <<'EOF'
#!/bin/bash
echo "FAIL intentional"
exit 1
EOF
chmod +x "${BAD_TEST_DIR}/test_failing.sh"

# 4.1 Without --fail-fast: test fails but pipeline continues to next stages
OUTPUT=$(bash "$PIPELINE" --json --path "$BAD_TEST_DIR" --stages "test,coverage" 2>/dev/null || true)
TEST_STATUS=$(echo "$OUTPUT" | jq -r '.pipeline.stages[] | select(.name == "test") | .status' 2>/dev/null | tr -d '\r' || echo "unknown")
COVERAGE_STATUS=$(echo "$OUTPUT" | jq -r '.pipeline.stages[] | select(.name == "coverage") | .status' 2>/dev/null | tr -d '\r' || echo "unknown")
# test is not a blocker — coverage should still run (not be skipped due to halt)
assert_eq "4.1 Without fail-fast — test stage fails" "fail" "$TEST_STATUS"

# 4.2 With --fail-fast: pipeline halts after first failure
OUTPUT=$(bash "$PIPELINE" --json --fail-fast --path "$BAD_TEST_DIR" --stages "test,coverage" 2>/dev/null || true)
TEST_STATUS=$(echo "$OUTPUT" | jq -r '.pipeline.stages[] | select(.name == "test") | .status' 2>/dev/null | tr -d '\r' || echo "unknown")
COVERAGE_STATUS=$(echo "$OUTPUT" | jq -r '.pipeline.stages[] | select(.name == "coverage") | .status' 2>/dev/null | tr -d '\r' || echo "unknown")
assert_eq "4.2 With fail-fast — test stage fails" "fail" "$TEST_STATUS"
assert_eq "4.2 With fail-fast — coverage skipped after halt" "skip" "$COVERAGE_STATUS"

echo ""

# ---------------------------------------------------------------------------
# Section 5: Exit codes
# ---------------------------------------------------------------------------
echo "--- Section 5: Exit Codes ---"

# 5.1 Clean path, coverage-only — exit 0
EXIT_CODE=0
bash "$PIPELINE" --json --path "$FIXTURES_DIR" --stages "coverage" > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "5.1 No failures — exit 0" 0 "$EXIT_CODE"

# 5.2 Failing test — exit 1
EXIT_CODE=0
bash "$PIPELINE" --json --path "$BAD_TEST_DIR" --stages "test" > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "5.2 Failing test — exit 1" 1 "$EXIT_CODE"

# 5.3 Unknown flag — exit 2
EXIT_CODE=0
bash "$PIPELINE" --unknown-flag > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "5.3 Unknown flag — exit 2" 2 "$EXIT_CODE"

# 5.4 Missing --path argument — exit 2
EXIT_CODE=0
bash "$PIPELINE" --path > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "5.4 Missing --path arg — exit 2" 2 "$EXIT_CODE"

echo ""

# ---------------------------------------------------------------------------
# Section 6: Security stage
# ---------------------------------------------------------------------------
echo "--- Section 6: Security Stage ---"

# 6.1 File with hardcoded password-like pattern — security fails
SEC_DIR="${TMPDIR_BASE}/sec-fixtures"
mkdir -p "$SEC_DIR"
printf '#!/bin/bash\npassword = "my_secret_pass123"\n' > "${SEC_DIR}/bad_security.sh"

OUTPUT=$(bash "$PIPELINE" --json --path "$SEC_DIR" --stages "security" 2>/dev/null || true)
SEC_STATUS=$(echo "$OUTPUT" | jq -r '.pipeline.stages[] | select(.name == "security") | .status' 2>/dev/null | tr -d '\r' || echo "unknown")
assert_eq "6.1 Hardcoded password — security fails" "fail" "$SEC_STATUS"

# 6.2 Clean files — security passes
CLEAN_DIR="${TMPDIR_BASE}/clean-sec"
mkdir -p "$CLEAN_DIR"
printf '#!/bin/bash\necho "hello world"\n' > "${CLEAN_DIR}/clean_script.sh"
OUTPUT=$(bash "$PIPELINE" --json --path "$CLEAN_DIR" --stages "security" 2>/dev/null || true)
SEC_STATUS=$(echo "$OUTPUT" | jq -r '.pipeline.stages[] | select(.name == "security") | .status' 2>/dev/null | tr -d '\r' || echo "unknown")
assert_eq "6.2 Clean files — security passes" "pass" "$SEC_STATUS"

echo ""

# ---------------------------------------------------------------------------
# Section 7: Self-heal hints
# ---------------------------------------------------------------------------
echo "--- Section 7: Self-heal Hints ---"

# 7.1 Failing stage detail contains SELF-HEAL hint
OUTPUT=$(bash "$PIPELINE" --json --path "$BAD_TEST_DIR" --stages "test" 2>/dev/null || true)
DETAIL=$(echo "$OUTPUT" | jq -r '.pipeline.stages[] | select(.name == "test") | .detail' 2>/dev/null | tr -d '\r' || echo "")
assert_contains "7.1 Failing stage — detail has SELF-HEAL hint" "$DETAIL" "SELF-HEAL"

echo ""

# ---------------------------------------------------------------------------
teardown
print_results "pipeline.sh Tests"
