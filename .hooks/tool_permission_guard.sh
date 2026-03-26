#!/bin/bash
# Admiral Framework — Tool Permission Guard (S-08)
# Enforces per-agent tool permissions from fleet registry.
# PreToolUse hook — hard-blocks denied tools (exit 2).
# If no agent_id in session, passes through (single-agent mode).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Source libraries
source "$PROJECT_DIR/admiral/lib/state.sh"
source "$PROJECT_DIR/admiral/lib/agent_registry.sh"

# Read payload from stdin
PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // ""' | tr -d '\r')

# Get current agent_id from session state
_state=$(load_state)
AGENT_ID=$(echo "$_state" | jq -r '.agent_id // ""' | tr -d '\r')

# If no agent_id, single-agent mode — pass through
if [ -z "$AGENT_ID" ] || [ "$AGENT_ID" = "null" ]; then
  jq -n '{"allowed": true, "reason": "single_agent_mode"}'
  exit 0
fi

# If no tool name, pass through
if [ -z "$TOOL_NAME" ] || [ "$TOOL_NAME" = "null" ]; then
  jq -n '{"allowed": true, "reason": "no_tool_name"}'
  exit 0
fi

# Initialize registry and look up agent
registry_init
AGENT_DEF=$(registry_get_agent "$AGENT_ID")

if [ -z "$AGENT_DEF" ]; then
  # Unregistered agent — advisory, don't block
  jq -n --arg agent "$AGENT_ID" --arg tool "$TOOL_NAME" '{
    "allowed": true,
    "reason": "unregistered_agent",
    "advisory": "Agent not in registry — tool permissions not enforced.",
    "severity": "warning"
  }'
  exit 0
fi

# Check if tool is explicitly denied
IS_DENIED=$(registry_agent_tool_denied "$AGENT_ID" "$TOOL_NAME")

if [ "$IS_DENIED" = "true" ]; then
  ROLE=$(echo "$AGENT_DEF" | jq -r '.role' | tr -d '\r')
  jq -n --arg agent "$AGENT_ID" --arg tool "$TOOL_NAME" --arg role "$ROLE" '{
    "allowed": false,
    "reason": "tool_denied",
    "agent_id": $agent,
    "role": $role,
    "tool": $tool,
    "advisory": "BLOCKED: Tool is denied for this agent role. Check fleet_registry.json for allowed tools.",
    "severity": "error"
  }'
  exit 2
fi

# Check if tool is in allowed list (if allowed list is non-empty)
IS_ALLOWED=$(registry_agent_has_tool "$AGENT_ID" "$TOOL_NAME")
ALLOWED_COUNT=$(echo "$AGENT_DEF" | jq '.tools.allowed | length' | tr -d '\r')

if [ "$ALLOWED_COUNT" -gt 0 ] && [ "$IS_ALLOWED" = "false" ]; then
  # Tool not in allowed list and list is non-empty — soft warning
  ROLE=$(echo "$AGENT_DEF" | jq -r '.role' | tr -d '\r')
  jq -n --arg agent "$AGENT_ID" --arg tool "$TOOL_NAME" --arg role "$ROLE" '{
    "allowed": true,
    "reason": "tool_not_in_allowlist",
    "agent_id": $agent,
    "role": $role,
    "tool": $tool,
    "advisory": "Tool not in agent allowed list. Proceeding but capabilities may be limited.",
    "severity": "warning"
  }'
  exit 0
fi

# Tool is allowed
jq -n --arg agent "$AGENT_ID" --arg tool "$TOOL_NAME" '{
  "allowed": true,
  "agent_id": $agent,
  "tool": $tool,
  "reason": "tool_permitted"
}'
exit 0
