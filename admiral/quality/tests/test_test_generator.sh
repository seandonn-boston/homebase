#!/bin/bash
# Admiral Framework — Test Generator Tests (QA-02)
# Tests parse logic, file generation, dry-run mode, JSON output, and exit codes.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

GENERATOR="${SCRIPT_DIR}/../test_generator.sh"

echo "========================================"
echo " Test Suite: test_generator.sh (QA-02)"
echo "========================================"
echo ""

setup

FIXTURES_DIR="${TMPDIR_BASE}/fixtures"
OUT_DIR="${TMPDIR_BASE}/out"
mkdir -p "$FIXTURES_DIR"
mkdir -p "$OUT_DIR"

OUTPUT_FILE="${TMPDIR_BASE}/output.json"

# ---------------------------------------------------------------------------
# Helper: run generator with --json, capture to OUTPUT_FILE
# ---------------------------------------------------------------------------
run_gen() {
  bash "$GENERATOR" --json "$@" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

# ---------------------------------------------------------------------------
# Section 1: TypeScript test generation
# ---------------------------------------------------------------------------
echo "--- Section 1: TypeScript Generation ---"

# 1.1 TS file with exported functions — creates test file
TS_FUNCS="${FIXTURES_DIR}/math-utils.ts"
cat > "$TS_FUNCS" <<'TSEOF'
/** Adds two numbers. */
export function add(a: number, b: number): number {
  return a + b;
}

/** Multiplies two numbers. */
export async function multiply(a: number, b: number): Promise<number> {
  return a * b;
}

export class Calculator {
  value = 0;
}
TSEOF

OUTPUT=$(run_gen --out-dir "$OUT_DIR" "$TS_FUNCS")
assert_valid_json "1.1 TS with exports — JSON valid" "$OUTPUT_FILE"
assert_contains "1.1 TS with exports — status created" "$OUTPUT" '"created"'
assert_file_exists "1.1 TS with exports — test file written" "${OUT_DIR}/test_math-utils.ts"

# 1.2 Generated TS test content has expected structure
GEN_CONTENT=$(cat "${OUT_DIR}/test_math-utils.ts")
assert_contains "1.2 TS test — has import node:test" "$GEN_CONTENT" "node:test"
assert_contains "1.2 TS test — has import assert" "$GEN_CONTENT" "node:assert/strict"
assert_contains "1.2 TS test — has describe block" "$GEN_CONTENT" "describe("
assert_contains "1.2 TS test — has it block" "$GEN_CONTENT" "it("
assert_contains "1.2 TS test — references add" "$GEN_CONTENT" "add"
assert_contains "1.2 TS test — references multiply" "$GEN_CONTENT" "multiply"
assert_contains "1.2 TS test — references Calculator" "$GEN_CONTENT" "Calculator"
assert_contains "1.2 TS test — has edge case placeholder" "$GEN_CONTENT" "edge case"

# 1.3 TS file with no exports — still generates skeleton
TS_NO_EXPORT="${FIXTURES_DIR}/internals.ts"
printf 'const x = 1;\nconst y = 2;\n' > "$TS_NO_EXPORT"
OUTPUT=$(run_gen --out-dir "$OUT_DIR" "$TS_NO_EXPORT")
assert_contains "1.3 TS no exports — status created" "$OUTPUT" '"created"'
assert_file_exists "1.3 TS no exports — test file written" "${OUT_DIR}/test_internals.ts"

echo ""

# ---------------------------------------------------------------------------
# Section 2: Bash test generation
# ---------------------------------------------------------------------------
echo "--- Section 2: Bash Generation ---"

# 2.1 Bash file with functions — creates test file
SH_FUNCS="${FIXTURES_DIR}/string_utils.sh"
cat > "$SH_FUNCS" <<'SHEOF'
#!/bin/bash
trim_spaces() {
  local str="$1"
  echo "${str// /}"
}

to_upper() {
  local str="$1"
  echo "${str^^}"
}

function validate_input {
  local val="$1"
  [ -n "$val" ]
}
SHEOF

OUTPUT=$(run_gen --out-dir "$OUT_DIR" "$SH_FUNCS")
assert_valid_json "2.1 Bash with functions — JSON valid" "$OUTPUT_FILE"
assert_contains "2.1 Bash with functions — status created" "$OUTPUT" '"created"'
assert_file_exists "2.1 Bash with functions — test file written" "${OUT_DIR}/test_string_utils.sh"

# 2.2 Generated Bash test content has expected structure
SH_GEN_CONTENT=$(cat "${OUT_DIR}/test_string_utils.sh")
assert_contains "2.2 Bash test — has shebang" "$SH_GEN_CONTENT" "#!/bin/bash"
assert_contains "2.2 Bash test — sources assert.sh" "$SH_GEN_CONTENT" "assert.sh"
assert_contains "2.2 Bash test — has setup call" "$SH_GEN_CONTENT" "setup"
assert_contains "2.2 Bash test — has teardown call" "$SH_GEN_CONTENT" "teardown"
assert_contains "2.2 Bash test — has print_results" "$SH_GEN_CONTENT" "print_results"
assert_contains "2.2 Bash test — references trim_spaces" "$SH_GEN_CONTENT" "trim_spaces"
assert_contains "2.2 Bash test — references to_upper" "$SH_GEN_CONTENT" "to_upper"
assert_contains "2.2 Bash test — has assert_eq placeholder" "$SH_GEN_CONTENT" "assert_eq"
assert_contains "2.2 Bash test — has assert_exit_code placeholder" "$SH_GEN_CONTENT" "assert_exit_code"

# 2.3 Bash file with no functions — still generates skeleton
SH_NO_FN="${FIXTURES_DIR}/constants.sh"
printf '#!/bin/bash\nREADONLY VERSION=1\nREADONLY NAME="app"\n' > "$SH_NO_FN"
OUTPUT=$(run_gen --out-dir "$OUT_DIR" "$SH_NO_FN")
assert_contains "2.3 Bash no functions — status created" "$OUTPUT" '"created"'
assert_file_exists "2.3 Bash no functions — test file written" "${OUT_DIR}/test_constants.sh"

echo ""

# ---------------------------------------------------------------------------
# Section 3: Dry-run mode
# ---------------------------------------------------------------------------
echo "--- Section 3: Dry-run Mode ---"

# 3.1 --dry-run prints content to stdout, does not write file
DRY_SH="${FIXTURES_DIR}/dry_target.sh"
printf '#!/bin/bash\nhello() { echo hi; }\n' > "$DRY_SH"
DRY_OUT_DIR="${TMPDIR_BASE}/dry-out"
mkdir -p "$DRY_OUT_DIR"
DRY_OUTPUT=$(bash "$GENERATOR" --dry-run --out-dir "$DRY_OUT_DIR" "$DRY_SH" 2>/dev/null || true)
assert_contains "3.1 Dry-run — output contains skeleton header" "$DRY_OUTPUT" "Test skeleton for"
assert_contains "3.1 Dry-run — output has shebang" "$DRY_OUTPUT" "#!/bin/bash"
# File must NOT have been written
if [ -f "${DRY_OUT_DIR}/test_dry_target.sh" ]; then
  FAIL=$((FAIL + 1))
  echo "  [FAIL] 3.1 Dry-run — file should not exist but does"
else
  PASS=$((PASS + 1))
  echo "  [PASS] 3.1 Dry-run — file was not written"
fi

# 3.2 --dry-run with --json reports dry-run status
DRY_JSON=$(bash "$GENERATOR" --dry-run --json --out-dir "$DRY_OUT_DIR" "$DRY_SH" 2>/dev/null || true)
assert_contains "3.2 Dry-run JSON — status dry-run" "$DRY_JSON" '"dry-run"'

echo ""

# ---------------------------------------------------------------------------
# Section 4: Skip existing files
# ---------------------------------------------------------------------------
echo "--- Section 4: Skip Existing Test Files ---"

# 4.1 If test file already exists, generator skips it
EXISTING_SH="${FIXTURES_DIR}/already_tested.sh"
printf '#!/bin/bash\ndo_thing() { echo done; }\n' > "$EXISTING_SH"
EXISTING_TEST="${OUT_DIR}/test_already_tested.sh"
printf '#!/bin/bash\n# pre-existing test\n' > "$EXISTING_TEST"
ORIGINAL_MTIME=$(stat -c %Y "$EXISTING_TEST" 2>/dev/null || stat -f %m "$EXISTING_TEST" 2>/dev/null || echo "0")
OUTPUT=$(run_gen --out-dir "$OUT_DIR" "$EXISTING_SH")
assert_contains "4.1 Existing test — status skip" "$OUTPUT" '"skip"'
AFTER_MTIME=$(stat -c %Y "$EXISTING_TEST" 2>/dev/null || stat -f %m "$EXISTING_TEST" 2>/dev/null || echo "0")
assert_eq "4.1 Existing test — file not modified" "$ORIGINAL_MTIME" "$AFTER_MTIME"

echo ""

# ---------------------------------------------------------------------------
# Section 5: Unsupported file types
# ---------------------------------------------------------------------------
echo "--- Section 5: Unsupported File Types ---"

# 5.1 .json file — skipped with status skip
JSON_FILE="${FIXTURES_DIR}/config.json"
printf '{"key":"value"}\n' > "$JSON_FILE"
OUTPUT=$(run_gen --out-dir "$OUT_DIR" "$JSON_FILE")
assert_contains "5.1 JSON file — status skip" "$OUTPUT" '"skip"'

echo ""

# ---------------------------------------------------------------------------
# Section 6: Error handling
# ---------------------------------------------------------------------------
echo "--- Section 6: Error Handling ---"

# 6.1 Non-existent source file — status error, exit 1
EXIT_CODE=0
bash "$GENERATOR" --json --out-dir "$OUT_DIR" "/nonexistent/file.sh" > "$OUTPUT_FILE" 2>/dev/null || EXIT_CODE=$?
assert_exit_code "6.1 Missing source file — exit 1" 1 "$EXIT_CODE"
OUTPUT=$(cat "$OUTPUT_FILE")
assert_contains "6.1 Missing source file — status error in JSON" "$OUTPUT" '"error"'

# 6.2 No arguments — exit 2
EXIT_CODE=0
bash "$GENERATOR" > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "6.2 No arguments — exit 2" 2 "$EXIT_CODE"

# 6.3 Unknown flag — exit 2
EXIT_CODE=0
bash "$GENERATOR" --bad-flag /tmp/x.sh > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "6.3 Unknown flag — exit 2" 2 "$EXIT_CODE"

echo ""

# ---------------------------------------------------------------------------
# Section 7: JSON output format
# ---------------------------------------------------------------------------
echo "--- Section 7: JSON Output Format ---"

FORMAT_SH="${FIXTURES_DIR}/format_sample.sh"
printf '#!/bin/bash\ndo_work() { echo ok; }\n' > "$FORMAT_SH"
OUTPUT=$(run_gen --out-dir "$OUT_DIR" "$FORMAT_SH")
assert_valid_json "7.1 JSON output — valid JSON" "$OUTPUT_FILE"
assert_contains "7.1 JSON output — has 'generator' key" "$OUTPUT" '"generator"'
assert_contains "7.1 JSON output — has 'timestamp' key" "$OUTPUT" '"timestamp"'
assert_contains "7.1 JSON output — has 'results' key" "$OUTPUT" '"results"'
assert_contains "7.1 JSON output — has 'created' count" "$OUTPUT" '"created"'
assert_contains "7.1 JSON output — has 'skipped' count" "$OUTPUT" '"skipped"'
assert_contains "7.1 JSON output — has 'errors' count" "$OUTPUT" '"errors"'
assert_contains "7.1 JSON output — has 'overall' key" "$OUTPUT" '"overall"'

echo ""

# ---------------------------------------------------------------------------
teardown
print_results "test_generator.sh Tests"
