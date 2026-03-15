#!/bin/bash
# Admiral Adoption Trend Diff Tool
# Compares two scoring snapshots and generates alerts for significant changes.
#
# Usage: ./diff.sh <snapshot_a_dir> <snapshot_b_dir> [--alerts-only]
#
# Requires: jq
# Output: Change report with flagged trends

set -euo pipefail

if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <snapshot_a_dir> <snapshot_b_dir> [--alerts-only]"
    echo ""
    echo "Compares two scoring snapshots and identifies trend changes."
    echo "Snapshot directories should contain scenario result JSON files."
    exit 1
fi

SNAP_A="$1"
SNAP_B="$2"
ALERTS_ONLY=false
if [[ "${3:-}" == "--alerts-only" ]]; then
    ALERTS_ONLY=true
fi

# Alert thresholds
SECTOR_SHIFT_THRESHOLD=10
COMPANY_JUMP_THRESHOLD=15
WALKAWAY_PATTERN_THRESHOLD=30  # percentage of sector

echo "Admiral Adoption Trend Diff"
echo "Comparing: $(basename "$SNAP_A") → $(basename "$SNAP_B")"
echo "---"

ALERTS=0

# Process each scenario that exists in both snapshots
for scenario_file_b in "$SNAP_B"/S*.json; do
    scenario_id=$(basename "$scenario_file_b" .json)
    scenario_file_a="$SNAP_A/${scenario_id}.json"

    if [[ ! -f "$scenario_file_a" ]]; then
        echo "NEW SCENARIO: $scenario_id (no prior snapshot)"
        continue
    fi

    echo ""
    echo "=== $scenario_id ==="

    # Company-level changes
    company_changes=$(jq -n \
        --slurpfile a "$scenario_file_a" \
        --slurpfile b "$scenario_file_b" \
        '[$b[0][] as $new |
         ($a[0][] | select(.ticker == $new.ticker)) as $old |
         select($old != null) |
         {
            company: $new.company,
            ticker: $new.ticker,
            sector: $new.sector,
            old_score: $old.final_score,
            new_score: $new.final_score,
            delta: ($new.final_score - $old.final_score),
            old_tier: $old.tier,
            new_tier: $new.tier,
            tier_changed: ($old.tier != $new.tier)
         } | select(.delta != 0)]')

    # Flag company jumps
    echo "$company_changes" | jq -r --argjson threshold "$COMPANY_JUMP_THRESHOLD" \
        '.[] | select((.delta > $threshold) or (.delta < -$threshold)) |
         "  ALERT: \(.company) (\(.ticker)) \(.old_score) → \(.new_score) (Δ\(.delta)) [\(.old_tier) → \(.new_tier)]"' | while read -r line; do
        echo "$line"
        ALERTS=$((ALERTS + 1))
    done

    if [[ "$ALERTS_ONLY" != "true" ]]; then
        # Show all changes
        echo "  All changes:"
        echo "$company_changes" | jq -r \
            '.[] | "    \(.ticker)\t\(.old_score) → \(.new_score)\tΔ\(.delta)\t\(.old_tier) → \(.new_tier)"' | sort -t$'\t' -k3 -rn
    fi

    # Sector-level shifts
    echo ""
    echo "  Sector shifts:"
    sector_changes=$(jq -n \
        --slurpfile a "$scenario_file_a" \
        --slurpfile b "$scenario_file_b" \
        '[($a[0] | group_by(.sector) | map({sector: .[0].sector, old_avg: ([.[].final_score] | add / length)})) as $old_sectors |
         ($b[0] | group_by(.sector) | map({sector: .[0].sector, new_avg: ([.[].final_score] | add / length)})) as $new_sectors |
         $new_sectors[] as $new |
         ($old_sectors[] | select(.sector == $new.sector)) as $old |
         select($old != null) |
         {
            sector: $new.sector,
            old_avg: ($old.old_avg | . * 10 | floor / 10),
            new_avg: ($new.new_avg | . * 10 | floor / 10),
            delta: (($new.new_avg - $old.old_avg) | . * 10 | floor / 10)
         }]')

    echo "$sector_changes" | jq -r --argjson threshold "$SECTOR_SHIFT_THRESHOLD" \
        '.[] | if ((.delta > $threshold) or (.delta < -$threshold))
              then "    ALERT: \(.sector)\t\(.old_avg) → \(.new_avg)\tΔ\(.delta)"
              else "    \(.sector)\t\(.old_avg) → \(.new_avg)\tΔ\(.delta)"
              end'

done

echo ""
echo "---"
echo "Diff complete. Alerts flagged: use --alerts-only to see only flagged changes."
