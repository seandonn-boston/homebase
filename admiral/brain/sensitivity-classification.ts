/**
 * Brain Entry Sensitivity Classification (B-19)
 *
 * Assigns sensitivity levels (public/internal/confidential/restricted)
 * to brain entries. Queries filter by agent clearance level. Supports
 * bulk reclassification with audit trail.
 *
 * Uses the same SensitivityLevel taxonomy as S-45 data classification.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Sensitivity levels matching S-45 taxonomy */
export type SensitivityLevel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

/** Numeric ordering for clearance comparison */
const LEVEL_ORDER: Record<SensitivityLevel, number> = {
	PUBLIC: 0,
	INTERNAL: 1,
	CONFIDENTIAL: 2,
	RESTRICTED: 3,
};

/** Agent clearance record */
export interface AgentClearance {
	agentId: string;
	clearanceLevel: SensitivityLevel;
	grantedBy: string;
	grantedAt: string;
}

/** Classified brain entry metadata */
export interface ClassifiedEntry {
	entryId: string;
	sensitivity: SensitivityLevel;
	classifiedBy: string;
	classifiedAt: string;
	reason?: string;
}

/** Reclassification record */
export interface ReclassificationRecord {
	entryId: string;
	previousLevel: SensitivityLevel;
	newLevel: SensitivityLevel;
	reclassifiedBy: string;
	reclassifiedAt: string;
	reason: string;
}

/** Access check result */
export interface AccessCheckResult {
	allowed: boolean;
	agentId: string;
	entryId: string;
	agentClearance: SensitivityLevel;
	entrySensitivity: SensitivityLevel;
	reason: string;
}

// ---------------------------------------------------------------------------
// SensitivityClassifier
// ---------------------------------------------------------------------------

export class SensitivityClassifier {
	private classifications: Map<string, ClassifiedEntry> = new Map();
	private clearances: Map<string, AgentClearance> = new Map();
	private reclassificationLog: ReclassificationRecord[] = [];
	private defaultLevel: SensitivityLevel;

	constructor(defaultLevel: SensitivityLevel = "INTERNAL") {
		this.defaultLevel = defaultLevel;
	}

	/** Classify a brain entry with a sensitivity level */
	classify(
		entryId: string,
		level: SensitivityLevel,
		classifiedBy: string,
		reason?: string,
	): ClassifiedEntry {
		const entry: ClassifiedEntry = {
			entryId,
			sensitivity: level,
			classifiedBy,
			classifiedAt: new Date().toISOString(),
			reason,
		};
		this.classifications.set(entryId, entry);
		return entry;
	}

	/** Get the sensitivity level of an entry */
	getLevel(entryId: string): SensitivityLevel {
		return this.classifications.get(entryId)?.sensitivity ?? this.defaultLevel;
	}

	/** Get classification details */
	getClassification(entryId: string): ClassifiedEntry | undefined {
		return this.classifications.get(entryId);
	}

	/** Register an agent's clearance level */
	grantClearance(clearance: AgentClearance): void {
		this.clearances.set(clearance.agentId, clearance);
	}

	/** Get an agent's clearance level */
	getClearance(agentId: string): SensitivityLevel {
		return this.clearances.get(agentId)?.clearanceLevel ?? "PUBLIC";
	}

	/** Check if an agent can access an entry */
	checkAccess(agentId: string, entryId: string): AccessCheckResult {
		const agentClearance = this.getClearance(agentId);
		const entrySensitivity = this.getLevel(entryId);

		const agentOrder = LEVEL_ORDER[agentClearance];
		const entryOrder = LEVEL_ORDER[entrySensitivity];

		const allowed = agentOrder >= entryOrder;

		return {
			allowed,
			agentId,
			entryId,
			agentClearance,
			entrySensitivity,
			reason: allowed
				? `${agentClearance} clearance sufficient for ${entrySensitivity} entry`
				: `${agentClearance} clearance insufficient for ${entrySensitivity} entry`,
		};
	}

	/** Filter entries by agent clearance */
	filterByAccess(entryIds: string[], agentId: string): string[] {
		return entryIds.filter((id) => this.checkAccess(agentId, id).allowed);
	}

	/** Reclassify an entry to a different level */
	reclassify(
		entryId: string,
		newLevel: SensitivityLevel,
		reclassifiedBy: string,
		reason: string,
	): ReclassificationRecord {
		const previousLevel = this.getLevel(entryId);

		const record: ReclassificationRecord = {
			entryId,
			previousLevel,
			newLevel,
			reclassifiedBy,
			reclassifiedAt: new Date().toISOString(),
			reason,
		};
		this.reclassificationLog.push(record);

		this.classify(entryId, newLevel, reclassifiedBy, reason);

		return record;
	}

	/** Bulk reclassify entries matching a filter */
	bulkReclassify(
		entryIds: string[],
		newLevel: SensitivityLevel,
		reclassifiedBy: string,
		reason: string,
	): ReclassificationRecord[] {
		return entryIds.map((id) =>
			this.reclassify(id, newLevel, reclassifiedBy, reason),
		);
	}

	/** Get all entries at a specific sensitivity level */
	getEntriesByLevel(level: SensitivityLevel): string[] {
		const result: string[] = [];
		for (const [entryId, classification] of this.classifications) {
			if (classification.sensitivity === level) {
				result.push(entryId);
			}
		}
		return result;
	}

	/** Get reclassification audit log */
	getReclassificationLog(): ReclassificationRecord[] {
		return [...this.reclassificationLog];
	}

	/** Compare two sensitivity levels */
	static compareLevels(a: SensitivityLevel, b: SensitivityLevel): number {
		return LEVEL_ORDER[a] - LEVEL_ORDER[b];
	}

	/** Check if a level is valid */
	static isValidLevel(level: string): level is SensitivityLevel {
		return level in LEVEL_ORDER;
	}

	/** Reset (for testing) */
	reset(): void {
		this.classifications.clear();
		this.clearances.clear();
		this.reclassificationLog = [];
	}
}
