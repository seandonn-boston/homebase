#!/bin/bash
# Admiral Framework — Identity Validation Hook (SessionStart)
# Enforces SO-01: Identity Discipline
# Validates agent identity token at SessionStart against fleet registry.
# Blocks invalid identities with exit code 2.
#
# DESIGN: Hard-block on invalid identity (exit 2). Advisory on missing registry.
# INPUT: JSON on stdin with session_id, model, agent_identity fields
# OUTPUT: JSON with hookSpecificOutput (allow/deny) and additionalContext
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Read payload from stdin
PAYLOAD=$(cat)

# Extract agent identity fields (may come from env vars or payload)
AGENT_ID="${ADMIRAL_AGENT_ID:-$(echo "$PAYLOAD" | jq -r '.agent_identity.agent_id // "claude-code"')}"
AGENT_NAME="${ADMIRAL_AGENT_NAME:-$(echo "$PAYLOAD" | jq -r '.agent_identity.agent_name // "Claude Code Agent"')}"
AGENT_ROLE="${ADMIRAL_AGENT_ROLE:-$(echo "$PAYLOAD" | jq -r '.agent_identity.role // "generalist"')}"

# Fleet registry location
REGISTRY_FILE="${PROJECT_DIR}/admiral/config/fleet_registry.json"

# If no registry exists, allow with advisory (fleet registry may not be configured yet)
if [ ! -f "$REGISTRY_FILE" ]; then
  jq -n --arg ctx "IDENTITY (SO-01): No fleet registry found at admiral/config/fleet_registry.json. Agent identity validation skipped. Configure fleet registry for full enforcement." '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
  exit 0
fi

# Validate registry is parseable JSON
if ! jq empty "$REGISTRY_FILE" 2>/dev/null; then
  jq -n --arg ctx "IDENTITY (SO-01): Fleet registry is not valid JSON. Identity validation skipped." '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
  exit 0
fi

# Look up agent in registry
AGENT_ENTRY=$(jq --arg id "$AGENT_ID" '.agents[] | select(.id == $id)' "$REGISTRY_FILE" 2>/dev/null) || AGENT_ENTRY=""

if [ -z "$AGENT_ENTRY" ] || [ "$AGENT_ENTRY" = "null" ]; then
  # Agent not found in registry — hard-block
  BLOCK_MSG="IDENTITY BLOCKED (SO-01): Agent '${AGENT_ID}' (role: ${AGENT_ROLE}) is not registered in fleet registry. Register the agent in admiral/config/fleet_registry.json or use a valid agent ID."
  jq -n --arg ctx "$BLOCK_MSG" '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "permissionDecision": "deny",
      "additionalContext": $ctx
    }
  }'
  exit 2
fi

# Validate role matches registry entry
REGISTERED_ROLE=$(echo "$AGENT_ENTRY" | jq -r '.role // ""')
if [ -n "$REGISTERED_ROLE" ] && [ "$REGISTERED_ROLE" != "$AGENT_ROLE" ]; then
  BLOCK_MSG="IDENTITY MISMATCH (SO-01): Agent '${AGENT_ID}' claims role '${AGENT_ROLE}' but registry has role '${REGISTERED_ROLE}'. Role drift detected — this may indicate misconfiguration or identity spoofing."
  jq -n --arg ctx "$BLOCK_MSG" '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "permissionDecision": "deny",
      "additionalContext": $ctx
    }
  }'
  exit 2
fi

# Validate agent is not disabled
AGENT_STATUS=$(echo "$AGENT_ENTRY" | jq -r '.status // "active"')
if [ "$AGENT_STATUS" = "disabled" ] || [ "$AGENT_STATUS" = "suspended" ]; then
  BLOCK_MSG="IDENTITY BLOCKED (SO-01): Agent '${AGENT_ID}' is ${AGENT_STATUS} in fleet registry. Contact Admiral to reactivate."
  jq -n --arg ctx "$BLOCK_MSG" '{
    "hookSpecificOutput": {
      "hookEventName": "SessionStart",
      "permissionDecision": "deny",
      "additionalContext": $ctx
    }
  }'
  exit 2
fi

# Identity validated — allow with confirmation
jq -n --arg id "$AGENT_ID" --arg role "$REGISTERED_ROLE" --arg status "$AGENT_STATUS" \
  --arg ctx "IDENTITY (SO-01): Agent '${AGENT_ID}' validated. Role: ${REGISTERED_ROLE}. Status: ${AGENT_STATUS}." '{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "permissionDecision": "allow",
    "additionalContext": $ctx
  },
  "agent_identity": {
    "agent_id": $id,
    "role": $role,
    "status": $status,
    "validated": true
  }
}'
exit 0
