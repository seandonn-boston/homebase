/**
 * Admiral Framework — Intervention Catalog (OB-14)
 *
 * Complete catalog of operator intervention actions with
 * metadata for confirmation, reversibility, and audit requirements.
 */

import type { InterventionType } from "./intervention-auth";

export interface InterventionAction {
  type: InterventionType;
  description: string;
  confirmationRequired: boolean;
  reversible: boolean;
  reversalPath: string;
  auditFields: string[];
}

export const INTERVENTION_CATALOG: InterventionAction[] = [
  {
    type: "pause_agent",
    description: "Temporarily suspend an agent's execution",
    confirmationRequired: false,
    reversible: true,
    reversalPath: "resume_agent",
    auditFields: ["agentId", "reason", "operatorId"],
  },
  {
    type: "emergency_halt",
    description: "Immediately halt all agent operations",
    confirmationRequired: true,
    reversible: true,
    reversalPath: "resume_agent (each agent individually)",
    auditFields: ["reason", "operatorId", "scope"],
  },
  {
    type: "kill_task",
    description: "Terminate a specific task and clean up resources",
    confirmationRequired: true,
    reversible: false,
    reversalPath: "N/A — task must be re-created",
    auditFields: ["taskId", "agentId", "reason", "operatorId"],
  },
  {
    type: "adjust_budget",
    description: "Modify the token budget for a session or agent",
    confirmationRequired: false,
    reversible: true,
    reversalPath: "adjust_budget (restore previous value)",
    auditFields: ["sessionId", "previousBudget", "newBudget", "operatorId"],
  },
  {
    type: "override_propose",
    description: "Override an agent's proposed action with a different one",
    confirmationRequired: true,
    reversible: false,
    reversalPath: "N/A — original proposal is logged for audit",
    auditFields: ["agentId", "originalProposal", "override", "reason", "operatorId"],
  },
  {
    type: "reroute_task",
    description: "Reassign a task from one agent to another",
    confirmationRequired: true,
    reversible: true,
    reversalPath: "reroute_task (back to original agent)",
    auditFields: ["taskId", "fromAgentId", "toAgentId", "reason", "operatorId"],
  },
  {
    type: "promote_tier",
    description: "Promote an agent to a higher capability tier",
    confirmationRequired: false,
    reversible: true,
    reversalPath: "demote_tier",
    auditFields: ["agentId", "fromTier", "toTier", "reason", "operatorId"],
  },
  {
    type: "demote_tier",
    description: "Demote an agent to a lower capability tier",
    confirmationRequired: false,
    reversible: true,
    reversalPath: "promote_tier",
    auditFields: ["agentId", "fromTier", "toTier", "reason", "operatorId"],
  },
  {
    type: "modify_policies",
    description: "Change governance policies affecting all agents",
    confirmationRequired: true,
    reversible: true,
    reversalPath: "modify_policies (restore previous configuration)",
    auditFields: ["policyId", "previousConfig", "newConfig", "reason", "operatorId"],
  },
  {
    type: "resume_agent",
    description: "Resume a previously paused or halted agent",
    confirmationRequired: true,
    reversible: true,
    reversalPath: "pause_agent",
    auditFields: ["agentId", "originalPauseReason", "operatorId"],
  },
];

/**
 * Look up an intervention action by type.
 */
export function getInterventionAction(type: string): InterventionAction | undefined {
  return INTERVENTION_CATALOG.find((a) => a.type === type);
}

/**
 * Get all reversible intervention actions.
 */
export function getReversibleActions(): InterventionAction[] {
  return INTERVENTION_CATALOG.filter((a) => a.reversible);
}

/**
 * Check whether an intervention type requires confirmation.
 */
export function requiresConfirmation(type: string): boolean {
  const action = getInterventionAction(type);
  return action?.confirmationRequired ?? true; // default to requiring confirmation
}
