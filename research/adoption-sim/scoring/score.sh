#!/bin/bash
# Admiral Adoption Scoring Engine
# Computes adoption likelihood scores for Fortune 500 companies across scenarios.
#
# Usage: ./score.sh [--scenario S1-BASELINE] [--company TICKER] [--output results/current/]
#
# Requires: jq
# Input: data/fortune500.json, scenarios/scenario-definitions.json, scoring/weights.json
# Output: JSON scored results

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIM_DIR="$(dirname "$SCRIPT_DIR")"

DATA_FILE="$SIM_DIR/data/fortune500.json"
SCENARIOS_FILE="$SIM_DIR/scenarios/scenario-definitions.json"
WEIGHTS_FILE="$SCRIPT_DIR/weights.json"

SCENARIO_FILTER=""
COMPANY_FILTER=""
OUTPUT_DIR="$SIM_DIR/results/current"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"

usage() {
    echo "Usage: $0 [--scenario SCENARIO_ID] [--company TICKER] [--output DIR]"
    echo ""
    echo "Options:"
    echo "  --scenario ID    Score only this scenario (default: all)"
    echo "  --company TICKER Score only this company (default: all)"
    echo "  --output DIR     Output directory (default: results/current/)"
    echo "  --snapshot       Also save to results/history/ with timestamp"
    echo "  --help           Show this help"
    exit 0
}

SNAPSHOT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --scenario) SCENARIO_FILTER="$2"; shift 2 ;;
        --company) COMPANY_FILTER="$2"; shift 2 ;;
        --output) OUTPUT_DIR="$2"; shift 2 ;;
        --snapshot) SNAPSHOT=true; shift ;;
        --help) usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

# Validate inputs
for f in "$DATA_FILE" "$SCENARIOS_FILE" "$WEIGHTS_FILE"; do
    if [[ ! -f "$f" ]]; then
        echo "ERROR: Required file not found: $f" >&2
        exit 1
    fi
done

if ! command -v jq &>/dev/null; then
    echo "ERROR: jq is required but not installed" >&2
    exit 1
fi

mkdir -p "$OUTPUT_DIR"

# Load weights
WEIGHTS=$(cat "$WEIGHTS_FILE")

# Score a single company against a single scenario
score_company() {
    local company="$1"
    local scenario="$2"

    # Extract company fields
    local ai_inv=$(echo "$company" | jq -r '.scores.ai_investment_intensity // 0')
    local eng_scale=$(echo "$company" | jq -r '.scores.engineering_scale // 0')
    local cloud=$(echo "$company" | jq -r '.scores.cloud_maturity // 0')
    local gov=$(echo "$company" | jq -r '.scores.governance_posture // 0')
    local reg=$(echo "$company" | jq -r '.scores.regulatory_pressure // 0')
    local agent=$(echo "$company" | jq -r '.scores.agent_tooling // 0')
    local bvb=$(echo "$company" | jq -r '.scores.build_vs_buy // 0')
    local budget=$(echo "$company" | jq -r '.scores.budget_availability // 0')

    # Extract scenario modifiers
    local scenario_id=$(echo "$scenario" | jq -r '.scenario_id')
    local reg_boost=$(echo "$WEIGHTS" | jq -r ".scenario_modifiers[\"$scenario_id\"].regulatory_pressure_boost // 0")
    local urg_boost=$(echo "$WEIGHTS" | jq -r ".scenario_modifiers[\"$scenario_id\"].urgency_boost // 0")

    # Apply regulatory boost (clamped to 100)
    local reg_adjusted=$((reg + reg_boost))
    if [[ $reg_adjusted -gt 100 ]]; then reg_adjusted=100; fi
    if [[ $reg_adjusted -lt 0 ]]; then reg_adjusted=0; fi

    # Compute weighted base score (using integer math, multiply by 100 for precision)
    local base_x100=$(( (ai_inv * 20) + (eng_scale * 15) + (cloud * 10) + (gov * 15) + (reg_adjusted * 15) + (agent * 10) + (bvb * 10) + (budget * 5) ))
    local base=$((base_x100 / 100))

    # Apply urgency boost
    local adjusted=$((base + urg_boost))

    # Apply walk-away deductions
    local walkaway=0
    local walkaway_reasons="[]"

    local eng_est=$(echo "$company" | jq -r '.engineering_headcount_est // 0')
    local has_platform=$(echo "$company" | jq -r '.has_platform_team // false')
    if [[ $eng_est -gt 5000 ]] && [[ "$has_platform" == "true" ]]; then
        walkaway=$((walkaway + 30))
        walkaway_reasons=$(echo "$walkaway_reasons" | jq '. + ["Build internally (-30): >5000 engineers with platform team"]')
    fi

    if [[ $agent -eq 0 ]]; then
        walkaway=$((walkaway + 40))
        walkaway_reasons=$(echo "$walkaway_reasons" | jq '. + ["No agents (-40): Zero agent tooling signals"]')
    fi

    local gov_type=$(echo "$company" | jq -r '.governance_type // "unknown"')
    if [[ "$gov_type" == "compliance-only" ]]; then
        # Reduced in regulatory scenarios
        if [[ "$scenario_id" == "S2-REGULATORY" ]] || [[ "$scenario_id" == "S6-INCIDENT-CATALYST" ]]; then
            walkaway=$((walkaway + 10))
            walkaway_reasons=$(echo "$walkaway_reasons" | jq '. + ["Compliance-only governance (-10, reduced by regulatory pressure)"]')
        else
            walkaway=$((walkaway + 20))
            walkaway_reasons=$(echo "$walkaway_reasons" | jq '. + ["Compliance-only governance (-20): No operational governance posture"]')
        fi
    fi

    local oss_only=$(echo "$company" | jq -r '.open_source_preference // false')
    if [[ "$oss_only" == "true" ]]; then
        walkaway=$((walkaway + 15))
        walkaway_reasons=$(echo "$walkaway_reasons" | jq '. + ["Open-source only (-15): Prefers free/OSS AI tools"]')
    fi

    # Final score (clamped)
    local final=$((adjusted - walkaway))
    if [[ $final -gt 100 ]]; then final=100; fi
    if [[ $final -lt 0 ]]; then final=0; fi

    # Determine tier
    local tier="walk-away"
    if [[ $final -ge 80 ]]; then tier="strong-prospect"
    elif [[ $final -ge 60 ]]; then tier="moderate-prospect"
    elif [[ $final -ge 40 ]]; then tier="conditional"
    elif [[ $final -ge 20 ]]; then tier="unlikely"
    fi

    # Output result
    jq -n \
        --arg company "$(echo "$company" | jq -r '.company')" \
        --arg ticker "$(echo "$company" | jq -r '.ticker')" \
        --arg sector "$(echo "$company" | jq -r '.sector')" \
        --arg scenario_id "$scenario_id" \
        --arg scenario_name "$(echo "$scenario" | jq -r '.name')" \
        --argjson base_score "$base" \
        --argjson scenario_adjusted "$adjusted" \
        --argjson walkaway_total "$walkaway" \
        --argjson final_score "$final" \
        --arg tier "$tier" \
        --argjson walkaway_reasons "$walkaway_reasons" \
        --arg scored_at "$TIMESTAMP" \
        '{
            company: $company,
            ticker: $ticker,
            sector: $sector,
            scenario_id: $scenario_id,
            scenario_name: $scenario_name,
            base_score: $base_score,
            scenario_adjusted: $scenario_adjusted,
            walkaway_deduction: $walkaway_total,
            final_score: $final_score,
            tier: $tier,
            walkaway_reasons: $walkaway_reasons,
            scored_at: $scored_at
        }'
}

# Main scoring loop
echo "Admiral Adoption Scoring Engine v1.0.0"
echo "Timestamp: $TIMESTAMP"
echo "---"

# Build scenario list
if [[ -n "$SCENARIO_FILTER" ]]; then
    SCENARIOS=$(jq "[.[] | select(.scenario_id == \"$SCENARIO_FILTER\")]" "$SCENARIOS_FILE")
else
    SCENARIOS=$(cat "$SCENARIOS_FILE")
fi

# Build company list
if [[ -n "$COMPANY_FILTER" ]]; then
    COMPANIES=$(jq "[.[] | select(.ticker == \"$COMPANY_FILTER\")]" "$DATA_FILE")
else
    COMPANIES=$(cat "$DATA_FILE")
fi

COMPANY_COUNT=$(echo "$COMPANIES" | jq 'length')
SCENARIO_COUNT=$(echo "$SCENARIOS" | jq 'length')
echo "Scoring $COMPANY_COUNT companies across $SCENARIO_COUNT scenarios..."

# Score each scenario
echo "$SCENARIOS" | jq -c '.[]' | while read -r scenario; do
    scenario_id=$(echo "$scenario" | jq -r '.scenario_id')
    scenario_name=$(echo "$scenario" | jq -r '.name')
    echo "  Scoring scenario: $scenario_name ($scenario_id)"

    RESULTS="[]"
    echo "$COMPANIES" | jq -c '.[]' | while read -r company; do
        result=$(score_company "$company" "$scenario")
        echo "$result"
    done | jq -s '.' > "$OUTPUT_DIR/${scenario_id}.json"

    echo "    → $OUTPUT_DIR/${scenario_id}.json"
done

# Generate summary
echo "---"
echo "Generating summary..."

for result_file in "$OUTPUT_DIR"/S*.json; do
    if [[ ! -f "$result_file" ]]; then continue; fi
    scenario_id=$(basename "$result_file" .json)
    echo ""
    echo "=== $scenario_id ==="

    # Top 10 by score
    echo "  Top 10:"
    jq -r '.[] | "    \(.final_score)\t\(.tier)\t\(.company)"' "$result_file" | sort -rn | head -10

    # Bottom 5
    echo "  Bottom 5 (Walk-Aways):"
    jq -r '.[] | "    \(.final_score)\t\(.tier)\t\(.company)"' "$result_file" | sort -n | head -5

    # Sector averages
    echo "  Sector Averages:"
    jq -r '[group_by(.sector)[] | {sector: .[0].sector, avg: ([.[].final_score] | add / length | . * 10 | floor / 10)}] | sort_by(-.avg) | .[] | "    \(.avg)\t\(.sector)"' "$result_file"
done

# Snapshot if requested
if [[ "$SNAPSHOT" == "true" ]]; then
    HISTORY_DIR="$SIM_DIR/results/history/$TIMESTAMP"
    mkdir -p "$HISTORY_DIR"
    cp "$OUTPUT_DIR"/*.json "$HISTORY_DIR/"
    echo ""
    echo "Snapshot saved to: $HISTORY_DIR/"
fi

echo ""
echo "Scoring complete."
