# ADR-002: Zero Runtime Dependencies

## Status

Accepted

## Context

The control plane is a governance tool. Runtime dependencies create supply chain risk and version conflicts. As a security-critical component, minimizing the attack surface is essential.

## Decision

Zero runtime dependencies in `control-plane/package.json`. Use only Node.js built-in modules (`node:http`, `node:fs`, `node:test`, etc.). Dev dependencies (TypeScript, Biome) are acceptable.

## Consequences

- No Express, no Zod, no Winston. HTTP routing is manual. Validation is inline.
- This trades convenience for security and portability.
- The control plane can run anywhere Node.js 22+ is available without `npm install` for production.
- All serialization uses `JSON.stringify`/`JSON.parse` from the standard library.
