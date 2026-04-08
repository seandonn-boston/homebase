# Governance Deployment Guide (GP-08)

> Deploying Admiral governance: single-operator through enterprise

---

## Single-Operator Deployment

The simplest deployment — one developer using Admiral to govern their own AI agent sessions.

### Setup
```bash
./setup.sh                    # Install dependencies
make ide                      # Configure VS Code
admiral hook list             # Verify hooks
admiral session simulate basic # Verify enforcement
```

### Configuration
Edit `.claude/settings.local.json` to register hooks for your platform.

---

## Team Deployment

Multiple developers sharing the same governance configuration.

### Prerequisites
- Shared git repository with Admiral configuration
- Team agreement on Standing Order customizations
- Designated governance admin

### Setup
1. Clone the repository
2. Run `make setup`
3. Each team member runs `make ide` for their IDE
4. Governance config is version-controlled and shared via git

### Infrastructure
- Control plane runs locally per developer (port 4510)
- Brain B2 (SQLite) is per-developer
- Scanner can run centrally via GitHub Actions

---

## Enterprise Deployment

### Infrastructure Requirements
- Node.js 22+ runtime for control plane
- SQLite for Brain B2 (local) or Postgres for B3 (shared)
- GitHub Actions for CI/CD integration
- Optional: Docker for dev containers

### Security Hardening
1. Enable all 16 Standing Orders
2. Configure `prohibitions_enforcer.sh` with organization-specific blocklists
3. Enable `identity_validation.sh` with fleet registry
4. Configure `protocol_registry_guard.sh` with approved MCP servers only
5. Enable audit trail with SHA-256 hash chain verification
6. Set up scanner with organization-specific watchlist

### Operational Runbook
- **Daily**: Scanner runs automatically, digests generated
- **Weekly**: Review weekly trend reports, address HIGH findings
- **Monthly**: Audit trail verification, policy review
- **Quarterly**: Compliance crosswalk updates, competitive matrix refresh

### Integration Recipes

#### GitHub Actions
```yaml
- name: Admiral Scanner
  run: bash monitor/scanner.sh full
  
- name: Admiral Preflight
  run: bash scripts/preflight.sh governed
```

#### Pre-commit Hook
```bash
# .git/hooks/pre-commit
bash scripts/ci-local.sh --continue
```

---

## Progressive Adoption Model

| Stage | Governance Level | Hooks Enabled | Brain Tier |
|---|---|---|---|
| **Starter** | Advisory only | scope_boundary_guard, prohibitions_enforcer | B1 (JSON) |
| **Team** | Enforcement on writes | + identity_validation, tool_permission_guard | B1 |
| **Governed** | Full enforcement | All 20 hooks | B2 (SQLite) |
| **Production** | Full + monitoring | All hooks + scanner + dashboards | B2 |
| **Enterprise** | Full + compliance | All + compliance crosswalks + audit trail | B3 (Postgres) |
