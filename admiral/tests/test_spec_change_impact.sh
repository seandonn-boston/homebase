#!/bin/bash
# Admiral Framework — Spec Change Impact Assessment Tests
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VALIDATE="$ADMIRAL_DIR/bin/validate_spec_change"
SCHEMA="$ADMIRAL_DIR/schemas/spec-change-impact.v1.schema.json"
TEMPLATE="$ADMIRAL_DIR/templates/spec-change-impact.template.json"

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

setup() {
  TMPDIR_BASE="$(mktemp -d)"
}

teardown() {
  rm -rf "$TMPDIR_BASE"
}

# ============================================================
echo "=== Prerequisite Checks ==="

for f in "$VALIDATE" "$SCHEMA" "$TEMPLATE"; do
  if [ -f "$f" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $(basename "$f") found"
  else
    echo "  [SKIP] $(basename "$f") not found"
    exit 1
  fi
done

if jq empty "$SCHEMA" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Schema is valid JSON"
fi
if jq empty "$TEMPLATE" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Template is valid JSON"
fi
echo ""

# ============================================================
echo "=== Usage ==="

rc=0
output=$("$VALIDATE" 2>&1) || rc=$?
assert_contains "Shows usage" "$output" "Usage"
echo ""

# ============================================================
echo "=== Happy Path — Additive Change ==="

setup

cat > "$TMPDIR_BASE/additive.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "change_id": "SC-001",
  "spec_version_from": "v0.9.0-alpha",
  "spec_version_to": "v0.10.0-alpha",
  "date": "2026-03-23",
  "author": "Admiral",
  "summary": "Added version consolidation format",
  "affected_parts": ["All"],
  "compatibility": {
    "classification": "additive",
    "justification": "New format added alongside existing; no breaking changes"
  },
  "impact": {
    "components_affected": ["admiral/bin/version_audit"],
    "constants_changed": [],
    "schemas_changed": [],
    "hooks_changed": [],
    "breaking_behaviors": [],
    "migration_required": false
  },
  "migration_guide": {
    "steps": [],
    "rollback_steps": [],
    "estimated_effort": "15 minutes",
    "automated": true
  },
  "risk_assessment": {
    "risk_level": "low",
    "mitigations": ["Backwards compatible"]
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/additive.json" 2>&1) || rc=$?
assert_exit_code "Additive change passes (exit 0)" 0 "$rc"
assert_contains "Reports PASSED" "$output" "PASSED"

teardown
echo ""

# ============================================================
echo "=== Breaking Change — With Migration ==="

setup

cat > "$TMPDIR_BASE/breaking.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "change_id": "SC-002",
  "spec_version_from": "v0.7.0-alpha",
  "spec_version_to": "v0.8.0-alpha",
  "summary": "Token budget gate removed, replaced with advisory tracker",
  "affected_parts": ["Part 3"],
  "compatibility": {
    "classification": "breaking",
    "justification": "Hard-blocking gate removed; implementations using exit code 2 must update"
  },
  "impact": {
    "components_affected": [".hooks/token_budget_tracker.sh"],
    "hooks_changed": ["token_budget_gate"],
    "breaking_behaviors": ["Exit code 2 no longer used for budget exhaustion"],
    "migration_required": true
  },
  "migration_guide": {
    "steps": ["Remove token_budget_gate hook", "Update pre_tool_use_adapter to use advisory checkpoint"],
    "rollback_steps": ["Restore token_budget_gate hook"],
    "estimated_effort": "1 hour",
    "automated": false
  },
  "risk_assessment": {
    "risk_level": "medium",
    "mitigations": ["Advisory fallback prevents deadlocks"]
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/breaking.json" 2>&1) || rc=$?
assert_exit_code "Breaking change with migration passes (exit 0)" 0 "$rc"

teardown
echo ""

# ============================================================
echo "=== Breaking Change — Missing Migration ==="

setup

cat > "$TMPDIR_BASE/breaking-no-migrate.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "change_id": "SC-003",
  "spec_version_from": "v0.5.0",
  "spec_version_to": "v0.6.0",
  "summary": "Removed dual numbering system",
  "affected_parts": ["All"],
  "compatibility": {
    "classification": "breaking",
    "justification": "Section references changed format"
  },
  "impact": {
    "components_affected": ["All documentation"],
    "migration_required": false
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/breaking-no-migrate.json" 2>&1) || rc=$?
assert_exit_code "Breaking without migration gives warning (exit 1)" 1 "$rc"
assert_contains "Warns about migration" "$output" "migration"

teardown
echo ""

# ============================================================
echo "=== Missing Required Fields ==="

setup

cat > "$TMPDIR_BASE/missing.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "change_id": "SC-004"
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/missing.json" 2>&1) || rc=$?
assert_exit_code "Missing fields fails (exit 2)" 2 "$rc"
assert_contains "Reports missing fields" "$output" "Missing"

teardown
echo ""

# ============================================================
echo "=== Invalid Classification ==="

setup

cat > "$TMPDIR_BASE/bad-class.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "change_id": "SC-005",
  "spec_version_from": "v0.1.0",
  "spec_version_to": "v0.2.0",
  "summary": "Test change",
  "affected_parts": ["Part 1"],
  "compatibility": {
    "classification": "dangerous",
    "justification": "Because I said so"
  },
  "impact": {
    "components_affected": []
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/bad-class.json" 2>&1) || rc=$?
assert_exit_code "Invalid classification fails (exit 2)" 2 "$rc"
assert_contains "Reports invalid classification" "$output" "dangerous"

teardown
echo ""

# ============================================================
echo "=== Invalid Risk Level ==="

setup

cat > "$TMPDIR_BASE/bad-risk.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "change_id": "SC-006",
  "spec_version_from": "v0.1.0",
  "spec_version_to": "v0.2.0",
  "summary": "Test change",
  "affected_parts": ["Part 1"],
  "compatibility": {
    "classification": "cosmetic",
    "justification": "Just docs"
  },
  "impact": {
    "components_affected": []
  },
  "risk_assessment": {
    "risk_level": "extreme"
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/bad-risk.json" 2>&1) || rc=$?
assert_exit_code "Invalid risk level fails (exit 2)" 2 "$rc"
assert_contains "Reports invalid risk" "$output" "extreme"

teardown
echo ""

# ============================================================
echo "=== Template Fails Validation ==="

rc=0
output=$("$VALIDATE" "$TEMPLATE" 2>&1) || rc=$?
assert_exit_code "Blank template fails (exit 2)" 2 "$rc"
echo ""

# ============================================================
echo "========================================="
echo "Spec Change Impact Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
