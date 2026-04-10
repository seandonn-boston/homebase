# Stream 47: F4 — Multi-Orchestrator Federation & ASP Full Alignment

> Build the F4 (multi-orchestrator federation) ladder rung the aiStrat spec defines, and complete F-15 ASP full alignment for all 71 core + 34 extended agent definitions. The Enterprise profile (`B3 F4 E3 CP5 S3 P3 DE5`) cannot run without F4. Streams 48 (CP5) and 49 (DE5) depend on this stream's federation telemetry.

**Phase:** 24 — aiStrat Enterprise Profile Ladder Closure

**Scope:** `aiStrat/admiral/spec/index.md` § Per-Component Scaling defines Fleet F4 as "20–40 agents, multi-orchestrator, federation". The current implementation reaches F3 (12–20 agents + governance per `plan/index.md` Fleet & Orchestration row). F4 requires multi-orchestrator coordination protocol, cross-fleet handoff, orchestrator election/failover, and federated routing. Concurrently, F-15 (Agent Spec Protocol full alignment, partial since Phase 12) belongs here because ASP authority relationships and `extends` inheritance are exactly what multi-orchestrator federation needs to coordinate trust across fleets.

**Resolves rating-review weakness:** Listed in `plan/index.md` Fleet & Orchestration row as "Missing: ASP alignment, runtime agent instantiation". Resolves the F4 ladder gap that blocks the Enterprise profile.

**Principle:** Federation is not "more agents" — it is "more *fleets*". The boundary between fleets is where orchestrator authority transfers, where trust models intersect, and where ASP `extends` chains cross organizational scopes.

---

## 47.1 Multi-Orchestrator Coordination Protocol

- [ ] **F4-01: Define the federation protocol**
  - **Description:** Specify the wire protocol for cross-fleet coordination. Each federation member is a fleet with its own Orchestrator. The protocol covers: fleet discovery, federation join/leave, orchestrator role declaration, cross-fleet handoff request/grant/decline, conflict resolution, and federation health heartbeat. Output a protocol spec at `docs/federation-protocol.md` with a state diagram and an example handshake.
  - **Done when:** Protocol spec exists. Two example fleets handshake successfully on paper.
  - **Files:** `docs/federation-protocol.md` (new), `admiral/schemas/federation-message.v1.schema.json` (new)
  - **Size:** L
  - **Depends on:** Phase 23 (clean baseline)

- [ ] **F4-02: Implement the federation message bus**
  - **Description:** Build the transport for federation messages. Use the existing `control-plane/src/event-stream.ts` as the substrate but namespace federation messages with a `fleet_id` envelope. Each fleet runs a federation listener that subscribes to its own inbox plus broadcast topics. Messages are signed with the fleet's identity token (Brain B3 token lifecycle).
  - **Done when:** Federation message bus passes a 2-fleet integration test. Messages are signed and verified.
  - **Files:** `admiral/governance/federation-bus.ts` (new), `admiral/governance/federation-bus.test.ts` (new)
  - **Size:** L
  - **Depends on:** F4-01

- [ ] **F4-03: Cross-fleet handoff request/grant/decline**
  - **Description:** Extend the existing handoff protocol (Stream 8) with cross-fleet variants. A handoff initiated in Fleet A to a role only present in Fleet B becomes a federation handoff: serialized handoff payload, federation message envelope, target fleet receives via the bus, target fleet's orchestrator decides grant/decline based on trust + capacity, response routes back. Failure modes: target fleet unreachable, target orchestrator declines, target capacity exhausted.
  - **Done when:** Cross-fleet handoff completes end-to-end in a 2-fleet integration test, including the decline path.
  - **Files:** `admiral/governance/cross-fleet-handoff.ts` (new), `admiral/governance/cross-fleet-handoff.test.ts` (new)
  - **Size:** L
  - **Depends on:** F4-02

## 47.2 Orchestrator Election & Failover

- [ ] **F4-04: Orchestrator role declaration and discovery**
  - **Description:** Each fleet declares which agent holds the orchestrator role. Multiple orchestrators across fleets discover one another via the federation bus. Each orchestrator publishes its capabilities (which roles it can route to, which tiers it accepts) so other orchestrators know what they can hand off.
  - **Done when:** Orchestrator discovery test passes. Each fleet sees the others' published capabilities.
  - **Files:** `admiral/governance/orchestrator-discovery.ts` (new)
  - **Size:** M
  - **Depends on:** F4-02

- [ ] **F4-05: Orchestrator failover protocol**
  - **Description:** When an orchestrator becomes unreachable (heartbeat timeout), federation members elect a successor. Election uses the existing identity token system + a deterministic tiebreaker (lowest fleet_id). Failover preserves in-flight handoffs by promoting the second-most-trusted candidate within the failing fleet.
  - **Done when:** Failover test passes — kill an orchestrator, verify a new one is elected within 30s, verify in-flight handoffs survive.
  - **Files:** `admiral/governance/orchestrator-failover.ts` (new), `admiral/governance/orchestrator-failover.test.ts` (new)
  - **Size:** L
  - **Depends on:** F4-04

## 47.3 Federated Routing

- [ ] **F4-06: Cross-fleet routing engine**
  - **Description:** Extend the existing routing engine (Stream 15) with federation-aware routing. When a task arrives that no local agent can handle, the routing engine queries the federation for fleets with the required capability, evaluates cross-fleet handoff cost (latency, trust, queue depth), and decides whether to route locally with a fallback or escalate via federation handoff.
  - **Done when:** Cross-fleet routing test passes — submit a task no local fleet can handle, verify it routes to the correct remote fleet.
  - **Files:** `admiral/fleet/federated-routing.ts` (new), `admiral/fleet/federated-routing.test.ts` (new)
  - **Size:** L
  - **Depends on:** F4-02, F4-04

## 47.4 ASP Full Alignment (F-15)

- [ ] **F4-07: ASP schema validator**
  - **Description:** Implement the ASP validator from `aiStrat/admiral/spec/agent-spec-protocol/validation/`. Validates ASP-compliant agent definitions against the schema, checks `extends` inheritance chains, verifies authority relationship constraints, validates negative tool lists.
  - **Done when:** ASP validator runs against the example definitions in `aiStrat/admiral/spec/agent-spec-protocol/examples/` and passes.
  - **Files:** `admiral/fleet/asp-validator.ts` (new), `admiral/fleet/asp-validator.test.ts` (new)
  - **Size:** L
  - **Depends on:** Phase 23 (clean baseline)

- [ ] **F4-08: Convert all 71 core agent definitions to ASP format**
  - **Description:** Walk every agent definition in `admiral/fleet/agents/` and convert to ASP-compliant format: add `extends` parent declarations where applicable, declare authority relationships, add negative tool lists, add per-agent Decision Authority tier overrides where relevant. Preserve backwards-compatible legacy definitions during the transition.
  - **Done when:** All 71 core agent definitions pass `asp-validator` and the existing fleet routing tests still pass.
  - **Files:** `admiral/fleet/agents/*.json` (71 files)
  - **Size:** XL
  - **Depends on:** F4-07

- [ ] **F4-09: Convert all 34 extended agent definitions to ASP format**
  - **Description:** Same as F4-08 for the 34 extended (specialty) agents.
  - **Done when:** All 34 extended agent definitions pass `asp-validator`.
  - **Files:** `admiral/fleet/agents-extended/*.json` (34 files)
  - **Size:** L
  - **Depends on:** F4-07

- [ ] **F4-10: ASP CI validation**
  - **Description:** Add a CI step that runs `asp-validator` against every agent definition file. Fails the build if any definition is non-compliant. Wires into the existing `control-plane-ci.yml` workflow.
  - **Done when:** CI fails if a PR introduces a non-ASP-compliant agent definition.
  - **Files:** `.github/workflows/control-plane-ci.yml`, `scripts/validate-all-agents.sh` (new)
  - **Size:** S
  - **Depends on:** F4-08, F4-09

## 47.5 Federation Smoke Test

- [ ] **F4-11: 2-fleet federation smoke test**
  - **Description:** Build an end-to-end federation test: spin up two fleets in separate processes, connect via the federation bus, run a task that requires a cross-fleet handoff, verify the handoff completes, verify the result aggregator collects results from both fleets, verify federation health heartbeat. This is the F4-equivalent of Stream 36's E2E multi-agent test.
  - **Done when:** 2-fleet federation smoke test passes in CI.
  - **Files:** `control-plane/src/federation-e2e.test.ts` (new)
  - **Size:** L
  - **Depends on:** F4-03, F4-05, F4-06, F4-10

---

## Dependencies

| Item | Depends on |
|------|-----------|
| F4-01 (protocol spec) | Phase 23 |
| F4-02 (message bus) | F4-01 |
| F4-03 (cross-fleet handoff) | F4-02 |
| F4-04 (discovery) | F4-02 |
| F4-05 (failover) | F4-04 |
| F4-06 (federated routing) | F4-02, F4-04 |
| F4-07 (ASP validator) | Phase 23 |
| F4-08 (convert 71 core) | F4-07 |
| F4-09 (convert 34 extended) | F4-07 |
| F4-10 (CI validation) | F4-08, F4-09 |
| F4-11 (smoke test) | F4-03, F4-05, F4-06, F4-10 |

---

## Exit Criteria

- Federation protocol spec published with state diagram and example handshake.
- Two fleets can join a federation, exchange signed messages, and complete a cross-fleet handoff.
- Orchestrator failover preserves in-flight handoffs within 30s of failure detection.
- Cross-fleet routing engine selects remote fleets when no local agent can handle a task.
- All 71 core + 34 extended agent definitions are ASP-compliant and validated in CI.
- 2-fleet federation smoke test passes in CI.
- The Fleet axis of `plan/index.md` is updated to reflect F4 achievement.
