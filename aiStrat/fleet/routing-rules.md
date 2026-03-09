<!-- Admiral Framework v0.1.1-alpha -->
# Routing Rules

**How the Orchestrator assigns tasks to agents.**

Routing rules determine which agent handles which task. They are consumed by the Orchestrator at task decomposition time. These are project-agnostic defaults — project-specific routing overrides layer on top.

-----

## Routing Decision Tree

The Orchestrator routes using three strategies in priority order:

### 1. Route by Task Type

The primary routing strategy. Match the task's nature to the agent whose scope covers it.

| Task Type | Primary Agent | Fallback |
|---|---|---|
| **UI component implementation** | Frontend Implementer | Backend Implementer (if SSR) |
| **Animation / interaction** | Interaction Designer | Frontend Implementer |
| **Accessibility audit** | Accessibility Auditor | QA Agent |
| **Responsive layout** | Responsive Layout Agent | Frontend Implementer |
| **Client-side state** | State Management Agent | Frontend Implementer |
| **Server-side logic** | Backend Implementer | — |
| **API contract design** | API Designer | Backend Implementer |
| **Database schema / migration** | Database Agent | Backend Implementer |
| **Async messaging** | Queue & Messaging Agent | Backend Implementer |
| **Caching** | Cache Strategist | Backend Implementer |
| **Architecture decision** | Architect | Admiral |
| **Third-party integration** | Integration Agent | Backend Implementer |
| **System migration** | Migration Agent | Architect + Backend Implementer |
| **Code refactoring** | Refactoring Agent | Backend/Frontend Implementer |
| **Dependency management** | Dependency Manager | Backend Implementer |
| **CI/CD pipeline** | DevOps Agent | Infrastructure Agent |
| **Infrastructure provisioning** | Infrastructure Agent | DevOps Agent |
| **Containerization** | Containerization Agent | DevOps Agent |
| **Monitoring / observability** | Observability Agent | DevOps Agent |
| **Code review / QA** | QA Agent | — |
| **Unit tests** | Unit Test Writer | QA Agent |
| **E2E / integration tests** | E2E Test Writer | QA Agent |
| **Performance testing** | Performance Tester | QA Agent |
| **Chaos / resilience testing** | Chaos Agent | Performance Tester |
| **Regression validation** | Regression Guardian | QA Agent |
| **Security audit** | Security Auditor | — |
| **Penetration testing** | Penetration Tester | Security Auditor |
| **Compliance validation** | Compliance Agent | Security Auditor |
| **Privacy review** | Privacy Agent | Compliance Agent |
| **Data pipeline** | Data Engineer (extras) | Backend Implementer |
| **Analytics instrumentation** | Analytics Implementer (extras) | Frontend/Backend Implementer |
| **ML pipeline** | ML Engineer (extras) | Data Engineer (extras) |
| **Data validation** | Data Validator (extras) | Data Engineer (extras) |
| **Data visualization** | Visualization Agent (extras) | Frontend Implementer |
| **UX analysis** | UX Researcher | Simulated User |
| **Design system** | Design Systems Agent | Frontend Implementer |
| **User-facing copy** | Copywriter | Technical Writer |
| **Technical documentation** | Technical Writer | — |
| **Diagrams** | Diagram Agent | Technical Writer |
| **User workflow testing** | Simulated User | QA Agent |
| **Decision challenge** | Devil's Advocate | Red Team Agent |
| **Adversarial review** | Red Team Agent | Devil's Advocate |
| **Persona testing** | Persona Agent | Simulated User |
| **Pattern enforcement** | Pattern Enforcer | QA Agent |
| **Dependency monitoring** | Dependency Sentinel | Dependency Manager |
| **SEO audit** | SEO Crawler | Frontend Implementer |
| **Fleet roster evolution** | Role Crystallizer | Admiral |
| **Internationalization** | Internationalization Agent (extras) | Frontend Implementer |
| **Authentication** | Auth & Identity Specialist (extras) | Backend Implementer |
| **Search** | Search & Relevance Agent (extras) | Backend Implementer |
| **Payments / billing** | Payment & Billing Agent (extras) | Backend Implementer |
| **Real-time / WebSocket** | Real-time Systems Agent (extras) | Backend Implementer |
| **Media processing** | Media Processing Agent (extras) | Backend Implementer |
| **Notifications** | Notification Orchestrator (extras) | Backend Implementer |
| **Token budget enforcement** | Token Budgeter | Orchestrator |
| **Scope / mission drift detection** | Drift Monitor | Orchestrator |
| **Hallucination audit** | Hallucination Auditor | Orchestrator |
| **Bias detection** | Bias Sentinel | Orchestrator |
| **Loop / thrash detection** | Loop Breaker | Orchestrator |
| **Context health monitoring** | Context Health Monitor | Context Curator |
| **Contradiction detection** | Contradiction Detector | Mediator |
| **Release management** | Release Orchestrator | DevOps Agent |
| **Incident response** | Incident Response Agent | Admiral |
| **Feature flags** | Feature Flag Strategist | DevOps Agent |
| **SDK / developer experience** | SDK & Dev Experience Agent | Technical Writer |
| **Monorepo coordination** | Monorepo Coordinator | DevOps Agent |
| **Contract testing** | Contract Test Writer | E2E Test Writer |

### 2. Route by File Ownership

When a task is defined by which files it modifies, route based on file ownership. File ownership is project-specific and must be configured per deployment.

```
EXAMPLE FILE OWNERSHIP (project-specific):

src/components/     → Frontend Implementer
src/api/            → Backend Implementer
src/services/       → Backend Implementer
db/migrations/      → Database Agent
infrastructure/     → Infrastructure Agent
.github/workflows/  → DevOps Agent
tests/unit/         → Unit Test Writer
tests/e2e/          → E2E Test Writer
docs/               → Technical Writer
```

### 3. Escalate Ambiguous Routing

When a task cannot be clearly assigned:

1. **Decompose further.** Break the task into subtasks until each has a clear owner.
2. **If decomposition fails,** the task likely spans a boundary that needs architectural input. Route to the Architect for decomposition guidance.
3. **If the Architect cannot decompose,** escalate to the Admiral. The task may reveal a gap in the fleet roster (signal for the Role Crystallizer).

-----

## Routing Constraints

- **Never route a task to an agent that lists it in "Does NOT Do."**
- **Never route QA tasks to the agent that produced the work.** No self-review.
- **Never route more than one task to a single agent simultaneously** unless the agent is explicitly designed for concurrent work.
- **Always include acceptance criteria in the routing.** An agent without acceptance criteria cannot determine when it's done.
- **Always include the context file list.** An agent without context will hallucinate project details.

-----

## Multi-Agent Tasks

Some tasks require sequential work by multiple agents. Route as a pipeline:

```
Task: "Add a new API endpoint for user preferences"

Pipeline:
1. API Designer → produces endpoint specification
2. Database Agent → produces schema changes if needed
3. Backend Implementer → implements the endpoint
4. Unit Test Writer → writes tests for the endpoint
5. QA Agent → validates the complete deliverable
```

Each step's output becomes the next step's input via the handoff protocol.

> For handoff format specifications between routed agents, see [`interface-contracts.md`](interface-contracts.md).
