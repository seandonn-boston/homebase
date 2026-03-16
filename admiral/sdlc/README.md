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

## Identity Provenance

**Non-negotiable rule:** LLMs must never impersonate humans. Humans may impersonate agents.

Every agent action in the SDLC loop carries identity markers at three levels:

### 1. Git Identity (commit-level)

Agent commits use dedicated bot identities that are clearly non-human:

| Role | `user.name` | `user.email` |
|---|---|---|
| Implementation agent | `claude-agent[bot]` | `claude-agent[bot]@users.noreply.github.com` |
| Review agent | `claude-reviewer[bot]` | `claude-reviewer[bot]@users.noreply.github.com` |

These are set in the workflow before any git operations. `git log --format='%an <%ae>'` on any agent branch will show the bot identity.

### 2. Commit Trailer (message-level)

Every agent commit includes the trailer `Author-Type: agent` in the commit message body:

```
feat: add widget parser for issue #42

Author-Type: agent
```

This is machine-parseable via `git log --format='%(trailers:key=Author-Type)'` and enables automated auditing across the entire commit history.

### 3. PR & Review Attribution (GitHub-level)

- PRs created by agents include an **Identity Attestation** table in the body with author type, agent name, git identity, and workflow run ID
- Review comments from agents include the same attestation table
- The `agent:authored` label marks all agent-created PRs
- The GitHub Actions run ID links every PR and review to the specific CI execution

### How to Verify

```bash
# Check if a commit was authored by an agent
git log --format='%H %an' | grep 'bot]'

# Extract Author-Type trailers from commit history
git log --format='%H %(trailers:key=Author-Type,valueonly)'

# List all agent-authored PRs
gh pr list --label agent:authored
```

### Configuration

Identity settings are defined in `loop-config.json` under the `identity` key. Changes to identity policy are **Escalate-tier** — they require human approval.

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
