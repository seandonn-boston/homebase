#!/bin/bash
# Admiral Adoption Report Generator
# Generates sector summaries, prospect rankings, and walk-away analysis from scored results.
#
# Usage: ./generate-reports.sh [--scenario S1-BASELINE]
#
# Requires: jq
# Input: results/current/S*.json
# Output: reports/sector-summary.md, reports/top-prospects.md, reports/deal-walkaway-analysis.md

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIM_DIR="$(dirname "$SCRIPT_DIR")"

RESULTS_DIR="$SIM_DIR/results/current"
REPORTS_DIR="$SIM_DIR/reports"
TIMESTAMP="$(date -u +%Y-%m-%d)"

mkdir -p "$REPORTS_DIR"

if [[ ! -d "$RESULTS_DIR" ]] || [[ -z "$(ls "$RESULTS_DIR"/S*.json 2>/dev/null)" ]]; then
    echo "ERROR: No results found in $RESULTS_DIR. Run score.sh first." >&2
    exit 1
fi

echo "Generating reports from: $RESULTS_DIR"

# ===== SECTOR SUMMARY =====
cat > "$REPORTS_DIR/sector-summary.md" << HEADER
# Sector-Level Adoption Analysis

**Generated:** $TIMESTAMP
**Data Source:** Fortune 500 company profiles scored across 7 scenarios
**Methodology:** See scoring/adoption-model.md

---

## Sector Rankings by Scenario

HEADER

for result_file in "$RESULTS_DIR"/S*.json; do
    scenario_id=$(basename "$result_file" .json)

    cat >> "$REPORTS_DIR/sector-summary.md" << EOF
### $scenario_id

| Sector | Avg Score | Companies | Strong | Moderate | Conditional | Unlikely | Walk-Away |
|---|---|---|---|---|---|---|---|
EOF

    jq -r '
        group_by(.sector) |
        map({
            sector: .[0].sector,
            avg: ([.[].final_score] | add / length | . * 10 | round / 10),
            count: length,
            strong: [.[] | select(.tier == "strong-prospect")] | length,
            moderate: [.[] | select(.tier == "moderate-prospect")] | length,
            conditional: [.[] | select(.tier == "conditional")] | length,
            unlikely: [.[] | select(.tier == "unlikely")] | length,
            walkaway: [.[] | select(.tier == "walk-away")] | length
        }) |
        sort_by(-.avg) |
        .[] |
        "| \(.sector) | \(.avg) | \(.count) | \(.strong) | \(.moderate) | \(.conditional) | \(.unlikely) | \(.walkaway) |"
    ' "$result_file" >> "$REPORTS_DIR/sector-summary.md"

    echo "" >> "$REPORTS_DIR/sector-summary.md"
done

echo "  → reports/sector-summary.md"

# ===== TOP PROSPECTS =====
cat > "$REPORTS_DIR/top-prospects.md" << HEADER
# Top Prospects — Admiral Adoption

**Generated:** $TIMESTAMP
**Methodology:** Companies ranked by adoption likelihood score (0-100)
**Data:** Confirmed 2025 financials only — no projections

---

HEADER

for result_file in "$RESULTS_DIR"/S*.json; do
    scenario_id=$(basename "$result_file" .json)

    cat >> "$REPORTS_DIR/top-prospects.md" << EOF
## $scenario_id

### Top 20 Prospects

| Rank | Company | Ticker | Sector | Score | Tier |
|---|---|---|---|---|---|
EOF

    jq -r '
        sort_by(-.final_score) |
        to_entries |
        .[:20] |
        .[] |
        "| \(.key + 1) | \(.value.company) | \(.value.ticker) | \(.value.sector) | \(.value.final_score) | \(.value.tier) |"
    ' "$result_file" >> "$REPORTS_DIR/top-prospects.md"

    echo "" >> "$REPORTS_DIR/top-prospects.md"

    cat >> "$REPORTS_DIR/top-prospects.md" << EOF
### Bottom 10 (Most Likely Walk-Aways)

| Rank | Company | Ticker | Sector | Score | Tier | Walk-Away Reasons |
|---|---|---|---|---|---|---|
EOF

    jq -r '
        sort_by(.final_score) |
        .[:10] |
        .[] |
        "| - | \(.company) | \(.ticker) | \(.sector) | \(.final_score) | \(.tier) | \(.walkaway_reasons | join("; ")) |"
    ' "$result_file" >> "$REPORTS_DIR/top-prospects.md"

    echo "" >> "$REPORTS_DIR/top-prospects.md"
    echo "---" >> "$REPORTS_DIR/top-prospects.md"
    echo "" >> "$REPORTS_DIR/top-prospects.md"
done

echo "  → reports/top-prospects.md"

# ===== WALK-AWAY ANALYSIS =====
cat > "$REPORTS_DIR/deal-walkaway-analysis.md" << HEADER
# Deal Walk-Away Analysis

**Generated:** $TIMESTAMP
**Purpose:** Understanding where Admiral ISN'T needed is as important as understanding where it is.

This report documents the most common walk-away patterns, which companies would never adopt Admiral, and what (if anything) would change their mind.

---

## Walk-Away Factor Distribution (Baseline Scenario)

HEADER

BASELINE_FILE="$RESULTS_DIR/S1-BASELINE.json"
if [[ -f "$BASELINE_FILE" ]]; then
    cat >> "$REPORTS_DIR/deal-walkaway-analysis.md" << EOF
| Walk-Away Factor | Companies Affected | % of Total |
|---|---|---|
EOF

    TOTAL=$(jq 'length' "$BASELINE_FILE")

    # Count each walkaway factor
    for factor in "Build internally" "No agents" "Compliance-only" "Open-source only"; do
        COUNT=$(jq "[.[] | select(.walkaway_reasons[] | contains(\"$factor\"))] | length" "$BASELINE_FILE")
        PCT=$(echo "scale=1; $COUNT * 100 / $TOTAL" | bc 2>/dev/null || echo "N/A")
        echo "| $factor | $COUNT | ${PCT}% |" >> "$REPORTS_DIR/deal-walkaway-analysis.md"
    done

    echo "" >> "$REPORTS_DIR/deal-walkaway-analysis.md"

    # Sector-level walkaway patterns
    cat >> "$REPORTS_DIR/deal-walkaway-analysis.md" << EOF
## Walk-Away Patterns by Sector

| Sector | Walk-Away Count | % Walk-Away | Dominant Factor |
|---|---|---|---|
EOF

    jq -r '
        group_by(.sector) |
        map({
            sector: .[0].sector,
            total: length,
            walkaways: [.[] | select(.tier == "walk-away")] | length,
            pct: (([.[] | select(.tier == "walk-away")] | length) * 100 / length | . * 10 | round / 10)
        }) |
        sort_by(-.pct) |
        .[] |
        "| \(.sector) | \(.walkaways)/\(.total) | \(.pct)% | — |"
    ' "$BASELINE_FILE" >> "$REPORTS_DIR/deal-walkaway-analysis.md"

    echo "" >> "$REPORTS_DIR/deal-walkaway-analysis.md"
fi

# Cross-scenario comparison
cat >> "$REPORTS_DIR/deal-walkaway-analysis.md" << EOF
## Cross-Scenario Walk-Away Comparison

Companies that are walk-aways across ALL scenarios are structurally incompatible with Admiral.
Companies that are walk-aways in some scenarios but prospects in others are timing-dependent.

| Company | Baseline | Regulatory | Agent Explosion | Budget Crunch | Competitor | Incident | Walk-Away |
|---|---|---|---|---|---|---|---|
EOF

# Get unique company list from baseline
if [[ -f "$BASELINE_FILE" ]]; then
    jq -r '.[].company' "$BASELINE_FILE" | sort -u | while read -r company; do
        ROW="| $company"
        for sid in S1-BASELINE S2-REGULATORY S3-AGENT-EXPLOSION S4-BUDGET-CRUNCH S5-COMPETITOR-CAPTURE S6-INCIDENT-CATALYST S7-WALK-AWAY; do
            sf="$RESULTS_DIR/${sid}.json"
            if [[ -f "$sf" ]]; then
                SCORE=$(jq -r ".[] | select(.company == \"$company\") | .final_score" "$sf" 2>/dev/null || echo "—")
                ROW="$ROW | $SCORE"
            else
                ROW="$ROW | —"
            fi
        done
        ROW="$ROW |"
        echo "$ROW" >> "$REPORTS_DIR/deal-walkaway-analysis.md"
    done
fi

cat >> "$REPORTS_DIR/deal-walkaway-analysis.md" << EOF

---

## Structural vs. Temporal Walk-Aways

### Structural (Cannot be overcome by market conditions)
- Companies that build all infrastructure internally AND have >10,000 engineers
- Companies in sectors with zero AI agent adoption signals
- Companies with no technology budget flexibility

### Temporal (Will change with market conditions)
- Companies waiting for regulatory clarity (will adopt under S2/S6)
- Companies in budget-constrained mode (will adopt when budgets loosen)
- Companies using basic governance from platform vendors (may upgrade when needs exceed platform capabilities)

### What Would Change Their Mind
- **Build-internally companies:** A public failure of their internal governance + competitor advantage from Admiral adoption
- **No-agents companies:** Market shift making agent fleets standard (2-3 years out)
- **Compliance-only companies:** Regulation mandating operational AI governance (S2 scenario)
- **OSS-only companies:** Admiral open-sources the core with paid enterprise features
EOF

echo "  → reports/deal-walkaway-analysis.md"
echo ""
echo "All reports generated."
