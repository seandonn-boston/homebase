# Spec Change Impact Assessment Template

Use this template when proposing or reviewing changes to the Admiral Framework specification. Every spec change must be assessed before implementation.

## Change Identity

- **Change ID:** SCA-YYYY-NNN (Spec Change Assessment - Year - Sequential)
- **Spec Part(s) Affected:** Part N — Name
- **Spec Version:** From vX.Y.Z to vX.Y.Z
- **Date:** YYYY-MM-DD
- **Author:**

## Change Description

### Current Spec Text
> Quote the relevant current spec text here.

### Proposed Spec Text
> Quote the proposed replacement text here.

### Rationale
Why is this change needed? What problem does it solve?

## Compatibility Classification

Mark one:

- [ ] **Breaking** — Existing implementations will fail or produce incorrect behavior after this change. Requires migration.
- [ ] **Additive** — New capability or requirement that does not conflict with existing implementations. Existing implementations continue to work but do not benefit from the addition.
- [ ] **Cosmetic** — Clarification, typo fix, or documentation improvement. No implementation impact.

### Classification Rationale
Explain why this classification was chosen. For breaking changes, describe what breaks.

## Impact Assessment

### Implementation Components Affected
List components from `admiral/config/spec_version_manifest.json` that are impacted:

| Component ID | File | Current Compliance | Impact |
|---|---|---|---|
| example-component | path/to/file | full | Must update X to match new Y |

### Downstream Dependencies
What other spec parts, standing orders, or hooks are affected by this change?

### Test Impact
Which existing tests will need updates? What new tests are needed?

## Migration Requirements

### For Breaking Changes Only

- **Migration script needed:** Yes / No
- **Estimated effort:** Hours / Days / Weeks
- **Rollback possible:** Yes / No / Partial
- **Data migration:** Yes / No (describe if yes)

### Migration Steps
1. Step one
2. Step two
3. Verification

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Example risk | Low/Med/High | Low/Med/High | How to mitigate |

## Approval

- [ ] Impact assessed by author
- [ ] Classification reviewed by second party
- [ ] Migration plan reviewed (breaking changes only)
- [ ] Tests identified for verification
