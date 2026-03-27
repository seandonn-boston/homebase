#!/bin/bash
# Admiral Framework — Token Budget Tracker (PostToolUse)
# Estimates tokens for current tool call, updates cumulative count.
# Advisory warnings only (exit 0) — never blocks.
# Budget of 0 means unlimited (no warnings emitted).
# Timeout: 5s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

source "$PROJECT_DIR/admiral/lib/state.sh"
if [ -f "$PROJECT_DIR/admiral/lib/hook_utils.sh" ]; then
  source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
fi
hook_init "token_budget_tracker"

# Read payload from stdin
PAYLOAD=$(cat)

# Extract fields
TOOL_NAME=$(jq_get "$PAYLOAD" '.tool_name' 'unknown')
TOKENS_USED=$(jq_get "$PAYLOAD" '.session_state.tokens_used' '0')
TOKEN_BUDGET=$(jq_get "$PAYLOAD" '.session_state.token_budget' '0')

# Estimate tokens for this tool call
ESTIMATED=$(estimate_tokens "$TOOL_NAME")

# Update cumulative count
NEW_TOTAL=$((TOKENS_USED + ESTIMATED))

# Calculate utilization and emit advisory warnings (budget 0 = unlimited)
ALERT=""
if [ "$TOKEN_BUDGET" -gt 0 ]; then
  UTIL_PCT=$((NEW_TOTAL * 100 / TOKEN_BUDGET))

  if [ "$UTIL_PCT" -ge 100 ]; then
    OVER_BY=$((NEW_TOTAL - TOKEN_BUDGET))
    ALERT="BUDGET EXCEEDED: Token usage at ${UTIL_PCT}% (${NEW_TOTAL}/${TOKEN_BUDGET}, ${OVER_BY} over). Inform the user and ask if they wish to continue."
  elif [ "$UTIL_PCT" -ge 90 ]; then
    REMAINING=$((TOKEN_BUDGET - NEW_TOTAL))
    ALERT="BUDGET WARNING: Token usage at ${UTIL_PCT}% (${NEW_TOTAL}/${TOKEN_BUDGET}). ~${REMAINING} tokens remaining."
  fi
fi

# Output updated state
jq -n --argjson tokens "$NEW_TOTAL" \
      --arg alert "$ALERT" \
      '{tokens_used: $tokens, alert: $alert}'

exit 0
