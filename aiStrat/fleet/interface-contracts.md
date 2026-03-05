# Interface Contracts

**Defined formats for handoffs between specific agent pairs.**

These contracts specify exactly what the sender delivers and what the receiver returns for the most common agent-to-agent handoff patterns. All handoffs follow the general handoff protocol (see [admiral/part11-protocols.md, Section 38](../admiral/part11-protocols.md)); these contracts define the domain-specific content within that structure.

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

### Design Agent → Frontend Implementer

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

> **Note:** Not all agent pairs require explicit contracts. Contracts are specified for handoffs where format ambiguity would cause failures.

-----

## Contract Violations

When a handoff doesn't match the expected contract:

1. **Receiver rejects the handoff** with specific fields that are missing or malformed
2. **Rejection routes through the Orchestrator** (not directly back to sender)
3. **Orchestrator determines** whether to route back to sender for correction or to decompose differently
4. **Repeated contract violations** for the same agent pair signal a process issue — the Orchestrator flags it for review
