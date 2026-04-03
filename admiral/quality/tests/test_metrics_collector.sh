#!/bin/bash
# Admiral Framework — Metrics Collector Tests (QA-04)
# Tests module discovery, each metric function, JSON structure, --save, and exit codes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

COLLECTOR="${SCRIPT_DIR}/../metrics_collector.sh"

echo "========================================"
echo " Test Suite: metrics_collector.sh (QA-04)"
echo "========================================"
echo ""

setup

FIXTURES_DIR="${TMPDIR_BASE}/fixtures"
mkdir -p "${FIXTURES_DIR}/module_a/tests"
mkdir -p "${FIXTURES_DIR}/module_b"

OUTPUT_FILE="${TMPDIR_BASE}/output.json"

# Helper
run_collector() {
  bash "$COLLECTOR" --json "$@" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

# ---------------------------------------------------------------------------
# Section 1: Module discovery
# ---------------------------------------------------------------------------
echo "--- Section 1: Module Discovery ---"

# 1.1 --modules flag overrides discovery
cat > "${FIXTURES_DIR}/module_a/main.sh" <<'EOF'
#!/bin/bash
do_thing() { echo done; }
EOF
cat > "${FIXTURES_DIR}/module_a/tests/test_main.sh" <<'EOF'
#!/bin/bash
echo "test"
EOF

OUTPUT=$(run_collector --modules "${FIXTURES_DIR}/module_a")
assert_valid_json "1.1 --modules flag — JSON valid" "$OUTPUT_FILE"
assert_contains "1.1 --modules flag — result has modules array" "$OUTPUT" '"modules"'

# 1.2 Module with no source files — still produces a result (or partial failure)
# This is tested via a known non-empty module

echo ""

# ---------------------------------------------------------------------------
# Section 2: JSON output structure
# ---------------------------------------------------------------------------
echo "--- Section 2: JSON Output Structure ---"

OUTPUT=$(run_collector --modules "${FIXTURES_DIR}/module_a")
assert_valid_json "2.1 JSON output — valid JSON" "$OUTPUT_FILE"
assert_contains "2.1 JSON output — has 'metrics' key" "$OUTPUT" '"metrics"'
assert_contains "2.1 JSON output — has 'timestamp' key" "$OUTPUT" '"timestamp"'
assert_contains "2.1 JSON output — has 'modules' key" "$OUTPUT" '"modules"'
assert_contains "2.1 JSON output — has churn_window_days" "$OUTPUT" '"churn_window_days"'

# 2.2 Module entry has all required fields
MODULE_ENTRY=$(echo "$OUTPUT" | jq '.metrics.modules[0]' 2>/dev/null || echo "{}")
assert_contains "2.2 Module entry — has 'name'" "$MODULE_ENTRY" '"name"'
assert_contains "2.2 Module entry — has 'complexity_avg'" "$MODULE_ENTRY" '"complexity_avg"'
assert_contains "2.2 Module entry — has 'complexity_max'" "$MODULE_ENTRY" '"complexity_max"'
assert_contains "2.2 Module entry — has 'test_coverage_pct'" "$MODULE_ENTRY" '"test_coverage_pct"'
assert_contains "2.2 Module entry — has 'churn_lines_30d'" "$MODULE_ENTRY" '"churn_lines_30d"'
assert_contains "2.2 Module entry — has 'defect_density_per_1k'" "$MODULE_ENTRY" '"defect_density_per_1k"'
assert_contains "2.2 Module entry — has 'lint_violations'" "$MODULE_ENTRY" '"lint_violations"'
assert_contains "2.2 Module entry — has 'test_count'" "$MODULE_ENTRY" '"test_count"'
assert_contains "2.2 Module entry — has 'test_to_code_ratio'" "$MODULE_ENTRY" '"test_to_code_ratio"'

echo ""

# ---------------------------------------------------------------------------
# Section 3: Cyclomatic complexity
# ---------------------------------------------------------------------------
echo "--- Section 3: Cyclomatic Complexity ---"

# 3.1 Simple script with no branches — complexity_avg should be 0 or very low
mkdir -p "${FIXTURES_DIR}/simple_mod"
cat > "${FIXTURES_DIR}/simple_mod/simple.sh" <<'EOF'
#!/bin/bash
say_hello() {
  echo "hello"
}
EOF

OUTPUT=$(run_collector --modules "${FIXTURES_DIR}/simple_mod")
COMPLEXITY=$(echo "$OUTPUT" | jq '.metrics.modules[0].complexity_avg' 2>/dev/null | tr -d '\r' || echo "-1")
assert_eq "3.1 Simple script — complexity_avg is 0" "0" "$COMPLEXITY"

# 3.2 Script with many branches — complexity should be higher
mkdir -p "${FIXTURES_DIR}/complex_mod"
cat > "${FIXTURES_DIR}/complex_mod/complex.sh" <<'EOF'
#!/bin/bash
process() {
  if [ "$1" = "a" ]; then echo a
  elif [ "$1" = "b" ]; then echo b
  elif [ "$1" = "c" ]; then echo c
  elif [ "$1" = "d" ]; then echo d
  elif [ "$1" = "e" ]; then echo e
  fi
  while true; do
    [ "$x" ] || break
    [ "$y" ] && continue
  done
}
EOF

OUTPUT=$(run_collector --modules "${FIXTURES_DIR}/complex_mod")
COMPLEXITY=$(echo "$OUTPUT" | jq '.metrics.modules[0].complexity_avg' 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "3.2 Complex script — complexity_avg > 0" 0 "$COMPLEXITY"

echo ""

# ---------------------------------------------------------------------------
# Section 4: Defect density
# ---------------------------------------------------------------------------
echo "--- Section 4: Defect Density ---"

# 4.1 File with no TODO/FIXME — density is 0.00
mkdir -p "${FIXTURES_DIR}/clean_mod"
cat > "${FIXTURES_DIR}/clean_mod/clean.sh" <<'EOF'
#!/bin/bash
# Clean module with no markers
do_work() { echo done; }
EOF

OUTPUT=$(run_collector --modules "${FIXTURES_DIR}/clean_mod")
DENSITY=$(echo "$OUTPUT" | jq -r '.metrics.modules[0].defect_density_per_1k' 2>/dev/null | tr -d '\r' || echo "-1")
assert_eq "4.1 No markers — density is 0.00" "0.00" "$DENSITY"

# 4.2 File with multiple TODO markers — density > 0
mkdir -p "${FIXTURES_DIR}/todo_mod"
cat > "${FIXTURES_DIR}/todo_mod/todo_heavy.sh" <<'EOF'
#!/bin/bash
# TODO: fix this
# TODO: also fix this
# FIXME: broken
# BUG: known issue
do_work() { echo done; }
EOF

OUTPUT=$(run_collector --modules "${FIXTURES_DIR}/todo_mod")
DENSITY=$(echo "$OUTPUT" | jq -r '.metrics.modules[0].defect_density_per_1k' 2>/dev/null | tr -d '\r' || echo "0.00")
# density should be > 0 (4 markers in 6 lines = very high)
DENSITY_INT=$(echo "$DENSITY" | awk '{printf "%d", $1}')
assert_gt "4.2 With TODO markers — density > 0" 0 "$DENSITY_INT"

echo ""

# ---------------------------------------------------------------------------
# Section 5: Test count and ratio
# ---------------------------------------------------------------------------
echo "--- Section 5: Test Count and Ratio ---"

# 5.1 Module with one source and one test — ratio = 1.00
mkdir -p "${FIXTURES_DIR}/ratio_mod/tests"
cat > "${FIXTURES_DIR}/ratio_mod/lib.sh" <<'EOF'
#!/bin/bash
helper() { echo ok; }
EOF
cat > "${FIXTURES_DIR}/ratio_mod/tests/test_lib.sh" <<'EOF'
#!/bin/bash
echo "test"
EOF

OUTPUT=$(run_collector --modules "${FIXTURES_DIR}/ratio_mod")
TEST_COUNT=$(echo "$OUTPUT" | jq '.metrics.modules[0].test_count' 2>/dev/null | tr -d '\r' || echo "0")
assert_eq "5.1 One source one test — test_count is 1" "1" "$TEST_COUNT"

RATIO=$(echo "$OUTPUT" | jq -r '.metrics.modules[0].test_to_code_ratio' 2>/dev/null | tr -d '\r' || echo "0.00")
assert_eq "5.1 One source one test — ratio is 1.00" "1.00" "$RATIO"

# 5.2 Module with two sources, one test — ratio = 0.50
mkdir -p "${FIXTURES_DIR}/ratio2_mod/tests"
cat > "${FIXTURES_DIR}/ratio2_mod/lib1.sh" <<'EOF'
#!/bin/bash
fn1() { echo 1; }
EOF
cat > "${FIXTURES_DIR}/ratio2_mod/lib2.sh" <<'EOF'
#!/bin/bash
fn2() { echo 2; }
EOF
cat > "${FIXTURES_DIR}/ratio2_mod/tests/test_lib1.sh" <<'EOF'
#!/bin/bash
echo "test"
EOF

OUTPUT=$(run_collector --modules "${FIXTURES_DIR}/ratio2_mod")
RATIO=$(echo "$OUTPUT" | jq -r '.metrics.modules[0].test_to_code_ratio' 2>/dev/null | tr -d '\r' || echo "0.00")
assert_eq "5.2 Two sources one test — ratio is 0.50" "0.50" "$RATIO"

echo ""

# ---------------------------------------------------------------------------
# Section 6: --save flag
# ---------------------------------------------------------------------------
echo "--- Section 6: --save Flag ---"

SAVE_METRICS_DIR="${TMPDIR_BASE}/metrics"
mkdir -p "$SAVE_METRICS_DIR"

# 6.1 --save writes a snapshot JSON file
# We need to override the metrics dir — test by checking file creation in the real metrics dir
OUTPUT=$(bash "$COLLECTOR" --json --save --modules "${FIXTURES_DIR}/simple_mod" 2>/dev/null || true)
REAL_METRICS_DIR="${SCRIPT_DIR}/../metrics"
SNAPSHOT_COUNT=$(find "$REAL_METRICS_DIR" -name "*.json" -newer "${FIXTURES_DIR}/simple_mod/simple.sh" 2>/dev/null | wc -l | tr -d ' ')
assert_gt "6.1 --save — at least one snapshot file created" 0 "$SNAPSHOT_COUNT"

# Clean up snapshot files created during test
find "$REAL_METRICS_DIR" -name "*.json" -newer "${FIXTURES_DIR}/simple_mod/simple.sh" -delete 2>/dev/null || true

echo ""

# ---------------------------------------------------------------------------
# Section 7: --since flag
# ---------------------------------------------------------------------------
echo "--- Section 7: --since Flag ---"

# 7.1 --since 7 sets churn_window_days to 7 in JSON
OUTPUT=$(run_collector --modules "${FIXTURES_DIR}/simple_mod" --since 7)
WINDOW=$(echo "$OUTPUT" | jq '.metrics.churn_window_days' 2>/dev/null | tr -d '\r' || echo "-1")
assert_eq "7.1 --since 7 — churn_window_days is 7" "7" "$WINDOW"

echo ""

# ---------------------------------------------------------------------------
# Section 8: Exit codes
# ---------------------------------------------------------------------------
echo "--- Section 8: Exit Codes ---"

# 8.1 Valid module — exit 0
EXIT_CODE=0
bash "$COLLECTOR" --json --modules "${FIXTURES_DIR}/simple_mod" > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "8.1 Valid module — exit 0" 0 "$EXIT_CODE"

# 8.2 Non-existent module path — partial failure, exit 1
EXIT_CODE=0
bash "$COLLECTOR" --json --modules "/nonexistent/module/path" > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "8.2 Non-existent module — exit 1" 1 "$EXIT_CODE"

# 8.3 Unknown flag — exit 2
EXIT_CODE=0
bash "$COLLECTOR" --bad-flag > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "8.3 Unknown flag — exit 2" 2 "$EXIT_CODE"

# 8.4 Missing --modules argument value — exit 2
EXIT_CODE=0
bash "$COLLECTOR" --modules > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "8.4 Missing --modules value — exit 2" 2 "$EXIT_CODE"

echo ""

# ---------------------------------------------------------------------------
teardown
print_results "metrics_collector.sh Tests"
