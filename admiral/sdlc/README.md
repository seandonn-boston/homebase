# Autonomous SDLC-in-CI Loop

The SDLC loop puts the full software development lifecycle inside GitHub Actions. Labeling an issue triggers an autonomous implement → review → revise cycle, governed by Admiral Standing Orders and bounded by circuit breakers.

## Architecture

```
  ┌──────────────┐
  │ GitHub Issue  │
  │ + label:      │
  │ agent:implement
  └──────┬───────┘
         │
         ▼
  ┌──────────────────┐     ┌─────────────────┐
  │ sdlc-agent.yml   │────▶│ Circuit Breaker  │──── HALT (if tripped)
  │                  │     │ iteration cap    │
  │ • checkout       │     │ token budget     │
  │ • run claude     │     │ runaway alerts   │
  │ • commit + push  │     └─────────────────┘
  │ • create PR      │
  └──────┬───────────┘
         │ PR with label: agent:authored
         ▼
  ┌──────────────────┐
  │ sdlc-review.yml  │
  │                  │
  │ • read diff      │
  │ • run claude     │
  │ • post review    │
  └──────┬───────────┘
         │
    ┌────┴────┐
    │         │
 APPROVE   REQUEST CHANGES
    │         │
    ▼         ▼
  Done     ┌──────────────┐
  (human   │ Next iteration│──── HALT (if cap reached)
  merges   │ via workflow   │
  to main) │ dispatch       │
           └───────────────┘
```

## How to Use

### 1. Create an issue with a clear task description

The issue body becomes the agent's prompt. Be specific about what to implement.

### 2. Add the `agent:implement` label

This triggers the `sdlc-agent.yml` workflow. The agent will:
- Run the circuit breaker (checks iteration cap, token budget, runaway alerts)
- Read the issue body as its task
- Create a branch `agent/issue-{N}-iter-{M}`
- Implement the changes using Claude Code (with Standing Orders enforced via hooks)
- Commit, push, and create a PR labeled `agent:authored`

### 3. Review happens automatically

The `sdlc-review.yml` workflow fires on the PR. It:
- Evaluates the diff against SO-08 (Quality), SO-12 (Security), SO-03 (Scope)
- Posts a review: APPROVE or REQUEST_CHANGES
- If changes requested and iteration cap not reached: triggers next iteration
- If iteration cap reached: labels PR `needs-human`

### 4. Human merges to main

Agent-authored PRs are never auto-merged to main. A human must review and merge.

## Circuit Breaker

The circuit breaker (`circuit-breaker.sh`) runs before every agent invocation. It checks:

| Check | Threshold | Source |
|---|---|---|
| Iteration cap | 3 (configurable) | `loop-config.json` |
| Token budget | 100,000 per cycle | Event log (`.admiral/event_log.jsonl`) |
| Runaway alerts | 3+ policy violations | Event log |

When tripped, the breaker:
- Halts the loop
- Posts a comment on the issue explaining why
- Labels the PR `needs-human` (if in review phase)

### Configuration

Edit `admiral/sdlc/loop-config.json`:

```json
{
  "max_iterations": 3,
  "token_budget_per_cycle": 100000,
  "require_human_merge_to_main": true,
  "auto_merge_feature_branches": true
}
```

## Prerequisites

- `ANTHROPIC_API_KEY` must be set as a GitHub Actions secret
- Claude Code hooks in `.hooks/` provide Standing Orders enforcement in CI
- The repo's `.claude/settings.local.json` configures hooks automatically

## Governance

Per AGENTS.md decision authority:

| Change | Tier |
|---|---|
| Loop config (iterations, budget) | **Propose** |
| Circuit breaker thresholds | **Escalate** |
| Adding new workflow triggers | **Escalate** |

## Monitoring

Agent sessions in CI emit events to `.admiral/event_log.jsonl`, the same format used by local sessions. The control plane (`control-plane/src/ingest.ts`) can ingest these for dashboard visibility and runaway detection via SPC control charts.
