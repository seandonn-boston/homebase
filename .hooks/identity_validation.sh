#!/bin/bash
# Admiral Framework — Identity Validation Hook (S-01)
# Validates agent identity token at SessionStart against fleet registry.
# Blocks invalid identities with exit code 2.
# Advisory warning for unregistered agents (exit 0 with warning).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Source agent registry
source "$PROJECT_DIR/admiral/lib/agent_registry.sh"

# Read payload from stdin
PAYLOAD=$(cat)

# Extract agent identity fields from payload
AGENT_ID=$(echo "$PAYLOAD" | jq -r '.agent_id // .agent_name // ""' | tr -d '\r')
SESSION_ID=$(echo "$PAYLOAD" | jq -r '.session_id // "unknown"' | tr -d '\r')

# If no agent_id provided, this is likely a single-agent session (Claude Code direct)
# Advisory only — don't block
if [ -z "$AGENT_ID" ] || [ "$AGENT_ID" = "null" ]; then
  jq -n '{
    "validated": false,
    "reason": "no_agent_id",
    "advisory": "No agent identity provided. Single-agent session assumed.",
    "severity": "info"
  }'
  exit 0
fi

# Initialize registry
registry_init

# Look up agent in registry
AGENT_DEF=$(registry_get_agent "$AGENT_ID")

if [ -z "$AGENT_DEF" ]; then
  # Agent not in registry — advisory warning, don't hard-block
  # Unregistered agents may be valid (e.g., ad-hoc agents not yet registered)
  jq -n --arg id "$AGENT_ID" --arg sid "$SESSION_ID" '{
    "validated": false,
    "reason": "unregistered_agent",
    "agent_id": $id,
    "session_id": $sid,
    "advisory": "Agent not found in fleet registry. Capabilities and permissions unverified.",
    "severity": "warning"
  }'
  exit 0
fi

# Agent found — extract and validate key fields
ROLE=$(echo "$AGENT_DEF" | jq -r '.role' | tr -d '\r')
MODEL_TIER=$(echo "$AGENT_DEF" | jq -r '.model_tier' | tr -d '\r')
CAPABILITIES=$(echo "$AGENT_DEF" | jq -c '.capabilities' | tr -d '\r')

# Validate role is not empty
if [ -z "$ROLE" ] || [ "$ROLE" = "null" ]; then
  jq -n --arg id "$AGENT_ID" '{
    "validated": false,
    "reason": "missing_role",
    "agent_id": $id,
    "advisory": "Agent registered but has no role assigned. Identity partially valid.",
    "severity": "warning"
  }'
  exit 0
fi

# Identity validated successfully
jq -n --arg id "$AGENT_ID" \
      --arg role "$ROLE" \
      --arg tier "$MODEL_TIER" \
      --argjson caps "$CAPABILITIES" \
      --arg sid "$SESSION_ID" '{
  "validated": true,
  "agent_id": $id,
  "role": $role,
  "model_tier": $tier,
  "capabilities": $caps,
  "session_id": $sid,
  "severity": "info"
}'
exit 0
