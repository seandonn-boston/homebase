#!/bin/bash
# Admiral Adoption Trend Monitor
# Orchestrates the scoring → snapshot → diff → alert pipeline.
#
# Usage:
#   ./monitor.sh --quarterly     Full re-score with snapshot and diff against last quarter
#   ./monitor.sh --monthly       Re-score top 50 prospects only, diff against last month
#   ./monitor.sh --check         Show what would run without executing
#
# Requires: jq, score.sh, snapshot.sh, diff.sh, generate-reports.sh
#
# Cadence (from README):
#   Quarterly: Full re-score when new earnings data available
#   Monthly: Top 50 prospects re-scored on news signals
#   Alerts: Sector shifts (±10 pts), company jumps (±15 pts), walk-away patterns (>30% of sector)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIM_DIR="$(dirname "$SCRIPT_DIR")"

RESULTS_DIR="$SIM_DIR/results"
CURRENT_DIR="$RESULTS_DIR/current"
HISTORY_DIR="$RESULTS_DIR/history"
ALERTS_DIR="$RESULTS_DIR/alerts"

MODE=""
DRY_RUN=false

usage() {
    echo "Usage: $0 [--quarterly | --monthly | --check]"
    echo ""
    echo "Options:"
    echo "  --quarterly   Full re-score, snapshot, diff, and report generation"
    echo "  --monthly     Top 50 prospects re-score and diff"
    echo "  --check       Show pipeline status without executing"
    echo "  --help        Show this help"
    exit 0
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --quarterly) MODE="quarterly"; shift ;;
        --monthly) MODE="monthly"; shift ;;
        --check) DRY_RUN=true; MODE="check"; shift ;;
        --help) usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

if [[ -z "$MODE" ]]; then
    echo "ERROR: Specify --quarterly, --monthly, or --check" >&2
    usage
fi

mkdir -p "$ALERTS_DIR"

# Find the most recent snapshot for diffing
find_latest_snapshot() {
    if [[ -d "$HISTORY_DIR" ]]; then
        ls -1d "$HISTORY_DIR"/*/ 2>/dev/null | sort | tail -1
    fi
}

LATEST_SNAPSHOT=$(find_latest_snapshot)
DATE_LABEL="$(date -u +%Y%m%d)"

# === CHECK MODE ===
if [[ "$MODE" == "check" ]]; then
    echo "Admiral Adoption Monitor — Pipeline Status"
    echo "---"
    echo "Current results: $(ls "$CURRENT_DIR"/S*.json 2>/dev/null | wc -l) scenario files"
    echo "Snapshots: $(ls -1d "$HISTORY_DIR"/*/ 2>/dev/null | wc -l) saved"
    echo "Latest snapshot: ${LATEST_SNAPSHOT:-none}"
    echo "Alerts: $(ls "$ALERTS_DIR"/*.md 2>/dev/null | wc -l) files"
    echo ""
    echo "Data freshness:"
    if [[ -f "$SIM_DIR/data/fortune500.json" ]]; then
        COMPANY_COUNT=$(jq 'length' "$SIM_DIR/data/fortune500.json")
        LATEST_DATE=$(jq -r '[.[].data_date] | sort | last' "$SIM_DIR/data/fortune500.json")
        echo "  Companies: $COMPANY_COUNT"
        echo "  Latest data date: $LATEST_DATE"
    fi
    echo ""
    echo "To run: $0 --quarterly (full) or $0 --monthly (top 50)"
    exit 0
fi

# === QUARTERLY MODE ===
if [[ "$MODE" == "quarterly" ]]; then
    echo "Admiral Adoption Monitor — Quarterly Full Re-Score"
    echo "Date: $DATE_LABEL"
    echo "==="
    echo ""

    # Step 1: Run full scoring engine with snapshot
    echo "[1/4] Scoring all companies across all scenarios..."
    "$SCRIPT_DIR/score.sh" --snapshot
    echo ""

    # Step 2: Generate reports
    echo "[2/4] Generating reports..."
    "$SCRIPT_DIR/generate-reports.sh"
    echo ""

    # Step 3: Diff against last snapshot
    NEW_SNAPSHOT=$(find_latest_snapshot)
    if [[ -n "$LATEST_SNAPSHOT" && "$LATEST_SNAPSHOT" != "$NEW_SNAPSHOT" ]]; then
        echo "[3/4] Comparing against previous snapshot: $(basename "$LATEST_SNAPSHOT")"
        DIFF_OUTPUT=$("$SCRIPT_DIR/diff.sh" "$LATEST_SNAPSHOT" "$NEW_SNAPSHOT" 2>&1)
        echo "$DIFF_OUTPUT"

        # Save diff as alert if there are changes
        echo "$DIFF_OUTPUT" > "$ALERTS_DIR/quarterly-diff-${DATE_LABEL}.md"
        echo "  Diff saved to: alerts/quarterly-diff-${DATE_LABEL}.md"
    else
        echo "[3/4] No previous snapshot to diff against (first run)"
    fi

    echo ""
    echo "[4/4] Pipeline complete."
    echo ""
    echo "Outputs:"
    echo "  Results:  results/current/S*.json"
    echo "  Reports:  reports/sector-summary.md, top-prospects.md, deal-walkaway-analysis.md"
    echo "  Snapshot: results/history/$(basename "${NEW_SNAPSHOT:-$DATE_LABEL}")/"
    echo "  Alerts:   results/alerts/"
fi

# === MONTHLY MODE ===
if [[ "$MODE" == "monthly" ]]; then
    echo "Admiral Adoption Monitor — Monthly Top-Prospect Re-Score"
    echo "Date: $DATE_LABEL"
    echo "==="
    echo ""

    # Get top 50 tickers from baseline results
    if [[ ! -f "$CURRENT_DIR/S1-BASELINE.json" ]]; then
        echo "ERROR: No baseline results. Run --quarterly first." >&2
        exit 1
    fi

    TOP_TICKERS=$(jq -r '[sort_by(-.final_score) | .[:50] | .[].ticker] | join(",")' "$CURRENT_DIR/S1-BASELINE.json")
    echo "Re-scoring top 50 prospects from baseline..."
    echo ""

    # Save current results as pre-monthly snapshot
    MONTHLY_SNAP="$HISTORY_DIR/monthly-${DATE_LABEL}-pre"
    mkdir -p "$MONTHLY_SNAP"
    cp "$CURRENT_DIR"/S*.json "$MONTHLY_SNAP/"

    # Re-score each top company across all scenarios
    # (In a real pipeline, you'd update the company data first with new signals)
    echo "[1/3] Re-scoring..."
    "$SCRIPT_DIR/score.sh" --snapshot
    echo ""

    # Diff
    echo "[2/3] Comparing against pre-monthly snapshot..."
    DIFF_OUTPUT=$("$SCRIPT_DIR/diff.sh" "$MONTHLY_SNAP" "$CURRENT_DIR" --alerts-only 2>&1)
    echo "$DIFF_OUTPUT"

    if [[ -n "$DIFF_OUTPUT" ]]; then
        echo "$DIFF_OUTPUT" > "$ALERTS_DIR/monthly-diff-${DATE_LABEL}.md"
    fi

    echo ""
    echo "[3/3] Monthly check complete."
    echo "  Note: To see meaningful monthly diffs, update company data (fortune500.json)"
    echo "  with new signals before running --monthly."
fi
