#!/bin/bash
# Admiral Framework — Tier Validation Hook (SessionStart)
# Enforces SO-01 + model-tiers.md: Validate model tier assignment against agent role requirements.
# Warns on mismatch, hard-blocks critical mismatches (safety-tier agents on economy models).
#
# DESIGN: Hard-block critical mismatches (exit 2). Advisory on soft mismatches.
# INPUT: JSON on stdin with model field from Claude Code SessionStart payload
# OUTPUT: JSON with hookSpecificOutput (allow/deny) and additionalContext
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Read payload from stdin
PAYLOAD=$(cat)

# Extract model from payload
MODEL=$(echo "$PAYLOAD" | jq -r '.model // "unknown"')
AGENT_ID="${ADMIRAL_AGENT_ID:-claude-code}"
AGENT_ROLE="${ADMIRAL_AGENT_ROLE:-generalist}"

# Tier configuration file
TIER_CONFIG="${PROJECT_DIR}/admiral/config/model_tiers.json"

# If no tier config exists, allow with advisory
if [ ! -f "$TIER_CONFIG" ]; then
  jq -n --arg ctx "TIER (SO-01): No model tier config at admiral/config/model_tiers.json. Tier validation skipped." '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
  exit 0
fi

# Validate config is parseable
if ! jq empty "$TIER_CONFIG" 2>/dev/null; then
  jq -n --arg ctx "TIER (SO-01): Model tier config is not valid JSON. Tier validation skipped." '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
  exit 0
fi

# Determine current model's tier from model name patterns
# Maps model identifiers to tier numbers
determine_tier() {
  local model="$1"
  case "$model" in
    *opus*|*o1*|*o3*)           echo 1 ;;
    *sonnet*|*gpt-4*|*claude-3.5*|*claude-4*) echo 2 ;;
    *haiku*|*gpt-3.5*|*claude-3-haiku*) echo 3 ;;
    *flash*|*mini*|*nano*)      echo 4 ;;
    *)                          echo 2 ;; # Default to workhorse
  esac
}

CURRENT_TIER=$(determine_tier "$MODEL")

# Look up required tier for this agent's role
REQUIRED_TIER=$(jq -r --arg role "$AGENT_ROLE" '.role_tiers[$role] // .role_tiers.default // 2' "$TIER_CONFIG" 2>/dev/null) || REQUIRED_TIER=2

# Check if role is safety-critical (requires minimum tier enforcement)
IS_SAFETY_CRITICAL=$(jq -r --arg role "$AGENT_ROLE" '.safety_critical_roles // [] | index($role) != null' "$TIER_CONFIG" 2>/dev/null) || IS_SAFETY_CRITICAL="false"

# Evaluate tier match
if [ "$CURRENT_TIER" -le "$REQUIRED_TIER" ]; then
  # Tier meets or exceeds requirement — allow
  jq -n --arg ctx "TIER (SO-01): Model '${MODEL}' (tier ${CURRENT_TIER}) meets requirement (tier ${REQUIRED_TIER}) for role '${AGENT_ROLE}'." '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
  exit 0
fi

# Tier is below requirement
TIER_GAP=$((CURRENT_TIER - REQUIRED_TIER))

if [ "$IS_SAFETY_CRITICAL" = "true" ] && [ "$TIER_GAP" -ge 2 ]; then
  # Safety-critical role with large tier gap — hard-block
  BLOCK_MSG="TIER BLOCKED (SO-01): Model '${MODEL}' (tier ${CURRENT_TIER}) is critically below requirement (tier ${REQUIRED_TIER}) for safety-critical role '${AGENT_ROLE}'. A tier gap of ${TIER_GAP} on a safety-critical agent is not acceptable. Use a tier ${REQUIRED_TIER} or better model."
  jq -n --arg ctx "$BLOCK_MSG" '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "permissionDecision": "deny",
      "additionalContext": $ctx
    }
  }'
  exit 2
fi

# Soft mismatch — warn but allow
WARN_MSG="TIER WARNING (SO-01): Model '${MODEL}' (tier ${CURRENT_TIER}) is below recommended tier ${REQUIRED_TIER} for role '${AGENT_ROLE}'. Output quality may be degraded. Consider upgrading to a tier ${REQUIRED_TIER} model."
jq -n --arg ctx "$WARN_MSG" '{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "permissionDecision": "allow",
    "additionalContext": $ctx
  }
}'
exit 0
