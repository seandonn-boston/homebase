#!/bin/bash
# enforcement_coverage.sh — Validates Standing Orders enforcement map and reports coverage
# Reads enforcement-map.json, cross-references against actual hook files,
# and produces a human-readable summary plus JSON output.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
MAP_FILE="$PROJECT_ROOT/admiral/docs/standing-orders-enforcement-map.json"
HOOKS_DIR="$PROJECT_ROOT/.hooks"

# Colors (disabled if not a terminal)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

if [ ! -f "$MAP_FILE" ]; then
  echo "ERROR: Enforcement map not found at $MAP_FILE" >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required" >&2
  exit 1
fi

# Validate JSON
if ! jq empty "$MAP_FILE" 2>/dev/null; then
  echo "ERROR: Invalid JSON in $MAP_FILE" >&2
  exit 1
fi

echo "Standing Orders Enforcement Coverage Report"
echo "============================================"
echo ""

total=$(jq '.summary.total_standing_orders' "$MAP_FILE")
hook_enforced=$(jq '.summary.hook_enforced' "$MAP_FILE")
coverage=$(jq '.summary.coverage_percentage' "$MAP_FILE")

echo "Total Standing Orders: $total"
echo "Hook-enforced: $hook_enforced"
echo "Coverage: ${coverage}%"
echo ""

# Check each SO's hooks exist
missing_hooks=0
orphan_warnings=0

echo "Per-SO Enforcement Status:"
echo "--------------------------"

jq -r '.standing_orders[] | "\(.id)|\(.title)|\(.enforcement_type)|\(.coverage)|\(.hooks | length)|\(.hooks | map(.name) | join(","))"' "$MAP_FILE" | tr -d '\r' | \
while IFS='|' read -r so_id title etype cov hook_count hook_names; do
  # Status indicator
  case "$etype" in
    hard-block)   indicator="${GREEN}BLOCK${NC}" ;;
    soft-warning) indicator="${YELLOW}WARN ${NC}" ;;
    instruction-embedded) indicator="EMBED" ;;
    guidance-only) indicator="GUIDE" ;;
    *) indicator="?????" ;;
  esac

  # Coverage indicator
  case "$cov" in
    full)         cov_icon="${GREEN}FULL${NC}" ;;
    adequate)     cov_icon="${GREEN}OK  ${NC}" ;;
    partial)      cov_icon="${YELLOW}PART${NC}" ;;
    minimal)      cov_icon="${YELLOW}MIN ${NC}" ;;
    critical_gap) cov_icon="${RED}GAP!${NC}" ;;
    n/a)          cov_icon="N/A " ;;
    *)            cov_icon="????" ;;
  esac

  # Verify hooks exist on disk
  hook_status=""
  if [ "$hook_count" -gt 0 ] && [ -n "$hook_names" ]; then
    IFS=',' read -ra hooks <<< "$hook_names"
    for hook in "${hooks[@]}"; do
      if [ ! -f "$HOOKS_DIR/$hook" ]; then
        hook_status=" ${RED}[MISSING: $hook]${NC}"
        missing_hooks=$((missing_hooks + 1))
      fi
    done
  fi

  printf "  %-6s %-35s [%b] [%b]%b\n" "$so_id" "$title" "$indicator" "$cov_icon" "$hook_status"
done

echo ""

# Summary
critical_gaps=$(jq '[.standing_orders[] | select(.coverage == "critical_gap")] | length' "$MAP_FILE")
if [ "$critical_gaps" -gt 0 ]; then
  echo -e "${RED}CRITICAL GAPS: $critical_gaps Standing Order(s) with safety-tier gaps:${NC}"
  jq -r '.standing_orders[] | select(.coverage == "critical_gap") | "  \(.id): \(.title) — \(.gap)"' "$MAP_FILE"
  echo ""
fi

# JSON output for CI
json_output=$(jq -c '{
  coverage_percentage: .summary.coverage_percentage,
  hook_enforced: .summary.hook_enforced,
  total: .summary.total_standing_orders,
  critical_gaps: [.standing_orders[] | select(.coverage == "critical_gap") | .id],
  not_enforced: [.standing_orders[] | select(.hooks | length == 0) | .id],
  fully_covered: [.standing_orders[] | select(.coverage == "full" or .coverage == "adequate") | .id]
}' "$MAP_FILE")

echo "JSON Summary: $json_output"

# Exit with appropriate code
if [ "$critical_gaps" -gt 0 ]; then
  exit 1
fi
exit 0
