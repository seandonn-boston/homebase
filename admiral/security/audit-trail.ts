/**
 * Security Audit Trail (S-22)
 *
 * Append-only, SHA-256 hash-chained security audit log.
 * Supports recording, chain validation, querying, and JSONL persistence.
 * Zero external dependencies — Node.js built-ins only.
 */

import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecurityAuditEntry {
	id: string;
	timestamp: number;
	type:
		| "blocked_tool"
		| "injection_detected"
		| "privilege_escalation"
		| "pii_detected"
		| "zero_trust_failure"
		| "policy_violation";
	agentId: string;
	action: string;
	details: Record<string, unknown>;
	severity: "critical" | "high" | "medium" | "low";
	prevHash?: string;
	hash: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeHash(data: string): string {
	return createHash("sha256").update(data).digest("hex");
}

// ---------------------------------------------------------------------------
// SecurityAuditTrail
// ---------------------------------------------------------------------------

export class SecurityAuditTrail {
	private entries: SecurityAuditEntry[] = [];
	private lastHash: string = "";
	private logPath?: string;

	constructor(logPath?: string) {
		this.logPath = logPath;
	}

	/** Append a new entry to the trail with hash chain integrity. */
	record(
		entry: Omit<SecurityAuditEntry, "id" | "timestamp" | "prevHash" | "hash">,
	): SecurityAuditEntry {
		const id = `sec_${randomUUID()}`;
		const timestamp = Date.now();
		const prevHash = this.lastHash || undefined;

		const hashInput = JSON.stringify({
			id,
			timestamp,
			type: entry.type,
			agentId: entry.agentId,
			action: entry.action,
			details: entry.details,
			severity: entry.severity,
			prevHash: prevHash ?? "",
		});

		const hash = computeHash(hashInput);

		const full: SecurityAuditEntry = {
			...entry,
			id,
			timestamp,
			prevHash,
			hash,
		};

		this.entries.push(full);
		this.lastHash = hash;

		return full;
	}

	/** Verify SHA-256 hash chain integrity. */
	validateChain(): { valid: boolean; breakPosition?: number } {
		let _prevHash = "";

		for (let i = 0; i < this.entries.length; i++) {
			const e = this.entries[i];

			// Check prevHash linkage
			if (i === 0) {
				if (e.prevHash !== undefined && e.prevHash !== "") {
					return { valid: false, breakPosition: i };
				}
			} else {
				if (e.prevHash !== this.entries[i - 1].hash) {
					return { valid: false, breakPosition: i };
				}
			}

			// Recompute hash
			const hashInput = JSON.stringify({
				id: e.id,
				timestamp: e.timestamp,
				type: e.type,
				agentId: e.agentId,
				action: e.action,
				details: e.details,
				severity: e.severity,
				prevHash: e.prevHash ?? "",
			});

			const expected = computeHash(hashInput);
			if (e.hash !== expected) {
				return { valid: false, breakPosition: i };
			}

			_prevHash = e.hash;
		}

		return { valid: true };
	}

	/** Query entries with optional filters. */
	query(filter?: {
		type?: string;
		agentId?: string;
		since?: number;
		severity?: string;
	}): SecurityAuditEntry[] {
		if (!filter) return [...this.entries];

		return this.entries.filter((e) => {
			if (filter.type && e.type !== filter.type) return false;
			if (filter.agentId && e.agentId !== filter.agentId) return false;
			if (filter.since != null && e.timestamp < filter.since) return false;
			if (filter.severity && e.severity !== filter.severity) return false;
			return true;
		});
	}

	/** Append entries to JSONL file. */
	async save(): Promise<void> {
		if (!this.logPath) return;
		const lines = this.entries.map((e) => JSON.stringify(e)).join("\n");
		await writeFile(this.logPath, `${lines}\n`, "utf-8");
	}

	/** Load entries from JSONL file, rebuilding the hash chain state. */
	async load(): Promise<void> {
		if (!this.logPath) return;

		let data: string;
		try {
			data = await readFile(this.logPath, "utf-8");
		} catch {
			// File doesn't exist yet
			return;
		}

		const lines = data.split("\n").filter((l) => l.trim().length > 0);
		this.entries = lines.map((l) => JSON.parse(l) as SecurityAuditEntry);

		if (this.entries.length > 0) {
			this.lastHash = this.entries[this.entries.length - 1].hash;
		}
	}

	/** Get summary statistics. */
	getStats(): {
		total: number;
		bySeverity: Record<string, number>;
		byType: Record<string, number>;
	} {
		const bySeverity: Record<string, number> = {};
		const byType: Record<string, number> = {};

		for (const e of this.entries) {
			bySeverity[e.severity] = (bySeverity[e.severity] ?? 0) + 1;
			byType[e.type] = (byType[e.type] ?? 0) + 1;
		}

		return { total: this.entries.length, bySeverity, byType };
	}
}
