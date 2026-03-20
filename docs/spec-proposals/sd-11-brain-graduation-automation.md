# SD-11: Spec Gap Proposal — Brain Graduation Automation

> Proposes concrete answers for the five underspecified areas in Brain level transitions (UNDERSPEC-02 from SD-01 inventory).
>
> Affected streams: 11
>
> Priority: Constraining (Priority 2 per SD-02 queue — Phase 3 B1, Phase 6 B2/B3)
>
> Date: 2026-03-20

---

## Background

The Brain spec (Part 5) defines three levels (B1: file-based, B2: SQLite + embeddings, B3: Postgres + pgvector) with quantitative advancement thresholds:

- Hit rate >= 85%
- Precision >= 90%
- Reuse rate >= 30% of entries accessed 2+ times
- >= 5% improvement over the 2-week baseline at the next level
- Each level must run for at least 2 weeks of active fleet operation

The spec says "advance when these thresholds are met" but does not specify who initiates, whether graduation is reversible, what the migration process looks like, whether the Brain remains available during migration, or how to validate a level before committing.

---

## 1. Graduation Initiation Authority

### Current State

The spec states thresholds but not who evaluates them or triggers the transition. The `_meta` namespace tracks graduation criteria as `outcome` entries, but no actor is assigned to act on them.

### Proposed Protocol

#### Graduated Authority Model

Graduation initiation follows the Decision Authority tiers (Part 3), with automation doing measurement and the Admiral making the decision:

| Action | Authority | Rationale |
|--------|-----------|-----------|
| **Metrics collection** | Automated (SessionStart hook or scheduled job) | Deterministic — no judgment needed |
| **Threshold evaluation** | Automated (`brain_graduation_check.sh`) | Deterministic — compare numbers to thresholds |
| **Graduation recommendation** | Automated → Admiral notification | The system recommends; the human decides |
| **Graduation approval** | Admiral only | Infrastructure change with rollback cost — requires human judgment |
| **Graduation execution** | Automated (migration script) | Deterministic once approved |

#### Evaluation Cadence

```
Daily: brain_graduation_check.sh runs at session start (or via cron)
  → Reads _meta/outcome entries for graduation criteria
  → Computes rolling 2-week metrics from demand signals and access logs
  → If all thresholds met for >= 14 consecutive days:
      → Writes _meta/outcome entry: "Graduation criteria met for B{N}→B{N+1}"
      → Alerts Admiral: "Brain graduation from B{current} to B{next} is recommended"
  → If thresholds NOT met:
      → Updates _meta/context entry with current metrics (silent, no alert)
```

#### Admiral Approval Flow

1. Admiral receives graduation recommendation with:
   - Current level and proposed level
   - Rolling 2-week metrics (hit rate, precision, reuse rate, improvement delta)
   - Entry count and storage size
   - Estimated migration duration
   - Known risks for this specific transition
2. Admiral responds: `APPROVE`, `DEFER` (with reason), or `REJECT` (with reason)
3. Response is recorded as a `_meta/decision` Brain entry for audit trail
4. On `APPROVE`, the migration script is invoked (see Section 3)

#### Why Not Fully Automated?

Brain graduation changes the infrastructure stack (files → SQLite → Postgres). Each level introduces new dependencies, new failure modes, and new operational requirements. The measurement is automatable; the judgment about whether the fleet is ready for the operational complexity is not. A fleet may meet B2 thresholds but lack the infrastructure team to operate Postgres. The Admiral makes that call.

---

## 2. Reversibility Policy

### Current State

The spec does not mention rolling back from a higher Brain level to a lower one. Supersession is defined for entries, not for the Brain system itself.

### Proposed Protocol

#### Rollback Classification

| Transition | Rollback Difficulty | Data Risk | Policy |
|-----------|-------------------|-----------|--------|
| B2 → B1 | Low | None — B1 files are a subset of B2 data | **Supported** |
| B3 → B2 | Medium | Moderate — Postgres features (HNSW indexes, multi-hop at scale) have no B2 equivalent | **Supported with data loss acknowledgment** |
| B3 → B1 | High | Significant — embeddings and link graph are lost entirely | **Emergency only** |

#### Rollback Triggers

Rollback is initiated by the Admiral when:

1. **Infrastructure failure**: The new level's infrastructure cannot be maintained (e.g., Postgres goes down and cannot be restored within SLA)
2. **Quality regression**: Retrieval quality at the new level is measurably worse than the old level after 1 week of operation (regression, not just "not improved enough")
3. **Operational cost**: The new level's operational burden exceeds the fleet's capacity (e.g., B3 requires a DBA the team doesn't have)
4. **Emergency**: The Brain is actively causing fleet harm (poisoned entries, security breach in the new infrastructure)

#### Rollback Process

**B2 → B1 rollback:**

1. Export all B2 entries to B1 JSON file format (one file per entry in `.brain/`)
2. Preserve all metadata, links, and tags in the JSON structure
3. Embeddings are discarded (B1 uses keyword search)
4. Demand signals are preserved as `.brain/_demand/` files
5. `_meta` records the rollback as a `decision` entry with rationale
6. Estimated duration: minutes (file writes only)

**B3 → B2 rollback:**

1. Export Postgres entries to SQLite format
2. Preserve entries, embeddings, and basic links
3. **Data loss**: HNSW indexes are rebuilt as flat indexes (slower but equivalent). Multi-hop traversal beyond depth 1 may be slower. Audit log is exported as a separate SQLite table (no longer append-only guaranteed).
4. Admiral must acknowledge data loss before proceeding
5. `_meta` records the rollback
6. Estimated duration: minutes to hours depending on entry count

#### Rollback Prevention

To reduce rollback likelihood:
- Run dry-run mode (Section 5) before committing to graduation
- Maintain B1 files as a read-only archive for 30 days after B2 graduation
- Maintain SQLite as a read-only archive for 30 days after B3 graduation

---

## 3. Migration Process Details

### Current State

The spec defines a "Migration from File-Based Persistence" section covering files → Brain adoption. It does not cover the B1 → B2 → B3 infrastructure migrations.

### Proposed Protocol

#### B1 → B2 Migration

**Prerequisites:**
- SQLite available in the runtime environment
- An embedding model accessible (local or API — utility tier per Part 5)
- Graduation criteria met and Admiral-approved

**Migration steps:**

```
Phase 1: Schema Setup (automated, ~1 minute)
  1. Create SQLite database at admiral/brain/brain.sqlite
  2. Apply B2 schema (entries table with vector column, demand_log table)
  3. Validate schema with integrity check

Phase 2: Data Migration (automated, ~1 minute per 100 entries)
  1. Read all .brain/{project}/*.json files
  2. For each entry:
     a. Parse JSON, validate against entry schema
     b. Generate embedding from title + content via embedding model
     c. Insert into SQLite entries table
     d. Preserve original file timestamp as created_at
  3. Migrate .brain/_demand/*.json to demand_log table
  4. Migrate .brain/_meta/*.json to entries table with project="_meta"

Phase 3: Verification (automated, ~2 minutes)
  1. Count check: SQLite entry count == file count
  2. Spot check: 10 random entries compared field-by-field
  3. Retrieval check: 5 known queries tested against both B1 and B2
     → B2 results must be superset of B1 results (semantic search finds more)
  4. Write verification results to _meta/outcome entry

Phase 4: Cutover (requires Admiral confirmation)
  1. Admiral confirms verification results are acceptable
  2. Update brain configuration to point to SQLite
  3. Archive .brain/ directory to .brain.b1-archive/ (read-only)
  4. Brain is now operating at B2
```

#### B2 → B3 Migration

**Prerequisites:**
- Postgres instance available with pgvector extension
- Network connectivity from the runtime environment to Postgres
- Database credentials securely stored (not in Brain entries)
- Graduation criteria met and Admiral-approved

**Migration steps:**

```
Phase 1: Infrastructure Setup (manual or automated, varies)
  1. Provision Postgres instance (if not existing)
  2. Install pgvector extension
  3. Apply B3 schema from brain/schema/001_initial.sql
  4. Configure connection credentials
  5. Validate connectivity and permissions

Phase 2: Data Migration (automated, ~5 minutes per 1000 entries)
  1. Read all entries from SQLite
  2. For each entry:
     a. Insert into Postgres entries table
     b. Re-generate embeddings if embedding model version changed
        (otherwise copy existing vectors)
     c. Migrate entry_links
  3. Migrate demand_log table
  4. Migrate audit data
  5. Build HNSW indexes

Phase 3: Verification (automated, ~5 minutes)
  1. Count check: Postgres entry count == SQLite entry count
  2. Spot check: 20 random entries compared field-by-field
  3. Retrieval check: 10 known queries tested against both B2 and B3
  4. Multi-hop check: verify link traversal works at depth 2
  5. Performance check: B3 query latency <= B2 query latency
  6. Write verification results to _meta/outcome entry

Phase 4: MCP Server Activation (requires Admiral confirmation)
  1. Deploy Brain MCP server pointing to Postgres
  2. Configure identity token issuance
  3. Test MCP tools: brain_query, brain_record, brain_retrieve
  4. Admiral confirms MCP server is operational

Phase 5: Cutover (requires Admiral confirmation)
  1. Admiral confirms all verification and MCP checks pass
  2. Update brain configuration to use MCP server
  3. Archive SQLite to brain.b2-archive.sqlite (read-only)
  4. Brain is now operating at B3
```

#### Migration Failure Handling

If any migration phase fails:

- **Phase 1-2 failure**: No cutover occurred. The old level is still active. Fix the issue and retry.
- **Phase 3 failure (verification)**: Data migrated but verification failed. Diagnose the discrepancy. Do NOT proceed to cutover. Either fix and re-verify, or abort and clean up the new infrastructure.
- **Phase 4-5 failure (cutover)**: Roll back to the old level immediately using the rollback process (Section 2). The archive is still intact.

---

## 4. Brain Availability During Migration

### Current State

Not specified. Agents may attempt Brain operations during migration, encountering undefined behavior.

### Proposed Protocol

#### Availability Guarantee: Read-Available, Write-Paused

During migration, the Brain operates in a transitional mode:

| Operation | B1→B2 Migration | B2→B3 Migration |
|-----------|-----------------|-----------------|
| `brain_query` (read) | Available against B1 files | Available against SQLite |
| `brain_retrieve` (read) | Available against B1 files | Available against SQLite |
| `brain_record` (write) | **Paused** — queued for replay | **Paused** — queued for replay |
| `brain_strengthen` (write) | **Paused** — queued for replay | **Paused** — queued for replay |
| `brain_supersede` (write) | **Paused** — queued for replay | **Paused** — queued for replay |
| `brain_status` | Returns migration status | Returns migration status |

#### Write Queue

Writes during migration are not rejected — they are queued:

1. Write operations during migration are captured in a `migration_write_queue.jsonl` file
2. Each queued write includes: timestamp, operation, full parameters, requesting agent
3. After successful cutover, the queue is replayed against the new Brain level in order
4. If migration fails and rolls back, the queue is replayed against the old level
5. No writes are lost in either outcome

#### Agent-Visible Status

During migration, `brain_status` returns:

```json
{
  "status": "migrating",
  "migration": {
    "from": "B1",
    "to": "B2",
    "phase": "data_migration",
    "progress": "142/200 entries migrated",
    "estimated_remaining": "45 seconds",
    "reads_available": true,
    "writes_queued": true,
    "queued_write_count": 3
  }
}
```

Agents calling `brain_record` during migration receive:

```json
{
  "status": "queued",
  "message": "Brain is migrating from B1 to B2. Write queued for replay after cutover.",
  "queue_position": 4
}
```

#### Duration Bounds

| Migration | Expected Duration | Maximum Before Abort |
|-----------|------------------|---------------------|
| B1 → B2 | 1-10 minutes | 30 minutes |
| B2 → B3 | 5-60 minutes | 4 hours |

If migration exceeds the maximum duration, it is automatically aborted and the old level is restored. The Admiral is alerted.

---

## 5. Dry-Run / Shadow Mode

### Current State

The spec says "each level should run for at least 2 weeks of active fleet operation before advancing" but provides no mechanism to test a new level without committing to it.

### Proposed Protocol

#### Shadow Mode

Before graduating, the Brain can operate in **shadow mode** — running the new level alongside the old level without affecting fleet operations.

```
                    ┌─────────────┐
                    │   Agent     │
                    │ brain_query │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Router     │
                    │ (shadow)    │
                    └──┬──────┬───┘
                       │      │
              ┌────────▼┐  ┌──▼────────┐
              │  B1      │  │  B2       │
              │ (active) │  │ (shadow)  │
              │ ← result │  │ → log     │
              └──────────┘  └───────────┘
```

**How shadow mode works:**

1. **Reads are dual-issued**: Every `brain_query` runs against both the active level and the shadow level. Only the active level's results are returned to the agent. The shadow level's results are logged for comparison.
2. **Writes are mirrored**: Every `brain_record` writes to both levels. The active level is authoritative. The shadow level accumulates data for retrieval comparison.
3. **Metrics are collected separately**: Hit rate, precision, and reuse rate are tracked independently for the shadow level, stored in `_meta/outcome` entries tagged `shadow`.
4. **No agent impact**: Agents are unaware of shadow mode. They interact with the active level only. Shadow overhead is invisible to them.

#### Shadow Mode Metrics Report

After the 2-week minimum shadow period, `brain_graduation_check.sh` produces a comparison report:

```
Brain Shadow Mode Report (B1 active, B2 shadow)
Period: 2026-04-01 to 2026-04-15

                    B1 (active)    B2 (shadow)    Delta
Hit rate:           72%            89%            +17%  ✓ (>= 85%)
Precision:          85%            93%            +8%   ✓ (>= 90%)
Reuse rate:         22%            35%            +13%  ✓ (>= 30%)
Improvement:        —              +13% avg       ✓ (>= 5%)

Shadow query latency: 45ms avg (B1: 12ms, B2: 33ms overhead)
Shadow storage: 2.1 MB (SQLite)
Shadow write queue replay: 0 failures

RECOMMENDATION: Graduate to B2. All thresholds met for 14 consecutive days.
```

#### Shadow Mode Configuration

```yaml
# brain-config.yaml
shadow:
  enabled: false           # Admiral enables when ready to evaluate
  target_level: "B2"       # which level to shadow
  duration_days: 14        # minimum shadow period
  max_overhead_ms: 100     # abort shadow if query overhead exceeds this
  log_path: "admiral/brain/shadow-log/"
```

#### Shadow Mode Limitations

- **B2 → B3 shadow requires Postgres infrastructure.** Shadow mode does not eliminate the need to provision B3 infrastructure — it just lets you validate before committing the fleet to it.
- **Shadow mode adds latency.** Dual-issuing queries doubles Brain operation time. The `max_overhead_ms` config aborts shadow if it degrades fleet performance.
- **Shadow mode is not a substitute for migration testing.** It validates retrieval quality, not migration correctness. The migration verification phase (Section 3) still runs at cutover time.

---

## Impact Assessment

### Stream Unblocked

| Stream | What This Unblocks |
|--------|-------------------|
| **11** (Brain System) | B1 implementation can include graduation tooling from day one. B2/B3 transitions have a defined process rather than ad-hoc migration. |

### New Artifacts Required for Implementation

| Artifact | Stream | Description |
|----------|--------|-------------|
| `admiral/bin/brain_graduation_check.sh` | 11 | Evaluates graduation criteria against _meta entries |
| `admiral/bin/brain_migrate.sh` | 11 | Orchestrates migration between Brain levels |
| `admiral/schemas/brain-config.v1.schema.json` | 11 | Schema for brain configuration including shadow mode |
| `admiral/brain/migration/b1_to_b2.sh` | 11 | B1→B2 migration script |
| `admiral/brain/migration/b2_to_b3.sh` | 11 | B2→B3 migration script |
| `admiral/brain/migration/rollback_b2_to_b1.sh` | 11 | B2→B1 rollback script |
| `admiral/brain/migration/rollback_b3_to_b2.sh` | 11 | B3→B2 rollback script |

### Backward Compatibility

- No changes to existing Brain spec content
- Shadow mode and graduation check are additive tooling
- Migration scripts operate on Brain data, not on the spec

### Open Questions for Admiral Review

1. **Shadow mode for B3**: Running a shadow Postgres instance alongside production SQLite adds significant infrastructure complexity. Is this worthwhile, or should B2→B3 graduation rely solely on metrics + migration verification?
2. **Rollback data loss acceptance**: The B3→B2 rollback loses HNSW index performance and audit log append-only guarantees. Should the spec require a minimum archive retention period longer than 30 days?
3. **Automated rollback triggers**: Should quality regression (retrieval metrics drop below previous level's baseline for 7+ days) automatically trigger rollback, or should this always require Admiral approval?
4. **Multi-fleet graduation**: When multiple fleets share a Brain (B3 cross-project), does graduation require approval from all fleet Admirals or just one?

---

## Relationship to Other SD Tasks

| Task | Relationship |
|------|-------------|
| **SD-10** (Fleet orchestration protocol) | Orchestrator context management strategy informs how Brain checkpoint data is externalized during migration |
| **SD-03** (Amendment proposals) | This proposal is a candidate amendment to Part 5 (Brain Architecture) |
| **SD-06** (Reference constants) | Graduation thresholds, shadow mode defaults, and migration duration bounds should be added to reference constants |
| **SD-12** (Cross-platform hooks) | Shadow mode query routing may need platform-specific adaptation |
