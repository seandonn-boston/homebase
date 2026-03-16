#!/bin/bash
# Admiral Adoption Snapshot Tool
# Saves current scoring results to the history directory with a timestamp.
#
# Usage: ./snapshot.sh [--label LABEL]
#
# Creates: results/history/YYYYMMDD-LABEL/ containing copies of all current result files

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIM_DIR="$(dirname "$SCRIPT_DIR")"

CURRENT_DIR="$SIM_DIR/results/current"
HISTORY_DIR="$SIM_DIR/results/history"

LABEL=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --label) LABEL="-$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

DATE_STAMP="$(date -u +%Y%m%d)"
SNAP_DIR="$HISTORY_DIR/${DATE_STAMP}${LABEL}"

if [[ ! -d "$CURRENT_DIR" ]]; then
    echo "ERROR: No current results found at $CURRENT_DIR" >&2
    echo "Run score.sh first to generate results." >&2
    exit 1
fi

RESULT_COUNT=$(find "$CURRENT_DIR" -name "S*.json" | wc -l)
if [[ $RESULT_COUNT -eq 0 ]]; then
    echo "ERROR: No scenario result files found in $CURRENT_DIR" >&2
    exit 1
fi

mkdir -p "$SNAP_DIR"
cp "$CURRENT_DIR"/S*.json "$SNAP_DIR/"

echo "Snapshot saved: $SNAP_DIR/ ($RESULT_COUNT scenario files)"
echo "Use diff.sh to compare snapshots:"
echo "  ./scoring/diff.sh results/history/PREVIOUS results/history/${DATE_STAMP}${LABEL}"
