# API Versioning Strategy

How the Admiral Framework versions its interfaces: JSON schemas, hook payloads, configuration, and the control plane API.

---

## Versioning Scheme

**Semantic versioning** applied to each interface independently:

```
<interface>.<major>.<minor>
```

- **Major**: Breaking changes — field removal, type changes, behavioral changes
- **Minor**: Additive changes — new fields, new endpoints, new optional parameters

Examples: `hook-payload-pre-tool-use.v1`, `evaluation-spec.v1`, `session-state.v1`

---

## Interface Categories

### JSON Schemas (`admiral/schemas/`)

Each schema file includes a version in its filename: `<name>.v<N>.schema.json`

- **Current version**: v1 for all schemas
- **Adding fields**: Add to schema with `additionalProperties: true` (already set). No version bump needed.
- **Removing/renaming fields**: Requires v2 schema file. Old v1 remains for backward compatibility.
- **Validation**: Fail-open per ADR-004. Invalid payloads log warnings but don't block.

### Hook Payloads

Hook input/output formats are defined by Claude Code (not us). We document them in schemas but don't control their evolution. Our hooks must handle missing fields gracefully (use `jq_get` with defaults).

### Configuration (`admiral/config.json`)

- New config keys are additive (backward-compatible)
- Removed keys: code must provide hardcoded defaults (see `hook_config.sh`)
- No version field in config — it's always the latest

### Control Plane HTTP API

- Endpoints are not versioned in the URL path (no `/v1/api/events`)
- New endpoints are additive
- Existing endpoint response shapes follow additive-only evolution
- Breaking changes (field removal, type changes) require a deprecation period

---

## Backward Compatibility Rules

1. **Never remove a field** from a response without a deprecation cycle
2. **Never change a field's type** (string to number, etc.)
3. **New fields are always optional** with sensible defaults
4. **Enum values are append-only** — never remove valid values
5. **`additionalProperties: true`** in all schemas for forward compatibility

---

## Deprecation Policy

When a breaking change is necessary:

1. **Announce**: Add deprecation notice in the relevant schema/doc
2. **Dual support**: Support both old and new format for one phase cycle
3. **Migration**: Provide migration guidance (see `spec-change-impact.template.json`)
4. **Remove**: Drop old format in the following phase

Timeline: one full phase cycle (Phases 0-8 were broad architecture; Phases 9-12 are 1 cycle each).

---

## Breaking Changes Checklist

Before introducing a breaking change:

- [ ] Is there an additive alternative? (Prefer adding a new field over changing an existing one)
- [ ] Create a `spec-change-impact` assessment using the template
- [ ] Update affected schemas with version bump
- [ ] Update all consumers (hooks, libs, control plane)
- [ ] Add migration guide
- [ ] Run all tests to verify backward compatibility during transition
- [ ] Document in ADR if architecturally significant

---

## Current Schema Versions

| Schema | Version | Status |
|--------|---------|--------|
| `hook-payload-pre-tool-use` | v1 | Active |
| `hook-payload-post-tool-use` | v1 | Active |
| `hook-payload-session-start` | v1 | Active |
| `hook-output` | v1 | Active |
| `session-state` | v1 | Active |
| `admiral-config` | v1 | Active |
| `agent-definition` | v1 | Active |
| `fleet-registry` | v1 | Active |
| `evaluation-spec` | v1 | Active |
| `ground-truth` | v1 | Active |
| `handoff` | v1 | Active |
| `event-types.registry` | v1 | Active |
| `task-criteria` | v1 | Active |
| `spec-change-impact` | v1 | Active |
