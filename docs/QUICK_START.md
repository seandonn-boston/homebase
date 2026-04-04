# Quick Start — Clone to PR in 30 Minutes

> A guided tutorial for new contributors. By the end, you'll have the project running, tests passing, and your first PR ready.

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) or `nvm install 22` |
| jq | 1.6+ | `brew install jq` / `apt install jq` / [jqlang.github.io](https://jqlang.github.io/jq/) |
| Git | 2.30+ | [git-scm.com](https://git-scm.com/) |
| ShellCheck | 0.8+ | `brew install shellcheck` / `apt install shellcheck` (optional but recommended) |

Verify:
```bash
node --version    # v22+
jq --version      # 1.6+
git --version     # 2.30+
```

---

## Step 1: Clone and Build (5 minutes)

```bash
git clone https://github.com/seandonn-boston/helm.git
cd helm
```

Build the TypeScript control plane:

```bash
npm install --prefix control-plane
npm run build --prefix control-plane
```

Enable the pre-commit hook (runs ShellCheck and Biome on staged files):

```bash
git config core.hooksPath .githooks
```

---

## Step 2: Run Tests (5 minutes)

### TypeScript tests

```bash
npm test --prefix control-plane
```

Expected: 930+ tests passing, 90%+ coverage.

### Bash hook tests

```bash
bash .hooks/tests/test_hooks.sh
```

Expected: All hook tests pass (output shows test names with PASS/FAIL).

### Validation scripts

```bash
admiral/bin/check_dependencies
```

Expected: All required tools found with compatible versions.

If all tests pass, the project is correctly set up.

---

## Step 3: Understand the Structure (5 minutes)

```
helm/
  aiStrat/          # Framework specification (READ-ONLY)
  admiral/          # Runtime: config, lib, standing orders, tests
    bin/            #   CLI tools and validators
    config/         #   Configuration (fleet registry, etc.)
    lib/            #   Shared bash libraries
    standing-orders/#   16 governance rules (SO-01 to SO-16)
    tests/          #   Bash test suites
  control-plane/    # TypeScript observability server
    src/            #   Source code
    dist/           #   Built output
  .hooks/           # Claude Code enforcement hooks
  .brain/           # Brain B1 knowledge entries
  docs/             # ADRs, guides, security model
  plan/             # Roadmap and TODO tracking
```

**Key files to read first:**
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — coding standards and workflow
- [`ADMIRAL_STYLE.md`](../ADMIRAL_STYLE.md) — naming conventions, exit codes, patterns
- [`docs/GLOSSARY.md`](GLOSSARY.md) — framework terminology
- [`docs/FAQ.md`](FAQ.md) — common questions answered

---

## Step 4: Pick Something to Work On (5 minutes)

### Option A: Find an open task

```bash
# See what's in progress
grep -r '^\- \[ \]' plan/todo/ | head -20
```

Tasks marked `- [ ]` are incomplete. Tasks marked `[S]` are small, `[M]` are medium — start with those.

### Option B: Fix something you noticed

While exploring, you might notice:
- A typo in documentation
- A test that could cover an edge case
- A comment that's unclear

These are great first contributions.

### Option C: Run a validator and fix what it reports

```bash
# Check for spec-implementation drift
admiral/bin/detect_spec_drift

# Check documentation coverage
bash admiral/tests/test_documentation.sh
```

---

## Step 5: Make Your Change (5 minutes)

### Branch

```bash
git checkout -b fix/your-description
# Or: feat/your-description, docs/your-description, test/your-description
```

### Code

Follow the standards in [`CONTRIBUTING.md`](../CONTRIBUTING.md):

- **TypeScript:** strict mode, zero runtime dependencies, Biome formatting
- **Bash:** `set -euo pipefail`, ShellCheck clean, jq for JSON
- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) — `feat:`, `fix:`, `docs:`, `test:`

### Test

Every change needs tests:

```bash
# TypeScript: add tests in *.test.ts files
npm test --prefix control-plane

# Bash: add tests to the relevant test file in admiral/tests/ or .hooks/tests/
bash .hooks/tests/test_hooks.sh
```

### Commit

```bash
git add <your-files>
git commit -m "fix: description of what you fixed"
```

The pre-commit hook runs ShellCheck and Biome automatically. If it fails, fix the issues and re-commit.

---

## Step 6: Open a PR (5 minutes)

```bash
git push -u origin fix/your-description
```

Then open a PR on GitHub targeting `main`. Include:

- **What** you changed (one sentence)
- **Why** you changed it
- **How to test** it

---

## Troubleshooting

### Tests fail on first run

1. Check Node.js version: `node --version` (needs 22+)
2. Check jq version: `jq --version` (needs 1.6+)
3. Rebuild: `npm run build --prefix control-plane`

### Pre-commit hook blocks your commit

The hook runs ShellCheck on `.sh` files and Biome on `.ts` files. Fix the reported issues, then commit again.

### ShellCheck warnings on bash scripts

```bash
shellcheck .hooks/your_script.sh
```

Fix warnings or add `# shellcheck disable=SC####` with a comment explaining why.

### "Permission denied" on hook scripts

```bash
chmod +x .hooks/*.sh
chmod +x admiral/bin/*
```

---

## What's Next

After your first PR:

- Read the [Operational Runbook](OPERATIONAL_RUNBOOK.md) for deeper operational context
- Read the [Security Model](SECURITY_MODEL.md) to understand the enforcement architecture
- Explore the [Architecture Decision Records](adr/) for design rationale
- Check the [Roadmap](../plan/ROADMAP.md) for the big picture
