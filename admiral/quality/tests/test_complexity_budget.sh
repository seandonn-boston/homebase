#!/bin/bash
# Admiral Framework — Complexity Budget Tests (QA-07)
# Tests budget loading, overage detection, credit earning, and ratchet enforcement.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

SCRIPT="${SCRIPT_DIR}/../complexity_budget.sh"
BUDGETS_CONFIG="${PROJECT_ROOT}/admiral/config/complexity_budgets.json"

echo "========================================"
echo " Test Suite: complexity_budget.sh (QA-07)"
echo "========================================"
echo ""

setup

FIXTURES_DIR="${TMPDIR_BASE}/fixtures"
MODULE_A="${FIXTURES_DIR}/module_a"
mkdir -p "$MODULE_A"
OUTPUT_FILE="${TMPDIR_BASE}/output.json"

# Create a patched budgets config pointing to our test fixture module
PATCHED_CONFIG="${TMPDIR_BASE}/complexity_budgets.json"

make_budget_config() {
  local max_avg="$1"
  local max_per_file="$2"
  local max_per_func="$3"
  local credits="$4"
  jq -n \
    --arg mod "$MODULE_A" \
    --argjson ma "$max_avg" \
    --argjson mf "$max_per_file" \
    --argjson mn "$max_per_func" \
    --argjson cr "$credits" \
    '{
      defaults: {max_avg: 10, max_per_file: 20, max_per_function: 15, credits_available: 0},
      modules: {
        ($mod): {max_avg: $ma, max_per_file: $mf, max_per_function: $mn, credits_available: $cr}
      }
    }' > "$PATCHED_CONFIG"
}

run_budget() {
  local patched_script="${TMPDIR_BASE}/complexity_budget_patched.sh"
  sed "s|BUDGETS_FILE=\"\${PROJECT_ROOT}/admiral/config/complexity_budgets.json\"|BUDGETS_FILE=\"${PATCHED_CONFIG}\"|" \
    "$SCRIPT" > "$patched_script"
  chmod +x "$patched_script"
  bash "$patched_script" --json "$@" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

# ---------------------------------------------------------------------------
# Section 1: Simple file within budget
# ---------------------------------------------------------------------------
echo "--- Section 1: Within budget ---"

cat > "${MODULE_A}/simple.sh" <<'EOF'
#!/bin/bash
do_simple() {
  echo "hello"
}
EOF

make_budget_config 10 20 15 0

OUTPUT=$(run_budget --module "$MODULE_A")
assert_valid_json "1.1 Within budget — valid JSON" "$OUTPUT_FILE"
OVER=$(echo "$OUTPUT" | jq '.complexity_budget.modules_over_budget' 2>/dev/null | tr -d '\r' || echo "1")
assert_eq "1.1 Within budget — 0 modules over budget" "0" "$OVER"

echo ""

# ---------------------------------------------------------------------------
# Section 2: File exceeding per-file budget
# ---------------------------------------------------------------------------
echo "--- Section 2: Overage detection ---"

cat > "${MODULE_A}/complex.sh" <<'EOF'
#!/bin/bash
do_complex() {
  if true; then
    if true; then
      if true; then
        while true; do
          for x in 1 2 3; do
            if [ "$x" = "1" ]; then
              echo a || echo b
              echo c && echo d
            fi
          done
        done
      fi
    fi
  fi
}
EOF

# Set a very tight budget to force overage
make_budget_config 2 3 3 0

OUTPUT=$(run_budget --module "$MODULE_A")
assert_valid_json "2.1 Overage — valid JSON" "$OUTPUT_FILE"
OVER2=$(echo "$OUTPUT" | jq '.complexity_budget.modules_over_budget' 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "2.1 Overage — modules_over_budget > 0" "0" "$OVER2"

# Check exit code 1 for overage
run_budget --module "$MODULE_A" > /dev/null 2>&1
EXIT_CODE=$?
assert_eq "2.2 Overage — exit code 1" "1" "$EXIT_CODE"

echo ""

# ---------------------------------------------------------------------------
# Section 3: Credit earning (module under budget)
# ---------------------------------------------------------------------------
echo "--- Section 3: Credit earning ---"

# Set generous budget so module is well under it
make_budget_config 50 100 80 0

OUTPUT=$(run_budget --module "$MODULE_A")
assert_valid_json "3.1 Credits — valid JSON" "$OUTPUT_FILE"
CREDITS=$(echo "$OUTPUT" | jq '.complexity_budget.total_credits_earned' 2>/dev/null | tr -d '\r' || echo "0")
assert_gt "3.1 Credits earned — credits_earned > 0" "0" "$CREDITS"

echo ""

# ---------------------------------------------------------------------------
# Section 4: JSON structure
# ---------------------------------------------------------------------------
echo "--- Section 4: JSON structure ---"

make_budget_config 10 20 15 0
OUTPUT=$(run_budget --module "$MODULE_A")
assert_contains "4.1 Structure — has complexity_budget key" "$OUTPUT" '"complexity_budget"'
assert_contains "4.2 Structure — has timestamp" "$OUTPUT" '"timestamp"'
assert_contains "4.3 Structure — has total_modules" "$OUTPUT" '"total_modules"'
assert_contains "4.4 Structure — has modules_over_budget" "$OUTPUT" '"modules_over_budget"'
assert_contains "4.5 Structure — has modules array" "$OUTPUT" '"modules"'
assert_contains "4.6 Structure — module has status" "$OUTPUT" '"status"'
assert_contains "4.7 Structure — module has budget_avg" "$OUTPUT" '"budget_avg"'
assert_contains "4.8 Structure — module has credits_earned" "$OUTPUT" '"credits_earned"'

echo ""

# ---------------------------------------------------------------------------
# Section 5: Module directory not found — graceful skip
# ---------------------------------------------------------------------------
echo "--- Section 5: Missing module directory ---"

OUTPUT=$(run_budget --module "/nonexistent/path/module")
assert_valid_json "5.1 Missing dir — valid JSON output" "$OUTPUT_FILE"
TOTAL=$(echo "$OUTPUT" | jq '.complexity_budget.total_modules' 2>/dev/null | tr -d '\r' || echo "1")
assert_eq "5.1 Missing dir — 0 modules processed" "0" "$TOTAL"

echo ""

# ---------------------------------------------------------------------------
# Section 6: --allow-loosen flag recorded in report
# ---------------------------------------------------------------------------
echo "--- Section 6: --allow-loosen flag ---"

make_budget_config 10 20 15 0
OUTPUT=$(run_budget --module "$MODULE_A" --allow-loosen)
assert_valid_json "6.1 allow-loosen — valid JSON" "$OUTPUT_FILE"
assert_contains "6.1 allow-loosen — flag recorded in report" "$OUTPUT" '"allow_loosen"'
LOOSEN_VAL=$(echo "$OUTPUT" | jq '.complexity_budget.allow_loosen' 2>/dev/null | tr -d '\r' || echo "false")
assert_eq "6.1 allow-loosen — value is true" "true" "$LOOSEN_VAL"

echo ""

teardown
print_results "test_complexity_budget.sh"
