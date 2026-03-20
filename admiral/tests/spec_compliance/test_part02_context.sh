#!/bin/bash
# Spec Compliance: Part 2 — Context
# Tests: Standing Orders injection, context budget validation, context health check,
#        critical context sections, standing context ceiling
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
source "$SCRIPT_DIR/test_helpers.sh"
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

echo "--- Part 2: Context ---"

# Standing Orders are loaded at SessionStart
assert_file_exists "session_start_adapter exists" "$PROJECT_DIR/.hooks/session_start_adapter.sh"
assert_file_exists "standing_orders lib exists" "$PROJECT_DIR/admiral/lib/standing_orders.sh"

# Standing Orders directory has content
SO_COUNT=$(ls "$PROJECT_DIR/admiral/standing-orders/"*.json 2>/dev/null | wc -l)
assert_true "standing orders directory has files" \
  "$([ "$SO_COUNT" -gt 0 ] && echo true || echo false)"

# Context health check validates three critical sections per spec
HEALTH_CHECK="$PROJECT_DIR/.hooks/context_health_check.sh"
assert_file_exists "context_health_check exists" "$HEALTH_CHECK"
HEALTH_CONTENT=$(cat "$HEALTH_CHECK")
assert_contains "health check validates Identity" "$HEALTH_CONTENT" "Identity"
assert_contains "health check validates Authority" "$HEALTH_CONTENT" "Authority"
assert_contains "health check validates Constraints" "$HEALTH_CONTENT" "Constraints"

# Context health check fires every N tool calls (spec: 10)
POST_ADAPTER=$(cat "$PROJECT_DIR/.hooks/post_tool_use_adapter.sh")
assert_contains "health check frequency uses modulo" "$POST_ADAPTER" "% 10"

# Context budget allocation must sum to 100% per spec
BUDGET_SUM=$((RC_CONTEXT_STANDING_MIN_PCT + RC_CONTEXT_SESSION_MIN_PCT + RC_CONTEXT_WORKING_MIN_PCT))
# Min allocations should be <= 100 (15+50+20=85)
assert_true "min budget allocations <= 100" \
  "$([ "$BUDGET_SUM" -le 100 ] && echo true || echo false)"
MAX_SUM=$((RC_CONTEXT_STANDING_MAX_PCT + RC_CONTEXT_SESSION_MAX_PCT + RC_CONTEXT_WORKING_MAX_PCT))
# Max allocations should be >= 100 (25+65+30=120)
assert_true "max budget allocations >= 100" \
  "$([ "$MAX_SUM" -ge 100 ] && echo true || echo false)"

# Standing context ceiling constant matches spec (50K tokens)
assert_eq "standing context ceiling is 50000" "50000" "$RC_STANDING_CONTEXT_CEILING"
assert_eq "standing context warning is 45000" "45000" "$RC_STANDING_CONTEXT_WARNING"

report_results "Part 2: Context"
