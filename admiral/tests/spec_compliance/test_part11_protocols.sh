#!/bin/bash
# Spec Compliance: Part 11 — Universal Protocols
# Tests: Session state persistence, error signatures, context honesty,
#        A2A protocol constants, standing orders
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 11: Universal Protocols ---"

# Session state management library exists
assert_file_exists "state.sh exists" "$PROJECT_DIR/admiral/lib/state.sh"

# State library provides required functions
STATE_LIB=$(cat "$PROJECT_DIR/admiral/lib/state.sh")
assert_contains "state lib has init_session_state" "$STATE_LIB" "init_session_state"
assert_contains "state lib has load_state" "$STATE_LIB" "load_state"
assert_contains "state lib has save_state" "$STATE_LIB" "save_state"
assert_contains "state lib has estimate_tokens" "$STATE_LIB" "estimate_tokens"
assert_contains "state lib has compute_loop_sig" "$STATE_LIB" "compute_loop_sig"

# Error signature uses SHA-256 with 16-char truncation per spec
assert_contains "loop sig uses sha256sum" "$STATE_LIB" "sha256sum"
assert_contains "loop sig truncates to 16 chars" "$STATE_LIB" "cut -c1-16"

# Context honesty confidence constant
assert_eq "context confidence minimum is 80%" "80" "$RC_CONTEXT_CONFIDENCE_MIN_PCT"

# A2A protocol timeout
assert_eq "A2A request timeout is 300s (5 min)" "300" "$RC_A2A_REQUEST_TIMEOUT_SEC"

# Standing orders exist (all 15)
SO_DIR="$PROJECT_DIR/admiral/standing-orders"
SO_COUNT=$(ls "$SO_DIR"/*.json 2>/dev/null | wc -l)
assert_true "at least 15 standing orders exist" \
  "$([ "$SO_COUNT" -ge 15 ] && echo true || echo false)"

report_results "Part 11: Universal Protocols"
