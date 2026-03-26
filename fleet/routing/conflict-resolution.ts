/**
 * File Ownership Conflict Resolution (O-08)
 *
 * Detects when multiple agents claim ownership of the same file and
 * resolves conflicts using priority-based strategies: primary-reviewer,
 * decompose, or escalate.
 * Zero external dependencies — Node.js built-ins only.
 */

import type { FileOwnershipRule } from "./engine";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export type ConflictResolution =
	| { strategy: "decompose"; subtasks: string[] }
	| { strategy: "primary-reviewer"; primary: string; reviewers: string[] }
	| { strategy: "escalate"; reason: string };

export interface OwnershipConflict {
	filePath: string;
	claimants: string[]; // agent IDs
	resolution?: ConflictResolution;
}

// ---------------------------------------------------------------------------
// OwnershipConflictResolver
// ---------------------------------------------------------------------------

/**
 * Minimalist glob matching — supports `*` (any segment chars) and `**`
 * (any depth).  Duplicated from engine.ts to avoid coupling to private fn.
 */
function globMatch(pattern: string, filePath: string): boolean {
	const p = pattern.replace(/\\/g, "/");
	const f = filePath.replace(/\\/g, "/");

	let regex = "^";
	let i = 0;
	while (i < p.length) {
		if (p[i] === "*" && p[i + 1] === "*") {
			regex += ".*";
			i += 2;
			if (p[i] === "/") i++;
		} else if (p[i] === "*") {
			regex += "[^/]*";
			i++;
		} else if (p[i] === "?") {
			regex += "[^/]";
			i++;
		} else if (".+^${}()|[]\\".includes(p[i])) {
			regex += "\\" + p[i];
			i++;
		} else {
			regex += p[i];
			i++;
		}
	}
	regex += "$";

	return new RegExp(regex).test(f);
}

export class OwnershipConflictResolver {
	constructor() {}

	detectConflicts(
		filePaths: string[],
		ownershipRules: FileOwnershipRule[],
	): OwnershipConflict[] {
		const conflicts: OwnershipConflict[] = [];

		for (const fp of filePaths) {
			const owners = new Set<string>();
			for (const rule of ownershipRules) {
				if (globMatch(rule.pattern, fp)) {
					owners.add(rule.owner);
				}
			}

			if (owners.size > 1) {
				conflicts.push({
					filePath: fp,
					claimants: Array.from(owners),
				});
			}
		}

		return conflicts;
	}

	resolve(
		conflict: OwnershipConflict,
		agentPriorities?: Record<string, number>,
	): OwnershipConflict {
		const { claimants } = conflict;

		if (!agentPriorities || claimants.length === 0) {
			return {
				...conflict,
				resolution: {
					strategy: "escalate",
					reason: "No priority information available to resolve conflict",
				},
			};
		}

		// Sort by priority descending
		const sorted = [...claimants].sort(
			(a, b) => (agentPriorities[b] ?? 0) - (agentPriorities[a] ?? 0),
		);

		const topPriority = agentPriorities[sorted[0]] ?? 0;
		const secondPriority =
			sorted.length > 1 ? (agentPriorities[sorted[1]] ?? 0) : -1;

		// If highest priority agent is unique, use primary-reviewer
		if (topPriority > secondPriority) {
			return {
				...conflict,
				resolution: {
					strategy: "primary-reviewer",
					primary: sorted[0],
					reviewers: sorted.slice(1),
				},
			};
		}

		// Equal priority: decompose
		const tiedAgents = sorted.filter(
			(a) => (agentPriorities[a] ?? 0) === topPriority,
		);

		if (tiedAgents.length >= 2) {
			return {
				...conflict,
				resolution: {
					strategy: "decompose",
					subtasks: tiedAgents.map((a) => `${a}: handle ${conflict.filePath}`),
				},
			};
		}

		// Fallback: escalate
		return {
			...conflict,
			resolution: {
				strategy: "escalate",
				reason: `Unable to resolve conflict for "${conflict.filePath}" among [${claimants.join(", ")}]`,
			},
		};
	}

	resolveAll(
		conflicts: OwnershipConflict[],
		agentPriorities?: Record<string, number>,
	): OwnershipConflict[] {
		return conflicts.map((c) => this.resolve(c, agentPriorities));
	}
}
