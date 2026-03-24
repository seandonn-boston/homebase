#!/bin/bash
# Admiral Framework — Spec-First Pipeline Gate Tests
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GATE="$ADMIRAL_DIR/bin/spec_first_gate"

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

# Helper: create a GT with specific pipeline_entry
create_gt() {
  local dir="$1"
  local entry="$2"
  cat > "$dir/ground-truth.json" << GTEOF
{
  "schema_version": "1.0.0",
  "project": {"name": "Test", "last_updated": "2026-03-20", "phase": "greenfield"},
  "mission": {
    "identity": "Test project.",
    "success_state": "Works.",
    "stakeholders": "Devs",
    "phase": "greenfield",
    "pipeline_entry": "$entry"
  },
  "boundaries": {
    "non_goals": {"functional": ["none"]},
    "hard_constraints": {"tech_stack": ["Bash 5.x"]},
    "resource_budgets": {"token_budget": "10000", "time_budget": "30m", "tool_call_limits": "50", "scope_boundary": ["."], "quality_floor": "pass"},
    "llm_last": {"deterministic": ["lint"], "llm_judgment": ["review"]}
  },
  "success_criteria": {"functional": ["works"], "quality": ["fast"], "completeness": ["done"], "negative": ["safe"], "failure_handling": "escalate"},
  "ground_truth": {
    "domain_ontology": {"naming_conventions": "snake_case"},
    "environment": {"tech_stack": ["Bash 5.x"], "infrastructure": "local"},
    "configuration": {"agents_md": "AGENTS.md"}
  }
}
GTEOF
}

# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$GATE" ]; then
  echo "  [SKIP] spec_first_gate not found"
  exit 1
fi
echo "  spec_first_gate found."
echo ""

# ============================================================
echo "=== Usage Tests ==="

rc=0
output=$("$GATE" 2>&1) || rc=$?
assert_contains "Shows usage without arguments" "$output" "Usage"
echo ""

# ============================================================
echo "=== Implementation Entry — Minimal Requirements ==="

setup

create_gt "$TMPDIR_BASE" "Implementation"

rc=0
output=$("$GATE" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Implementation entry with GT present passes (exit 0)" 0 "$rc"
assert_contains "Reports PASS" "$output" "PASS"

teardown
echo ""

# ============================================================
echo "=== Requirements Entry — GT Present ==="

setup

create_gt "$TMPDIR_BASE" "Requirements"

rc=0
output=$("$GATE" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Requirements entry with GT passes (exit 0)" 0 "$rc"
assert_contains "Reports PASS" "$output" "PASS"

teardown
echo ""

# ============================================================
echo "=== Design Entry — Missing Design Docs ==="

setup

create_gt "$TMPDIR_BASE" "Design"
# GT present but no docs/design directory

rc=0
output=$("$GATE" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Design entry without design docs fails (exit 1)" 1 "$rc"
assert_contains "Reports FAIL" "$output" "FAIL"
assert_contains "Reports missing design" "$output" "design"

teardown
echo ""

# ============================================================
echo "=== Design Entry — All Present ==="

setup

create_gt "$TMPDIR_BASE" "Design"
mkdir -p "$TMPDIR_BASE/docs/design"
echo "# Design" > "$TMPDIR_BASE/docs/design/overview.md"

rc=0
output=$("$GATE" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Design entry with all artifacts passes (exit 0)" 0 "$rc"
assert_contains "Reports PASS" "$output" "PASS"

teardown
echo ""

# ============================================================
echo "=== Tasks Entry — Missing Plan Dir ==="

setup

create_gt "$TMPDIR_BASE" "Tasks"
mkdir -p "$TMPDIR_BASE/docs/design"
echo "# Design" > "$TMPDIR_BASE/docs/design/overview.md"
# No plan directory

rc=0
output=$("$GATE" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Tasks entry without plan dir fails (exit 1)" 1 "$rc"
assert_contains "Reports missing plan" "$output" "plan"

teardown
echo ""

# ============================================================
echo "=== Tasks Entry — All Present ==="

setup

create_gt "$TMPDIR_BASE" "Tasks"
mkdir -p "$TMPDIR_BASE/docs/design"
echo "# Design" > "$TMPDIR_BASE/docs/design/overview.md"
mkdir -p "$TMPDIR_BASE/plan"
echo "# Plan" > "$TMPDIR_BASE/plan/index.md"

rc=0
output=$("$GATE" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Tasks entry with all artifacts passes (exit 0)" 0 "$rc"
assert_contains "Reports PASS" "$output" "PASS"

teardown
echo ""

# ============================================================
echo "=== Missing Ground Truth File ==="

setup

mkdir -p "$TMPDIR_BASE/empty"

rc=0
output=$("$GATE" "$TMPDIR_BASE/empty" "$TMPDIR_BASE/empty/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Missing GT file is hard error (exit 2)" 2 "$rc"

teardown
echo ""

# ============================================================
echo "=== Invalid Pipeline Entry ==="

setup

cat > "$TMPDIR_BASE/bad-entry.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "mission": {"pipeline_entry": "Deployment"}
}
EOF

rc=0
output=$("$GATE" "$TMPDIR_BASE" "$TMPDIR_BASE/bad-entry.json" 2>&1) || rc=$?
assert_exit_code "Invalid pipeline entry is hard error (exit 2)" 2 "$rc"
assert_contains "Reports unknown stage" "$output" "Unknown"

teardown
echo ""

# ============================================================
echo "=== JSON Output Mode ==="

setup

create_gt "$TMPDIR_BASE" "Implementation"

rc=0
output=$("$GATE" --json "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "JSON mode exits 0 for passing gate" 0 "$rc"
if echo "$output" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] JSON output is valid JSON"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] JSON output is not valid JSON\n"
  echo "  [FAIL] JSON output is not valid JSON"
fi
assert_contains "JSON has status field" "$output" '"status"'
assert_contains "JSON has pipeline_entry field" "$output" '"pipeline_entry"'

teardown
echo ""

# ============================================================
echo "========================================="
echo "Spec-First Gate Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
