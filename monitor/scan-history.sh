#!/bin/bash
# Admiral Framework — Scan Result History (MON-06)
# Append-only JSONL storage for scan results with retention policy.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HISTORY_FILE="${SCAN_HISTORY_FILE:-$SCRIPT_DIR/scan-history.jsonl}"
RETENTION_DAYS="${SCAN_RETENTION_DAYS:-90}"

# Append a scan result to history
append_scan_result() {
  local scan_type="$1"
  local status="$2"
  local findings="${3:-0}"
  local high_priority="${4:-0}"
  local duration_sec="${5:-0}"

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null | tr -d '\r')

  local entry
  entry=$(jq -cn \
    --arg ts "$ts" \
    --arg type "$scan_type" \
    --arg status "$status" \
    --argjson findings "$findings" \
    --argjson high "$high_priority" \
    --argjson dur "$duration_sec" \
    '{timestamp: $ts, scan_type: $type, status: $status, findings: $findings, high_priority: $high, duration_sec: $dur}' 2>/dev/null | tr -d '\r')

  printf '%s\n' "$entry" >> "$HISTORY_FILE"
}

# Query history for trend analysis
query_history() {
  local scan_type="${1:-}"
  local limit="${2:-20}"

  if [ ! -f "$HISTORY_FILE" ]; then
    echo "[]"
    return 0
  fi

  if [ -n "$scan_type" ]; then
    jq -s --arg t "$scan_type" --argjson n "$limit" '[.[] | select(.scan_type == $t)][-$n:]' "$HISTORY_FILE" 2>/dev/null || echo "[]"
  else
    jq -s --argjson n "$limit" '.[-$n:]' "$HISTORY_FILE" 2>/dev/null || echo "[]"
  fi
}

# Apply retention policy (remove entries older than RETENTION_DAYS)
apply_retention() {
  if [ ! -f "$HISTORY_FILE" ]; then
    return 0
  fi

  local cutoff
  cutoff=$(date -u -d "${RETENTION_DAYS} days ago" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-"${RETENTION_DAYS}"d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")

  if [ -z "$cutoff" ]; then
    return 0
  fi

  local before
  before=$(wc -l < "$HISTORY_FILE" | tr -d ' ')

  local tmp="${HISTORY_FILE}.tmp"
  jq -s --arg cutoff "$cutoff" '[.[] | select(.timestamp >= $cutoff)][]' "$HISTORY_FILE" > "$tmp" 2>/dev/null || return 0
  mv "$tmp" "$HISTORY_FILE"

  local after
  after=$(wc -l < "$HISTORY_FILE" | tr -d ' ')
  echo "Retention: removed $((before - after)) entries older than $RETENTION_DAYS days"
}

# CLI
case "${1:-}" in
  --query) query_history "${2:-}" "${3:-20}" ;;
  --retention) apply_retention ;;
  --stats)
    if [ -f "$HISTORY_FILE" ]; then
      total=$(wc -l < "$HISTORY_FILE" | tr -d ' ')
      echo "History file: $HISTORY_FILE"
      echo "Total records: $total"
      echo "Retention: $RETENTION_DAYS days"
    else
      echo "No history file found."
    fi
    ;;
esac
