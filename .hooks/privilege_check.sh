#!/bin/bash
# Admiral Framework — Privilege Escalation Hardening (SEC-04)
# PreToolUse hook — prevents privilege escalation attacks:
# 1. Agents cannot modify their own authority tier assignments
# 2. Brain entries cannot contain authority-tier escalation patterns
# 3. Identity token binding verified (agent_id cannot change mid-session)
#
# Hard-blocks (exit 2) on privilege escalation attempts.
# Advisory (exit 0) for suspicious but not definitive patterns.
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"

# Source libraries
source "$PROJECT_DIR/admiral/lib/state.sh"

# Source security audit if available
if [ -f "$PROJECT_DIR/admiral/lib/security_audit.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/security_audit.sh"
  HAS_AUDIT="true"
else
  HAS_AUDIT="false"
fi

PAYLOAD=$(cat)

TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // ""' | tr -d '\r')

# Get session state
_state=$(load_state)
AGENT_ID=$(echo "$_state" | jq -r '.agent_id // ""' | tr -d '\r')
SESSION_AGENT_ID=$(echo "$_state" | jq -r '.session_agent_id // ""' | tr -d '\r')

# --- Check 1: Identity token binding ---
# If session_agent_id was set at session start, agent_id must match
if [ -n "$SESSION_AGENT_ID" ] && [ "$SESSION_AGENT_ID" != "null" ] && \
   [ -n "$AGENT_ID" ] && [ "$AGENT_ID" != "null" ] && \
   [ "$AGENT_ID" != "$SESSION_AGENT_ID" ]; then
  # shellcheck disable=SC2034 — DETAILS used by audit trail in future phases
  DETAILS=$(jq -cn --arg original "$SESSION_AGENT_ID" --arg current "$AGENT_ID" \
    '{original_agent_id: $original, attempted_agent_id: $current}')

  if [ "$HAS_AUDIT" = "true" ]; then
    audit_privilege_escalation "$AGENT_ID" "identity_change"
  fi

  jq -n --arg orig "$SESSION_AGENT_ID" --arg curr "$AGENT_ID" '{
    "decision": "deny",
    "reason": "Identity token binding violation: agent_id changed mid-session",
    "original_agent_id": $orig,
    "current_agent_id": $curr,
    "severity": "critical"
  }'
  exit 2
fi

# --- Check 2: Authority tier self-modification (ATK-0003 defense) ---
# Block writes to authority-related files or brain entries with escalation patterns
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ]; then
  FILE_PATH=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // ""' | tr -d '\r')
  CONTENT=$(echo "$PAYLOAD" | jq -r '.tool_input.content // .tool_input.new_string // ""' | tr -d '\r')

  # Block direct modification of fleet registry authority tiers
  if echo "$FILE_PATH" | grep -qE '(fleet_registry|agent-definition).*\.json'; then
    if echo "$CONTENT" | grep -qiE '"(autonomous|propose|escalate)".*:'; then
      if [ -n "$AGENT_ID" ] && [ "$AGENT_ID" != "null" ]; then
        if [ "$HAS_AUDIT" = "true" ]; then
          audit_privilege_escalation "$AGENT_ID" "authority_tier_modification"
        fi

        jq -n --arg agent "$AGENT_ID" --arg file "$FILE_PATH" '{
          "decision": "deny",
          "reason": "Agents cannot modify authority tier assignments",
          "agent_id": $agent,
          "target_file": $file,
          "severity": "critical"
        }'
        exit 2
      fi
    fi
  fi

  # Block brain entries with authority escalation patterns
  if echo "$FILE_PATH" | grep -qE '\.brain/'; then
    ESCALATION_PATTERNS='(authority.*(tier|level).*change|promote.*to.*autonomous|grant.*unrestricted|escalate.*own.*permissions|override.*standing.*order)'
    if echo "$CONTENT" | grep -qiE "$ESCALATION_PATTERNS"; then
      if [ "$HAS_AUDIT" = "true" ]; then
        audit_privilege_escalation "${AGENT_ID:-unknown}" "brain_authority_injection"
      fi

      jq -n --arg file "$FILE_PATH" '{
        "decision": "deny",
        "reason": "Brain entry contains authority escalation patterns (ATK-0003 defense)",
        "target_file": $file,
        "severity": "critical"
      }'
      exit 2
    fi
  fi
fi

# --- Check 3: Bash commands attempting privilege manipulation ---
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$PAYLOAD" | jq -r '.tool_input.command // ""' | tr -d '\r')

  # Block attempts to modify agent definitions or registry
  if echo "$COMMAND" | grep -qiE '(sed|awk|perl).*fleet_registry|jq.*fleet_registry.*>'; then
    if [ "$HAS_AUDIT" = "true" ]; then
      audit_privilege_escalation "${AGENT_ID:-unknown}" "registry_modification_via_bash"
    fi

    jq -n '{
      "decision": "deny",
      "reason": "Shell commands cannot directly modify fleet registry",
      "severity": "critical"
    }'
    exit 2
  fi
fi

# No privilege escalation detected
jq -n '{"decision": "allow"}'
exit 0
