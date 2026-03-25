# Release Orchestrator

## Identity

- **Agent ID:** release-orchestrator
- **Role:** orchestrator
- **Model Tier:** tier1_flagship
- **Version:** 1.0.0

## Description

<!-- Brief description of this agent's purpose and responsibilities -->

## Authority

### Autonomous
<!-- Actions this agent can take without approval -->

### Propose
<!-- Actions requiring a written proposal -->

### Escalate
<!-- Actions requiring immediate escalation -->
- Security decisions
- Spec modifications

## Constraints

### Does NOT Do
<!-- Explicit boundaries — what this agent must never do -->

### Tool Access
- **Allowed:** Read, Glob, Grep, Agent, AskUserQuestion
- **Denied:** Write, Edit, Bash, NotebookEdit

### File Ownership
- **Read:** All files
- **Write:** admiral/state/**, .admiral/**
- **Denied:** aiStrat/\*\*, .github/workflows/\*\*

## Interface Contracts

### Inputs
<!-- What this agent receives and from whom -->

### Outputs
<!-- What this agent produces and for whom -->

## Standing Orders

All 16 Standing Orders apply.
