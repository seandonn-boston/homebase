# Admiral Framework v0.3.1-alpha — Comprehensive Remediation Plan

## Context

Two independent critical reviews identified ~25 issues across the Admiral Framework v0.2.0-alpha specification repository. The owner has provided directives for each. This plan addresses all concerns in 6 phases, ordered by dependency. The version bumps from v0.2.0-alpha to **v0.3.0-alpha** due to the Brain restructuring (5-level system with Brain complete at L3) and the scope of structural changes.

**Key owner decisions:**
- Brain: 5-level system, Brain fully complete by L3. L4-L5 fill in remaining framework components.
- Monitor: Expand specs, stub the workflow (no Python code).
- Fleet agents: Transparent that they're high-quality samples, not battle-tested.
- research/ and thesis/ move to homebase root.
- Version bump to v0.3.0-alpha warranted.

---

## Phase 1: MANIFEST Audit + Housekeeping (Do First)

**Rationale:** Owner mandated MANIFEST update as the first task — forces a full review that provides context for everything else. Combine with simple deletions/cleanups that have no downstream dependencies.

### 1A. Full MANIFEST.md rewrite
- **File:** `aiStrat/MANIFEST.md`
- Read every file in repo, update MANIFEST to accurately document all files
- Fix header count (currently "71 files across 15 groups" — actual spec file count differs)
- Add missing file entries: 18 attack corpus YAMLs (ATK-0001–0018), 8 hook manifests, `handoff/v1.schema.json`, `sales-pitch-30min-guide.md`
- Update descriptions for files whose content will change in later phases
- Add new groups as needed (Research, Thesis, etc. — note these are moving in Phase 4)

### 1B. Delete broken/vestigial files
- **Delete:** `.github/CODEOWNERS` (broken paths, will be recreated properly)
- **Delete:** `.claude/hooks.json` (empty artifact `{"hooks": {}}`)
- **Delete:** `aiStrat/REVIEW-codebase-critical-assessment.md` (issues being addressed)

### 1C. Clean .gitignore
- **File:** `.gitignore`
- Remove: `__pycache__/`, `*.pyc`, `.pytest_cache/`, `*.egg-info/`
- Keep: `.admiral/` and monitor seed-candidates comment
- Add: any new patterns needed for spec tooling

### 1D. Clean settings.local.json
- **File:** `aiStrat/.claude/settings.local.json`
- Remove Python-specific permissions: `python:*`, `pip install:*`, `PYTHONPATH=. python -m pytest`, `PYTHONPATH=. python -m scripts.quality_check`
- Keep: `wc`, `grep`, `find`, general-purpose commands
- Remove: `rm:*` (contradicts Section 08's own hook example about blocking destructive commands)

### Verification
- `find . -name "*.md" -not -path "./.git/*" | wc -l` matches MANIFEST entry count
- `.github/CODEOWNERS`, `.claude/hooks.json`, `REVIEW-*.md` are gone
- `.gitignore` has no Python patterns
- `settings.local.json` has no Python commands or `rm:*`

---

## Phase 2: Structural Moves + Version Bump

**Rationale:** Moving files and bumping versions affects every subsequent edit. Do this before content changes.

### 2A. Move research/ and thesis/ to homebase root
- `git mv aiStrat/research/ research/`
- `git mv aiStrat/thesis/ thesis/`
- Update MANIFEST.md to note these are now at repo root, outside aiStrat/
- These files are strategy/investment docs, NOT spec artifacts — explicitly exclude from spec versioning policy

### 2B. Version bump: v0.2.0-alpha → v0.3.0-alpha
- Update ALL version strings across the repo:
  - `<!-- Admiral Framework v0.3.0-alpha -->` on line 1 of every `.md` file in `aiStrat/`
  - `-- Admiral Framework v0.3.0-alpha` on line 1 of every `.sql` file
  - `admiral/index.md` line 6: `v0.3.0-alpha · March 2026`
  - `AGENTS.md` version reference
  - `admiral/appendices.md` Appendix F footer
  - `sales-pitch-30min-guide.md` version reference
- Add version comments to the 4 `.md-example` template files (currently missing)
- Do NOT add version comments to `research/*.md` or `thesis/*.md` (now outside aiStrat/, explicitly excluded)

### 2C. Update versioning policy
- **File:** `aiStrat/AGENTS.md` (versioning section)
- Clarify that version comments apply to files within `aiStrat/` only
- Research, thesis, and sales materials at repo root are excluded
- Update the grep command to reflect new structure

### Verification
- `ls research/ thesis/` at repo root confirms move
- `grep -rn "v0\.2\.0" aiStrat/ --include="*.md" --include="*.sql"` returns zero results
- `grep -rn "v0\.3\.0" aiStrat/ --include="*.md" --include="*.sql"` shows all spec files
- No `.md` file in `aiStrat/` is missing the version comment on line 1

---

## Phase 3: Content Fixes (Spec Text Corrections)

**Rationale:** Fix factual errors, contradictions, and stale references in spec prose. These are surgical edits to existing files.

### 3A. Clean up deprecated admiral/ references
- **`admiral/appendices.md`** lines 481-484: Rewrite Case Study 4 implementation references. Change from "Created `admiral/AGENTS.md`" / "Implemented `admiral/protocols/standing_orders.py`" to past-tense references noting the reference implementation was removed and its learnings captured in the spec. Keep the lessons, remove the file paths.
- **`admiral/part3-enforcement.md`** line 282: Rewrite implementation lesson to remove `admiral/hooks/self_healing.py` reference. Keep the insight about `(hook_name, error_signature)` tuples.
- **`admiral/part11-protocols.md`** line 12: Rewrite implementation lesson to remove `admiral/protocols/standing_orders.py` reference. Keep the lesson about not deferring Standing Orders.
- **`hooks/README.md`** line 31: Remove reference to `admiral/hooks/implementations/`. Clarify that implementations live in consuming projects without naming a specific directory.

### 3B. Create proper CODEOWNERS
- **Create:** `.github/CODEOWNERS`
- Reference actual paths: `/aiStrat/` for all spec files
- Add `/aiStrat/admiral/` for doctrine (highest scrutiny)
- Add `/aiStrat/hooks/` for hook specs
- Add `/aiStrat/brain/schema/` for database schemas
- Add `/aiStrat/fleet/agents/command/` for command agent definitions
- Ensure the spec (Section 10) documents CODEOWNERS as a Level 1 requirement (it already does — verify)

### 3C. Fix governance.md self-monitoring contradiction
- **File:** `aiStrat/fleet/agents/governance.md`
- Find "Nothing monitors the governance agents themselves" and rewrite
- Clarify: governance agents DO self-monitor via heartbeats and cross-audits; what's missing is an EXTERNAL non-governance monitor. The Admiral serves as the external accountability layer.

### 3D. Fix scale-extended.md exploratory count
- **File:** `aiStrat/fleet/agents/extras/scale-extended.md`
- Count actual `[Exploratory]` markers — should be 9, not 8
- Update preamble line 8 to correct count

### 3E. Fix domain.md duplicate output routing
- **File:** `aiStrat/fleet/agents/extras/domain.md`
- All 7 agents have duplicate "Orchestrator on completion" / "Orchestrator on task completion"
- Remove the duplicate line from each agent (7 edits)

### 3F. Fix test_schema.sql parity
- **File:** `aiStrat/brain/schema/test_schema.sql`
- Add missing `purge_regulation TEXT` column to entries table to match `001_initial.sql`

### 3G. Fix ATTACK_CORPUS category mismatch
- The SQL enum in `001_initial.sql` defines categories: `decision`, `pattern`, `failure`, `context`, `architecture`
- 3 files reference `ATTACK_CORPUS` as a Brain category (adversarial.md, quality.md, lifecycle.md)
- The attack-corpus README correctly says to use `failure` category with attack corpus metadata tag
- Fix the 3 agent files to reference `failure` category with `metadata.source: 'attack_corpus'` tag instead of `ATTACK_CORPUS` category

### 3H. Fix minimum viable reading path
- **Files:** `admiral/index.md`, `MANIFEST.md`
- Recalculate actual line counts for each file in the reading path
- Make both locations consistent (same file list, same total)
- If the actual count is ~1,200, state ~1,200 (not ~900 or ~800)

### 3I. Remove marketing language from specs
- **`admiral/part5-brain.md`**: Replace subtitle "Infrastructure designed for anything" with a descriptive question matching other parts (e.g., "How does the fleet remember?")
- Scan other part files for similar tagline language and normalize

### 3J. Address circular dependency
- **`admiral/appendices.md`** Appendix A (Pre-Flight Checklist): Add a "Bootstrap Note" acknowledging the circularity — the checklist validates that Standing Orders are loaded, but using the checklist presupposes familiarity with Standing Orders. Provide a bootstrap sequence: (1) read Standing Orders, (2) configure agent context to include them, (3) run Pre-Flight Checklist to verify.
- **`admiral/reference-constants.md`**: Add a note that this file derives authority from the spec sections it references, creating an intentional bidirectional dependency — the spec defines intent, this file defines constants, each validates the other.

### 3K. Condense Metered Service Broker
- **File:** `admiral/part8-operations.md` Section 26
- Remove implementation-specific details ("in-memory for dev, SQLite/Postgres for production")
- Keep: four-component architecture (Credential Vault, Session Broker, Billing Engine, Data Store), behavioral principles, state machine (QUEUED→ACTIVE→ENDED/EXPIRED), billing formula
- Reduce from ~35 lines to ~20 lines of pure spec

### Verification
- `grep -rn "admiral/protocols/" aiStrat/ --include="*.md"` returns zero
- `grep -rn "admiral/hooks/" aiStrat/ --include="*.md"` returns zero (except hooks/README.md which should now say "consuming projects")
- `grep -rn "ATTACK_CORPUS" aiStrat/fleet/` returns zero
- test_schema.sql has `purge_regulation` column
- scale-extended.md preamble matches actual [Exploratory] count
- domain.md has no duplicate output routing lines

---

## Phase 4: Major Spec Restructuring

**Rationale:** These are substantial content changes that reshape framework structure.

### 4A. Brain: 5-Level Restructuring (Brain complete at L3)
The Brain is fully specified by Level 3. Levels 4-5 address the rest of the framework.

**New level structure:**

| Level | Brain | Fleet | Hooks | Monitor | Governance |
|-------|-------|-------|-------|---------|------------|
| L1: Disciplined Solo | File-based JSON | 1 agent | Token budget + loop detection | None | Standing Orders only |
| L2: Core Fleet | SQLite + embeddings | 5-8 agents, Orchestrator | + context health, tier validation | None | Advisory |
| L3: Governed Fleet | **Postgres + pgvector + MCP** (COMPLETE) | + governance agents | + identity, scope boundary | Spec-only quarantine | Active governance agents |
| L4: Full Framework | Brain unchanged | Full fleet + scale agents | Full enforcement | Operational monitor | Full calibration |
| L5: Enterprise | Brain + cross-org federation | Multi-fleet coordination | Cross-fleet hooks | Multi-source intelligence | Multi-operator governance |

**Files to modify:**
- **`brain/README.md`**: Update architecture overview to reflect 5 levels, Brain complete at L3
- **`brain/level1-spec.md`**: Minor updates, ensure graduation criteria points to L2
- **`brain/level2-spec.md`**: Update graduation criteria to point to L3 (not "Level 3 Postgres" — now it's just "Level 3")
- **Create `brain/level3-spec.md`**: Full Postgres + pgvector + MCP + identity tokens + zero-trust + multi-hop + quarantine. This is the COMPLETE Brain. Pull content from current brain/README.md Level 3 sections.
- **`admiral/part5-brain.md`**: Restructure to reflect 5 levels, emphasize Brain completeness at L3
- **`admiral/index.md`**: Update adoption levels table to 5 levels
- **`admiral/appendices.md`**: Update Appendix B (Quick-Start) for 5 levels, update Pre-Flight Checklist

### 4B. Fleet Agent Transparency
- **`fleet/README.md`**: Add a prominent note: "Agent definitions in this catalog are detailed specifications, not battle-tested implementations. They represent the framework's design intent based on production patterns observed across the AI agent ecosystem. As Admiral matures through real-world deployments, these definitions will be validated, refined, and graduated from sample specifications to proven configurations."
- **`fleet/specialists.md`**: Add similar transparency note
- **`fleet/generalists.md`**: Add similar transparency note
- **`AGENTS.md`**: In project overview, add a sentence noting the fleet catalog is specification-phase

### 4C. Audience Framing Update
- **`admiral/index.md`**: Update "How to Read This Document" section
  - Current reality: Specs serve humans (admirals/implementers) and LLMs (agent context injection)
  - Future (Admiral as product): Will also serve machines (validators, CI, runtime hooks)
  - Rewrite to be honest about current vs. future audience split

### 4D. Monitor Spec Expansion
- **`monitor/README.md`**: Already comprehensive (221 lines). Verify it stands alone as architecture spec.
- **Create `monitor/scanner-spec.md`**: Specification for the scanner module — what it does, input sources, output formats, state schema, digest format. NOT code.
- **Create `monitor/state-schema.json`**: JSON Schema for `state.json` that the scanner would produce
- **Create `monitor/digest-format.md`**: Specification for daily/weekly digest markdown format
- **`.github/workflows/ai-monitor.yml`**: Replace Python execution with a stub comment block explaining the workflow is a specification of intended CI behavior, not yet implemented. Keep the structure (schedule, permissions, job steps) as documentation of intent but comment out the `run:` blocks or replace with `echo "Monitor scanner not yet implemented. See aiStrat/monitor/ for specification."`

### 4E. Standing Orders Enforcement — Eat Our Own Dogfood
- **`admiral/standing-orders-enforcement-map.md`**: Major update
  - Acknowledge current state honestly (4/15 hook-enforced)
  - Add a new section: "Spec Repository Self-Enforcement" describing what the framework enforces on ITSELF
  - Define spec-repo-appropriate hooks: version consistency, manifest freshness, link validation, SO integrity
  - Map each to a Standing Order and explain the analogy (e.g., version consistency = SO 1 Identity Discipline for files)
  - Update progression path to 5 levels
- **`admiral/part3-enforcement.md`** Section 08: Add a subsection or note acknowledging the enforcement gap and the plan to close it progressively. Reference the enforcement map.
- **Create hook manifests** for spec-repo hooks (specification-only, like existing manifests):
  - `hooks/version_consistency/hook.manifest.json` — SessionStart, validates version strings
  - `hooks/manifest_freshness/hook.manifest.json` — PostToolUse on Edit, checks MANIFEST sync
  - `hooks/link_validator/hook.manifest.json` — PostToolUse on Edit, validates cross-references
  - `hooks/standing_order_integrity/hook.manifest.json` — PostToolUse on Edit to part11, ensures all 15 SOs present

### 4F. Sales Pitch Tone Adjustment
- **File:** `aiStrat/sales-pitch-30min-guide.md`
- Remove emotional/embellished language
- Keep all factual claims and numbers
- Let data make the case — market sizes, agent counts, adoption levels
- Remove phrases like "Black Tuesday" framing if it's editorialized rather than factual

### 4G. Attack Corpus Remediation
- **`attack-corpus/README.md`**: Expand with:
  - Testing methodology: how to validate scenarios without a running system
  - Scenario validation checklist (can be done against spec alone: does expected behavior match documented Standing Order? does defense reference an existing hook?)
  - Maturity tracking: mark scenarios as "spec-validated" vs "runtime-validated"
  - Lifecycle: how scenarios graduate from seed to tested
- Review all 18 YAML files for consistency with updated Brain categories (use `failure` not `ATTACK_CORPUS`)

### Verification
- Brain level files: level1-spec.md, level2-spec.md, level3-spec.md all exist, graduation criteria chain correctly
- `admiral/index.md` adoption levels table has 5 rows
- Fleet README has transparency note
- Monitor has scanner-spec.md, state-schema.json, digest-format.md
- ai-monitor.yml is stubbed (no Python execution)
- 4 new hook manifests validate against manifest.schema.json
- Sales pitch reads as factual, not promotional

---

## Phase 5: CI Tooling + New CODEOWNERS

**Rationale:** CI depends on the file structure being finalized. Create after all structural changes.

### 5A. Create spec validation CI workflow
- **Create:** `.github/workflows/spec-validation.yml`
- Triggers: on PR, on push to main
- Jobs:
  1. **Version consistency**: grep all .md/.sql files in aiStrat/ for version string, fail if any mismatch
  2. **Manifest freshness**: compare file list against MANIFEST.md entries, warn on drift
  3. **JSON/YAML validation**: validate all .json and .yaml files parse correctly
  4. **Link validation**: check markdown cross-references resolve to existing files
  5. **Schema validation**: validate hook manifests against manifest.schema.json
- This is a simple bash/shell workflow, no Python needed

### 5B. Competitive Benchmarking Recommendations
- **Create:** `aiStrat/admiral/benchmarks.md` (or add as new Appendix H in appendices.md)
- Based on research files, define benchmarks Admiral should track:
  - **Governance overhead**: What % of total tokens go to governance agents vs. productive work?
  - **First-pass quality**: % of agent outputs that pass QA without revision (framework target: 75%)
  - **Recovery success rate**: % of failures resolved by recovery ladder without human escalation
  - **Context efficiency**: Useful output per token of context consumed
  - **Enforcement coverage**: % of safety-critical rules with deterministic (hook) enforcement
  - **Fleet coordination overhead**: Time/tokens spent on handoffs vs. actual task work
  - **Knowledge reuse rate**: % of Brain entries accessed more than once
- Competitive differentiators to highlight:
  - Only framework with explicit enforcement spectrum (hooks > instructions)
  - Only framework with progressive adoption levels (not all-or-nothing)
  - Only framework with built-in attack corpus and adversarial review
  - Only framework treating context as a first-class budgeted resource

### Verification
- CI workflow runs on push and passes
- benchmarks.md or Appendix H exists with measurable metrics

---

## Phase 6: Final Consistency Pass + MANIFEST Finalization

**Rationale:** After all changes, do a final sweep to catch any inconsistencies introduced during the remediation.

### 6A. Final MANIFEST.md update
- Re-review every file (content changed in phases 2-5)
- Update all descriptions to reflect current state
- Verify file count in header matches actual
- Update "Last modified" dates

### 6B. Cross-reference audit
- Verify all section number references are correct
- Verify all file path references resolve
- Verify agent counts still tally to stated totals
- Verify Standing Orders are consistently numbered 1-15 everywhere

### 6C. Appendix F version history
- **File:** `admiral/appendices.md` Appendix F
- Add v0.3.0-alpha changelog entry documenting all changes in this remediation

### 6D. AGENTS.md final update
- Reflect new 5-level adoption model
- Reflect moved research/thesis directories
- Update any stale cross-references

### Verification (End-to-End)
- `grep -rn "v0\.2\.0" aiStrat/` returns zero
- `grep -rn "v0\.3\.0" aiStrat/ --include="*.md" --include="*.sql"` covers all spec files
- All JSON files valid: `find aiStrat/ -name "*.json" -exec python3 -m json.tool {} \;`
- All YAML files valid: `find aiStrat/ -name "*.yaml" -exec python3 -c "import yaml; yaml.safe_load(open('{}'))" \;`
- `find aiStrat/ -name "*.md" | wc -l` matches MANIFEST count (excluding moved research/thesis)
- No broken markdown links
- CI workflow passes

---

## Summary: Files Modified/Created/Deleted

### Deleted (3)
- `.github/CODEOWNERS` (recreated properly in 3B)
- `.claude/hooks.json`
- `aiStrat/REVIEW-codebase-critical-assessment.md`

### Moved (2 directories)
- `aiStrat/research/` → `research/`
- `aiStrat/thesis/` → `thesis/`

### Created (~12)
- `.github/CODEOWNERS` (new, correct paths)
- `.github/workflows/spec-validation.yml`
- `aiStrat/brain/level3-spec.md`
- `aiStrat/monitor/scanner-spec.md`
- `aiStrat/monitor/state-schema.json`
- `aiStrat/monitor/digest-format.md`
- `aiStrat/hooks/version_consistency/hook.manifest.json`
- `aiStrat/hooks/manifest_freshness/hook.manifest.json`
- `aiStrat/hooks/link_validator/hook.manifest.json`
- `aiStrat/hooks/standing_order_integrity/hook.manifest.json`
- `aiStrat/admiral/benchmarks.md` (or Appendix H addition)

### Modified (~35+)
- Every `.md` file in `aiStrat/` (version bump line 1)
- Every `.sql` file in `aiStrat/` (version bump line 1)
- `aiStrat/MANIFEST.md` (major rewrite)
- `aiStrat/AGENTS.md` (versioning policy, adoption levels, transparency)
- `aiStrat/admiral/index.md` (adoption levels, reading path, audience)
- `aiStrat/admiral/part3-enforcement.md` (deprecated refs, enforcement gap acknowledgment)
- `aiStrat/admiral/part5-brain.md` (5-level restructure, subtitle)
- `aiStrat/admiral/part8-operations.md` (metered broker condensing)
- `aiStrat/admiral/part11-protocols.md` (deprecated refs)
- `aiStrat/admiral/appendices.md` (deprecated refs, 5-level Quick-Start, Pre-Flight, version history)
- `aiStrat/admiral/reference-constants.md` (circular dependency note)
- `aiStrat/admiral/standing-orders-enforcement-map.md` (major update)
- `aiStrat/admiral/spec-gaps.md` (version refs)
- `aiStrat/brain/README.md` (5-level structure)
- `aiStrat/brain/level1-spec.md` (graduation criteria update)
- `aiStrat/brain/level2-spec.md` (graduation criteria update)
- `aiStrat/brain/schema/test_schema.sql` (add purge_regulation)
- `aiStrat/fleet/README.md` (transparency note)
- `aiStrat/fleet/generalists.md` (transparency note)
- `aiStrat/fleet/specialists.md` (transparency note)
- `aiStrat/fleet/agents/governance.md` (self-monitoring fix)
- `aiStrat/fleet/agents/extras/scale-extended.md` (count fix)
- `aiStrat/fleet/agents/extras/domain.md` (duplicate routing fix)
- `aiStrat/fleet/agents/adversarial.md` (ATTACK_CORPUS → failure category)
- `aiStrat/fleet/agents/quality.md` (ATTACK_CORPUS → failure category)
- `aiStrat/fleet/agents/lifecycle.md` (ATTACK_CORPUS → failure category)
- `aiStrat/hooks/README.md` (deprecated ref cleanup)
- `aiStrat/attack-corpus/README.md` (testing methodology expansion)
- `aiStrat/sales-pitch-30min-guide.md` (tone adjustment)
- `.gitignore` (remove Python patterns)
- `aiStrat/.claude/settings.local.json` (remove Python permissions)
- `.github/workflows/ai-monitor.yml` (stub)

### Estimated scope per phase
- **Phase 1:** ~8 file edits/deletes — 1-2 hours
- **Phase 2:** ~60 version string updates + 2 git moves — 2-3 hours
- **Phase 3:** ~15 surgical text edits — 3-4 hours
- **Phase 4:** ~15 major content changes + 6 new files — 6-8 hours
- **Phase 5:** 2 new files — 1-2 hours
- **Phase 6:** Final sweep — 2-3 hours

**Total estimated scope: ~35+ files modified, ~12 created, 3 deleted, 2 directories moved**
