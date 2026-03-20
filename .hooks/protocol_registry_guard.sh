#!/bin/bash
# Admiral Framework — Protocol Registry Guard (PreToolUse)
# Enforces SO-16 + MCP Security: Two enforcement surfaces:
# 1. Validate protocol changes against SO-16 approval rules
# 2. Hard-block calls to unregistered MCP servers via approved registry
# Closes OWASP MCP09 gap (Server Registry Poisoning)
#
# DESIGN: Hard-block (exit 2) for unapproved MCP servers. Advisory for protocol changes.
# INPUT: JSON on stdin with tool_name, tool_input
# OUTPUT: JSON with hookSpecificOutput (allow/deny) and additionalContext
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Read payload from stdin
PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')

ALL_CONTEXT=""

# --- Surface 1: MCP Server Enforcement ---
# Detect MCP server connections in Bash commands and tool calls
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // ""' | head -c 4000)

  # Strip heredoc content before scanning (following scope_boundary_guard pattern)
  COMMAND_TO_CHECK="$COMMAND"
  if printf '%s\n' "$COMMAND" | grep -qE '<<[-~]?\s*\\?['"'"'"]?[A-Za-z_]'; then
    COMMAND_TO_CHECK=$(printf '%s\n' "$COMMAND" | head -n1)
  fi

  # Skip read-only and VCS commands — they don't connect to MCP servers
  case "$COMMAND_TO_CHECK" in
    git\ add*|git\ commit*|git\ push*|git\ status*|git\ log*|git\ diff*|cat\ *|ls\ *|head\ *|tail\ *|grep\ *|find\ *) ;;
    *)
      # Detect MCP server connection patterns
      MCP_SERVER=""
      if echo "$COMMAND_TO_CHECK" | grep -qiE 'mcp[_-]?(server|connect|start|run)|npx.*mcp|uvx.*mcp'; then
        # Extract server name/URL from command
        MCP_SERVER=$(echo "$COMMAND_TO_CHECK" | grep -oiE 'mcp[_-]?server[_-]?[a-zA-Z0-9_-]+|@[a-zA-Z0-9_/-]+/mcp' | head -1) || true
      fi

      # Detect MCP config file modifications (only for write-like commands, not git add)
      if echo "$COMMAND_TO_CHECK" | grep -qiE 'mcp[_-]?config|mcpServers|mcp_servers'; then
        ALL_CONTEXT+="PROTOCOL ADVISORY (SO-16): MCP configuration change detected. Verify: (1) Server is on approved list, (2) Trust classification assigned, (3) No 'latest' version tags, (4) Security review completed per Server Addition Checklist. "
      fi
      ;;
  esac

  if [ -n "$MCP_SERVER" ]; then
    APPROVED_REGISTRY="${PROJECT_DIR}/admiral/config/approved_mcp_servers.json"

    if [ -f "$APPROVED_REGISTRY" ] && jq empty "$APPROVED_REGISTRY" 2>/dev/null; then
      # Check if server is in approved list
      IS_APPROVED=$(jq -r --arg srv "$MCP_SERVER" \
        '[.approved_servers[].name, .approved_servers[].aliases[]?] | index($srv) != null' \
        "$APPROVED_REGISTRY" 2>/dev/null) || IS_APPROVED="false"

      if [ "$IS_APPROVED" != "true" ]; then
        # Hard-block unapproved MCP server
        BLOCK_MSG="PROTOCOL BLOCKED (SO-16/MCP09): MCP server '${MCP_SERVER}' is NOT in the approved registry (admiral/config/approved_mcp_servers.json). Per SO-16 Protocol Governance: (1) Submit server for review via Server Addition Checklist, (2) Assign trust classification, (3) Verify version pinning (no 'latest'), (4) Complete A2A connection testing. Unapproved servers are blocked to prevent registry poisoning (OWASP MCP09)."
        jq -n --arg ctx "$BLOCK_MSG" '{
          "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "additionalContext": $ctx
          }
        }'
        exit 2
      else
        ALL_CONTEXT+="PROTOCOL (SO-16): MCP server '${MCP_SERVER}' is approved. "
      fi
    else
      # No approved registry — advisory warning
      ALL_CONTEXT+="PROTOCOL ADVISORY (SO-16): No approved MCP server registry found. Create admiral/config/approved_mcp_servers.json for MCP enforcement. "
    fi
  fi
fi

# --- Surface 2: Protocol Change Detection ---
# Detect modifications to protocol-related files
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ]; then
  FILE_PATH=""
  if [ "$TOOL_NAME" = "Write" ]; then
    FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // ""')
  else
    FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // ""')
  fi

  # Check if modifying protocol-related files
  case "$FILE_PATH" in
    *mcp*config*|*mcpServers*|*.claude/settings*mcp*|*approved_mcp_servers*)
      ALL_CONTEXT+="PROTOCOL CHANGE (SO-16): Modification to protocol configuration file '$(basename "$FILE_PATH")' detected. Ensure: (1) Changes follow Server Addition Checklist, (2) Version strings are pinned (no 'latest'), (3) Trust classification is documented. "
      ;;
    *fleet_registry*|*agent_registry*|*routing*)
      ALL_CONTEXT+="PROTOCOL CHANGE (SO-16): Modification to fleet/routing configuration detected. Verify no conflicts with in-flight work. "
      ;;
  esac

  # Detect 'latest' version strings in content (potential supply chain risk)
  CONTENT=""
  if [ "$TOOL_NAME" = "Write" ]; then
    CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.content // ""' | head -c 2000)
  else
    CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.new_string // ""' | head -c 2000)
  fi

  if [ -n "$CONTENT" ] && echo "$CONTENT" | grep -qiE '"version"\s*:\s*"latest"|:latest"'; then
    ALL_CONTEXT+="PROTOCOL WARNING (SO-16): 'latest' version tag detected in content. Pin to a specific version to prevent supply chain risks. "
  fi
fi

# Emit combined context if any checks fired
if [ -n "$ALL_CONTEXT" ]; then
  jq -n --arg ctx "$ALL_CONTEXT" '{
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "allow",
      "additionalContext": $ctx
    }
  }'
fi

exit 0
