#!/bin/bash
# Admiral Framework — Daily Digest Generator (MON-02)
# Generates daily digests of scanner findings and codebase health.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/scanner-state.sh"
export SCANNER_STATE_FILE="${SCANNER_STATE_FILE:-$SCRIPT_DIR/state.json}"

scanner_state_init

TODAY=$(date -u +%Y-%m-%d)
DIGEST_FILE="$SCRIPT_DIR/digests/${TODAY}.md"
mkdir -p "$SCRIPT_DIR/digests"

cat > "$DIGEST_FILE" << EOF
# Daily Digest — ${TODAY}

Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Scan Summary

EOF

# Add scan history from today
history=$(get_scan_history 5 2>/dev/null || echo "[]")
scan_count=$(printf '%s' "$history" | jq 'length' 2>/dev/null | tr -d '\r' || echo "0")

if [ "$scan_count" -gt 0 ]; then
  echo "| Time | Type | Status | Findings | High |" >> "$DIGEST_FILE"
  echo "|------|------|--------|----------|------|" >> "$DIGEST_FILE"
  printf '%s' "$history" | jq -r '.[] | "| \(.timestamp) | \(.scan_type) | \(.status) | \(.findings_count) | \(.high_priority_count) |"' >> "$DIGEST_FILE" 2>/dev/null
else
  echo "No scans recorded today." >> "$DIGEST_FILE"
fi

# Codebase health section
cat >> "$DIGEST_FILE" << 'EOF'

## Codebase Health

EOF

# Count tests
ts_tests=$(cd "$SCRIPT_DIR/.." 2>/dev/null && ls control-plane/dist/src/*.test.js 2>/dev/null | wc -l | tr -d ' ' || echo "?")
hook_count=$(ls "$SCRIPT_DIR/../.hooks/"*.sh 2>/dev/null | wc -l | tr -d ' ' || echo "?")

echo "- TypeScript test files: $ts_tests" >> "$DIGEST_FILE"
echo "- Hook scripts: $hook_count" >> "$DIGEST_FILE"

echo "Digest generated: $DIGEST_FILE"
