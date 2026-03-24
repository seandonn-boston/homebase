#!/bin/bash
# Admiral Framework — Task Acceptance Criteria Validator Tests
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VALIDATE="$ADMIRAL_DIR/bin/validate_task_criteria"
TEMPLATE="$ADMIRAL_DIR/templates/task-criteria.template.json"
SCHEMA="$ADMIRAL_DIR/schemas/task-criteria.v1.schema.json"

PASS=0
FAIL=0
ERRORS=""
TMPDIR_BASE=""

assert_exit_code() {
  local test_name="$1"
  local expected_code="$2"
  local actual_code="$3"
  if [ "$actual_code" -eq "$expected_code" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected exit $expected_code, got $actual_code\n"
    echo "  [FAIL] $test_name (expected exit $expected_code, got $actual_code)"
  fi
}

assert_contains() {
  local test_name="$1"
  local output="$2"
  local expected="$3"
  if echo "$output" | grep -q "$expected"; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected '$expected' in output\n"
    echo "  [FAIL] $test_name"
  fi
}

assert_valid_json() {
  local test_name="$1"
  local filepath="$2"
  if jq empty "$filepath" 2>/dev/null; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — '$filepath' is not valid JSON\n"
    echo "  [FAIL] $test_name"
  fi
}

setup() {
  TMPDIR_BASE="$(mktemp -d)"
}

teardown() {
  rm -rf "$TMPDIR_BASE"
}

# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$VALIDATE" ]; then
  echo "  [SKIP] validate_task_criteria not found"
  exit 1
fi
echo "  Validator found."

assert_valid_json "Schema is valid JSON" "$SCHEMA"
assert_valid_json "Template is valid JSON" "$TEMPLATE"

# Schema must have required keys
schema_props=$(jq -r '.properties | keys[]' "$SCHEMA" 2>/dev/null || echo "")
assert_contains "Schema has 'task' property" "$schema_props" "task"
assert_contains "Schema has 'criteria' property" "$schema_props" "criteria"
assert_contains "Schema has 'verification' property" "$schema_props" "verification"
assert_contains "Schema has 'failure_guidance' property" "$schema_props" "failure_guidance"
echo ""

# ============================================================
echo "=== Usage Tests ==="

rc=0
output=$("$VALIDATE" 2>&1) || rc=$?
assert_contains "Shows usage without arguments" "$output" "Usage"
echo ""

# ============================================================
echo "=== Happy Path — Valid Document ==="

setup

cat > "$TMPDIR_BASE/valid.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "task": {
    "id": "ST-04",
    "name": "Task acceptance criteria template",
    "description": "Create machine-verifiable template for task-level success criteria.",
    "stream": "Stream 00",
    "phase": "Phase 0"
  },
  "criteria": {
    "functional": ["Template validates against schema", "Validator rejects missing fields"],
    "quality": ["Validation completes in under 1 second"],
    "completeness": ["Schema, template, and validator all exist"],
    "negative": ["Does not modify files outside admiral/"]
  },
  "verification": {
    "level": "automated",
    "methods": ["Unit tests", "Schema validation"]
  },
  "failure_guidance": {
    "action": "escalate",
    "fallback": "Deliver partial with explanation",
    "escalation_target": "Admiral"
  },
  "judgment_boundaries": [
    {
      "area": "Field naming",
      "guideline": "Follow snake_case convention from Ground Truth schema"
    }
  ]
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/valid.json" 2>&1) || rc=$?
assert_exit_code "Valid document passes (exit 0)" 0 "$rc"
assert_contains "Reports PASSED" "$output" "PASSED"

teardown
echo ""

# ============================================================
echo "=== Missing Required Fields ==="

setup

# Missing criteria entirely
cat > "$TMPDIR_BASE/no-criteria.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "task": {"id": "T-01", "name": "Test", "description": "A test"},
  "verification": {"level": "automated", "methods": ["tests"]},
  "failure_guidance": {"action": "escalate"}
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/no-criteria.json" 2>&1) || rc=$?
assert_exit_code "Missing criteria fails (exit 2)" 2 "$rc"
assert_contains "Reports missing criteria" "$output" "criteria"

teardown
echo ""

# ============================================================
echo "=== Empty Required Strings ==="

setup

cat > "$TMPDIR_BASE/empty-id.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "task": {"id": "", "name": "Test", "description": "A test"},
  "criteria": {
    "functional": ["works"],
    "quality": ["fast"],
    "completeness": ["done"],
    "negative": ["no side effects"]
  },
  "verification": {"level": "automated", "methods": ["tests"]},
  "failure_guidance": {"action": "escalate"}
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/empty-id.json" 2>&1) || rc=$?
assert_exit_code "Empty task.id fails (exit 2)" 2 "$rc"
assert_contains "Reports empty id" "$output" "task.id"

teardown
echo ""

# ============================================================
echo "=== Empty Required Arrays ==="

setup

cat > "$TMPDIR_BASE/empty-functional.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "task": {"id": "T-01", "name": "Test", "description": "A test"},
  "criteria": {
    "functional": [],
    "quality": ["fast"],
    "completeness": ["done"],
    "negative": ["no side effects"]
  },
  "verification": {"level": "automated", "methods": ["tests"]},
  "failure_guidance": {"action": "escalate"}
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/empty-functional.json" 2>&1) || rc=$?
assert_exit_code "Empty criteria.functional fails (exit 2)" 2 "$rc"
assert_contains "Reports empty functional" "$output" "functional"

teardown
echo ""

# ============================================================
echo "=== Invalid Enum Values ==="

setup

cat > "$TMPDIR_BASE/bad-level.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "task": {"id": "T-01", "name": "Test", "description": "A test"},
  "criteria": {
    "functional": ["works"],
    "quality": ["fast"],
    "completeness": ["done"],
    "negative": ["no side effects"]
  },
  "verification": {"level": "magic", "methods": ["tests"]},
  "failure_guidance": {"action": "escalate"}
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/bad-level.json" 2>&1) || rc=$?
assert_exit_code "Invalid verification.level fails (exit 2)" 2 "$rc"
assert_contains "Reports invalid level" "$output" "magic"

# Bad failure action
cat > "$TMPDIR_BASE/bad-action.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "task": {"id": "T-01", "name": "Test", "description": "A test"},
  "criteria": {
    "functional": ["works"],
    "quality": ["fast"],
    "completeness": ["done"],
    "negative": ["no side effects"]
  },
  "verification": {"level": "automated", "methods": ["tests"]},
  "failure_guidance": {"action": "panic"}
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/bad-action.json" 2>&1) || rc=$?
assert_exit_code "Invalid failure_guidance.action fails (exit 2)" 2 "$rc"
assert_contains "Reports invalid action" "$output" "panic"

teardown
echo ""

# ============================================================
echo "=== Warnings — Optional Fields Empty ==="

setup

cat > "$TMPDIR_BASE/no-optional.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "task": {"id": "T-01", "name": "Test", "description": "A test"},
  "criteria": {
    "functional": ["works"],
    "quality": ["fast"],
    "completeness": ["done"],
    "negative": ["no side effects"]
  },
  "verification": {"level": "automated", "methods": ["tests"]},
  "failure_guidance": {"action": "block"}
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/no-optional.json" 2>&1) || rc=$?
assert_exit_code "Missing optional fields gives warnings (exit 1)" 1 "$rc"
assert_contains "Warns about stream" "$output" "stream"
assert_contains "Warns about phase" "$output" "phase"

teardown
echo ""

# ============================================================
echo "=== Warning — Escalate Without Target ==="

setup

cat > "$TMPDIR_BASE/escalate-no-target.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "task": {"id": "T-01", "name": "Test", "description": "A test", "stream": "S0", "phase": "P0"},
  "criteria": {
    "functional": ["works"],
    "quality": ["fast"],
    "completeness": ["done"],
    "negative": ["no side effects"]
  },
  "verification": {"level": "automated", "methods": ["tests"]},
  "failure_guidance": {"action": "escalate"}
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/escalate-no-target.json" 2>&1) || rc=$?
assert_exit_code "Escalate without target gives warning (exit 1)" 1 "$rc"
assert_contains "Warns about escalation_target" "$output" "escalation_target"

teardown
echo ""

# ============================================================
echo "=== Judgment Boundaries Validation ==="

setup

cat > "$TMPDIR_BASE/bad-jb.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "task": {"id": "T-01", "name": "Test", "description": "A test", "stream": "S0", "phase": "P0"},
  "criteria": {
    "functional": ["works"],
    "quality": ["fast"],
    "completeness": ["done"],
    "negative": ["no side effects"]
  },
  "verification": {"level": "automated", "methods": ["tests"]},
  "failure_guidance": {"action": "block"},
  "judgment_boundaries": [
    {"area": "", "guideline": "some guide"}
  ]
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/bad-jb.json" 2>&1) || rc=$?
assert_exit_code "Empty judgment_boundaries area fails (exit 2)" 2 "$rc"
assert_contains "Reports empty area" "$output" "area"

teardown
echo ""

# ============================================================
echo "=== Invalid JSON ==="

setup

echo "not json" > "$TMPDIR_BASE/broken.json"

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/broken.json" 2>&1) || rc=$?
assert_exit_code "Invalid JSON fails (exit 2)" 2 "$rc"
assert_contains "Reports invalid JSON" "$output" "Not valid JSON"

teardown
echo ""

# ============================================================
echo "=== Template Validates With Errors (Empty Fields) ==="

rc=0
output=$("$VALIDATE" "$TEMPLATE" 2>&1) || rc=$?
assert_exit_code "Blank template fails validation (exit 2)" 2 "$rc"

echo ""

# ============================================================
echo "========================================="
echo "Task Criteria Validator Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
