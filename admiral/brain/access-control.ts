/**
 * Brain Access Control Enforcement (B-15)
 *
 * Per-agent per-entry clearance levels (read-only, contributor, admin),
 * write scoping by project, and access decisions logged.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Access level for brain operations */
export type AccessLevel = "read-only" | "contributor" | "admin";

/** Access level numeric ordering */
const ACCESS_ORDER: Record<AccessLevel, number> = {
	"read-only": 0,
	contributor: 1,
	admin: 2,
};

/** Per-agent access grant */
export interface AccessGrant {
	agentId: string;
	level: AccessLevel;
	scope: string;
	grantedBy: string;
	grantedAt: string;
	expiresAt?: string;
}

/** Per-entry access override */
export interface EntryAccessOverride {
	entryId: string;
	agentId: string;
	level: AccessLevel;
	setBy: string;
	setAt: string;
}

/** Access decision record */
export interface AccessDecision {
	agentId: string;
	entryId: string;
	operation: "read" | "write" | "delete" | "admin";
	allowed: boolean;
	reason: string;
	timestamp: string;
	effectiveLevel: AccessLevel;
	requiredLevel: AccessLevel;
}

/** Operation to minimum access level mapping */
const OPERATION_REQUIREMENTS: Record<string, AccessLevel> = {
	read: "read-only",
	write: "contributor",
	delete: "admin",
	admin: "admin",
};

// ---------------------------------------------------------------------------
// AccessController
// ---------------------------------------------------------------------------

export class AccessController {
	private grants: Map<string, AccessGrant[]> = new Map();
	private entryOverrides: Map<string, EntryAccessOverride[]> = new Map();
	private decisions: AccessDecision[] = [];
	private defaultLevel: AccessLevel;

	constructor(defaultLevel: AccessLevel = "read-only") {
		this.defaultLevel = defaultLevel;
	}

	/** Grant access level to an agent for a scope */
	grant(grant: AccessGrant): void {
		const agentGrants = this.grants.get(grant.agentId) ?? [];
		agentGrants.push(grant);
		this.grants.set(grant.agentId, agentGrants);
	}

	/** Set per-entry access override */
	setEntryOverride(override: EntryAccessOverride): void {
		const overrides = this.entryOverrides.get(override.entryId) ?? [];
		// Replace existing override for same agent
		const idx = overrides.findIndex((o) => o.agentId === override.agentId);
		if (idx >= 0) {
			overrides[idx] = override;
		} else {
			overrides.push(override);
		}
		this.entryOverrides.set(override.entryId, overrides);
	}

	/** Get effective access level for an agent on a specific entry */
	getEffectiveLevel(
		agentId: string,
		entryId: string,
		entryScope?: string,
	): AccessLevel {
		// Check per-entry override first (highest priority)
		const overrides = this.entryOverrides.get(entryId) ?? [];
		const entryOverride = overrides.find((o) => o.agentId === agentId);
		if (entryOverride) return entryOverride.level;

		// Check agent grants matching scope
		const agentGrants = this.grants.get(agentId) ?? [];
		const now = new Date().toISOString();

		let highestLevel = this.defaultLevel;
		for (const grant of agentGrants) {
			// Skip expired grants
			if (grant.expiresAt && grant.expiresAt < now) continue;

			// Check scope match (wildcard "*" matches everything)
			if (grant.scope === "*" || grant.scope === entryScope) {
				if (ACCESS_ORDER[grant.level] > ACCESS_ORDER[highestLevel]) {
					highestLevel = grant.level;
				}
			}
		}

		return highestLevel;
	}

	/** Check if an agent can perform an operation on an entry */
	checkAccess(
		agentId: string,
		entryId: string,
		operation: "read" | "write" | "delete" | "admin",
		entryScope?: string,
	): AccessDecision {
		const effectiveLevel = this.getEffectiveLevel(agentId, entryId, entryScope);
		const requiredLevel = OPERATION_REQUIREMENTS[operation];
		const allowed = ACCESS_ORDER[effectiveLevel] >= ACCESS_ORDER[requiredLevel];

		const decision: AccessDecision = {
			agentId,
			entryId,
			operation,
			allowed,
			reason: allowed
				? `${effectiveLevel} access sufficient for ${operation}`
				: `${effectiveLevel} access insufficient for ${operation} (requires ${requiredLevel})`,
			timestamp: new Date().toISOString(),
			effectiveLevel,
			requiredLevel,
		};

		this.decisions.push(decision);
		return decision;
	}

	/** Filter entries that an agent can read */
	filterReadable(entryIds: string[], agentId: string, entryScopes?: Map<string, string>): string[] {
		return entryIds.filter((id) => {
			const scope = entryScopes?.get(id);
			return this.checkAccess(agentId, id, "read", scope).allowed;
		});
	}

	/** Filter entries that an agent can write */
	filterWritable(entryIds: string[], agentId: string, entryScopes?: Map<string, string>): string[] {
		return entryIds.filter((id) => {
			const scope = entryScopes?.get(id);
			return this.checkAccess(agentId, id, "write", scope).allowed;
		});
	}

	/** Get access decision log */
	getDecisionLog(): AccessDecision[] {
		return [...this.decisions];
	}

	/** Get decisions for a specific agent */
	getAgentDecisions(agentId: string): AccessDecision[] {
		return this.decisions.filter((d) => d.agentId === agentId);
	}

	/** Get grants for an agent */
	getAgentGrants(agentId: string): AccessGrant[] {
		return [...(this.grants.get(agentId) ?? [])];
	}

	/** Revoke all grants for an agent */
	revokeAll(agentId: string): number {
		const count = (this.grants.get(agentId) ?? []).length;
		this.grants.delete(agentId);
		return count;
	}

	/** Reset (for testing) */
	reset(): void {
		this.grants.clear();
		this.entryOverrides.clear();
		this.decisions = [];
	}
}
