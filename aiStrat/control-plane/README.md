# Control Plane — Reference Type Definitions

**This is a specification-level reference sketch, not executable code.**

These TypeScript files define the type contracts for the CP1-CP2 Fleet Control Plane as described in [`admiral/extensions/fleet-control-plane.md`](../admiral/extensions/fleet-control-plane.md). They exist to pin down interface shapes within the specification boundary.

## Relationship to `control-plane/` (repo root)

The **root-level `control-plane/`** directory contains the actual MVP implementation — a working TypeScript application with an event stream, runaway detector, execution trace, HTTP server, and dashboard. That is the code you build and run.

This directory contains only type definitions and interface sketches that informed the MVP's design. If the two diverge, the root-level implementation is canonical for runtime behavior; these files are canonical for spec-level type contracts.

## Files

| File | Purpose |
|------|---------|
| `types.ts` | Core type contracts: `FleetEvent`, `AgentStatus`, `FleetSnapshot` |
| `server.ts` | API surface sketch |
| `dashboard.ts` | Dashboard component sketch |
| `package.json` / `tsconfig.json` | TypeScript configuration for type-checking only |
