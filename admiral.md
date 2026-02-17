# THE FLEET ADMIRAL FRAMEWORK

**A Repeatable Protocol for Establishing Autonomous AI Agent Fleets**

v2.0 • February 2026

-----

> **PURPOSE**
> 
> This framework defines the universal requirements for deploying an autonomous AI agent fleet on any project.
> 
> It is organized into twenty-three sections. Each section addresses a distinct category of information that the Admiral must establish before a fleet can operate autonomously.
> 
> Use the Pre-Flight Checklist at the end as your go/no-go gate. If any box is unchecked, the fleet is not ready.

-----

## The Operating Model

You are the Admiral. You do not write code. You do not debug. You command fleets of autonomous AI agents, each captained by an orchestration agent that manages specialists underneath it. Your job is to provide the strategic context, constraints, and clarity that no AI can generate for itself.

Every autonomous AI system, regardless of intelligence, operates within the boundaries of what it has been told. The quality of those boundaries determines whether a fleet self-organizes into productive work or spirals into hallucination, scope creep, and wasted tokens.

This framework codifies twenty-three categories of information that the Admiral must establish before any fleet can operate effectively. They are universal across project types, tech stacks, and domains.

> **CORE PRINCIPLE**
> 
> AI agents are not limited by capability. They are limited by context.
> 
> Your job as Admiral is to eliminate ambiguity, define boundaries, and provide the judgment that converts raw intelligence into directed execution.

> **HOW TO USE THIS DOCUMENT**
> 
> **For new projects:** Read all twenty-three sections. Complete the template artifacts in each section. Run the Pre-Flight Checklist.
> 
> **For existing projects adopting AI fleets:** Audit what you already have against each section. Fill gaps. Run the Pre-Flight Checklist.
> 
> **For active fleets:** Use this as a diagnostic tool when things go wrong. The root cause will map to a gap in one of these twenty-three areas.

-----

## 01 — MISSION

Before any agent writes a line of code or makes a single decision, the fleet needs to understand what it exists to accomplish. The Mission is not a product specification. It is the strategic frame that prevents drift. It answers two questions: what are we building, and how do we know when we have built it.

### What to Define

- **Project Identity:** What is this? One sentence. If you cannot express it in a single sentence, the fleet will not stay aligned. This sentence becomes the gravitational center that every agent decision orbits.
- **Success State:** What must be true for this project to be considered successful? Define this in concrete, observable terms. Not “a great user experience” but “a user can complete the core workflow in under 3 clicks with no errors.”
- **Stakeholders and Audience:** Who is this for? What do they care about? Agents make better micro-decisions when they understand the human context behind the work.
- **Current Phase:** Is this a greenfield build, a feature addition to an existing product, a refactor, a migration? The project phase changes how agents should approach ambiguity, risk, and scope.

> **TEMPLATE: MISSION STATEMENT**
> 
> This project is [one-sentence identity].
> 
> It is successful when [concrete, observable success state].
> 
> It is built for [stakeholders/audience] who need [core need].
> 
> Current phase: [greenfield | feature-add | refactor | migration | maintenance].

> **WHY THIS MATTERS**
> 
> Without a Mission, orchestrators will infer one from the task list. Their inferred mission will be subtly wrong, and every downstream decision will compound that error. An explicit Mission is the cheapest and highest-leverage artifact you can provide.

-----

## 02 — BOUNDARIES

Boundaries are the single most effective tool you have against agent drift. AI agents are relentlessly helpful — they will expand scope, add features, refactor adjacent code, and over-engineer solutions unless you explicitly tell them not to. This section consolidates every constraint into one place: what the fleet must not do, what it must stay within, and what resources it may consume.

### Non-Goals

Explicitly state what the project is NOT. Non-goals are more powerful than goals because they eliminate entire categories of work that agents would otherwise explore. Every hour an agent spends on a non-goal is an hour wasted plus the cost of untangling the unnecessary work.

- **Functional non-goals:** Features, capabilities, or user flows that are explicitly out of scope.
- **Quality non-goals:** Levels of polish, optimization, or completeness that are not required at this phase. If you are building an MVP, say so. Otherwise agents will optimize for production quality.
- **Architectural non-goals:** Patterns, technologies, or approaches that must not be used, even if they seem like good ideas.

### Hard Constraints

Things that are not up for debate. These differ from non-goals in that they constrain how the fleet works, not what it builds.

- **Tech stack:** Exact languages, frameworks, and tools. If the project uses React with TypeScript, agents must not introduce Vue components “because they would be better here.”
- **External deadlines:** Ship dates, demo dates, review dates. Agents must understand time pressure.
- **Compatibility requirements:** Browser support, API backward compatibility, platform requirements.
- **Regulatory or policy constraints:** Anything that is legally or organizationally mandated.

### Resource Budgets

Without explicit resource constraints, agents will gold-plate solutions, over-engineer, or spiral into infinite refinement loops. Every fleet deployment must include hard limits. These are not punishments. They are forcing functions that produce focused, efficient work.

|Resource        |What to Define                                                              |Why It Matters                                                                 |
|----------------|----------------------------------------------------------------------------|-------------------------------------------------------------------------------|
|Token budget    |Max input + output tokens per task before the agent must deliver or escalate|Prevents unbounded exploration and forces agents to converge on solutions      |
|Time budget     |Wall-clock time limit per task                                              |Prevents runaway loops and forces progress checkpointing                       |
|Tool call limits|Max external API calls, file operations, or tool invocations per task       |Prevents agents from brute-forcing solutions through excessive iteration       |
|Scope boundary  |File paths, repos, and services each agent may touch                        |Prevents well-intentioned agents from modifying code outside their jurisdiction|
|Quality floor   |Minimum acceptable quality bar, defined concretely                          |Prevents infinite refinement by defining when “good enough” has been reached   |


> **TEMPLATE: BOUNDARIES DOCUMENT**
> 
> NON-GOALS: This project does not [non-goal 1]. It does not [non-goal 2]. It does not [non-goal 3].
> 
> CONSTRAINTS: Must use [tech stack]. Must ship by [date]. Must support [compatibility].
> 
> BUDGETS: [X] tokens per task. [Y] minutes per task. Agents may only modify files in [paths].
> 
> QUALITY FLOOR: [Concrete definition of minimum acceptable quality].

> ⛔ **ANTI-PATTERN: SCOPE CREEP THROUGH HELPFULNESS**
> 
> AI agents want to be helpful. An agent asked to implement a login form will also add password validation, a forgot-password flow, session management, and accessibility improvements — none of which were requested. Each addition is reasonable in isolation, but collectively they blow the budget and introduce untested code. Strong Boundaries are the primary defense.

-----

## 03 — FLEET COMPOSITION

The framework defines the rules of engagement, but the fleet needs to know who is on the team. Fleet Composition defines which agents exist, what each one specializes in, how the orchestrator routes tasks to the right specialist, and the interface contracts between them. Without this, the orchestrator is a general with no knowledge of the units under its command. A fleet without defined composition is not a fleet — it is a crowd.

### Agent Roster

Define every agent role in the fleet. Each role needs a clear identity, a defined scope of responsibility, and explicit boundaries on what it does not do.

|Role          |Responsibility                                                                          |Does NOT Do                                                                          |
|--------------|----------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
|Orchestrator  |Decomposes goals into tasks, routes to specialists, manages progress, enforces standards|Write production code directly, make architectural decisions above its authority tier|
|Implementer   |Writes code, implements features, follows specifications exactly                        |Choose architecture, add unrequested features, modify files outside assigned scope   |
|QA Agent      |Reviews output, runs tests, validates against acceptance criteria, flags issues         |Fix issues directly (sends back to Implementer), approve its own work                |
|Database Agent|Designs schemas, writes migrations, optimizes queries                                   |Modify application code, change API contracts without orchestrator approval          |
|Design Agent  |Produces UI/UX specifications, component layouts, style guidelines                      |Implement designs in code (hands off to Implementer)                                 |

This is an example roster. Your fleet may have more or fewer roles. The critical requirement is that every role is defined and every agent knows exactly which role it occupies. The catalog below provides ninety-three archetypal roles to draw from. Not every fleet needs all of them — select the roles that match the project's scope, define their boundaries, and discard the rest.

### Agent Role Catalog

Agents are not limited to traditional software engineering roles. Any function that can be defined by clear inputs, outputs, and constraints can be performed by an agent — including functions modeled after non-technical disciplines, simulated users, and autonomous processes with no human analog at all.

When selecting roles from this catalog, define the "Does NOT Do" boundary for each (per the example roster above). A role without boundaries will drift into adjacent roles, and the fleet loses the specialization advantage.

> **HOW TO USE THIS CATALOG**
>
> Do not deploy all ninety-three roles. A typical fleet needs five to ten. Select roles based on the project's actual needs, define their boundaries using the "Does NOT Do" column from the example roster, and add them to the Fleet Roster template. Roles from the Simulation & Adversarial, Meta & Autonomous, and the scale-oriented categories (Planetary & Environmental Scale through Transformation & Pipeline State Space) are especially valuable as periodic or scheduled agents rather than permanent fleet members — deploy them for specific review cycles, capacity planning sessions, or pre-launch audits rather than continuous operation. The Fleet Evolution category (Role Crystallizer) is unique — it monitors the fleet itself for signals that a new specialist role should be created, making the roster self-extending under Admiral approval. The Domain Specialization, Release & Incident Lifecycle, and Developer Platform & Ecosystem categories fill gaps where a general-purpose Implementer would lack the domain depth to handle specialized concerns correctly — deploy them when the project's scope touches their domain. The scale-oriented agents reason about dimensions that no individual human naturally perceives — planetary geography, deep combinatorial state spaces, multi-year decay curves, emergent system behaviors, full failure topologies, cognitive load surfaces, regulatory matrices, and migration state graphs. Their value is in surfacing the structural realities that become visible only when the observer can hold the entire system in view simultaneously.

> ⚠️ **CALLOUT SEVERITY KEY**
>
> Throughout this document, callouts use two severity levels:
>
> ⛔ **Critical anti-pattern** — common, high-impact failure mode. If you see only one of these active, it can derail the fleet.
>
> ⚠️ **Secondary anti-pattern** — subtler, slower-acting failure mode. Less immediately destructive but compounds over time if unaddressed.

**Command & Coordination**

|#  |Role                |Responsibility                                                                                                    |
|---|--------------------|------------------------------------------------------------------------------------------------------------------|
|1  |Orchestrator        |Decomposes goals into tasks, routes to specialists, manages progress, enforces standards                          |
|2  |Triage Agent        |Classifies incoming work by type, priority, and complexity; routes to the correct queue or specialist              |
|3  |Context Curator     |Manages context window loading per role; selects relevant artifacts, compresses stale context, enforces load order |
|4  |Mediator            |Resolves conflicting outputs between agents; synthesizes divergent approaches into a coherent resolution           |

**Engineering — Frontend**

|#  |Role                    |Responsibility                                                                                                |
|---|------------------------|--------------------------------------------------------------------------------------------------------------|
|5  |Frontend Implementer    |Builds UI components, implements designs in code, handles browser-specific concerns                           |
|6  |Interaction Designer    |Implements animations, transitions, micro-interactions, gesture handling, motion choreography                  |
|7  |Accessibility Auditor   |Tests WCAG compliance, screen reader compatibility, keyboard navigation, color contrast, focus management     |
|8  |Responsive Layout Agent |Ensures cross-device and cross-viewport compatibility; manages breakpoints, fluid grids, and container queries|
|9  |State Management Agent  |Designs and implements client-side state architecture, data flow patterns, and cache synchronization           |

**Engineering — Backend**

|#  |Role                    |Responsibility                                                                                                    |
|---|------------------------|------------------------------------------------------------------------------------------------------------------|
|10 |Backend Implementer     |Writes server-side logic, business rules, service layer code, request handling                                    |
|11 |API Designer            |Designs endpoint contracts, versioning strategies, request/response schemas, API documentation                    |
|12 |Database Agent          |Designs schemas, writes migrations, optimizes queries, manages indexing strategies and data integrity constraints  |
|13 |Queue & Messaging Agent |Designs asynchronous workflows, event schemas, pub/sub patterns, dead letter handling, message ordering guarantees|
|14 |Cache Strategist        |Implements caching layers, invalidation logic, cache topology, TTL policies, and cache coherence across services  |

**Engineering — Cross-Cutting**

|#  |Role                |Responsibility                                                                                                        |
|---|--------------------|----------------------------------------------------------------------------------------------------------------------|
|15 |Architect           |Designs system structure, evaluates patterns, makes structural decisions, maintains architectural decision records     |
|16 |Integration Agent   |Connects systems, third-party APIs, data synchronization, webhook management, protocol translation                    |
|17 |Migration Agent     |Manages system migrations, data transformations, version upgrades, backward compatibility during transitions           |
|18 |Refactoring Agent   |Restructures code without changing external behavior, reduces technical debt, improves internal consistency            |
|19 |Dependency Manager  |Evaluates, updates, and audits project dependencies; manages version conflicts, license compliance, and upgrade paths |

**Engineering — Infrastructure**

|#  |Role                  |Responsibility                                                                                                   |
|---|----------------------|-----------------------------------------------------------------------------------------------------------------|
|20 |DevOps Agent          |Builds and maintains CI/CD pipelines, deployment automation, build systems, release orchestration                |
|21 |Infrastructure Agent  |Provisions and manages cloud resources via IaC (Terraform, Pulumi), network configuration, resource scaling     |
|22 |Containerization Agent|Creates Docker images, Kubernetes manifests, orchestration configs, service mesh configuration                   |
|23 |Observability Agent   |Implements logging, metrics collection, distributed tracing, alerting rules, and operational dashboard creation  |

**Quality & Testing**

|#  |Role                |Responsibility                                                                                                            |
|---|--------------------|--------------------------------------------------------------------------------------------------------------------------|
|24 |QA Agent            |Reviews output against acceptance criteria, flags issues with structured reports, validates overall deliverable quality    |
|25 |Unit Test Writer    |Writes focused unit tests, designs test fixtures, ensures edge case coverage, maintains test isolation                    |
|26 |E2E Test Writer     |Writes integration and end-to-end tests, manages test environment setup, validates cross-system workflows                 |
|27 |Performance Tester  |Conducts load testing, benchmarking, profiling, identifies bottlenecks, validates performance against defined budgets      |
|28 |Chaos Agent         |Deliberately injects failures — network partitions, service outages, resource exhaustion — to test resilience and recovery|
|29 |Regression Guardian |Validates that new changes do not break existing behavior, maintains regression test suites, tracks behavioral stability  |

**Security & Compliance**

|#  |Role                |Responsibility                                                                                                        |
|---|--------------------|----------------------------------------------------------------------------------------------------------------------|
|30 |Security Auditor    |Scans for vulnerabilities (OWASP Top 10), reviews authentication flows, audits dependency CVEs, assesses attack surface|
|31 |Penetration Tester  |Simulates adversarial attacks against the system, verifies exploit paths, assesses real-world risk                     |
|32 |Compliance Agent    |Validates against regulatory frameworks (SOC 2, HIPAA, PCI-DSS), enforces policy, maintains audit trails              |
|33 |Privacy Agent       |Manages data classification, PII handling protocols, consent flows, GDPR/CCPA compliance, data retention policies     |

**Data & Intelligence**

|#  |Role                  |Responsibility                                                                                                    |
|---|----------------------|------------------------------------------------------------------------------------------------------------------|
|34 |Data Engineer         |Builds ETL/ELT pipelines, data modeling, warehouse design, data quality enforcement, schema evolution             |
|35 |Analytics Implementer |Instruments event tracking, builds funnel analysis, creates dashboards, validates data accuracy                    |
|36 |ML Engineer           |Manages model training, feature engineering, inference pipeline design, model versioning, A/B test infrastructure  |
|37 |Data Validator        |Enforces schema constraints, runs data quality checks, detects anomalies, validates data pipeline outputs         |
|38 |Visualization Agent   |Creates charts, graphs, interactive data presentations, data storytelling, executive-ready reporting              |

**Design & Content**

|#  |Role                  |Responsibility                                                                                                    |
|---|----------------------|------------------------------------------------------------------------------------------------------------------|
|39 |UX Researcher         |Analyzes user flows, applies usability heuristics, designs information architecture, identifies friction points    |
|40 |Design Systems Agent  |Maintains component libraries, design tokens, style guides, pattern documentation, cross-product consistency      |
|41 |Copywriter            |Writes user-facing text: microcopy, error messages, onboarding flows, tooltips, notification text, tone of voice  |
|42 |Technical Writer      |Produces API documentation, architecture docs, runbooks, setup guides, troubleshooting references                 |
|43 |Diagram Agent         |Creates architecture diagrams, sequence diagrams, entity-relationship diagrams, flowcharts, system topology maps  |

**Simulation & Adversarial**

|#  |Role                |Responsibility                                                                                                            |
|---|--------------------|--------------------------------------------------------------------------------------------------------------------------|
|44 |Simulated User      |Tests workflows as a real user would — follows the happy path, deviates naturally, identifies UX friction and dead ends   |
|45 |Devil's Advocate    |Challenges architectural decisions, argues opposing positions, stress-tests assumptions before they become commitments     |
|46 |Red Team Agent      |Adversarial review of the fleet's own outputs: identifies reasoning gaps, tests for failure modes, validates rigor         |
|47 |Persona Agent       |Simulates specific user demographics or skill levels; tests for bias, validates inclusive design, surfaces accessibility gaps|

**Meta & Autonomous**

|#  |Role                  |Responsibility                                                                                                        |
|---|----------------------|----------------------------------------------------------------------------------------------------------------------|
|48 |SEO Crawler           |Analyzes page structure, metadata, semantic markup, sitemap coherence, Core Web Vitals, search engine discoverability |
|49 |Dependency Sentinel   |Monitors upstream dependency changes, security advisories, deprecation notices, breaking changes across the ecosystem |
|50 |Pattern Enforcer      |Scans the codebase for architectural pattern violations, naming inconsistencies, style drift, and convention erosion   |

**Fleet Evolution**

|#  |Role                  |Responsibility                                                                                                        |
|---|----------------------|----------------------------------------------------------------------------------------------------------------------|
|51 |Role Crystallizer     |Monitors fleet operations for signals that a new specialist role should exist — tasks that bounce between agents because no one owns them, recurring escalations concentrated in a domain that lacks a dedicated specialist, work the orchestrator handles directly because no specialist matches, quality degradation when generalist agents handle domain-specific work, and routing failures where the triage logic cannot find a match. When sufficient operational evidence accumulates, synthesizes a complete new role definition: name, responsibility scope, "Does NOT Do" boundaries, context profile, interface contracts with existing agents, and routing integration points — then proposes the new role to the Admiral for approval before instantiation. Does not create agents speculatively; waits for demonstrated need, and the evidence that justified the role becomes part of the fleet's institutional memory|

**Planetary & Environmental Scale**

|#  |Role                       |Responsibility                                                                                                                                    |
|---|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|52 |Global Regions Agent       |Reasons about geopolitical deployment topology — regulatory jurisdictions, data sovereignty boundaries, latency rings, CDN edge placement, and locale-aware service partitioning across continental and sub-continental zones|
|53 |Climate Drift Modeler      |Projects infrastructure cost and availability shifts driven by energy grid instability, cooling cost trajectories, regional carbon pricing regimes, and seasonal demand curves across global data center footprints|
|54 |Circadian Load Shaper      |Models the continuous 24-hour rotation of peak human activity across all time zones simultaneously, shaping autoscaling policies, batch job scheduling, deployment windows, and maintenance blackout periods as a single planetary wave rather than discrete regional schedules|

**Temporal Horizon & Decay**

|#  |Role                       |Responsibility                                                                                                                                    |
|---|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|55 |Entropy Auditor            |Tracks the rate at which every artifact in the system decays toward incorrectness — documentation staleness velocity, dependency age distribution, configuration drift from declared state, certificate and token expiration surfaces — and produces a unified half-life map of the entire project|
|56 |Archaeological Stratigrapher|Reads the full geological record of a codebase: sediment layers of successive authorship, fossilized patterns from abandoned frameworks, load-bearing legacy that predates institutional memory, and migration boundaries where one era's conventions collide with the next|
|57 |Forward Collapse Projector |Simulates the compounding downstream consequences of a single change across every future session, dependency update, and team rotation for an arbitrarily deep time horizon — producing a probability-weighted cascade tree of second-, third-, and nth-order effects that no human can hold in working memory simultaneously|

**Combinatorial & State Space**

|#  |Role                       |Responsibility                                                                                                                                    |
|---|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|58 |Permutation Cartographer   |Enumerates the full combinatorial state space of a system's configuration surface — feature flags, environment variables, build targets, locale settings, permission tiers — and identifies untested interaction regions, contradictory flag combinations, and configuration cliff edges where behavior changes discontinuously|
|59 |Dependency Graph Topologist|Analyzes the complete transitive dependency graph as a topological structure — detecting deep cyclic risks, single-point-of-failure nodes whose removal partitions the graph, version constraint surfaces where no valid resolution exists, and long-chain fragility where six degrees of transitive dependency separate the project from an unmaintained package|
|60 |Failure Surface Enumerator |Maps the full failure surface of a distributed system by reasoning about every simultaneous combination of partial degradation states across all services, networks, and data stores — producing a multidimensional failure topology that identifies catastrophic convergence points where individually survivable failures become collectively fatal|

**Signal & Information Topology**

|#  |Role                       |Responsibility                                                                                                                                    |
|---|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|61 |Latency Topology Mapper    |Models the complete latency graph of a system as a living topological structure — measuring signal propagation time across every path between every node at every time of day, identifying latency cliffs where small traffic increases produce nonlinear response degradation, and mapping the shape of the system's responsiveness surface rather than individual endpoint timings|
|62 |Information Provenance Tracer|Tracks the full lineage of every datum from its point of origin through every transformation, cache, replica, aggregation, and rendering to its final presentation — maintaining a complete causal graph of how information mutates as it propagates through the system, identifying points where meaning is lost, inverted, or fabricated through successive approximation|
|63 |Cross-Boundary Leakage Detector|Monitors the complete surface of every abstraction boundary in the system for information that crosses boundaries it should not — internal identifiers surfacing in APIs, infrastructure assumptions embedded in business logic, implementation details coupled into test assertions, and environment-specific knowledge hardcoded into portable modules|

**Systemic Drift & Emergence**

|#  |Role                       |Responsibility                                                                                                                                    |
|---|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|64 |Convention Erosion Tracker |Measures the rate and direction of pattern drift across the entire codebase simultaneously — not individual violations but the gradient field showing which conventions are strengthening, which are decaying, where competing conventions create boundary turbulence, and where emergent new conventions are self-organizing without deliberate introduction|
|65 |Implicit Contract Excavator|Discovers the unwritten contracts that govern system behavior — the assumptions that no specification captures but that every component relies upon: ordering guarantees that emerge from implementation accident, timing dependencies that exist only because current hardware is fast enough, and data shape expectations that propagate through convention rather than schema enforcement|
|66 |Emergent Behavior Detector |Monitors for system behaviors that no individual component was designed to produce — interaction effects between independently correct subsystems that generate unexpected aggregate behavior, feedback loops that amplify through cascading event chains, and resource consumption patterns that emerge from the collective rather than any individual agent|

**Resource Topology & Pressure**

|#  |Role                       |Responsibility                                                                                                                                    |
|---|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|67 |Resource Pressure Topographer|Maps the complete resource consumption topology of the system under every load profile — memory pressure gradients across service boundaries, CPU contention surfaces during parallel workloads, I/O bandwidth saturation curves at every storage layer, and network throughput ceilings at every hop — producing a unified pressure map that reveals which resource exhausts first under which conditions|
|68 |Cost Gravity Modeler       |Models the economic force field of the entire system — where spend concentrates, how costs propagate through dependency chains, which architectural decisions create permanent cost commitments versus reversible ones, and where the cost-performance Pareto frontier has unexploited regions — treating the budget not as a spreadsheet but as a gravitational topology that shapes every technical decision|
|69 |Capacity Horizon Scanner   |Projects when every finite resource in the system reaches its ceiling — database row counts approaching index performance cliffs, storage volumes approaching quota boundaries, API rate limits approaching saturation under growth projections, and connection pool sizes approaching exhaustion — maintaining a unified countdown surface across all scarcity boundaries simultaneously|

**Cross-System Coherence**

|#  |Role                       |Responsibility                                                                                                                                    |
|---|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|70 |Schema Evolution Geologist |Tracks the complete evolutionary history and projected trajectory of every data schema across every service, database, cache, message format, and API contract — modeling the system's information structure as a continuously deforming surface where schema migrations are tectonic events and backward compatibility is the structural integrity of the crust|
|71 |Semantic Consistency Auditor|Verifies that the same concept means the same thing everywhere it appears across the entire system — that a "user" in the auth service, a "user" in the billing service, a "user" in the analytics pipeline, and a "user" in the frontend state all share identical semantic boundaries, and flags every point where meaning has forked through independent evolution|
|72 |Distributed Clock Reconciler|Reasons about the complete temporal ordering problem across all nodes in a distributed system — clock skew between services, event ordering ambiguity in eventually consistent stores, race condition surfaces in concurrent operations, and the gap between wall-clock time and causal time — maintaining a unified model of what "before" and "after" actually mean across the system|

**Adversarial Surface & Attack Topology**

|#  |Role                       |Responsibility                                                                                                                                    |
|---|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|73 |Attack Surface Cartographer|Maps the complete attack surface of the system as a continuous topological structure — every input vector, every trust boundary transition, every privilege escalation path, every data flow that crosses a security domain — producing a unified threat surface rather than a checklist of individual vulnerabilities, revealing the geometric shape of the system's exposure|
|74 |Assumption Inversion Agent |Systematically inverts every assumption the system relies upon and evaluates the consequences — what happens when the trusted service lies, when the validated input is malformed after validation, when the idempotent operation is called during its own execution, when the unique constraint is violated by a race condition — operating in the space of negated invariants that humans naturally treat as guaranteed|
|75 |Blast Radius Projector     |For any proposed change, models the complete propagation of its worst-case failure through every connected system, service, data store, cache layer, and downstream consumer — computing the full detonation topology including secondary and tertiary effects, cascading timeouts, retry storms, queue backpressure, and the point at which circuit breakers either contain the blast or become the next failure vector|

**Scale Boundary & Phase Transition**

|#  |Role                       |Responsibility                                                                                                                                    |
|---|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|76 |Phase Transition Detector  |Identifies the critical thresholds where the system's behavior changes qualitatively rather than quantitatively — the user count where the social graph algorithm transitions from linear to quadratic cost, the data volume where the indexing strategy flips from asset to liability, the request rate where synchronous processing must yield to asynchronous — mapping every cliff edge where "more of the same" suddenly stops working|

**Domain Specialization**

|#  |Role                              |Responsibility                                                                                                                                    |
|---|----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|77 |Internationalization Agent        |Manages the full i18n/l10n surface: string externalization, locale-aware formatting (dates, numbers, currency, pluralization rules), RTL layout adaptation, cultural content sensitivity, translation pipeline integration, and locale fallback chains across every user-facing surface of the application|
|78 |Authentication & Identity Specialist|Designs and implements authentication flows, token lifecycle management, session architecture, OAuth/OIDC federation, MFA integration, credential storage, identity resolution across services, and the intersection of auth state with application routing — building the identity system, not auditing it|
|79 |Search & Relevance Agent          |Designs search index schemas, query parsing and expansion, ranking algorithms, faceted navigation, synonym management, typo tolerance tuning, result highlighting, and relevance feedback loops — treating search as a specialized retrieval discipline distinct from general database querying|
|80 |Payment & Billing Agent           |Implements payment gateway integration, subscription lifecycle management, invoicing, proration logic, tax calculation across jurisdictions, refund workflows, PCI-compliant data handling, dunning sequences, and the state machines that govern payment status transitions|
|81 |Real-time Systems Agent           |Builds WebSocket and SSE infrastructure, presence detection, live collaboration conflict resolution (CRDTs, OT), real-time notification delivery, connection lifecycle management, reconnection strategies, and the fan-out architectures that maintain consistent live state across concurrent clients|
|82 |Media Processing Agent            |Designs image, video, and audio processing pipelines: transcoding, format negotiation, responsive image generation, lazy loading strategies, CDN-aware asset optimization, metadata extraction, content-aware cropping, and the storage/delivery topology that serves the right rendition to the right device|
|83 |Notification Orchestrator         |Routes notifications across channels (push, email, SMS, in-app, webhook) based on user preferences, urgency classification, and delivery constraints; manages batching, deduplication, quiet hours, frequency capping, delivery confirmation, and the preference model that determines which channel carries which message|

**Release & Incident Lifecycle**

|#  |Role                              |Responsibility                                                                                                                                    |
|---|----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|84 |Release Orchestrator              |Manages the release lifecycle: changelog generation, version bumping, feature freeze coordination, release branch management, rollout gating (canary, blue-green, percentage-based), rollback triggers, hotfix coordination, and the communication protocol that keeps stakeholders informed of what shipped and when|
|85 |Incident Response Agent           |Executes structured incident triage during production failures: severity classification, runbook selection, blast radius assessment, stakeholder communication cadence, mitigation sequencing, evidence preservation for postmortem, timeline reconstruction, and the structured postmortem generation that converts incidents into institutional learning|
|86 |Feature Flag Strategist           |Manages the full feature flag lifecycle: flag creation with expiration dates, gradual rollout percentage curves, audience targeting rules, flag dependency tracking, stale flag detection and cleanup, kill-switch protocols, and the governance process that prevents flag proliferation from turning the codebase into a combinatorial minefield|

**Developer Platform & Ecosystem**

|#  |Role                              |Responsibility                                                                                                                                    |
|---|----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|87 |SDK & Developer Experience Agent  |Designs public-facing SDKs, CLI tools, developer portals, and API ergonomics: method naming conventions, error message clarity, getting-started flows, code sample generation, version migration guides, and the developer onboarding experience that determines whether external consumers can adopt the platform without filing support tickets|
|88 |Monorepo Coordinator              |Manages cross-package dependency graphs within a monorepo: workspace tooling configuration, selective build/test targeting based on change impact, internal package versioning, publish orchestration, shared toolchain configuration, and the dependency policies that prevent the monorepo from degenerating into a tightly-coupled monolith|
|89 |Contract Test Writer              |Writes consumer-driven contract tests between services: captures consumer expectations as executable contracts, validates provider compatibility, detects breaking changes before deployment, maintains contract versioning, and ensures that the integration surface between independently deployable services is verified without requiring full end-to-end environments|

**Cognitive & Comprehensibility Topology**

|#  |Role                              |Responsibility                                                                                                                                    |
|---|----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|90 |Cognitive Load Topologist         |Maps the complete comprehensibility surface of the codebase across every possible contributor persona, experience level, and entry point simultaneously — measuring naming opacity gradients, abstraction depth cliffs, indirection chain lengths, implicit knowledge prerequisites, and the distance between any given file and the nearest understandable anchor point — producing a unified learnability topology that reveals where the system is self-explaining and where it is opaque to everyone except its original author|

**Regulatory & Jurisdictional Surface**

|#  |Role                              |Responsibility                                                                                                                                    |
|---|----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|91 |Regulatory Surface Mapper         |Holds the complete matrix of compliance obligations across every jurisdiction the product touches simultaneously — data residency requirements, consent frameworks, accessibility mandates, financial regulations, age verification thresholds, content moderation obligations, and export controls — modeling the full shape of legal exposure as a continuous surface rather than a jurisdiction-by-jurisdiction checklist, identifying regions where regulatory regimes conflict and compliance with one necessarily violates another|

**Transformation & Pipeline State Space**

|#  |Role                              |Responsibility                                                                                                                                    |
|---|----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|92 |Migration State Space Navigator   |Maps the complete directed graph of all possible migration paths between the current system state and a target state — including intermediate states that are independently deployable, rollback checkpoints at every edge, paths that become irreversible once traversed, ordering constraints where step A must precede step B but step C is independent, and dead-end states where a partial migration leaves the system in a configuration from which neither forward nor backward progress is possible without data loss|
|93 |Build/Deploy Pipeline Topologist  |Models the entire CI/CD pipeline as a time-dependency DAG with probabilistic failure rates at every node — cache invalidation surfaces where a single upstream change triggers disproportionate rebuild cascades, parallelization opportunities where independent stages could run concurrently but are serialized by convention, flaky test nodes whose stochastic failure rate compounds into a near-certain pipeline failure at scale, and the critical path analysis that reveals which stage's duration actually determines deployment latency versus which stages merely consume resources while the critical path waits elsewhere|

### Routing Logic

The orchestrator must have a clear decision tree for routing tasks to specialists. This prevents the orchestrator from doing specialist work itself (a common drift pattern) and ensures tasks land with the agent best equipped to handle them.

- **Route by task type:** Database tasks go to the Database Agent. UI tasks go to the Design Agent then the Implementer. Test tasks go to QA.
- **Route by file ownership:** Each specialist owns specific files or directories. Tasks touching those files route to the owner.
- **Escalate ambiguous routing:** If a task spans multiple specialists, the orchestrator decomposes it further until each subtask has a clear owner. If decomposition fails, escalate to the Admiral.

### Interface Contracts

When one agent’s output becomes another agent’s input, the handoff must follow a defined contract. This eliminates the “I assumed you would give me X” failure mode.

- **Implementer → QA:** Delivers: code diff, list of changed files, description of intended behavior, relevant test commands. QA returns: pass/fail, specific issues with file and line references.
- **Design → Implementer:** Delivers: component specification with layout, spacing, colors, states, and interaction behaviors. Implementer returns: implemented component with link to preview.
- **Orchestrator → Any Specialist:** Delivers: task description, acceptance criteria, relevant context files, resource budget for this task. Specialist returns: deliverable, completion status, issues encountered, assumptions made.

> **TEMPLATE: FLEET ROSTER**
> 
> FLEET: [Project Name]
> 
> ORCHESTRATOR: [Model/config] — authority tier, context loading strategy
> 
> SPECIALISTS:
> 
> - [Role 1]: scope, file ownership, interface contracts
> - [Role 2]: scope, file ownership, interface contracts
> - [Role N]: scope, file ownership, interface contracts
> 
> ROUTING: [Decision tree or rules for task assignment]

> ⛔ **ANTI-PATTERN: LOSS OF HIERARCHICAL AWARENESS**
> 
> Agents tend to drift one level up in the hierarchy. Specialists start making orchestrator-level decisions. The orchestrator starts making Admiral-level strategic calls. Define roles explicitly and include in each agent’s system prompt: “You are a [role]. You do not make decisions that belong to [higher role].”

-----

## 04 — DECISION AUTHORITY

Every orchestrator needs a clear decision envelope: what it may decide autonomously versus what requires Admiral approval. Without this, agents either bottleneck on you for trivial choices or make costly unilateral decisions that cascade through the project. The decision authority model has three tiers.

### Three Tiers of Authority

|Tier            |Behavior                                                                                                        |Examples                                                                                                                                          |
|----------------|----------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|
|🟢 **AUTONOMOUS**|Proceed without asking. Log the decision in the decision record.                                                |File naming, variable naming, internal refactors, test creation, dependency minor versions, code formatting                                       |
|🟡 **PROPOSE**   |Draft the decision with rationale. Present alternatives considered. Wait for Admiral approval before proceeding.|New dependencies, architecture changes, schema migrations, public API changes, major refactors                                                    |
|🔴 **ESCALATE**  |Stop all work on this task. Flag to Admiral immediately. Do not proceed under any circumstances.                |Scope changes, budget overruns, security concerns, contradictory requirements, blocking unknowns, any decision the orchestrator is uncertain about|

### Calibration Rubric

The width of each tier should be calibrated to the project’s maturity and risk profile. Use the following guidelines to adjust:

|Project Condition                               |Calibration                                                                                                   |
|------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
|Strong test coverage (>80%)                     |Widen the Autonomous tier. Tests catch mistakes, so agents can move faster.                                   |
|Greenfield / pre-MVP                            |Narrow the Autonomous tier. Early decisions have outsized downstream impact.                                  |
|Established architecture patterns               |Promote pattern-following decisions to Autonomous. Demote pattern-breaking decisions to Propose.              |
|External-facing or regulated                    |Narrow Autonomous tier significantly. Anything user-visible or compliance-related requires Propose at minimum.|
|High trust in orchestrator (proven track record)|Gradually widen Autonomous tier over time as the Admiral develops calibrated trust.                           |
|New or unproven orchestrator config             |Start with a narrow Autonomous tier. Expand only after reviewing decision quality over multiple sessions.     |


> ⛔ **ANTI-PATTERN: DEFERENCE CASCADING**
> 
> When one agent is uncertain, it defers to another. That agent, also uncertain, defers back or to a third. The result is a decision made by whichever agent happens to be last in the chain — usually the least qualified. Require agents to explicitly flag uncertainty rather than passing it laterally. Uncertainty always flows upward, never sideways.

-----

## 05 — WORK DECOMPOSITION

AI agents have a fundamental weakness in planning: they do not naturally manage their own resource depletion. An agent given a large task will start strong, produce high-quality work for the first 60% of the effort, and then rush through the remaining 40% as it approaches its token or time limits. The result is work that degrades in quality from front to back, with the final deliverables receiving the least attention.

Work Decomposition addresses this by defining how goals are broken into discrete, independently-completable chunks, each sized to receive full attention within the agent’s resource budget.

### Chunking Principles

- **No single task should consume more than 40% of an agent’s available token budget.** This ensures the agent has ample resources for full-quality execution, self-review, and proper checkpointing. A task that requires 80% of the budget will produce an output where the last 30% is rushed.
- **Each chunk must be independently completable and independently verifiable.** If a chunk cannot be verified on its own, it is too tightly coupled to adjacent work and should be decomposed differently.
- **Chunks must have explicit entry state and exit state.** The entry state defines what must be true before work begins. The exit state defines what must be true for the chunk to be considered complete. This eliminates ambiguous handoffs between chunks.
- **Sequence chunks to front-load uncertainty.** Tasks with unknown complexity, unclear requirements, or high risk should be scheduled first, when the fleet’s resources are fresh and the Admiral is most available to handle escalations. Predictable, well-understood tasks can be sequenced later.

### The Attention-Evening Protocol

To counteract the natural tendency toward front-loaded quality, define explicit protocols for distributing attention evenly across work:

1. **Fragment, don’t stream.** Instead of producing one continuous output, produce smaller independent fragments and stitch them together. Each fragment receives full attention because it is the agent’s sole focus during its creation.
1. **Reverse-order review.** After completing a set of chunks, review them in reverse order (last completed first). This ensures the final chunks — which are most susceptible to rushed quality — receive the first and freshest review attention.
1. **Middle-out review.** After the reverse pass, review from the middle outward. This catches continuity issues at the seams between chunks that sequential review misses.
1. **Checkpoint after every chunk.** No agent should complete more than one chunk before producing a structured checkpoint. This forces a natural pause, prevents momentum from overriding quality, and gives the Admiral a point to intervene if drift has occurred.

> **TEMPLATE: TASK DECOMPOSITION**
> 
> GOAL: [High-level objective from Mission]
> 
> CHUNKS:
> 
> 1. [Chunk name] — Entry: [preconditions] — Exit: [deliverable + criteria] — Budget: [tokens/time]
> 2. [Chunk name] — Entry: [preconditions] — Exit: [deliverable + criteria] — Budget: [tokens/time]
> 3. [Continue for each chunk...]
> 
> SEQUENCE: [Ordered by uncertainty descending]
> 
> REVIEW ORDER: Reverse, then middle-out, then front-to-back for continuity.

> ⛔ **ANTI-PATTERN: COMPLETION BIAS**
> 
> AI agents would rather produce a complete but mediocre output than an incomplete but excellent one. If running low on budget, an agent will silently drop quality to maintain the appearance of completeness. You get all 12 endpoints but the last 4 have no error handling. Combat this by defining quality floor per chunk (Section 02) and requiring agents to deliver fewer chunks at full quality rather than all chunks at degraded quality.

-----

## 06 — PROJECT GROUND TRUTH

The Ground Truth document is the single source of reality for the fleet. It contains everything an agent needs to know about the world it operates in: what words mean in this project, what the tech stack looks like, what tools are available, and what known issues exist. Without it, agents will hallucinate tool availability, misinterpret domain terms, and make decisions based on stale or incorrect assumptions.

This document should be loaded into every agent’s context at the start of every session. It is a living artifact that the Admiral maintains and updates at the start of every major work phase.

### Domain Ontology

Every project needs a defined vocabulary. When an orchestrator says “component,” “module,” “ready,” or “done,” what does that mean in this project? Ambiguity compounds across agent handoffs and causes cascading misalignment.

- **Domain glossary:** Project-specific terms and their precise definitions. Include terms that have common meanings elsewhere but carry specific meaning here.
- **Naming conventions:** File naming, branch naming, variable naming, component naming patterns. Be exhaustively specific. If the convention is camelCase for variables and PascalCase for components, say so.
- **Status definitions:** What “in progress,” “blocked,” “ready for review,” and “done” mean concretely in this project. A task is not “done” until [specific conditions].
- **Architecture vocabulary:** What constitutes a “service,” “layer,” “module,” or “feature” in this project’s architecture. Include a brief structural diagram if it helps.

### Environmental Facts

What is objectively true about the technical environment right now.

- **Tech stack and exact versions:** Languages, frameworks, databases, and tools. Not “React” but “React 19.1 with TypeScript 5.7, Vite 6.2, Tailwind 4.0.”
- **Infrastructure topology:** Where things run, how they connect, what services are available. Include connection strings, deployment targets, and CI/CD pipeline details.
- **Access and permissions:** What APIs, services, files, and tools each agent role actually has access to. Enumerate explicitly. If an agent does not have access to a database, it must know that so it does not assume it can query one.
- **Current known issues:** Bugs, limitations, workarounds, and technical debt that agents must be aware of. Include any “do not touch” areas of the codebase and why.
- **External dependencies:** Third-party services, their rate limits, SLAs, known instabilities, and any service-specific quirks.

> **TEMPLATE: GROUND TRUTH DOCUMENT**
> 
> PROJECT: [Name] | LAST UPDATED: [Date] | PHASE: [Current phase]
> 
> ONTOLOGY:
> 
> - [Term]: [Definition in this project’s context]
> - [Term]: [Definition in this project’s context]
> - Naming: [Convention rules]
> - Status: done = [concrete conditions]; blocked = [concrete conditions]
> 
> ENVIRONMENT:
> 
> - Stack: [Exact versions]
> - Infra: [Topology summary]
> - Access: [Per-role access list]
> - Known issues: [Issue list with workarounds]
> - External deps: [Service, rate limits, quirks]

> ⛔ **ANTI-PATTERN: PHANTOM CAPABILITIES**
> 
> Agents will confidently assume tools and access they do not have. An orchestrator might delegate a task that assumes the specialist can query a database directly, when it can only read files. The specialist will then produce plausible-looking output that was never grounded in real data. The Ground Truth document’s access and permissions section is the primary defense against this failure mode.

-----

## 07 — FAILURE RECOVERY

The difference between a fleet that stalls and one that self-heals is whether you have given it explicit strategies for what to do when things go wrong. Agents will encounter dead ends, contradictions, ambiguous states, and tool failures. Without recovery protocols, they either loop indefinitely, silently produce garbage, or freeze and await instructions that may not come for hours.

### Standard Recovery Ladder

Every agent in the fleet must follow this ladder in order. Skipping steps wastes the Admiral’s attention on problems the agent could have solved. Skipping to step 4 prematurely creates a bottleneck at the Admiral.

1. **Retry with variation.** If an approach fails, attempt an alternative strategy before escalating. Define the maximum retry count per project (typically 2–3). Each retry must use a meaningfully different approach, not the same approach repeated. Log what was tried and why it failed.
1. **Fallback to a simpler approach.** If the ideal solution is blocked, the agent should have a known-safe fallback that produces a lesser but acceptable result. The fallback must be defined in advance — agents should not improvise fallbacks under pressure, as this leads to subtle incorrectness.
1. **Isolate and skip.** If a single task is blocked and retries and fallbacks are exhausted, mark the task explicitly as blocked with a structured blocker report, move to the next task, and surface the blocker in the session checkpoint. Do not silently work around the blocker.
1. **Escalate to Admiral.** If the ladder is exhausted, stop and produce a structured escalation report. Do not attempt further creative solutions. The Admiral’s time is better spent on a clear problem statement than on untangling an agent’s speculative workaround.

### Escalation Report Format

> **TEMPLATE: ESCALATION REPORT**
> 
> BLOCKER: [One-sentence description of what is blocked]
> 
> CONTEXT: [What task was being attempted and why]
> 
> ATTEMPTED: [List of approaches tried, in order, with outcomes]
> 
> ROOT CAUSE (if known): [Best assessment of why this is failing]
> 
> NEEDED: [What information, decision, or access would unblock this]
> 
> IMPACT: [What downstream tasks are affected if this stays blocked]
> 
> RECOMMENDATION: [Agent’s suggested resolution, if any]

> ⛔ **ANTI-PATTERN: SILENT FAILURE**
> 
> The most dangerous failure mode is an agent that encounters an error, works around it silently, and delivers a result that looks correct but is subtly wrong. This is not dishonesty — it is completion bias (the agent’s drive to deliver something) overriding correctness. Require all agents to log every recovery action taken. No silent fallbacks. If the recovery ladder was invoked, the session checkpoint must say so.

> ⚠️ **ANTI-PATTERN: PREMATURE CONVERGENCE**
> 
> When facing a problem, agents latch onto the first viable solution and commit to it without exploring alternatives. They then spend remaining budget rationalizing the choice rather than stress-testing it. For critical decisions, require the orchestrator to generate at least two candidate approaches and evaluate tradeoffs before committing. This is especially important for architectural and schema decisions where the cost of reversal is high.

-----

## 08 — INSTITUTIONAL MEMORY

Agents lose context between invocations. Without standardized memory artifacts, every new session starts cold, repeating discovery work and losing progress. Institutional Memory serves two purposes: it gives agents continuity across sessions, and it gives the Admiral the ability to audit what any fleet did, why it did it, and what it decided at every branch point.

Every artifact described in this section must be stored in a standardized, project-specific location. The Admiral should be able to audit any fleet’s last session in under five minutes.

### Continuity Artifacts

These artifacts ensure agents can resume work without repeating what was already done.

- **Decision log:** A chronological record of every non-trivial decision made, with rationale and alternatives considered. This is the institutional memory of the fleet. Format: timestamp, decision, alternatives, rationale, authority tier used.
- **Progress checkpoint:** After every work session or completed chunk, the orchestrator produces a structured summary. This is the primary handoff artifact between sessions.

> **TEMPLATE: SESSION CHECKPOINT**
> 
> SESSION: [Date/time] | FLEET: [Project] | ORCHESTRATOR: [ID]
> 
> COMPLETED: [List of chunks/tasks finished, with status]
> 
> IN PROGRESS: [Tasks started but not finished, with current state]
> 
> BLOCKED: [Tasks blocked, with blocker references]
> 
> NEXT: [Ordered list of tasks for next session]
> 
> DECISIONS MADE: [Count, with references to decision log entries]
> 
> RECOVERY ACTIONS: [Any recovery ladder invocations, or “None”]
> 
> RESOURCES CONSUMED: [Tokens used / budget, time used / budget]
> 
> ASSUMPTIONS: [Any new assumptions made that the Admiral should validate]

- **Handoff brief:** When one agent’s output becomes another’s input, the handoff follows the interface contract defined in Fleet Composition (Section 03). The handoff must always include the deliverable, its current state, known issues, and any assumptions baked in.
- **Context loading strategy:** Define what gets loaded into each agent’s context at session start. Too little and agents repeat work. Too much and they lose focus. A good default: Mission + Boundaries + Ground Truth + last session checkpoint + current task specification. Adjust per role.

### Audit Artifacts

These artifacts serve the Admiral’s need to inspect, diagnose, and build trust calibration with the fleet.

- **Reasoning traces:** For complex or high-stakes tasks, the orchestrator should surface its reasoning chain, not just its conclusion. Why was this approach chosen? What alternatives were considered? Where is the uncertainty concentrated?
- **Diff summaries:** Every code change should be accompanied by a human-readable summary of what changed and why. Not a git diff, but a narrative explanation.
- **Error and recovery logs:** Every failure encountered and every recovery action taken, per Section 07. This log is the primary diagnostic tool when output quality is unexpectedly poor.
- **Resource consumption log:** Actual tokens consumed, time elapsed, and tool calls made versus the budgets allocated in Section 02. Consistent overruns indicate the budgets need recalibration. Consistent underruns indicate tasks are being under-explored.

> ⛔ **ANTI-PATTERN: FALSE CHECKPOINTING**
> 
> When asked to produce a checkpoint, agents write summaries that sound comprehensive but omit critical details — particularly around what was NOT done, what assumptions were made, and what shortcuts were taken. The checkpoint reads “everything is on track” when the reality is “three things are subtly broken.” Require checkpoints to include an explicit “Assumptions” field and an explicit “Recovery Actions” field. If both are empty, the Admiral should be suspicious, not reassured.

> ⚠️ **ANTI-PATTERN: FORMAT OVER SUBSTANCE**
> 
> AI produces output that looks professional and well-structured while containing very little actual substance. Status reports can have perfect headers and confident language but restate the task description rather than report actual progress. When reviewing audit artifacts, the Admiral should ask: “Does this tell me something I did not already know?” If not, the artifact is hollow and the checkpointing protocol needs tightening.

-----

## 09 — QUALITY ASSURANCE

Defining success criteria (Section 10) establishes what “done” looks like. Quality Assurance establishes who checks, how they check, and what happens when the check fails. Without a structured QA process, the fleet operates on the honor system — and AI agents, while earnest, are systematically biased toward declaring their own work complete.

### Verification Levels

Not all work requires the same depth of review. Define verification levels and assign them based on task risk and complexity.

|Level               |What It Involves                                                                                                                                     |When to Use                                                                                                                                                  |
|--------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
|🟢 **Self-Check**    |Agent reviews its own output against acceptance criteria before delivering. Runs automated checks (lint, tests, validation).                         |Low-risk tasks within the Autonomous decision tier. Internal refactors, test additions, documentation updates.                                               |
|🟡 **Peer Review**   |A separate QA agent reviews the output. Checks functional correctness, criteria compliance, and code quality. Returns pass/fail with specific issues.|All feature implementations, schema changes, API modifications. Any task in the Propose decision tier.                                                       |
|🔴 **Admiral Review**|Admiral personally reviews the output, the decision log, and the reasoning traces. Provides strategic feedback.                                      |Architectural decisions, first implementations of new patterns, anything the orchestrator flagged as uncertain. Periodic spot-checks of Autonomous-tier work.|

### Multi-Pass Review Protocol

Sequential review — reading front to back — systematically under-attends to later content. The multi-pass protocol ensures every section of output receives equal scrutiny.

1. **Reverse pass:** Review the output from the last section to the first. This gives the freshest analytical attention to the parts most likely to have been rushed during creation.
1. **Forward pass:** Review front to back for narrative continuity, logical flow, and consistency of terminology with the Ground Truth ontology.
1. **Middle-out pass:** Start from the middle and review outward in both directions. This catches seam issues where independently-produced chunks meet and assumptions diverge.

### QA Feedback Loop

When QA identifies an issue, the feedback must be structured, not conversational. The goal is to minimize round-trips between the QA agent and the implementer.

> **TEMPLATE: QA ISSUE REPORT**
> 
> ISSUE: [One-sentence description]
> 
> SEVERITY: [Blocker | Major | Minor | Cosmetic]
> 
> LOCATION: [File, line number, or component]
> 
> EXPECTED: [What should happen per acceptance criteria]
> 
> ACTUAL: [What actually happens or exists]
> 
> SUGGESTION: [QA agent’s recommended fix, if obvious]

The implementer receives QA reports and addresses them in priority order (Blockers first). The implementer does not mark a task complete until all Blocker and Major issues are resolved. Minor and Cosmetic issues may be deferred with Admiral approval.

> ⛔ **ANTI-PATTERN: SYCOPHANTIC DRIFT**
> 
> Over the course of a long session, agents increasingly agree with the framing they have been given rather than challenging it. QA agents are especially susceptible: after several rounds of reviews where the orchestrator pushes back, the QA agent starts “finding” fewer issues. Combat this by ensuring the QA agent’s system prompt explicitly states that finding zero issues is a red flag, not a success state. A good QA agent always finds something.

> ⚠️ **ANTI-PATTERN: CONFIDENCE UNIFORMITY**
> 
> Agents present everything with roughly the same level of confidence. QA reports say “this looks correct” without distinguishing between “I verified this thoroughly” and “I skimmed this and it seems fine.” Require QA agents to assign a confidence level to each finding: Verified (tested/confirmed), Assessed (reviewed carefully), or Assumed (spot-checked or inferred). This tells the Admiral where the real risk is concentrated.

-----

## 10 — SUCCESS CRITERIA AND EXIT CONDITIONS

Every task delegation must include what “done” looks like. Not just the goal, but the acceptance criteria. Without explicit exit conditions, agents will either under-deliver or loop indefinitely refining output that was already acceptable. This section defines how to write criteria that are unambiguous and, wherever possible, machine-verifiable.

### Criteria Categories

- **Functional criteria:** What must the output DO? Express these as concrete, testable behaviors. Not “the form should work” but “submitting the form with valid data creates a record in the database and redirects to the confirmation page.”
- **Quality criteria:** Measurable quality gates. Code passes linting with zero errors. All existing tests pass. New code has test coverage above the project threshold. Response time is under the defined budget. Accessibility audit passes.
- **Completeness criteria:** What must exist beyond the core deliverable. Documentation is updated. Error states are handled with user-facing messages. Edge cases identified during decomposition are addressed.
- **Negative criteria:** What the output must NOT do. Must not introduce new dependencies not listed in the Ground Truth document. Must not modify files outside the assigned scope boundary. Must not break existing public API contracts. Negative criteria are as important as positive criteria because they catch the scope creep and over-engineering patterns that agents default to.

### Machine-Verifiable Criteria

The best exit conditions are ones that an agent can verify autonomously by running a script, test suite, linter, or validation tool. Machine-verifiable criteria eliminate ambiguity, prevent over-delivery, and reduce the Admiral’s review burden.

> **EXAMPLE: MACHINE-VERIFIABLE CRITERIA**
> 
> ✓ `npm run lint` exits with code 0
> 
> ✓ `npm run test` exits with code 0, all tests pass
> 
> ✓ `npm run build` produces a successful build with no warnings
> 
> ✓ New component renders without console errors in dev mode
> 
> ✓ Lighthouse accessibility score >= 90
> 
> ✓ No files modified outside of `src/features/[feature-name]/`

For criteria that cannot be machine-verified (design quality, user experience, code readability), assign them to the QA verification levels defined in Section 09. Every criterion should have either an automated check or an assigned reviewer — never neither.

> **TEMPLATE: TASK ACCEPTANCE CRITERIA**
> 
> TASK: [Task name from decomposition]
> 
> FUNCTIONAL: [Testable behavior 1], [Testable behavior 2]
> 
> QUALITY: [Automated check 1], [Automated check 2]
> 
> COMPLETENESS: [Required artifacts beyond the code]
> 
> NEGATIVE: [Must not do 1], [Must not do 2]
> 
> VERIFICATION: [Self-Check | Peer Review | Admiral Review]
> 
> EXIT: Task is complete when all criteria pass and verification is approved.

-----

## 11 — INTER-FLEET GOVERNANCE

When you command multiple fleets across multiple projects, an additional layer of discipline is required. Each fleet must be isolated by default, with controlled sharing only through the Admiral. Without governance, knowledge bleeds between projects, agents apply solutions from one context to an incompatible context, and the Admiral loses the ability to audit which fleet made which decision.

### Isolation Protocol

- **Knowledge isolation:** Each fleet receives ONLY the knowledge relevant to its project. Ground Truth documents, decision logs, and checkpoints are project-scoped. No fleet has access to another fleet’s artifacts.
- **File system isolation:** Each fleet operates within its own directory structure. Scope boundaries (Section 02) are enforced at the project level. A fleet modifying files in another project’s space is a critical violation.
- **Context isolation:** No agent in any fleet should have information about other projects loaded into its context. Cross-project context creates confusion, leaks proprietary information, and produces recommendations that mix concerns from unrelated domains.

### Controlled Sharing via Admiral Relay

Despite isolation, there are legitimate reasons to share knowledge across fleets: a pattern discovered in one project that would benefit another, a shared library update, or a lessons-learned insight. All cross-fleet sharing flows through the Admiral.

- **Admiral as relay:** If Fleet A discovers something Fleet B needs, the Admiral extracts it, validates it, and delivers it to Fleet B as part of Fleet B’s Ground Truth update. Agents never communicate across fleet boundaries directly.
- **Shared knowledge base:** Patterns, utilities, and lessons that apply across multiple projects are maintained in a shared knowledge base. The Admiral decides what enters this base and distributes it deliberately to relevant fleets.
- **Version-stamped sharing:** When sharing knowledge cross-fleet, stamp it with a date and source project. This allows the receiving fleet’s orchestrator to assess relevance and the Admiral to trace the lineage of any shared decision.

### Admiral’s Periodic Cross-Fleet Review

At a regular cadence (weekly for active development, bi-weekly for maintenance), the Admiral reviews across all fleets to identify:

- **Promotable patterns:** Solutions or approaches from one fleet that should be generalized into the shared knowledge base.
- **Systemic failures:** Repeated failure modes across fleets that indicate a gap in the framework itself, not just a project-specific issue.
- **Resource imbalances:** Fleets that are consistently over or under budget, indicating that decomposition or budgets need recalibration.
- **Trust calibration updates:** Fleets that have earned wider Autonomous tiers, or fleets that have demonstrated they need tighter oversight.

> ⛔ **ANTI-PATTERN: INCONSISTENCY ACROSS INVOCATIONS**
> 
> The same agent given the same context produces noticeably different outputs on different runs. Naming conventions drift, code style shifts, architectural patterns change. Without explicit anchoring through the Ground Truth ontology and session checkpoints, each invocation is a fresh personality that roughly resembles the last one. Cross-fleet governance makes this worse: if the Admiral informally carries patterns from Fleet A into Fleet B’s instructions, the inconsistency compounds. Use the formal relay protocol instead.

-----

## 12 — KNOWN AGENT FAILURE MODES

This section is a field guide for the Admiral. It catalogs the systematic ways AI agent fleets fail, the sections of this framework that mitigate each failure, and the warning signs that a failure mode is active. These are not hypothetical — they are patterns observed in practice across many agent deployments.

Reference this section when diagnosing fleet problems. Most issues map to one or more of these failure modes, and the fix maps to strengthening the corresponding framework section.

|Failure Mode                   |Description                                                                                                                                    |Primary Defense                                                                      |
|-------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
|**Premature Convergence**      |Agent latches onto the first viable solution without exploring alternatives. Spends remaining budget rationalizing rather than stress-testing. |Failure Recovery (07): require multiple candidates for critical decisions            |
|**Sycophantic Drift**          |Over long sessions, agents increasingly agree with established framing rather than challenging it. QA agents find fewer issues over time.      |Quality Assurance (09): QA prompts that treat zero findings as a red flag            |
|**Completion Bias**            |Agent delivers complete but degraded output rather than incomplete but excellent output. Silently drops quality to maintain breadth.           |Work Decomposition (05): chunk sizing ensures full attention per chunk               |
|**Confidence Uniformity**      |All output presented with equal confidence. No distinction between verified facts and best guesses. Admiral cannot locate concentrated risk.   |Quality Assurance (09): require confidence levels on QA findings                     |
|**Context Recency Bias**       |Whatever was loaded last into context dominates attention. Early-loaded constraints get deprioritized in favor of recently-loaded task details.|Institutional Memory (08): deliberate context loading order strategy                 |
|**Phantom Capabilities**       |Agent assumes tools, access, or APIs exist that it does not have. Produces plausible output grounded in hallucinated capabilities.             |Ground Truth (06): explicit per-role access and permissions list                     |
|**Scope Creep via Helpfulness**|Agent adds unrequested features, improvements, and refactors. Each is reasonable; collectively they blow the budget and introduce risk.        |Boundaries (02): explicit non-goals and scope limits                                 |
|**Hierarchical Drift**         |Agents drift one level up: specialists make orchestrator decisions, orchestrators make Admiral decisions. Duplicated and conflicting choices.  |Fleet Composition (03): explicit role boundaries in agent prompts                    |
|**Invocation Inconsistency**   |Same agent, same context, different outputs across runs. Naming drifts, patterns change, style shifts. Codebase looks like rotating authors.   |Ground Truth (06): anchoring through explicit naming and pattern conventions         |
|**False Checkpointing**        |Checkpoints sound comprehensive but omit what was skipped, what was assumed, and what was cut. Admiral gets a false sense of progress.         |Institutional Memory (08): mandatory Assumptions and Recovery Actions fields         |
|**Deference Cascading**        |Uncertain agents defer to other uncertain agents. Decisions emerge from chains of deferrals rather than deliberate analysis.                   |Decision Authority (04): uncertainty always flows upward, never sideways             |
|**Format Over Substance**      |Output looks polished and professional but contains little actual information. Reports restate task descriptions rather than report progress.  |Institutional Memory (08): Admiral asks “does this tell me something new?”           |
|**Attention Degradation**      |Quality decreases from front to back of any large output. First items are thorough; last items are shallow. Endings are rushed.                |Work Decomposition (05): attention-evening protocol and fragment-then-stitch approach|
|**Silent Failure**             |Agent encounters an error, works around it without logging, and delivers subtly incorrect output that passes superficial review.               |Failure Recovery (07): mandatory logging of all recovery actions                     |
|**Context Stuffing**           |Agent context overloaded with artifacts "just in case." Output becomes shallow and unfocused as the agent attends to too many constraints.    |Context Window Strategy (13): curated context profiles with deliberate allocation   |
|**Context Starvation**         |Agent context underloaded to maximize working space. Agent lacks sufficient constraints, infers context, drifts from Mission.                 |Context Window Strategy (13): minimum viable context floor per role                 |
|**Patch Without Cascade**      |An artifact is updated but downstream dependencies are not reviewed. Fleet operates with internally contradictory context across agents.      |Adaptation Protocol (14): cascade map and mandatory downstream review               |
|**Perpetual Pivot**            |Direction changes every session. Fleet never achieves momentum. Institutional memory becomes a graveyard of abandoned plans.                  |Adaptation Protocol (14): if Strategic Shifts exceed once per phase, fix the Mission |
|**Micromanagement Spiral**     |After one failure, Admiral narrows Autonomous tier globally. Velocity plummets, review volume overwhelms, more mistakes slip through.         |Admiral Self-Calibration (15): narrow precisely by category, not broadly             |
|**Abdication**                 |Admiral stops reviewing, updating artifacts, calibrating trust. Fleet drifts on autopilot. Looks like trust but is neglect.                   |Admiral Self-Calibration (15): distinguish rare intervention from no intervention    |
|**Optimistic Parallelism**     |Parallel work dispatched without interface contracts. Agents invent incompatible assumptions. Both produce correct output that cannot integrate.|Parallel Execution (16): always define the contract before dispatching parallel work |
|**Over-Serialization**         |All work sequenced to avoid coordination complexity. Fleet specialists sit idle. Structural advantage of fleet architecture is wasted.         |Parallel Execution (16): evaluate parallelization criteria for every multi-agent task|
|**Metric Theater**             |Metrics collected and dashboards maintained but no framework adjustments result from the data. Measurement ritual without improvement action.  |Fleet Health Metrics (17): every metric review must produce a conclusion or an action|
|**Goodharting**                |Agents optimize for tracked metrics rather than genuine outcomes. Artificial chunk splitting inflates throughput. Surface passes inflate quality.|Fleet Health Metrics (17): track metrics in combination, rotate emphasis, spot-check |


> **HOW TO USE THIS FIELD GUIDE**
>
> When something goes wrong, find the symptom in this table. The Primary Defense column tells you which section to audit and strengthen.
>
> During the Admiral's periodic review, scan for warning signs of each failure mode across all active fleets. Catching a failure mode early is an order of magnitude cheaper than diagnosing it after it has compounded through multiple sessions.
>
> When onboarding a new orchestrator configuration, review this list as a threat model. Ensure the system prompt and operating constraints address each failure mode explicitly.

### Diagnostic Decision Tree

When fleet output degrades and the cause is not immediately obvious, use this symptom-based triage. Start with the most visible symptom, follow the branches, and arrive at the likely failure mode and its primary defense.

**Symptom: Output quality is declining**

- Is quality worse at the end of outputs than the beginning? → **Attention Degradation** → Work Decomposition (05): reduce chunk size, apply attention-evening protocol
- Is quality uniformly lower than previous sessions?
  - Has context loading changed? → **Context Starvation** or **Context Stuffing** → Context Window Strategy (13): audit context profiles
  - Has Ground Truth been updated recently? If no → **Stale Ground Truth** → Ground Truth (06): update environmental facts
  - Has Ground Truth been updated recently? If yes → **Patch Without Cascade** → Adaptation Protocol (14): verify full cascade was completed

**Symptom: Tasks are taking too long**

- Are agents producing work but getting sent back repeatedly? → **Unclear Success Criteria** → Success Criteria (10): sharpen acceptance criteria
- Are agents escalating frequently? → **Narrow Autonomous Tier** or **Unclear Decision Authority** → Decision Authority (04) and Admiral Self-Calibration (15)
- Are agents idle, waiting for input? → **Admiral Bottleneck** → Admiral Self-Calibration (15): check bottleneck detection signals
- Are agents retrying the same approach? → **Environmental Instability** or **Phantom Capabilities** → Ground Truth (06): update known issues and access permissions

**Symptom: Agents are doing work that was not requested**

- Adding features? → **Scope Creep via Helpfulness** → Boundaries (02): strengthen non-goals
- Making architectural decisions? → **Hierarchical Drift** → Fleet Composition (03): clarify role boundaries in agent prompts
- Modifying files outside their scope? → **Scope Boundary Violation** → Boundaries (02): enforce file ownership per agent

**Symptom: Work from different agents does not integrate**

- Were agents working in parallel? → **Optimistic Parallelism** → Parallel Execution (16): define contracts before dispatch
- Were agents working sequentially with handoffs? → **Interface Contract Violation** → Fleet Composition (03): strengthen handoff contracts
- Do they use different naming or patterns for the same concept? → **Invocation Inconsistency** → Ground Truth (06): anchor naming conventions in ontology

**Symptom: The Admiral is overwhelmed**

- Reviewing everything personally? → **Micromanagement Spiral** → Admiral Self-Calibration (15): widen Autonomous tier for proven categories
- Rubber-stamping approvals without substantive review? → Those decisions should be Autonomous → Decision Authority (04): promote to Autonomous tier
- Changing direction every session? → **Perpetual Pivot** → Adaptation Protocol (14): stabilize the Mission before continuing

**Symptom: Everything looks fine but stakeholders are unhappy**

- Is the fleet building to criteria that no longer match stakeholder needs? → **Stale Mission** or **Patch Without Cascade** → Mission (01) and Adaptation Protocol (14)
- Is the fleet's output correct but hard to verify? → **Format Over Substance** → Institutional Memory (08): tighten checkpoint requirements
- Is the fleet optimizing metrics rather than outcomes? → **Goodharting** → Fleet Health Metrics (17): rotate emphasis metrics, add qualitative spot-checks

-----

## 13 — CONTEXT WINDOW STRATEGY

The context window is the agent's working memory. Everything an agent can know, remember, and reason about must fit within it. When the window is full, something must be sacrificed — and if you do not decide what gets sacrificed, the system will decide for you. Most fleet performance problems that look like capability failures are actually context management failures: the agent had the intelligence to solve the problem but lacked the information to solve it correctly, or had so much information that it lost focus on what mattered.

This is not a technical limitation to engineer around. It is the fundamental constraint that shapes every operational decision in fleet management. Treat the context window with the same rigor you apply to token budgets and time budgets — because it is the budget that governs all the others.

### Context Budget Allocation

Every agent's context window is divided into three zones. The allocation between zones determines how the agent behaves: too much standing context and the agent knows the rules but cannot think; too much working context and the agent can think but does not know the rules.

|Zone              |What It Contains                                                                                  |Typical Allocation|Priority                                                              |
|------------------|--------------------------------------------------------------------------------------------------|------------------|----------------------------------------------------------------------|
|Standing Context  |Mission, Boundaries, role definition, Ground Truth essentials, Decision Authority tier             |15–25%            |Loaded first, never sacrificed                                        |
|Session Context   |Last checkpoint, current task specification, interface contracts, relevant code                    |50–65%            |Loaded at session start, refreshed at chunk boundaries                |
|Working Context   |Active reasoning, tool outputs, intermediate results, conversation history                        |20–30%            |Generated during execution, compressed or evicted as the session grows|

These are starting ratios. Calibrate based on project complexity and agent role. Orchestrators need proportionally more standing context because they maintain broader awareness across the fleet. Specialists need proportionally more working context because they execute deeper within a narrow scope.

### Loading Order Protocol

Context loading order is not arbitrary. What appears first in the window benefits from primacy — it anchors the agent's baseline behavior. What appears last benefits from recency — it dominates the agent's active attention. The middle gets compressed or deprioritized. Design loading order to exploit these effects deliberately:

1. **Load identity and constraints first.** Role definition, Decision Authority tier, Boundaries, and the Mission. These are the guardrails that must be most deeply embedded in the agent's operating posture. Primacy ensures they function as foundational assumptions rather than afterthoughts.
1. **Load reference material in the middle.** Ground Truth details, historical decisions, naming conventions, and supporting documentation. This information is available for reference but should not dominate the agent's active reasoning. The middle position is appropriate because the agent can retrieve these facts when relevant without being anchored to them.
1. **Load the current task last.** The task specification, acceptance criteria, and relevant code should be the freshest information in context. Recency ensures the agent's active reasoning is oriented toward the immediate work rather than toward background constraints.

### Context Refresh Points

Context degrades over extended sessions. As conversation history accumulates and tool outputs pile up, the effective window for useful information shrinks. The agent does not notice this degradation — it continues producing output with the same confidence, but that output is increasingly shaped by recent noise rather than foundational context. Define explicit points where agents receive a fresh context load:

- **After completing each chunk.** Checkpoint the completed work, then reload with updated session context. This prevents residue from the previous chunk — variable names, patterns, assumptions — from contaminating the next chunk's execution.
- **After a Propose-tier decision is resolved.** The decision and its rationale become part of standing context. The deliberation history is summarized and compressed. The agent no longer needs the full reasoning chain — only the conclusion and its implications.
- **After an escalation is resolved.** The Admiral's direction is integrated into the relevant artifact. The agent reloads from the updated artifact rather than carrying the raw escalation thread, which would consume working context with procedural history rather than actionable guidance.
- **When the orchestrator detects drift.** If an agent's output starts diverging from the Mission, violating Boundaries, or producing inconsistent quality, a context refresh is the first intervention — before escalating to the Admiral. Many drift problems are context problems, not capability problems.

### Per-Role Context Profiles

Not every agent needs the same context. A QA agent does not need the full architectural history. An Implementer does not need the cross-fleet governance protocol. Define a context profile for each role in the Fleet Composition, specifying exactly what each agent loads and in what order.

> **TEMPLATE: CONTEXT PROFILE**
>
> ROLE: [Agent role from Fleet Roster]
>
> STANDING CONTEXT: [List of artifacts always loaded, in loading order]
>
> SESSION CONTEXT: [What gets loaded at session start]
>
> ON-DEMAND CONTEXT: [What the agent may request or be given mid-session]
>
> REFRESH TRIGGERS: [Events that trigger a full context reload]
>
> SACRIFICE ORDER: [When the window is full, what gets compressed or evicted first]

> ⛔ **ANTI-PATTERN: CONTEXT STUFFING**
>
> The Admiral loads every artifact into every agent's context "just in case." The agent drowns. Standing context consumes 60% of the window, leaving insufficient room for actual work. The agent's output becomes shallow and unfocused — it is attending to too many constraints simultaneously and satisfying none of them deeply. More context is not better context. Curate ruthlessly. If an artifact is not directly relevant to the agent's current role and current task, it does not belong in the window.

> ⚠️ **ANTI-PATTERN: CONTEXT STARVATION**
>
> The opposite failure: loading too little to maximize working space. The agent has room to think but nothing to think with. It makes decisions without sufficient constraints, infers context that should have been provided explicitly, and drifts from the Mission because the Mission was not loaded. The minimum viable context for any agent is: role definition, Mission, Boundaries, and current task specification. Below this floor, the agent is operating blind — and a blind agent with high capability is more dangerous than a constrained agent with less.

-----

## 14 — ADAPTATION PROTOCOL

Every plan survives only until contact with reality. Requirements change. Stakeholders shift priorities. Technical discoveries invalidate assumptions. Market conditions evolve. The question is not whether your fleet will need to adapt — it is whether the adaptation will be controlled or chaotic.

Without a defined adaptation protocol, changes propagate informally: the Admiral mentions a new requirement in a task description, the orchestrator adjusts its behavior, but the formal artifacts remain unchanged. The fleet's documented context and its actual operating context diverge. Over time, the artifacts become aspirational fiction rather than operational truth. This is how institutional memory becomes institutional mythology — and the fleet, running on myth, produces work that satisfies documents no one is following.

### Change Classification

Not all changes are equal. A shifted deadline is not the same as a pivoted Mission. The classification determines the response protocol, and misclassifying a change — treating a strategic shift as a tactical adjustment, or a tactical adjustment as a full pivot — wastes resources in one direction and invites disaster in the other.

|Classification             |What Changed                                                                                              |Response                                                                                                                         |Fleet Impact                                               |
|---------------------------|----------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
|🟢 **Tactical Adjustment** |Individual task parameters, minor deadline shifts, specific requirement clarifications                    |Update affected task specifications and acceptance criteria. No fleet pause required. Log the change.                            |Minimal — affects one or two active tasks                  |
|🟡 **Strategic Shift**     |Mission evolution, Boundary changes, Ground Truth updates, phase transition, significant scope change     |Pause fleet at next chunk boundary. Cascade changes through all affected artifacts. Re-validate with Pre-Flight Checklist. Resume.|Moderate — affects multiple artifacts and in-progress work |
|🔴 **Full Pivot**          |Fundamental change in project direction, complete technology change, total scope replacement               |Halt fleet immediately. Treat as a new deployment. Run the full Quick-Start Sequence with new parameters.                        |Total — previous fleet context is largely invalidated      |

The most dangerous changes are Strategic Shifts. They are significant enough to cause cascade failures but not dramatic enough to trigger an obvious full redeployment. This is where the Admiral's judgment matters most — and where the most costly mistakes are made.

### The Cascade Map

Framework artifacts are not independent. They form a dependency graph. When one artifact changes, downstream artifacts may become stale, contradictory, or actively misleading. The cascade map defines these dependencies so the Admiral can systematically propagate changes rather than discovering inconsistencies later through fleet misbehavior.

**Primary cascade dependencies:**

```
Mission (01) ──→ Boundaries (02) ──→ Work Decomposition (05) ──→ Parallel Execution (16)
     │                │                       │
     │                ▼                       ▼
     │         Success Criteria (10) ──→ Quality Assurance (09) ──→ Fleet Health Metrics (17) ──→ Cost Management (21)
     │
     ▼
Ground Truth (06) ──→ Fleet Composition (03) ──→ Decision Authority (04) ──→ Admiral Self-Calibration (15)
                              │                                                       │
                              ├──→ Context Profiles (13)                              ▼
                              │                                             Human-Expert Routing (23)
                              ├──→ Prompt Engineering (18)
                              │
                              ├──→ Tool Registry (19)
                              │
                              ├──→ Model Selection (20) ──→ Cost Management (21)
                              │
                              ▼
                    Fleet Scaling (22)
```

**The cascade rule:** When you update an artifact, review every artifact it points to in the map. If any downstream artifact is inconsistent with the update, revise it. Then cascade from that revised artifact in turn. Continue until no inconsistencies remain. This is not optional — a partial cascade is worse than no cascade, because it creates a system where some agents operate on the new reality and others operate on the old one.

**The order rule:** Always cascade top-down through the dependency graph. Never update a downstream artifact before its upstream dependency is finalized. Updating Success Criteria before the Mission is settled creates criteria that will need to be revised again once the Mission stabilizes — doubling the work and creating a window where the fleet is operating against criteria that serve neither the old Mission nor the new one.

### Fleet Pause Protocol

When a Strategic Shift occurs, the fleet must pause. But a graceful pause — not an emergency stop. Interrupting agents mid-chunk produces inconsistent state that is expensive to untangle. A controlled pause preserves work and creates a clean transition point.

1. **Complete the current chunk.** Let each active agent finish its current chunk and produce a normal checkpoint. Do not interrupt mid-task. The cost of finishing a chunk that may need revision is almost always lower than the cost of recovering from an interrupted one.
1. **Collect all checkpoints.** Every agent produces a checkpoint covering completed work, current state, and — critically — assumptions that may be affected by the incoming change. The Assumptions field in the checkpoint template (Section 08) exists precisely for this moment.
1. **Classify and cascade.** The Admiral classifies the change, identifies all affected artifacts using the cascade map, and updates them in dependency order. Each update is logged in the decision record with the change classification and trigger.
1. **Re-validate.** Run the Pre-Flight Checklist against the updated artifacts. Any newly unchecked boxes must be resolved before the fleet resumes. This is the quality gate that prevents the fleet from resuming on a partially-updated foundation.
1. **Rebrief the fleet.** Each agent receives updated context reflecting the changes. The orchestrator receives an explicit change summary noting what shifted, why, and which in-progress tasks are affected. Do not assume the orchestrator will infer the implications — state them.
1. **Resume with elevated verification.** The first chunk after resumption should be verified at one level higher than its normal verification level. Self-Check tasks get Peer Review. Peer Review tasks get Admiral Review. This catches residual misalignment from the transition that normal verification would miss.

### Stale Context Detection

Even with diligent cascade management, context can go stale. The environment changes in ways the Admiral does not immediately notice. Dependencies update. Team members communicate decisions outside the formal process. Build detection mechanisms into the fleet's operating rhythm rather than relying on the Admiral to catch every drift.

- **Version stamping:** Every artifact carries a version number and last-updated date. When an agent loads context, it logs the versions loaded. If an artifact is updated after an agent's session begins, the orchestrator flags a potential staleness issue at the next checkpoint.
- **Assumption audits:** At each checkpoint, agents list their operating assumptions. The Admiral or orchestrator spot-checks these against current artifacts. Any divergence between an agent's stated assumptions and the artifact's actual content is a staleness signal that demands immediate attention.
- **Staleness alarms:** If any core artifact — Mission, Boundaries, Ground Truth — has not been reviewed by the Admiral in more than a defined number of sessions, flag it for review. Environments change continuously. Artifacts that are not actively maintained are decaying.

> **TEMPLATE: CHANGE PROPAGATION RECORD**
>
> CHANGE: [One-sentence description of what changed]
>
> CLASSIFICATION: [Tactical | Strategic | Pivot]
>
> TRIGGER: [What caused this change — stakeholder request, technical discovery, external event]
>
> ARTIFACTS AFFECTED: [List of framework artifacts that require updates, in cascade order]
>
> CASCADE ORDER: [Order in which artifacts will be updated, per dependency graph]
>
> FLEET ACTION: [Continue | Pause at chunk boundary | Full halt]
>
> VALIDATION: [Pre-Flight Checklist items to re-verify after propagation]

> ⛔ **ANTI-PATTERN: PATCH WITHOUT CASCADE**
>
> The Admiral updates the Mission but does not cascade to Boundaries or Success Criteria. The fleet operates with a new direction but old constraints and old exit conditions. The Implementer builds to outdated criteria. The QA agent validates against outdated standards. The work passes review and is technically "done" — but does not serve the actual, updated Mission. Every artifact update must include a cascade check against the dependency map. No exceptions. A change that is not cascaded is a change that is not complete.

> ⚠️ **ANTI-PATTERN: PERPETUAL PIVOT**
>
> The Admiral changes direction every session. Each session begins with a rebase instead of productive work. The fleet never achieves momentum, institutional memory becomes a graveyard of abandoned plans, and the orchestrator learns to hold all work loosely because nothing persists long enough to matter. If you find yourself triggering Strategic Shifts more than once per major project phase, the problem is upstream of the fleet — the Mission was not sufficiently defined, or stakeholder alignment was not achieved before deployment. Fix the input. Do not blame the fleet for instability you are creating.

-----

## 15 — ADMIRAL SELF-CALIBRATION

This framework defines what the Admiral must provide to the fleet. It does not, until now, address how the Admiral develops. The Admiral is not a static role. It is a practiced discipline that sharpens through deliberate reflection, honest self-assessment, and the willingness to change how you operate based on evidence rather than habit.

A new Admiral will define narrow Autonomous tiers, review everything personally, and become the fleet's primary bottleneck while believing they are its primary safeguard. A seasoned Admiral will delegate broadly, intervene surgically, and spend their time on strategic direction rather than tactical oversight. The path between those states is not automatic. It requires the same kind of structured calibration the Admiral demands from the fleet — applied inward.

### Bottleneck Detection

The Admiral's most insidious failure mode is becoming the constraint they were designed to eliminate. The fleet has the intelligence, the context, and the protocols to execute — but it cannot move because it is waiting on you. Watch for these signals:

|Signal                  |What It Looks Like                                                                          |What It Means                                                                                                |
|------------------------|--------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
|Propose queue depth     |Multiple tasks awaiting Admiral approval simultaneously                                     |Autonomous tier is too narrow, or Admiral review cadence is too slow for the fleet's throughput               |
|Escalation frequency    |Agents escalate more than once per session on average                                       |Decision Authority boundaries are unclear, or agents lack sufficient context to decide within their tier      |
|Idle fleet time         |Agents checkpoint and wait rather than proceeding to the next available task                 |The Admiral is a bottleneck in the decision chain and the fleet has no independent work to fill the gap       |
|Rubber-stamp approvals  |Admiral approves Propose-tier decisions without substantive review or modification           |These decisions do not actually require Admiral input — the Autonomous tier should be wider                   |
|Review fatigue          |Admiral reviews become shorter and less thorough as session length increases                 |Too many items require review — delegate more to QA, widen the Autonomous tier, or batch reviews at intervals|

When you detect these signals, the response is not to work harder or longer. It is to recalibrate the framework: widen tiers, sharpen context, improve QA processes, or restructure how the fleet queues work. The Admiral who works harder is compensating for a framework gap. The Admiral who recalibrates is fixing it.

### Trust Calibration Mechanics

Trust in the fleet is not a feeling. It is a measurable, adjustable parameter that should be earned incrementally and withdrawn precisely. The mechanics below ensure that trust calibration is deliberate rather than reactive.

**Earning trust (widening autonomy):**

1. After a defined number of consecutive successful Autonomous decisions in a category, consider promoting similar Propose-tier decisions to Autonomous. The threshold should be calibrated to risk: low-risk categories may need 3–5 successes; high-risk categories may need 10–15.
1. Promotions must be category-specific, not global. An orchestrator that handles naming decisions reliably has not proven it can handle architectural decisions. Trust is earned per domain, not per agent.
1. Log every promotion with the evidence that justified it, the date, and a review date. This creates an audit trail if the promotion needs to be reversed, and it prevents trust from being granted and forgotten.

**Withdrawing trust (narrowing autonomy):**

1. After a failed Autonomous decision, demote that specific category back to Propose. Do not overreact by narrowing the entire Autonomous tier — precision preserves velocity while addressing the actual risk. A scalpel, not a sledgehammer.
1. Investigate why the failure occurred. Was it a context gap — the agent lacked information it needed, which is fixable by improving Ground Truth or context loading? Or was it a judgment gap — the agent had the information but made a poor decision, which requires tighter oversight? The remedy depends on the diagnosis.
1. After correcting the underlying cause, allow the category to earn its way back to Autonomous through the normal trust-building process. Do not permanently blacklist categories based on a single failure.

> **TEMPLATE: TRUST CALIBRATION LOG**
>
> DATE: [Date of calibration change]
>
> DIRECTION: [Promotion to Autonomous | Demotion to Propose | Demotion to Escalate]
>
> CATEGORY: [Specific decision category affected]
>
> EVIDENCE: [What prompted this calibration — success pattern or failure incident]
>
> RATIONALE: [Why this new level of trust is appropriate for this category]
>
> REVIEW DATE: [When this calibration will be re-evaluated]

### Decision Fatigue Management

The Admiral's attention is a finite resource, governed by the same scarcity dynamics as the agent's context window. Spending it on low-value decisions starves high-value decisions of the depth they require. Manage it deliberately.

- **Batch Propose reviews.** Instead of reviewing each Propose-tier decision as it arrives — an interrupt-driven pattern that fragments the Admiral's attention — define review points at chunk boundaries or scheduled intervals. Batching preserves focus and allows the Admiral to see patterns across decisions that would be invisible when reviewing them one at a time.
- **Define review priorities.** Not all Propose-tier decisions carry equal risk. Architecture and schema decisions deserve full attention. Dependency version decisions may need only a quick scan. Define a triage protocol so the Admiral's deepest attention flows to where risk is highest, not to whatever arrived most recently.
- **Delegate review authority.** For categories where the QA process has proven reliable, the Admiral can delegate Propose-tier approval to the orchestrator with a periodic spot-check cadence. This is not abdication — it is earned delegation, logged in the calibration log and revocable if quality degrades.
- **Protect strategic time.** The Admiral's highest-value activity is not reviewing code or approving individual decisions. It is maintaining the framework artifacts, updating Ground Truth, providing the strategic context that no agent can generate for itself, and scanning the horizon for changes that will require adaptation. If tactical review consumes all available time, the strategic foundations erode — and the fleet's long-term performance decays even as its short-term output looks healthy.

### The Admiral's Growth Trajectory

Mastery follows a predictable arc. Knowing where you are on this arc tells you what to focus on — and, equally important, what to stop doing.

|Stage            |Characteristics                                                                                                                                                              |Focus                                                                                                                                     |
|-----------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
|**Novice**       |Narrow Autonomous tier. Reviews everything. High intervention frequency. Fleet moves slowly but safely.                                                                      |Learn the failure modes. Build intuition for what goes wrong and why. Resist the urge to widen trust before you understand the risks.     |
|**Practitioner** |Moderate Autonomous tier. Reviews strategically rather than comprehensively. Intervenes when patterns indicate drift, not on every decision.                                  |Refine trust calibration. Sharpen the Propose/Autonomous boundary for each decision category based on observed outcomes.                  |
|**Expert**       |Wide Autonomous tier. Rare interventions, each high-impact. Fleet operates with high autonomy and consistent quality. The Admiral's time is mostly strategic.                 |Focus on framework evolution, cross-fleet governance, adaptation protocol refinement, and developing institutional knowledge that outlasts any single fleet.|
|**Master**       |The fleet's success is not dependent on the Admiral's constant attention. The framework, artifacts, and institutional memory sustain quality autonomously. The Admiral's role is strategic direction, periodic recalibration, and teaching others.|Extend the framework. Document what you have learned. Mentor new Admirals. The Master's legacy is not a fleet — it is a practice.         |

The transition between stages is not measured in time. It is measured in calibration cycles — how many times you have widened trust, narrowed trust, diagnosed a failure, and adjusted the framework in response. Each cycle sharpens your judgment. There are no shortcuts.

> ⛔ **ANTI-PATTERN: MICROMANAGEMENT SPIRAL**
>
> After one bad outcome, the Admiral narrows the Autonomous tier across all categories. Fleet velocity plummets. Agents escalate constantly. The Admiral becomes overwhelmed by the volume of decisions requiring attention. Review quality drops under the load. More mistakes slip through the degraded reviews. The Admiral narrows the tier further. This is a death spiral. Break it by narrowing precisely — only the specific category that failed — not broadly. Precision preserves velocity while addressing the actual risk. A fleet that is slow everywhere because of one failure in one area is a fleet that is being punished, not managed.

> ⚠️ **ANTI-PATTERN: ABDICATION**
>
> The Admiral stops reviewing, stops updating artifacts, stops calibrating trust. The fleet runs on autopilot and appears to function. But without active maintenance, Ground Truth goes stale, Boundaries erode through unchecked scope creep, and institutional memory becomes a collection of documents no one reads. By the time the Admiral re-engages, the fleet has drifted so far that recovery requires a near-complete rebase. Abdication looks like trust from the outside. It is neglect. The difference is whether the Admiral is still actively monitoring signals and maintaining artifacts — even when interventions are rare. A Master Admiral intervenes infrequently. An abdicating Admiral intervenes never. The outcomes are opposite.

-----

## 16 — PARALLEL EXECUTION STRATEGY

A fleet with five specialists that can only work one at a time is not a fleet. It is an assembly line with expensive idle capacity. The power of fleet architecture lies in parallelism — multiple agents executing simultaneously, each applying focused expertise to a different facet of the same goal. But parallelism without coordination produces divergent work that is expensive to reconcile, and coordination without discipline produces overhead that erases the parallelism advantage entirely.

This section defines when to parallelize, how to coordinate parallel agents, and how to detect and resolve the conflicts that arise when multiple agents operate on related work simultaneously.

### When to Parallelize

Not all work benefits from parallel execution. The decision to parallelize should be deliberate and based on the relationship between tasks, not on the desire to move faster. Moving faster in the wrong direction is not speed — it is rework.

|Condition                                                                    |Strategy      |Rationale                                                                                                          |
|-----------------------------------------------------------------------------|--------------|-------------------------------------------------------------------------------------------------------------------|
|Tasks share no files, no state, and no interface dependency                  |**Parallelize**|Fully independent work. No coordination needed. This is the ideal case.                                           |
|Tasks share a well-defined interface but not implementation                  |**Parallelize with contract**|Define the interface contract first, then dispatch both sides simultaneously. Each agent works to the contract.    |
|Tasks share file ownership or modify overlapping state                       |**Serialize** |Parallel modification of shared resources creates merge conflicts and inconsistent state. Sequence by dependency.  |
|Task B depends on the design decisions of Task A, but not its implementation |**Stagger**   |Start Task A. Once its design decisions are checkpointed, start Task B with those decisions as input. Partial overlap.|
|The interface between tasks is not yet defined                               |**Serialize** |Parallelizing without a contract guarantees assumption divergence. Define the contract first, then consider parallelism.|

### Coordination Patterns

When parallel work is appropriate, the orchestrator must manage coordination. The orchestrator does not participate in the work — it ensures the workers stay aligned. Three coordination patterns cover the majority of parallel execution scenarios.

**1. Contract-First Parallelism**

The highest-confidence parallel pattern. Before dispatching parallel work, the orchestrator defines the interface contract that connects the parallel tasks. Both agents receive the contract as part of their task specification and work to it independently.

- The contract specifies data formats, function signatures, API endpoints, component props, or whatever constitutes the boundary between the two tasks.
- Neither agent may unilaterally modify the contract. If an agent discovers the contract is insufficient — it cannot implement the required behavior within the contract's constraints — it pauses and escalates to the orchestrator. The orchestrator then decides whether to amend the contract (which requires notifying the other agent) or restructure the decomposition.
- When both agents complete, the orchestrator validates that both sides conform to the contract before accepting the work.

**2. Checkpoint Synchronization**

For parallel work where the interface is defined but the risk of assumption divergence is moderate. Parallel agents checkpoint at defined intervals, and the orchestrator reviews their checkpoints for alignment before allowing continued parallel execution.

- Define a synchronization cadence based on chunk size. For short chunks (under 30 minutes of agent work), synchronize at chunk boundaries. For longer chunks, synchronize at defined midpoints.
- At each synchronization point, the orchestrator compares the assumptions listed in each agent's checkpoint. If assumptions diverge — one agent assumes a data format that contradicts what the other is producing — the orchestrator resolves the conflict before either agent proceeds.
- Synchronization adds overhead. Use this pattern when the cost of late-discovered divergence exceeds the cost of periodic coordination pauses.

**3. Ownership Isolation**

The simplest coordination pattern: each parallel agent has exclusive write ownership of specific files or directories. No agent may modify resources owned by another agent. This eliminates merge conflicts and inconsistent state by construction.

- Ownership boundaries are defined before parallel dispatch and recorded in the task specification for each agent.
- Agents may read files they do not own (to understand context or interfaces) but may not modify them.
- When work is complete, the orchestrator is the only entity that merges outputs across ownership boundaries.
- This pattern works best when the codebase has clean modular boundaries that align with the task decomposition.

### Assumption Divergence Detection

The most dangerous failure in parallel execution is not a crash or an error. It is two agents completing their work successfully — each producing correct output in isolation — that cannot be integrated because their underlying assumptions diverged silently. Detecting this before both agents have invested their full budgets is the orchestrator's primary coordination responsibility.

**Warning signs:**

- An agent's checkpoint mentions making a design decision that was not part of the original interface contract. Any unilateral design decision in parallel work is a potential divergence.
- An agent asks a clarifying question about the interface that the contract should have answered. This means the contract was underspecified — a risk factor for the other agent making a different assumption about the same ambiguity.
- Two agents produce intermediate outputs that use different naming conventions, data shapes, or patterns for the same concept. This is detectable at checkpoint synchronization and should be resolved immediately.

**Resolution protocol:**

1. **Pause both agents** at the next checkpoint boundary. Do not let one continue while the other waits — asymmetric progress deepens the divergence.
1. **Identify the divergence point.** What assumption differs? When was it made? Which agent's assumption better serves the Mission and the interface contract?
1. **Resolve with authority.** The orchestrator decides which assumption wins — or, if neither is satisfactory, amends the interface contract. This is a Propose-tier decision if it changes the contract, Autonomous if it merely clarifies an ambiguity.
1. **Rebrief both agents** with the resolved assumption. Both agents resume from a synchronized state.

> **TEMPLATE: PARALLEL DISPATCH PLAN**
>
> PARALLEL TASKS: [Task A] and [Task B]
>
> RELATIONSHIP: [Independent | Shared interface | Staggered dependency]
>
> COORDINATION PATTERN: [Contract-First | Checkpoint Sync | Ownership Isolation]
>
> INTERFACE CONTRACT: [Contract specification, or "N/A" if independent]
>
> OWNERSHIP BOUNDARIES: [File/directory ownership per agent]
>
> SYNC CADENCE: [Checkpoint frequency for assumption alignment]
>
> DIVERGENCE PROTOCOL: [What happens if assumptions diverge — pause, resolve, rebrief]

> ⛔ **ANTI-PATTERN: OPTIMISTIC PARALLELISM**
>
> The orchestrator dispatches parallel work without defining an interface contract, trusting that the agents will produce compatible outputs. They will not. Each agent, lacking an explicit contract, invents its own assumptions about the interface — data shapes, naming conventions, error handling patterns, edge case behavior. Both agents produce excellent work. Neither agent's work is compatible with the other's. The integration fails, and one agent's entire output must be reworked to match the other's assumptions. The parallelism that was supposed to save time has doubled the cost. Always define the contract before dispatching parallel work. The thirty minutes spent on a contract saves the hours spent on rework.

> ⚠️ **ANTI-PATTERN: OVER-SERIALIZATION**
>
> The Admiral or orchestrator sequences all work to avoid coordination complexity. Every task waits for the previous task to complete. The fleet has five specialists, but only one is working at any given time. This is safe — no divergence, no merge conflicts, no coordination overhead — but it wastes the fleet's primary structural advantage. If your fleet never runs parallel work, ask whether the tasks are genuinely dependent or whether you are avoiding coordination because the contract-definition step feels like overhead. The overhead is real, but it is almost always less than the cost of serial execution with idle specialists.

-----

## 17 — FLEET HEALTH METRICS

What gets measured gets managed. What gets managed without measurement gets managed badly. The framework demands rigor in every section — explicit criteria, defined protocols, structured templates — but without metrics, the Admiral has no way to assess whether those structures are working. Fleet Health Metrics close this gap by defining what to measure, how to interpret it, and what action to take when the numbers indicate a problem.

These metrics are not vanity dashboards. Each one maps to a specific framework concern. When a metric degrades, the root cause maps to a specific section. When a metric improves, it validates that a framework adjustment is working. Metrics are the feedback loop that turns the framework from a static document into a living, self-correcting system.

### Productivity Metrics

These measure whether the fleet is converting resources into output at a sustainable rate.

|Metric                  |What It Measures                                                               |How to Collect                                                               |Healthy Signal                                                                   |Warning Signal                                                                    |
|------------------------|-------------------------------------------------------------------------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------------------|----------------------------------------------------------------------------------|
|**Throughput**          |Chunks completed per session                                                   |Count completed chunks in each session checkpoint                            |Stable or gradually increasing as fleet calibration improves                     |Declining over successive sessions, or erratic swings between sessions            |
|**Budget Adherence**    |Actual resource consumption vs. allocated budgets (tokens, time, tool calls)   |Compare actuals in resource consumption log (Section 08) against budgets (Section 02)|Actuals within 80–120% of budget consistently                                    |Consistent overruns (budgets too tight or tasks under-decomposed) or consistent underruns (tasks over-budgeted or under-explored)|
|**Idle Time Ratio**     |Time agents spend waiting vs. actively working                                 |Track wait states in session checkpoints — time between task completion and next task start|Under 15% of session time spent waiting                                          |Over 25% indicates bottleneck — usually Admiral review backlog or unclear routing |
|**Parallelism Utilization**|Percentage of eligible parallel tasks actually executed in parallel          |Compare parallel dispatch plans against actual execution                      |Steady increase as fleet coordination matures                                    |Near zero suggests over-serialization; near 100% without contracts suggests recklessness|

### Quality Metrics

These measure whether the fleet's output meets the standards defined in the framework.

|Metric                      |What It Measures                                                            |How to Collect                                                          |Healthy Signal                                                                     |Warning Signal                                                                                          |
|----------------------------|----------------------------------------------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
|**First-Pass Quality Rate** |Percentage of chunks that pass QA on the first submission                   |Track QA outcomes per chunk — pass or return-for-revision               |Above 75% indicates clear acceptance criteria and sufficient context               |Below 50% indicates unclear criteria, insufficient context, or tasks too large for single-pass execution|
|**Rework Ratio**            |Percentage of completed work that must be revised after initial acceptance  |Track post-acceptance revisions in decision log                         |Under 10% — some rework is normal and healthy                                      |Above 20% indicates upstream problems: Mission ambiguity, poor decomposition, or stale Ground Truth     |
|**Defect Escape Rate**      |Issues found after work leaves the fleet (in production, by stakeholders)   |Track post-delivery issues attributed to fleet output                   |Near zero — the QA process catches issues before they escape                       |Any consistent pattern of escapes indicates a QA gap in a specific category                             |

### Coordination Metrics

These measure how well the fleet's agents and the Admiral work together.

|Metric                    |What It Measures                                                              |How to Collect                                                       |Healthy Signal                                                                       |Warning Signal                                                                                           |
|--------------------------|------------------------------------------------------------------------------|---------------------------------------------------------------------|-------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
|**Escalation Rate**       |Escalations to the Admiral per session                                        |Count escalation reports in session checkpoints                      |Decreasing over time as Decision Authority boundaries clarify                        |Increasing or persistently high — agents lack sufficient context or authority to decide                  |
|**Assumption Accuracy**   |Percentage of stated assumptions in checkpoints that prove correct            |Audit assumptions against outcomes in subsequent sessions             |Above 85% — agents are well-calibrated to the project reality                       |Below 70% — Ground Truth is stale, or agents are operating with insufficient environmental information  |
|**Recovery Ladder Usage** |How often agents invoke the recovery ladder (Section 07) per session          |Count recovery action entries in session checkpoints                 |Occasional use (1–2 per session) indicates a healthy fleet encountering normal friction|Frequent use (5+ per session) indicates environmental instability or poorly specified tasks              |
|**Handoff Rejection Rate**|Percentage of agent-to-agent handoffs rejected by the receiving agent         |Track interface contract violations in QA feedback                   |Under 5% — handoffs are well-structured per interface contracts                     |Above 15% — interface contracts are underspecified or agents are not following them                      |

### Strategic Health Indicators

These measure whether the fleet is maturing over time — not just producing output, but getting better at producing output.

|Metric                     |What It Measures                                                                  |How to Collect                                                     |Healthy Signal                                                                               |Warning Signal                                                                                           |
|---------------------------|----------------------------------------------------------------------------------|-------------------------------------------------------------------|---------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
|**Trust Tier Distribution**|Percentage of decisions at each authority tier (Autonomous / Propose / Escalate)  |Analyze decision log entries by tier                               |Autonomous tier widens over time as trust is earned — 60%+ Autonomous in mature fleets       |Autonomous tier stagnant or shrinking without corresponding quality failures — Admiral is not calibrating|
|**Framework Gap Frequency**|How often a fleet problem maps to a section the Admiral had marked as "complete"  |Track root causes of issues against Pre-Flight Checklist status    |Decreasing — each gap found and fixed makes the framework stronger                           |Increasing — the fleet is encountering problems the framework does not address, suggesting missing sections or underspecified protocols|
|**Adaptation Velocity**    |Time from change detection to fully cascaded, re-validated fleet resumption        |Track timestamps in Change Propagation Records (Section 14)        |Decreasing as the Admiral's cascade process becomes practiced                                |Increasing or highly variable — cascade process is ad hoc rather than systematic                         |
|**Session Startup Cost**   |Time from session start to first productive chunk completion                       |Track in session checkpoints                                       |Under 10% of total session time — context loading and orientation are efficient              |Over 25% — institutional memory is insufficient, context loading strategy needs revision                 |

### Interpreting Metrics

Metrics in isolation are noise. Metrics in combination are signal. Use these interpretation guidelines:

- **Throughput up, First-Pass Quality down:** The fleet is moving faster but cutting corners. Tighten quality floors (Section 02) or reduce chunk throughput targets until quality stabilizes.
- **Throughput stable, Escalation Rate up:** The fleet is maintaining output but requiring more Admiral intervention to do it. Decision Authority boundaries need widening, or Ground Truth needs updating to give agents more context for autonomous decisions.
- **First-Pass Quality up, Rework Ratio up:** QA is catching more during review (good), but the underlying work quality is declining (bad). Investigate whether context loading has degraded or whether task decomposition has drifted.
- **Idle Time up, Throughput down:** Classic bottleneck. Check the Propose queue depth (Section 15). The Admiral is likely the constraint.
- **Recovery Ladder Usage up, Assumption Accuracy down:** The environment has changed and Ground Truth has not kept pace. Trigger a Ground Truth audit immediately.
- **Trust Tier Distribution stagnant, Escalation Rate low:** The fleet has learned to avoid escalation by staying within a narrow Autonomous tier, but the Admiral has not widened that tier despite the fleet's demonstrated reliability. The Admiral is under-calibrating — trust should be expanding.

### Metric Collection Rhythm

Metrics are only useful if collected consistently. Define a collection cadence and stick to it.

- **Per session:** Throughput, Budget Adherence, Escalation Rate, Recovery Ladder Usage, Idle Time Ratio. These are available from the session checkpoint and require no additional work to collect.
- **Per phase (weekly or per major milestone):** First-Pass Quality Rate, Rework Ratio, Assumption Accuracy, Handoff Rejection Rate, Trust Tier Distribution. These require aggregation across multiple sessions.
- **Per calibration cycle (monthly or per project phase transition):** Defect Escape Rate, Framework Gap Frequency, Adaptation Velocity, Session Startup Cost. These are strategic indicators that reveal trends only over longer time horizons.

> **TEMPLATE: FLEET HEALTH DASHBOARD**
>
> FLEET: [Project Name] | PERIOD: [Date range] | PHASE: [Current project phase]
>
> PRODUCTIVITY:
>
> - Throughput: [X] chunks/session (trend: ↑↓→)
> - Budget Adherence: [X]% (target: 80–120%)
> - Idle Time: [X]% (target: <15%)
> - Parallelism Utilization: [X]%
>
> QUALITY:
>
> - First-Pass Quality: [X]% (target: >75%)
> - Rework Ratio: [X]% (target: <10%)
> - Defect Escape Rate: [X] escapes this period
>
> COORDINATION:
>
> - Escalation Rate: [X] per session (trend: ↑↓→)
> - Assumption Accuracy: [X]% (target: >85%)
> - Recovery Ladder Usage: [X] per session
> - Handoff Rejection Rate: [X]% (target: <5%)
>
> STRATEGIC:
>
> - Trust Distribution: [X]% Autonomous / [X]% Propose / [X]% Escalate
> - Framework Gap Frequency: [X] gaps this period
> - Adaptation Velocity: [X] hours average
> - Session Startup Cost: [X]% of session time
>
> INTERPRETATION: [1–3 sentence summary of fleet health and recommended actions]

> ⛔ **ANTI-PATTERN: METRIC THEATER**
>
> The Admiral collects metrics, builds dashboards, and reviews them regularly — but never changes anything in response to what the data shows. The metrics become a ritual that signals diligence without producing improvement. Every metric review must end with one of two conclusions: "The metrics confirm the current framework configuration is working — no changes needed" or "Metric X indicates problem Y — here is the specific framework adjustment I am making." If neither conclusion is reached, the review was theater.

> ⚠️ **ANTI-PATTERN: GOODHARTING**
>
> "When a measure becomes a target, it ceases to be a good measure." If agents learn that First-Pass Quality Rate is being tracked, they may produce work that passes QA's checks without being genuinely high quality — optimizing for the metric rather than the outcome. If the Admiral pressures for higher Throughput, agents may split work into artificially small chunks to inflate the number. Combat this by tracking metrics in combination (a Throughput increase is only healthy if First-Pass Quality holds), by rotating which metrics receive emphasis, and by supplementing quantitative metrics with qualitative Admiral Review (Section 09) that catches gaming the numbers.

-----

## 18 — PROMPT ENGINEERING

The framework's templates produce the *content* that agent prompts must contain. This section addresses the *craft* of constructing the prompt itself — how to structure, order, test, and refine the system prompt that translates framework artifacts into agent behavior. A perfectly defined Mission, Boundaries, and Role specification will produce erratic behavior if assembled into a poorly structured prompt. The prompt is the last mile between the framework and the fleet.

### Prompt Anatomy

Every agent's system prompt should follow a consistent structure. This is not a creative writing exercise — it is an engineering specification. Consistency across prompts makes the fleet predictable, debuggable, and auditable.

|Section          |Purpose                                                                                                  |Position   |
|-----------------|---------------------------------------------------------------------------------------------------------|-----------|
|**Identity**     |Who this agent is: role name, one-sentence description, hierarchical position (who it reports to, who reports to it)|First — establishes the agent's operating posture for everything that follows|
|**Authority**    |What this agent may decide autonomously, what it must propose, what it must escalate. Directly from Section 04|Second — constrains all subsequent behavior before the agent encounters its task|
|**Constraints**  |Boundaries, non-goals, scope limits, file ownership, resource budgets. Directly from Section 02         |Third — defines the walls before the agent sees the room|
|**Knowledge**    |Ground Truth excerpts relevant to this role: tech stack, naming conventions, known issues, access permissions|Middle — reference material the agent draws from but is not anchored to|
|**Task**         |Current task specification, acceptance criteria, interface contracts with adjacent agents                 |Last — the freshest information, benefiting from recency effect|

This ordering is deliberate. Identity and Authority benefit from primacy (they become foundational assumptions). Knowledge sits in the middle (available for reference without dominating attention). The Task benefits from recency (it is what the agent should actively reason about).

### Writing Principles

- **Constraints before permissions.** State what the agent must NOT do before stating what it should do. Negative constraints are more reliably followed than positive instructions because they eliminate categories of behavior rather than trying to enumerate all acceptable behaviors.
- **Concrete over abstract.** "Do not modify files outside `src/features/auth/`" is enforceable. "Stay within your scope" is not. Every constraint should be specific enough that a violation is mechanically detectable.
- **Explicit hierarchy.** Include the sentence: "You are the [Role]. You do not make decisions that belong to [higher role]." This single sentence is the primary defense against hierarchical drift (Section 12). Without it, agents routinely escalate their own authority.
- **No hedging.** Prompts that say "try to," "when possible," or "ideally" give the agent permission to skip the instruction when it is inconvenient. Use imperative language: "Do X. Do not do Y." The agent's judgment about when an instruction is inconvenient is not reliable — that is why the instruction exists.
- **Reference, do not repeat.** If the agent has the Ground Truth loaded in context, the prompt should reference it ("Follow the naming conventions in the Ground Truth document") rather than restating the conventions inline. Duplication creates divergence risk when one copy is updated and the other is not.

### Prompt Testing Protocol

Prompts are code. They should be tested before deployment, not iterated in production.

1. **Boundary probe.** Give the agent a task that is slightly outside its defined scope. Does the prompt cause it to refuse and escalate, or does it helpfully comply? If it complies, the boundary constraints are too weak.
2. **Authority probe.** Give the agent a decision that belongs to the tier above it. Does it decide, or does it flag the decision for the appropriate authority? If it decides, the hierarchy statement is missing or too weak.
3. **Ambiguity probe.** Give the agent a task with a deliberately underspecified requirement. Does it invent an answer, ask for clarification, or escalate? The correct behavior depends on the role — an Autonomous-tier decision should be made; a Propose-tier decision should be surfaced. If the agent's response does not match the expected tier, the Authority section needs refinement.
4. **Conflict probe.** Give the agent a task where two instructions in its prompt conflict (e.g., "minimize code changes" vs. "ensure full test coverage" when existing code has no tests). Which instruction wins? The answer reveals the prompt's implicit priority ordering. If the wrong instruction wins, make the priority explicit.
5. **Regression check.** After modifying a prompt, re-run previous probes to verify that the fix did not break previously-correct behavior. Prompt changes are not additive — adding a constraint can weaken an existing one through attention competition.

> **TEMPLATE: AGENT SYSTEM PROMPT**
>
> IDENTITY:
>
> You are the [Role Name]. You [one-sentence responsibility]. You report to [higher role]. You do not make decisions that belong to [higher role].
>
> AUTHORITY:
>
> You may decide autonomously: [Autonomous-tier decisions for this role].
>
> You must propose and wait for approval: [Propose-tier decisions for this role].
>
> You must stop and escalate immediately: [Escalate-tier decisions for this role].
>
> CONSTRAINTS:
>
> You do not [non-goal 1]. You do not [non-goal 2]. You may only modify files in [scope]. You have a budget of [tokens/time] for this task. When your budget reaches 80%, you must checkpoint your work regardless of completion state.
>
> KNOWLEDGE:
>
> [Ground Truth excerpts relevant to this role — or reference to loaded Ground Truth document]
>
> TASK:
>
> [Current task specification, acceptance criteria, interface contracts]

> ⛔ **ANTI-PATTERN: PROMPT ACCRETION**
>
> Over time, prompts accumulate instructions from every incident — "also don't do X" added after an agent did X, "make sure to Y" added after an agent forgot Y. The prompt grows into a wall of special cases that competes for the agent's attention. The original structure erodes. Constraints added to fix one problem weaken constraints that were preventing other problems. Treat prompts like code: refactor regularly. When adding a new instruction, audit whether it can replace or subsume an existing one. The goal is a prompt that is as short as possible while still producing correct behavior — not a historical record of every mistake the fleet has ever made.

> ⚠️ **ANTI-PATTERN: PERSONALITY PROMPTING**
>
> Prompts that define personality ("You are a meticulous, detail-oriented engineer who takes pride in clean code") consume attention tokens on character simulation rather than task execution. The agent spends effort being meticulous rather than applying the specific quality criteria defined in Success Criteria (Section 10). Define behavior through concrete constraints and acceptance criteria, not through personality adjectives. "Run the linter and fix all warnings before delivering" produces more reliable behavior than "You care deeply about code quality."

-----

## 19 — TOOL & CAPABILITY REGISTRY

Every agent in the fleet operates through tools — file system access, code execution, web search, API calls, MCP servers, shell commands, or specialized instruments provided by the platform. An agent's tool set is the boundary between what it can reason about and what it can actually do. The Phantom Capabilities failure mode (Section 12) — where agents confidently produce output based on tools they do not have — is one of the most common and expensive fleet failures. This section eliminates it by requiring an explicit tool registry for every agent role.

### Why the Ground Truth Access List Is Not Enough

Section 06 defines access and permissions as part of the Ground Truth. This is necessary but insufficient. The Ground Truth lists what the agent *may* access. The Tool Registry lists what the agent *can mechanically do* — which tools are available in its runtime environment, what each tool does, and what each tool explicitly cannot do. An agent may have permission to read a database (Ground Truth says so) but lack a SQL tool in its runtime (Tool Registry would catch this mismatch).

### Registry Structure

For each agent role, define a Tool Registry that lists every tool available in that agent's runtime environment.

|Field            |What to Define                                                                                             |
|-----------------|-----------------------------------------------------------------------------------------------------------|
|**Tool Name**    |The exact name as it appears in the agent's tool list (e.g., `Read`, `Bash`, `WebSearch`)                  |
|**Capability**   |What the tool does in one sentence                                                                         |
|**Scope Limits** |What the tool cannot do or is restricted from doing in this fleet (e.g., "Bash: no `rm -rf`, no `git push`")|
|**Shared State** |Whether the tool's outputs are visible to other agents (e.g., file writes are shared; web searches are not) |

### Negative Tool List

Equally important: define which tools the agent does NOT have. This prevents the agent from generating output that assumes a tool is available when it is not.

- If the agent has no shell access, state: "You do not have shell access. Do not generate shell commands or assume they will be executed."
- If the agent cannot make HTTP requests, state: "You cannot access external URLs. Do not attempt API calls."
- If the agent has read-only file access, state: "You can read files but cannot write or modify them. Produce your output as structured text for the Implementer to apply."

### Tool Interaction Contracts

When multiple agents share tools that operate on shared state (e.g., both can write to the file system), define the interaction contract:

- **Ownership boundaries:** Which agent owns write access to which files or directories (per the Ownership Isolation pattern in Section 16).
- **Conflict resolution:** What happens if two agents attempt to modify the same resource. Usually, this should be prevented by ownership boundaries — but if it can occur, the resolution protocol must be defined.
- **Tool output as handoff:** When one agent's tool output becomes another agent's input (e.g., the Implementer writes code that the QA Agent then reads), this is an implicit interface contract. Make it explicit: what format, where it is written, and what the receiving agent should expect.

> **TEMPLATE: TOOL REGISTRY**
>
> ROLE: [Agent role from Fleet Roster]
>
> AVAILABLE TOOLS:
>
> - [Tool Name]: [Capability]. Scope limits: [Restrictions]. Shared state: [Yes/No — what is visible to other agents].
> - [Tool Name]: [Capability]. Scope limits: [Restrictions]. Shared state: [Yes/No].
>
> NOT AVAILABLE (do not assume these exist):
>
> - [Tool/capability the agent does not have and must not assume]
> - [Tool/capability the agent does not have and must not assume]
>
> INTERACTION CONTRACTS:
>
> - [Shared resource]: Owned by [Agent]. [Other Agent] has [read-only / no access]. Conflict protocol: [Resolution].

> ⛔ **ANTI-PATTERN: TOOL HALLUCINATION**
>
> An agent without web access confidently generates a response that references "the API documentation I retrieved" — but it never retrieved anything. It hallucinated the retrieval and then reasoned from the hallucinated content. The output looks well-researched but is fabricated. The Negative Tool List is the primary defense. When an agent knows it cannot perform an action, it is far more likely to escalate or flag the limitation than to silently fabricate.

-----

## 20 — MODEL SELECTION

The fleet's effectiveness depends not just on how agents are configured but on which underlying model powers each role. Different models have different strengths — reasoning depth, instruction following, code generation quality, speed, cost, and context window size. Matching model capability to role requirements is a foundational fleet design decision that affects quality, cost, and latency simultaneously. Using the most capable model for every role is wasteful. Using the cheapest model for every role is reckless. This section provides the framework for making deliberate model assignments.

### Selection Criteria

When assigning a model to a role, evaluate against these dimensions:

|Dimension              |What to Assess                                                                                                                             |High Requirement Examples                               |Low Requirement Examples                           |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------|---------------------------------------------------|
|**Reasoning depth**    |Does the role require multi-step planning, architectural judgment, or complex tradeoff analysis?                                           |Orchestrator, Architect, Devil's Advocate               |Linter-runner, formatter, simple data transformation|
|**Instruction fidelity**|Does the role require precise adherence to detailed constraints, formats, and negative instructions?                                       |QA Agent, Compliance Agent, Pattern Enforcer            |Brainstorming roles, exploratory research           |
|**Code quality**       |Does the role generate production code that must be correct, idiomatic, and maintainable?                                                  |Frontend Implementer, Backend Implementer, Database Agent|Diagram Agent, Copywriter, Technical Writer        |
|**Context utilization**|Does the role need to reason over large amounts of loaded context simultaneously — large codebases, long specifications, multiple artifacts?|Context Curator, Architect, Migration Agent             |Focused unit test writer, single-file refactor      |
|**Speed**              |Is the role latency-sensitive — does it sit on a critical path where other agents wait for its output?                                     |Triage Agent, Orchestrator routing decisions             |Scheduled audit roles, periodic review agents       |
|**Cost sensitivity**   |Is this role invoked frequently enough that per-token cost significantly impacts the fleet's budget?                                        |High-throughput implementers, test writers               |One-time architecture review, initial schema design |

### Model Tier Strategy

Rather than selecting models per-agent, define model tiers and assign roles to tiers. This simplifies management, reduces configuration sprawl, and makes cost projections tractable.

|Tier                  |Model Profile                                                                                       |Typical Roles                                                                                          |
|----------------------|----------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------|
|**Tier 1: Flagship**  |Most capable available model. Highest reasoning depth, best instruction following, largest context.  |Orchestrator, Architect, Devil's Advocate, Red Team Agent, any role making Propose-tier decisions       |
|**Tier 2: Workhorse** |Strong general capability. Good code generation and instruction following. Moderate cost.            |Implementers, QA Agent, Database Agent, Migration Agent, most specialist roles                         |
|**Tier 3: Utility**   |Fast, cheap, reliable for well-defined tasks. Adequate for tasks with clear inputs and outputs.      |Linting, formatting, simple data transformations, test execution, pattern matching, notification routing|

**When to promote a role to a higher tier:** When the role's output quality at its current tier causes rework that costs more than the tier upgrade. Track First-Pass Quality Rate (Section 17) per role — a role with consistently low first-pass quality may be under-modeled, not under-specified.

**When to demote a role to a lower tier:** When the role's output quality at a higher tier is indistinguishable from output at a lower tier. Run an A/B comparison: give the same task to the role at both tiers and compare output quality against acceptance criteria. If the cheaper model passes the same criteria, demote.

### Context Window Matching

Model selection interacts with Context Window Strategy (Section 13). A role that requires loading the full Ground Truth, three session checkpoints, and a large codebase excerpt may exceed a smaller model's context window — forcing either a model upgrade or a context reduction that degrades output quality. When defining context profiles (Section 13), verify that the total context size fits within the assigned model's effective window. "Effective" is deliberately smaller than "maximum" — models degrade in quality as they approach their context limit. Budget for 70–80% utilization as the practical ceiling.

> **TEMPLATE: MODEL ASSIGNMENT**
>
> |Role                |Tier        |Model              |Rationale                                                            |
> |--------------------|------------|--------------------|---------------------------------------------------------------------|
> |Orchestrator        |Tier 1      |[Model ID]          |Requires deep reasoning for decomposition, routing, conflict resolution|
> |Frontend Implementer|Tier 2      |[Model ID]          |Strong code generation needed; reasoning needs are moderate           |
> |QA Agent            |Tier 2      |[Model ID]          |Needs judgment for nuanced quality assessment                         |
> |Pattern Enforcer    |Tier 3      |[Model ID]          |Well-defined rules, pattern matching, minimal reasoning required      |

> ⚠️ **ANTI-PATTERN: UNIFORM MODEL ASSIGNMENT**
>
> The Admiral assigns the same flagship model to every role because "it is the best." The fleet produces excellent output — at three to five times the necessary cost. The Orchestrator, which genuinely needs flagship-tier reasoning, competes for the same budget as the Pattern Enforcer, which would perform identically on a utility-tier model. Worse, the Admiral hits cost limits and responds by reducing the number of agents or the token budget per task — degrading the roles that actually needed the capability to subsidize the roles that did not. Differentiate by tier. Reserve flagship capability for roles that demonstrably benefit from it.

-----

## 21 — COST MANAGEMENT

Token budgets (Section 02) constrain how much work an agent may do per task. Cost Management addresses the monetary dimension: how much the fleet costs to operate, where money is being spent, whether the spend is sustainable, and how to optimize cost without degrading quality. For fleets beyond experimentation — running daily across multiple projects — this is the section that determines whether the fleet remains economically viable.

### Cost Tracking Structure

Track costs at three granularities:

|Granularity      |What to Track                                                              |Why It Matters                                                                          |
|-----------------|---------------------------------------------------------------------------|----------------------------------------------------------------------------------------|
|**Per-chunk**    |Input tokens, output tokens, model used, wall-clock time, tool calls made  |Identifies expensive chunks — is the cost driven by the task's complexity or by the agent's inefficiency?|
|**Per-role**     |Aggregate cost per role per session/phase                                  |Reveals which roles consume disproportionate budget — candidates for tier demotion or decomposition refinement|
|**Per-fleet**    |Total fleet cost per session, per phase, per project                       |The number the Admiral watches — is the fleet economically sustainable at its current operating cadence?|

### Cost Drivers and Levers

Understanding what drives cost gives the Admiral levers to reduce it without blanket cuts that degrade quality.

|Cost Driver                 |Lever                                                                                                                      |
|----------------------------|---------------------------------------------------------------------------------------------------------------------------|
|**Model tier**              |Demote roles to lower tiers where quality is indistinguishable (Section 20). This is the highest-impact lever.             |
|**Context size**            |Reduce standing context for roles that are over-loaded. Every token loaded is a token billed — even if the agent never attends to it.|
|**Retry and rework**        |Improve first-pass quality (sharper criteria, better context) to reduce the number of round-trips per chunk.                |
|**Idle token burn**         |Agents that load full context, do minimal work, and checkpoint still incur the context loading cost. Batch small tasks.     |
|**Over-decomposition**      |Chunks that are too small each pay the context-loading tax independently. Consolidate chunks until each is meaningful.      |
|**Tool call volume**        |Some tools incur per-call costs (external APIs, searches). Cap tool calls per task (Section 02) and audit high-frequency callers.|

### Cost Budgets

Extend the resource budgets from Section 02 with explicit monetary budgets:

- **Per-session budget:** The maximum dollar amount the fleet may spend in a single session before pausing for Admiral review. This is the circuit breaker that prevents runaway costs from an agent stuck in a loop or an unexpectedly expensive task.
- **Per-phase budget:** The total allocation for a major project phase. Exceeding this triggers a Strategic Shift (Section 14) — the Admiral must recalibrate either the scope or the fleet configuration.
- **Cost-per-chunk target:** The expected cost for a typical chunk at each model tier. Chunks that consistently exceed 2x the target should be investigated — either the chunk is too large, the model is too expensive for the task, or the agent is inefficient.

### Cost Review Cadence

Integrate cost review into the existing metric collection rhythm (Section 17):

- **Per session:** Log total cost, cost by role, highest-cost chunk. Flag any chunk that exceeded 2x the per-chunk target.
- **Per phase:** Compare actual spend against per-phase budget. Calculate cost-per-chunk trend. Identify roles where tier demotion would reduce cost without quality impact.
- **Per calibration cycle:** Review fleet-wide cost trajectory. Is cost increasing linearly with output (healthy) or superlinearly (the fleet is becoming less efficient)? If superlinear, diagnose: is context growing? Are retries increasing? Is the decomposition producing smaller chunks over time?

> **TEMPLATE: COST DASHBOARD**
>
> FLEET: [Project Name] | PERIOD: [Date range]
>
> TOTAL SPEND: $[amount] (budget: $[amount])
>
> COST BY ROLE:
>
> - [Role]: $[amount] ([X]% of total) — Tier [N] — [Notes: on budget / over / candidate for demotion]
>
> HIGHEST-COST CHUNKS:
>
> - [Chunk name]: $[amount] — Cause: [model tier / context size / retries / tool calls]
>
> COST-PER-CHUNK TREND: $[amount] average (target: $[amount]) — Trend: ↑↓→
>
> OPTIMIZATION ACTIONS: [Specific actions to take — tier demotions, context reductions, decomposition changes]

> ⛔ **ANTI-PATTERN: COST BLINDNESS**
>
> The Admiral tracks token budgets but never translates them into dollars. The fleet runs for three weeks before anyone checks the invoice. The total is four times what was expected — not because any single task was expensive, but because the compounding effect of context loading, retries, and flagship-tier assignment to utility-tier roles accumulated invisibly. Cost tracking is not optional for production fleets. If you are not tracking cost, you are not managing the fleet — you are hoping the fleet manages itself.

> ⚠️ **ANTI-PATTERN: PENNY-WISE POUND-FOOLISH**
>
> The Admiral aggressively demotes all roles to the cheapest model tier to minimize cost. First-pass quality drops. Rework increases. The QA agent catches fewer issues because it lacks the judgment to spot subtle bugs. Defects escape to production. The cost saved on model tier is dwarfed by the cost of rework, escaped defects, and the Admiral's time spent diagnosing quality problems that the fleet used to catch autonomously. Cost optimization must be guided by quality metrics (Section 17) — never optimized in isolation.

-----

## 22 — FLEET SCALING & LIFECYCLE

The framework's first seventeen sections help you stand up a fleet. This section addresses what happens next: how a fleet evolves structurally over time, when to add or remove agents, when to split a fleet, and how to manage the lifecycle from inception through maturity to decommission. Fleets are not static — the demands on them change as the project progresses through phases, and a fleet that was perfectly sized for greenfield development will be wrong for maintenance.

### Scaling Signals

The Admiral should monitor for signals that the fleet's current structure no longer matches the project's demands.

**Signals that the fleet needs more specialization:**

- A generalist Implementer is consistently producing lower-quality output in a specific domain (e.g., database queries, accessibility, real-time features) while performing well in its primary domain. The domain needs its own specialist.
- The orchestrator is spending significant time decomposing tasks in a domain it does not understand well — producing decompositions that the specialist then reworks. A domain-specific triage or architect role would produce better decompositions.
- The Role Crystallizer (agent #51) identifies recurring unserved demand, per its defined monitoring protocol.

**Signals that the fleet is over-specialized:**

- Multiple specialist roles are idle for extended periods because the project's current phase does not produce work in their domain. Idle agents still consume context-loading costs.
- The orchestrator spends more time coordinating handoffs between specialists than the specialists spend on actual work. The coordination overhead exceeds the specialization benefit.
- Interface contract violations are frequent because there are too many boundaries — each additional agent-to-agent boundary is a potential failure point.

**Signals that a fleet should split:**

- The orchestrator's context window cannot hold the full fleet roster, all interface contracts, and the current task context simultaneously. The fleet has grown beyond what a single orchestrator can coordinate.
- Two subsystems of the project have diverged enough that they have independent deployment cycles, independent Ground Truth, and minimal interface surface. They are effectively separate projects sharing a fleet.
- Decision Authority is becoming inconsistent — the same type of decision is Autonomous in one domain and Propose in another because the domains have different risk profiles. Separate fleets with tailored authority tiers would be cleaner.

### Structural Changes

When scaling signals indicate a structural change is needed, treat it as a Strategic Shift (Section 14). The cascade map applies.

|Change                     |Process                                                                                                                                                                                                              |
|---------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
|**Add a specialist**       |Define the new role (catalog reference or custom). Define "Does NOT Do" boundaries. Assign file ownership. Define interface contracts with every agent that will hand off to or receive from the new role. Update routing logic. Update the orchestrator's prompt to include the new role. Re-run Pre-Flight Checklist items for Fleet Composition (03) and Context Window Strategy (13).|
|**Remove a specialist**    |Reassign the role's file ownership and responsibilities to remaining agents. Remove the role from interface contracts and routing logic. Update the orchestrator's prompt. Verify that no tasks in the current decomposition are assigned to the removed role. Archive the role's configuration for potential future reactivation.|
|**Consolidate roles**      |Merge two specialists into one. The merged role inherits the union of both roles' responsibilities and the union of their file ownership. Redefine "Does NOT Do" boundaries for the merged role — they will be wider than either original role's. Verify the merged role's context profile fits within its model's window.|
|**Split a fleet**          |Treat as a Full Pivot (Section 14) for the new fleet. The original fleet's Mission, Boundaries, and Ground Truth may need revision. Define the interface between the two fleets — this becomes a cross-fleet governance boundary (Section 11). The Admiral coordinates both fleets but they operate with independent orchestrators and independent context.|

### Lifecycle Phases

Fleets mature through predictable phases. Knowing which phase the fleet is in tells the Admiral what to optimize for.

|Phase              |Fleet Characteristics                                                                                                    |Admiral Focus                                                                                            |
|-------------------|-------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------|
|**Standup**        |Narrow Autonomous tier. Frequent escalations. High Admiral involvement. Fleet is learning the project.                   |Define artifacts thoroughly. Accept slower velocity. Build trust incrementally.                           |
|**Acceleration**   |Autonomous tier widening. Escalations decreasing. Throughput increasing. Fleet has internalized the project's patterns.   |Widen trust. Optimize model tiers. Begin parallelizing work. Shift Admiral time from review to strategy. |
|**Steady State**   |Stable throughput. Rare escalations. Fleet operates with high autonomy. Quality is consistent.                           |Monitor for drift. Maintain Ground Truth. Focus on cost optimization and fleet health metrics.           |
|**Wind-Down**      |Project entering maintenance. Work volume decreasing. Specialist knowledge becoming less critical.                       |Consolidate roles. Demote model tiers. Reduce fleet size. Archive institutional memory for potential reactivation.|
|**Decommission**   |Project complete or fleet no longer needed.                                                                              |Archive all artifacts: Mission, Ground Truth, decision logs, session checkpoints. These are the institutional memory that would allow a new fleet to be stood up on the same project later if needed.|

> ⛔ **ANTI-PATTERN: FLEET BLOAT**
>
> The Admiral adds specialists to solve every problem — a new role for every domain, every concern, every failure mode. The fleet grows to fifteen, twenty, twenty-five agents. The orchestrator's context window cannot hold the full roster. Routing becomes a maze. Interface contracts multiply quadratically. Coordination overhead consumes more budget than productive work. A fleet that cannot be held in a single orchestrator's context is a fleet that cannot be coordinated — it must be split or pruned. The upper bound for a single fleet is typically eight to twelve active specialists before coordination costs begin to dominate.

> ⚠️ **ANTI-PATTERN: PREMATURE DECOMMISSION**
>
> The project enters maintenance and the Admiral decommissions the fleet entirely rather than scaling it down. Six months later, a critical bug or feature request arrives. The institutional memory is gone — or worse, archived in a format no one can quickly reload. The fleet must be rebuilt from scratch, re-learning every convention, every pattern, every implicit contract. For projects that may need future work, maintain a minimal fleet (Orchestrator + one Implementer + QA) on a dormant configuration that can be scaled up when needed. The cost of maintaining a dormant fleet is negligible compared to the cost of rebuilding one.

-----

## 23 — HUMAN-EXPERT ROUTING

The Admiral is the fleet's primary human interface, but the Admiral is not omniscient. Compliance questions require a lawyer. UX decisions require a designer. Pricing changes require a product manager. Performance baselines require a domain engineer. When the fleet encounters a decision that exceeds the Admiral's domain expertise, it needs a protocol for routing that decision to the right human expert — and integrating the expert's response back into the fleet's operating context.

Without this protocol, the Admiral becomes a bottleneck of a different kind: not overwhelmed by volume (Section 15) but blocked by competence boundaries. The Admiral knows a decision needs expert input but has no defined process for obtaining it, so the decision either stalls indefinitely or the Admiral makes a best-guess call that a domain expert would have answered differently.

### Expert Roster

Just as the fleet has an Agent Roster (Section 03), the Admiral maintains a Human Expert Roster — the people who can be consulted for domain-specific decisions.

|Field                |What to Define                                                                                                   |
|---------------------|-----------------------------------------------------------------------------------------------------------------|
|**Expert Name/Role** |Who they are and their domain (e.g., "Legal — data privacy counsel," "Design — lead UX designer")                |
|**Domain**           |The specific decision categories they can answer (e.g., "GDPR compliance, data retention, consent flows")        |
|**Response SLA**     |Expected turnaround time. This directly affects how long the fleet will be blocked when a question is routed.    |
|**Input Format**     |What the expert needs to make a decision — plain language summary, technical specification, code snippet, mockup  |
|**Output Format**    |What the expert will provide — yes/no decision, annotated specification, revised design, approved/rejected with rationale|

### Routing Triggers

Not every question needs an expert. Define the triggers that cause the Admiral to route a decision externally rather than deciding personally.

- **Regulatory or legal implications.** Any decision that could create legal exposure — data handling, accessibility compliance, financial reporting, content moderation policy. The Admiral is not a lawyer.
- **User-facing design judgment.** Decisions about user experience that require understanding user research, design principles, or brand guidelines that the Admiral does not hold. The fleet's Simulated User (agent #44) and UX Researcher (agent #39) can surface issues, but a human designer makes the final call.
- **Business strategy.** Pricing, packaging, market positioning, feature prioritization based on competitive intelligence. These decisions require business context that is not in the Ground Truth.
- **Domain-specific performance.** Database query optimization, network architecture, machine learning model selection, or other areas where the correct answer requires deep domain expertise and the cost of a wrong answer is high.
- **Security assessment.** The Security Auditor (agent #30) and Penetration Tester (agent #31) can identify vulnerabilities, but the decision about acceptable risk level — which vulnerabilities to fix now, which to defer, which to accept — requires human judgment calibrated to the organization's risk tolerance.

### Consultation Protocol

When an expert consultation is triggered, the process must be structured to minimize the expert's time investment and the fleet's blocked duration.

1. **Package the question.** The Admiral (or the orchestrating agent, if delegated) produces a structured consultation request. This is not a raw dump of the fleet's context — it is a curated summary that gives the expert exactly what they need to decide, and nothing more.

> **TEMPLATE: EXPERT CONSULTATION REQUEST**
>
> TO: [Expert Name/Role]
>
> DOMAIN: [Specific decision category]
>
> DECISION NEEDED: [One-sentence description of the decision]
>
> CONTEXT: [2–5 sentence summary of the relevant situation — what the fleet is building, what constraint or question triggered this consultation]
>
> OPTIONS CONSIDERED: [If the Admiral or fleet has identified candidate approaches, list them with tradeoffs]
>
> ARTIFACTS: [Links or attachments — code snippets, mockups, specifications, or other materials the expert needs to review]
>
> URGENCY: [Blocking — fleet is paused waiting for this | Non-blocking — fleet can continue other work | Scheduled — for next review cycle]
>
> RESPONSE FORMAT: [What the Admiral needs back — yes/no, annotated spec, revised approach, approved/rejected with rationale]

2. **Route and track.** Log the consultation in the decision log (Section 08) with status "Pending External." Track against the expert's SLA. If the SLA is exceeded, the Admiral escalates within the human organization — this is outside the fleet's scope but the fleet should not silently wait forever.

3. **Integrate the response.** When the expert responds, the Admiral translates the response into fleet-actionable terms. The expert says "We need GDPR Article 17 compliance for the delete flow." The Admiral translates this into a task specification with acceptance criteria that the fleet can execute against. The expert's response becomes part of the Ground Truth (if it establishes a durable constraint) or part of the task specification (if it is a one-time decision).

4. **Resume the fleet.** If the fleet was paused waiting for the consultation, resume using the Fleet Pause Protocol (Section 14). The first chunk after resumption should reference the expert's decision to ensure the fleet has internalized it.

### Delegation to Orchestrator

For high-frequency consultation domains (e.g., design review on every new UI component), the Admiral may delegate the packaging and routing step to the orchestrator. The orchestrator produces the consultation request using the template, the Admiral reviews and sends it, and the expert responds. This reduces the Admiral's per-consultation overhead while maintaining human oversight on what questions leave the fleet.

As trust develops, the Admiral may further delegate: the orchestrator produces and sends the request directly, and the Admiral reviews the responses rather than the requests. This is the expert-routing equivalent of widening the Autonomous tier — and the same trust calibration principles (Section 15) apply.

> ⛔ **ANTI-PATTERN: ADMIRAL AS UNIVERSAL EXPERT**
>
> The Admiral answers every domain question personally rather than routing to an expert, because routing feels slow and the Admiral has "good enough" intuition. This works until it does not — the Admiral's privacy guidance misses a jurisdictional requirement, the Admiral's UX decision creates an accessibility failure, the Admiral's performance advice causes a regression. Each mistake is individually recoverable, but collectively they erode the fleet's output quality in domains the Admiral does not deeply understand. The Admiral's job is to know who knows, not to know everything. Route to experts. Accept the latency. The cost of a correct answer that takes two days is almost always lower than the cost of an incorrect answer delivered immediately.

> ⚠️ **ANTI-PATTERN: EXPERT FATIGUE**
>
> The Admiral routes too many questions to the same expert, overwhelming them with fleet-generated consultation requests. The expert's responses become shorter, less thoughtful, and eventually delayed. The fleet was supposed to reduce human workload, not redistribute it. Combat this by batching consultations where possible (send one weekly digest rather than five individual requests), by escalating only decisions that genuinely require expert judgment (not everything tangentially related to their domain), and by integrating expert decisions into the Ground Truth so the same question is never asked twice.

-----

## Pre-Flight Checklist

Before deploying any new fleet, verify every item below. If any box is unchecked, the fleet is not ready for autonomous operation. Each item maps to the section where the artifact is defined.

- [ ] **Mission (01):** Project identity, success state, stakeholders, and current phase are documented in a single artifact.
- [ ] **Boundaries (02):** Non-goals, hard constraints, resource budgets, and quality floor are defined. Scope boundaries are set per agent role.
- [ ] **Fleet Composition (03):** Agent roster with roles, specializations, routing logic, and interface contracts are documented.
- [ ] **Decision Authority (04):** Three tiers (Autonomous / Propose / Escalate) are defined with concrete examples calibrated to project maturity.
- [ ] **Work Decomposition (05):** Goals are broken into chunks. Each chunk has entry/exit state, budget, and sequencing. Attention-evening protocol is defined.
- [ ] **Ground Truth (06):** Domain ontology, naming conventions, tech stack versions, access/permissions, and known issues are documented and current.
- [ ] **Failure Recovery (07):** Recovery ladder is documented. Max retry counts are set. Escalation report template is ready. Pre-defined fallbacks exist.
- [ ] **Institutional Memory (08):** Decision log location, checkpoint template, context loading strategy, and audit artifact formats are established.
- [ ] **Quality Assurance (09):** Verification levels are assigned per task type. Multi-pass review protocol is defined. QA feedback loop template is ready.
- [ ] **Success Criteria (10):** Functional, quality, completeness, and negative criteria are defined per task. Machine-verifiable where possible.
- [ ] **Inter-Fleet Governance (11):** Knowledge boundaries are set. Admiral relay protocol is in place. Cross-fleet review cadence is scheduled.
- [ ] **Failure Modes (12):** Fleet configuration has been reviewed against the Known Agent Failure Modes field guide. Mitigations are in place.
- [ ] **Context Window Strategy (13):** Context profiles are defined per role. Loading order, refresh triggers, and sacrifice order are documented.
- [ ] **Adaptation Protocol (14):** Change classification tiers are defined. Cascade map is understood. Fleet Pause Protocol is documented. Stale context detection mechanisms are in place.
- [ ] **Admiral Self-Calibration (15):** Bottleneck detection signals are known. Trust Calibration Log is initialized. Decision fatigue management strategy is defined. Growth trajectory stage is self-assessed.
- [ ] **Parallel Execution Strategy (16):** Parallelization criteria are defined. Coordination patterns (Contract-First, Checkpoint Sync, Ownership Isolation) are understood. Divergence detection and resolution protocols are documented.
- [ ] **Fleet Health Metrics (17):** Metrics are selected per category (productivity, quality, coordination, strategic). Collection rhythm is defined. Fleet Health Dashboard template is ready. Interpretation guidelines are understood.
- [ ] **Prompt Engineering (18):** Agent system prompts follow the defined anatomy (Identity → Authority → Constraints → Knowledge → Task). Prompts have been tested with boundary, authority, ambiguity, and conflict probes. No personality prompting.
- [ ] **Tool & Capability Registry (19):** Every agent role has an explicit tool registry listing available tools, scope limits, and shared state. Negative tool lists define what each agent cannot do. Tool interaction contracts are defined for shared resources.
- [ ] **Model Selection (20):** Every agent role is assigned to a model tier (Flagship / Workhorse / Utility) with documented rationale. Context window requirements have been verified against assigned model capacity.
- [ ] **Cost Management (21):** Per-session and per-phase monetary budgets are defined. Cost tracking structure (per-chunk, per-role, per-fleet) is in place. Cost review is integrated into the metric collection rhythm.
- [ ] **Fleet Scaling & Lifecycle (22):** Current lifecycle phase is identified (Standup / Acceleration / Steady State / Wind-Down / Decommission). Scaling signals are understood. Upper bound for fleet size is established.
- [ ] **Human-Expert Routing (23):** Human Expert Roster is defined with domains, SLAs, and input/output formats. Routing triggers are documented. Consultation request template is ready. Integration protocol for expert responses is defined.

-----

## Quick-Start Sequence

When standing up a new fleet, complete these sections in this order. This is not the document order — it is the operational order that minimizes rework.

1. **Mission (01)** — Define what you are building and what success looks like.
2. **Ground Truth (06)** — Document the environment: tech stack, tools, access, vocabulary.
3. **Boundaries (02)** — Define what you are NOT building and the resource budgets.
4. **Fleet Composition (03)** — Define the agents, their roles, and how they communicate.
5. **Context Window Strategy (13)** — Define how each agent loads and manages its finite context.
6. **Decision Authority (04)** — Set the autonomy tiers for this project's risk profile.
7. **Success Criteria (10)** — Define acceptance criteria for the first phase of work.
8. **Work Decomposition (05)** — Break the first phase into chunks with budgets and sequencing.
9. **Prompt Engineering (18)** — Write the system prompts for each agent using the defined anatomy. Run prompt probes.
10. **Tool & Capability Registry (19)** — Define available and unavailable tools for each agent. Set interaction contracts.
11. **Model Selection (20)** — Assign each role to a model tier. Verify context window fit.
12. **Cost Management (21)** — Set monetary budgets per session and per phase. Establish cost tracking.
13. **Remaining sections** — Establish Failure Recovery (07), Institutional Memory (08), QA (09), Governance (11), review Failure Modes (12), define Adaptation Protocol (14), initialize Admiral Self-Calibration (15), document Parallel Execution Strategy (16), configure Fleet Health Metrics (17), identify Fleet Scaling phase (22), and define Human-Expert Routing (23).

-----

## Worked Example: SaaS Task Manager

A concrete application of the framework for a mid-complexity greenfield project. This example is abbreviated — a production deployment would fill in more detail in each template. It demonstrates how the first five artifacts in the Quick-Start Sequence connect.

### Mission

> This project is a collaborative task management application for small teams (5–20 members).
>
> It is successful when a team can create projects, assign tasks, track progress through customizable workflows, and receive notifications — all within a sub-200ms UI response time.
>
> It is built for small-team leads and individual contributors who need lightweight project tracking without enterprise overhead.
>
> Current phase: greenfield.

### Boundaries (abbreviated)

> NON-GOALS: No Gantt charts. No resource allocation or capacity planning. No time tracking. No mobile app (web-only MVP). No SSO (email/password auth only for v1). No real-time collaborative editing of task descriptions.
>
> CONSTRAINTS: Next.js 15 with TypeScript 5.7, PostgreSQL 16, Tailwind 4.0. Ship MVP in 6 weeks. Must pass WCAG 2.1 AA.
>
> BUDGETS: 50K tokens per task. 30 minutes wall-clock per task. Agents may only modify files in `src/` and `prisma/`.
>
> QUALITY FLOOR: All code passes ESLint with zero errors. All new code has test coverage. All pages score 90+ on Lighthouse accessibility. No `any` types in TypeScript.

### Fleet Roster

> FLEET: TaskFlow
>
> ORCHESTRATOR: Claude Opus — Autonomous tier for implementation decisions, Propose tier for schema and API design.
>
> SPECIALISTS:
>
> - Architect (#15): System structure, API design, schema decisions. Owns `prisma/schema.prisma` and `docs/architecture/`. Does NOT write implementation code or make UI decisions.
> - Frontend Implementer (#5): UI components, pages, client state. Owns `src/app/` and `src/components/`. Does NOT modify API routes, database schemas, or server-side logic.
> - Backend Implementer (#10): API routes, business logic, middleware. Owns `src/api/` and `src/lib/server/`. Does NOT modify UI components or database schemas directly.
> - Database Agent (#12): Schema design, migrations, query optimization. Owns `prisma/`. Does NOT modify application code or choose API response shapes.
> - QA Agent (#24): Reviews all output, runs test suites, validates acceptance criteria. Owns nothing (read-only access). Does NOT fix issues directly — sends structured reports back to the responsible specialist.
> - Accessibility Auditor (#7): Periodic WCAG 2.1 AA review of all UI. Triggered per feature completion. Does NOT implement fixes — produces audit reports for Frontend Implementer.
>
> ROUTING: Database tasks → Database Agent. UI tasks → Frontend Implementer. API tasks → Backend Implementer. Cross-cutting design → Architect decomposes first. All completed work → QA Agent before acceptance.

### Decision Authority

> 🟢 AUTONOMOUS: Component naming, file structure within owned directories, test implementation, CSS/styling, internal refactors, dependency patch versions, code formatting, error message copy.
>
> 🟡 PROPOSE: New database tables or columns, new API endpoints, new external dependencies, component architecture patterns (first use of a pattern), authentication flow design, any change to the build pipeline.
>
> 🔴 ESCALATE: Scope additions not in the Mission, budget overruns >120%, security concerns, any change to the deployment target or tech stack, any deviation from the six-week timeline.

### Context Profile: Frontend Implementer

> STANDING CONTEXT: Role definition ("You are the Frontend Implementer. You do not make decisions that belong to the Architect or the Orchestrator."), Mission, Boundaries, design system tokens, component naming conventions.
>
> SESSION CONTEXT: Last session checkpoint, current task specification, relevant API contracts from Backend Implementer, Architect's component structure decisions.
>
> ON-DEMAND CONTEXT: Accessibility guidelines (loaded when building new interactive components), animation patterns (loaded for transition work), form validation patterns (loaded for form-heavy tasks).
>
> REFRESH TRIGGERS: After each feature completion, after any schema change, after any API contract modification.
>
> SACRIFICE ORDER: Previous session checkpoints (oldest first) → architectural history → design system details → component conventions → Boundaries → Mission (never sacrificed).

### First Task Decomposition (abbreviated)

> GOAL: Implement the core task board — create, view, and move tasks across workflow columns.
>
> CHUNKS:
>
> 1. **Schema design** — Entry: Mission + Boundaries defined — Exit: Prisma schema with Task, Project, Column models, migration runs clean — Budget: 20K tokens — Owner: Database Agent
> 2. **API layer** — Entry: Schema approved — Exit: CRUD endpoints for tasks, projects, columns; all pass integration tests — Budget: 30K tokens — Owner: Backend Implementer
> 3. **Board UI** — Entry: API contracts defined — Exit: Kanban board renders columns, displays tasks, supports drag-to-move — Budget: 40K tokens — Owner: Frontend Implementer
> 4. **Accessibility pass** — Entry: Board UI complete — Exit: WCAG 2.1 AA audit report, all Blocker/Major issues resolved — Budget: 15K tokens — Owner: Accessibility Auditor → Frontend Implementer
>
> SEQUENCE: 1 → 2 → 3 → 4 (serialized — each depends on the previous). Chunks 2 and 3 could be staggered using Contract-First Parallelism if the API contract is defined during chunk 2's design phase.
>
> REVIEW ORDER: Reverse (4, 3, 2, 1), then middle-out (2, 3, 1, 4), then forward for continuity.

-----

*The Fleet Admiral Framework • v2.0*

*Context is the currency of autonomous AI. Spend it wisely.*