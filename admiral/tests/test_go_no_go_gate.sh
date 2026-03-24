#!/bin/bash
# Admiral Framework — Go/No-Go Deployment Gate Tests
# Tests go_no_go_gate.sh against various readiness states.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GATE="$ADMIRAL_DIR/bin/go_no_go_gate"

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

# Helper: create a valid ground truth document
create_valid_gt() {
  local dir="$1"
  cat > "$dir/ground-truth.json" << 'GTEOF'
{
  "schema_version": "1.0.0",
  "project": {
    "name": "Test Project",
    "last_updated": "2026-03-20",
    "phase": "greenfield"
  },
  "mission": {
    "identity": "A test project.",
    "success_state": "All checks pass.",
    "stakeholders": "Developers",
    "phase": "greenfield",
    "pipeline_entry": "Implementation"
  },
  "boundaries": {
    "non_goals": {
      "functional": ["No GUI"],
      "quality": ["No 100% coverage"],
      "architectural": ["No database"]
    },
    "hard_constraints": {
      "tech_stack": ["Bash 5.x", "jq 1.6+"],
      "external_deadlines": [],
      "compatibility": ["POSIX"],
      "regulatory": [],
      "protocol_scope": []
    },
    "resource_budgets": {
      "token_budget": "10000 tokens",
      "time_budget": "30 minutes",
      "tool_call_limits": "50 calls",
      "scope_boundary": ["src/"],
      "quality_floor": "All tests pass"
    },
    "llm_last": {
      "deterministic": ["Linting", "Testing"],
      "llm_judgment": ["Code review"]
    }
  },
  "success_criteria": {
    "functional": ["Works correctly"],
    "quality": ["Passes lint"],
    "completeness": ["All fields filled"],
    "negative": ["No side effects"],
    "failure_handling": "escalate",
    "judgment_boundaries": []
  },
  "ground_truth": {
    "domain_ontology": {
      "glossary": {},
      "naming_conventions": "snake_case",
      "status_definitions": {},
      "architecture_vocabulary": {}
    },
    "environment": {
      "tech_stack": ["Bash 5.2", "jq 1.7"],
      "infrastructure": "Local + CI",
      "access_permissions": {},
      "known_issues": [],
      "external_dependencies": []
    },
    "configuration": {
      "agents_md": "AGENTS.md",
      "tool_pointers": [],
      "hooks_count": 0,
      "hooks_last_audit": "2026-03-20",
      "skills": [],
      "mcp_servers": []
    }
  }
}
GTEOF
}

create_ready_project() {
  local dir="$1"
  create_valid_gt "$dir"
  mkdir -p "$dir/.github/workflows"
  echo "name: CI" > "$dir/.github/workflows/ci.yml"
  mkdir -p "$dir/tests"
  echo '#!/bin/bash' > "$dir/tests/test_example.sh"
  echo '{}' > "$dir/.shellcheckrc"
  echo "# Conventions" > "$dir/CONVENTIONS.md"
}

# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$GATE" ]; then
  echo "  [SKIP] go_no_go_gate not found at $GATE"
  exit 1
fi
echo "  go_no_go_gate found."
echo ""

# ============================================================
echo "=== Usage Tests ==="

rc=0
output=$("$GATE" 2>&1) || rc=$?
assert_contains "Shows usage without arguments" "$output" "Usage"
echo ""

# ============================================================
echo "=== Ready Project — Gate Passes ==="

setup

create_ready_project "$TMPDIR_BASE"

rc=0
output=$("$GATE" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Ready project passes gate (exit 0)" 0 "$rc"
assert_contains "Reports PASS" "$output" "PASS"

teardown
echo ""

# ============================================================
echo "=== Partially Ready — Restricted to Starter ==="

setup

create_ready_project "$TMPDIR_BASE"
rm -rf "$TMPDIR_BASE/.github"

rc=0
output=$("$GATE" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Partially Ready restricted (exit 0 with Starter)" 0 "$rc"
assert_contains "Reports Starter profile" "$output" "Starter"

teardown
echo ""

# ============================================================
echo "=== Not Ready — Gate Blocks ==="

setup

mkdir -p "$TMPDIR_BASE/blocked_project"

rc=0
output=$("$GATE" "$TMPDIR_BASE/blocked_project" "$TMPDIR_BASE/blocked_project/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Not Ready project blocked (exit 1)" 1 "$rc"
assert_contains "Reports BLOCKED" "$output" "BLOCKED"

teardown
echo ""

# ============================================================
echo "=== Admiral Override — Not Ready Overridden ==="

setup

mkdir -p "$TMPDIR_BASE/override_project"

rc=0
output=$("$GATE" --override --justification "Emergency hotfix approved by Admiral" "$TMPDIR_BASE/override_project" "$TMPDIR_BASE/override_project/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Override allows Not Ready (exit 0)" 0 "$rc"
assert_contains "Reports OVERRIDE" "$output" "OVERRIDE"

# Check override was logged
if [ -f "$TMPDIR_BASE/override_project/override_log.jsonl" ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Override logged to override_log.jsonl"
  # Verify log entry is valid JSON
  if jq empty "$TMPDIR_BASE/override_project/override_log.jsonl" 2>/dev/null; then
    PASS=$((PASS + 1))
    echo "  [PASS] Override log entry is valid JSON"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] Override log entry is not valid JSON\n"
    echo "  [FAIL] Override log entry is not valid JSON"
  fi
  # Verify justification is in log
  log_content=$(cat "$TMPDIR_BASE/override_project/override_log.jsonl")
  assert_contains "Override log contains justification" "$log_content" "Emergency hotfix"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Override log not created\n"
  echo "  [FAIL] Override log not created"
fi

teardown
echo ""

# ============================================================
echo "=== Override Without Justification — Rejected ==="

setup

mkdir -p "$TMPDIR_BASE/no_just_project"

rc=0
output=$("$GATE" --override "$TMPDIR_BASE/no_just_project" "$TMPDIR_BASE/no_just_project/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Override without justification rejected (exit 1)" 1 "$rc"
assert_contains "Requires justification" "$output" "justification"

teardown
echo ""

# ============================================================
echo "=== JSON Output Mode ==="

setup

create_ready_project "$TMPDIR_BASE"

rc=0
output=$("$GATE" --json "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "JSON mode for ready project" 0 "$rc"
if echo "$output" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] JSON output is valid JSON"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] JSON output is not valid JSON\n"
  echo "  [FAIL] JSON output is not valid JSON"
fi
assert_contains "JSON has decision field" "$output" '"decision"'
assert_contains "JSON has profile field" "$output" '"profile"'

teardown
echo ""

# ============================================================
echo "========================================="
echo "Go/No-Go Gate Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
