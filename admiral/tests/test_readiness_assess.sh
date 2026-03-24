#!/bin/bash
# Admiral Framework — Readiness Assessment Tests
# Tests readiness_assess.sh against various project configurations.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ASSESS="$ADMIRAL_DIR/bin/readiness_assess"

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

assert_not_contains() {
  local test_name="$1"
  local output="$2"
  local unexpected="$3"
  if echo "$output" | grep -q "$unexpected"; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — unexpected '$unexpected' in output\n"
    echo "  [FAIL] $test_name"
  else
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
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
    "identity": "A test project for readiness assessment.",
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

# Helper: create a fully ready project structure
create_ready_project() {
  local dir="$1"
  create_valid_gt "$dir"
  # CI config
  mkdir -p "$dir/.github/workflows"
  echo "name: CI" > "$dir/.github/workflows/ci.yml"
  # Test suite
  mkdir -p "$dir/tests"
  echo '#!/bin/bash' > "$dir/tests/test_example.sh"
  # Linter config
  echo '{}' > "$dir/.shellcheckrc"
  # Documented conventions
  echo "# Conventions" > "$dir/CONVENTIONS.md"
}

# ============================================================
# Prerequisite Checks
# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$ASSESS" ]; then
  echo "  [SKIP] readiness_assess not found at $ASSESS"
  exit 1
fi

echo "  readiness_assess found."
echo ""

# ============================================================
# Usage Tests
# ============================================================
echo "=== Usage Tests ==="

rc=0
output=$("$ASSESS" 2>&1) || rc=$?
assert_contains "Shows usage without arguments" "$output" "Usage"

echo ""

# ============================================================
# Happy Path — Fully Ready Project
# ============================================================
echo "=== Happy Path — Ready Project ==="

setup

create_ready_project "$TMPDIR_BASE"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Fully ready project exits 0" 0 "$rc"
assert_contains "Reports Ready status" "$output" "Ready"
assert_contains "Ground Truth check passes" "$output" "Ground Truth"
assert_contains "CI check passes" "$output" "CI"
assert_contains "Test suite check passes" "$output" "Test"
assert_contains "Linter check passes" "$output" "Lint"

teardown
echo ""

# ============================================================
# Partially Ready — Missing CI
# ============================================================
echo "=== Partially Ready — Missing CI ==="

setup

create_ready_project "$TMPDIR_BASE"
rm -rf "$TMPDIR_BASE/.github"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Missing CI exits 1 (Partially Ready)" 1 "$rc"
assert_contains "Reports Partially Ready" "$output" "Partially Ready"
assert_contains "CI flagged" "$output" "CI"

teardown
echo ""

# ============================================================
# Partially Ready — Missing Tests
# ============================================================
echo "=== Partially Ready — Missing Tests ==="

setup

create_ready_project "$TMPDIR_BASE"
rm -rf "$TMPDIR_BASE/tests"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Missing tests exits 1 (Partially Ready)" 1 "$rc"
assert_contains "Reports Partially Ready" "$output" "Partially Ready"
assert_contains "Test flagged" "$output" "Test"

teardown
echo ""

# ============================================================
# Partially Ready — Missing Linter Config
# ============================================================
echo "=== Partially Ready — Missing Linter ==="

setup

create_ready_project "$TMPDIR_BASE"
rm -f "$TMPDIR_BASE/.shellcheckrc"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Missing linter config exits 1 (Partially Ready)" 1 "$rc"
assert_contains "Reports Partially Ready" "$output" "Partially Ready"
assert_contains "Lint flagged" "$output" "Lint"

teardown
echo ""

# ============================================================
# Not Ready — No Ground Truth
# ============================================================
echo "=== Not Ready — No Ground Truth ==="

setup

# Project root with nothing
mkdir -p "$TMPDIR_BASE/empty_project"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE/empty_project" "$TMPDIR_BASE/empty_project/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Missing Ground Truth exits 2 (Not Ready)" 2 "$rc"
assert_contains "Reports Not Ready" "$output" "Not Ready"

teardown
echo ""

# ============================================================
# Not Ready — Invalid Ground Truth
# ============================================================
echo "=== Not Ready — Invalid Ground Truth ==="

setup

mkdir -p "$TMPDIR_BASE/.github/workflows"
echo "name: CI" > "$TMPDIR_BASE/.github/workflows/ci.yml"
mkdir -p "$TMPDIR_BASE/tests"
echo '#!/bin/bash' > "$TMPDIR_BASE/tests/test_example.sh"
echo '{}' > "$TMPDIR_BASE/.shellcheckrc"

# Create a Ground Truth that will fail validation (missing mission)
cat > "$TMPDIR_BASE/bad-gt.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "project": {"name": "Test", "last_updated": "2026-03-20", "phase": "greenfield"},
  "boundaries": {},
  "success_criteria": {},
  "ground_truth": {}
}
EOF

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/bad-gt.json" 2>&1) || rc=$?
assert_exit_code "Invalid Ground Truth exits 2 (Not Ready)" 2 "$rc"
assert_contains "Reports Not Ready" "$output" "Not Ready"

teardown
echo ""

# ============================================================
# Not Ready — Boundaries Fail
# ============================================================
echo "=== Not Ready — Boundaries Missing Categories ==="

setup

create_ready_project "$TMPDIR_BASE"
# Remove boundaries.llm_last to trigger boundaries failure
jq 'del(.boundaries.llm_last)' "$TMPDIR_BASE/ground-truth.json" > "$TMPDIR_BASE/gt-tmp.json"
mv "$TMPDIR_BASE/gt-tmp.json" "$TMPDIR_BASE/ground-truth.json"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Missing boundary categories exits 2 (Not Ready)" 2 "$rc"
assert_contains "Reports Not Ready" "$output" "Not Ready"

teardown
echo ""

# ============================================================
# JSON Output Mode
# ============================================================
echo "=== JSON Output Mode ==="

setup

create_ready_project "$TMPDIR_BASE"

rc=0
output=$("$ASSESS" --json "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "JSON mode exits 0 for ready project" 0 "$rc"
# Validate it's actual JSON
if echo "$output" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] JSON output is valid JSON"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] JSON output is not valid JSON\n"
  echo "  [FAIL] JSON output is not valid JSON"
fi
assert_contains "JSON has status field" "$output" '"status"'
assert_contains "JSON has checks field" "$output" '"checks"'

teardown
echo ""

# ============================================================
# Preparation Path
# ============================================================
echo "=== Preparation Path ==="

setup

create_ready_project "$TMPDIR_BASE"
rm -rf "$TMPDIR_BASE/.github"
rm -rf "$TMPDIR_BASE/tests"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_contains "Shows preparation steps" "$output" "Preparation"

teardown
echo ""

# ============================================================
# Results
# ============================================================
echo "========================================="
echo "Readiness Assessment Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
