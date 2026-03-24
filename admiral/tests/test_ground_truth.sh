#!/bin/bash
# Admiral Framework — Ground Truth Tooling Tests
# Tests generate_ground_truth.sh and validate_ground_truth.sh
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
GENERATE="$ADMIRAL_DIR/bin/generate_ground_truth"
VALIDATE="$ADMIRAL_DIR/bin/validate_ground_truth"
SCHEMA="$ADMIRAL_DIR/schemas/ground-truth.v1.schema.json"
TEMPLATE="$ADMIRAL_DIR/templates/ground-truth.template.json"

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

assert_file_exists() {
  local test_name="$1"
  local filepath="$2"
  if [ -f "$filepath" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — file '$filepath' does not exist\n"
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
# Prerequisite checks
# ============================================================
echo "=== Prerequisite Checks ==="

if [ ! -f "$SCHEMA" ]; then
  echo "  [SKIP] Schema not found at $SCHEMA"
  exit 1
fi

if [ ! -f "$GENERATE" ]; then
  echo "  [SKIP] Generator not found at $GENERATE"
  exit 1
fi

if [ ! -f "$VALIDATE" ]; then
  echo "  [SKIP] Validator not found at $VALIDATE"
  exit 1
fi

echo "  All prerequisites found."
echo ""

# ============================================================
# Schema Tests
# ============================================================
echo "=== Schema Tests ==="

assert_valid_json "Schema is valid JSON" "$SCHEMA"
assert_valid_json "Template is valid JSON" "$TEMPLATE"

# Schema must define required top-level properties
schema_props=$(jq -r '.properties | keys[]' "$SCHEMA" 2>/dev/null || echo "")
assert_contains "Schema has 'project' property" "$schema_props" "project"
assert_contains "Schema has 'mission' property" "$schema_props" "mission"
assert_contains "Schema has 'boundaries' property" "$schema_props" "boundaries"
assert_contains "Schema has 'success_criteria' property" "$schema_props" "success_criteria"
assert_contains "Schema has 'ground_truth' property" "$schema_props" "ground_truth"

echo ""

# ============================================================
# Generator Tests
# ============================================================
echo "=== Generator Tests ==="

setup

# Test: generates ground-truth.json in target directory
output=$("$GENERATE" "$TMPDIR_BASE" 2>&1) || true
assert_file_exists "Generator creates ground-truth.json" "$TMPDIR_BASE/ground-truth.json"
assert_valid_json "Generated file is valid JSON" "$TMPDIR_BASE/ground-truth.json"

# Test: generated file has all required top-level keys
gen_keys=$(jq -r 'keys[]' "$TMPDIR_BASE/ground-truth.json" 2>/dev/null || echo "")
assert_contains "Generated file has 'project' key" "$gen_keys" "project"
assert_contains "Generated file has 'mission' key" "$gen_keys" "mission"
assert_contains "Generated file has 'boundaries' key" "$gen_keys" "boundaries"
assert_contains "Generated file has 'success_criteria' key" "$gen_keys" "success_criteria"
assert_contains "Generated file has 'ground_truth' key" "$gen_keys" "ground_truth"

# Test: refuses to overwrite existing file
output2=$("$GENERATE" "$TMPDIR_BASE" 2>&1) || true
rc=$?
# Generator should warn about existing file (exit 1 = soft fail)
assert_contains "Generator warns about existing file" "$output2" "already exists"

teardown

# Test: fails with no arguments
output3=$("$GENERATE" 2>&1) || true
assert_contains "Generator requires target directory" "$output3" "Usage"

echo ""

# ============================================================
# Validator Tests — Happy Path
# ============================================================
echo "=== Validator Tests — Happy Path ==="

setup

# Create a valid, fully-filled ground truth document
cat > "$TMPDIR_BASE/valid-gt.json" << 'VALIDEOF'
{
  "schema_version": "1.0.0",
  "project": {
    "name": "Test Project",
    "last_updated": "2026-03-20",
    "phase": "greenfield"
  },
  "mission": {
    "identity": "This project is a test harness for Ground Truth validation.",
    "success_state": "User can run validate_ground_truth.sh and get a pass/fail result in under 2 seconds.",
    "stakeholders": "Developers who need to validate project Ground Truth documents.",
    "phase": "greenfield",
    "pipeline_entry": "Implementation"
  },
  "boundaries": {
    "non_goals": {
      "functional": ["Does not provide a GUI"],
      "quality": ["Does not require 100% code coverage at this phase"],
      "architectural": ["Does not use a database"]
    },
    "hard_constraints": {
      "tech_stack": ["Bash 5.x", "jq 1.6+"],
      "external_deadlines": [],
      "compatibility": ["POSIX-compatible shells"],
      "regulatory": [],
      "protocol_scope": []
    },
    "resource_budgets": {
      "token_budget": "10000 tokens per task",
      "time_budget": "30 minutes per task",
      "tool_call_limits": "50 tool calls per task",
      "scope_boundary": ["admiral/"],
      "quality_floor": "All tests pass, no lint errors"
    },
    "llm_last": {
      "deterministic": ["Linting", "JSON schema validation", "Test execution"],
      "llm_judgment": ["Architecture decisions", "Code review"]
    }
  },
  "success_criteria": {
    "functional": ["validate_ground_truth.sh exits 0 for valid documents"],
    "quality": ["jq parses all JSON without errors"],
    "completeness": ["All required fields documented"],
    "negative": ["No files modified outside admiral/"],
    "failure_handling": "escalate",
    "judgment_boundaries": []
  },
  "ground_truth": {
    "domain_ontology": {
      "glossary": {"Ground Truth": "Single source of project reality"},
      "naming_conventions": "snake_case for scripts, kebab-case for JSON files",
      "status_definitions": {"done": "All tests pass and PR merged", "blocked": "Waiting on external dependency"},
      "architecture_vocabulary": {"module": "A directory under admiral/ with a specific responsibility"}
    },
    "environment": {
      "tech_stack": ["Bash 5.2", "jq 1.7", "Node.js 24.13.0"],
      "infrastructure": "Local development, GitHub Actions CI",
      "access_permissions": {"developer": ["read/write admiral/", "read aiStrat/"]},
      "known_issues": [],
      "external_dependencies": []
    },
    "configuration": {
      "agents_md": "AGENTS.md at repo root",
      "tool_pointers": ["CLAUDE.md"],
      "hooks_count": 8,
      "hooks_last_audit": "2026-03-20",
      "skills": [],
      "mcp_servers": []
    }
  }
}
VALIDEOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/valid-gt.json" 2>&1) || rc=$?
assert_exit_code "Valid document passes validation" 0 "$rc"

teardown
echo ""

# ============================================================
# Validator Tests — Missing Required Fields
# ============================================================
echo "=== Validator Tests — Missing Required Fields ==="

setup

# Missing mission entirely
cat > "$TMPDIR_BASE/no-mission.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "project": {"name": "Test", "last_updated": "2026-03-20", "phase": "greenfield"},
  "boundaries": {
    "non_goals": {"functional": [], "quality": [], "architectural": []},
    "hard_constraints": {"tech_stack": ["Bash 5.x"], "external_deadlines": [], "compatibility": [], "regulatory": [], "protocol_scope": []},
    "resource_budgets": {"token_budget": "10000", "time_budget": "30m", "tool_call_limits": "50", "scope_boundary": ["."], "quality_floor": "Tests pass"},
    "llm_last": {"deterministic": ["linting"], "llm_judgment": ["review"]}
  },
  "success_criteria": {"functional": ["works"], "quality": ["passes"], "completeness": ["done"], "negative": ["none"], "failure_handling": "escalate", "judgment_boundaries": []},
  "ground_truth": {
    "domain_ontology": {"glossary": {}, "naming_conventions": "snake_case", "status_definitions": {}, "architecture_vocabulary": {}},
    "environment": {"tech_stack": ["Bash 5.x"], "infrastructure": "local", "access_permissions": {}, "known_issues": [], "external_dependencies": []},
    "configuration": {"agents_md": "AGENTS.md", "tool_pointers": [], "hooks_count": 0, "hooks_last_audit": "2026-03-20", "skills": [], "mcp_servers": []}
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/no-mission.json" 2>&1) || rc=$?
assert_exit_code "Missing 'mission' fails with exit 2" 2 "$rc"
assert_contains "Reports missing mission" "$output" "mission"

# Empty identity field
cat > "$TMPDIR_BASE/empty-identity.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "project": {"name": "Test", "last_updated": "2026-03-20", "phase": "greenfield"},
  "mission": {
    "identity": "",
    "success_state": "Works correctly.",
    "stakeholders": "Developers",
    "phase": "greenfield",
    "pipeline_entry": "Implementation"
  },
  "boundaries": {
    "non_goals": {"functional": [], "quality": [], "architectural": []},
    "hard_constraints": {"tech_stack": ["Bash 5.x"], "external_deadlines": [], "compatibility": [], "regulatory": [], "protocol_scope": []},
    "resource_budgets": {"token_budget": "10000", "time_budget": "30m", "tool_call_limits": "50", "scope_boundary": ["."], "quality_floor": "Tests pass"},
    "llm_last": {"deterministic": ["linting"], "llm_judgment": ["review"]}
  },
  "success_criteria": {"functional": ["works"], "quality": ["passes"], "completeness": ["done"], "negative": ["none"], "failure_handling": "escalate", "judgment_boundaries": []},
  "ground_truth": {
    "domain_ontology": {"glossary": {}, "naming_conventions": "snake_case", "status_definitions": {}, "architecture_vocabulary": {}},
    "environment": {"tech_stack": ["Bash 5.x"], "infrastructure": "local", "access_permissions": {}, "known_issues": [], "external_dependencies": []},
    "configuration": {"agents_md": "AGENTS.md", "tool_pointers": [], "hooks_count": 0, "hooks_last_audit": "2026-03-20", "skills": [], "mcp_servers": []}
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/empty-identity.json" 2>&1) || rc=$?
assert_exit_code "Empty 'identity' fails with exit 2" 2 "$rc"
assert_contains "Reports empty identity" "$output" "identity"

teardown
echo ""

# ============================================================
# Validator Tests — Vague Versions
# ============================================================
echo "=== Validator Tests — Vague Versions ==="

setup

cat > "$TMPDIR_BASE/vague-version.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "project": {"name": "Test", "last_updated": "2026-03-20", "phase": "greenfield"},
  "mission": {
    "identity": "A test project.",
    "success_state": "Works correctly.",
    "stakeholders": "Developers",
    "phase": "greenfield",
    "pipeline_entry": "Implementation"
  },
  "boundaries": {
    "non_goals": {"functional": [], "quality": [], "architectural": []},
    "hard_constraints": {"tech_stack": ["Node.js latest", "React stable"], "external_deadlines": [], "compatibility": [], "regulatory": [], "protocol_scope": []},
    "resource_budgets": {"token_budget": "10000", "time_budget": "30m", "tool_call_limits": "50", "scope_boundary": ["."], "quality_floor": "Tests pass"},
    "llm_last": {"deterministic": ["linting"], "llm_judgment": ["review"]}
  },
  "success_criteria": {"functional": ["works"], "quality": ["passes"], "completeness": ["done"], "negative": ["none"], "failure_handling": "escalate", "judgment_boundaries": []},
  "ground_truth": {
    "domain_ontology": {"glossary": {}, "naming_conventions": "snake_case", "status_definitions": {}, "architecture_vocabulary": {}},
    "environment": {"tech_stack": ["Node.js latest"], "infrastructure": "local", "access_permissions": {}, "known_issues": [], "external_dependencies": []},
    "configuration": {"agents_md": "AGENTS.md", "tool_pointers": [], "hooks_count": 0, "hooks_last_audit": "2026-03-20", "skills": [], "mcp_servers": []}
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/vague-version.json" 2>&1) || rc=$?
assert_exit_code "Vague version strings fail with exit 2" 2 "$rc"
assert_contains "Reports vague version" "$output" "latest"

teardown
echo ""

# ============================================================
# Validator Tests — Invalid Enums
# ============================================================
echo "=== Validator Tests — Invalid Enums ==="

setup

cat > "$TMPDIR_BASE/bad-phase.json" << 'EOF'
{
  "schema_version": "1.0.0",
  "project": {"name": "Test", "last_updated": "2026-03-20", "phase": "greenfield"},
  "mission": {
    "identity": "A test project.",
    "success_state": "Works correctly.",
    "stakeholders": "Developers",
    "phase": "deploying",
    "pipeline_entry": "Implementation"
  },
  "boundaries": {
    "non_goals": {"functional": [], "quality": [], "architectural": []},
    "hard_constraints": {"tech_stack": ["Bash 5.x"], "external_deadlines": [], "compatibility": [], "regulatory": [], "protocol_scope": []},
    "resource_budgets": {"token_budget": "10000", "time_budget": "30m", "tool_call_limits": "50", "scope_boundary": ["."], "quality_floor": "Tests pass"},
    "llm_last": {"deterministic": ["linting"], "llm_judgment": ["review"]}
  },
  "success_criteria": {"functional": ["works"], "quality": ["passes"], "completeness": ["done"], "negative": ["none"], "failure_handling": "escalate", "judgment_boundaries": []},
  "ground_truth": {
    "domain_ontology": {"glossary": {}, "naming_conventions": "snake_case", "status_definitions": {}, "architecture_vocabulary": {}},
    "environment": {"tech_stack": ["Bash 5.x"], "infrastructure": "local", "access_permissions": {}, "known_issues": [], "external_dependencies": []},
    "configuration": {"agents_md": "AGENTS.md", "tool_pointers": [], "hooks_count": 0, "hooks_last_audit": "2026-03-20", "skills": [], "mcp_servers": []}
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/bad-phase.json" 2>&1) || rc=$?
assert_exit_code "Invalid phase enum fails with exit 2" 2 "$rc"
assert_contains "Reports invalid phase" "$output" "phase"

teardown
echo ""

# ============================================================
# Validator Tests — No Arguments
# ============================================================
echo "=== Validator Tests — Usage ==="

output=$("$VALIDATE" 2>&1) || true
rc=$?
assert_contains "Validator shows usage without arguments" "$output" "Usage"

echo ""

# ============================================================
# Results
# ============================================================
echo "========================================="
echo "Ground Truth Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
