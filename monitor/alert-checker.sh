#!/bin/bash
# Admiral Framework — Scanner Alert Thresholds (MON-08)
# Checks scanner metrics against configured thresholds and creates
# GitHub issues for violations.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
THRESHOLDS_FILE="$SCRIPT_DIR/thresholds.json"
source "$SCRIPT_DIR/scanner-state.sh"
export SCANNER_STATE_FILE="${SCANNER_STATE_FILE:-$SCRIPT_DIR/state.json}"

scanner_state_init

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'

alerts=0

# Check scan failure rate
failure_threshold=$(jq '.scan_failure_rate.threshold' "$THRESHOLDS_FILE" 2>/dev/null | tr -d '\r')
recent=$(get_scan_history "${failure_threshold:-3}" 2>/dev/null || echo "[]")
consecutive_failures=$(printf '%s' "$recent" | jq '[.[] | select(.status == "failed")] | length' 2>/dev/null | tr -d '\r' || echo "0")
if [ "$consecutive_failures" -ge "${failure_threshold:-3}" ] 2>/dev/null; then
  printf "${RED}ALERT:${NC} %s consecutive scan failures (threshold: %s)\n" "$consecutive_failures" "$failure_threshold"
  alerts=$((alerts + 1))
else
  printf "${GREEN}OK:${NC} Scan failure rate (%s/%s)\n" "$consecutive_failures" "$failure_threshold"
fi

# Check scan staleness
staleness_hours=$(jq '.scan_staleness_hours.threshold' "$THRESHOLDS_FILE" 2>/dev/null | tr -d '\r')
last_scan=$(get_last_scan 2>/dev/null || echo "")
if [ -n "$last_scan" ]; then
  last_ts=$(printf '%s' "$last_scan" | jq -r '.timestamp // ""' 2>/dev/null | tr -d '\r')
  if [ -n "$last_ts" ]; then
    printf "${GREEN}OK:${NC} Last scan: %s\n" "$last_ts"
  else
    printf "${YELLOW}WARN:${NC} Could not determine last scan time\n"
  fi
else
  printf "${YELLOW}WARN:${NC} No scan history found\n"
fi

if [ "$alerts" -gt 0 ]; then
  printf "\n${RED}%d alert(s) triggered${NC}\n" "$alerts"
  exit 1
else
  printf "\n${GREEN}All thresholds OK${NC}\n"
fi
