#!/bin/bash
# Admiral Framework — EDD Confirmation Protocol Tests (EDD-05)
# Tests for admiral/lib/edd_confirm.sh visual confirmation functions.
# Exit code: 0 = all pass, 1 = failures
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# shellcheck source=/dev/null
source "$SCRIPT_DIR/../lib/assert.sh"

# Use temp dir for test confirmations
TEST_DIR=$(mktemp -d)
trap 'rm -rf "$TEST_DIR"' EXIT
export CONFIRMATIONS_DIR="$TEST_DIR/confirmations"

# shellcheck source=/dev/null
source "$PROJECT_DIR/admiral/lib/edd_confirm.sh"

# Override after sourcing
CONFIRMATIONS_DIR="$TEST_DIR/confirmations"

echo "=== EDD Confirmation Protocol Tests (EDD-05) ==="
echo ""

# ─── edd_confirm ─────────────────────────────────────────────────────

echo "--- edd_confirm ---"

CONFIRM_PATH=$(edd_confirm "Q-01" "looks right" "human-reviewer" "confirmed" "/tmp/screenshot.png")
assert_eq "confirm creates file" "true" "$([ -f "$CONFIRM_PATH" ] && echo true || echo false)"

TASK_ID=$(jq -r '.task_id' "$CONFIRM_PATH")
assert_eq "confirm has task_id" "Q-01" "$TASK_ID"

VERDICT=$(jq -r '.verdict' "$CONFIRM_PATH")
assert_eq "confirm has verdict" "confirmed" "$VERDICT"

REVIEWER=$(jq -r '.reviewer' "$CONFIRM_PATH")
assert_eq "confirm has reviewer" "human-reviewer" "$REVIEWER"

REVIEWER_TYPE=$(jq -r '.reviewer_type' "$CONFIRM_PATH")
assert_eq "human reviewer type" "human" "$REVIEWER_TYPE"

EVIDENCE=$(jq -r '.evidence_path' "$CONFIRM_PATH")
assert_eq "confirm has evidence path" "/tmp/screenshot.png" "$EVIDENCE"

# Agent reviewer
AGENT_PATH=$(edd_confirm "Q-02" "output valid" "claude-code" "confirmed")
AGENT_TYPE=$(jq -r '.reviewer_type' "$AGENT_PATH")
assert_eq "agent reviewer type" "agent" "$AGENT_TYPE"

# Rejection
REJ_PATH=$(edd_confirm "Q-03" "formatting" "human" "rejected")
REJ_VERDICT=$(jq -r '.verdict' "$REJ_PATH")
assert_eq "rejection verdict" "rejected" "$REJ_VERDICT"

# ─── edd_is_confirmed ───────────────────────────────────────────────

echo ""
echo "--- edd_is_confirmed ---"

rc=0; edd_is_confirmed "Q-01" "looks right" || rc=$?
assert_exit_code "confirmed check returns 0" 0 "$rc"

rc=0; edd_is_confirmed "Q-03" "formatting" || rc=$?
assert_exit_code "rejected check returns 1" 1 "$rc"

rc=0; edd_is_confirmed "NONEXISTENT-99" "anything" || rc=$?
assert_exit_code "missing check returns 1" 1 "$rc"

# ─── edd_get_confirmations ──────────────────────────────────────────

echo ""
echo "--- edd_get_confirmations ---"

CONFIRMS=$(edd_get_confirmations "Q-01")
CONFIRM_COUNT=$(printf '%s' "$CONFIRMS" | jq 'length')
assert_eq "get_confirmations count" "1" "$CONFIRM_COUNT"

EMPTY=$(edd_get_confirmations "NONEXISTENT-99")
EMPTY_COUNT=$(printf '%s' "$EMPTY" | jq 'length')
assert_eq "get_confirmations empty" "0" "$EMPTY_COUNT"

# ─── edd_capture_evidence ───────────────────────────────────────────

echo ""
echo "--- edd_capture_evidence ---"

EV_PATH=$(edd_capture_evidence "T-01" "output check" "echo 'test output'")
assert_eq "evidence file exists" "true" "$([ -f "$EV_PATH" ] && echo true || echo false)"

EV_CONTENT=$(cat "$EV_PATH")
assert_eq "evidence contains output" "test output" "$EV_CONTENT"

# ─── Summary ─────────────────────────────────────────────────────────

print_results "EDD Confirmation Protocol Tests"
