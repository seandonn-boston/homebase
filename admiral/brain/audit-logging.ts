/**
 * Brain Audit Logging (B-20)
 *
 * Append-only log of all Brain operations, queryable by time, agent,
 * operation type, and entry ID. Configurable retention policy.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Brain operation types */
export type BrainOperation =
	| "insert"
	| "update"
	| "delete"
	| "query"
	| "retrieve"
	| "link_add"
	| "link_remove"
	| "strengthen"
	| "supersede"
	| "purge"
	| "export"
	| "import"
	| "classify"
	| "reclassify";

/** Single audit log entry */
export interface BrainAuditEntry {
	id: string;
	operation: BrainOperation;
	entryId?: string;
	agentId: string;
	timestamp: number;
	details: Record<string, unknown>;
}

/** Query filter for audit log */
export interface AuditQuery {
	since?: number;
	until?: number;
	agentId?: string;
	operation?: BrainOperation;
	entryId?: string;
	limit?: number;
}

/** Retention policy */
export interface RetentionPolicy {
	maxEntries?: number;
	maxAgeMs?: number;
}

/** Audit summary statistics */
export interface AuditSummary {
	totalEntries: number;
	operationCounts: Partial<Record<BrainOperation, number>>;
	uniqueAgents: number;
	oldestEntry?: number;
	newestEntry?: number;
}

// ---------------------------------------------------------------------------
// BrainAuditLog
// ---------------------------------------------------------------------------

let auditIdCounter = 0;

export class BrainAuditLog {
	private entries: BrainAuditEntry[] = [];
	private retention: RetentionPolicy;

	constructor(retention?: RetentionPolicy) {
		this.retention = retention ?? {};
	}

	/** Record a brain operation */
	record(
		operation: BrainOperation,
		agentId: string,
		entryId?: string,
		details?: Record<string, unknown>,
	): BrainAuditEntry {
		const entry: BrainAuditEntry = {
			id: `audit-${++auditIdCounter}`,
			operation,
			entryId,
			agentId,
			timestamp: Date.now(),
			details: details ?? {},
		};

		this.entries.push(entry);
		this.enforceRetention();

		return entry;
	}

	/** Query the audit log with filters */
	query(filter: AuditQuery): BrainAuditEntry[] {
		let result = [...this.entries];

		if (filter.since !== undefined) {
			result = result.filter((e) => e.timestamp >= filter.since!);
		}

		if (filter.until !== undefined) {
			result = result.filter((e) => e.timestamp <= filter.until!);
		}

		if (filter.agentId !== undefined) {
			result = result.filter((e) => e.agentId === filter.agentId);
		}

		if (filter.operation !== undefined) {
			result = result.filter((e) => e.operation === filter.operation);
		}

		if (filter.entryId !== undefined) {
			result = result.filter((e) => e.entryId === filter.entryId);
		}

		if (filter.limit !== undefined) {
			result = result.slice(-filter.limit);
		}

		return result;
	}

	/** Get operations for a specific entry */
	getEntryHistory(entryId: string): BrainAuditEntry[] {
		return this.entries.filter((e) => e.entryId === entryId);
	}

	/** Get operations by a specific agent */
	getAgentActivity(agentId: string): BrainAuditEntry[] {
		return this.entries.filter((e) => e.agentId === agentId);
	}

	/** Get summary statistics */
	getSummary(): AuditSummary {
		const operationCounts: Partial<Record<BrainOperation, number>> = {};
		const agents = new Set<string>();

		for (const entry of this.entries) {
			operationCounts[entry.operation] =
				(operationCounts[entry.operation] ?? 0) + 1;
			agents.add(entry.agentId);
		}

		return {
			totalEntries: this.entries.length,
			operationCounts,
			uniqueAgents: agents.size,
			oldestEntry: this.entries.length > 0 ? this.entries[0].timestamp : undefined,
			newestEntry:
				this.entries.length > 0
					? this.entries[this.entries.length - 1].timestamp
					: undefined,
		};
	}

	/** Get total entry count */
	getCount(): number {
		return this.entries.length;
	}

	/** Update retention policy */
	setRetention(policy: RetentionPolicy): void {
		this.retention = policy;
		this.enforceRetention();
	}

	/** Enforce retention policy by removing old/excess entries */
	private enforceRetention(): void {
		if (this.retention.maxAgeMs !== undefined) {
			const cutoff = Date.now() - this.retention.maxAgeMs;
			this.entries = this.entries.filter((e) => e.timestamp >= cutoff);
		}

		if (
			this.retention.maxEntries !== undefined &&
			this.entries.length > this.retention.maxEntries
		) {
			this.entries = this.entries.slice(-this.retention.maxEntries);
		}
	}

	/** Export log as JSONL string */
	exportJsonl(): string {
		return this.entries.map((e) => JSON.stringify(e)).join("\n");
	}

	/** Reset (for testing) */
	reset(): void {
		this.entries = [];
	}
}
