# Platform Capability Matrix

**Stream 17 — PA-07**

Documents which Admiral Framework governance features each supported platform can deliver natively. Use this matrix when selecting a platform for a new deployment or when planning a migration.

## Legend

| Level | Meaning |
|-------|---------|
| Full | Natively supported; no workarounds required |
| Partial | Supported with limitations or via workarounds |
| None | Not supported on this platform |

## Matrix

| Capability | Claude Code | Cursor | Windsurf | Headless API | VS Code Ext |
|------------|:-----------:|:------:|:--------:|:------------:|:-----------:|
| **Hooks** | Full | None | None | Full | Partial |
| **Context injection** | Full | Partial | Partial | Full | Partial |
| **Tool permissions** | Full | None | None | Full | Partial |
| **MCP server** | Full | Full | Full | Full | Full |
| **Subagent coordination** | Full | None | None | None | None |
| **Event emission** | Full | None | None | Full | None |
| **Config loading** | Full | Full | Full | Full | Full |

## Per-Platform Detail

### Claude Code (Primary Platform)

Admiral's native platform. All governance capabilities are available with no workarounds.

- **Hooks:** `.hooks/` directory, POSIX Bash, `jq` required. Hook scripts receive JSON payloads on stdin and return exit codes (0 = pass, 1 = soft-fail, 2 = hard-block).
- **Context injection:** CLAUDE.md at project root. Standing orders load at session start via `session_start_adapter.sh`. Context priority: standing > session > working.
- **Tool permissions:** `settings.local.json` `allowedTools` array enforces an allowlist.
- **MCP server:** Full support via `mcpServers` in `.claude/settings.local.json`.
- **Subagent coordination:** Native Claude Code multi-agent feature; agents can spawn and supervise subagents.
- **Event emission:** Hooks emit structured JSON events consumed by the control plane.
- **Adapter identifier:** `claude-code`

**Gaps:** None.

---

### Cursor IDE

Governance via `.cursorrules`. No lifecycle hooks or tool permission enforcement at the IDE level.

- **Hooks:** Not available. Governance rules are advisory only — enforced at the prompt level, not intercepted before tool execution.
- **Context injection:** `.cursorrules` file injected into every conversation. The Cursor adapter generates this file from Admiral standing orders and constraints. Rules are read-only from the model's perspective.
- **Tool permissions:** Not enforced. Cursor does not expose a tool allowlist API.
- **MCP server:** Supported via Cursor's MCP settings. Admiral MCP server provides policy checks and event reporting.
- **Subagents:** Not supported.
- **Event emission:** Not supported natively; MCP server can receive events from toolcall results.
- **Adapter identifier:** `cursor`

**Gaps:** hooks, toolPermissions, subagents, eventEmission.

**Mitigation:** Use MCP server as the enforcement boundary. Critical governance rules should be duplicated in the MCP server's policy checks.

---

### Windsurf / Codeium

Capability profile mirrors Cursor. Governance via `.windsurfrules`.

- **Hooks:** Not available.
- **Context injection:** `.windsurfrules` file auto-generated from Admiral governance. Injected into every Cascade AI conversation.
- **Tool permissions:** Not enforced at the IDE level.
- **MCP server:** Supported via Windsurf's MCP configuration.
- **Subagents:** Not supported.
- **Event emission:** Not supported.
- **Adapter identifier:** `windsurf`

**Gaps:** hooks, toolPermissions, subagents, eventEmission.

**Mitigation:** Same as Cursor — MCP server is the enforcement boundary.

---

### Headless API-Direct

For CI/CD pipelines, automated scripts, and server-side agent runs. No UI or IDE involved.

- **Hooks:** Supported as direct function call handlers registered in config. Hooks receive `HookPayload` and return `HookResult` without shell script intermediaries.
- **Context injection:** Programmatic assembly via `HeadlessContextBootstrap`. Context is passed directly to the agent invocation rather than written to a file.
- **Tool permissions:** Configurable `allowedTools` list, same semantics as Claude Code.
- **MCP server:** Full support. Headless agents connect to the MCP server via HTTP.
- **Subagents:** Not natively supported. Headless runners can spawn child processes, but Admiral's subagent coordination protocol requires Claude Code.
- **Event emission:** Full JSON-lines event log. Events are buffered in `getEventLog()` and can be consumed by the control plane ingester.
- **Adapter identifier:** `headless`

**Additional capabilities (not in base matrix):**
- `EventDrivenAgentFramework` — trigger agents on `pr_opened`, `ci_failure`, `issue_created`, `webhook`, `monitor_finding`
- `HeadlessAuthorityNarrower` — enforces default restrictions (cannot_merge_prs, cannot_delete_branches, cannot_modify_production, cannot_escalate_authority, cannot_approve_own_work)
- `ScheduledAgentRunner` — cron-style recurring agents with monthly budget caps
- `HeadlessContextBootstrap` — assembles context from event payloads, ground truth, and Brain entries

**Gaps:** subagentCoordination.

---

### VS Code Extension

Scaffold adapter for future VS Code extension integration. Mostly stubbed pending extension development.

- **Hooks:** Not natively supported by the extension API. Partial rating reflects that extensions can intercept some VS Code events but not agent tool calls directly.
- **Context injection:** Extension can push context to connected AI models via the extension API. Partial: coverage depends on which AI backend is active.
- **Tool permissions:** Partial: extension can configure allowed operations in its settings.
- **MCP server:** Full support. Extension connects to Admiral MCP server via `mcpServerUrl` config.
- **Subagents:** Not supported.
- **Event emission:** Not supported; extension handles its own event system.
- **Adapter identifier:** `vscode`

**Extension config options:**

| Option | Type | Description |
|--------|------|-------------|
| `fleetStatusSidebar` | boolean | Show fleet health in VS Code sidebar |
| `agentIdentityStatusBar` | boolean | Show agent identity in status bar |
| `alertNotifications` | boolean | Show governance alerts as VS Code notifications |
| `mcpServerUrl` | string | URL of the Admiral MCP server |

**Gaps:** hooks (partial), contextInjection (partial), toolPermissions (partial), subagents, eventEmission.

---

## Gap Analysis Summary

| Gap | Affected Platforms | Mitigation |
|-----|-------------------|------------|
| No hooks | Cursor, Windsurf | MCP server policy checks; .cursorrules/.windsurfrules governance |
| No tool permissions | Cursor, Windsurf | MCP server enforces tool restrictions |
| No subagent coordination | All except Claude Code | Design workflows to run on Claude Code when subagents are required |
| No event emission | Cursor, Windsurf, VS Code | MCP server captures events from tool call results |
| Partial everything | VS Code | Extension roadmap; treat as observability-only for now |

## Choosing a Platform

**New project, full governance:** Use Claude Code.

**Existing Cursor/Windsurf team:** Deploy Admiral MCP server. Governance rules are advisory at the IDE level and enforced at the MCP boundary.

**CI/CD automation:** Use Headless adapter. Configure event-driven triggers and authority narrowing appropriate for the pipeline's risk level.

**Mixed team (IDE + CI):** Run Claude Code for interactive development, Headless for automated pipelines, MCP server as the shared enforcement point for both.

## Implementation Reference

- Interface: `platform/adapter-interface.ts`
- Matrix data: `platform/capability-matrix.ts`
- Adapters: `platform/adapters/`
- Tests: `platform/adapter-interface.test.ts`
