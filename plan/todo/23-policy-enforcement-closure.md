# TODO: Policy → Enforcement Closure (Phase 18)

> Source: `plan/ROADMAP.md` Phase 18, `plan/stream-41-policy-enforcement-closure.md`

**Resolves rating-review weakness:** Policy ≠ enforcement. Standing Orders are stubs. Most resolve to advisory fail-open paths. MCP tool responses bypass injection scanning.

**Phase exit:** `admiral/lib/so_enforcement.sh` has zero placeholder stubs; `zero_trust_validator.sh` scans MCP tool responses; ≥12/16 SOs at hard-block or tiered enforcement.

**This is the highest-credibility-leverage phase in the tier.**

---

## Standing Order Functions

- [ ] **PE-01** — Inventory current stub functions in `so_enforcement.sh`. Output `docs/so-enforcement-inventory.md`.
- [ ] **PE-02** — Implement SO-01 (Mission Alignment) enforcement against session state and `01-mission-alignment.json`.
- [ ] **PE-03** — Implement SO-02..SO-09 enforcement (Boundary Respect, Scope Adherence, Context Honesty, Decision Authority, Communication Discipline, Recovery Behavior, Quality Floor, Shadow MCP Servers). One sub-task per SO.
- [ ] **PE-04** — Audit SO-10..SO-16 current strength and document remediation plan.

## MCP Tool Response Scanning

- [ ] **PE-05** — Extend `zero_trust_validator.sh` to scan responses from any `mcp__*` tool with the same patterns as WebFetch/WebSearch.
- [ ] **PE-06** — Add ≥10 MCP-tool-response injection scenarios to the attack corpus and verify detection.

## Advisory → Hard-Block Promotions

- [ ] **PE-07** — Promote SO-09 to hard-block via `protocol_registry_guard.sh` reading `config/approved_mcp_servers.json`.
- [ ] **PE-08** — Promote SO-03 (Scope Boundaries) to hard-block on writes to protected paths via `config/protected_paths.json`.

## Completeness Matrix

- [ ] **PE-09** — Build the enforcement completeness matrix in `docs/standing-orders-enforcement-map.md`. Target ≥12/16 at green/yellow.
- [ ] **PE-10** — Update `IMPLEMENTATION_STATUS.md` and `plan/index.md` to reflect new enforcement strength.
