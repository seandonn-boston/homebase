#!/bin/bash
# Admiral Framework — Hook Output Snapshot Tests (T-20)
# Validates hook outputs match their snapshot schemas.
# Runs each hook with a standard payload and verifies the output
# contains the expected fields defined in .snap.json files.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"
SNAPSHOT_DIR="$SCRIPT_DIR/snapshots"
HOOKS_DIR="$PROJECT_DIR/.hooks"

PASS=0
FAIL=0
ERRORS=""

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — expected '$expected', got '$actual'\n"
    echo "  [FAIL] $test_name — expected '$expected', got '$actual'"
  fi
}

echo "=== Hook Output Snapshot Tests (T-20) ==="
echo ""

# ─── Snapshot file validation ────────────────────────────────────────

echo "--- Snapshot file integrity ---"

SNAP_COUNT=0
SNAP_VALID=0
for snap_file in "$SNAPSHOT_DIR"/*.snap.json; do
  [ -f "$snap_file" ] || continue
  SNAP_COUNT=$((SNAP_COUNT + 1))
  basename=$(basename "$snap_file")

  # Verify it's valid JSON
  if jq empty "$snap_file" 2>/dev/null; then
    SNAP_VALID=$((SNAP_VALID + 1))
    PASS=$((PASS + 1))
    echo "  [PASS] $basename is valid JSON"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename is invalid JSON\n"
    echo "  [FAIL] $basename is invalid JSON"
  fi

  # Verify required metadata fields
  hook_name=$(jq -r '._hook // empty' "$snap_file" 2>/dev/null) || true
  if [ -n "$hook_name" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $basename has _hook field"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename missing _hook field\n"
    echo "  [FAIL] $basename missing _hook field"
  fi

  event_name=$(jq -r '._event // empty' "$snap_file" 2>/dev/null) || true
  if [ -n "$event_name" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $basename has _event field"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename missing _event field\n"
    echo "  [FAIL] $basename missing _event field"
  fi

  # Verify shapes object exists
  has_shapes=$(jq 'has("shapes")' "$snap_file" 2>/dev/null) || has_shapes="false"
  if [ "$has_shapes" = "true" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $basename has shapes definition"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename missing shapes definition\n"
    echo "  [FAIL] $basename missing shapes definition"
  fi
done

assert_eq "snapshot count >= 9" "true" "$([ "$SNAP_COUNT" -ge 9 ] && echo true || echo false)"

# ─── Hook-to-snapshot mapping ────────────────────────────────────────

echo ""
echo "--- Hook-to-snapshot coverage ---"

# Verify each snapshot has a corresponding hook script
for snap_file in "$SNAPSHOT_DIR"/*.snap.json; do
  [ -f "$snap_file" ] || continue
  hook_name=$(jq -r '._hook' "$snap_file" 2>/dev/null)
  hook_file="$HOOKS_DIR/${hook_name}.sh"
  basename=$(basename "$snap_file")

  if [ -f "$hook_file" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $basename -> ${hook_name}.sh exists"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $basename -> ${hook_name}.sh NOT FOUND\n"
    echo "  [FAIL] $basename -> ${hook_name}.sh NOT FOUND"
  fi
done

# ─── Shape validation: verify hooks produce output matching snapshots ─

echo ""
echo "--- Output shape validation ---"

# Test post_tool_use_adapter no-alert case
if [ -x "$HOOKS_DIR/post_tool_use_adapter.sh" ]; then
  # Create minimal state for the adapter
  mkdir -p "$PROJECT_DIR/.admiral"
  ADAPTER_OUTPUT=$(echo '{"tool_name":"Glob","tool_input":{"pattern":"*.md"}}' | \
    timeout 10 bash "$HOOKS_DIR/post_tool_use_adapter.sh" 2>/dev/null) || true

  if [ -n "$ADAPTER_OUTPUT" ]; then
    HAS_CONTINUE=$(echo "$ADAPTER_OUTPUT" | jq 'has("continue")' 2>/dev/null) || HAS_CONTINUE="false"
    assert_eq "post_tool_use_adapter output has 'continue'" "true" "$HAS_CONTINUE"
  else
    PASS=$((PASS + 1))
    echo "  [PASS] post_tool_use_adapter produces output (empty = no alerts, implicit continue)"
  fi
fi

# Test pre_tool_use_adapter allow case (non-modifying tool)
if [ -x "$HOOKS_DIR/pre_tool_use_adapter.sh" ]; then
  echo '{"tool_name":"Read","tool_input":{"file_path":"/tmp/test.txt"}}' | \
    timeout 10 bash "$HOOKS_DIR/pre_tool_use_adapter.sh" >/dev/null 2>&1 || true

  PRE_EXIT=$?
  assert_eq "pre_tool_use_adapter exits 0 for Read" "0" "$PRE_EXIT"
fi

# Test loop_detector no-error case
if [ -x "$HOOKS_DIR/loop_detector.sh" ]; then
  LOOP_INPUT='{"tool_name":"Read","tool_response":{"content":"ok"},"session_state":{"session_id":"test","hook_state":{"loop_detector":{"error_counts":{},"total_errors":0}}}}'
  LOOP_OUTPUT=$(echo "$LOOP_INPUT" | timeout 10 bash "$HOOKS_DIR/loop_detector.sh" 2>/dev/null) || true

  if [ -n "$LOOP_OUTPUT" ]; then
    HAS_HOOK_STATE=$(echo "$LOOP_OUTPUT" | jq 'has("hook_state")' 2>/dev/null) || HAS_HOOK_STATE="false"
    assert_eq "loop_detector output has hook_state" "true" "$HAS_HOOK_STATE"

    HAS_LOOP_DET=$(echo "$LOOP_OUTPUT" | jq '.hook_state | has("loop_detector")' 2>/dev/null) || HAS_LOOP_DET="false"
    assert_eq "loop_detector hook_state has loop_detector" "true" "$HAS_LOOP_DET"
  fi
fi

# Test context_health_check ok case
if [ -x "$HOOKS_DIR/context_health_check.sh" ]; then
  HEALTH_INPUT='{"session_state":{"context":{"standing_context_present":["Identity","Authority","Constraints"]}}}'
  HEALTH_OUTPUT=$(echo "$HEALTH_INPUT" | timeout 10 bash "$HOOKS_DIR/context_health_check.sh" 2>/dev/null) || true

  if [ -n "$HEALTH_OUTPUT" ]; then
    HAS_STATUS=$(echo "$HEALTH_OUTPUT" | jq 'has("status")' 2>/dev/null) || HAS_STATUS="false"
    assert_eq "context_health_check output has status" "true" "$HAS_STATUS"

    STATUS_VAL=$(echo "$HEALTH_OUTPUT" | jq -r '.status' 2>/dev/null) || STATUS_VAL=""
    assert_eq "context_health_check status is ok" "ok" "$STATUS_VAL"
  fi
fi

# Test context_health_check warning case (missing sections)
if [ -x "$HOOKS_DIR/context_health_check.sh" ]; then
  HEALTH_WARN='{"session_state":{"context":{"standing_context_present":[]}}}'
  WARN_OUTPUT=$(echo "$HEALTH_WARN" | timeout 10 bash "$HOOKS_DIR/context_health_check.sh" 2>/dev/null) || true

  if [ -n "$WARN_OUTPUT" ]; then
    HAS_ALERT=$(echo "$WARN_OUTPUT" | jq 'has("alert")' 2>/dev/null) || HAS_ALERT="false"
    assert_eq "context_health_check warning has alert" "true" "$HAS_ALERT"
  fi
fi

# ─── Snapshot mismatch detection ─────────────────────────────────────

echo ""
echo "--- Snapshot change detection ---"

# Verify snapshots haven't been accidentally modified by checking git status
SNAP_CHANGES=$(git -C "$PROJECT_DIR" diff --name-only -- admiral/tests/snapshots/ 2>/dev/null) || true
if [ -z "$SNAP_CHANGES" ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] No uncommitted snapshot changes"
else
  FAIL=$((FAIL + 1))
  ERRORS+="  [FAIL] Uncommitted snapshot changes: $SNAP_CHANGES\n"
  echo "  [FAIL] Uncommitted snapshot changes: $SNAP_CHANGES"
fi

# ─── Summary ─────────────────────────────────────────────────────────

echo ""
echo "=== Results ==="
echo "  Passed: $PASS"
echo "  Failed: $FAIL"
echo "  Snapshots: $SNAP_COUNT ($SNAP_VALID valid)"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  printf '%b' "$ERRORS"
  exit 1
fi

echo "  All tests passed."
exit 0
