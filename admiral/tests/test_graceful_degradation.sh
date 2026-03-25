#!/bin/bash
# Admiral Framework — Graceful Degradation Tests (A-13)
# Verifies Admiral functions when optional components are absent.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

PASS=0
FAIL=0
ERRORS=""

assert_exit_zero() {
  local test_name="$1"
  local cmd="$2"
  local rc=0
  eval "$cmd" > /dev/null 2>&1 || rc=$?
  if [ "$rc" -eq 0 ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — exit $rc\n"
    echo "  [FAIL] $test_name (exit $rc)"
  fi
}

echo "=== Graceful Degradation Tests ==="
echo ""

# --- Test: Hooks work without control plane ---
echo "--- Without control plane ---"

TEST_DIR=$(mktemp -d)
mkdir -p "$TEST_DIR/.admiral"
mkdir -p "$TEST_DIR/admiral/lib"
mkdir -p "$TEST_DIR/admiral/standing-orders"
mkdir -p "$TEST_DIR/.hooks"

cp "$PROJECT_DIR/admiral/lib/state.sh" "$TEST_DIR/admiral/lib/"
cp "$PROJECT_DIR/admiral/lib/standing_orders.sh" "$TEST_DIR/admiral/lib/"
cp "$PROJECT_DIR/.hooks/session_start_adapter.sh" "$TEST_DIR/.hooks/"
cp "$PROJECT_DIR/.hooks/pre_tool_use_adapter.sh" "$TEST_DIR/.hooks/"
cp "$PROJECT_DIR/.hooks/post_tool_use_adapter.sh" "$TEST_DIR/.hooks/"
cp "$PROJECT_DIR/.hooks/"*.sh "$TEST_DIR/.hooks/" 2>/dev/null || true
cp "$PROJECT_DIR/admiral/standing-orders/"*.json "$TEST_DIR/admiral/standing-orders/" 2>/dev/null || true
cp "$PROJECT_DIR/admiral/config.json" "$TEST_DIR/admiral/" 2>/dev/null || true

export CLAUDE_PROJECT_DIR="$TEST_DIR"

# No control-plane directory — hooks should still work
assert_exit_zero "Session start without control plane" \
  "echo '{\"session_id\":\"degrade-test\"}' | bash '$TEST_DIR/.hooks/session_start_adapter.sh'"

assert_exit_zero "PreToolUse without control plane" \
  "echo '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"echo hi\"}}' | bash '$TEST_DIR/.hooks/pre_tool_use_adapter.sh'"

assert_exit_zero "PostToolUse without control plane" \
  "echo '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"echo hi\"}}' | bash '$TEST_DIR/.hooks/post_tool_use_adapter.sh'"

rm -rf "$TEST_DIR"
echo ""

# --- Test: Hooks work without Brain ---
echo "--- Without Brain ---"

TEST_DIR=$(mktemp -d)
mkdir -p "$TEST_DIR/.admiral"
mkdir -p "$TEST_DIR/admiral/lib"
mkdir -p "$TEST_DIR/admiral/standing-orders"
mkdir -p "$TEST_DIR/.hooks"

cp "$PROJECT_DIR/admiral/lib/state.sh" "$TEST_DIR/admiral/lib/"
cp "$PROJECT_DIR/admiral/lib/standing_orders.sh" "$TEST_DIR/admiral/lib/"
cp "$PROJECT_DIR/.hooks/"*.sh "$TEST_DIR/.hooks/" 2>/dev/null || true
cp "$PROJECT_DIR/admiral/standing-orders/"*.json "$TEST_DIR/admiral/standing-orders/" 2>/dev/null || true
cp "$PROJECT_DIR/admiral/config.json" "$TEST_DIR/admiral/" 2>/dev/null || true

# No brain_query, brain_record, etc.
export CLAUDE_PROJECT_DIR="$TEST_DIR"

assert_exit_zero "Session start without Brain" \
  "echo '{\"session_id\":\"no-brain\"}' | bash '$TEST_DIR/.hooks/session_start_adapter.sh'"

assert_exit_zero "PostToolUse without Brain" \
  "echo '{\"tool_name\":\"Read\",\"tool_input\":{\"file_path\":\"/tmp/test\"}}' | bash '$TEST_DIR/.hooks/post_tool_use_adapter.sh'"

rm -rf "$TEST_DIR"
echo ""

# --- Test: Hooks work without config.json ---
echo "--- Without config.json ---"

TEST_DIR=$(mktemp -d)
mkdir -p "$TEST_DIR/.admiral"
mkdir -p "$TEST_DIR/admiral/lib"
mkdir -p "$TEST_DIR/admiral/standing-orders"
mkdir -p "$TEST_DIR/.hooks"

cp "$PROJECT_DIR/admiral/lib/state.sh" "$TEST_DIR/admiral/lib/"
cp "$PROJECT_DIR/admiral/lib/standing_orders.sh" "$TEST_DIR/admiral/lib/"
cp "$PROJECT_DIR/.hooks/"*.sh "$TEST_DIR/.hooks/" 2>/dev/null || true
cp "$PROJECT_DIR/admiral/standing-orders/"*.json "$TEST_DIR/admiral/standing-orders/" 2>/dev/null || true

# Explicitly no config.json
export CLAUDE_PROJECT_DIR="$TEST_DIR"

assert_exit_zero "Session start without config.json (falls back to defaults)" \
  "echo '{\"session_id\":\"no-config\"}' | bash '$TEST_DIR/.hooks/session_start_adapter.sh'"

assert_exit_zero "PostToolUse without config.json" \
  "echo '{\"tool_name\":\"Bash\",\"tool_input\":{\"command\":\"ls\"}}' | bash '$TEST_DIR/.hooks/post_tool_use_adapter.sh'"

rm -rf "$TEST_DIR"
echo ""

# --- Test: Hooks work without Standing Orders ---
echo "--- Without Standing Orders ---"

TEST_DIR=$(mktemp -d)
mkdir -p "$TEST_DIR/.admiral"
mkdir -p "$TEST_DIR/admiral/lib"
mkdir -p "$TEST_DIR/admiral/standing-orders"
mkdir -p "$TEST_DIR/.hooks"

cp "$PROJECT_DIR/admiral/lib/state.sh" "$TEST_DIR/admiral/lib/"
cp "$PROJECT_DIR/admiral/lib/standing_orders.sh" "$TEST_DIR/admiral/lib/"
cp "$PROJECT_DIR/.hooks/"*.sh "$TEST_DIR/.hooks/" 2>/dev/null || true
cp "$PROJECT_DIR/admiral/config.json" "$TEST_DIR/admiral/" 2>/dev/null || true

# Empty standing-orders directory
export CLAUDE_PROJECT_DIR="$TEST_DIR"

assert_exit_zero "Session start with empty Standing Orders" \
  "echo '{\"session_id\":\"no-so\"}' | bash '$TEST_DIR/.hooks/session_start_adapter.sh'"

rm -rf "$TEST_DIR"
echo ""

# --- Test: Component availability registry is valid ---
echo "--- Component availability registry ---"
REGISTRY="$PROJECT_DIR/admiral/config/component_availability.json"
if jq empty "$REGISTRY" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Registry is valid JSON"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Registry is not valid JSON"
fi

comp_count=$(jq '.components | length' "$REGISTRY" 2>/dev/null)
if [ "$comp_count" -ge 5 ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Registry has $comp_count components"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Registry has too few components: $comp_count"
fi

echo ""
echo "========================================="
echo "Graceful Degradation Tests: $PASS passed, $FAIL failed"
echo "========================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
