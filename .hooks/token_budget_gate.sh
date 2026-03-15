#!/bin/bash
# Admiral Framework — Token Budget Gate (PreToolUse)
# Blocks tool invocations when session token budget is exhausted.
# Exit 0: budget available. Exit 2: budget exhausted (hard block).
# Timeout: 5s
set -euo pipefail

# Read payload from stdin (includes session_state)
PAYLOAD=$(cat)

# Extract token state
TOKENS_USED=$(echo "$PAYLOAD" | jq -r '.session_state.tokens_used // 0')
TOKEN_BUDGET=$(echo "$PAYLOAD" | jq -r '.session_state.token_budget // 200000')

# Block if budget exhausted (100% utilization)
if [ "$TOKENS_USED" -ge "$TOKEN_BUDGET" ]; then
  echo "Token budget exhausted: ${TOKENS_USED}/${TOKEN_BUDGET}. Session terminated." >&2
  exit 2
fi

exit 0
