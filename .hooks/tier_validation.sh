#!/bin/bash
# Admiral Framework — Tier Validation Hook (S-02)
# Validates model tier assignment against agent role requirements.
# Warns on mismatch, hard-blocks critical mismatches (e.g., security auditor on economy tier).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Source agent registry
source "$PROJECT_DIR/admiral/lib/agent_registry.sh"

# Read payload from stdin
PAYLOAD=$(cat)

# Extract fields
AGENT_ID=$(echo "$PAYLOAD" | jq -r '.agent_id // .agent_name // ""' | tr -d '\r')
ACTUAL_MODEL=$(echo "$PAYLOAD" | jq -r '.model // ""' | tr -d '\r')
SESSION_ID=$(echo "$PAYLOAD" | jq -r '.session_id // "unknown"' | tr -d '\r')

# If no agent_id, skip validation (single-agent session)
if [ -z "$AGENT_ID" ] || [ "$AGENT_ID" = "null" ]; then
  jq -n '{
    "validated": false,
    "reason": "no_agent_id",
    "advisory": "No agent identity — tier validation skipped.",
    "severity": "info"
  }'
  exit 0
fi

# Initialize registry
registry_init

# Look up agent
AGENT_DEF=$(registry_get_agent "$AGENT_ID")

if [ -z "$AGENT_DEF" ]; then
  jq -n --arg id "$AGENT_ID" '{
    "validated": false,
    "reason": "unregistered_agent",
    "agent_id": $id,
    "advisory": "Agent not in registry — tier validation skipped.",
    "severity": "info"
  }'
  exit 0
fi

EXPECTED_TIER=$(echo "$AGENT_DEF" | jq -r '.model_tier' | tr -d '\r')
ROLE=$(echo "$AGENT_DEF" | jq -r '.role' | tr -d '\r')

# If no model info in payload, advisory only
if [ -z "$ACTUAL_MODEL" ] || [ "$ACTUAL_MODEL" = "null" ]; then
  jq -n --arg id "$AGENT_ID" --arg tier "$EXPECTED_TIER" '{
    "validated": false,
    "reason": "no_model_info",
    "agent_id": $id,
    "expected_tier": $tier,
    "advisory": "No model information in session payload — cannot verify tier.",
    "severity": "info"
  }'
  exit 0
fi

# Map actual model names to tiers
# This maps known model identifiers to tier levels
model_to_tier() {
  local model="$1"
  case "$model" in
    *opus*|*o1*|*gpt-4o*)           echo "tier1_flagship" ;;
    *sonnet*|*gpt-4*|*claude-3.5*)  echo "tier2_workhorse" ;;
    *haiku*|*gpt-3.5*|*flash*)      echo "tier3_utility" ;;
    *mini*|*nano*|*lite*)            echo "tier4_economy" ;;
    *)                               echo "unknown" ;;
  esac
}

ACTUAL_TIER=$(model_to_tier "$ACTUAL_MODEL")

# Tier ordering for comparison (lower number = higher capability)
tier_rank() {
  case "$1" in
    tier1_flagship)  echo 1 ;;
    tier2_workhorse) echo 2 ;;
    tier3_utility)   echo 3 ;;
    tier4_economy)   echo 4 ;;
    *)               echo 5 ;;
  esac
}

EXPECTED_RANK=$(tier_rank "$EXPECTED_TIER")
ACTUAL_RANK=$(tier_rank "$ACTUAL_TIER")

# Check for critical mismatch — roles that REQUIRE high-tier models
# Security auditor and orchestrator on tier3+ is a hard-block
is_critical_role() {
  case "$1" in
    security|orchestrator) return 0 ;;
    *) return 1 ;;
  esac
}

if [ "$ACTUAL_TIER" = "unknown" ]; then
  # Can't determine tier from model name — advisory
  jq -n --arg id "$AGENT_ID" --arg model "$ACTUAL_MODEL" --arg expected "$EXPECTED_TIER" '{
    "validated": false,
    "reason": "unknown_model_tier",
    "agent_id": $id,
    "model": $model,
    "expected_tier": $expected,
    "advisory": "Cannot map model to tier. Manual verification recommended.",
    "severity": "warning"
  }'
  exit 0
elif [ "$ACTUAL_RANK" -gt "$EXPECTED_RANK" ]; then
  # Downgraded — actual tier is lower capability than expected
  if is_critical_role "$ROLE" && [ "$ACTUAL_RANK" -ge 3 ]; then
    # Critical mismatch: security/orchestrator on utility/economy tier — hard-block
    jq -n --arg id "$AGENT_ID" \
          --arg role "$ROLE" \
          --arg expected "$EXPECTED_TIER" \
          --arg actual "$ACTUAL_TIER" \
          --arg model "$ACTUAL_MODEL" '{
      "validated": false,
      "blocked": true,
      "reason": "critical_tier_mismatch",
      "agent_id": $id,
      "role": $role,
      "expected_tier": $expected,
      "actual_tier": $actual,
      "model": $model,
      "advisory": "BLOCKED: Critical role on insufficient tier. Security and orchestration require tier1 or tier2.",
      "severity": "error"
    }'
    exit 2
  else
    # Non-critical downgrade — warn but allow
    jq -n --arg id "$AGENT_ID" \
          --arg role "$ROLE" \
          --arg expected "$EXPECTED_TIER" \
          --arg actual "$ACTUAL_TIER" \
          --arg model "$ACTUAL_MODEL" '{
      "validated": true,
      "downgraded": true,
      "agent_id": $id,
      "role": $role,
      "expected_tier": $expected,
      "actual_tier": $actual,
      "model": $model,
      "advisory": "Agent running on lower tier than specified. Capabilities may be reduced.",
      "severity": "warning"
    }'
    exit 0
  fi
elif [ "$ACTUAL_RANK" -lt "$EXPECTED_RANK" ]; then
  # Upgraded — actual tier is higher than expected (fine, just note it)
  jq -n --arg id "$AGENT_ID" \
        --arg expected "$EXPECTED_TIER" \
        --arg actual "$ACTUAL_TIER" \
        --arg model "$ACTUAL_MODEL" '{
    "validated": true,
    "upgraded": true,
    "agent_id": $id,
    "expected_tier": $expected,
    "actual_tier": $actual,
    "model": $model,
    "severity": "info"
  }'
  exit 0
else
  # Exact match
  jq -n --arg id "$AGENT_ID" \
        --arg tier "$EXPECTED_TIER" \
        --arg model "$ACTUAL_MODEL" '{
    "validated": true,
    "agent_id": $id,
    "tier": $tier,
    "model": $model,
    "severity": "info"
  }'
  exit 0
fi
