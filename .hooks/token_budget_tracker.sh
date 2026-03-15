#!/bin/bash
# Admiral Framework — Token Budget Tracker (PostToolUse)
# Estimates tokens for current tool call, updates cumulative count.
# Warns at 80%, escalates at 90%. Advisory only (exit 0).
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

source "$PROJECT_DIR/admiral/lib/state.sh"

# Read payload from stdin
PAYLOAD=$(cat)

# Extract fields
TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // "unknown"')
TOKENS_USED=$(echo "$PAYLOAD" | jq -r '.session_state.tokens_used // 0')
TOKEN_BUDGET=$(echo "$PAYLOAD" | jq -r '.session_state.token_budget // 200000')

# Estimate tokens for this tool call
ESTIMATED=$(estimate_tokens "$TOOL_NAME")

# Update cumulative count
NEW_TOTAL=$((TOKENS_USED + ESTIMATED))

# Calculate utilization
ALERT=""
if [ "$TOKEN_BUDGET" -gt 0 ]; then
  # Use integer math: multiply by 100 for percentage
  UTIL_PCT=$((NEW_TOTAL * 100 / TOKEN_BUDGET))

  if [ "$UTIL_PCT" -ge 90 ]; then
    ALERT="ESCALATION: Token budget at ${UTIL_PCT}% (${NEW_TOTAL}/${TOKEN_BUDGET}). Escalate remaining work to Admiral."
  elif [ "$UTIL_PCT" -ge 80 ]; then
    ALERT="WARNING: Token budget at ${UTIL_PCT}% (${NEW_TOTAL}/${TOKEN_BUDGET}). Conserve tokens."
  fi
fi

# Output updated state
jq -n --argjson tokens "$NEW_TOTAL" \
      --arg alert "$ALERT" \
      '{tokens_used: $tokens, alert: $alert}'

exit 0
