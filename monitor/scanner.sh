#!/bin/bash
# Admiral Framework — Scanner (MON-01)
# Wraps the reference scanner from aiStrat/monitor/scanner.sh,
# integrating with MON-04 state management and writing results
# to monitor/ (not aiStrat/ which is read-only).
#
# Usage: ./monitor/scanner.sh [scan_type] [--dry-run]
#   scan_type: full | models | patterns | releases | discover
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REFERENCE_SCANNER="$PROJECT_ROOT/aiStrat/monitor/scanner.sh"

# Use our state management
export SCANNER_STATE_FILE="$SCRIPT_DIR/state.json"
export MONITOR_DIR="$SCRIPT_DIR"
source "$SCRIPT_DIR/scanner-state.sh"

# Ensure state is initialized
scanner_state_init

SCAN_TYPE="${1:-full}"
DRY_RUN=false
if [ "${2:-}" = "--dry-run" ] || [ "${1:-}" = "--dry-run" ]; then
  DRY_RUN=true
  if [ "${1:-}" = "--dry-run" ]; then SCAN_TYPE="full"; fi
fi

# Validate scan type
case "$SCAN_TYPE" in
  full|models|patterns|releases|discover) ;;
  *)
    echo "Invalid scan type: $SCAN_TYPE"
    echo "Valid types: full, models, patterns, releases, discover"
    exit 1
    ;;
esac

echo "Scanner: type=$SCAN_TYPE dry_run=$DRY_RUN"

# Ensure digests directory exists
mkdir -p "$SCRIPT_DIR/digests"

# Run the reference scanner if available
if [ -f "$REFERENCE_SCANNER" ]; then
  # The reference scanner writes to its own state/digest paths.
  # We override the paths via environment to use our monitor/ directory.
  export MONITOR_DIR="$SCRIPT_DIR"
  export STATE_FILE="$SCRIPT_DIR/state.json"
  export DIGESTS_DIR="$SCRIPT_DIR/digests"

  if [ "$DRY_RUN" = true ]; then
    bash "$REFERENCE_SCANNER" "$SCAN_TYPE" --dry-run 2>&1 || true
  else
    bash "$REFERENCE_SCANNER" "$SCAN_TYPE" 2>&1 || true
  fi

  # Record scan in our state management
  local_status="success"
  local_findings=0
  local_high=0

  # Count findings from digest if generated
  TODAY=$(date -u +%Y-%m-%d)
  DIGEST_FILE="$SCRIPT_DIR/digests/${TODAY}.md"
  if [ -f "$DIGEST_FILE" ]; then
    local_findings=$(grep -c '^\- ' "$DIGEST_FILE" 2>/dev/null || echo "0")
    local_high=$(grep -ci 'HIGH' "$DIGEST_FILE" 2>/dev/null || echo "0")
  fi

  if [ "$DRY_RUN" = false ]; then
    record_scan "$SCAN_TYPE" "$local_status" "$local_findings" "$local_high" "$DIGEST_FILE"
  fi
else
  echo "Reference scanner not found at $REFERENCE_SCANNER"
  echo "Running minimal scan..."

  # Minimal scan: check GitHub for notable releases
  if command -v gh >/dev/null 2>&1; then
    echo ""
    echo "Checking recent releases for watched repos..."
    WATCHED_REPOS=$(get_watchlist 2>/dev/null | jq -r '.repos[]? // empty' 2>/dev/null || echo "")

    findings=0
    for repo in $WATCHED_REPOS; do
      latest=$(gh release list -R "$repo" -L 1 --json tagName,publishedAt 2>/dev/null || echo "[]")
      tag=$(echo "$latest" | jq -r '.[0].tagName // "none"' 2>/dev/null | tr -d '\r')
      if [ "$tag" != "none" ]; then
        if ! is_known_version "$repo" "$tag"; then
          echo "  NEW: $repo → $tag"
          findings=$((findings + 1))
          if [ "$DRY_RUN" = false ]; then
            update_source "$repo" "$tag" "framework"
          fi
        fi
      fi
    done

    if [ "$DRY_RUN" = false ]; then
      record_scan "$SCAN_TYPE" "success" "$findings" 0 ""
    fi

    echo "Scan complete: $findings new findings"
  else
    echo "gh CLI not available — no scan sources accessible"
    if [ "$DRY_RUN" = false ]; then
      record_scan "$SCAN_TYPE" "failed" 0 0 ""
    fi
  fi
fi
