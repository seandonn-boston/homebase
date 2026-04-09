#!/bin/bash
# Admiral Framework — Weekly Trend Reports (MON-03)
# Aggregates daily digests into weekly trends with direction indicators.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIGESTS_DIR="$SCRIPT_DIR/digests"
source "$SCRIPT_DIR/scanner-state.sh"
export SCANNER_STATE_FILE="${SCANNER_STATE_FILE:-$SCRIPT_DIR/state.json}"

WEEK_START=$(date -u -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -u -v-7d +%Y-%m-%d 2>/dev/null || echo "unknown")
WEEK_END=$(date -u +%Y-%m-%d)
REPORT_FILE="$DIGESTS_DIR/${WEEK_END}-weekly.md"

mkdir -p "$DIGESTS_DIR"

cat > "$REPORT_FILE" << EOF
# Weekly Trend Report

Period: ${WEEK_START} to ${WEEK_END}
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Scan Activity

EOF

# Count scans this week
history=$(get_scan_history 50 2>/dev/null || echo "[]")
total_scans=$(printf '%s' "$history" | jq 'length' 2>/dev/null | tr -d '\r' || echo "0")
success_scans=$(printf '%s' "$history" | jq '[.[] | select(.status == "success")] | length' 2>/dev/null | tr -d '\r' || echo "0")
total_findings=$(printf '%s' "$history" | jq '[.[].findings_count] | add // 0' 2>/dev/null | tr -d '\r' || echo "0")
high_findings=$(printf '%s' "$history" | jq '[.[].high_priority_count] | add // 0' 2>/dev/null | tr -d '\r' || echo "0")

cat >> "$REPORT_FILE" << EOF
- Total scans: $total_scans
- Successful: $success_scans
- Total findings: $total_findings
- High priority: $high_findings

## Direction Indicators

EOF

# Determine direction based on findings trend
if [ "$total_findings" -eq 0 ] 2>/dev/null; then
  echo "- Findings trend: stable (no findings)" >> "$REPORT_FILE"
elif [ "$high_findings" -gt 0 ] 2>/dev/null; then
  echo "- Findings trend: needs attention ($high_findings HIGH findings)" >> "$REPORT_FILE"
else
  echo "- Findings trend: stable" >> "$REPORT_FILE"
fi

# List daily digests from this week
echo "" >> "$REPORT_FILE"
echo "## Daily Digests" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
for digest in "$DIGESTS_DIR"/*.md; do
  [ -f "$digest" ] || continue
  name=$(basename "$digest")
  case "$name" in *-weekly*) continue ;; esac
  echo "- [$name]($name)" >> "$REPORT_FILE"
done

echo "Weekly report generated: $REPORT_FILE"
