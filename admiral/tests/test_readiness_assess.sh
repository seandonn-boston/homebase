#!/bin/bash
# Admiral Framework — Readiness Assessment Tests
# Tests readiness_assess tool (ST-02)
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
  if echo "$output" | grep -qi "$expected"; then
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
  if echo "$output" | grep -qi "$unexpected"; then
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

# Create a valid ground truth doc in the given directory
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
    "identity": "This project is a test harness.",
    "success_state": "All tests pass.",
    "stakeholders": "Developers who need validation.",
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
      "tech_stack": ["Bash 5.2", "jq 1.7"],
      "external_deadlines": [],
      "compatibility": ["POSIX shells"],
      "regulatory": [],
      "protocol_scope": []
    },
    "resource_budgets": {
      "token_budget": "10000 tokens per task",
      "time_budget": "30 minutes per task",
      "tool_call_limits": "50 tool calls per task",
      "scope_boundary": ["admiral/"],
      "quality_floor": "All tests pass"
    },
    "llm_last": {
      "deterministic": ["Linting", "Schema validation"],
      "llm_judgment": ["Architecture decisions"]
    }
  },
  "success_criteria": {
    "functional": ["validate exits 0 for valid docs"],
    "quality": ["jq parses all JSON"],
    "completeness": ["All fields documented"],
    "negative": ["No files modified outside scope"],
    "failure_handling": "escalate",
    "judgment_boundaries": []
  },
  "ground_truth": {
    "domain_ontology": {
      "glossary": {"Ground Truth": "Source of reality"},
      "naming_conventions": "snake_case for scripts",
      "status_definitions": {"done": "All tests pass"},
      "architecture_vocabulary": {"module": "Directory under admiral/"}
    },
    "environment": {
      "tech_stack": ["Bash 5.2", "jq 1.7"],
      "infrastructure": "Local dev, GitHub Actions CI",
      "access_permissions": {"developer": ["read/write admiral/"]},
      "known_issues": [],
      "external_dependencies": []
    },
    "configuration": {
      "agents_md": "AGENTS.md",
      "tool_pointers": ["CLAUDE.md"],
      "hooks_count": 8,
      "hooks_last_audit": "2026-03-20",
      "skills": [],
      "mcp_servers": []
    }
  }
}
GTEOF
}

# ============================================================
# Prerequisite checks
# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$ASSESS" ]; then
  echo "  [SKIP] readiness_assess not found at $ASSESS"
  exit 1
fi

if [ ! -x "$ASSESS" ]; then
  echo "  [SKIP] readiness_assess not executable"
  exit 1
fi

echo "  All prerequisites found."
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
# Happy Path — Ready Project
# ============================================================
echo "=== Happy Path — Ready Project ==="

setup

# Create a fully ready project
create_valid_gt "$TMPDIR_BASE"

# Add CI config
mkdir -p "$TMPDIR_BASE/.github/workflows"
echo "name: CI" > "$TMPDIR_BASE/.github/workflows/ci.yml"

# Add test suite
mkdir -p "$TMPDIR_BASE/tests"
echo '#!/bin/bash' > "$TMPDIR_BASE/tests/test_example.sh"
chmod +x "$TMPDIR_BASE/tests/test_example.sh"

# Add linter config
echo '{}' > "$TMPDIR_BASE/.shellcheckrc"

# Add documented conventions (README or CONTRIBUTING)
echo "# Contributing" > "$TMPDIR_BASE/CONTRIBUTING.md"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Fully ready project exits 0" 0 "$rc"
assert_contains "Reports Ready status" "$output" "Ready"

teardown
echo ""

# ============================================================
# Partially Ready — Missing CI
# ============================================================
echo "=== Partially Ready — Missing CI ==="

setup

create_valid_gt "$TMPDIR_BASE"
mkdir -p "$TMPDIR_BASE/tests"
echo '#!/bin/bash' > "$TMPDIR_BASE/tests/test_example.sh"
echo '{}' > "$TMPDIR_BASE/.shellcheckrc"
echo "# Contributing" > "$TMPDIR_BASE/CONTRIBUTING.md"
# No .github/workflows/

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Missing CI exits 1 (Partially Ready)" 1 "$rc"
assert_contains "Reports Partially Ready" "$output" "Partially Ready"
assert_contains "Mentions CI config" "$output" "CI"

teardown
echo ""

# ============================================================
# Partially Ready — Missing Tests
# ============================================================
echo "=== Partially Ready — Missing Tests ==="

setup

create_valid_gt "$TMPDIR_BASE"
mkdir -p "$TMPDIR_BASE/.github/workflows"
echo "name: CI" > "$TMPDIR_BASE/.github/workflows/ci.yml"
echo '{}' > "$TMPDIR_BASE/.shellcheckrc"
echo "# Contributing" > "$TMPDIR_BASE/CONTRIBUTING.md"
# No tests/

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Missing tests exits 1 (Partially Ready)" 1 "$rc"
assert_contains "Reports Partially Ready" "$output" "Partially Ready"
assert_contains "Mentions test suite" "$output" "test"

teardown
echo ""

# ============================================================
# Not Ready — Invalid Ground Truth
# ============================================================
echo "=== Not Ready — Invalid Ground Truth ==="

setup

# Create an invalid GT (empty identity)
cat > "$TMPDIR_BASE/ground-truth.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "project": {"name": "", "last_updated": "", "phase": ""},
  "mission": {"identity": "", "success_state": "", "stakeholders": "", "phase": "", "pipeline_entry": ""},
  "boundaries": {
    "non_goals": {"functional": [], "quality": [], "architectural": []},
    "hard_constraints": {"tech_stack": [], "external_deadlines": [], "compatibility": [], "regulatory": [], "protocol_scope": []},
    "resource_budgets": {"token_budget": "", "time_budget": "", "tool_call_limits": "", "scope_boundary": [], "quality_floor": ""},
    "llm_last": {"deterministic": [], "llm_judgment": []}
  },
  "success_criteria": {"functional": [], "quality": [], "completeness": [], "negative": [], "failure_handling": "", "judgment_boundaries": []},
  "ground_truth": {
    "domain_ontology": {"glossary": {}, "naming_conventions": "", "status_definitions": {}, "architecture_vocabulary": {}},
    "environment": {"tech_stack": [], "infrastructure": "", "access_permissions": {}, "known_issues": [], "external_dependencies": []},
    "configuration": {"agents_md": "", "tool_pointers": [], "hooks_count": 0, "hooks_last_audit": "", "skills": [], "mcp_servers": []}
  }
}
EOF

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Invalid GT exits 2 (Not Ready)" 2 "$rc"
assert_contains "Reports Not Ready" "$output" "Not Ready"

teardown
echo ""

# ============================================================
# Not Ready — Missing Ground Truth File
# ============================================================
echo "=== Not Ready — Missing Ground Truth File ==="

setup

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "Missing GT file exits 2" 2 "$rc"
assert_contains "Reports file not found" "$output" "not found"

teardown
echo ""

# ============================================================
# Not Ready — Invalid project root
# ============================================================
echo "=== Not Ready — Invalid Project Root ==="

rc=0
output=$("$ASSESS" "/nonexistent/path" "/nonexistent/gt.json" 2>&1) || rc=$?
assert_exit_code "Invalid project root exits 2" 2 "$rc"

echo ""

# ============================================================
# JSON Output Mode
# ============================================================
echo "=== JSON Output Mode ==="

setup

create_valid_gt "$TMPDIR_BASE"
mkdir -p "$TMPDIR_BASE/.github/workflows"
echo "name: CI" > "$TMPDIR_BASE/.github/workflows/ci.yml"
mkdir -p "$TMPDIR_BASE/tests"
echo '#!/bin/bash' > "$TMPDIR_BASE/tests/test_example.sh"
echo '{}' > "$TMPDIR_BASE/.shellcheckrc"
echo "# Contributing" > "$TMPDIR_BASE/CONTRIBUTING.md"

rc=0
output=$("$ASSESS" --json "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_exit_code "JSON mode exits 0 for ready project" 0 "$rc"

# Verify it's valid JSON
if echo "$output" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] JSON output is valid JSON"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] JSON output is not valid JSON\n"
  echo "  [FAIL] JSON output is not valid JSON"
fi

# Verify JSON has expected fields
status=$(echo "$output" | jq -r '.status' 2>/dev/null || echo "")
assert_contains "JSON has status=Ready" "$status" "Ready"

teardown
echo ""

# ============================================================
# Preparation Path — Not-Happy Path
# ============================================================
echo "=== Preparation Path Output ==="

setup

create_valid_gt "$TMPDIR_BASE"
# No CI, no tests, no linter, no docs — should suggest preparation steps

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_contains "Shows preparation path" "$output" "preparation"

teardown
echo ""

# ============================================================
# Detailed Breakdown
# ============================================================
echo "=== Detailed Breakdown ==="

setup

create_valid_gt "$TMPDIR_BASE"
mkdir -p "$TMPDIR_BASE/.github/workflows"
echo "name: CI" > "$TMPDIR_BASE/.github/workflows/ci.yml"
mkdir -p "$TMPDIR_BASE/tests"
echo '#!/bin/bash' > "$TMPDIR_BASE/tests/test_example.sh"
echo '{}' > "$TMPDIR_BASE/.shellcheckrc"
echo "# Contributing" > "$TMPDIR_BASE/CONTRIBUTING.md"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth.json" 2>&1) || rc=$?
assert_contains "Shows Ground Truth check" "$output" "Ground Truth"
assert_contains "Shows CI check" "$output" "CI"
assert_contains "Shows test suite check" "$output" "test"
assert_contains "Shows linter check" "$output" "lint"
assert_contains "Shows conventions check" "$output" "convention"

teardown
echo ""

# ============================================================
# Invalid JSON Ground Truth
# ============================================================
echo "--- Invalid JSON Ground Truth ---"
setup

# Create a non-JSON GT file
echo "this is not json" > "$TMPDIR_BASE/ground-truth-bad.json"

rc=0
output=$("$ASSESS" "$TMPDIR_BASE" "$TMPDIR_BASE/ground-truth-bad.json" 2>&1) || rc=$?
assert_exit_code "Invalid JSON GT results in Not Ready" 2 "$rc"
assert_contains "Reports Not Ready for invalid JSON" "$output" "Not Ready"

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
