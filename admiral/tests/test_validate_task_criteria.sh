#!/bin/bash
# Tests for validate_task_criteria (ST-04)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VALIDATOR="$ADMIRAL_DIR/bin/validate_task_criteria"
PASS=0
FAIL=0
TOTAL=0

assert_exit() {
  local desc="$1" expected="$2" actual="$3"
  TOTAL=$((TOTAL + 1))
  if [ "$actual" -eq "$expected" ]; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $desc (expected exit $expected, got $actual)"
  fi
}

assert_contains() {
  local desc="$1" output="$2" expected="$3"
  TOTAL=$((TOTAL + 1))
  if echo "$output" | grep -q "$expected"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
    echo "FAIL: $desc (expected output to contain '$expected')"
  fi
}

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Valid task criteria
cat > "$TMPDIR/valid.json" <<'EOF'
{
  "task_id": "ST-03",
  "title": "Go/No-Go deployment gate",
  "functional": ["Invoke readiness assessment", "Exit non-zero for Not Ready"],
  "quality": ["ShellCheck clean", "Consistent exit codes"],
  "completeness": ["Script exists", "Tests pass", "Documentation updated"],
  "negative": ["Must not bypass readiness check", "Must not allow unapproved profiles"],
  "verification_level": "thorough",
  "failure_guidance": "escalate",
  "judgment_boundaries": ["Profile restriction policy interpretation"],
  "dependencies": ["ST-02"],
  "timeout": "2h"
}
EOF

# Missing required fields
cat > "$TMPDIR/missing-fields.json" <<'EOF'
{
  "task_id": "ST-99",
  "title": "Incomplete task"
}
EOF

# Empty arrays
cat > "$TMPDIR/empty-arrays.json" <<'EOF'
{
  "task_id": "ST-99",
  "title": "Empty arrays task",
  "functional": [],
  "quality": [],
  "completeness": [],
  "negative": [],
  "verification_level": "standard",
  "failure_guidance": "escalate"
}
EOF

# Invalid enum values
cat > "$TMPDIR/bad-enum.json" <<'EOF'
{
  "task_id": "ST-99",
  "title": "Bad enum",
  "functional": ["works"],
  "quality": ["clean"],
  "completeness": ["done"],
  "negative": ["nothing bad"],
  "verification_level": "ultra-deep",
  "failure_guidance": "give-up"
}
EOF

# Valid but no optional fields (should warn)
cat > "$TMPDIR/no-optional.json" <<'EOF'
{
  "task_id": "ST-99",
  "title": "Minimal valid task",
  "functional": ["works"],
  "quality": ["clean"],
  "completeness": ["done"],
  "negative": ["nothing bad"],
  "verification_level": "smoke",
  "failure_guidance": "block_and_report"
}
EOF

# Test 1: No args shows usage
rc=0
"$VALIDATOR" 2>&1 || rc=$?
assert_exit "no args shows usage" 1 "$rc"

# Test 2: Valid document passes
rc=0
out=$("$VALIDATOR" "$TMPDIR/valid.json" 2>&1) || rc=$?
assert_exit "valid document passes" 0 "$rc"
assert_contains "valid shows passed" "$out" "VALIDATION PASSED"

# Test 3: Missing fields fails
rc=0
out=$("$VALIDATOR" "$TMPDIR/missing-fields.json" 2>&1) || rc=$?
assert_exit "missing fields fails" 2 "$rc"
assert_contains "reports missing functional" "$out" "functional"

# Test 4: Empty arrays fails
rc=0
out=$("$VALIDATOR" "$TMPDIR/empty-arrays.json" 2>&1) || rc=$?
assert_exit "empty arrays fails" 2 "$rc"

# Test 5: Invalid enum fails
rc=0
out=$("$VALIDATOR" "$TMPDIR/bad-enum.json" 2>&1) || rc=$?
assert_exit "invalid enum fails" 2 "$rc"
assert_contains "reports invalid verification_level" "$out" "verification_level"

# Test 6: No optional fields warns
rc=0
out=$("$VALIDATOR" "$TMPDIR/no-optional.json" 2>&1) || rc=$?
assert_exit "no optional fields warns" 1 "$rc"
assert_contains "warns about judgment_boundaries" "$out" "judgment_boundaries"

# Test 7: File not found
rc=0
out=$("$VALIDATOR" "$TMPDIR/nonexistent.json" 2>&1) || rc=$?
assert_exit "file not found fails" 2 "$rc"

# Test 8: Invalid JSON
echo "not json" > "$TMPDIR/bad.json"
rc=0
out=$("$VALIDATOR" "$TMPDIR/bad.json" 2>&1) || rc=$?
assert_exit "invalid json fails" 2 "$rc"

# Test 9: JSON mode
rc=0
out=$("$VALIDATOR" --json "$TMPDIR/valid.json" 2>&1) || rc=$?
assert_exit "json mode valid" 0 "$rc"
assert_contains "json has status pass" "$out" '"pass"'

# Test 10: JSON mode with errors
rc=0
out=$("$VALIDATOR" --json "$TMPDIR/missing-fields.json" 2>&1) || rc=$?
assert_exit "json mode errors" 2 "$rc"
assert_contains "json has status fail" "$out" '"fail"'

# Test 11: Template validates structure
rc=0
out=$("$VALIDATOR" "$ADMIRAL_DIR/templates/task-criteria.template.json" 2>&1) || rc=$?
assert_exit "template has correct structure (fails on empty required)" 2 "$rc"

# Test 12: All verification_level enums accepted
for level in smoke standard thorough exhaustive; do
  cat > "$TMPDIR/enum-$level.json" <<ENUMEOF
{
  "task_id": "T-1",
  "title": "test",
  "functional": ["x"],
  "quality": ["x"],
  "completeness": ["x"],
  "negative": ["x"],
  "verification_level": "$level",
  "failure_guidance": "escalate",
  "judgment_boundaries": ["x"],
  "dependencies": [],
  "timeout": "1h"
}
ENUMEOF
  rc=0
  "$VALIDATOR" "$TMPDIR/enum-$level.json" >/dev/null 2>&1 || rc=$?
  assert_exit "verification_level=$level accepted" 0 "$rc"
done

echo ""
echo "=== validate_task_criteria tests: $PASS/$TOTAL passed ==="
if [ "$FAIL" -gt 0 ]; then
  echo "$FAIL test(s) FAILED"
  exit 1
fi
exit 0
