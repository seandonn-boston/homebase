# Contributing to Helm

## Getting Started

### Prerequisites

- **Node.js 22+** (see `.nvmrc`)
- **jq** — JSON processor for hook scripts
- **shellcheck** — optional, for pre-commit hook

### Setup

```bash
git clone https://github.com/seandonn-boston/helm.git
cd helm/control-plane
npm install && npm run build && npm test
```

Run hook tests:

```bash
bash .hooks/tests/test_hooks.sh
```

Enable pre-commit hooks:

```bash
git config core.hooksPath .githooks
```

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `aiStrat/` | Framework specification (frozen — do not modify without approval) |
| `admiral/` | Admiral runtime: config, lib, standing orders, tests |
| `control-plane/` | TypeScript control plane: event stream, runaway detection, trace, HTTP server |
| `plan/` | 34-stream roadmap with ~482 work items ([index](plan/index.md), [phasing](plan/ROADMAP.md)) |
| `research/` | Market intelligence and competitive analysis |
| `thesis/` | Strategic thesis documents |
| `docs/` | Architecture decision records and documentation |
| `.hooks/` | Claude Code hook scripts implementing Standing Orders |
| `.brain/` | Brain B1 filesystem entries |
| `.githooks/` | Git hooks for the project itself |

## Development Workflow

1. **Branch naming:** `<type>/<short-description>` (e.g., `fix/promise-handling`, `feat/ring-buffer`)
2. **Commit messages:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `test:`, `ci:`, `chore:`, `refactor:`, `perf:`, `style:`
3. **PR process:** fork, branch, commit, push, open PR
4. Every bug fix must include a regression test
5. Every new feature must include tests

## Coding Standards

### TypeScript

- Strict mode (`"strict": true` in tsconfig)
- Zero runtime dependencies — only Node.js built-in modules
- Biome for formatting and linting: `npm run lint`
- File naming: `camelCase` for source, `*.test.ts` for tests
- Tests use `node:test` + `node:assert/strict`

### Bash

- POSIX-compatible where possible
- Start scripts with `set -euo pipefail`
- ShellCheck clean at `-S warning` level
- `jq` for all JSON processing
- Hook naming: `snake_case` matching `^[a-z][a-z0-9_]*$`
- Exit codes: `0` = pass, `1` = soft-fail (advisory), `2` = hard-block (enforcement)

## Testing

### TypeScript Tests

```bash
cd control-plane
npm run build && npm test
```

Tests use `node:test` with `node:assert/strict`. Files named `*.test.ts` are autodiscovered.

### Bash Tests

```bash
bash .hooks/tests/test_hooks.sh
bash admiral/tests/test_brain_b1.sh
bash admiral/tests/test_hook_sequencing.sh
bash admiral/tests/test_escalation_resolution.sh
bash admiral/tests/test_state_persistence.sh
```

## Architecture Decision Records

Key design decisions are documented in `docs/adr/`. See the ADR files for rationale behind bash hooks, zero-dependency policy, SPC anomaly detection, and fail-open philosophy.

## What Not to Do

See the **Boundaries** section in `AGENTS.md` for a complete list of restrictions. Key points:

- Do NOT modify spec files in `aiStrat/` without explicit approval
- Do NOT add runtime dependencies to control-plane
- Do NOT store secrets, credentials, or PII in any file
- Do NOT modify `.github/workflows/` without approval
- Do NOT skip tests or disable linters to make code pass
