# Stream 44: Directory Namespace Deduplication

> Resolve the triple namespaces in the repo: `fleet/` exists at the repo root, under `aiStrat/fleet/`, and under `admiral/fleet/`. Same for `monitor/` and `brain/`. Each is a different layer (root = ad-hoc, `aiStrat/` = spec, `admiral/` = runtime) but newcomers cannot tell which is which. This stream establishes one canonical location per concept, redirects the others, and proves via grep that nothing points to the wrong path.

**Phase:** 21 — Directory Namespace Deduplication (Credibility Closure Tier)

**Scope:** The Phase 14+ rating audit flagged "directory sprawl with namesakes" as the #4 weakness. The triple-namespace pattern is real: a search for `fleet/` resolves to three different directories with overlapping but not identical content. Same for `monitor/` and `brain/`. This stream audits every path reference, picks one canonical location per layer, redirects deprecated locations, and adds a CI lint rule that blocks new namespace duplicates.

**Resolves rating-review weakness:** "Directory sprawl with namesakes — triple `fleet/`, triple `monitor/`."

**Principle:** A path that means three things means nothing. Newcomers should be able to grep for a directory name and land in exactly one place, with the layer (spec vs runtime vs ephemeral) clear from context.

---

## 44.1 Audit

- [ ] **ND-01: Inventory all namespace duplicates**
  - **Description:** Walk the repo and produce a report of every directory name that exists in more than one location. Group by name (`fleet`, `monitor`, `brain`, etc.) and list every occurrence with its full path, file count, and apparent purpose. Output in `docs/namespace-audit.md`.
  - **Done when:** `namespace-audit.md` exists with every duplicate name listed.
  - **Files:** `docs/namespace-audit.md` (new)
  - **Size:** M
  - **Depends on:** —

- [ ] **ND-02: Map every internal reference to namespace paths**
  - **Description:** Grep the repo for references to each duplicated namespace name (e.g., `fleet/`, `aiStrat/fleet/`, `admiral/fleet/`). For each reference, capture the file, line, and which namespace it points to. Output as a CSV. This identifies which references will need to update when canonicalization happens in ND-04.
  - **Done when:** `docs/namespace-references.csv` exists with one row per reference.
  - **Files:** `docs/namespace-references.csv` (new)
  - **Size:** M
  - **Depends on:** ND-01

## 44.2 Three-Layer Contract

- [ ] **ND-03: Document the three-layer namespace rule in `ADMIRAL_STYLE.md`**
  - **Description:** Add a new "Namespace Layers" section to `ADMIRAL_STYLE.md` declaring the canonical three-layer rule: (1) `aiStrat/<name>/` = the frozen spec, (2) `admiral/<name>/` = the runtime implementation, (3) `.admiral/<name>/` or `.brain/<name>/` = ephemeral state. Top-level `<name>/` directories (e.g., root `fleet/`, `monitor/`, `mcp-server/`, `platform/`) are exceptional and require an ADR to justify their existence.
  - **Done when:** `ADMIRAL_STYLE.md` documents the three-layer rule with an example for `fleet/`.
  - **Files:** `ADMIRAL_STYLE.md`
  - **Size:** S
  - **Depends on:** ND-01

## 44.3 Canonicalization

- [ ] **ND-04: Pick one canonical location per duplicated namespace**
  - **Description:** For each duplicated name in ND-01, pick the canonical location per layer using the three-layer rule from ND-03. For each non-canonical location, decide: (a) merge content into canonical, (b) leave in place with a redirect README, or (c) delete entirely. Output decisions as `docs/namespace-canonical.md`.
  - **Done when:** Canonical decisions exist for every duplicated name.
  - **Files:** `docs/namespace-canonical.md` (new)
  - **Size:** M
  - **Depends on:** ND-02, ND-03

- [ ] **ND-05: Add redirect READMEs in deprecated locations**
  - **Description:** For every non-canonical location in ND-04, add a `README.md` at the directory root explaining: "This directory is deprecated. The canonical location is `<path>`. See `docs/namespace-canonical.md` for the rationale." If the deprecated directory still has content, the README must explicitly state which content moved where.
  - **Done when:** Every deprecated namespace location has a redirect README.
  - **Files:** Multiple README.md files
  - **Size:** M
  - **Depends on:** ND-04

- [ ] **ND-06: Update internal references to canonical paths**
  - **Description:** Walk through `docs/namespace-references.csv` from ND-02. For each reference that points to a non-canonical location, update it to point to the canonical location. Verify the link/import resolves after each change.
  - **Done when:** Zero internal references point to non-canonical namespace paths.
  - **Files:** Multiple files across `docs/`, `plan/`, source code
  - **Size:** L
  - **Depends on:** ND-04

## 44.4 CI Lint Rule

- [ ] **ND-07: Add CI lint rule blocking new namespace duplicates**
  - **Description:** Create `scripts/check-namespace-duplicates.sh` that walks the repo and fails if any new top-level directory matches an existing namespace name from `docs/namespace-canonical.md`. Wire it into the existing pre-commit and CI workflows.
  - **Done when:** CI fails if a PR introduces a new namespace duplicate. Pre-commit also blocks locally.
  - **Files:** `scripts/check-namespace-duplicates.sh` (new), `.github/workflows/spec-validation.yml` (extended), `.githooks/pre-commit`
  - **Size:** M
  - **Depends on:** ND-04

- [ ] **ND-08: Verify `grep` cleanliness**
  - **Description:** Run `grep -r "fleet/" docs/ plan/ aiStrat/` (and the same for `monitor/`, `brain/`) and confirm zero ambiguous paths remain. Every match must either be unambiguously canonical or be inside a redirect README explaining the deprecation.
  - **Done when:** Final grep audit produces zero ambiguous matches. Documented in `docs/namespace-audit-final.md`.
  - **Files:** `docs/namespace-audit-final.md` (new)
  - **Size:** S
  - **Depends on:** ND-06, ND-07

---

## Dependencies

| Item | Depends on |
|------|-----------|
| ND-01 (audit) | — |
| ND-02 (references) | ND-01 |
| ND-03 (three-layer rule) | ND-01 |
| ND-04 (canonical decisions) | ND-02, ND-03 |
| ND-05 (redirect READMEs) | ND-04 |
| ND-06 (update references) | ND-04 |
| ND-07 (CI lint) | ND-04 |
| ND-08 (final grep) | ND-06, ND-07 |

**Phase-level depends on:** Phases 16, 17, 18, 19. Phase 19 must complete before this stream starts so that namespace dedup operates on a known-live tree (deleting a namespace prematurely would cause churn). Phase 20 should also complete so the demo's file references survive cleanup.

---

## Exit Criteria

- `ADMIRAL_STYLE.md` documents the three-layer rule.
- `docs/namespace-canonical.md` exists with decisions for every duplicated name.
- Every deprecated namespace location has a redirect README.
- Zero internal references point to non-canonical paths.
- CI lint rule blocks new namespace duplicates.
- Final grep audit produces zero ambiguous matches.
