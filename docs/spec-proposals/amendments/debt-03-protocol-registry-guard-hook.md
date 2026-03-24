# Amendment Proposal: DEBT-03 — Protocol Registry Guard Hook Specification

> Formal amendment to close the SO-16 enforcement gap with a `protocol_registry_guard` hook.

---

| Field | Value |
|-------|-------|
| **Gap ID** | DEBT-03 |
| **Affected Section** | Standing Order 16 (Protocol Governance) in `part11-protocols.md`; enforcement spectrum in `part3-enforcement.md` |
| **Priority** | Blocking (per SD-02) — blocks Stream 7 task S-04 and constrains Stream 16 (MCP Integration) |
| **Date** | 2026-03-20 |

---

## Current Text

**Part 11, SO-16 (Protocol Governance):**
> Before using any MCP server or A2A connection, verify it is registered in the project's protocol registry. Do not connect to unregistered servers.

**Part 3 (Enforcement), Protocol enforcement note:**
> MCP server registration and A2A identity validation are SECURITY-class constraints. Unregistered server access and unsigned A2A messages must be hook-enforced, not advisory.

**Standing Orders Enforcement Map (`reference/standing-orders-enforcement-map.md`):**
> SO-16: No hook. Advisory — MCP server registration and A2A connection testing are partially mechanical (server name against approved list), but trust classification and security review require judgment. A `protocol_registry_guard` PreToolUse hook could enforce the mechanical component.

**Current state:** SO-16 is advisory-only. No hook exists. The enforcement map explicitly identifies this as a gap and proposes a resolution path.

## Proposed Amendment

### 1. Add `protocol_registry_guard` to Hook Lifecycle

Add to Part 3 (Enforcement), Reference Hook Implementations section:

```
PreToolUse: protocol_registry_guard                                    E2+
  Format:     Shell script. Version-controlled.
  Invocation: Synchronous. Fires before any tool invocation that
              targets an MCP server or A2A endpoint.
  Input:      Standard ACHI payload. The hook inspects tool.name and
              tool.params for MCP server identifiers or A2A endpoint URLs.
  Logic:
    1. If tool.name does not reference an MCP server call or A2A
       endpoint, exit 0 immediately (no-op for non-protocol tools).
    2. Extract the target server/endpoint identifier from tool.params.
    3. Check the identifier against the project's protocol registry
       (admiral/config/protocol_registry.yaml).
    4. If registered with trust level "official" or "internal": exit 0.
    5. If registered with trust level "community": exit 0 + advisory
       warning noting community trust level.
    6. If not registered: exit 2 (hard block).
       Stdout: "PROTOCOL VIOLATION (SO-16): MCP server '{server}'
       is not registered in the protocol registry. Register it in
       admiral/config/protocol_registry.yaml with Admiral approval
       before use."
  Output:     Exit 0 = pass. Exit 2 = hard block (unregistered server).
  Timeout:    5 seconds.
  Deployment: E2+ (requires fleet roster with MCP servers configured).
              At E1, MCP server usage is uncommon; deploy when MCP
              integration (Stream 16) begins.
```

### 2. Define Protocol Registry Format

Add `admiral/config/protocol_registry.yaml` as the approved server list:

```yaml
# Protocol Registry — approved MCP servers and A2A endpoints
# Changes require Admiral approval.
version: "1.0"
mcp_servers:
  - name: "github-mcp"
    version: ">=1.0.0"
    trust: "official"
    scope: "repo management, PR creation, issue tracking"
    approved_by: "Admiral"
    approved_date: "2026-03-20"
  - name: "sequential-thinking"
    version: ">=1.0.0"
    trust: "official"
    scope: "deliberative reasoning"
    approved_by: "Admiral"
    approved_date: "2026-03-20"

a2a_endpoints: []  # No cross-fleet A2A endpoints configured yet

blocked_servers:
  - pattern: "*.unofficial.*"
    reason: "Unvetted servers blocked by default"
```

### 3. Update SO-16 Enforcement Classification

In the Standing Orders enforcement map, update SO-16:

| Current | Proposed |
|---------|----------|
| "No hook. Advisory." | "Hybrid: `protocol_registry_guard` enforces the mechanical component (server name against approved list). Trust classification and security review remain judgment-assisted (Admiral approval at registration time)." |

## Rationale

The enforcement map already identifies this gap and proposes this exact resolution. The spec (Part 3) explicitly states MCP server registration must be hook-enforced, not advisory. This amendment closes the gap between the spec's stated requirement and its implementation status.

The hook enforces only the mechanical component (is the server registered?). The judgment component (should this server be trusted?) remains at Admiral approval time during registration — not at runtime. This maintains the LLM-Last principle: deterministic check at runtime, human judgment at configuration time.

## Impact Assessment

- **Part 3 text change**: Add `protocol_registry_guard` to Reference Hook Implementations section
- **Part 11 text change**: None — SO-16 text is already correct; the gap is in enforcement, not policy
- **Enforcement map change**: Update SO-16 from "No hook" to "Hybrid"
- **New artifact**: `admiral/config/protocol_registry.yaml`
- **Implementation streams affected**: Stream 7 (task S-04 — implements this hook), Stream 16 (MCP Integration — hook validates MCP server calls)
- **Hook count impact**: Increases from 8/16 (50%) to 9/16 (56%) implemented hooks
- **Backward compatible**: No existing hooks or behavior change; new hook is additive
