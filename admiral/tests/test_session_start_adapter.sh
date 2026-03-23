#!/usr/bin/env bash
# T-19: Tests for session_start_adapter.sh
# Verifies session initialization: state file init, Standing Orders rendering,
# session metadata, session_start event. Tests fresh start and resume paths.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TMPDIR=$(mktemp -d)
# Copy project structure needed by the adapter
cp -r "$(cd "$SCRIPT_DIR/../.." && pwd)/admiral" "$TMPDIR/admiral"
cp -r "$(cd "$SCRIPT_DIR/../.." && pwd)/.hooks" "$TMPDIR/.hooks"
mkdir -p "$TMPDIR/.admiral"

source "$SCRIPT_DIR/test_helpers.sh"

# --- Fresh start ---
export CLAUDE_PROJECT_DIR="$TMPDIR"
PAYLOAD='{"session_id":"test-session-001","model":"claude-sonnet-4-20250514"}'
output=$(echo "$PAYLOAD" | bash "$TMPDIR/.hooks/session_start_adapter.sh" 2>/dev/null) || true

# State file should be created
assert_file_exists "fresh start: state file created" "$TMPDIR/.admiral/session_state.json"

# State should have session_id
source "$TMPDIR/admiral/lib/state.sh"
sid=$(get_state_field 'session_id')
assert_eq "fresh start: session_id set" "test-session-001" "$sid"

# Output should contain Standing Orders
assert_contains "fresh start: output has Standing Orders" "ADMIRAL STARTER PROFILE" "$output"
assert_contains "fresh start: output has enforcement hooks" "ACTIVE ENFORCEMENT HOOKS" "$output"

# Event log should have entries
assert_file_exists "fresh start: event_log.jsonl created" "$TMPDIR/.admiral/event_log.jsonl"

# Event log should have session_start event
if [ -f "$TMPDIR/.admiral/event_log.jsonl" ]; then
  has_session_start=$(grep -c 'session_start' "$TMPDIR/.admiral/event_log.jsonl" 2>/dev/null || echo "0")
  assert_eq "fresh start: session_start event logged" "1" "$((has_session_start > 0 ? 1 : 0))"
fi

# --- Second session (resume-like — state exists) ---
PAYLOAD2='{"session_id":"test-session-002","model":"claude-opus-4-20250514"}'
output2=$(echo "$PAYLOAD2" | bash "$TMPDIR/.hooks/session_start_adapter.sh" 2>/dev/null) || true

sid2=$(get_state_field 'session_id')
assert_eq "second session: session_id updated" "test-session-002" "$sid2"

# Cleanup
rm -rf "$TMPDIR"

report_results "session_start_adapter tests"
