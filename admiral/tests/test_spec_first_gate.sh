#!/bin/bash
# Tests for spec_first_gate (ST-05)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GATE="$ADMIRAL_DIR/bin/spec_first_gate"
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

# Helper to create GT with specific pipeline_entry
make_gt() {
  local entry="$1" path="$2"
  cat > "$path" <<GTEOF
{
  "schema_version": "1.0.0",
  "project": {"name": "test", "last_updated": "2026-01-01", "phase": "greenfield"},
  "mission": {"identity": "test", "success_state": "done", "stakeholders": "us", "phase": "greenfield", "pipeline_entry": "$entry"},
  "boundaries": {
    "non_goals": {"functional": ["n"], "quality": ["n"], "architectural": ["n"]},
    "hard_constraints": {"tech_stack": ["bash 5.2"]},
    "resource_budgets": {"token_budget": "100k", "time_budget": "1h", "tool_call_limits": "50", "scope_boundary": ["src/"], "quality_floor": "80%"},
    "llm_last": {"deterministic": ["lint"], "llm_judgment": ["design"]}
  },
  "success_criteria": {"functional": ["w"], "quality": ["c"], "completeness": ["d"], "negative": ["n"], "failure_handling": "escalate"},
  "ground_truth": {"domain_ontology": {"naming_conventions": "snake_case"}, "environment": {"tech_stack": ["bash 5.2"], "infrastructure": "local"}, "configuration": {"agents_md": "AGENTS.md"}}
}
GTEOF
}

# Test 1: No args shows usage
rc=0
"$GATE" 2>&1 || rc=$?
assert_exit "no args shows usage" 1 "$rc"

# Test 2: Requirements entry (first stage) = pass (no upstream to check)
PROJECT="$TMPDIR/proj-req"
mkdir -p "$PROJECT"
make_gt "Requirements" "$TMPDIR/gt-req.json"
rc=0
out=$("$GATE" "$PROJECT" "$TMPDIR/gt-req.json" 2>&1) || rc=$?
assert_exit "requirements entry = pass (no upstream)" 0 "$rc"
assert_contains "pass shown" "$out" "PASS"

# Test 3: Design entry without requirements = fail
PROJECT="$TMPDIR/proj-design-fail"
mkdir -p "$PROJECT"
make_gt "Design" "$TMPDIR/gt-design.json"
rc=0
out=$("$GATE" "$PROJECT" "$TMPDIR/gt-design.json" 2>&1) || rc=$?
assert_exit "design without requirements = fail" 2 "$rc"
assert_contains "missing requirements" "$out" "Requirements"

# Test 4: Design entry with requirements doc = pass (or warn if no design doc yet)
PROJECT="$TMPDIR/proj-design-ok"
mkdir -p "$PROJECT/docs"
echo "# Requirements" > "$PROJECT/docs/requirements.md"
echo "# Design" > "$PROJECT/docs/design.md"
make_gt "Design" "$TMPDIR/gt-design2.json"
rc=0
out=$("$GATE" "$PROJECT" "$TMPDIR/gt-design2.json" 2>&1) || rc=$?
assert_exit "design with requirements + design doc = pass" 0 "$rc"

# Test 5: Tasks entry needs Requirements + Design
PROJECT="$TMPDIR/proj-tasks-fail"
mkdir -p "$PROJECT"
make_gt "Tasks" "$TMPDIR/gt-tasks.json"
rc=0
out=$("$GATE" "$PROJECT" "$TMPDIR/gt-tasks.json" 2>&1) || rc=$?
assert_exit "tasks without upstream = fail" 2 "$rc"

# Test 6: Tasks entry with both upstream docs + tasks dir = pass
PROJECT="$TMPDIR/proj-tasks-ok"
mkdir -p "$PROJECT/docs" "$PROJECT/plan/todo"
echo "# Requirements" > "$PROJECT/docs/requirements.md"
echo "# Design" > "$PROJECT/docs/design.md"
touch "$PROJECT/plan/todo/task1.md"
make_gt "Tasks" "$TMPDIR/gt-tasks2.json"
rc=0
out=$("$GATE" "$PROJECT" "$TMPDIR/gt-tasks2.json" 2>&1) || rc=$?
assert_exit "tasks with upstream + tasks dir = pass" 0 "$rc"

# Test 7: Implementation entry needs all three upstream
PROJECT="$TMPDIR/proj-impl-fail"
mkdir -p "$PROJECT"
make_gt "Implementation" "$TMPDIR/gt-impl.json"
rc=0
out=$("$GATE" "$PROJECT" "$TMPDIR/gt-impl.json" 2>&1) || rc=$?
assert_exit "implementation without upstream = fail" 2 "$rc"

# Test 8: Implementation entry with all upstream + src = pass
PROJECT="$TMPDIR/proj-impl-ok"
mkdir -p "$PROJECT/docs" "$PROJECT/plan/todo" "$PROJECT/src"
echo "# Requirements" > "$PROJECT/docs/requirements.md"
echo "# Design" > "$PROJECT/docs/design.md"
touch "$PROJECT/plan/todo/task1.md"
touch "$PROJECT/src/main.sh"
make_gt "Implementation" "$TMPDIR/gt-impl2.json"
rc=0
out=$("$GATE" "$PROJECT" "$TMPDIR/gt-impl2.json" 2>&1) || rc=$?
assert_exit "implementation with all upstream + src = pass" 0 "$rc"

# Test 9: JSON mode (Requirements entry, no upstream needed, add current-stage artifact)
PROJECT="$TMPDIR/proj-json"
mkdir -p "$PROJECT/docs"
echo "# Requirements" > "$PROJECT/docs/requirements.md"
make_gt "Requirements" "$TMPDIR/gt-json.json"
rc=0
out=$("$GATE" --json "$PROJECT" "$TMPDIR/gt-json.json" 2>&1) || rc=$?
assert_exit "json mode works" 0 "$rc"
assert_contains "json has pipeline_entry" "$out" '"pipeline_entry"'

# Test 10: Missing GT file
rc=0
out=$("$GATE" "$TMPDIR" "$TMPDIR/nonexistent.json" 2>&1) || rc=$?
assert_exit "missing GT file = error" 2 "$rc"

# Test 11: Invalid pipeline_entry in GT
cat > "$TMPDIR/gt-bad-entry.json" <<'EOF'
{
  "schema_version": "1.0.0",
  "project": {"name": "test", "last_updated": "2026-01-01", "phase": "greenfield"},
  "mission": {"identity": "test", "success_state": "done", "stakeholders": "us", "phase": "greenfield", "pipeline_entry": "InvalidStage"}
}
EOF
rc=0
out=$("$GATE" "$TMPDIR" "$TMPDIR/gt-bad-entry.json" 2>&1) || rc=$?
assert_exit "invalid pipeline_entry = error" 2 "$rc"

# Test 12: Alternative artifact locations (specs/ instead of docs/)
PROJECT="$TMPDIR/proj-alt"
mkdir -p "$PROJECT/specs"
echo "# Requirements" > "$PROJECT/specs/requirements.md"
echo "# Design" > "$PROJECT/specs/design.md"
make_gt "Design" "$TMPDIR/gt-alt.json"
rc=0
out=$("$GATE" "$PROJECT" "$TMPDIR/gt-alt.json" 2>&1) || rc=$?
assert_exit "alternative artifact location (specs/) works" 0 "$rc"

echo ""
echo "=== spec_first_gate tests: $PASS/$TOTAL passed ==="
if [ "$FAIL" -gt 0 ]; then
  echo "$FAIL test(s) FAILED"
  exit 1
fi
exit 0
