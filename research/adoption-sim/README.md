# Fortune 500 Adoption Simulation

**Purpose:** Data-driven simulation testing Admiral's adoption thesis against the entire Fortune 500 using confirmed 2025 financial data. No predictions — only confirmed data from 10-K filings, Q4 2025 earnings, and annual reports.

## How It Works

1. **Company profiles** (`data/fortune500.json`) contain confirmed financial and AI-related metrics for each Fortune 500 company
2. **Scenarios** (`scenarios/scenario-definitions.json`) define parameterized "what if" conditions that shift adoption likelihood
3. **Scoring engine** (`scoring/score.sh`) computes an adoption likelihood score (0-100) for each company under each scenario
4. **Reports** (`reports/`) contain sector summaries, prospect rankings, and walk-away analysis

## Data Sources

All data is sourced from confirmed public filings — no projections, no estimates beyond what companies disclose:

| Source | What It Provides |
|---|---|
| SEC EDGAR (10-K filings) | Revenue, tech spend, AI capex, headcount |
| Q4 2025 earnings transcripts | AI mentions, strategy signals, agent tooling references |
| Fortune 500 list (2025) | Company ranking, revenue, sector classification |
| GICS sector standards | Standardized sector mapping |
| Public press releases | AI deployment announcements, governance posture |

## Scoring Model

8-factor weighted model with walk-away deductions:

| Factor | Weight |
|---|---|
| AI Investment Intensity | 20% |
| Engineering Scale | 15% |
| Cloud Maturity | 10% |
| Existing Governance Posture | 15% |
| Sector Regulatory Pressure | 15% |
| Agent Tooling Signals | 10% |
| Build vs. Buy History | 10% |
| Budget Availability | 5% |

Walk-away factors reduce the score based on structural barriers.

## Trend Monitoring

- **Quarterly:** Full re-score when new earnings data available
- **Monthly:** Top 50 prospects re-scored on news signals
- **Alerts:** Sector shifts (±10 pts), company jumps (±15 pts), walk-away patterns (>30% of sector)

## Directory Structure

```
adoption-sim/
├── data/
│   ├── fortune500.json          # Company profiles
│   ├── sectors.json             # Sector-level attributes
│   └── sources/                 # Raw data references
├── scenarios/
│   ├── scenario-definitions.json
│   └── sector-scenarios/
├── scoring/
│   ├── adoption-model.md        # Methodology docs
│   ├── weights.json             # Factor weights
│   └── score.sh                 # Scoring engine
├── results/
│   ├── current/                 # Latest results
│   ├── history/                 # Timestamped snapshots
│   └── alerts/                  # Trend change flags
└── reports/
    ├── sector-summary.md
    ├── top-prospects.md
    └── deal-walkaway-analysis.md
```
