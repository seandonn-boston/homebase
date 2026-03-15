#!/bin/bash
# Admiral Framework — Context Health Check (PostToolUse, every 10th call)
# Checks: utilization > 85%, validates critical sections present.
# Exit 0: healthy. Exit 1: issues detected (soft fail with diagnostics).
# Timeout: 10s
set -euo pipefail

# Read payload from stdin
PAYLOAD=$(cat)

# Extract context state
UTILIZATION=$(echo "$PAYLOAD" | jq -r '.session_state.context.current_utilization // 0')
STANDING_PRESENT=$(echo "$PAYLOAD" | jq -r '.session_state.context.standing_context_present // []')

ISSUES=""

# Check utilization threshold (85%)
# Use integer comparison: multiply utilization by 100
UTIL_INT=$(echo "$UTILIZATION" | awk '{printf "%d", $1 * 100}')
if [ "$UTIL_INT" -ge 85 ]; then
  ISSUES+="Context utilization at ${UTIL_INT}% (threshold: 85%). "
fi

# Check critical sections: Identity, Authority, Constraints
for section in "Identity" "Authority" "Constraints"; do
  HAS_SECTION=$(echo "$STANDING_PRESENT" | jq -r "index(\"$section\") // empty" 2>/dev/null)
  if [ -z "$HAS_SECTION" ]; then
    ISSUES+="Critical section '${section}' missing from standing context. "
  fi
done

if [ -n "$ISSUES" ]; then
  echo "Context health check failed: ${ISSUES}" >&2
  exit 1
fi

echo "Context health: OK"
exit 0
