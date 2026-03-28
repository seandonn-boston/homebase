/**
 * Privilege Escalation Hardening (SEC-04)
 *
 * Runtime authority tier enforcement: validates that agents only perform
 * actions within their assigned authority tier (autonomous/propose/escalate).
 * Prevents self-modification of authority assignments, enforces tool+authority
 * binding, and tracks privilege check decisions for audit.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Authority tier from agent-definition.v1.schema */
export type AuthorityTier = "autonomous" | "propose" | "escalate";

/** Agent's authority configuration */
export interface AgentAuthority {
	agentId: string;
	autonomous: string[];
	propose: string[];
	escalate: string[];
}

/** Result of a privilege check */
export interface PrivilegeCheckResult {
	allowed: boolean;
	agentId: string;
	action: string;
	requiredTier: AuthorityTier;
	agentTier: AuthorityTier;
	reason: string;
	timestamp: string;
}

/** Privilege violation record */
export interface PrivilegeViolation {
	agentId: string;
	action: string;
	attemptedTier: AuthorityTier;
	assignedTier: AuthorityTier;
	timestamp: string;
	blocked: boolean;
}

// ---------------------------------------------------------------------------
// PrivilegeEnforcer
// ---------------------------------------------------------------------------

export class PrivilegeEnforcer {
	private authorities: Map<string, AgentAuthority> = new Map();
	private violations: PrivilegeViolation[] = [];
	private checkLog: PrivilegeCheckResult[] = [];

	/** Register an agent's authority configuration */
	registerAgent(authority: AgentAuthority): void {
		this.authorities.set(authority.agentId, authority);
	}

	/** Load authority from an agent definition JSON object */
	loadFromDefinition(definition: {
		agent_id: string;
		authority?: {
			autonomous?: string[];
			propose?: string[];
			escalate?: string[];
		};
	}): void {
		this.registerAgent({
			agentId: definition.agent_id,
			autonomous: definition.authority?.autonomous ?? [],
			propose: definition.authority?.propose ?? [],
			escalate: definition.authority?.escalate ?? [],
		});
	}

	/** Determine which tier an action falls into for a given agent */
	getActionTier(agentId: string, action: string): AuthorityTier | null {
		const auth = this.authorities.get(agentId);
		if (!auth) return null;

		if (auth.autonomous.includes(action)) return "autonomous";
		if (auth.propose.includes(action)) return "propose";
		if (auth.escalate.includes(action)) return "escalate";

		// Default: escalate for unclassified actions (fail-safe)
		return "escalate";
	}

	/**
	 * Check if an agent is allowed to perform an action autonomously.
	 * Only "autonomous" tier actions can proceed without approval.
	 */
	checkPrivilege(agentId: string, action: string): PrivilegeCheckResult {
		const auth = this.authorities.get(agentId);
		const timestamp = new Date().toISOString();

		if (!auth) {
			const result: PrivilegeCheckResult = {
				allowed: false,
				agentId,
				action,
				requiredTier: "autonomous",
				agentTier: "escalate",
				reason: `Agent '${agentId}' has no registered authority — default deny`,
				timestamp,
			};
			this.checkLog.push(result);
			this.violations.push({
				agentId,
				action,
				attemptedTier: "autonomous",
				assignedTier: "escalate",
				timestamp,
				blocked: true,
			});
			return result;
		}

		const tier = this.getActionTier(agentId, action);
		const requiredTier: AuthorityTier = "autonomous";

		if (tier === "autonomous") {
			const result: PrivilegeCheckResult = {
				allowed: true,
				agentId,
				action,
				requiredTier,
				agentTier: "autonomous",
				reason: `Action '${action}' is autonomous for agent '${agentId}'`,
				timestamp,
			};
			this.checkLog.push(result);
			return result;
		}

		const agentTier = tier ?? "escalate";
		const result: PrivilegeCheckResult = {
			allowed: false,
			agentId,
			action,
			requiredTier,
			agentTier,
			reason: `Action '${action}' requires '${agentTier}' for agent '${agentId}' — autonomous execution denied`,
			timestamp,
		};
		this.checkLog.push(result);
		this.violations.push({
			agentId,
			action,
			attemptedTier: "autonomous",
			assignedTier: agentTier,
			timestamp,
			blocked: true,
		});
		return result;
	}

	/**
	 * Validate that an agent is not attempting to modify its own authority.
	 * ATK-0003 defense: authority tier self-modification prevention.
	 */
	checkSelfModification(
		agentId: string,
		targetAgentId: string,
		fieldPath: string,
	): PrivilegeCheckResult {
		const timestamp = new Date().toISOString();
		const isSelfModification = agentId === targetAgentId;
		const isAuthorityField = fieldPath.startsWith("authority");

		if (isSelfModification && isAuthorityField) {
			const result: PrivilegeCheckResult = {
				allowed: false,
				agentId,
				action: `modify:${targetAgentId}.${fieldPath}`,
				requiredTier: "escalate",
				agentTier: "escalate",
				reason: "Agents cannot modify their own authority tier (ATK-0003 defense)",
				timestamp,
			};
			this.checkLog.push(result);
			this.violations.push({
				agentId,
				action: `self_modify_authority:${fieldPath}`,
				attemptedTier: "autonomous",
				assignedTier: "escalate",
				timestamp,
				blocked: true,
			});
			return result;
		}

		const result: PrivilegeCheckResult = {
			allowed: true,
			agentId,
			action: `modify:${targetAgentId}.${fieldPath}`,
			requiredTier: "autonomous",
			agentTier: "autonomous",
			reason: isAuthorityField
				? `Authority modification of '${targetAgentId}' by '${agentId}' — cross-agent allowed`
				: `Field '${fieldPath}' is not authority-related — allowed`,
			timestamp,
		};
		this.checkLog.push(result);
		return result;
	}

	/**
	 * Check delegation privilege: the delegated task's authority tier
	 * must not exceed the delegating agent's authority for that action.
	 * ATK-0010 defense: minimum privilege inheritance.
	 */
	checkDelegation(
		delegatorId: string,
		delegateeId: string,
		action: string,
	): PrivilegeCheckResult {
		const timestamp = new Date().toISOString();
		const delegatorTier = this.getActionTier(delegatorId, action);
		const delegateeTier = this.getActionTier(delegateeId, action);

		// If delegator doesn't have autonomous access, delegatee can't get it
		if (delegatorTier !== "autonomous" && delegateeTier === "autonomous") {
			const result: PrivilegeCheckResult = {
				allowed: false,
				agentId: delegatorId,
				action: `delegate:${action}:to:${delegateeId}`,
				requiredTier: "autonomous",
				agentTier: delegatorTier ?? "escalate",
				reason: `Delegation denied: delegator '${delegatorId}' has '${delegatorTier}' for '${action}', cannot grant '${delegateeTier}' to '${delegateeId}' (ATK-0010)`,
				timestamp,
			};
			this.checkLog.push(result);
			this.violations.push({
				agentId: delegatorId,
				action: `privilege_inheritance:${action}`,
				attemptedTier: "autonomous",
				assignedTier: delegatorTier ?? "escalate",
				timestamp,
				blocked: true,
			});
			return result;
		}

		const result: PrivilegeCheckResult = {
			allowed: true,
			agentId: delegatorId,
			action: `delegate:${action}:to:${delegateeId}`,
			requiredTier: "autonomous",
			agentTier: delegatorTier ?? "escalate",
			reason: `Delegation allowed: minimum privilege inheritance satisfied`,
			timestamp,
		};
		this.checkLog.push(result);
		return result;
	}

	/** Get all recorded violations */
	getViolations(): PrivilegeViolation[] {
		return [...this.violations];
	}

	/** Get the privilege check audit log */
	getCheckLog(): PrivilegeCheckResult[] {
		return [...this.checkLog];
	}

	/** Get agent's authority config */
	getAgentAuthority(agentId: string): AgentAuthority | undefined {
		return this.authorities.get(agentId);
	}

	/** Reset all state (for testing) */
	reset(): void {
		this.authorities.clear();
		this.violations = [];
		this.checkLog = [];
	}
}
