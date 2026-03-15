#!/bin/bash
# Admiral Framework — PreToolUse Hook Adapter
# Translates Claude Code PreToolUse payload to Admiral hook contracts.
# Fires: token_budget_gate
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

# Source shared libraries
source "$PROJECT_DIR/admiral/lib/state.sh"

# Read Claude Code payload from stdin
PAYLOAD=$(cat)

# Extract tool name
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')

# Load current session state
STATE=$(load_state)
TOKENS_USED=$(echo "$STATE" | jq -r '.tokens_used')
TOKEN_BUDGET=$(echo "$STATE" | jq -r '.token_budget')

# Fire token_budget_gate
if [ -x "$SCRIPT_DIR/token_budget_gate.sh" ]; then
  GATE_RESULT=$(echo "$PAYLOAD" | jq --argjson state "$STATE" '. + {session_state: $state}' | "$SCRIPT_DIR/token_budget_gate.sh" 2>&1) || {
    GATE_EXIT=$?
    if [ $GATE_EXIT -eq 2 ]; then
      # Hard block — budget exhausted
      echo "Token budget exhausted: ${TOKENS_USED}/${TOKEN_BUDGET}. Action blocked." >&2
      exit 2
    fi
    # Exit 1 = soft fail, log but don't block
  }
fi

# Pass — allow the tool use
exit 0
