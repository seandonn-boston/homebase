#!/bin/bash
# Admiral Framework — session_start_adapter.sh Tests (T-19)
# Verifies session initialization: state reset, config loading,
# Standing Orders rendering, session metadata, event logging.
# Tests fresh start, resume, and corrupted state recovery.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/lib/assert.sh"

setup() {
  TEST_DIR=$(mktemp -d)
  # Create minimal project structure
  mkdir -p "$TEST_DIR/.admiral"
  mkdir -p "$TEST_DIR/admiral/lib"
  mkdir -p "$TEST_DIR/admiral/standing-orders"
  mkdir -p "$TEST_DIR/admiral/config"
  mkdir -p "$TEST_DIR/.hooks"

  # Copy required files
  cp "$PROJECT_DIR/admiral/lib/state.sh" "$TEST_DIR/admiral/lib/"
  cp "$PROJECT_DIR/admiral/lib/standing_orders.sh" "$TEST_DIR/admiral/lib/"
  cp "$PROJECT_DIR/.hooks/session_start_adapter.sh" "$TEST_DIR/.hooks/"
  cp "$PROJECT_DIR/.hooks/context_baseline.sh" "$TEST_DIR/.hooks/" 2>/dev/null || true

  # Copy Standing Orders
  cp "$PROJECT_DIR/admiral/standing-orders/"*.json "$TEST_DIR/admiral/standing-orders/" 2>/dev/null || true

  export CLAUDE_PROJECT_DIR="$TEST_DIR"
}

teardown() {
  rm -rf "$TEST_DIR"
}

echo "=== session_start_adapter.sh Tests ==="
echo ""

# --- Test: Fresh start ---
echo "--- Fresh start ---"
setup

PAYLOAD='{"session_id":"test-session-1","model":"claude-sonnet-4-20250514"}'
OUTPUT=$(echo "$PAYLOAD" | bash "$TEST_DIR/.hooks/session_start_adapter.sh" 2>/dev/null) || true

# Output should be valid JSON
if echo "$OUTPUT" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Output is valid JSON"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Output is not valid JSON"
fi

# Output should have continue=true
continue_val=$(echo "$OUTPUT" | jq -r '.continue' 2>/dev/null)
assert_eq "continue is true" "true" "$continue_val"

# Output should have systemMessage with Standing Orders
assert_contains "systemMessage has Standing Orders" "$OUTPUT" "STANDING ORDERS"

# Session state should be initialized
if [ -f "$TEST_DIR/.admiral/session_state.json" ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Session state file created"

  sid=$(jq -r '.session_id' "$TEST_DIR/.admiral/session_state.json")
  assert_eq "Session ID in state" "test-session-1" "$sid"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Session state file not created"
fi

# Event log should have session_start entry
if [ -f "$TEST_DIR/.admiral/event_log.jsonl" ]; then
  PASS=$((PASS + 1))
  echo "  [PASS] Event log created"

  event_type=$(jq -r '.event' "$TEST_DIR/.admiral/event_log.jsonl" 2>/dev/null || echo "unknown")
  assert_eq "Event type is session_start" "session_start" "$event_type"

  event_model=$(jq -r '.model // "unknown"' "$TEST_DIR/.admiral/event_log.jsonl" 2>/dev/null || echo "unknown")
  assert_contains "Event has model" "$event_model" "claude"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Event log not created"
fi

teardown

echo ""

# --- Test: Re-initialization (resume path) ---
echo "--- Re-initialization resets state ---"
setup

# Create pre-existing state with old data
cat > "$TEST_DIR/.admiral/session_state.json" << 'EOF'
{"session_id":"old-session","started_at":1000,"tokens_used":5000,"tool_call_count":42}
EOF

PAYLOAD='{"session_id":"new-session","model":"claude-opus-4-6"}'
OUTPUT=$(echo "$PAYLOAD" | bash "$TEST_DIR/.hooks/session_start_adapter.sh" 2>/dev/null) || true

# State should be reset with new session ID
sid=$(jq -r '.session_id' "$TEST_DIR/.admiral/session_state.json" 2>/dev/null)
assert_eq "Session ID reset to new" "new-session" "$sid"

# Tokens should be reset
tokens=$(jq -r '.tokens_used' "$TEST_DIR/.admiral/session_state.json" 2>/dev/null)
assert_eq "Tokens reset to 0" "0" "$tokens"

teardown

echo ""

# --- Test: Corrupted state recovery ---
echo "--- Corrupted state recovery ---"
setup

# Write corrupt state
echo "NOT JSON" > "$TEST_DIR/.admiral/session_state.json"

PAYLOAD='{"session_id":"recovery-session","model":"claude-sonnet-4-20250514"}'
OUTPUT=$(echo "$PAYLOAD" | bash "$TEST_DIR/.hooks/session_start_adapter.sh" 2>/dev/null) || true

# Should still produce valid output
if echo "$OUTPUT" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Adapter recovers from corrupt state"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Adapter failed to recover from corrupt state"
fi

# State should be valid now
if jq empty "$TEST_DIR/.admiral/session_state.json" 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] State file is valid after recovery"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] State file still corrupt after recovery"
fi

teardown

echo ""

# --- Test: Missing Standing Orders directory ---
echo "--- Missing Standing Orders ---"
setup
rm -rf "$TEST_DIR/admiral/standing-orders"
mkdir -p "$TEST_DIR/admiral/standing-orders"

PAYLOAD='{"session_id":"no-so-session","model":"claude-sonnet-4-20250514"}'
OUTPUT=$(echo "$PAYLOAD" | bash "$TEST_DIR/.hooks/session_start_adapter.sh" 2>/dev/null) || true

# Should still produce valid JSON output
if echo "$OUTPUT" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Adapter handles empty SO directory"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Adapter crashed with empty SO directory"
fi

teardown

echo ""

# --- Test: Empty payload ---
echo "--- Empty/minimal payload ---"
setup

PAYLOAD='{}'
OUTPUT=$(echo "$PAYLOAD" | bash "$TEST_DIR/.hooks/session_start_adapter.sh" 2>/dev/null) || true

# Should handle gracefully with defaults
if echo "$OUTPUT" | jq empty 2>/dev/null; then
  PASS=$((PASS + 1))
  echo "  [PASS] Adapter handles empty payload"
else
  FAIL=$((FAIL + 1))
  echo "  [FAIL] Adapter crashed on empty payload"
fi

sid=$(jq -r '.session_id' "$TEST_DIR/.admiral/session_state.json" 2>/dev/null)
assert_eq "Default session ID is 'unknown'" "unknown" "$sid"

teardown

print_results "Session Start Adapter Tests"
