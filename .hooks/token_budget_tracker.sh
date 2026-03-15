#!/bin/bash
# Admiral Framework — Token Budget Tracker (PostToolUse)
# Estimates tokens for current tool call, updates cumulative count.
# Informational only — no limits enforced. Advisory only (exit 0).
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

# Estimate tokens for this tool call
ESTIMATED=$(estimate_tokens "$TOOL_NAME")

# Update cumulative count
NEW_TOTAL=$((TOKENS_USED + ESTIMATED))

# Output updated state (no alerts — context limits removed)
jq -n --argjson tokens "$NEW_TOTAL" \
      '{tokens_used: $tokens, alert: ""}'

exit 0
