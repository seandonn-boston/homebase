#!/bin/bash
# Admiral Framework — Context Health Check (PostToolUse, every 10th call)
# Validates critical sections present in standing context.
# Advisory only — NEVER blocks or fails (always exit 0).
# Issues are reported via JSON alert field, not exit codes.
# Timeout: 10s
set -euo pipefail

# Source hook utilities
_PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
if [ -f "$_PROJECT_DIR/admiral/lib/hook_utils.sh" ]; then
  source "$_PROJECT_DIR/admiral/lib/hook_utils.sh"
fi
hook_init "context_health_check"

# Read payload from stdin
PAYLOAD=$(cat)

# Extract context state
STANDING_PRESENT=$(echo "$PAYLOAD" | jq -r '.session_state.context.standing_context_present // []')

ISSUES=""

# Check critical sections: Identity, Authority, Constraints
for section in "Identity" "Authority" "Constraints"; do
  HAS_SECTION=$(echo "$STANDING_PRESENT" | jq -r "index(\"$section\") // empty" 2>/dev/null)
  if [ -z "$HAS_SECTION" ]; then
    ISSUES+="Critical section '${section}' missing from standing context. "
  fi
done

if [ -n "$ISSUES" ]; then
  jq -n --arg alert "CONTEXT ADVISORY: ${ISSUES}Standing Orders may not have loaded correctly at session start." \
    '{status: "warning", alert: $alert}'
else
  echo '{"status": "ok"}'
fi

exit 0
