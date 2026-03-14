<!-- Admiral Framework v0.4.0-alpha -->
# Interface Contracts

**Defined formats for handoffs between specific agent pairs.**

These contracts specify exactly what the sender delivers and what the receiver returns for the most common agent-to-agent handoff patterns. All handoffs follow the general handoff protocol (see [admiral/part11-protocols.md, Handoff Protocol](../admiral/spec/part11-protocols.md)); these contracts define the domain-specific content within that structure.

-----

## Engineering Handoffs

### API Designer → Backend Implementer

**Sender delivers:**
- Endpoint specification (method, path, parameters, headers)
- Request schema with validation rules
- Response schema with status codes
- Error response format
- Authentication/authorization requirements
- Rate limiting and pagination details

**Receiver returns:**
- Implemented endpoint(s)
- List of files created or modified
- Test commands to validate the implementation
- Any deviations from spec with rationale

### Database Agent → Backend Implementer

**Sender delivers:**
- Schema changes (DDL or migration file)
- New indexes, constraints, or triggers
- Query patterns the application should use
- Performance considerations (expected row counts, query plans)

**Receiver returns:**
- Application code integrating the schema changes
- ORM model updates if applicable
- Migration verification results

### Backend Implementer → QA Agent

**Sender delivers:**
- Code diff (files changed, lines changed)
- Description of intended behavior
- Test commands to run
- Edge cases considered during implementation
- Known limitations or deferred concerns

**Receiver returns:**
- Pass/fail verdict with rationale
- Specific findings: file, line, expected behavior, actual behavior, severity
- Suggestions for additional test coverage
- Verification that existing tests still pass

### Design Systems Agent → Frontend Implementer

**Sender delivers:**
- Component specification (layout, spacing, colors, typography)
- Interactive states (default, hover, focus, active, disabled, loading, error)
- Responsive behavior across breakpoints
- Accessibility requirements (ARIA roles, keyboard interactions)
- Design token references

**Receiver returns:**
- Implemented component
- Screenshot or preview link
- Responsive behavior verification across breakpoints
- Accessibility compliance notes
- Any deviations from spec with rationale

### Frontend Implementer → Accessibility Auditor

**Sender delivers:**
- Implemented component or page
- Target WCAG level (AA or AAA)
- Assistive technologies to test against
- Known accessibility considerations

**Receiver returns:**
- WCAG compliance audit results
- Findings: element, criterion, severity, remediation guidance
- Screen reader testing results
- Keyboard navigation path validation

-----

## Quality Handoffs

### Any Implementer → Unit Test Writer

**Sender delivers:**
- Implemented code with function/method signatures
- Intended behavior per function
- Edge cases to cover
- Existing test patterns in the project

**Receiver returns:**
- Test files with passing tests
- Coverage summary for the new code
- Edge cases tested
- Any behaviors discovered during testing that seem unintentional

### QA Agent → Implementer (Rejection)

**Sender delivers:**
- Failed review with specific findings
- File and line references for each issue
- Severity rating per issue
- Expected behavior vs. actual behavior
- Reproduction steps

**Receiver returns:**
- Fixed code addressing each finding
- Explanation of fix per finding
- Request for re-review

-----

## Security Handoffs

### Security Auditor → Implementer (Findings)

**Sender delivers:**
- Vulnerability type (OWASP classification)
- Location (file, line, function)
- Severity (Critical, High, Medium, Low)
- Attack vector description
- Remediation guidance
- Reference (CWE, CVE if applicable)

**Receiver returns:**
- Fixed code with remediation applied
- Explanation of how the fix addresses the vulnerability
- Request for security re-review

### Penetration Tester → Security Auditor

**Sender delivers:**
- Exploitable findings with proof-of-concept
- Non-exploitable findings with explanation of why
- Risk assessment per finding
- Recommended mitigations

**Receiver returns:**
- Validation of mitigations after implementation
- Updated security posture assessment

-----

## Cross-Category Handoffs

### Architect → Orchestrator (Decomposition)

**Sender delivers:**
- Architectural design for the feature/system
- Component boundaries and interfaces
- Recommended implementation sequence
- Risk areas requiring careful attention
- Decision rationale (ADR format)

**Receiver returns:**
- Task decomposition based on the design
- Agent assignments per task
- Estimated resource consumption
- Identified dependencies between tasks

### Any Agent → Orchestrator (Routing Suggestion)

**Sender delivers:**
- Description of work discovered outside the agent's scope
- Suggested agent or category for the work
- Priority assessment
- Context that would be needed for the work

**Receiver returns:**
- Acknowledgment
- Routing decision (accepted, deferred, or declined with reason)

### Orchestrator → Admiral (Escalation)

**Sender delivers:**
- Escalation report (per escalation protocol)
- Aggregated context from involved agents
- Impact assessment on overall project progress
- Recommended resolution if available

**Receiver returns:**
- Decision or direction
- Updated constraints or scope if changed
- Authorization for any actions above fleet authority

-----

## Governance Handoffs

### Drift Monitor → Orchestrator

**Sender delivers:**
- `agent_id` — the agent exhibiting drift
- `drift_type` — category of drift detected (scope creep, style deviation, role confusion, etc.)
- `evidence` — specific output or behavior demonstrating the drift
- `severity` — Critical, High, Medium, Low
- `recommended_action` — suggested corrective measure (re-prompt, constrain context, suspend, etc.)

**Receiver returns:**
- `acknowledged` — confirmation of receipt
- `action_taken` — what the Orchestrator did in response (re-prompted agent, suspended agent, adjusted context, escalated to Admiral, etc.)

### Hallucination Auditor → Orchestrator

**Sender delivers:**
- `agent_id` — the agent that produced the suspect output
- `output_ref` — reference to the specific output under review
- `claim` — the factual claim being evaluated
- `verification_result` — Confirmed, Unverifiable, Contradicted, Fabricated
- `confidence` — auditor's confidence in the verification result (0.0–1.0)

**Receiver returns:**
- `acknowledged` — confirmation of receipt
- `action_taken` — what the Orchestrator did in response (rejected output, requested revision, flagged for human review, etc.)

### Bias Sentinel → Orchestrator

**Sender delivers:**
- `agent_id` — the agent exhibiting bias
- `bias_type` — category of bias detected (confirmation, anchoring, completion, sycophancy, etc.)
- `evidence_pattern` — specific pattern or examples demonstrating the bias
- `severity` — Critical, High, Medium, Low
- `recommended_action` — suggested corrective measure (re-prompt with counter-perspective, add adversarial review, suspend, etc.)

**Receiver returns:**
- `acknowledged` — confirmation of receipt
- `action_taken` — what the Orchestrator did in response

### Loop Breaker → Orchestrator

**Sender delivers:**
- `agent_id` — the agent caught in a loop
- `loop_signature` — pattern fingerprint identifying the repeated behavior
- `iteration_count` — number of loop iterations detected
- `resource_consumed` — tokens, time, or other resources consumed by the loop

**Receiver returns:**
- `acknowledged` — confirmation of receipt
- `action_taken` — what the Orchestrator did in response (terminated loop, adjusted task decomposition, escalated, etc.)

-----

## Scale Agent Handoffs

### Scale Agent → Orchestrator

**Sender delivers** (common output schema per [scale.md](agents/scale.md)):
- `analysis_type` — the kind of analysis performed
- `scope` — what was analyzed and the boundaries of the analysis
- `findings[]` — list of findings from the analysis
- `confidence_level` — overall confidence in the analysis
- `methodology` — approach and methods used
- `limitations[]` — known limitations of the analysis
- `recommendations[]` — actionable recommendations based on findings
- `audit_trail` — provenance and reasoning chain for reproducibility

**Receiver returns:**
- `acknowledged` — confirmation of receipt
- `action_items[]` — list of actions the Orchestrator will take based on the analysis

-----

## Lifecycle Handoffs

### Release Orchestrator → DevOps Agent

**Sender delivers:**
- Release candidate identifier (version, commit SHA, branch)
- Release checklist status (tests passing, security audit clear, changelog updated)
- Deployment target (staging, production, rollback if needed)
- Feature flags to enable/disable with the release
- Rollback criteria (what conditions trigger automatic rollback)

**Receiver returns:**
- Deployment status (success, failed, rolled back)
- Environment health checks post-deployment
- Any configuration changes applied
- Rollback instructions if manual intervention needed

### Incident Response Agent → Orchestrator

**Sender delivers:**
- Incident classification (severity, affected systems, blast radius)
- Root cause hypothesis with confidence level
- Immediate mitigation actions taken or recommended
- Affected agents and tasks (what fleet work should pause)
- Communication summary for Admiral

**Receiver returns:**
- Acknowledgment with routing decisions (which agents to pause, resume, or redirect)
- Authorization for mitigation actions above autonomous tier

### Contract Test Writer → QA Agent

**Sender delivers:**
- Contract test suite covering API agreements between services
- Consumer expectations documented per endpoint
- Provider verification results
- Breaking change detection results

**Receiver returns:**
- Integration verification against broader test suite
- Conflicts with existing E2E or unit tests
- Coverage assessment for the contract surface

-----

## Meta & Autonomous Handoffs

### Pattern Enforcer → Orchestrator

**Sender delivers:**
- Convention violation type (naming, structure, architecture pattern)
- Location (file, line, specific pattern)
- Expected convention (reference to Ground Truth)
- Severity (mandatory convention vs. recommended practice)
- Suggested fix

**Receiver returns:**
- Routing decision (send back to original agent for correction, or defer)

### Dependency Sentinel → Orchestrator

**Sender delivers:**
- Vulnerability report (CVE ID, severity, affected package, version range)
- Update recommendation with breaking change risk assessment
- License compliance findings
- Maintenance health assessment (abandoned packages, declining activity)

**Receiver returns:**
- Routing decision (assign to relevant implementer, defer, escalate to Admiral)
- Priority assignment for remediation

### Role Crystallizer → Admiral

**Sender delivers:**
- Proposed fleet composition change (new agent, merged roles, deprecated agent)
- Evidence supporting the change (repeated routing failures, scope overlap metrics, unmet capability gaps)
- Impact assessment (which existing agents affected, routing rule changes needed)
- Reversibility assessment

**Receiver returns:**
- Approval, rejection, or modification of the proposal
- Implementation constraints if approved

-----

## Adversarial Handoffs

### Simulated User / Persona Agent → QA Agent

**Sender delivers:**
- User scenario tested (persona, task flow, edge case)
- Issues discovered (usability failures, error handling gaps, confusing flows)
- Severity per issue (blocking, degraded, cosmetic)
- Steps to reproduce

**Receiver returns:**
- Acknowledgment with routing to relevant implementer
- Integration into test suite (if the scenario should become a regression test)

### Devil's Advocate / Red Team Agent → Orchestrator

**Sender delivers:**
- Challenge report (assumption questioned, weakness found, alternative proposed)
- Evidence supporting the challenge
- Impact if the challenge is valid (what breaks, what needs rework)
- Confidence level in the finding

**Receiver returns:**
- Routing decision (assign to original agent for response, escalate to Architect/Admiral, accept and adapt)

-----

## Domain & Data Handoffs

### Domain Specialist → Backend Implementer

**Sender delivers:**
- Domain-specific implementation specification (e.g., payment flow, auth scheme, i18n rules)
- Integration points with existing application code
- Domain constraints and validation rules
- Compliance or regulatory requirements (PCI, GDPR, accessibility)
- Test scenarios specific to the domain

**Receiver returns:**
- Implemented integration
- Compliance verification results
- Any deviations from spec with rationale
- Request for domain specialist re-review

### Data Engineer → Analytics Implementer

**Sender delivers:**
- Pipeline specification (data sources, transformations, output schema)
- Data quality constraints and validation rules
- Performance requirements (latency, throughput)
- Schema documentation for downstream consumers

**Receiver returns:**
- Analytics instrumentation integrated with the pipeline
- Dashboard or visualization specifications
- Data quality validation results

### Data Validator → Data Engineer (Rejection)

**Sender delivers:**
- Data quality failures (schema violations, anomalies, completeness gaps)
- Affected pipeline stage and data sample
- Severity (blocking, warning, informational)
- Suggested remediation

**Receiver returns:**
- Pipeline fix addressing the quality failures
- Updated validation rules if needed
- Request for re-validation

-----

> **Note:** Not all agent pairs require explicit contracts. Contracts are specified for handoffs where format ambiguity would cause failures.

-----

## Contract Violations

When a handoff doesn't match the expected contract:

1. **Receiver rejects the handoff** with specific fields that are missing or malformed
2. **Rejection routes through the Orchestrator** (not directly back to sender)
3. **Orchestrator determines** whether to route back to sender for correction or to decompose differently
4. **Repeated contract violations** for the same agent pair signal a process issue — the Orchestrator flags it for review

**Why acceptance_criteria is required:** Without acceptance criteria, the receiving agent cannot determine whether the handoff is complete. It will accept whatever arrives and build on it — propagating incomplete input downstream. Acceptance criteria are the receiver's defense against upstream quality failures.

**Judgment guidance:** Repeated contract violations for the same agent pair (3+ rejections in a session) signal that the decomposition is wrong, not that the agents are performing poorly. The work may not naturally divide at the boundary the contract assumes. The Orchestrator should re-evaluate whether the task should be decomposed differently or assigned to a single agent.

-----

## Schema Extensions for Domain-Specific Contracts

The canonical handoff schema (`handoff/v1.schema.json`) defines the base structure for all handoffs. Interface contracts defined in this file extend the base schema through the `metadata` field — the designated extension point for domain-specific fields.

### Extension Mechanism

The `metadata` field in the handoff schema accepts `additionalProperties: true`, allowing any domain-specific fields. Interface contracts formalize these fields for specific agent pairs:

**Example: Governance handoff extension**

When a governance agent (e.g., Drift Monitor) hands off a finding to the Orchestrator, the `metadata` field carries governance-specific fields:

```json
{
  "metadata": {
    "governance": {
      "agent_id": "Drift Monitor",
      "finding_type": "scope_creep",
      "evidence": ["file:src/auth.ts:45 — unrequested refactoring"],
      "severity": "medium",
      "failure_mode": "Scope Creep via Helpfulness",
      "authoritative_owner": "Drift Monitor",
      "recommended_action": "Route correction to originating agent"
    }
  }
}
```

### Convention

- Domain-specific schema fragments live alongside the base schema in `handoff/` if they are reusable across multiple agent pairs.
- One-off extensions can be defined inline in this file alongside the relevant contract.
- This does NOT require rewriting all existing contracts — it provides the mechanism for progressive formalization. Contracts can be formalized into schema fragments as the need for automated validation grows.
- Governance agents can programmatically audit handoff quality by validating the `metadata` fields against the relevant extension schema.
