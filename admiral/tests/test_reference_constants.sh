#!/bin/bash
# Admiral Framework — Reference Constants Registry Test
# Validates that reference_constants.sh loads correctly and all constants
# match their spec-defined values from reference-constants.md.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Source the constants registry
# shellcheck disable=SC1091
source "$PROJECT_DIR/admiral/config/reference_constants.sh"

PASS=0
FAIL=0
ERRORS=""

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    PASS=$((PASS + 1))
    echo "  PASS: $test_name"
  else
    FAIL=$((FAIL + 1))
    ERRORS+="  FAIL: $test_name (expected '$expected', got '$actual')\n"
    echo "  FAIL: $test_name (expected '$expected', got '$actual')"
  fi
}

echo "=== Reference Constants Registry Tests ==="
echo ""

# --- Tool Token Estimates ---
echo "--- Tool Token Estimates ---"
assert_eq "Bash token estimate" "500" "$RC_TOKEN_BASH"
assert_eq "Read token estimate" "1000" "$RC_TOKEN_READ"
assert_eq "Write token estimate" "800" "$RC_TOKEN_WRITE"
assert_eq "Edit token estimate" "600" "$RC_TOKEN_EDIT"
assert_eq "Glob token estimate" "300" "$RC_TOKEN_GLOB"
assert_eq "Grep token estimate" "500" "$RC_TOKEN_GREP"
assert_eq "WebFetch token estimate" "2000" "$RC_TOKEN_WEBFETCH"
assert_eq "WebSearch token estimate" "1500" "$RC_TOKEN_WEBSEARCH"
assert_eq "Agent token estimate" "5000" "$RC_TOKEN_AGENT"
assert_eq "NotebookEdit token estimate" "800" "$RC_TOKEN_NOTEBOOKEDIT"
assert_eq "Default token estimate" "500" "$RC_TOKEN_DEFAULT"

# --- Token Budget Thresholds ---
echo "--- Token Budget Thresholds ---"
assert_eq "Budget warning at 80%" "80" "$RC_BUDGET_WARNING_PCT"
assert_eq "Budget escalation at 90%" "90" "$RC_BUDGET_ESCALATION_PCT"

# --- Loop Detection ---
echo "--- Loop Detection ---"
assert_eq "Max same error" "3" "$RC_MAX_SAME_ERROR"
assert_eq "Max total errors" "10" "$RC_MAX_TOTAL_ERRORS"
assert_eq "Success decay" "1" "$RC_SUCCESS_DECAY"

# --- Self-Healing ---
echo "--- Self-Healing ---"
assert_eq "Max retries" "3" "$RC_SELF_HEAL_MAX_RETRIES"
assert_eq "Max session retries" "10" "$RC_SELF_HEAL_MAX_SESSION_RETRIES"
assert_eq "Retry min" "1" "$RC_SELF_HEAL_RETRY_MIN"
assert_eq "Retry max" "5" "$RC_SELF_HEAL_RETRY_MAX"

# --- Exit Codes ---
echo "--- Exit Codes ---"
assert_eq "Exit pass" "0" "$RC_EXIT_PASS"
assert_eq "Exit fail" "1" "$RC_EXIT_FAIL"
assert_eq "Exit block" "2" "$RC_EXIT_BLOCK"

# --- Hook Timeouts ---
echo "--- Hook Timeouts ---"
assert_eq "Default timeout" "30000" "$RC_HOOK_TIMEOUT_DEFAULT"
assert_eq "Budget hook timeout" "5000" "$RC_HOOK_TIMEOUT_BUDGET"
assert_eq "Loop hook timeout" "5000" "$RC_HOOK_TIMEOUT_LOOP"
assert_eq "Context baseline timeout" "10000" "$RC_HOOK_TIMEOUT_CONTEXT_BASELINE"
assert_eq "Context health timeout" "10000" "$RC_HOOK_TIMEOUT_CONTEXT_HEALTH"
assert_eq "Identity timeout" "10000" "$RC_HOOK_TIMEOUT_IDENTITY"
assert_eq "Heartbeat timeout" "10000" "$RC_HOOK_TIMEOUT_HEARTBEAT"
assert_eq "Timeout min" "100" "$RC_HOOK_TIMEOUT_MIN"
assert_eq "Timeout max" "300000" "$RC_HOOK_TIMEOUT_MAX"

# --- Context Health Check ---
echo "--- Context Health Check ---"
assert_eq "Health check frequency" "10" "$RC_HEALTH_CHECK_FREQUENCY"

# --- Context Window Ceilings ---
echo "--- Context Window Ceilings ---"
assert_eq "Standing context ceiling" "50000" "$RC_STANDING_CONTEXT_CEILING"
assert_eq "Standing context warning" "45000" "$RC_STANDING_CONTEXT_WARNING"
assert_eq "Context stuffing threshold" "60" "$RC_CONTEXT_STUFFING_THRESHOLD_PCT"

# --- Fleet Constants ---
echo "--- Fleet Constants ---"
assert_eq "Fleet min agents" "1" "$RC_FLEET_MIN_AGENTS"
assert_eq "Fleet max agents" "12" "$RC_FLEET_MAX_AGENTS"
assert_eq "Chunk budget ceiling" "40" "$RC_CHUNK_BUDGET_CEILING_PCT"
assert_eq "Standing context max lines" "150" "$RC_STANDING_CONTEXT_MAX_LINES"

# --- Governance Heartbeat ---
echo "--- Governance Heartbeat ---"
assert_eq "Heartbeat interval" "60" "$RC_HEARTBEAT_INTERVAL_SEC"
assert_eq "Missed heartbeat threshold" "2" "$RC_HEARTBEAT_MISSED_THRESHOLD"

# --- Brain Query Defaults ---
echo "--- Brain Query Defaults ---"
assert_eq "Brain default result limit" "10" "$RC_BRAIN_DEFAULT_RESULT_LIMIT"
assert_eq "Brain max result limit" "50" "$RC_BRAIN_MAX_RESULT_LIMIT"
assert_eq "Brain cosine min score" "0.7" "$RC_BRAIN_COSINE_MIN_SCORE"

# --- Brain Token Lifecycle ---
echo "--- Brain Token Lifecycle ---"
assert_eq "Brain token lifetime" "3600" "$RC_BRAIN_TOKEN_LIFETIME_SEC"
assert_eq "Brain token max lifetime" "14400" "$RC_BRAIN_TOKEN_MAX_LIFETIME_SEC"

# --- Admiral Fallback ---
echo "--- Admiral Fallback ---"
assert_eq "Orch failure missed heartbeats" "3" "$RC_ORCH_FAILURE_MISSED_HEARTBEATS"
assert_eq "Fallback duration limit" "300" "$RC_FALLBACK_DURATION_LIMIT_SEC"
assert_eq "Fallback exit stable intervals" "3" "$RC_FALLBACK_EXIT_STABLE_INTERVALS"

# --- Cross-check: config.json token estimates match registry ---
echo "--- Config.json Cross-Check ---"
CONFIG_FILE="$PROJECT_DIR/admiral/config.json"
if [ -f "$CONFIG_FILE" ]; then
  CFG_BASH=$(jq -r '.tokenEstimates.Bash' "$CONFIG_FILE")
  CFG_READ=$(jq -r '.tokenEstimates.Read' "$CONFIG_FILE")
  CFG_AGENT=$(jq -r '.tokenEstimates.Agent' "$CONFIG_FILE")
  CFG_DEFAULT=$(jq -r '.tokenEstimates.default' "$CONFIG_FILE")
  CFG_MAX_SAME=$(jq -r '.hooks.maxSameError' "$CONFIG_FILE")
  CFG_MAX_TOTAL=$(jq -r '.hooks.maxTotalErrors' "$CONFIG_FILE")
  CFG_DECAY=$(jq -r '.hooks.successDecay' "$CONFIG_FILE")

  assert_eq "config.json Bash matches registry" "$RC_TOKEN_BASH" "$CFG_BASH"
  assert_eq "config.json Read matches registry" "$RC_TOKEN_READ" "$CFG_READ"
  assert_eq "config.json Agent matches registry" "$RC_TOKEN_AGENT" "$CFG_AGENT"
  assert_eq "config.json default matches registry" "$RC_TOKEN_DEFAULT" "$CFG_DEFAULT"
  assert_eq "config.json maxSameError matches registry" "$RC_MAX_SAME_ERROR" "$CFG_MAX_SAME"
  assert_eq "config.json maxTotalErrors matches registry" "$RC_MAX_TOTAL_ERRORS" "$CFG_MAX_TOTAL"
  assert_eq "config.json successDecay matches registry" "$RC_SUCCESS_DECAY" "$CFG_DECAY"
else
  echo "  SKIP: config.json not found"
fi

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "Failures:"
  echo -e "$ERRORS"
  exit 1
fi
exit 0
