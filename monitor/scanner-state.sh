#!/bin/bash
# Admiral Framework — Scanner State Management (MON-04)
# Tracks scanner state per aiStrat/monitor/state-schema.json.
# Provides atomic updates and query functions.
set -euo pipefail

MONITOR_DIR="${MONITOR_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
STATE_FILE="${SCANNER_STATE_FILE:-$MONITOR_DIR/state.json}"

# ── Init ──────────────────────────────────────────────────────

scanner_state_init() {
  if [ -f "$STATE_FILE" ]; then
    return 0
  fi

  cat > "$STATE_FILE" << 'EOF'
{
  "version": "1.0.0",
  "last_updated": "",
  "sources": {},
  "scan_history": [],
  "watchlist": {
    "repos": [],
    "topics": [],
    "providers": ["anthropic", "openai", "google", "meta"]
  }
}
EOF
  _update_timestamp
}

# ── Atomic write ──────────────────────────────────────────────

_atomic_write() {
  local content="$1"
  local tmp="${STATE_FILE}.tmp"
  printf '%s' "$content" > "$tmp"
  mv "$tmp" "$STATE_FILE"
}

_update_timestamp() {
  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null | tr -d '\r')
  local updated
  updated=$(jq --arg ts "$ts" '.last_updated = $ts' "$STATE_FILE" 2>/dev/null | tr -d '\r')
  if [ -n "$updated" ]; then
    _atomic_write "$updated"
  fi
}

# ── Query functions ───────────────────────────────────────────

get_last_scan() {
  local scan_type="${1:-}"
  if [ -z "$scan_type" ]; then
    jq -r '.scan_history[0] // empty' "$STATE_FILE" 2>/dev/null
  else
    jq -r --arg t "$scan_type" '[.scan_history[] | select(.scan_type == $t)][0] // empty' "$STATE_FILE" 2>/dev/null
  fi
}

is_known_version() {
  local source="$1"
  local version="$2"
  local known
  known=$(jq -r --arg s "$source" '.sources[$s].known_version // ""' "$STATE_FILE" 2>/dev/null | tr -d '\r')
  [ "$known" = "$version" ]
}

get_scan_history() {
  local limit="${1:-10}"
  jq --argjson n "$limit" '.scan_history[:$n]' "$STATE_FILE" 2>/dev/null
}

get_source_info() {
  local source="$1"
  jq --arg s "$source" '.sources[$s] // null' "$STATE_FILE" 2>/dev/null
}

get_watchlist() {
  jq '.watchlist' "$STATE_FILE" 2>/dev/null
}

# ── Update functions ──────────────────────────────────────────

record_scan() {
  local scan_type="$1"
  local status="$2"
  local findings="${3:-0}"
  local high_priority="${4:-0}"
  local digest_file="${5:-}"

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null | tr -d '\r')

  local entry
  entry=$(jq -cn \
    --arg ts "$ts" \
    --arg type "$scan_type" \
    --arg status "$status" \
    --argjson findings "$findings" \
    --argjson high "$high_priority" \
    --arg digest "$digest_file" \
    '{timestamp: $ts, scan_type: $type, status: $status, findings_count: $findings, high_priority_count: $high, digest_file: $digest}' 2>/dev/null | tr -d '\r')

  local updated
  updated=$(jq --argjson entry "$entry" '
    .scan_history = ([$entry] + .scan_history)[:100] |
    .last_updated = $entry.timestamp
  ' "$STATE_FILE" 2>/dev/null | tr -d '\r')

  if [ -n "$updated" ]; then
    _atomic_write "$updated"
  fi
}

update_source() {
  local source="$1"
  local version="${2:-}"
  local source_type="${3:-model_provider}"

  local ts
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ 2>/dev/null | tr -d '\r')

  local updated
  updated=$(jq \
    --arg src "$source" \
    --arg ver "$version" \
    --arg type "$source_type" \
    --arg ts "$ts" \
    '.sources[$src] = {type: $type, last_scanned: $ts, known_version: $ver, enabled: true} | .last_updated = $ts' \
    "$STATE_FILE" 2>/dev/null | tr -d '\r')

  if [ -n "$updated" ]; then
    _atomic_write "$updated"
  fi
}

add_to_watchlist() {
  local list_type="$1"
  local value="$2"

  local updated
  updated=$(jq \
    --arg type "$list_type" \
    --arg val "$value" \
    'if .watchlist[$type] then .watchlist[$type] += [$val] | .watchlist[$type] |= unique else . end' \
    "$STATE_FILE" 2>/dev/null | tr -d '\r')

  if [ -n "$updated" ]; then
    _atomic_write "$updated"
  fi
}

# ── CLI Interface ─────────────────────────────────────────────

if [ "${1:-}" = "--init" ]; then
  scanner_state_init
  echo "Scanner state initialized at $STATE_FILE"
elif [ "${1:-}" = "--status" ]; then
  if [ ! -f "$STATE_FILE" ]; then
    echo "No state file found. Run with --init first."
    exit 1
  fi
  echo "State file: $STATE_FILE"
  echo "Last updated: $(jq -r '.last_updated // "never"' "$STATE_FILE" | tr -d '\r')"
  echo "Sources: $(jq '.sources | length' "$STATE_FILE" | tr -d '\r')"
  echo "Scan history: $(jq '.scan_history | length' "$STATE_FILE" | tr -d '\r') records"
  echo "Watchlist repos: $(jq '.watchlist.repos | length' "$STATE_FILE" | tr -d '\r')"
fi
