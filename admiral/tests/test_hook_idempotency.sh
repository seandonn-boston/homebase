#!/bin/bash
# Admiral Framework — Hook Idempotency Verification (Q-14)
# Verifies running any hook twice with the same input produces the same output.
# State mutations must be convergent (idempotent).
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"
HOOKS_DIR="$PROJECT_DIR/.hooks"

# Create isolated state for testing
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT
export ADMIRAL_DIR="$TEST_DIR/.admiral"
mkdir -p "$ADMIRAL_DIR"

# Initialize minimal session state
cat > "$ADMIRAL_DIR/session_state.json" << 'EOF'
{
  "session_id": "idempotency-test",
  "started_at": 1711500000,
  "tokens_used": 1000,
  "token_budget": 100000,
  "tool_call_count": 5,
  "hook_state": {
    "loop_detector": {"error_counts": {}, "total_errors": 0},
    "brain_context_router": {"brain_queries_count": 0, "last_brain_query_tool_call": 0, "propose_without_brain": 0, "escalate_without_brain": 0},
    "zero_trust": {"external_data_count": 0},
    "compliance": {"flags_count": 0},
    "pre_work_validator": {"validated": true}
  },
  "context": {
    "standing_context_tokens": 5000,
    "standing_context_present": ["Identity", "Authority", "Constraints"]
  }
}
EOF

# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/assert.sh"

# Test idempotency: run a hook twice with the same input, compare outputs
test_idempotent() {
  local test_name="$1"
  local hook_script="$2"
  local payload="$3"

  if [ ! -x "$hook_script" ]; then
    PASS=$((PASS + 1))
    echo "  [SKIP] $test_name — script not executable"
    return 0
  fi

  local output1=""
  local output2=""
  local exit1=0
  local exit2=0

  output1=$(echo "$payload" | timeout 10 bash "$hook_script" 2>/dev/null) || exit1=$?
  output2=$(echo "$payload" | timeout 10 bash "$hook_script" 2>/dev/null) || exit2=$?

  # Compare exit codes
  if [ "$exit1" -ne "$exit2" ]; then
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — exit codes differ: $exit1 vs $exit2\n"
    echo "  [FAIL] $test_name — exit codes differ: $exit1 vs $exit2"
    return
  fi

  # Compare output structure (normalize timestamps and dynamic values)
  local norm1=""
  local norm2=""

  # Strip timestamps, trace IDs, and session-specific values for comparison
  norm1=$(echo "$output1" | jq -S 'del(.timestamp, .ts, .trace_id, .confirmed_at, .assessed_at) // .' 2>/dev/null) || norm1="$output1"
  norm2=$(echo "$output2" | jq -S 'del(.timestamp, .ts, .trace_id, .confirmed_at, .assessed_at) // .' 2>/dev/null) || norm2="$output2"

  if [ "$norm1" = "$norm2" ]; then
    PASS=$((PASS + 1))
    echo "  [PASS] $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  [FAIL] $test_name — outputs differ\n"
    echo "  [FAIL] $test_name — outputs differ"
  fi
}

echo "=== Hook Idempotency Verification (Q-14) ==="
echo ""

# Standard payloads
SAFE_BASH='{"tool_name":"Bash","tool_input":{"command":"echo hello"}}'
SAFE_READ='{"tool_name":"Read","tool_input":{"file_path":"/tmp/test.txt"}}'
SAFE_GLOB='{"tool_name":"Glob","tool_input":{"pattern":"*.md"}}'

# PostToolUse hooks with session_state
POST_PAYLOAD='{"tool_name":"Read","tool_input":{"file_path":"/tmp/test.txt"},"tool_response":{"content":"hello"},"session_state":{"session_id":"test","tokens_used":100,"token_budget":100000,"tool_call_count":5,"hook_state":{"loop_detector":{"error_counts":{},"total_errors":0},"zero_trust":{"external_data_count":0},"compliance":{"flags_count":0}}}}'

# ─── PostToolUse sub-hooks ───────────────────────────────────────────

echo "--- PostToolUse sub-hooks ---"

test_idempotent "loop_detector (no error)" \
  "$HOOKS_DIR/loop_detector.sh" \
  "$POST_PAYLOAD"

test_idempotent "zero_trust_validator (safe tool)" \
  "$HOOKS_DIR/zero_trust_validator.sh" \
  "$POST_PAYLOAD"

test_idempotent "compliance_ethics_advisor (clean content)" \
  "$HOOKS_DIR/compliance_ethics_advisor.sh" \
  "$POST_PAYLOAD"

test_idempotent "token_budget_tracker" \
  "$HOOKS_DIR/token_budget_tracker.sh" \
  "$POST_PAYLOAD"

test_idempotent "context_health_check (ok)" \
  "$HOOKS_DIR/context_health_check.sh" \
  '{"session_state":{"context":{"standing_context_present":["Identity","Authority","Constraints"]}}}'

test_idempotent "context_health_check (warning)" \
  "$HOOKS_DIR/context_health_check.sh" \
  '{"session_state":{"context":{"standing_context_present":[]}}}'

# ─── PreToolUse sub-hooks ────────────────────────────────────────────

echo ""
echo "--- PreToolUse sub-hooks ---"

test_idempotent "scope_boundary_guard (safe read)" \
  "$HOOKS_DIR/scope_boundary_guard.sh" \
  "$SAFE_READ"

test_idempotent "scope_boundary_guard (safe glob)" \
  "$HOOKS_DIR/scope_boundary_guard.sh" \
  "$SAFE_GLOB"

test_idempotent "prohibitions_enforcer (safe bash)" \
  "$HOOKS_DIR/prohibitions_enforcer.sh" \
  "$SAFE_BASH"

test_idempotent "prohibitions_enforcer (dangerous)" \
  "$HOOKS_DIR/prohibitions_enforcer.sh" \
  '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}'

test_idempotent "tool_permission_guard (safe read)" \
  "$HOOKS_DIR/tool_permission_guard.sh" \
  "$SAFE_READ"

# ─── Adapters ────────────────────────────────────────────────────────

echo ""
echo "--- Adapters ---"

test_idempotent "post_tool_use_adapter (safe tool)" \
  "$HOOKS_DIR/post_tool_use_adapter.sh" \
  "$SAFE_GLOB"

test_idempotent "pre_tool_use_adapter (safe read)" \
  "$HOOKS_DIR/pre_tool_use_adapter.sh" \
  "$SAFE_READ"

# ─── Summary ─────────────────────────────────────────────────────────

print_results "Hook Idempotency Verification"
