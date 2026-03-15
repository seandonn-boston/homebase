#!/bin/bash
# Admiral Adoption Data Preprocessor
# Converts raw Fortune 500 company data into scored format for the scoring engine.
#
# Usage: ./preprocess.sh [--input data/fortune500.json] [--output data/fortune500-scored.json]
#
# Requires: jq
# Input: Raw company profiles with financial data, signals, and metadata
# Output: Scored profiles with 0-100 scores for each adoption factor

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SIM_DIR="$(dirname "$SCRIPT_DIR")"

INPUT_FILE="$SIM_DIR/data/fortune500.json"
OUTPUT_FILE="$SIM_DIR/data/fortune500-scored.json"

while [[ $# -gt 0 ]]; do
    case $1 in
        --input) INPUT_FILE="$2"; shift 2 ;;
        --output) OUTPUT_FILE="$2"; shift 2 ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

if [[ ! -f "$INPUT_FILE" ]]; then
    echo "ERROR: Input file not found: $INPUT_FILE" >&2
    exit 1
fi

echo "Preprocessing: $INPUT_FILE → $OUTPUT_FILE"

jq '
# Sector regulatory pressure mapping
def sector_regulatory_pressure:
    {
        "Financials": 85,
        "Health Care": 80,
        "Energy": 60,
        "Communication Services": 50,
        "Industrials": 45,
        "Consumer Staples": 35,
        "Consumer Discretionary": 30,
        "Information Technology": 25,
        "Materials": 40,
        "Utilities": 55,
        "Real Estate": 35
    };

# Score AI investment intensity (0-100) from ai_capex, ai_mentions, revenue
def score_ai_investment:
    (if .ai_capex_2025 != null and .revenue_2025 != null and .revenue_2025 > 0 then
        ((.ai_capex_2025 / .revenue_2025 * 100) |
            if . > 20 then 95
            elif . > 10 then 85
            elif . > 5 then 75
            elif . > 2 then 65
            elif . > 1 then 55
            elif . > 0.5 then 45
            else 35 end)
    else
        # Fall back to ai_mentions_earnings
        (if .ai_mentions_earnings == "many" then 70
        elif .ai_mentions_earnings == "moderate" then 50
        elif .ai_mentions_earnings == "some" then 35
        elif .ai_mentions_earnings == "few" then 20
        elif .ai_mentions_earnings == "none" then 5
        else 30 end)
    end);

# Score engineering scale (0-100) from engineering headcount
def score_engineering_scale:
    (if .engineering_headcount_est == null then 20
    elif .engineering_headcount_est > 50000 then 95
    elif .engineering_headcount_est > 20000 then 85
    elif .engineering_headcount_est > 10000 then 75
    elif .engineering_headcount_est > 5000 then 65
    elif .engineering_headcount_est > 2000 then 55
    elif .engineering_headcount_est > 1000 then 45
    elif .engineering_headcount_est > 500 then 35
    else 20 end);

# Score cloud maturity (0-100) from cloud_provider
def score_cloud_maturity:
    (if .cloud_provider == "multi" then 80
    elif .cloud_provider == "AWS" then 75
    elif .cloud_provider == "Azure" then 75
    elif .cloud_provider == "GCP" then 75
    elif .cloud_provider == "unknown" or .cloud_provider == null then 30
    else 50 end);

# Score governance posture (0-100) from governance_signals array
def score_governance_posture:
    ((.governance_signals // []) | length) as $sig_count |
    (if $sig_count >= 5 then 85
    elif $sig_count >= 3 then 70
    elif $sig_count >= 2 then 55
    elif $sig_count >= 1 then 40
    else 15 end);

# Score agent tooling (0-100) from agent_tooling_signals array
def score_agent_tooling:
    ((.agent_tooling_signals // []) | length) as $sig_count |
    (if $sig_count >= 5 then 90
    elif $sig_count >= 3 then 70
    elif $sig_count >= 2 then 55
    elif $sig_count >= 1 then 40
    else 0 end);

# Score build vs buy (0-100) — higher = more likely to BUY (better for Admiral)
def score_build_vs_buy:
    (if .build_vs_buy == "buy" then 80
    elif .build_vs_buy == "neutral" then 50
    elif .build_vs_buy == "build" then 20
    else 40 end);

# Score budget availability (0-100) from tech_spend_pct and operating_margin_pct
def score_budget:
    ((.tech_spend_pct // 2) * 8 + ((.operating_margin_pct // 5) * 2)) |
    if . > 100 then 100 elif . < 0 then 0 else (. | floor) end;

# Determine has_platform_team
def has_platform_team:
    (.engineering_headcount_est // 0) > 5000;

# Determine governance_type
def governance_type:
    ((.governance_signals // []) | length) as $sig_count |
    if $sig_count >= 3 then "operational"
    elif $sig_count >= 1 then "compliance-focused"
    else "compliance-only" end;

# Determine open_source_preference — only true if company explicitly signals OSS-only tooling preference
# This requires explicit "open-source only" or "OSS-only" language, not just mentions of open-source projects
# Companies that BUILD open-source tools (Meta/Llama, Google/TF) are not OSS-only consumers
def open_source_preference:
    false;

[.[] | {
    company: .company,
    ticker: .ticker,
    sector: .sector,
    fortune_500_rank: .fortune_500_rank,
    revenue_2025: .revenue_2025,
    headcount: .headcount,
    engineering_headcount_est: .engineering_headcount_est,
    cloud_provider: .cloud_provider,
    agent_tooling_signals: .agent_tooling_signals,
    governance_signals: .governance_signals,
    data_source: .data_source,
    data_date: .data_date,
    scores: {
        ai_investment_intensity: score_ai_investment,
        engineering_scale: score_engineering_scale,
        cloud_maturity: score_cloud_maturity,
        governance_posture: score_governance_posture,
        regulatory_pressure: (sector_regulatory_pressure[.sector] // 30),
        agent_tooling: score_agent_tooling,
        build_vs_buy: score_build_vs_buy,
        budget_availability: score_budget
    },
    has_platform_team: has_platform_team,
    governance_type: governance_type,
    open_source_preference: open_source_preference
}]
' "$INPUT_FILE" > "$OUTPUT_FILE"

COUNT=$(jq 'length' "$OUTPUT_FILE")
echo "Preprocessed $COUNT companies → $OUTPUT_FILE"

# Show score distribution summary
echo ""
echo "Score Distribution Summary:"
jq -r '
    def avg: add / length | . * 10 | round / 10;
    "  AI Investment:    min=" + ([.[].scores.ai_investment_intensity] | min | tostring) + " max=" + ([.[].scores.ai_investment_intensity] | max | tostring) + " avg=" + ([.[].scores.ai_investment_intensity] | avg | tostring) +
    "\n  Engineering Scale: min=" + ([.[].scores.engineering_scale] | min | tostring) + " max=" + ([.[].scores.engineering_scale] | max | tostring) + " avg=" + ([.[].scores.engineering_scale] | avg | tostring) +
    "\n  Cloud Maturity:    min=" + ([.[].scores.cloud_maturity] | min | tostring) + " max=" + ([.[].scores.cloud_maturity] | max | tostring) + " avg=" + ([.[].scores.cloud_maturity] | avg | tostring) +
    "\n  Governance:        min=" + ([.[].scores.governance_posture] | min | tostring) + " max=" + ([.[].scores.governance_posture] | max | tostring) + " avg=" + ([.[].scores.governance_posture] | avg | tostring) +
    "\n  Regulatory Press.: min=" + ([.[].scores.regulatory_pressure] | min | tostring) + " max=" + ([.[].scores.regulatory_pressure] | max | tostring) + " avg=" + ([.[].scores.regulatory_pressure] | avg | tostring) +
    "\n  Agent Tooling:     min=" + ([.[].scores.agent_tooling] | min | tostring) + " max=" + ([.[].scores.agent_tooling] | max | tostring) + " avg=" + ([.[].scores.agent_tooling] | avg | tostring) +
    "\n  Build vs Buy:      min=" + ([.[].scores.build_vs_buy] | min | tostring) + " max=" + ([.[].scores.build_vs_buy] | max | tostring) + " avg=" + ([.[].scores.build_vs_buy] | avg | tostring) +
    "\n  Budget:            min=" + ([.[].scores.budget_availability] | min | tostring) + " max=" + ([.[].scores.budget_availability] | max | tostring) + " avg=" + ([.[].scores.budget_availability] | avg | tostring)
' "$OUTPUT_FILE"
