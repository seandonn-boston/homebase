#!/bin/bash
# Admiral Framework — PreToolUse Hook Adapter
# Translates Claude Code PreToolUse payload to Admiral hook contracts.
# Budget checkpoint: warns via additionalContext when budget is exceeded.
# NEVER hard-blocks (exit 2) — prevents unrecoverable deadlocks.
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
TOKENS_USED=$(echo "$STATE" | jq -r '.tokens_used // 0')
TOKEN_BUDGET=$(echo "$STATE" | jq -r '.token_budget // 0')

# Estimate tokens for this tool call
ESTIMATED=$(estimate_tokens "$TOOL_NAME")

# If no budget is set, allow without comment
if [ "$TOKEN_BUDGET" -le 0 ]; then
  exit 0
fi

# Calculate utilization
UTIL_PCT=$((TOKENS_USED * 100 / TOKEN_BUDGET))
PROJECTED=$((TOKENS_USED + ESTIMATED))
PROJECTED_PCT=$((PROJECTED * 100 / TOKEN_BUDGET))
OVER_BY=$((PROJECTED - TOKEN_BUDGET))

# Emit advisory context at thresholds — always allow (exit 0)
if [ "$PROJECTED" -ge "$TOKEN_BUDGET" ]; then
  # Over budget — warn with details but allow
  jq -n \
    --arg ctx "BUDGET CHECKPOINT: Token budget exceeded. Current: ${TOKENS_USED} tokens used of ${TOKEN_BUDGET} budget (${UTIL_PCT}%). This ${TOOL_NAME} call is estimated at ~${ESTIMATED} tokens, bringing projected total to ${PROJECTED} (${OVER_BY} over budget). You may continue, but please inform the user that the session has exceeded its token budget and ask if they wish to proceed." \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "additionalContext": $ctx
      }
    }'
elif [ "$UTIL_PCT" -ge 90 ]; then
  # Approaching budget — advisory warning
  REMAINING=$((TOKEN_BUDGET - TOKENS_USED))
  jq -n \
    --arg ctx "BUDGET ADVISORY: Session at ${UTIL_PCT}% of token budget (${TOKENS_USED}/${TOKEN_BUDGET}). ~${REMAINING} tokens remaining. Consider wrapping up or informing the user." \
    '{
      "hookSpecificOutput": {
        "hookEventName": "PreToolUse",
        "permissionDecision": "allow",
        "additionalContext": $ctx
      }
    }'
fi

# Allow the tool use
exit 0
