#!/bin/bash
# Admiral Framework — Context Baseline Hook
# Fires at SessionStart. Records initial context metrics.
# Timeout: 10s
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

source "$PROJECT_DIR/admiral/lib/state.sh"

# Read payload from stdin
PAYLOAD=$(cat)

# Count Standing Orders tokens (approximate: character count / 4)
SO_DIR="$PROJECT_DIR/admiral/standing-orders"
SO_CHARS=0
if [ -d "$SO_DIR" ]; then
  for f in "$SO_DIR"/so*.json; do
    [ -f "$f" ] || continue
    CHARS=$(wc -c < "$f")
    SO_CHARS=$((SO_CHARS + CHARS))
  done
fi
SO_TOKENS=$((SO_CHARS / 4))

# Record baseline in session state
STATE=$(load_state)
STATE=$(echo "$STATE" | jq \
  --argjson so_tokens "$SO_TOKENS" \
  '.context.standing_context_tokens = $so_tokens |
   .context.standing_context_present = ["Identity", "Authority", "Constraints"]')
echo "$STATE" | save_state

# Output baseline metrics
echo "Context baseline recorded. Standing context: ~${SO_TOKENS} tokens."
exit 0
