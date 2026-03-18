#!/bin/bash
# Admiral Framework — Escalation Resolution Integration Test
# Tests the full escalation pipeline: hook blocks → recovery ladder → escalation report → resolution
# Validates that the Privileged Escalation Guarantee holds: every block produces ≥1 resolution path.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
HOOKS_DIR="$PROJECT_DIR/.hooks"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

PASS=0
FAIL=0
ERRORS=""

assert_true() {
  local test_name="$1"
  local condition="$2"
  if [ "$condition" = "true" ] || [ "$condition" = "0" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name\n"
    echo "  FAIL: $test_name"
  fi
}

assert_contains() {
  local test_name="$1"
  local haystack="$2"
  local needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name — expected '$needle' in output\n"
    echo "  FAIL: $test_name"
  fi
}

echo "============================================="
echo " Escalation Resolution Integration Tests"
echo "============================================="
echo ""

# ============================================================
# Scenario 1: Scope boundary block → escalation with resolution paths
# ============================================================
echo "--- Scenario 1: Scope boundary enforcement → escalation pipeline ---"

# Step 1: Attempt write to protected path → expect hard-block
PAYLOAD='{"tool_name":"Edit","tool_input":{"file_path":"'"$PROJECT_DIR"'/aiStrat/spec/test-change.md","old_string":"a","new_string":"b"}}'
BLOCK_OUTPUT=""
BLOCK_EXIT=0
BLOCK_OUTPUT=$(echo "$PAYLOAD" | "$HOOKS_DIR/scope_boundary_guard.sh" 2>/dev/null) || BLOCK_EXIT=$?

assert_true "Step 1: Hook hard-blocks write to aiStrat/ (exit 2)" "$([ "$BLOCK_EXIT" -eq 2 ] && echo true || echo false)"
assert_contains "Step 1: Block output contains deny decision" "$BLOCK_OUTPUT" "deny"
assert_contains "Step 1: Block output suggests escalation" "$BLOCK_OUTPUT" "Escalate"

# Step 2: Verify the block provides actionable resolution paths
# The hook output should contain at least one resolution option
assert_contains "Step 2: Block output offers override option" "$BLOCK_OUTPUT" "ADMIRAL_SCOPE_OVERRIDE"
assert_contains "Step 2: Block output offers escalation option" "$BLOCK_OUTPUT" "Escalate with justification"
assert_contains "Step 2: Block output offers alternative option" "$BLOCK_OUTPUT" "non-protected paths"

# Count resolution paths offered (Options: (1)..., (2)..., (3)...)
PATH_COUNT=$(echo "$BLOCK_OUTPUT" | grep -oE '\([0-9]\)' | wc -l)
assert_true "Step 2: ≥1 resolution path offered (got $PATH_COUNT)" "$([ "$PATH_COUNT" -ge 1 ] && echo true || echo false)"

# Step 3: Verify that override resolves the block
OVERRIDE_OUTPUT=""
OVERRIDE_EXIT=0
OVERRIDE_OUTPUT=$(ADMIRAL_SCOPE_OVERRIDE="aiStrat" bash -c 'echo "$1" | "$2/scope_boundary_guard.sh" 2>/dev/null' _ "$PAYLOAD" "$HOOKS_DIR") || OVERRIDE_EXIT=$?

assert_true "Step 3: Override resolves block (exit 0)" "$([ "$OVERRIDE_EXIT" -eq 0 ] && echo true || echo false)"
assert_contains "Step 3: Override output confirms session scope" "$OVERRIDE_OUTPUT" "ADMIRAL_SCOPE_OVERRIDE"

echo ""

# ============================================================
# Scenario 2: Privilege escalation block → escalation with alternatives
# ============================================================
echo "--- Scenario 2: Privilege escalation enforcement → alternatives ---"

# Step 1: Attempt sudo → expect hard-block from prohibitions enforcer
PAYLOAD_SUDO='{"tool_name":"Bash","tool_input":{"command":"sudo apt-get install jq"}}'
SUDO_OUTPUT=""
SUDO_EXIT=0
SUDO_OUTPUT=$(echo "$PAYLOAD_SUDO" | "$HOOKS_DIR/prohibitions_enforcer.sh" 2>/dev/null) || SUDO_EXIT=$?

assert_true "Step 1: Prohibitions enforcer blocks sudo (exit 2)" "$([ "$SUDO_EXIT" -eq 2 ] && echo true || echo false)"
assert_contains "Step 1: Output references privilege escalation" "$SUDO_OUTPUT" "privilege escalation"
assert_contains "Step 1: Output suggests escalation" "$SUDO_OUTPUT" "Escalate"

# Step 2: Verify non-privileged alternative is available
# The same tool call without sudo should pass
PAYLOAD_NOSUDO='{"tool_name":"Bash","tool_input":{"command":"apt-get install jq"}}'
NOSUDO_OUTPUT=""
NOSUDO_EXIT=0
NOSUDO_OUTPUT=$(echo "$PAYLOAD_NOSUDO" | "$HOOKS_DIR/prohibitions_enforcer.sh" 2>/dev/null) || NOSUDO_EXIT=$?

assert_true "Step 2: Non-privileged alternative passes (exit 0)" "$([ "$NOSUDO_EXIT" -eq 0 ] && echo true || echo false)"

echo ""

# ============================================================
# Scenario 3: Full adapter chain preserves escalation context
# ============================================================
echo "--- Scenario 3: Full adapter chain → escalation context preserved ---"

# Fire the full pre_tool_use_adapter with a scope-violating payload
PAYLOAD_FULL='{"tool_name":"Write","tool_input":{"file_path":"'"$PROJECT_DIR"'/aiStrat/spec/new-section.md","content":"test"}}'
ADAPTER_OUTPUT=""
ADAPTER_EXIT=0
ADAPTER_OUTPUT=$(echo "$PAYLOAD_FULL" | "$HOOKS_DIR/pre_tool_use_adapter.sh" 2>/dev/null) || ADAPTER_EXIT=$?

assert_true "Step 1: Adapter propagates scope guard block (exit 2)" "$([ "$ADAPTER_EXIT" -eq 2 ] && echo true || echo false)"
assert_contains "Step 1: Adapter output contains SCOPE BOUNDARY" "$ADAPTER_OUTPUT" "SCOPE BOUNDARY"
assert_contains "Step 1: Adapter output contains resolution options" "$ADAPTER_OUTPUT" "ADMIRAL_SCOPE_OVERRIDE"

echo ""

# ============================================================
# Scenario 4: Escalation Report structure validation
# ============================================================
echo "--- Scenario 4: Escalation Report structure validation ---"

# Simulate an escalation report and validate it contains required fields
# (This validates the format specified in Part 11, not an actual agent producing one)
ESCALATION_REPORT="ESCALATION REPORT
=================

AGENT: Backend Implementer
TASK: Modify spec Part 3 enforcement section
SEVERITY: High

BLOCKER: Scope boundary guard blocks writes to aiStrat/

CONTEXT:
Task requires editing aiStrat/admiral/spec/part3-enforcement.md to add Privileged Escalation Guarantee.

APPROACHES ATTEMPTED:
1. Direct write — blocked by scope_boundary_guard.sh (exit 2)
2. Checked for ADMIRAL_SCOPE_OVERRIDE — not set

ROOT CAUSE ASSESSMENT:
SO-03 enforcement correctly blocks unauthorized writes to spec files. This is a legitimate task that requires Admiral approval.

WHAT'S NEEDED:
Admiral to set ADMIRAL_SCOPE_OVERRIDE=aiStrat or approve the specific file modification.

IMPACT:
Enforcement thesis resolution work is blocked until spec files can be modified.

RECOMMENDATION:
Set ADMIRAL_SCOPE_OVERRIDE=aiStrat for this session to allow spec modifications."

# Validate required fields are present
for FIELD in "AGENT:" "TASK:" "SEVERITY:" "BLOCKER:" "CONTEXT:" "APPROACHES ATTEMPTED:" "ROOT CAUSE ASSESSMENT:" "WHAT'S NEEDED:" "IMPACT:" "RECOMMENDATION:"; do
  if echo "$ESCALATION_REPORT" | grep -q "$FIELD"; then
    PASS=$((PASS + 1))
    echo "  PASS: Escalation report contains $FIELD"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: Escalation report missing $FIELD"
  fi
done

echo ""

# ============================================================
# Scenario 5: Resolution format validation
# ============================================================
echo "--- Scenario 5: Resolution format validation ---"

# Simulate a resolution response matching Part 11 Escalation Resolution System format
RESOLUTION="ESCALATION RESOLUTION
=====================

SITUATION:
Backend Implementer attempted to edit aiStrat/admiral/spec/part3-enforcement.md. Scope boundary guard blocked the write (exit 2). Agent tried direct write and override check — both failed.

EVALUATION:
Root cause: SO-03 enforcement correctly blocks unauthorized spec modifications. Constraint tension: the task legitimately requires spec changes, but the enforcement hook doesn't distinguish authorized from unauthorized modification requests. Brain precedent: No prior escalation for scope override found.

IMPACT:
Enforcement thesis resolution work is blocked. Downstream: contradictions analysis update and integration tests depend on this change.

RECOMMENDED PATHS:

  [1] Grant scoped override — Set ADMIRAL_SCOPE_OVERRIDE=aiStrat for this session
      Tradeoffs: Unblocks work immediately / Reduces scope enforcement for this session
      Confidence: Verified (mechanism tested)
      Reversibility: Fully reversible (unset at session end)

  [2] Approve specific file — Admiral manually approves the specific file edit
      Tradeoffs: Maintains full enforcement / Requires per-file approval overhead
      Confidence: Verified
      Reversibility: Fully reversible

  [3] Custom direction — Admiral provides their own resolution

ADMIRAL DECISION:
  [X] CONTINUE — Select a resolution path, resume the original plan"

# Validate resolution contains required sections
for SECTION in "SITUATION:" "EVALUATION:" "IMPACT:" "RECOMMENDED PATHS:" "ADMIRAL DECISION:"; do
  if echo "$RESOLUTION" | grep -q "$SECTION"; then
    PASS=$((PASS + 1))
    echo "  PASS: Resolution contains $SECTION"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: Resolution missing $SECTION"
  fi
done

# Validate each path has required fields
for FIELD in "Tradeoffs:" "Confidence:" "Reversibility:"; do
  COUNT=$(echo "$RESOLUTION" | grep -c "$FIELD" || true)
  if [ "$COUNT" -ge 2 ]; then
    PASS=$((PASS + 1))
    echo "  PASS: Resolution paths include $FIELD ($COUNT instances)"
  else
    FAIL=$((FAIL + 1))
    echo "  FAIL: Resolution paths missing $FIELD (expected ≥2, got $COUNT)"
  fi
done

# Validate ≥1 resolution path exists
PATH_COUNT=$(echo "$RESOLUTION" | grep -cE '^\s*\[[0-9]+\]' || true)
assert_true "Privileged Escalation Guarantee: ≥1 path (got $PATH_COUNT)" "$([ "$PATH_COUNT" -ge 1 ] && echo true || echo false)"

# Validate custom direction option exists
assert_contains "Custom direction option present" "$RESOLUTION" "Custom direction"

# Validate CONTINUE/REDIRECT/STOP options referenced
assert_contains "CONTINUE option referenced" "$RESOLUTION" "CONTINUE"

echo ""

# ============================================================
# Summary
# ============================================================
echo "============================================="
echo " Results: $PASS passed, $FAIL failed"
echo "============================================="

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi

exit 0
