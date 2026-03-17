# Part 13 — Protocol Integration Guide (MCP + A2A)

> **TL;DR** — This part consolidates MCP and A2A guidance scattered across Parts 2–5, 9, and the appendices into a single practitioner reference. It adds server selection criteria, testing/validation guidance, and incremental adoption paths for both protocols — from zero MCP to full Brain B3, and from same-session orchestration to cross-fleet A2A federation. If you've read the protocol sections in other parts, this is the operational "how-to" that connects them.

**Why this part exists:** MCP and A2A are referenced across six spec parts and three appendix profiles. A practitioner implementing protocol integration needs to piece together guidance from all of them. This part does not replace or contradict those sections — it consolidates, cross-references, and fills gaps.

**The two protocols:**
- **MCP (Model Context Protocol)** connects agents to tools and data sources. Think "USB-C for AI."
- **A2A (Agent-to-Agent Protocol)** connects agents to other agents across process, machine, and organizational boundaries. Think "HTTP for agent fleets."

Together they form the protocol layer enabling coordinated fleet operations. MCP is relevant from Starter profile onward; A2A becomes relevant at Team profile and critical at Production+.

-----

## 1. Protocol References — Consolidated Map

MCP and A2A appear in the following spec sections. Each reference is authoritative; this section maps them for navigation:

### MCP References

| Concern | Spec Location | What It Covers |
|---|---|---|
| Server registry & per-agent assignment | Part 4 — Fleet, "MCP Server Registry" | Which servers, which agents, scope limits, security |
| Permission scoping & version pinning | Part 4 — Fleet, "Protocol Integration" | What the Admiral must define for each MCP connection |
| Brain as MCP server (8 tools) | Part 5 — Brain, "The Knowledge Protocol" | Tool contracts, parameters, return types |
| Zero-trust identity for MCP requests | Part 5 — Brain, "Zero-Trust Identity Verification" | Token format, lifecycle, revocation |
| MCP protocol evolution (streaming, subscriptions) | Part 9 — Platform, "MCP Protocol Evolution" | Forward-looking capabilities as MCP matures |
| Configuration as Ground Truth | Part 2 — Context, "Ground Truth Document" | `MCP servers: [list/versions]` in config artifacts |
| Profile-based requirements | Appendices, "Quick-Start Profiles" | When MCP becomes required at each profile level |
| Security threats | Part 4 — Fleet, "Protocol Security" | Exfiltration, impersonation, token misuse |

### A2A References

| Concern | Spec Location | What It Covers |
|---|---|---|
| Agent Cards & discovery | Part 4 — Fleet, "A2A — Agent-to-Agent Protocol" | Identity, capabilities, authentication, availability declarations |
| Communication contract | Part 4 — Fleet, "A2A — Agent-to-Agent Protocol" | Transport, auth, message format, timeout, retry, idempotency |
| Failure handling | Part 4 — Fleet, "A2A — Agent-to-Agent Protocol" | Agent offline, mid-flight failure, network partition, identity spoofing |
| A2A vs. orchestrator-mediated handoffs | Part 4 — Fleet, "A2A — Agent-to-Agent Protocol" | Decision matrix for when to use each approach |
| Identity spoofing & token misuse | Part 4 — Fleet, "Protocol Security" | Signed cards, mTLS, RFC 8707 resource indicators |
| Credential delegation prevention | Part 4 — Fleet, "Protocol Security" | Non-transferable tokens, independent authentication |
| Protocol registry template | Part 4 — Fleet, "Protocol Integration" | A2A CONNECTIONS section of the registry template |
| Profile-based requirements | Appendices, "Quick-Start Profiles" | "A2A configured if needed" at Team profile |
| Heterogeneous protocol support | Part 9 — Platform, "MCP Protocol Evolution" | Cross-protocol translation at Orchestrator level |
| Handoff Protocol (A2A complement) | Part 11 — Protocols, "Handoff Protocol" | Structured handoff format for inter-agent transfers |

-----

## 2. MCP Server Selection Framework

Part 4 states the Admiral must define server selection but does not provide a decision framework. This section fills that gap.

### Selection Criteria

Evaluate every candidate MCP server against these criteria before adding it to the fleet registry:

| Criterion | Question | Weight |
|---|---|---|
| **Necessity** | Does an agent role require this capability? Is there no existing tool that already covers it? | Required |
| **Trust classification** | Is this official (vendor-maintained), community (open-source), or internal (your team built it)? | Required |
| **Permission granularity** | Can permissions be scoped to minimum required access? (Read-only, repo-scoped, row-level, etc.) | Required |
| **Authentication** | Does it support OAuth 2.0, API key, or mTLS? Is credential rotation supported? | Required |
| **Version stability** | Is a pinnable version available? Does the maintainer follow semver? What is the release cadence? | Required |
| **Security posture** | Has it been audited? Any known CVEs? Does it have SLSA provenance or equivalent attestation? | High |
| **Egress profile** | What network connections does the server make? Does egress match declared scope? | High |
| **Maintenance status** | Is it actively maintained? When was the last release? Are security issues addressed promptly? | Medium |
| **Community adoption** | Is it widely used? Are there production references? | Low |

### Trust Classification Decision Tree

```
Is the server maintained by the tool/platform vendor?
  └─ Yes → OFFICIAL (e.g., GitHub MCP by GitHub, Supabase MCP by Supabase)
       └─ Default: Trust. Still audit permissions and pin version.
  └─ No →
       Is it maintained by your organization?
         └─ Yes → INTERNAL
              └─ Default: Trust. You own the code. Apply internal code review standards.
         └─ No → COMMUNITY
              └─ Evaluate: Check maintainer reputation, download count, last commit date,
                 open security issues, dependency tree.
              └─ Default: Do not trust until audited. Run in restricted mode first.
```

### Server Addition Checklist

Before adding any MCP server to the fleet registry:

- [ ] **Necessity confirmed:** At least one agent role requires this capability and no existing tool covers it.
- [ ] **Trust classification assigned:** Official / Community / Internal.
- [ ] **Permissions scoped:** Minimum permissions documented. No broader access than required.
- [ ] **Version pinned:** Exact version recorded. `latest` is never acceptable in production.
- [ ] **Security review completed:** For community servers — CVE check, dependency audit, egress monitoring during test run.
- [ ] **Authentication configured:** Credentials stored in vault (not in agent context or config files). Rotation schedule defined.
- [ ] **Negative scope documented:** What the server explicitly should NOT be used for. Added to relevant agents' negative tool lists if applicable.
- [ ] **Registry entry created:** Server added to Part 4 MCP Server Registry table with all columns populated.
- [ ] **Ground Truth updated:** `MCP servers: [list/versions]` in configuration artifact reflects the addition.

### Server Removal Criteria

Remove an MCP server from the registry when:

- No agent role requires its capability (roles changed or consolidated).
- A security vulnerability is discovered and no patch is available within your risk tolerance window.
- The server is abandoned (no commits or security patches for 6+ months for community servers).
- An official or internal alternative becomes available that covers the same capability with better security posture.
- Egress monitoring reveals undeclared network connections.

When removing: update the registry, update Ground Truth, update affected agents' tool lists, and record the removal decision in the Brain.

-----

## 3. MCP Testing and Validation

No spec section currently covers how to test MCP server integrations or validate behavior under the Admiral governance model. This section establishes testing requirements.

### Test Levels

#### Level 1: Connection Validation (Required at Team profile)

Verify the MCP server is reachable and responds correctly to basic operations.

```
Test: MCP Server Connectivity
  1. Connect to MCP server using configured credentials
  2. Call the server's tool discovery endpoint
  3. Verify declared tools match expected capability set
  4. Call each declared tool with minimal valid parameters
  5. Verify response format matches documented schema
  Pass: All tools respond with valid schemas. No undeclared tools appear.
  Fail: Connection refused, auth failure, schema mismatch, or undeclared tools.
```

#### Level 2: Permission Boundary Testing (Required at Team profile)

Verify that scoped permissions actually restrict access as intended.

```
Test: Permission Boundaries
  1. Configure MCP connection with minimum-permission credentials
  2. Attempt an operation within the permitted scope
     → Should succeed
  3. Attempt an operation outside the permitted scope
     → Should fail with an authorization error (not silently succeed)
  4. Attempt to escalate permissions via the MCP connection
     → Should fail
  Pass: Permitted operations succeed. Out-of-scope operations fail explicitly.
  Fail: Out-of-scope operations succeed, or fail silently without error.
```

#### Level 3: Identity and Access Control Testing (Required at Governed profile)

Verify that the Brain MCP server enforces zero-trust identity correctly.

```
Test: Zero-Trust Enforcement
  1. Send a request with a valid identity token → Should succeed
  2. Send a request with no identity token → Should reject
  3. Send a request with an expired token → Should reject
  4. Send a request with a token for a different project → Should reject
  5. Send a request with a token for a different role
     (e.g., non-Admiral calling brain_purge) → Should reject
  6. Send a request with a revoked token → Should reject
  Pass: Only valid, in-scope, non-expired, non-revoked tokens are accepted.
  Fail: Any unauthorized request succeeds.
```

#### Level 4: Integration Testing (Required at Governed profile)

Verify end-to-end agent workflows through MCP.

```
Test: Agent-MCP Integration
  1. Agent calls brain_record with a test entry → Verify entry created
  2. Agent calls brain_query with a query matching the test entry
     → Verify entry appears in results with appropriate similarity score
  3. Agent calls brain_strengthen on the entry → Verify usefulness score updated
  4. Agent calls brain_supersede with a new entry → Verify old entry marked superseded
  5. Agent calls brain_query with current_only=true
     → Verify superseded entry excluded
  6. Verify audit_log contains all operations with correct agent_id and timestamps
  Pass: Full lifecycle works. Audit trail is complete.
  Fail: Any operation produces unexpected results or missing audit entries.
```

#### Level 5: Security Testing (Required at Production profile)

Validate MCP servers against known vulnerability patterns.

```
Test: OWASP MCP Top 10 Validation
  For each MCP server in the registry:
  1. SSRF: Send requests with internal network URLs as parameters
     → Should not resolve internal resources
  2. Injection: Send tool parameters containing shell metacharacters,
     SQL fragments, and path traversal sequences
     → Should sanitize or reject
  3. Excessive permissions: Compare granted permissions to minimum required
     → No permission should exceed documented scope
  4. Supply chain: Verify server binary/package hash against known-good values
     → Hash mismatch indicates tampering
  5. Egress: Monitor network connections during test run
     → No undeclared outbound connections
  Pass: All checks pass for all registered servers.
  Fail: Any vulnerability detected. Remove or restrict server until resolved.
```

### Validation Cadence

| Profile | Validation Frequency | Test Levels Required |
|---|---|---|
| Team | On server addition; on version update | 1, 2 |
| Governed | Monthly; on any configuration change | 1, 2, 3, 4 |
| Production | Weekly; on any change; after security advisories | 1, 2, 3, 4, 5 |
| Enterprise | Continuous; integrated into CI/CD | All levels, automated |

### Regression Testing After Updates

When a pinned MCP server version is updated:

1. Run Level 1 and Level 2 tests against the new version in a staging environment.
2. Compare tool discovery output to the previous version — flag any added, removed, or changed tools.
3. Run the full test suite required for your current profile level.
4. If any test fails: do not deploy the update. Investigate the change. Record the finding in the Brain.
5. If all tests pass: update the version pin in the registry and Ground Truth.

-----

## 4. Incremental MCP Adoption Path

The current spec jumps from "Pin MCP servers if applicable" (Starter) to "B3 MCP server running with zero-trust access control" (Governed). This section defines intermediate steps.

### Phase 0: No MCP (Starter, minimal)

**State:** Single agent, no MCP servers configured. Tools are native to the agent platform (e.g., Claude Code built-in tools).

**What to do:**
- Document the `MCP servers: none` line in your Ground Truth.
- Understand MCP conceptually (read this guide) — you will need it at Team profile.
- Do NOT set up MCP servers preemptively. There is no consumer yet.

**Exit criteria:** You have a working single-agent setup with clear tool boundaries and are ready to add a second agent or connect to an external service.

### Phase 1: First External MCP Server (Starter → Team transition)

**State:** You need an agent to interact with an external service (GitHub, database, file system) and an MCP server exists for it.

**What to do:**
1. Select the MCP server using the Selection Framework (Section 2).
2. Configure with minimum permissions.
3. Pin the version.
4. Add to the MCP Server Registry (Part 4).
5. Run Level 1 and Level 2 tests (Section 3).
6. Update Ground Truth.

**Typical first servers:**
- **GitHub MCP** — if your agents manage PRs and issues.
- **Filesystem MCP** — if agents need scoped file access beyond the agent platform's native capability.
- **Sequential Thinking** — if agents benefit from structured reasoning (no external access, low risk).

**What you do NOT need yet:**
- Identity tokens (no Brain MCP server, no zero-trust concern).
- A2A protocol (agents are in the same session).
- Egress monitoring (defer to Governed unless using community servers).

**Exit criteria:** At least one MCP server is registered, pinned, scoped, and tested. Agents use it in production workflows.

### Phase 2: Multi-Server Fleet (Team profile)

**State:** Multiple agents with different MCP server assignments. The fleet has a tool registry.

**What to do:**
1. Assign MCP servers to agent roles using the registry template (Part 4).
2. Enforce negative tool lists — agents should not assume access to servers not in their registry.
3. Run Level 1 and Level 2 tests for every server.
4. Establish a version update process (who monitors, who approves, who deploys).
5. Begin auditing community servers if any are in use.

**Key governance concern:** With multiple agents and multiple servers, permission scoping becomes critical. An implementation agent should not have write access to the GitHub MCP server's repo management tools — it should be scoped to file operations in its assigned repos.

**Exit criteria:** Every agent's MCP server assignment is documented. Permission boundaries are tested. A version update process exists.

### Phase 3: Brain MCP Server (Team → Governed transition)

**State:** Institutional memory is growing beyond file-based storage. You need structured, queryable, cross-session knowledge.

**What to do:**
1. Deploy Brain B2 (SQLite + embeddings) with the Brain MCP server.
2. Implement the 4 universal Brain tools (`brain_query`, `brain_record`, `brain_retrieve`, `brain_strengthen`).
3. Add Brain tools to all agents' tool registries.
4. Run Level 1, 2, and 4 tests.
5. Begin recording decisions at chunk boundaries (Pattern 2, Part 5).

**What you do NOT need yet:**
- Zero-trust identity (simplified identity — agent-id + role — is sufficient at B2).
- `brain_purge` (regulatory compliance is a Governed+ concern).
- `brain_audit` (Admiral-only tool, useful but not required until governance agents exist).

**Exit criteria:** Brain MCP server is running. Agents record and query decisions. Integration tests pass.

### Phase 4: Full MCP Governance (Governed profile)

**State:** Brain B3 deployed. Governance agents active. Zero-trust identity required.

**What to do:**
1. Upgrade to Brain B3 (Postgres + pgvector + MCP server). See `brain/level3-spec.md`.
2. Implement all 8 Brain MCP tools including `brain_audit` and `brain_purge`.
3. Deploy identity tokens with cryptographic signing (Part 5, Token Format Contract).
4. Implement zero-trust access control — every MCP request validated.
5. Run all 5 test levels.
6. Enable the `brain_context_router` hook (Part 5) to enforce Brain queries before Propose/Escalate decisions.
7. Conduct OWASP MCP Top 10 validation for all registered servers.
8. Set up egress monitoring for community servers.

**Exit criteria:** Full Brain MCP server with zero-trust identity. All test levels passing. Governance hooks enforcing Brain consultation.

### Phase 5: Protocol Maturity (Production → Enterprise)

**State:** MCP protocol evolves. Streaming, subscriptions, and discovery become available.

**What to do:**
- Leverage streaming for real-time Brain notifications (Part 9, "MCP Protocol Evolution").
- Implement subscriptions for tool availability and security alerts.
- Enable discovery with trust signals for new server evaluation.
- Handle heterogeneous protocols — not all agents speak MCP; Orchestrator translates.
- Automate MCP validation in CI/CD (Level 5 tests run on every deployment).

**Exit criteria:** MCP is fully operationalized with streaming, automated testing, and cross-protocol translation.

-----

## 5. A2A Testing and Validation

A2A testing parallels MCP testing but focuses on agent-to-agent communication rather than agent-to-tool communication.

### Test Levels

#### Level 1: Agent Card Validation (Required at Team profile)

Verify that Agent Cards are correctly published and discoverable.

```
Test: Agent Card Discovery
  1. Query the fleet's discovery service for all registered Agent Cards
  2. Verify each card contains all required fields:
     identity, capabilities, authentication, availability
  3. Verify card content matches the agent's actual role and tool registry
  4. Attempt to discover an unregistered agent → Should return not found
  Pass: All registered agents have valid, accurate Agent Cards.
  Fail: Missing fields, capability mismatch, or unregistered agents discoverable.
```

#### Level 2: Communication Contract Testing (Required at Team profile)

Verify that A2A message exchange follows the specified contract.

```
Test: A2A Message Exchange
  1. Send a valid A2A request with all required fields
     (sender identity, trace_id, task, input, deadline, budget)
     → Should receive structured response with status
  2. Send a request missing required fields
     → Should receive rejection with clear error
  3. Send a duplicate request with the same request_id
     → Should be handled idempotently (same result, no duplicate execution)
  4. Send a request with an expired deadline
     → Should receive timeout/rejection
  Pass: Valid requests succeed. Invalid requests fail explicitly. Idempotency holds.
  Fail: Missing field accepted, duplicate execution, or silent failures.
```

#### Level 3: Authentication and Identity Testing (Required at Governed profile)

Verify that A2A enforces identity verification.

```
Test: A2A Identity Verification
  1. Send a signed request from a registered agent → Should succeed
  2. Send an unsigned request → Should reject
  3. Send a request signed with an unknown key → Should reject
  4. Send a request with a valid signature but revoked agent identity → Should reject
  5. Cross-fleet: send a request without OAuth 2.0 token → Should reject
  6. Cross-fleet: send a request with a token lacking RFC 8707
     resource indicators → Should reject
  Pass: Only properly authenticated, authorized agents can communicate.
  Fail: Any unauthenticated or unauthorized request succeeds.
```

#### Level 4: Failure Handling Testing (Required at Governed profile)

Verify that A2A failure modes are handled correctly.

```
Test: A2A Failure Handling
  1. Take an agent offline → Registry should mark it unavailable
     → Orchestrator should route to fallback or queue
  2. Simulate mid-flight failure → Caller should receive partial result
     with status "failed" and error context
  3. Simulate network partition (no response before deadline)
     → Caller should treat as timeout and follow recovery ladder
  4. Send a request to a busy agent at max queue depth
     → Should receive rejection with availability info, not hang
  Pass: All failure modes produce structured, actionable responses.
  Fail: Hangs, silent failures, lost requests, or missing error context.
```

#### Level 5: Cross-Fleet Security Testing (Required at Production profile)

Validate A2A security across fleet boundaries.

```
Test: Cross-Fleet A2A Security
  1. Verify mTLS is enforced for cross-organization communication
  2. Attempt credential delegation (pass auth context to another agent)
     → Should fail — tokens are non-transferable
  3. Attempt cross-server token reuse (use token from Fleet A on Fleet B)
     → Should fail — RFC 8707 resource indicators prevent this
  4. Verify all A2A messages are signed and signature is verified
     → Unsigned messages should be rejected
  5. Attempt to register a rogue Agent Card in the discovery service
     → Should fail — only authorized fleet members can register
  Pass: Complete isolation between fleets except through authorized channels.
  Fail: Any cross-boundary security control fails.
```

### A2A Validation Cadence

| Profile | Validation Frequency | Test Levels Required |
|---|---|---|
| Team | On agent addition; on role changes | 1, 2 |
| Governed | Monthly; on fleet composition changes | 1, 2, 3, 4 |
| Production | Weekly; on any change; after security advisories | 1, 2, 3, 4, 5 |
| Enterprise | Continuous; integrated into CI/CD | All levels, automated |

-----

## 6. Incremental A2A Adoption Path

A2A adoption follows a different trajectory than MCP. MCP is needed as soon as an agent touches an external tool; A2A is needed when agents must communicate across process or machine boundaries. Most fleets start with orchestrator-mediated handoffs and only need A2A when they outgrow single-session coordination.

### Phase 0: No A2A (Starter → early Team)

**State:** All agents operate within the same session. The Orchestrator coordinates directly. Communication is via structured handoffs in-process.

**What to do:**
- Use the Handoff Protocol (Part 11) for inter-agent transfers.
- Document `A2A connections: none` in your protocol registry.
- Do NOT implement A2A preemptively. In-session orchestration is simpler and sufficient.

**Exit criteria:** You have agents that need to communicate across processes, machines, or organizational boundaries.

### Phase 1: First A2A Connection (Team profile)

**State:** Two or more agents need to coordinate but run in separate processes (e.g., a CI/CD-triggered agent and an interactive agent, or agents on different machines).

**What to do:**
1. Create Agent Cards for each participating agent.
2. Set up the discovery service (typically the Orchestrator or a lightweight registry).
3. Implement the communication contract (Part 4): JSON-RPC 2.0 over HTTPS.
4. Use fleet-internal signed API keys for authentication.
5. Configure timeouts and single-retry policy.
6. Implement idempotency via request_id.
7. Run Level 1 and Level 2 A2A tests (Section 5).
8. Add A2A connections to the protocol registry.

**What you do NOT need yet:**
- mTLS (same fleet, same organization).
- OAuth 2.0 with RFC 8707 (no cross-fleet communication).
- Full failover routing (Orchestrator handles manually).

**Exit criteria:** At least one A2A connection is operational. Agent Cards are registered. Communication contract is tested.

### Phase 2: Multi-Agent A2A Mesh (Governed profile)

**State:** Multiple agents communicate across processes. Governance agents need to monitor fleet health across boundaries.

**What to do:**
1. Register all communicating agents in the discovery service.
2. Implement signed messages for identity verification.
3. Deploy failure handling: offline detection, mid-flight failure responses, timeout recovery.
4. Integrate A2A traces with fleet observability (Part 9) — every A2A message carries a trace_id.
5. Run Level 1–4 A2A tests.
6. Set up monitoring for A2A health: message latency, failure rates, queue depths.

**Key governance concern:** A2A messages carry budget and deadline information. Governance agents (Token Budgeter, Loop Breaker) must be able to observe and act on A2A traffic, not just in-session tool calls.

**Exit criteria:** All cross-process agent communication uses A2A. Identity verification is enforced. Failures produce structured responses. Traces are correlated.

### Phase 3: Cross-Fleet A2A Federation (Production → Enterprise)

**State:** Multiple fleets need to collaborate. Agents from different organizations or different projects need to exchange work.

**What to do:**
1. Deploy mTLS for cross-organization communication.
2. Implement OAuth 2.0 with RFC 8707 resource indicators to prevent cross-server token reuse.
3. Enforce credential delegation prevention — tokens are non-transferable.
4. Establish cross-fleet Agent Card verification (agents verify against the other fleet's public key store).
5. Define cross-fleet authorization policies: which agents in Fleet A can communicate with which agents in Fleet B.
6. Run Level 5 A2A tests.
7. Integrate with Inter-Fleet Governance (Part 8) for cross-fleet review cadence.

**Exit criteria:** Cross-fleet communication is secure, authenticated, and audited. No unauthorized cross-boundary access.

-----

## 7. Protocol Security Checklist

Consolidated from Parts 4, 5, and 9, plus research on real-world MCP vulnerabilities and A2A threat models.

### MCP: Per-Server Security Review

- [ ] **SSRF protection:** Server does not resolve internal network URLs from user-supplied parameters. (36.7% of community MCP servers were found vulnerable to SSRF as of Feb 2026.)
- [ ] **Input sanitization:** Tool parameters are validated and sanitized. No injection vectors (shell, SQL, path traversal).
- [ ] **Permission floor:** Credentials grant minimum required access. No admin/root-level API keys.
- [ ] **Credential storage:** Credentials in a vault or environment variables. Never in agent context, config files, or source control.
- [ ] **Version pinned:** Exact version, not `latest`. Update only after regression testing.
- [ ] **Egress declared:** All outbound network connections documented. Undeclared egress is a security finding.
- [ ] **Supply chain verified:** For community servers — check for SLSA provenance, review dependency tree, verify package hash.

### MCP: Fleet-Wide Security

- [ ] **Registry complete:** Every MCP server in use is in the Part 4 registry. No unregistered servers.
- [ ] **Trust classification assigned:** Every server classified as Official, Community, or Internal.
- [ ] **Negative tool lists enforced:** Agents cannot access servers outside their assignment.
- [ ] **Identity tokens implemented:** (Governed+) Every Brain MCP request includes a verifiable identity token.
- [ ] **Audit trail operational:** (Governed+) `brain_audit` captures all operations with agent identity and timestamps.
- [ ] **Revocation mechanism tested:** (Governed+) Token revocation works. Emergency fleet-wide revocation via epoch mechanism tested.

### A2A: Per-Connection Security Review

- [ ] **Agent Cards signed:** Every Agent Card is cryptographically signed. Unsigned cards are rejected by the discovery service.
- [ ] **Message signing enforced:** All A2A messages are signed with the sender's private key. Receivers verify against the registry's public key store.
- [ ] **Timeouts configured:** Every A2A connection has an explicit timeout. Default: 5 minutes. No indefinite waits.
- [ ] **Idempotency implemented:** All requests include a unique request_id. Receivers handle duplicates without re-execution.
- [ ] **Budget propagation:** A2A requests include budget remaining. Receiving agents respect the caller's budget constraints.
- [ ] **Failure responses structured:** Failed requests return status, partial results (if any), error context, and resources consumed.

### A2A: Fleet-Wide Security

- [ ] **Discovery service access controlled:** Only authorized fleet members can register Agent Cards. No rogue registrations.
- [ ] **Credential delegation prevented:** A2A tokens are non-transferable. No agent can pass its auth context to another.
- [ ] **Cross-fleet isolation:** (Production+) mTLS enforced for cross-organization communication.
- [ ] **Token reuse prevented:** (Production+) OAuth 2.0 with RFC 8707 resource indicators prevents cross-server token reuse.
- [ ] **Cross-fleet authorization policies defined:** (Enterprise) Which agents in Fleet A may communicate with which agents in Fleet B is explicitly declared.
- [ ] **A2A traffic observable:** All A2A messages carry trace_ids correlated with fleet observability (Part 9).

-----

## 8. Common Protocol Anti-Patterns

### MCP Anti-Patterns

| Anti-Pattern | Description | Remedy |
|---|---|---|
| **Unregistered servers** | An agent uses an MCP server not in the fleet registry. No security review, no version pin, no governance. | Enforce: every MCP server must be in the registry before agent access is configured. |
| **Permission sprawl** | Server configured with broad permissions "for convenience." | Start with minimum permissions. Expand only when a specific agent role requires it, with documented justification. |
| **Community trust assumption** | Community MCP server treated as trustworthy because "it's popular." | Popularity does not equal security. Run the security checklist (Section 7). Community servers start untrusted. |
| **Version drift** | Pinned version not updated for months. Known vulnerabilities accumulate. | Establish an update cadence. Monitor security advisories. Test before updating. |
| **Tool hallucination via MCP** | Agent assumes an MCP server provides capabilities it does not. Generates plausible-looking but invalid tool calls. | Negative tool lists. Tool discovery verification (Level 1 tests). Explicit "NOT AVAILABLE" in agent definitions. |
| **Brain write-only** | Agents record to the Brain MCP server but never query. Knowledge accumulates without value. | Monitor `brain_query` frequency. If categories show zero retrievals, diagnose: context gap or quality gap (Part 5 anti-pattern). |
| **Credential in context** | MCP server credentials included in agent prompts or config files checked into source control. | Credentials in vault only. Config files reference vault keys, not credential values. |

### A2A Anti-Patterns

| Anti-Pattern | Description | Remedy |
|---|---|---|
| **Premature A2A** | A2A implemented when all agents operate in the same session. Adds protocol complexity with no benefit. | Use orchestrator-mediated handoffs (Part 11) until agents cross process/machine boundaries. A2A solves a distribution problem, not a coordination problem. |
| **Missing Agent Cards** | Agents communicate via ad-hoc connections without registered Agent Cards. No discovery, no capability verification, no availability tracking. | Every A2A-capable agent must publish an Agent Card. Enforce via the discovery service — unregistered agents cannot send or receive. |
| **Retry storms** | Caller retries failed A2A requests aggressively, overwhelming the receiver. | Caller may retry once after timeout. No automatic retry loops. If the single retry fails, follow the recovery ladder (Part 7). |
| **Implicit credential sharing** | Agent A passes its MCP server credentials to Agent B via A2A message payload so Agent B can "help." | Credential delegation is prohibited. Each agent authenticates independently with its own scoped credentials. A2A payloads must never contain credentials. |
| **Unbounded delegation** | Agent A sends a task to Agent B with no deadline or budget, creating invisible resource consumption. | Every A2A request must include a deadline and budget remaining. Receivers reject requests without these fields. |
| **Discovery bypass** | Agents hard-code each other's endpoints instead of using the discovery service. Works until an agent moves, scales, or fails over. | All agent-to-agent communication routes through the discovery service. Hard-coded endpoints are a deployment fragility. |
| **Silent A2A failures** | Agent fails during A2A task but returns no error context. Caller cannot distinguish failure from timeout. | Mid-flight failures must return partial results with status `failed` and structured error context. Silent failures are treated as bugs in the receiving agent. |

-----

## Cross-References

- **Part 2 — Context:** Ground Truth Document includes `MCP servers: [list/versions]`.
- **Part 3 — Enforcement:** Configuration Security requires MCP server auditing and pinning.
- **Part 4 — Fleet:** MCP Server Registry, A2A Agent Cards and communication contract, Protocol Integration, Protocol Security.
- **Part 5 — Brain:** The Knowledge Protocol (8 MCP tools), Zero-Trust Identity, Token Lifecycle.
- **Part 8 — Operations:** Inter-Fleet Governance for cross-fleet A2A review cadence.
- **Part 9 — Platform:** MCP Protocol Evolution (streaming, subscriptions, discovery). Heterogeneous protocol support for cross-protocol translation.
- **Part 11 — Protocols:** Handoff Protocol as the in-session complement to A2A. Escalation Protocol for routing A2A failures.
- **Appendices:** Quick-Start Profiles define when MCP and A2A requirements activate at each maturity level.
- **brain/level3-spec.md:** Full B3 Brain specification including MCP server deployment.
- **fleet/agents/governance.md:** "Tool hallucination via MCP" failure mode.
