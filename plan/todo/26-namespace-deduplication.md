# TODO: Directory Namespace Deduplication (Phase 21)

> Source: `plan/ROADMAP.md` Phase 21, `plan/stream-44-namespace-deduplication.md`

**Resolves rating-review weakness:** Triple namespaces — `fleet/`, `monitor/`, `brain/` exist at root, under `aiStrat/`, and under `admiral/`. Newcomers cannot tell which is which.

**Phase exit:** Three-layer rule documented in ADMIRAL_STYLE.md. Every duplicated namespace has a canonical decision. Zero internal references point to non-canonical paths. CI lint blocks new duplicates.

---

## Audit

- [ ] **ND-01** — Walk the repo; produce `docs/namespace-audit.md` listing every directory name appearing in >1 location.
- [ ] **ND-02** — Map every internal reference to a duplicated namespace; output `docs/namespace-references.csv`.

## Three-Layer Contract

- [ ] **ND-03** — Add "Namespace Layers" section to `ADMIRAL_STYLE.md`: spec=`aiStrat/`, runtime=`admiral/`, ephemeral=`.admiral/`/`.brain/`. Top-level duplicates require an ADR.

## Canonicalization

- [ ] **ND-04** — Pick canonical location per duplicated namespace per layer. Output `docs/namespace-canonical.md`.
- [ ] **ND-05** — Add redirect README in every deprecated location pointing to canonical path.
- [ ] **ND-06** — Update every internal reference from `namespace-references.csv` to point to canonical paths.

## CI Lint

- [ ] **ND-07** — Add `scripts/check-namespace-duplicates.sh` and wire to CI + pre-commit.
- [ ] **ND-08** — Final grep audit confirming zero ambiguous matches; document in `docs/namespace-audit-final.md`.
