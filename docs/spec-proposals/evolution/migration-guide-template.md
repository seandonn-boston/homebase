# Spec Migration Guide Template

Use this template when a breaking spec change requires implementation migration.

## Migration Identity

- **Change ID:** SCA-YYYY-NNN (from impact assessment)
- **From Spec Version:** vX.Y.Z
- **To Spec Version:** vX.Y.Z
- **Migration Window:** YYYY-MM-DD to YYYY-MM-DD

## Prerequisites

- [ ] Impact assessment completed and approved
- [ ] All affected components identified
- [ ] Rollback plan documented
- [ ] Tests updated for new spec behavior

## Migration Steps

### Phase 1: Preparation

1. **Snapshot current state**
   - Record current spec version in `spec_version_manifest.json`
   - Run `validate_constants_sync` to confirm pre-migration baseline
   - Run full test suite and record results

2. **Update registries**
   - Update `admiral/config/reference_constants.json` with new values
   - Update `admiral/config/reference_constants.sh` with new values
   - Run `validate_constants_sync` — expect failures for changed values in config.json

### Phase 2: Implementation

3. **Update implementation files**
   For each affected component:
   - [ ] Component: `component-id` — File: `path/to/file`
     - Change: description of what to change
     - Verification: how to verify the change is correct

4. **Update configuration**
   - Update `admiral/config.json` runtime overrides if affected
   - Run `validate_constants_sync` — should now pass

### Phase 3: Verification

5. **Run tests**
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Spec compliance tests pass (`admiral/tests/spec_compliance/run_all.sh`)
   - [ ] Constants sync passes (`admiral/bin/validate_constants_sync`)

6. **Update tracking**
   - Update `spec_version_manifest.json` component compliance levels
   - Update `spec_changelog_bridge.json` with new version entry
   - Run `spec_freshness` to verify score improved

### Phase 4: Finalize

7. **Documentation**
   - [ ] IMPLEMENTATION_STATUS.md updated
   - [ ] Changelog bridge updated
   - [ ] This migration guide archived in `docs/spec-proposals/evolution/completed/`

## Rollback Plan

If migration fails at any phase:

1. Revert implementation changes via git
2. Restore previous registry values
3. Run test suite to confirm rollback succeeded
4. Document what failed and why in the impact assessment

## Post-Migration Verification

- [ ] `validate_constants_sync` passes
- [ ] `spec_freshness` shows updated score
- [ ] All test suites pass
- [ ] No regression in previously passing spec compliance tests
