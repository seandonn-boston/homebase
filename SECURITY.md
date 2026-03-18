# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.18.x-alpha | Yes |
| < 0.18.0 | No |

## Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

Instead, please email security reports to [@seandonn-boston](https://github.com/seandonn-boston) via GitHub private messaging or the contact methods listed on the profile.

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

## Response Timeline

- **Acknowledgment:** Within 48 hours
- **Initial assessment:** Within 1 week
- **Fix or mitigation:** Depends on severity; critical issues targeted within 2 weeks

## Scope

The following are considered security issues for this project:

- Hook bypass (circumventing deterministic enforcement)
- Privilege escalation (agent exceeding its decision authority tier)
- PII or credential exposure through event logs or API endpoints
- Injection attacks against the control plane HTTP server
- Supply chain vulnerabilities in dependencies

## Security Design

Admiral's security posture is informed by:

- **Standing Order SO-12 (Zero Trust):** Every agent interaction is verified; no implicit trust based on prior behavior
- **Standing Order SO-10 (Prohibitions):** Hard-blocked actions that cannot be overridden regardless of context
- **Zero runtime dependencies:** The control plane has no `dependencies` in package.json, minimizing supply chain attack surface
- **Deterministic enforcement:** Security-critical rules are enforced via shell hooks with exit codes, not advisory LLM instructions
