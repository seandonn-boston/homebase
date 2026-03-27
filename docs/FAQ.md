# Admiral Framework FAQ

Frequently asked questions across general concepts, architecture, development, operations, and security.

---

## General

**Q: What is the Admiral Framework?**
A governance system for AI agent fleets. It provides deterministic enforcement (hooks), persistent memory (Brain), observability (control plane), and structured work coordination (phases, tasks, branches).

**Q: Why not just use CLAUDE.md instructions?**
Instructions degrade under context pressure. Hooks fire every time regardless of context state. The core thesis: deterministic enforcement beats advisory guidance.

**Q: How many agents can work simultaneously?**
2-10 concurrent agents via git worktrees. Branch-based task locking prevents conflicts. Beyond 10, `git fetch` contention becomes significant. See ADR-008.

**Q: What's the relationship between Admiral and Claude Code?**
Claude Code is the runtime (LLM + tools). Admiral is the governance layer that hooks into Claude Code's lifecycle events. Admiral doesn't replace Claude Code — it constrains and observes it.

---

## Architecture

**Q: Why bash for hooks instead of TypeScript?**
Bash executes faster (no compilation step), has no runtime dependencies (ADR-002), and interfaces naturally with Claude Code's hook system which expects shell scripts.

**Q: Why JSON over stdin/stdout for hook communication?**
Claude Code's hook protocol pipes JSON payloads on stdin and reads JSON from stdout. This is a platform constraint, not a choice. See ADR-005.

**Q: What does "fail-open" mean?**
When a hook encounters an error (corrupt JSON, missing file, jq failure), it logs the error and exits 0 (allows the action). This prevents hook bugs from blocking all work. See ADR-004.

**Q: When should a hook fail-closed (exit 2)?**
Only when the cost of allowing the action exceeds the cost of blocking it: bypass attempts, privilege escalation, writes to protected paths, irreversible operations.

**Q: How does the Brain system work?**
B1 (current): JSON files in `.brain/`, keyword search via grep, git-tracked. B2: pgvector semantic search (requires external database). B3: autonomous learning (not yet implemented). See ADR-009.

---

## Development

**Q: How do I add a new hook?**
1. Create `.hooks/my_hook.sh` with the standard header (see ADMIRAL_STYLE.md)
2. Source `hook_utils.sh` and call `hook_init "my_hook"`
3. Read payload from stdin, process, output JSON to stdout
4. Wire it into the appropriate adapter (`post_tool_use_adapter` or `pre_tool_use_adapter`)
5. Add tests in `admiral/tests/test_my_hook.sh`
6. Add a snapshot in `admiral/tests/snapshots/my_hook.snap.json`

**Q: How do I run the tests?**
- TypeScript: `cd control-plane && npm test`
- Bash hooks: `bash admiral/tests/test_<module>.sh` (requires jq)
- Mutation testing: `cd control-plane && npm run test:mutation`

**Q: What's the difference between `hook_utils.sh` and `jq_helpers.sh`?**
`jq_helpers.sh` provides JSON manipulation primitives (`jq_get`, `jq_set`, etc.). `hook_utils.sh` provides hook lifecycle management (`hook_init`, `hook_pass`, `hook_fail_soft`, etc.) and sources `jq_helpers.sh` automatically.

**Q: How do I add a new JSON schema?**
Create `admiral/schemas/<name>.v1.schema.json`. Follow the existing patterns. Validation is fail-open — schemas inform but don't block.

**Q: What TypeScript conventions does the project follow?**
Named exports only, kebab-case filenames, PascalCase classes, camelCase functions, snake_case JSON fields. See ADMIRAL_STYLE.md.

---

## Operations

**Q: How do I set up the project?**
```
git clone <repo>
cd helm/control-plane && npm install
npm run build && npm test
```
Hooks require `jq` (>= 1.6). Run `admiral/bin/check_dependencies` to verify.

**Q: How do I start the control plane dashboard?**
```
cd control-plane && npm run build && npm start
```
Dashboard at `http://localhost:4510`. API docs at `/health`, `/api/events`, `/api/alerts`.

**Q: What happens if a hook crashes?**
The adapter isolates hook failures. Each sub-hook runs in its own subshell. If one crashes, the others still run. The adapter always exits 0 (fail-open). Errors are logged to `.admiral/hook_errors.log`.

**Q: How do I check session state?**
Read `.admiral/session_state.json` or hit `GET /api/session` on the dashboard. State includes token usage, tool call count, and per-hook state.

**Q: Where are logs stored?**
Structured logs: `.admiral/logs/admiral.jsonl`. Event log: `.admiral/event_log.jsonl`. Hook errors: `.admiral/hook_errors.log`.

---

## Security

**Q: What prevents an agent from disabling its own hooks?**
The `prohibitions_enforcer` hook hard-blocks (exit 2) any attempt to modify `.hooks/`, use `--no-verify`, or disable enforcement mechanisms. The `scope_boundary_guard` blocks writes to `.claude/settings`.

**Q: How are secrets protected?**
The `prohibitions_enforcer` detects secret patterns (passwords, API keys, private keys) in commands and file writes. Advisory-only (high false-positive risk). Sensitive file types (`.env`, `.pem`, `.key`) trigger additional warnings.

**Q: What is zero-trust in this context?**
SO-12: Never trust inherited context. External data (WebFetch, WebSearch) is flagged as untrusted. MCP tool responses are scanned for prompt injection markers. Blast radius is assessed for write operations.

**Q: How does quarantine work?**
The 5-layer quarantine pipeline (`admiral/lib/injection_detect.sh`) scans content for prompt injection patterns, encoding tricks, and social engineering markers. Flagged content is quarantined before it reaches the Brain.

**Q: Can an agent escalate its own privileges?**
No. The `prohibitions_enforcer` hard-blocks `sudo`, `su`, `chmod 777`, `chown root`, and `setuid` patterns. The `privilege_check` hook provides additional defense-in-depth.
