# Admiral Framework v0.2.0-alpha Overhaul -- Implementation Plan

## Dependency Graph and Execution Ordering

The 20 tasks have significant interdependencies. The correct execution order groups them into 6 phases based on dependency chains:

```
Phase 0 (Prereqs):     Task 18 (move research/thesis)
Phase 1 (Cleanup):     Task 2, 3, 4, 11 (delete/clean artifacts)
Phase 2 (Foundation):  Task 1 (MANIFEST), Task 6 (version comments), Task 15 (reading path), Task 16 (circular deps)
Phase 3 (Substance):   Task 5, 7, 9, 10, 12, 13 (spec content fixes)
Phase 4 (Polish):      Task 8, 14, 17, 19 (language/transparency updates)
Phase 5 (Strategy):    Task 20 (competitive analysis -- output only, no file changes required)
```

Key dependency chains:
- Task 18 must happen before Task 1 and Task 6 (paths change for research/thesis files)
- Task 4 logically pairs with Tasks 2 and 3 (all remove deprecated references)
- Task 1 (MANIFEST) should happen after Task 18 but before most other tasks (provides orientation)
- Task 7 depends on understanding from Task 5 (hooks + monitor are related)
- Task 12 depends on Task 5 (CI workflow replacement)
- Task 15 depends on Task 16 (reading path references are affected by circular dep fixes)

---

## Phase 0: File Moves (Task 18)

**Rationale:** Moving research/ and thesis/ changes file paths that cascade into MANIFEST, version comments, and cross-references. Do this first to avoid double-editing.

### Task 18: Move research/ and thesis/ to homebase root

**Actions:**
1. `git mv /home/user/homebase/aiStrat/research/ /home/user/homebase/research/`
2. `git mv /home/user/homebase/aiStrat/thesis/ /home/user/homebase/thesis/`
3. Search all files under `/home/user/homebase/aiStrat/` for references to `research/` and `thesis/` and update paths. Based on grep results, no doctrine files reference these directories, so the main impact is on MANIFEST.md (handled in Task 1).
4. Check if `AGENTS.md` or `CLAUDE.md` reference these directories and update if needed.

**Files changed:**
- 5 files moved from `aiStrat/research/` to `research/`
- 3 files moved from `aiStrat/thesis/` to `thesis/`
- Potentially `aiStrat/AGENTS.md` if it references these paths

---

## Phase 1: Cleanup (Tasks 2, 3, 4, 11)

These tasks are independent of each other and can be done in any order. They remove dead artifacts.

### Task 2: Delete and recreate CODEOWNERS

**Actions:**
1. Delete `/home/user/homebase/.github/CODEOWNERS`
2. Create new `/home/user/homebase/.github/CODEOWNERS` with minimal content:
```
# Admiral Framework Specification — Code Ownership
# See aiStrat/admiral/part3-enforcement.md Section 10 for full CODEOWNERS doctrine.
/aiStrat/ @admiral-maintainers
```
3. Verify `/home/user/homebase/aiStrat/admiral/part3-enforcement.md` Section 10 already documents CODEOWNERS creation as a Level 1 adoption step. Based on reading the file, Section 10 is titled "Configuration Security" and covers CODEOWNERS. Confirm the text says "Set CODEOWNERS" as a Level 1 item. If it only mentions CODEOWNERS conceptually without explicit adoption-level guidance, add a sentence clarifying it is a Level 1 adoption requirement.

**Files changed:**
- `.github/CODEOWNERS` -- delete and recreate
- Possibly `aiStrat/admiral/part3-enforcement.md` -- minor clarification if needed

### Task 3: Delete .claude/hooks.json

**Actions:**
1. Delete `/home/user/homebase/.claude/hooks.json`
2. No replacement needed. The spec project documents hooks as specifications in `aiStrat/hooks/`, not as runtime hooks.

**Files changed:**
- `.claude/hooks.json` -- delete only

### Task 4: Clean up deprecated admiral/* references

**Known locations from grep search:**
1. `/home/user/homebase/aiStrat/admiral/part11-protocols.md` line 12 -- references `admiral/protocols/standing_orders.py`. This is in an "Implementation lesson" callout describing the reference implementation. **Action:** Reword to make clear this is a reference to an external reference implementation, not a file in this repository. Change from backtick path to something like "the reference implementation's `standing_orders.py`" or add a note: "(reference implementation, not part of this spec repository)".
2. `/home/user/homebase/aiStrat/admiral/appendices.md` lines 483-484 -- references `admiral/protocols/standing_orders.py` and `admiral/protocols/escalation.py`. These are in Case Study 4 (Admiral-builds-Admiral). **Action:** Same treatment -- clarify these are reference implementation paths, not files in the spec repo.
3. `/home/user/homebase/aiStrat/admiral/part3-enforcement.md` line 282 -- references `admiral/hooks/self_healing.py`. **Action:** Same treatment.
4. `/home/user/homebase/aiStrat/hooks/README.md` line 31 -- references `admiral/hooks/implementations/` as an example implementation location. **Action:** Update to use a generic example path like `your-project/hooks/implementations/` instead of the deprecated `admiral/` path.
5. `.github/CODEOWNERS` -- already handled by Task 2.

**Files changed:**
- `aiStrat/admiral/part11-protocols.md` -- clarify reference implementation paths
- `aiStrat/admiral/appendices.md` -- clarify reference implementation paths
- `aiStrat/admiral/part3-enforcement.md` -- clarify reference implementation path
- `aiStrat/hooks/README.md` -- update example path

### Task 11: Fix .gitignore

**Actions:**
1. Edit `/home/user/homebase/.gitignore` to:
   - Remove `__pycache__/`, `*.pyc`, `.pytest_cache/`, `*.egg-info/`
   - Keep `.admiral/` (still relevant for spec -- runtime state directory)
   - Update the comment about seed-candidates: remove the `.py` extension reference, change to reflect spec-only project context
2. Resulting `.gitignore`:
```
# Admiral runtime session state (ephemeral, session-scoped)
.admiral/
```

**Files changed:**
- `.gitignore` -- simplify

---

## Phase 2: Foundation (Tasks 1, 6, 15, 16)

### Task 6: Add version comments to 9 files

**Actions:** Add `<!-- Admiral Framework v0.2.0-alpha -->` as line 1 to each file. After Task 18, the paths are:

1. `/home/user/homebase/research/AI-MODELS-TIMELINE.md`
2. `/home/user/homebase/research/hinton-et-al-ai-pioneers.md`
3. `/home/user/homebase/research/research-cutting-edge-usecases-mar-2026.md`
4. `/home/user/homebase/research/research-llm-agents-mar-2026.md`
5. `/home/user/homebase/research/research-top-agent-toolkits-mar-2026.md`
6. `/home/user/homebase/thesis/ai-fundamental-truths.md`
7. `/home/user/homebase/thesis/ai-internet-acceleration.md`
8. `/home/user/homebase/thesis/ai-investment-thesis.md`
9. `/home/user/homebase/aiStrat/sales-pitch-30min-guide.md`

**Files changed:** 9 files -- prepend version comment

### Task 16: Fix circular dependencies

**Analysis of the two circular chains:**

**Chain 1: Enforcement (Section 08) -> Standing Orders (Section 36) -> Protocols (Part 11)**
- Section 08 line 16 says: "PREREQUISITE: Read Standing Orders (Section 36, Part 11) before implementing hooks."
- Section 36 (Part 11) line 10 says Standing Orders are a Level 1 requirement.
- The issue: Section 08 tells you to read Section 36 first, but Section 36 is in Part 11. This is not truly circular -- it is a forward reference. The Minimum Viable Reading Path already puts Section 36 after Section 08 (item 4 after item 3).

**Fix for Chain 1:**
- In `part3-enforcement.md` Section 08, change the prerequisite note from "Read Standing Orders first" to a co-requisite note: "Standing Orders (Section 36) define the policy that hooks enforce. Both are Level 1 requirements. Read them together -- neither is complete without the other. The Minimum Viable Reading Path sequences them as items 3 and 4."
- In `part11-protocols.md`, the sequencing note on line 10 already correctly states Standing Orders are Level 1 despite being in Part 11. No change needed there.

**Chain 2: Index -> Intent Engineering -> Index**
- `index.md` references `intent-engineering.md` in the reading path (item 3.5).
- `intent-engineering.md` likely references back to `index.md` for the glossary or adoption levels.

**Fix for Chain 2:**
- In `intent-engineering.md`, change any back-reference to index.md to a "see also" rather than a prerequisite reference. If it says something like "refer to index.md for definitions," that is fine -- it is a lookup reference, not a prerequisite. This chain is likely not truly circular but may just feel that way. Verify by reading `intent-engineering.md` for index.md references and characterize each one.
- Add a "Dependency Direction" note at the top of `index.md`'s Table of Contents section that explains: "This document references forward to all Parts. Forward references are not prerequisites -- they indicate where to find details when ready."

**Files changed:**
- `aiStrat/admiral/part3-enforcement.md` -- reword prerequisite as co-requisite
- `aiStrat/admiral/index.md` -- add dependency direction note
- Possibly `aiStrat/admiral/intent-engineering.md` -- clarify back-reference nature

### Task 15: Fix Minimum Viable Reading Path

**Analysis of line counts:**
- `index.md`: 333 lines total. Glossary section + Adoption Levels = need to measure these specific sections.
- `part1-strategy.md`: 155 lines (full file).
- `part3-enforcement.md`: 571 lines total. Section 08 only = approximately first 200 lines (need to verify where Section 09 starts).
- `intent-engineering.md`: 187 lines (full file for Six Elements).
- `part11-protocols.md`: 697 lines total. Section 36 only = need to measure where Section 37 starts.
- `appendices.md`: 678 lines total. Appendix A only = need to measure.

The MANIFEST says "~800 lines" and `index.md` says "~900 lines." Both are likely wrong given these file sizes. Even reading just the specified sections, the total is probably 600-900 lines depending on how much of each file you include.

**Actions:**
1. Count the actual lines for each reading path item by finding section boundaries in each file.
2. Update both MANIFEST.md (line 18) and index.md (line 47) with the correct, consistent line count.
3. Verify the reading path covers all Level 1 needs by cross-referencing with the Level 1 adoption table.
4. The current reading path has 6 items (with intent-engineering.md as "3.5"). Renumber to 1-6 for clarity.
5. Both locations must use identical numbers and identical item descriptions.

**Files changed:**
- `aiStrat/MANIFEST.md` -- fix line count and reading path description
- `aiStrat/admiral/index.md` -- fix line count, renumber items

### Task 1: MANIFEST Update

This is the largest single task. The MANIFEST currently lists 71 files across 15 groups. The actual count is 101 files on disk (per the `find` result), though some may be excluded (like `.claude/settings.local.json`). After moving research/ and thesis/ out of aiStrat/, the aiStrat/ file count drops by 8, but the MANIFEST should still track companion files.

**Actions:**

1. **Update header line 4:** Change "71 files across 15 groups" to the correct count and group number.

2. **Add Attack Corpus group (18 YAML files):** Currently only `attack-corpus/README.md` is listed. Add entries for ATK-0001 through ATK-0018. Group these as a batch entry since they follow a uniform schema:
```
## Attack Corpus Scenarios (18 files)

attack-corpus/ATK-0001.yaml through ATK-0018.yaml - attack-corpus/scenarios - 2026-03-09:
18 seed attack scenarios covering: authority spoofing (ATK-0001 through ATK-0004),
credential fabrication (ATK-0005 through ATK-0007), behavior manipulation (ATK-0008
through ATK-0010), prompt injection (ATK-0011 through ATK-0013), failure scenarios
(ATK-0014 through ATK-0016), chaos scenarios (ATK-0017 through ATK-0018). Each
follows the entry schema defined in attack-corpus/README.md.
```

3. **Add Research group (5 files at new paths):**
```
## Research (5 files — companion, not in aiStrat/)

research/AI-MODELS-TIMELINE.md
research/hinton-et-al-ai-pioneers.md
research/research-cutting-edge-usecases-mar-2026.md
research/research-llm-agents-mar-2026.md
research/research-top-agent-toolkits-mar-2026.md
```
With proper descriptions for each.

4. **Add Thesis group (3 files at new paths):**
```
## Thesis (3 files — companion, not in aiStrat/)

thesis/ai-fundamental-truths.md
thesis/ai-internet-acceleration.md
thesis/ai-investment-thesis.md
```

5. **Add missing standalone files:**
- `aiStrat/sales-pitch-30min-guide.md` -- add to a "Supplementary" group or as standalone
- `aiStrat/admiral/spec-gaps.md` -- add to the Admiral Doctrine group
- `aiStrat/admiral/standing-orders-enforcement-map.md` -- add to the Admiral Doctrine group

6. **Update existing entries for stale descriptions:** Review each existing entry against current file content, particularly:
   - `index.md` entry: reading path says "~800 lines" -- update after Task 15
   - `part5-brain.md` entry: may need update after Task 9 changes
   - `part8-operations.md` entry: currently lists 7 sections including 26 (Cost Management) -- verify completeness

7. **Update file count:** The doctrine group grows from 15 to 17 files (adding spec-gaps.md and standing-orders-enforcement-map.md). Total count will be approximately: 17 doctrine + 8 fleet infra + 4 command + 4 command templates + 2 category templates + 4 engineering + 8 specialist + 4 extras + 6 brain + 1 monitor (grows with Task 5) + 1 handoff + 1 attack README + 18 attack YAML + 2 hook spec + 8 hook manifests + 3 config + 1 sales-pitch + 5 research (companion) + 3 thesis (companion) = approximately 100 files.

**Files changed:**
- `aiStrat/MANIFEST.md` -- extensive rewrite

---

## Phase 3: Substance (Tasks 5, 7, 9, 10, 12, 13)

### Task 5: Fix Monitor -- proper spec files

**Current state:** Only `monitor/README.md` exists (good architecture document). The GitHub workflow `ai-monitor.yml` references `python -m aiStrat.monitor.scanner` which does not exist.

**Actions:**
1. Create new spec files in `aiStrat/monitor/`:
   - `scanner-spec.md` -- Scanner orchestrator specification. Define: scan types (full, models, patterns, releases, discover), scan cadence (daily/weekly), output format, error handling, integration with state and digest systems.
   - `state-format-spec.md` -- Persistent state specification. Define: JSON schema for `state.json`, what gets tracked between scans, atomic write semantics.
   - `digest-format-spec.md` -- Digest output specification. Define: markdown digest format, naming convention (`YYYY-MM-DD.md`), sections (findings, alerts, seed candidates), severity classification.
   - `quarantine-spec.md` -- Detailed specification for each of the 5 quarantine layers. Expand the summary in README.md into individual layer specs with: input/output contracts, pass/fail criteria, test scenarios, integration points.

2. Update `monitor/README.md` to reference the new spec files and clarify that these are specifications, not implementations.

3. Update the MANIFEST (Task 1 dependency) to include the new monitor spec files.

**Files changed:**
- `aiStrat/monitor/scanner-spec.md` -- new
- `aiStrat/monitor/state-format-spec.md` -- new
- `aiStrat/monitor/digest-format-spec.md` -- new
- `aiStrat/monitor/quarantine-spec.md` -- new
- `aiStrat/monitor/README.md` -- update cross-references

### Task 12: Introduce CI Tooling

**Actions:**
1. Replace `/home/user/homebase/.github/workflows/ai-monitor.yml` with a specification document:
   - Rename or replace with `ai-monitor-spec.yml` -- a YAML file that describes what the CI workflow WILL look like when the monitor is implemented, with comments making clear it is not runnable.
   - Alternatively, convert the workflow to a markdown spec at `aiStrat/monitor/ci-workflow-spec.md` and delete the YAML entirely.

2. Create real, runnable CI workflows for spec validation:
   - `.github/workflows/spec-lint.yml` -- Runs markdown linting (markdownlint) on all `.md` files.
   - `.github/workflows/spec-validate.yml` -- Runs: (a) version comment consistency check (every .md file starts with `<!-- Admiral Framework v0.2.0-alpha -->`), (b) MANIFEST accuracy check (file list matches disk), (c) link checking (internal cross-references resolve), (d) YAML schema validation for attack corpus files.

3. These workflows should be real GitHub Actions using standard tools (markdownlint-cli, custom shell scripts for consistency checks).

**Files changed:**
- `.github/workflows/ai-monitor.yml` -- delete or convert to spec
- `.github/workflows/spec-lint.yml` -- new
- `.github/workflows/spec-validate.yml` -- new
- Possibly `aiStrat/monitor/ci-workflow-spec.md` -- new

### Task 7: Standing Order Enforcement Gap

**Current state:** 4/15 standing orders have hook enforcement (27%). The `standing-orders-enforcement-map.md` already has excellent gap analysis and recommended hooks.

**Actions:**
1. Create new hook manifest directories and files for the recommended hooks. Following the existing pattern in `aiStrat/hooks/`:

   **Level 2 additions (4 -> 8 hooks):**
   - `aiStrat/hooks/scope_boundary_gate/hook.manifest.json` -- SO 3 enforcement. PreToolUse. Validates file paths and tool operations against agent scope.
   - `aiStrat/hooks/decision_authority_gate/hook.manifest.json` -- SO 5 enforcement. PreToolUse. Intercepts high-risk actions and validates decision authority tier.
   - `aiStrat/hooks/pre_work_gate/hook.manifest.json` -- SO 15 enforcement. SessionStart. Verifies scope, Ground Truth, contracts, and acceptance criteria before work begins.
   - `aiStrat/hooks/secret_detection/hook.manifest.json` -- SO 10 (partial) enforcement. PostToolUse. Scans outputs for plaintext secrets.

   **Level 3 additions (8 -> 12 hooks):**
   - `aiStrat/hooks/scope_file_gate/hook.manifest.json` -- SO 10 enforcement. PreToolUse (Write/Edit). Blocks file modifications outside assigned scope.
   - `aiStrat/hooks/compliance_boundary_check/hook.manifest.json` -- SO 14 enforcement. PreToolUse. Validates actions against configurable deny-list.
   - `aiStrat/hooks/output_routing_validator/hook.manifest.json` -- SO 2 enforcement. TaskCompleted. Validates output has explicit destination.
   - `aiStrat/hooks/checkpoint_verifier/hook.manifest.json` -- SO 7 enforcement. TaskCompleted. Validates checkpoint was produced.

   **Level 4 additions (12 -> 15 hooks):**
   - `aiStrat/hooks/quality_gate_integration/hook.manifest.json` -- SO 8 enforcement. PreCommit. Validates automated checks passed.
   - `aiStrat/hooks/communication_format_validator/hook.manifest.json` -- SO 9 enforcement. PostToolUse. Validates structured communication format.
   - `aiStrat/hooks/input_validation/hook.manifest.json` -- SO 12 enforcement. PreToolUse. Validates external data source inputs.

2. Update `aiStrat/admiral/standing-orders-enforcement-map.md`:
   - Update coverage summary from 4/15 to show the planned progression
   - Update the Complete Mapping table with the new hooks
   - Update the Enforcement Progression Path table with specific hook names at each level
   - Revise Level targets: Level 1: 4, Level 2: 8, Level 3: 12, Level 4: 15

3. Update `aiStrat/hooks/README.md` to list the new hooks in the reference manifest section.

**Files changed:**
- 11 new `hook.manifest.json` files (one per new hook directory)
- `aiStrat/admiral/standing-orders-enforcement-map.md` -- update tables
- `aiStrat/hooks/README.md` -- add new hook references

### Task 9: Brain Validity and Level Restructuring

**Current state:** `part5-brain.md` defines 4 levels: Level 1 (file), Level 2 (SQLite), Level 3 (Postgres+pgvector), Level 4 (full MCP). The adoption level table in `index.md` maps Brain levels to adoption levels loosely.

**Proposed restructuring:**

Current Brain Level -> Adoption Level mapping is implicit. Make it explicit and rethink:

| Adoption Level | Brain Level | What's New |
|---|---|---|
| Level 1 | No Brain | Session persistence via checkpoint files only (Section 24). Brain is not a Level 1 requirement. |
| Level 2 | Brain Level 1 (file-based) | Introduce persistent knowledge capture. JSON files in `.brain/`, git-tracked. Keyword retrieval. Validates the core hypothesis: does persistent memory help? |
| Level 3 | Brain Level 2 (SQLite + embeddings) | Semantic retrieval. Vector similarity search. Stepping stone to enterprise. Cross-project queries via database. |
| Level 4 | Brain Level 3 (Postgres + pgvector + MCP) | Enterprise-grade. Multi-signal retrieval, identity tokens, zero-trust, quarantine integration. Shared institutional knowledge across large organizations. |

Consider whether Level 5 is warranted. Based on the current spec, Level 4 already covers the full specification. A Level 5 would only make sense for genuinely novel capabilities not yet conceived (e.g., federated Brain across organizations, real-time streaming knowledge, autonomous Brain maintenance). **Recommendation:** Do not introduce Level 5 now. Note in the spec that the level system is extensible if future capabilities warrant it.

**Actions:**
1. Update `aiStrat/admiral/part5-brain.md`:
   - Add a "Validation Status" callout at the top: "The Brain architecture is specified but not yet validated in production. The maturity levels below are designed to progressively validate the core hypothesis before committing to infrastructure."
   - Restructure the level table to align with adoption levels explicitly.
   - Add a section on "Enterprise Value" highlighting shared institutional knowledge: cross-project learning, organizational pattern libraries, compliance audit trails.
   - Add a note that Level 5 is reserved for future extensions but not currently specified.

2. Update `aiStrat/brain/README.md`:
   - Add validation status note.
   - Update MCP tool descriptions to clarify they are Level 4 specifications.

3. Update `aiStrat/admiral/index.md` adoption level table:
   - Level 2: Add "Brain Level 1 (file-based knowledge capture)"
   - Level 3: Change from "Brain at Level 1-2" to "Brain Level 2 (SQLite + embeddings)"
   - Level 4: Clarify "Full Brain (Level 3: Postgres + pgvector + MCP)"

**Files changed:**
- `aiStrat/admiral/part5-brain.md` -- restructure, add validation status
- `aiStrat/brain/README.md` -- add validation note
- `aiStrat/admiral/index.md` -- update adoption level table

### Task 10: Attack Corpus Improvements

**Current state:** 18 YAML files (ATK-0001 through ATK-0018) exist with a proper schema defined in README.md. The YAML files use a slightly different format than the JSON schema in the README (YAML vs JSON, minor field variations).

**Actions:**
1. Validate all 18 YAML files against the schema in README.md. Based on the sample (ATK-0001), the YAML files match the schema fields. The README shows the schema in JSON but the files are YAML -- this is fine as long as the fields match.

2. Update `aiStrat/attack-corpus/README.md` to:
   - Add a "Coverage Gap Analysis" section identifying missing attack categories. Current coverage: authority spoofing (4), credential fabrication (3), behavior manipulation (3), prompt injection (3), failure scenarios (3), chaos scenarios (2). Potential gaps: data exfiltration, context poisoning, model confusion attacks, supply chain attacks (malicious MCP servers), side-channel information leakage.
   - Add a "Quarantine Layer Mapping" section that maps each ATK entry to the specific quarantine layer(s) that should catch it, creating a clear relationship between attack corpus and quarantine system.
   - Add a YAML schema file `attack-corpus/atk-schema.yaml` (or JSON Schema) for validation.

3. Consider adding 4-6 new ATK entries for the identified coverage gaps (ATK-0019 through ATK-0024). This expands the seed corpus to better cover the quarantine system's capabilities.

**Files changed:**
- `aiStrat/attack-corpus/README.md` -- add coverage gap analysis and quarantine mapping
- Potentially `aiStrat/attack-corpus/atk-schema.yaml` -- new schema file
- Potentially ATK-0019 through ATK-0024 -- new seed scenarios

### Task 13: Fix Metered Broker Service

**Current state:** `part8-operations.md` Section 26 (lines 187-221) contains implementation-level detail: component table with Credential Vault, Session Broker, Billing Engine, Data Store; ASCII architecture diagram; specific implementation principles like per-second billing formulas.

**Actions:**
1. Condense Section 26's Metered Service Broker subsection from ~35 lines of implementation detail to ~15 lines of specification-level description. Keep:
   - The purpose (manage shared credentials, prevent leakage, allocate costs)
   - The adoption level trigger (Level 3+)
   - Integration points (cost attribution, observability, configuration security)
2. Remove:
   - The ASCII component diagram
   - The component responsibility table (Credential Vault, Session Broker, Billing Engine, Data Store)
   - Implementation principles like per-second billing formulas and session state machines
   - Specific concurrency control details
3. Replace with a specification-level description:
   - What the broker does (manages shared pooled credentials for external services)
   - Why it exists (prevents credential leakage, concurrent session violations, unfair cost allocation)
   - What it requires (credential isolation, metered billing, audit trail)
   - Where to find implementation guidance (reference to a future implementation guide or appendix)

**Files changed:**
- `aiStrat/admiral/part8-operations.md` -- condense Section 26 broker content

---

## Phase 4: Polish (Tasks 8, 14, 17, 19)

### Task 8: Fleet Agents as Samples

**Actions:**
1. Update `aiStrat/fleet/README.md`:
   - Add a "Status" callout after the opening paragraph: "These agent definitions are reference samples -- project-agnostic templates that have been designed against the doctrine but not yet validated in production deployments. They represent the framework's recommended starting point, not battle-tested configurations."
   - Add a "Maturity Roadmap" subsection:
     - Current: Sample/Reference (designed, internally consistent, not production-tested)
     - Next: Validated (deployed in at least one production fleet with measured outcomes)
     - Target: Battle-tested (deployed across multiple organizations with published performance data)

2. Update `aiStrat/admiral/part4-fleet.md`:
   - Add a note in Section 11 (Fleet Composition) acknowledging that the 71 core + 29 extended definitions are reference templates, not validated configurations.
   - Add a judgment boundary note: "When deploying from the reference roster, treat each agent definition as a starting point. Customize identity, scope, and boundaries to your project. The reference roster provides architecture, not answers."

**Files changed:**
- `aiStrat/fleet/README.md` -- add status and roadmap
- `aiStrat/admiral/part4-fleet.md` -- add sample status note

### Task 14: Remove Cryptic Marketing Language

**Locations identified from grep:**
1. `aiStrat/admiral/index.md` line 12: "have a massive head start" -- replace with "are better positioned to deploy effectively"
2. `aiStrat/admiral/index.md` line 14: "Swiss army knife for that reality" -- replace with "a comprehensive governance toolkit for that reality"
3. `aiStrat/admiral/index.md` line 41: "the fleet's immune system" -- this is used as a metaphor for governance agents. Keep in the governance agent context (it is explanatory, not marketing) but remove from index.md where it reads as a sales phrase. Replace with: "You add governance agents -- automated oversight that catches failure modes compounding silently across sessions."
4. `aiStrat/fleet/agents/governance.md` line 7: "the fleet's immune system" -- keep here; it is a useful explanatory metaphor in the context of the governance agent documentation where it explains their function.
5. `aiStrat/sales-pitch-30min-guide.md`: Marketing language belongs here. Do NOT clean this file for marketing language (that is what it is for). Task 19 handles making it more data-driven.
6. Search for "Dead spiral" -- not found in grep. Search more broadly for other marketing phrases.
7. Additional phrases to search for and evaluate: "game-changer", "revolutionary", "paradigm shift", "unlock", "superpower", etc.

**Action:** Perform a systematic pass through all 15 doctrine files (`aiStrat/admiral/*.md`) identifying and replacing marketing language with precise specification language. The guiding principle: if the sentence would be out of place in an IEEE standard or RFC, rewrite it.

**Files changed:**
- `aiStrat/admiral/index.md` -- primary target
- Other doctrine files as identified during systematic pass

### Task 17: Audience Update

**Current state:** `index.md` describes three audiences: humans, LLM agents, machines. The "three-audience reading guide" is in the index.

**Actions:**
1. In `aiStrat/admiral/index.md`, update the audience section to:
   - Clarify current state: the specification currently serves two audiences (humans reading the docs, LLM agents receiving spec content as context).
   - Note that machine-readable formats (JSON schemas, YAML configs, API contracts) exist for specific components (hook manifests, handoff schema, attack corpus, brain schema) but comprehensive machine-readable representation of the full doctrine is a future goal.
   - Remove any implication that the full spec is currently machine-consumable.

2. In `aiStrat/AGENTS.md`, verify the audience description is consistent.

**Files changed:**
- `aiStrat/admiral/index.md` -- update audience section
- Possibly `aiStrat/AGENTS.md` -- consistency check

### Task 19: Fix Sales Pitch

**Actions:**
1. Edit `aiStrat/sales-pitch-30min-guide.md`:
   - Remove "Black Tuesday" framing (line 21) -- replace with factual description: "February 3, 2026 market reaction to Anthropic's autonomous agent announcement"
   - Remove "massive head start" (line 9) -- replace with data-driven framing
   - Keep all factual data points (dollar figures, market cap numbers, infrastructure spending)
   - Restructure the pitch from tone-driven to numbers-driven:
     - Lead with the data (market size, infrastructure spend, capability inflection)
     - Follow with the gap (governance is unsolved)
     - Present Admiral as the solution with specific capabilities, not emotional appeals
   - Remove editorializing language while preserving the factual content
   - The "elevator pitch" section can stay conversational (it is a pitch) but should lead with facts not feelings

**Files changed:**
- `aiStrat/sales-pitch-30min-guide.md` -- rewrite for neutral, data-driven tone

---

## Phase 5: Strategy (Task 20)

### Task 20: Competitive Differentiation and Benchmarks

This task produces analysis and recommendations. Output can be added to `spec-gaps.md` or a new `competitive-analysis.md` document.

**Actions:**
1. Create `aiStrat/admiral/competitive-analysis.md` with:

   **Differentiation vs. specific competitors:**
   - vs. BMAD: BMAD focuses on multi-agent development workflow. Admiral focuses on governance and operations. Differentiation: Admiral's enforcement spectrum (hooks vs instructions), governance agents, standing orders, Brain (persistent semantic memory). BMAD does not address failure mode catalogs, quarantine systems, or progressive adoption levels.
   - vs. Ruflo: Ruflo provides workflow automation. Admiral provides governance doctrine. Non-overlapping but could be complementary.
   - vs. everything-claude-code: Community configuration collections. Admiral is a governance framework. The configurations are commoditized; the governance doctrine is the moat.
   - vs. Platform absorption (Anthropic Agent SDK, OpenAI Swarm, etc.): Platforms provide runtime. Admiral provides doctrine. The risk is that platforms absorb governance features. Mitigation: Admiral's value is in the complete, integrated doctrine (100+ agent definitions, 15 standing orders, 20 failure modes, enforcement spectrum) -- platforms are unlikely to replicate this comprehensiveness.

   **Recommended benchmarks to start testing:**
   - Governance overhead: % of tokens spent on governance vs. productive work
   - Enforcement reliability: % of standing orders with deterministic enforcement (currently 27%)
   - Context efficiency: % of context window used for standing context vs. task context
   - Failure mode coverage: % of documented failure modes with detection mechanisms
   - Adoption velocity: Time from zero to Level 1 deployment (target: <2 days)
   - Knowledge retrieval precision: % of Brain queries returning relevant results at top-1

2. Update MANIFEST to include the new file.

**Files changed:**
- `aiStrat/admiral/competitive-analysis.md` -- new
- `aiStrat/MANIFEST.md` -- add entry

---

## Complete Execution Sequence

Recommended commit order (each step is one or more atomic commits):

| Step | Tasks | Commit Message Pattern |
|---|---|---|
| 1 | Task 18 | "Move research/ and thesis/ to homebase root" |
| 2 | Tasks 2, 3, 11 | "Clean up deprecated config files (CODEOWNERS, hooks.json, .gitignore)" |
| 3 | Task 4 | "Update deprecated admiral/* references to clarify reference implementation" |
| 4 | Task 6 | "Add version comments to 9 files missing them" |
| 5 | Task 16 | "Fix circular dependency references (co-requisite, dependency direction notes)" |
| 6 | Task 15 | "Fix minimum viable reading path line counts and consistency" |
| 7 | Task 5 | "Add monitor specification files (scanner, state, digest, quarantine specs)" |
| 8 | Task 12 | "Replace dead CI workflow with spec validation workflows" |
| 9 | Task 7 | "Add hook manifests for standing order enforcement gaps (11 new hooks)" |
| 10 | Task 9 | "Restructure Brain maturity levels with adoption level alignment" |
| 11 | Task 10 | "Improve attack corpus with coverage gap analysis and quarantine mapping" |
| 12 | Task 13 | "Condense metered broker service to spec-level description" |
| 13 | Task 8 | "Acknowledge fleet agent definitions as reference samples" |
| 14 | Task 14 | "Replace marketing language with specification language in doctrine" |
| 15 | Task 17 | "Update audience documentation for current state" |
| 16 | Task 19 | "Rewrite sales pitch for data-driven neutrality" |
| 17 | Task 1 | "Complete MANIFEST update (all files, corrected counts and descriptions)" |
| 18 | Task 20 | "Add competitive analysis and benchmark recommendations" |

Note: Task 1 (MANIFEST) is done near the end despite being listed first in priority. The user specified "DO FIRST" meaning it provides context, but practically it should be done after most file changes are complete so the MANIFEST reflects the final state. Read it first for orientation, update it last for accuracy.

---

## Risk Assessment

1. **Reading path line count verification** (Task 15): Need to precisely count section-specific lines, not whole files. The reading path specifies "Section 08 only" and "Section 36 only" and "Appendix A only" -- line counts must reflect partial files.

2. **Task 7 scope creep**: 11 new hook manifests is substantial. Each must follow the exact schema in `hooks/manifest.schema.json`. Validate each against the schema.

3. **Task 4 sensitivity**: The `admiral/protocols/standing_orders.py` reference in Part 11 is in an "Implementation lesson" block that is pedagogically valuable. The fix should preserve the lesson while clarifying the path is not in this repo.

4. **Task 14 judgment calls**: "Immune system" is used both as marketing and as a genuinely useful metaphor. The fix should be selective -- remove it from index.md marketing context, keep it in technical contexts (monitor/README.md, governance agents) where it serves an explanatory purpose.

5. **MANIFEST accuracy**: After all changes, the MANIFEST must be verified against disk. The CI workflow from Task 12 will automate this going forward.

### Critical Files for Implementation
- `/home/user/homebase/aiStrat/MANIFEST.md` - Central registry that must reflect all 20 tasks' file changes; updated last for accuracy
- `/home/user/homebase/aiStrat/admiral/index.md` - Affected by Tasks 9, 14, 15, 16, 17; contains adoption levels, reading path, audience, and marketing language
- `/home/user/homebase/aiStrat/admiral/standing-orders-enforcement-map.md` - Core file for Task 7; defines the enforcement gap that is the framework's biggest credibility issue
- `/home/user/homebase/aiStrat/admiral/part5-brain.md` - Core file for Task 9; brain level restructuring affects the adoption level story across multiple files
- `/home/user/homebase/aiStrat/admiral/part3-enforcement.md` - Affected by Tasks 4, 16; contains the enforcement spectrum and the circular dependency prerequisite note
