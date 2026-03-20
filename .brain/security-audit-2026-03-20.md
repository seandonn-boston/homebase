# Security Audit Report — 2026-03-20

**Agent:** Security Agent
**Scope:** Full codebase security review
**Status:** Escalated for human review (per AGENTS.md: security decisions always require human review)

---

## 1. Secrets & Credentials Scan

**Result: PASS (1 minor finding)**

- No actual API keys, tokens, passwords, or private keys in tracked files
- Test files contain intentional example credentials — acceptable
- **Minor PII:** Real email `sean@admiral.dev` in `aiStrat/admiral/extensions/fleet-control-plane.md:263`
  - **Recommendation:** Replace with `operator@example.com`

## 2. Shell Script Vulnerabilities (36 scripts)

### Critical

| Issue | File | Lines | Risk |
|-------|------|-------|------|
| Unsafe jq interpolation — user input directly in filter without `--arg` | `admiral/lib/state.sh` | 45-48 | jq code injection |
| Python code injection — `$STATE_FILE` interpolated into Python string | `aiStrat/monitor/scanner.sh` | 61-76 | Arbitrary code execution |
| Unquoted variables in jq/grep expressions | Multiple hook files | Various | Filter injection |

### High

| Issue | File | Risk |
|-------|------|------|
| Unsafe Bash command extraction from JSON | `scope_boundary_guard.sh`, `prohibitions_enforcer.sh` | Command injection |
| Race condition in temp file creation | `scanner.sh:40`, `extract-invention-dates.sh:11` | Symlink attack |
| Dynamic pattern in grep without escaping | `state.sh:168`, `loop_detector.sh:81` | Regex injection |

### Remediation

- Use `jq --arg name value` instead of interpolating variables into jq filters
- Pass shell variables as Python `sys.argv` arguments, not inline strings
- Add `chmod 700` after `mktemp -d`
- Run `shellcheck` on all scripts

## 3. TypeScript / Control-Plane

**Result: PASS with notes**

- Zero runtime dependencies — policy satisfied
- No `eval()`, `child_process`, or prototype pollution
- All `JSON.parse()` calls properly wrapped in try/catch

### Findings

| Issue | File | Line | Severity |
|-------|------|------|----------|
| `projectDir` CLI arg not validated for path traversal | `cli.ts` | 18 | Medium |
| Port number not bounds-checked (1-65535) | `cli.ts` | 20 | Low |
| `agentId` from URL path not format-validated | `server.ts` | 99-100 | Low |

## 4. Hook Enforcement Bypass Risks

### Critical

| Risk | Description |
|------|-------------|
| **Hooks not system-enforced** | Agent runtime controls hook invocation; no cryptographic verification |
| **State file tampering** | No HMAC/signature on `session_state.json`; agent can set `scope_override` or `pre_work_validator.validated` directly |
| **Environment variable spoofing** | `ADMIRAL_SCOPE_OVERRIDE` can be set by agent to bypass scope checks |

### High

| Risk | Description |
|------|-------------|
| Command evasion via indirection | `CMD="git push --force"; $CMD` bypasses regex patterns |
| Fail-open by design | Hook crashes reset state with no escalation triggered |
| Secrets detection advisory-only | Credentials detected but not blocked (exit 0) |

### Medium

| Risk | Description |
|------|-------------|
| Race conditions in state saves | Multiple hooks modify state independently; last write wins |
| No automatic escalation | Budget/loop threshold warnings emitted but don't block |
| Hook scripts not integrity-verified | No code signing; `.hooks/` writable by owner |

## Top Recommendations (Priority Order)

1. **Fix jq injection** in `state.sh` — use `--arg`/`--argjson`
2. **Fix Python injection** in `scanner.sh` — pass vars as arguments
3. **Add HMAC-256 to session_state.json** — detect agent tampering
4. **Validate CLI inputs** in control-plane (`projectDir`, `port`)
5. **Replace PII email** in fleet-control-plane.md
6. **Add hook signature verification** — checksum/sign `.hooks/*.sh`
7. **Implement automatic escalation** when advisory thresholds exceeded
8. **Run shellcheck** across all bash scripts as CI gate

---

*This report is escalated per Standing Orders and AGENTS.md decision authority table. No code changes were made — review only.*
