#!/bin/bash
# Spec Compliance: Part 10 — Meta-Agent Governance (Admiral)
# Tests: Trust promotion constants, fallback decomposer mode
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 10: Meta-Agent Governance ---"

# Admiral trust promotion constants
assert_eq "trust consecutive success threshold is 5" "5" "$RC_TRUST_CONSECUTIVE_SUCCESS"

# Fallback decomposer mode constants
assert_eq "orch failure detection is 3 missed heartbeats" "3" "$RC_ORCH_FAILURE_MISSED_HEARTBEATS"
assert_eq "orch failure window is 30s" "30" "$RC_ORCH_FAILURE_WINDOW_SEC"
assert_eq "fallback duration limit is 300s (5 min)" "300" "$RC_FALLBACK_DURATION_LIMIT_SEC"
assert_eq "fallback exit requires 3 stable intervals" "3" "$RC_FALLBACK_EXIT_STABLE_INTERVALS"
assert_eq "fallback stable interval is 30s" "30" "$RC_FALLBACK_STABLE_INTERVAL_SEC"

# Governance heartbeat monitor constants
assert_eq "heartbeat interval is 60s" "60" "$RC_HEARTBEAT_INTERVAL_SEC"
assert_eq "missed heartbeat threshold is 2" "2" "$RC_HEARTBEAT_MISSED_THRESHOLD"

# Meta-agent governance runtime (not yet implemented)
skip_test "agent-governing-agents infrastructure" "Not started"

report_results "Part 10: Meta-Agent Governance"
