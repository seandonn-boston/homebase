#!/bin/bash
# Admiral Framework — Code Review Automation Tests (QA-01)
# Tests all six check categories implemented in code_review.sh.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

source "$SCRIPT_DIR/../../lib/assert.sh"

REVIEW_SCRIPT="${SCRIPT_DIR}/../code_review.sh"

echo "========================================"
echo " Test Suite: code_review.sh (QA-01)"
echo "========================================"
echo ""

# ---------------------------------------------------------------------------
# Setup: create temp workspace with controlled fixture files
# ---------------------------------------------------------------------------
setup

FIXTURES_DIR="${TMPDIR_BASE}/fixtures"
mkdir -p "${FIXTURES_DIR}/tests"
mkdir -p "${FIXTURES_DIR}/src"

# Helper: write output to temp file for assert_valid_json
OUTPUT_FILE="${TMPDIR_BASE}/output.json"

# Helper: run code_review on a file, capture output to OUTPUT_FILE and stdout var
run_review() {
  local filepath="$1"
  bash "$REVIEW_SCRIPT" --json "$filepath" > "$OUTPUT_FILE" 2>/dev/null || true
  cat "$OUTPUT_FILE"
}

# Helper: create a companion test stub so test_presence does not fire on a fixture
make_test_stub() {
  local filepath="$1"
  local basename
  basename=$(basename "$filepath")
  local stem="${basename%.*}"
  local ext="${basename##*.}"
  printf '#!/bin/bash\n# stub test\n' > "${FIXTURES_DIR}/tests/test_${stem}.${ext}"
}

# ---------------------------------------------------------------------------
# Check 1: Naming Convention Compliance
# ---------------------------------------------------------------------------
echo "--- Check 1: Naming Conventions ---"

# 1.1 Valid snake_case bash name — no naming issue
VALID_SH="${FIXTURES_DIR}/good_snake_case.sh"
printf '#!/bin/bash\necho hello\n' > "$VALID_SH"
make_test_stub "$VALID_SH"
OUTPUT=$(run_review "$VALID_SH")
assert_valid_json "1.1 Valid .sh name — JSON output is valid" "$OUTPUT_FILE"
assert_not_contains "1.1 Valid .sh name — no naming issue" "$OUTPUT" "convention"

# 1.2 Invalid bash name with PascalCase — naming issue flagged
INVALID_SH="${FIXTURES_DIR}/BadPascalCase.sh"
printf '#!/bin/bash\necho hello\n' > "$INVALID_SH"
make_test_stub "$INVALID_SH"
OUTPUT=$(run_review "$INVALID_SH")
assert_contains "1.2 Bad .sh name — naming issue reported" "$OUTPUT" "snake_case convention"

# 1.3 Valid kebab-case TypeScript name — no naming issue
VALID_TS="${FIXTURES_DIR}/good-kebab-name.ts"
printf '// ts file\n' > "$VALID_TS"
make_test_stub "$VALID_TS"
OUTPUT=$(run_review "$VALID_TS")
assert_not_contains "1.3 Valid .ts name — no naming issue" "$OUTPUT" "kebab-case/camelCase"

# 1.4 TypeScript name with uppercase start — naming issue flagged
INVALID_TS="${FIXTURES_DIR}/BadModule.ts"
printf '// ts file\n' > "$INVALID_TS"
make_test_stub "$INVALID_TS"
OUTPUT=$(run_review "$INVALID_TS")
assert_contains "1.4 Bad .ts name — naming issue reported" "$OUTPUT" "kebab-case/camelCase"

echo ""

# ---------------------------------------------------------------------------
# Check 2: Cyclomatic Complexity
# ---------------------------------------------------------------------------
echo "--- Check 2: Cyclomatic Complexity ---"

# 2.1 Simple bash file — under threshold, no complexity issue
SIMPLE_SH="${FIXTURES_DIR}/simple_script.sh"
printf '#!/bin/bash\necho "hello"\necho "world"\n' > "$SIMPLE_SH"
make_test_stub "$SIMPLE_SH"
OUTPUT=$(run_review "$SIMPLE_SH")
assert_not_contains "2.1 Simple bash — no complexity issue" "$OUTPUT" "complexity"

# 2.2 Complex bash file — over threshold (>15), complexity issue flagged
COMPLEX_SH="${FIXTURES_DIR}/complex_script.sh"
{
  printf '#!/bin/bash\n'
  for i in $(seq 1 20); do
    printf 'if [ "$x" = "%d" ]; then echo %d; fi\n' "$i" "$i"
  done
} > "$COMPLEX_SH"
make_test_stub "$COMPLEX_SH"
OUTPUT=$(run_review "$COMPLEX_SH")
assert_contains "2.2 Complex bash — complexity issue reported" "$OUTPUT" "complexity"

# 2.3 Complex TypeScript file — over threshold
COMPLEX_TS="${FIXTURES_DIR}/complex-module.ts"
{
  printf 'export function check(x: number): string {\n'
  for i in $(seq 1 20); do
    printf '  if (x === %d) { return "%d"; }\n' "$i" "$i"
  done
  printf '  return "other";\n}\n'
} > "$COMPLEX_TS"
make_test_stub "$COMPLEX_TS"
OUTPUT=$(run_review "$COMPLEX_TS")
assert_contains "2.3 Complex TypeScript — complexity issue reported" "$OUTPUT" "complexity"

echo ""

# ---------------------------------------------------------------------------
# Check 3: Test Presence
# ---------------------------------------------------------------------------
echo "--- Check 3: Test Presence ---"

# 3.1 Source file with corresponding test — no test_missing issue
SRC_WITH_TEST="${FIXTURES_DIR}/has_test.sh"
printf '#!/bin/bash\necho "source"\n' > "$SRC_WITH_TEST"
printf '#!/bin/bash\necho "test"\n' > "${FIXTURES_DIR}/tests/test_has_test.sh"
OUTPUT=$(run_review "$SRC_WITH_TEST")
assert_not_contains "3.1 Source with test — no test_missing issue" "$OUTPUT" "No corresponding test"

# 3.2 Source file without any test — test_missing issue flagged
NO_TEST_SH="${FIXTURES_DIR}/no_test_exists.sh"
printf '#!/bin/bash\necho "orphan"\n' > "$NO_TEST_SH"
OUTPUT=$(run_review "$NO_TEST_SH")
assert_contains "3.2 Source without test — test_missing issue reported" "$OUTPUT" "No corresponding test"

# 3.3 Test file itself — should NOT trigger test_missing check
TEST_FILE_ITSELF="${FIXTURES_DIR}/tests/test_something.sh"
printf '#!/bin/bash\necho "I am a test"\n' > "$TEST_FILE_ITSELF"
OUTPUT=$(run_review "$TEST_FILE_ITSELF")
assert_not_contains "3.3 Test file itself — not checked for test presence" "$OUTPUT" "No corresponding test"

echo ""

# ---------------------------------------------------------------------------
# Check 4: Import Hygiene (TypeScript)
# ---------------------------------------------------------------------------
echo "--- Check 4: Import Hygiene ---"

# 4.1 Clean imports — no hygiene issue
CLEAN_IMPORTS_TS="${FIXTURES_DIR}/clean-imports.ts"
{
  printf 'import { foo } from "./foo";\n'
  printf 'import { bar } from "../shared/bar";\n'
  printf 'export const x = 1;\n'
} > "$CLEAN_IMPORTS_TS"
make_test_stub "$CLEAN_IMPORTS_TS"
OUTPUT=$(run_review "$CLEAN_IMPORTS_TS")
assert_not_contains "4.1 Clean imports — no hygiene issue" "$OUTPUT" "circular"

# 4.2 Self-referential import (circular pattern) — flagged
CIRCULAR_TS="${FIXTURES_DIR}/circular-import.ts"
{
  printf 'import { helper } from "../circular-import";\n'
  printf 'export const x = 1;\n'
} > "$CIRCULAR_TS"
make_test_stub "$CIRCULAR_TS"
OUTPUT=$(run_review "$CIRCULAR_TS")
assert_contains "4.2 Circular import — hygiene issue reported" "$OUTPUT" "circular"

# 4.3 Non-TS files — import hygiene not applied to bash
BASH_NO_IMPORT="${FIXTURES_DIR}/no_import_check.sh"
printf '#!/bin/bash\nsource ./no_import_check\necho done\n' > "$BASH_NO_IMPORT"
make_test_stub "$BASH_NO_IMPORT"
OUTPUT=$(run_review "$BASH_NO_IMPORT")
assert_not_contains "4.3 Bash file — no TS import check" "$OUTPUT" "Banned import"

echo ""

# ---------------------------------------------------------------------------
# Check 5: Documentation Presence
# ---------------------------------------------------------------------------
echo "--- Check 5: Documentation Presence ---"

# 5.1 Exported function with JSDoc — no documentation issue
DOCUMENTED_TS="${FIXTURES_DIR}/documented-module.ts"
{
  printf '/**\n * Greets someone.\n * @param name The name.\n */\n'
  printf 'export function greet(name: string): string {\n'
  printf '  return `Hello, ${name}`;\n'
  printf '}\n'
} > "$DOCUMENTED_TS"
make_test_stub "$DOCUMENTED_TS"
OUTPUT=$(run_review "$DOCUMENTED_TS")
assert_not_contains "5.1 Documented export — no doc issue" "$OUTPUT" "JSDoc"

# 5.2 Exported function without JSDoc — documentation issue flagged
UNDOCUMENTED_TS="${FIXTURES_DIR}/undocumented-module.ts"
{
  printf 'export function undocumented(x: number): number {\n'
  printf '  return x * 2;\n'
  printf '}\n'
} > "$UNDOCUMENTED_TS"
make_test_stub "$UNDOCUMENTED_TS"
OUTPUT=$(run_review "$UNDOCUMENTED_TS")
assert_contains "5.2 Undocumented export — doc issue reported" "$OUTPUT" "JSDoc"

# 5.3 Non-TS file — documentation check not applied
BASH_NODOC="${FIXTURES_DIR}/no_doc_check.sh"
printf '#!/bin/bash\nexport THING=1\necho done\n' > "$BASH_NODOC"
make_test_stub "$BASH_NODOC"
OUTPUT=$(run_review "$BASH_NODOC")
assert_not_contains "5.3 Bash file — no JSDoc check" "$OUTPUT" "JSDoc"

echo ""

# ---------------------------------------------------------------------------
# Check 6: File Size Limits
# ---------------------------------------------------------------------------
echo "--- Check 6: File Size Limits ---"

# 6.1 Small file — under 500 lines, no size issue
SMALL_SH="${FIXTURES_DIR}/small_file.sh"
{
  printf '#!/bin/bash\n'
  for i in $(seq 1 50); do
    printf 'echo "line %d"\n' "$i"
  done
} > "$SMALL_SH"
make_test_stub "$SMALL_SH"
OUTPUT=$(run_review "$SMALL_SH")
assert_not_contains "6.1 Small file — no size issue" "$OUTPUT" "line limit"

# 6.2 Large file — over 500 lines, size issue flagged
LARGE_SH="${FIXTURES_DIR}/large_file.sh"
{
  printf '#!/bin/bash\n'
  for i in $(seq 1 520); do
    printf 'echo "line %d"\n' "$i"
  done
} > "$LARGE_SH"
make_test_stub "$LARGE_SH"
OUTPUT=$(run_review "$LARGE_SH")
assert_contains "6.2 Large file — size issue reported" "$OUTPUT" "line limit"

echo ""

# ---------------------------------------------------------------------------
# Output Format Validation
# ---------------------------------------------------------------------------
echo "--- Output Format ---"

# 7.1 --json flag produces valid JSON with required top-level keys
FORMAT_SH="${FIXTURES_DIR}/format_sample.sh"
printf '#!/bin/bash\necho ok\n' > "$FORMAT_SH"
make_test_stub "$FORMAT_SH"
OUTPUT=$(run_review "$FORMAT_SH")
assert_valid_json "7.1 JSON output — valid JSON" "$OUTPUT_FILE"
assert_contains "7.1 JSON output — has 'review' key"         "$OUTPUT" '"review"'
assert_contains "7.1 JSON output — has 'timestamp' key"      "$OUTPUT" '"timestamp"'
assert_contains "7.1 JSON output — has 'files_checked' key"  "$OUTPUT" '"files_checked"'
assert_contains "7.1 JSON output — has 'issues' key"         "$OUTPUT" '"issues"'
assert_contains "7.1 JSON output — has 'summary' key"        "$OUTPUT" '"summary"'
assert_contains "7.1 JSON output — has 'status' key"         "$OUTPUT" '"status"'

# 7.2 Summary contains all four severity counts
assert_contains "7.2 Summary has 'blocker' count"  "$OUTPUT" '"blocker"'
assert_contains "7.2 Summary has 'major' count"    "$OUTPUT" '"major"'
assert_contains "7.2 Summary has 'minor' count"    "$OUTPUT" '"minor"'
assert_contains "7.2 Summary has 'cosmetic' count" "$OUTPUT" '"cosmetic"'

# 7.3 Issue entries contain required fields when issues present
LARGE_SH2="${FIXTURES_DIR}/large_file2.sh"
{
  printf '#!/bin/bash\n'
  for i in $(seq 1 520); do
    printf 'echo "line %d"\n' "$i"
  done
} > "$LARGE_SH2"
make_test_stub "$LARGE_SH2"
OUTPUT=$(run_review "$LARGE_SH2")
assert_contains "7.3 Issue entry has 'severity' field"   "$OUTPUT" '"severity"'
assert_contains "7.3 Issue entry has 'location' field"   "$OUTPUT" '"location"'
assert_contains "7.3 Issue entry has 'expected' field"   "$OUTPUT" '"expected"'
assert_contains "7.3 Issue entry has 'actual' field"     "$OUTPUT" '"actual"'
assert_contains "7.3 Issue entry has 'confidence' field" "$OUTPUT" '"confidence"'

echo ""

# ---------------------------------------------------------------------------
# Exit Code Validation
# ---------------------------------------------------------------------------
echo "--- Exit Codes ---"

# 8.1 Clean file — exit 0
CLEAN_SH="${FIXTURES_DIR}/exit_clean.sh"
printf '#!/bin/bash\necho clean\n' > "$CLEAN_SH"
make_test_stub "$CLEAN_SH"
EXIT_CODE=0
bash "$REVIEW_SCRIPT" --json "$CLEAN_SH" > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "8.1 Clean file — exit 0" 0 "$EXIT_CODE"

# 8.2 File with Major issues — exit 1
ISSUE_SH="${FIXTURES_DIR}/has_issues.sh"
{
  printf '#!/bin/bash\n'
  # Exceed both complexity and size thresholds
  for i in $(seq 1 520); do
    printf 'echo "line %d"\n' "$i"
  done
  for i in $(seq 1 20); do
    printf 'if [ "$x" = "%d" ]; then echo %d; fi\n' "$i" "$i"
  done
} > "$ISSUE_SH"
# No test stub — test_missing will also fire (also Major)
EXIT_CODE=0
bash "$REVIEW_SCRIPT" --json "$ISSUE_SH" > /dev/null 2>&1 || EXIT_CODE=$?
assert_exit_code "8.2 File with Major issues — exit 1" 1 "$EXIT_CODE"

# 8.3 Missing config — exit 2
CONFIG_PATH="${PROJECT_ROOT}/admiral/config/review_rules.json"
BACKUP_PATH="${PROJECT_ROOT}/admiral/config/review_rules.json.bak"
mv "$CONFIG_PATH" "$BACKUP_PATH"
EXIT_CODE=0
bash "$REVIEW_SCRIPT" --json "$CLEAN_SH" > /dev/null 2>&1 || EXIT_CODE=$?
mv "$BACKUP_PATH" "$CONFIG_PATH"
assert_exit_code "8.3 Missing config — exit 2" 2 "$EXIT_CODE"

echo ""

# ---------------------------------------------------------------------------
# Cleanup and results
# ---------------------------------------------------------------------------
teardown

print_results "code_review.sh Tests"
