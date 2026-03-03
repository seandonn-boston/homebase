# Continuous AI Landscape Monitor

**Automated surveillance of the AI agent ecosystem — with an immune system.**

The monitor scans GitHub for trending repositories, tracks releases across
watched repos, discovers emerging tools, and generates seed candidates for the
Brain. All external content passes through a quarantine system that detects and
neutralizes prompt injection, XSS, credential exposure, PII leaks, and other
adversarial inputs before they can reach the Brain.

## Architecture

```
                ┌──────────────────────────┐
                │    GitHub Actions         │
                │    (daily / weekly cron)  │
                └────────────┬─────────────┘
                             │
                             ▼
                ┌──────────────────────────┐
                │    scanner.py            │
                │    (orchestrator)        │
                └──┬──────────┬──────┬─────┘
                   │          │      │
          ┌────────▼──┐  ┌───▼────┐ │
          │ releases  │  │trending│ │
          │ tracker   │  │scanner │ │
          └────────┬──┘  └───┬────┘ │
                   │         │      │
                   ▼         ▼      ▼
              ┌──────────────────────────┐
              │    state.py              │
              │    (persistent memory)   │
              └──────────┬───────────────┘
                         │
              ┌──────────▼───────────────┐
              │    digest.py             │
              │    (markdown reports)    │
              ├──────────────────────────┤
              │    seed_writer.py        │
              │    (Brain candidates)    │
              └──────────┬───────────────┘
                         │
              ┌──────────▼───────────────┐
              │    quarantine.py         │
              │    (IMMUNE SYSTEM)       │
              │                          │
              │  Layer 1: Structure      │
              │  Layer 2: Injection      │
              │  Layer 3: Semantics      │
              │  Layer 4: Antibodies     │
              └──────────┬───────────────┘
                         │
                    ┌────▼─────┐
                    │  Brain   │
                    │ (safe)   │
                    └──────────┘
```

## Quick Start

```bash
# Full scan (requires gh CLI for GitHub API access)
python -m aiStrat.monitor.scanner

# Releases only
python -m aiStrat.monitor.scanner --releases

# Discovery only
python -m aiStrat.monitor.scanner --discover

# Preview without saving state
python -m aiStrat.monitor.scanner --dry-run

# Verbose output
python -m aiStrat.monitor.scanner -v
```

## The Immune System

Every piece of external content destined for the Brain passes through
`quarantine.py` — a four-layer defense system:

| Layer | What it does | Threat level |
|-------|-------------|--------------|
| **Structural** | Enforces schema, field lengths, valid categories | Rejects malformed |
| **Injection** | Scans for prompt injection, XSS, SQL injection, command injection, secrets, PII | Critical/Hostile |
| **Semantic** | Detects authority spoofing, false credentials, behavior manipulation | Hostile |
| **Antibody** | Converts attacks into Brain FAILURE entries for future defense | Learns from attacks |

When an attack is detected:
1. The entry is **rejected** (never reaches the Brain)
2. The attack's structure is **preserved in defanged form** for analysis
3. An **antibody** (FAILURE entry) is planted in the Brain
4. Future agents can learn what adversarial patterns look like

What is blocked:
- Prompt injection (instruction override, identity reassignment, jailbreaks)
- XSS (script tags, event handlers, protocol handlers)
- SQL injection (DROP TABLE, UNION SELECT, stored procedures)
- Command injection (shell commands, pipe to bash)
- Secrets (API keys, tokens, passwords, private keys, connection strings)
- PII (SSNs, email addresses, credit cards, dates of birth, addresses)
- Authority spoofing (false Admiral approval, fleet-wide directives)
- Data poisoning (behavior manipulation, fake credentials)

## Configuration

Edit `config.py` to control what the monitor tracks:

- **WATCHED_REPOS** — Specific repos to track (releases, stars, activity)
- **SEARCH_QUERIES** — GitHub search queries for discovery
- **RSS_FEEDS** — Blog and news feeds to scan
- **SETTINGS** — Thresholds, lookback windows, output paths

## GitHub Actions

The workflow in `.github/workflows/ai-monitor.yml` runs:
- **Daily** at 07:00 UTC — Standard scan
- **Weekly** on Monday at 06:00 UTC — Deep discovery scan
- **On-demand** via workflow_dispatch

High-priority findings automatically create GitHub Issues for visibility.

## Running Tests

```bash
python -m unittest aiStrat.monitor.tests.test_quarantine -v
```
