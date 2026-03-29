# Leash Cedar Policy Generation Spec (SEC-15)

> Design mapping from Admiral's Decision Authority Tiers to Cedar policy language for StrongDM Leash kernel-level enforcement.

## Overview

StrongDM Leash provides kernel-level enforcement with Cedar policies. Admiral's competitive strategy is **integration, not competition**: Admiral generates Cedar policies from agent tier assignments, making Leash an enforcement backend rather than a competitor.

## Authority Tier to Cedar Mapping

Admiral defines 4 authority tiers (from highest to lowest privilege):

| Admiral Tier | Behavior | Cedar Effect |
|---|---|---|
| **Enforced** | System-level rules, no agent override | `forbid` — unconditional deny regardless of agent role |
| **Autonomous** | Agent executes and logs | `permit` — allow with logging condition |
| **Propose** | Agent drafts proposal, awaits approval | `forbid` with approval exception — deny unless `context.approval_status == "approved"` |
| **Escalate** | Agent halts, escalates to Admiral | `forbid` — deny unconditionally at agent level |

### Tier Mapping Details

#### Enforced (System Constraints)

Standing Orders (SO-01 through SO-17) are system-level constraints that no agent can override. These map to unconditional `forbid` policies.

```cedar
// SO-10: Prohibitions — never store PII in Brain
forbid (
  principal,
  action == Action::"brain_write",
  resource
)
when { resource.contains_pii == true };
```

#### Autonomous

Actions an agent is explicitly authorized to perform. Map to `permit` with mandatory logging.

```cedar
// Implementer agent: autonomous code writing
permit (
  principal == Agent::"implementer-1",
  action == Action::"write_code",
  resource
)
when { resource in Scope::"assigned_project" };
```

#### Propose

Actions requiring written proposal before execution. Map to `forbid` with an approval-gate exception.

```cedar
// Implementer agent: config changes require proposal
forbid (
  principal == Agent::"implementer-1",
  action == Action::"modify_config",
  resource
)
unless { context.approval_status == "approved" };
```

#### Escalate

Actions that require immediate halt and Admiral intervention. Map to unconditional `forbid` at the agent level — only Admiral can permit.

```cedar
// Implementer agent: cannot delete data
forbid (
  principal == Agent::"implementer-1",
  action == Action::"delete_data",
  resource
);
```

## Entity Model

Cedar requires a typed entity model. Admiral maps as follows:

```
namespace Admiral {
  entity Agent;
  entity Scope;
  entity Resource;

  action "read_files" appliesTo { principal: Agent, resource: Resource };
  action "write_code" appliesTo { principal: Agent, resource: Resource };
  action "modify_config" appliesTo { principal: Agent, resource: Resource };
  action "delete_data" appliesTo { principal: Agent, resource: Resource };
  action "modify_permissions" appliesTo { principal: Agent, resource: Resource };
  action "brain_write" appliesTo { principal: Agent, resource: Resource };
  action "brain_read" appliesTo { principal: Agent, resource: Resource };
  action "tool_invoke" appliesTo { principal: Agent, resource: Resource };
  action "delegate_task" appliesTo { principal: Agent, resource: Resource };
  action "escalate" appliesTo { principal: Agent, resource: Resource };
}
```

## Policy Generation Algorithm

Given an agent definition JSON with authority tiers:

```
Input:  agent-definition.v1.json (agent_id, authority.{autonomous, propose, escalate})
Output: <agent_id>.cedar (Cedar policy file)
```

### Steps

1. **Parse** the agent definition's `authority` object.
2. **For each autonomous action**: generate a `permit` policy with the agent as principal and the action name mapped to a Cedar action.
3. **For each propose action**: generate a `forbid` policy with an `unless { context.approval_status == "approved" }` clause.
4. **For each escalate action**: generate an unconditional `forbid` policy.
5. **Append Standing Order policies**: universal `forbid` rules that apply to all agents (generated once, shared).
6. **Write** the policy set to `<agent_id>.cedar`.

### Policy Generation Triggers

Cedar policies should be regenerated when:
- An agent definition is created or modified
- Authority tier assignments change
- Standing Orders are updated
- Fleet registry is updated

In CI, policy generation runs as a validation step (policies are generated and validated but not deployed — deployment is Leash's responsibility).

## Deployment Scenarios

### Leash-Present Deployment

When StrongDM Leash is available:
1. Admiral generates Cedar policies from agent definitions.
2. Policies are pushed to Leash via its policy API.
3. Leash enforces at kernel level — every tool invocation, file access, and API call is checked.
4. Admiral's `privilege_check.sh` hook becomes advisory (belt-and-suspenders).
5. Leash enforcement is authoritative; Admiral enforcement is defense-in-depth.

```
Agent → Tool Call → Leash Cedar Check (kernel) → Admiral Hook Check (app) → Execute
```

### Leash-Absent Deployment

When Leash is not available (default — current state):
1. Cedar policies are generated but not enforced externally.
2. Admiral's `privilege_check.sh` hook is the primary enforcer.
3. `PrivilegeEnforcer` (SEC-04) validates authority tiers at runtime.
4. Generated Cedar policies serve as documentation of intended enforcement.
5. Audit trail tracks what Leash *would have* enforced.

```
Agent → Tool Call → Admiral Hook Check (app) → PrivilegeEnforcer Check → Execute
```

### Migration Path

1. **Phase 1 (current):** Generate and validate Cedar policies. No external enforcement.
2. **Phase 2:** Deploy Leash in audit-only mode — log what it would block.
3. **Phase 3:** Enable Leash enforcement with Admiral as fallback.
4. **Phase 4:** Leash is authoritative; Admiral hooks are defense-in-depth only.

## Validation

Cedar policies can be validated with the Cedar CLI:
```bash
cedar validate --schema admiral-schema.cedarschema --policies <agent>.cedar
```

Policy correctness tests:
- Every autonomous action has a corresponding `permit`
- Every propose action has a `forbid` with approval gate
- Every escalate action has an unconditional `forbid`
- Standing Order policies are present for all SO-* rules
- No `permit` exists without a corresponding agent definition

## Security Considerations

- **Policy source of truth:** Agent definitions in `fleet/definitions/` are the source. Cedar policies are derived — never edited directly.
- **No Cedar-to-Admiral backflow:** Leash cannot modify Admiral's authority assignments. The flow is unidirectional (ATK-0003 defense extends to Cedar: no agent can modify its own Cedar policies).
- **Stale policy detection:** If an agent definition changes but Cedar policies are not regenerated, a drift detector should flag the discrepancy.
- **Least privilege default:** Unclassified actions default to `escalate` (deny) in both Admiral and Cedar.
