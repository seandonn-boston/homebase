#!/bin/bash
# Spec Compliance: Part 6 — Execution Patterns
# Tests: Chunk budget ceiling, decomposition constants, pre-work validator
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 6: Execution Patterns ---"

# Chunk budget ceiling matches spec (40%)
assert_eq "chunk budget ceiling is 40%" "40" "$RC_CHUNK_BUDGET_CEILING_PCT"

# Quality degradation onset matches spec (60%)
assert_eq "quality degradation onset is 60%" "60" "$RC_QUALITY_DEGRADATION_ONSET_PCT"

# Over-decomposition threshold matches spec (20%)
assert_eq "over-decomposition threshold is 20%" "20" "$RC_OVER_DECOMPOSITION_THRESHOLD_PCT"

# Over-decomposition triggers
assert_eq "re-decompose trigger is 2 consecutive" "2" "$RC_OVER_DECOMP_CONSECUTIVE_TRIGGER"
assert_eq "session-level pattern is 3+ chunks" "3" "$RC_OVER_DECOMP_SESSION_TRIGGER"

# Pre-work validator exists (SO-15)
assert_file_exists "pre_work_validator exists" "$PROJECT_DIR/.hooks/pre_work_validator.sh"

# Swarm pattern constants match spec
assert_eq "swarm heartbeat timeout is 60s" "60" "$RC_SWARM_HEARTBEAT_TIMEOUT_SEC"
assert_eq "swarm error rate threshold is 30%" "30" "$RC_SWARM_ERROR_RATE_THRESHOLD_PCT"

# Execution runtime (not yet implemented)
skip_test "parallelism runtime" "Not started — spec Part 6 execution patterns not implemented"
skip_test "handoff protocol" "Not started"

report_results "Part 6: Execution Patterns"
