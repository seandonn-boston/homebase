#!/bin/bash
# Admiral Framework — Protocol Registry Guard (S-04)
# Two enforcement surfaces:
# 1. Validate protocol changes against SO-16 approval rules
# 2. Hard-block calls to unregistered MCP servers via approved registry
# PreToolUse hook — can hard-block (exit 2).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

REGISTRY_FILE="$PROJECT_DIR/admiral/config/approved_mcp_servers.json"

# Read payload from stdin
PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // ""' | tr -d '\r')

# Only enforce on tool calls that could invoke MCP servers or modify protocol config
case "$TOOL_NAME" in
  Bash|Write|Edit)
    # Check for MCP-related operations
    ;;
  *)
    # Non-relevant tools — pass through
    jq -n '{"allowed": true, "reason": "non_protocol_tool"}'
    exit 0
    ;;
esac

# Extract command or file content for analysis
COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // ""' | tr -d '\r')
FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // ""' | tr -d '\r')
CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.content // .tool_input.new_string // ""' | tr -d '\r')

# Surface 1: Detect MCP server additions/modifications
# Check if the tool call is modifying MCP configuration
is_mcp_config_change() {
  # Check file path for MCP config files
  case "$FILE_PATH" in
    *mcp_servers*|*mcp-servers*|*mcp_config*|*mcpServers*|*.claude/settings*)
      return 0 ;;
  esac

  # Check content for MCP server configuration patterns
  if echo "$CONTENT" | grep -qi "mcpServers\|mcp_servers\|mcp-server" 2>/dev/null; then
    return 0
  fi

  # Check bash commands for MCP-related operations
  if echo "$COMMAND" | grep -qi "mcp.*server\|mcp.*install\|mcp.*add\|npx.*mcp\|uvx.*mcp\|modelcontextprotocol\|mcp-server" 2>/dev/null; then
    return 0
  fi

  return 1
}

# Surface 2: Detect unregistered MCP server references
check_server_approval() {
  local server_name="$1"

  if [ ! -f "$REGISTRY_FILE" ]; then
    # No registry — advisory warning, don't block
    echo "no_registry"
    return 0
  fi

  # Check if server is in approved list
  local approved
  approved=$(jq --arg name "$server_name" \
    '[.servers[] | select(.name == $name)] | length' \
    "$REGISTRY_FILE" 2>/dev/null | tr -d '\r')

  if [ "$approved" -gt 0 ]; then
    echo "approved"
  else
    echo "unapproved"
  fi
}

# Check for blocked version patterns (e.g., "latest")
check_version_blocked() {
  local version="$1"

  if [ ! -f "$REGISTRY_FILE" ]; then
    echo "no_registry"
    return 0
  fi

  # Check against blocked patterns
  local blocked_patterns
  blocked_patterns=$(jq -r '.blocked_patterns[]' "$REGISTRY_FILE" 2>/dev/null | tr -d '\r')

  for pattern in $blocked_patterns; do
    # shellcheck disable=SC2254
    case "$version" in
      $pattern)
        echo "blocked"
        return 0
        ;;
    esac
  done

  echo "allowed"
}

# Extract MCP server names from content or command
extract_server_names() {
  local text="$1"
  # Look for "name": "value" patterns in JSON-like content
  echo "$text" | sed -n 's/.*"name"\s*:\s*"\([^"]*\)".*/\1/p' 2>/dev/null || true
  # Look for @modelcontextprotocol/server-NAME patterns
  echo "$text" | sed -n 's/.*@modelcontextprotocol\/server-\([a-z0-9-]*\).*/\1/p' 2>/dev/null || true
}

# Extract version strings
extract_versions() {
  local text="$1"
  echo "$text" | sed -n 's/.*"version"\s*:\s*"\([^"]*\)".*/\1/p' 2>/dev/null || true
}

# Main enforcement logic
if is_mcp_config_change; then
  # This is an MCP-related change — enforce SO-16

  # Check for "latest" version strings
  all_text="${CONTENT}${COMMAND}"
  if echo "$all_text" | grep -qi '"latest"\|:latest\|@latest' 2>/dev/null; then
    jq -n '{
      "allowed": false,
      "reason": "blocked_version_latest",
      "advisory": "BLOCKED: MCP server version \"latest\" is not allowed. Pin to a specific version per SO-16.",
      "severity": "error"
    }'
    exit 2
  fi

  # Check for server names against approved registry
  servers=$(extract_server_names "$all_text")
  if [ -n "$servers" ]; then
    while IFS= read -r server; do
      server=$(echo "$server" | tr -d '\r')
      [ -z "$server" ] && continue
      status=$(check_server_approval "$server")
      if [ "$status" = "unapproved" ]; then
        jq -n --arg server "$server" '{
          "allowed": false,
          "reason": "unapproved_mcp_server",
          "server": $server,
          "advisory": "BLOCKED: MCP server is not in the approved registry. Add it to admiral/config/approved_mcp_servers.json first.",
          "severity": "error"
        }'
        exit 2
      fi
    done <<< "$servers"
  fi

  # MCP config change with approved servers — advisory
  jq -n '{
    "allowed": true,
    "reason": "mcp_config_change_approved",
    "advisory": "MCP configuration change detected. Ensure SO-16 Server Addition Checklist is complete.",
    "severity": "info"
  }'
  exit 0
fi

# Not an MCP-related operation — pass through
jq -n '{"allowed": true, "reason": "non_mcp_operation"}'
exit 0
