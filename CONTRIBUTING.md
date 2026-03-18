# Contributing to Homebase

Thanks for your interest in contributing to the Admiral Framework. This document covers everything you need to get started.

## Prerequisites

- Node.js 22+ (see `.nvmrc`)
- `jq` for JSON processing
- Git

## Setup

```bash
git clone https://github.com/seandonn-boston/homebase.git
cd homebase/control-plane
npm install
npm run build
npm test
```

## Development Workflow

1. Fork and clone the repo
2. Create a feature branch from `main`
3. Make your changes
4. Run the full check suite before pushing:

```bash
cd control-plane
npm run build
npm test
npm run lint
```

5. Push and open a pull request

### Running Tests

```bash
npm test                # Unit tests
npm run test:coverage   # With coverage
bash .hooks/tests/test_hooks.sh  # Hook tests
```

## Commit Messages

All commits must follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <short description>

[optional body]
```

**Types:** `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`

Version bumps are automated:
- `feat:` → minor bump
- `fix:`, `docs:`, `chore:` → patch bump
- `BREAKING CHANGE` in body or `!` after type → major bump

## Branch Naming

Use descriptive prefixes: `feat/`, `fix/`, `docs/`, `test/`, `chore/`.

## Decision Authority

Changes carry different levels of risk. Know which tier yours falls into before opening a PR:

| Tier | Examples | Process |
|------|----------|---------|
| **Autonomous** | Renaming variables, adding tests, internal refactors | Submit PR directly |
| **Propose** | New dependencies, schema changes, timeout values | Open an issue first |
| **Escalate** | Spec changes, security decisions, governance changes | Maintainer approval required before work begins |

Full matrix in [AGENTS.md](AGENTS.md).

## Code Style

- TypeScript strict mode
- [Biome](https://biomejs.dev/) for linting and formatting — run `npm run lint:fix` before committing
- Zero runtime dependencies in `control-plane/`

## Testing Requirements

- New features must include tests
- Bug fixes must include a regression test
- Use the Node.js built-in test runner (`node:test`)
- Follow patterns in existing test files

## Pull Requests

- One concern per PR
- Reference related issues
- Describe what changed and why
- CI must pass (build, test, lint)

## Boundaries

- Do **not** modify spec files in `aiStrat/` without maintainer approval
- Do **not** add runtime dependencies to `control-plane/`
- Do **not** modify `.github/workflows/` without maintainer approval
- Do **not** store secrets, credentials, or PII
- Do **not** skip tests or disable linters

## Questions?

Open an issue or reach out to [@seandonn-boston](https://github.com/seandonn-boston).
