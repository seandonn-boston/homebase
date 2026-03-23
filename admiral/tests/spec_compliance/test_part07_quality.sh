#!/bin/bash
# Spec Compliance: Part 7 — Quality Assurance
# Tests: Quality metric thresholds, runaway detector, sycophantic drift constants
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 7: Quality Assurance ---"

# Quality metric thresholds match spec
assert_eq "first-pass quality healthy is 75%" "75" "$RC_QUALITY_FIRST_PASS_HEALTHY_PCT"
assert_eq "first-pass quality critical is 50%" "50" "$RC_QUALITY_FIRST_PASS_CRITICAL_PCT"
assert_eq "rework ratio healthy is 10%" "10" "$RC_QUALITY_REWORK_HEALTHY_PCT"
assert_eq "rework ratio critical is 20%" "20" "$RC_QUALITY_REWORK_CRITICAL_PCT"
assert_eq "self-heal rate healthy is 80%" "80" "$RC_QUALITY_SELF_HEAL_HEALTHY_PCT"
assert_eq "self-heal rate critical is 50%" "50" "$RC_QUALITY_SELF_HEAL_CRITICAL_PCT"
assert_eq "assumption accuracy healthy is 85%" "85" "$RC_QUALITY_ASSUMPTION_HEALTHY_PCT"
assert_eq "assumption accuracy critical is 70%" "70" "$RC_QUALITY_ASSUMPTION_CRITICAL_PCT"
assert_eq "handoff rejection healthy is 5%" "5" "$RC_QUALITY_HANDOFF_HEALTHY_PCT"
assert_eq "handoff rejection critical is 15%" "15" "$RC_QUALITY_HANDOFF_CRITICAL_PCT"

# Sycophantic drift detection constants
assert_eq "finding decline trigger is 30%" "30" "$RC_DRIFT_FINDING_DECLINE_PCT"

# QA confidence levels
assert_eq "verified requires 2 test cases" "2" "$RC_QA_VERIFIED_TEST_CASES"
assert_eq "assessed requires 50% review" "50" "$RC_QA_ASSESSED_REVIEW_PCT"
assert_eq "assumed requires 10% spot check" "10" "$RC_QA_ASSUMED_SPOT_CHECK_PCT"

# Runaway detector exists in control plane
assert_file_exists "runaway detector exists" "$PROJECT_DIR/control-plane/src/runaway-detector.ts"

report_results "Part 7: Quality Assurance"
