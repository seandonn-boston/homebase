# Enterprise Adoption Playbook (R-11)

> Step-by-step guide: discovery through operationalization

**Last updated:** 2026-04-09

---

## Stage 1: Discovery (Week 1-2)

**Goal:** Understand if Admiral fits your organization's AI governance needs.

### Activities
- Run `scripts/preflight.sh starter` to validate your environment
- Read `AGENTS.md` for the full architectural model
- Review `docs/compliance/` for relevant regulatory crosswalks (OWASP, NIST, ISO, EU AI Act)
- Assess current AI agent governance gaps

### Decision Framework
- **Proceed if:** You run multiple AI agents with shared resources, need audit trails, or face regulatory requirements
- **Consider alternatives if:** You need only single-agent tooling or purely advisory governance

---

## Stage 2: Evaluation (Week 2-4)

**Goal:** Prove Admiral works in your environment with a controlled pilot.

### Activities
- `make setup` — one-command environment setup
- `admiral session simulate basic` — observe hook enforcement without LLM costs
- `admiral hook validate <existing-hook>` — verify hook infrastructure
- `make ci` — run full test suite locally
- Review `docs/guides/development-walkthroughs.md` for the contributor experience

### Success Criteria
- setup.sh completes without failures
- All built-in hooks validate successfully
- Team members can follow development walkthroughs independently

---

## Stage 3: Pilot (Week 4-8)

**Goal:** Deploy Admiral governance on a real project with a small team.

### Activities
- Configure `.claude/settings.local.json` with hooks for your platform
- Define 3-5 agent roles using `fleet/agents/schema/generate-agent.sh`
- Create Standing Order customizations for your domain
- Enable control plane monitoring (`make dev`)
- Run for 2+ weeks, collecting data on hook enforcement and false positive rates

### Success Criteria
- < 1% false positive rate on hook enforcement
- Zero undetected policy violations in audit trail
- Team reports no significant workflow friction from governance overhead

---

## Stage 4: Rollout (Week 8-16)

**Goal:** Extend Admiral governance to additional teams and projects.

### Activities
- Document organization-specific Standing Orders
- Create project-specific Ground Truth templates
- Configure progressive autonomy levels per team maturity
- Enable Brain B2 for institutional memory
- Set up scanner for continuous ecosystem monitoring

### Success Criteria
- 3+ teams using Admiral governance
- Scanner running daily with digest generation
- Brain B2 accumulating institutional memory

---

## Stage 5: Operationalization (Ongoing)

**Goal:** Admiral governance is the default for all AI agent work.

### Activities
- Integrate with CI/CD (scanner checks per-PR)
- Enable governance dashboards for leadership visibility
- Conduct quarterly compliance crosswalk reviews
- Contribute agent definitions back to the community
- Advance to Brain B3 (Postgres) for production-scale knowledge

---

## Persona-Specific Content

### For Engineering Leadership
Admiral reduces AI agent risk without requiring engineers to change their workflow. Hooks are invisible when agents behave correctly — they only surface when governance violations occur.

### For Security/Compliance
Admiral provides the audit trail, identity management, and deterministic enforcement that compliance frameworks (NIST, ISO 42001, EU AI Act) require. See `docs/compliance/` for specific crosswalks.

### For Platform Engineering
Admiral's adapter architecture means governance follows agents across platforms (Claude Code, Cursor, Windsurf, API). One governance model, multiple deployment targets.

---

## Top 10 Objection FAQ

1. **"We already have guardrails in our prompts."** Prompts are advisory; hooks are deterministic. Context pressure can override a prompt instruction. A hook fires every time.

2. **"This seems heavyweight for our team size."** Start with `preflight.sh starter` — minimal profile. Scale governance as your agent fleet grows.

3. **"What if hooks slow down our agents?"** Hooks complete in < 50ms. The total overhead per tool call is < 100ms — invisible to the user.

4. **"We use Cursor/Windsurf, not Claude Code."** Admiral's adapter architecture supports multiple platforms. Platform-specific adapters are in the roadmap.

5. **"Our agents are simple — they just generate code."** Code generation agents still need scope boundaries, quality gates, and audit trails. Admiral provides these without requiring agent redesign.

6. **"How is this different from just writing good system prompts?"** System prompts are suggestions. Standing Orders enforced by hooks are guarantees. The difference is deterministic vs. probabilistic governance.

7. **"What about performance at scale?"** The control plane uses an O(1) ring buffer, SPC-based anomaly detection, and session thermal model. Designed for 10+ concurrent agents.

8. **"Can we customize the governance rules?"** Yes — Standing Orders, hooks, and agent definitions are all configurable. Custom scan rules, policy DSL, and approval workflows are built in.

9. **"What's the learning curve?"** `make setup` + development walkthroughs + good first issues catalog. Most teams are productive within a day.

10. **"Is this production-ready?"** Brain B1/B2 are production-ready. B3 (Postgres) is in development. All hooks, Standing Orders, and the control plane are tested (800+ tests) and used daily.
