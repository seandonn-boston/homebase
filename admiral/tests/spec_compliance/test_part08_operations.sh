#!/bin/bash
# Spec Compliance: Part 8 — Operations
# Tests: Orchestrator overhead thresholds, budget burn rate brackets,
#        tactical/strategic classification, escalation rate constants
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 8: Operations ---"

# Orchestrator overhead graduated response
assert_eq "orch overhead normal is 20%" "20" "$RC_EFFICIENCY_ORCH_OVERHEAD_NORMAL_PCT"
assert_eq "orch overhead monitor is 25%" "25" "$RC_ORCH_OVERHEAD_MONITOR_PCT"
assert_eq "orch overhead caution is 35%" "35" "$RC_ORCH_OVERHEAD_CAUTION_PCT"
assert_eq "orch overhead alert is 50%" "50" "$RC_ORCH_OVERHEAD_ALERT_PCT"

# Cost & efficiency thresholds
assert_eq "idle time healthy is 15%" "15" "$RC_EFFICIENCY_IDLE_HEALTHY_PCT"
assert_eq "idle time critical is 25%" "25" "$RC_EFFICIENCY_IDLE_CRITICAL_PCT"

# Tactical vs strategic classification thresholds
assert_eq "scope expansion strategic is 15%" "15" "$RC_SCOPE_EXPANSION_STRATEGIC_PCT"
assert_eq "scope reduction strategic is 10%" "10" "$RC_SCOPE_REDUCTION_STRATEGIC_PCT"
assert_eq "deadline shift strategic is 7 days" "7" "$RC_DEADLINE_SHIFT_STRATEGIC_DAYS"

# Escalation rate constants
assert_eq "escalation decline min is 5%" "5" "$RC_ESCALATION_DECLINE_MIN_PCT"
assert_eq "escalation decline max is 10%" "10" "$RC_ESCALATION_DECLINE_MAX_PCT"
assert_eq "escalation plateau sessions is 3" "3" "$RC_ESCALATION_PLATEAU_SESSIONS"

# Control plane server exists
assert_file_exists "control plane server exists" "$PROJECT_DIR/control-plane/src/server.ts"

# Session summary tool exists
assert_file_exists "session_summary exists" "$PROJECT_DIR/admiral/bin/session_summary"

report_results "Part 8: Operations"
