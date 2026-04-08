# Agent Marketplace Concept (IF-02)

> Package format and registry protocol for sharing agent definitions

---

## Package Format: Admiral Agent Package (AAP)

```
my-agent-1.0.0.aap/
  manifest.json        # Package metadata, dependencies, trust requirements
  definition.md        # Agent definition (human-readable)
  definition.json      # Agent definition (machine-readable)
  tests/               # Validation tests for the agent
  examples/            # Usage examples
  CHANGELOG.md         # Version history
```

### manifest.json
```json
{
  "name": "security-auditor",
  "version": "1.0.0",
  "author": "Admiral Framework",
  "license": "MIT",
  "admiral_version": ">=0.23.0",
  "trust_requirements": {
    "minimum_tier": "tier2_workhorse",
    "requires_capabilities": ["Read", "Grep", "Glob"],
    "denied_capabilities": ["Bash", "Write"]
  },
  "sandbox": {
    "network": false,
    "filesystem": "read-only",
    "max_token_budget": 50000
  }
}
```

## Registry Protocol

- **Publish**: `admiral marketplace publish <path-to-aap>`
- **Search**: `admiral marketplace search <query>`
- **Install**: `admiral marketplace install <name>@<version>`
- **Verify**: Imported agents pass through quarantine pipeline before fleet registration

## Trust Boundaries

Imported agents start at the lowest trust level (Supervised) regardless of their manifest claims. Trust must be earned through progressive autonomy within the importing organization's fleet.
