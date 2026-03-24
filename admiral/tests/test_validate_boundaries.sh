#!/bin/bash
# Admiral Framework — Boundaries Validator Tests
# Tests validate_boundaries against various Ground Truth documents.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ADMIRAL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VALIDATE="$ADMIRAL_DIR/bin/validate_boundaries"

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
    ERRORS+="  [FAIL] $test_name — did not expect '$unexpected' in output\n"
    echo "  [FAIL] $test_name"
  else
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  fi
}

setup() { TMPDIR_BASE="$(mktemp -d)"; }
teardown() { rm -rf "$TMPDIR_BASE"; }

# ============================================================
echo "=== Prerequisite Checks ==="
if [ ! -f "$VALIDATE" ]; then
  echo "  [SKIP] Validator not found at $VALIDATE"
  exit 1
fi
echo "  All prerequisites found."
echo ""

# ============================================================
echo "=== Usage ==="

rc=0
output=$("$VALIDATE" 2>&1) || rc=$?
assert_contains "Shows usage without arguments" "$output" "Usage"

echo ""

# ============================================================
echo "=== Fully Complete Boundaries ==="

setup
cat > "$TMPDIR_BASE/complete.json" << 'EOF'
{
  "boundaries": {
    "non_goals": {
      "functional": ["No GUI"],
      "quality": ["No 100% coverage requirement"],
      "architectural": ["No microservices"]
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
      "tool_call_limits": "50 calls per task",
      "scope_boundary": ["admiral/"],
      "quality_floor": "All tests pass"
    },
    "llm_last": {
      "deterministic": ["Linting", "Schema validation"],
      "llm_judgment": ["Architecture decisions"]
    }
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/complete.json" 2>&1) || rc=$?
assert_exit_code "Complete boundaries passes" 0 "$rc"
assert_contains "Reports non_goals present" "$output" "non_goals"
assert_contains "Reports hard_constraints present" "$output" "hard_constraints"
assert_contains "Reports resource_budgets present" "$output" "resource_budgets"
assert_contains "Reports llm_last present" "$output" "llm_last"
assert_not_contains "No MISSING in complete doc" "$output" "MISSING"

teardown
echo ""

# ============================================================
echo "=== Missing Boundaries Section Entirely ==="

setup
cat > "$TMPDIR_BASE/no-boundaries.json" << 'EOF'
{
  "project": {"name": "Test"}
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/no-boundaries.json" 2>&1) || rc=$?
assert_exit_code "Missing boundaries section fails with exit 2" 2 "$rc"
assert_contains "Reports missing boundaries" "$output" "boundaries"

teardown
echo ""

# ============================================================
echo "=== Missing Non-Goals ==="

setup
cat > "$TMPDIR_BASE/no-nongoals.json" << 'EOF'
{
  "boundaries": {
    "hard_constraints": {
      "tech_stack": ["Bash 5.2"],
      "external_deadlines": [],
      "compatibility": [],
      "regulatory": [],
      "protocol_scope": []
    },
    "resource_budgets": {
      "token_budget": "10000",
      "time_budget": "30m",
      "tool_call_limits": "50",
      "scope_boundary": ["."],
      "quality_floor": "Tests pass"
    },
    "llm_last": {
      "deterministic": ["linting"],
      "llm_judgment": ["review"]
    }
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/no-nongoals.json" 2>&1) || rc=$?
assert_exit_code "Missing non_goals fails with exit 2" 2 "$rc"
assert_contains "Reports non_goals missing" "$output" "non_goals"

teardown
echo ""

# ============================================================
echo "=== Missing LLM-Last ==="

setup
cat > "$TMPDIR_BASE/no-llmlast.json" << 'EOF'
{
  "boundaries": {
    "non_goals": {
      "functional": ["No GUI"],
      "quality": [],
      "architectural": []
    },
    "hard_constraints": {
      "tech_stack": ["Bash 5.2"],
      "external_deadlines": [],
      "compatibility": [],
      "regulatory": [],
      "protocol_scope": []
    },
    "resource_budgets": {
      "token_budget": "10000",
      "time_budget": "30m",
      "tool_call_limits": "50",
      "scope_boundary": ["."],
      "quality_floor": "Tests pass"
    }
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/no-llmlast.json" 2>&1) || rc=$?
assert_exit_code "Missing llm_last fails with exit 2" 2 "$rc"
assert_contains "Reports llm_last missing" "$output" "llm_last"

teardown
echo ""

# ============================================================
echo "=== Empty Sub-categories ==="

setup
cat > "$TMPDIR_BASE/empty-subs.json" << 'EOF'
{
  "boundaries": {
    "non_goals": {
      "functional": [],
      "quality": [],
      "architectural": []
    },
    "hard_constraints": {
      "tech_stack": [],
      "external_deadlines": [],
      "compatibility": [],
      "regulatory": [],
      "protocol_scope": []
    },
    "resource_budgets": {
      "token_budget": "",
      "time_budget": "",
      "tool_call_limits": "",
      "scope_boundary": [],
      "quality_floor": ""
    },
    "llm_last": {
      "deterministic": [],
      "llm_judgment": []
    }
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/empty-subs.json" 2>&1) || rc=$?
assert_exit_code "All-empty sub-categories fails with exit 2" 2 "$rc"
assert_contains "Reports empty tech_stack" "$output" "tech_stack"
assert_contains "Reports empty deterministic" "$output" "deterministic"
assert_contains "Reports empty quality_floor" "$output" "quality_floor"

teardown
echo ""

# ============================================================
echo "=== Vague Versions in Boundaries ==="

setup
cat > "$TMPDIR_BASE/vague.json" << 'EOF'
{
  "boundaries": {
    "non_goals": {
      "functional": ["No GUI"],
      "quality": [],
      "architectural": []
    },
    "hard_constraints": {
      "tech_stack": ["Node.js latest"],
      "external_deadlines": [],
      "compatibility": [],
      "regulatory": [],
      "protocol_scope": []
    },
    "resource_budgets": {
      "token_budget": "10000",
      "time_budget": "30m",
      "tool_call_limits": "50",
      "scope_boundary": ["."],
      "quality_floor": "Tests pass"
    },
    "llm_last": {
      "deterministic": ["linting"],
      "llm_judgment": ["review"]
    }
  }
}
EOF

rc=0
output=$("$VALIDATE" "$TMPDIR_BASE/vague.json" 2>&1) || rc=$?
assert_exit_code "Vague versions in boundaries fails with exit 2" 2 "$rc"
assert_contains "Reports vague version" "$output" "latest"

teardown
echo ""

# ============================================================
echo "=== JSON-formatted output (--json) ==="

setup
cat > "$TMPDIR_BASE/complete2.json" << 'EOF'
{
  "boundaries": {
    "non_goals": {
      "functional": ["No GUI"],
      "quality": [],
      "architectural": []
    },
    "hard_constraints": {
      "tech_stack": ["Bash 5.2"],
      "external_deadlines": [],
      "compatibility": [],
      "regulatory": [],
      "protocol_scope": []
    },
    "resource_budgets": {
      "token_budget": "10000",
      "time_budget": "30m",
      "tool_call_limits": "50",
      "scope_boundary": ["."],
      "quality_floor": "Tests pass"
    },
    "llm_last": {
      "deterministic": ["linting"],
      "llm_judgment": ["review"]
    }
  }
}
EOF

rc=0
output=$("$VALIDATE" --json "$TMPDIR_BASE/complete2.json" 2>&1) || rc=$?
assert_exit_code "JSON output mode exits 0 for valid" 0 "$rc"
# Verify it's valid JSON
echo "$output" | jq empty 2>/dev/null
json_rc=$?
assert_exit_code "JSON output is valid JSON" 0 "$json_rc"

teardown
echo ""

# ============================================================
echo "========================================="
echo "Boundaries Validator Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
