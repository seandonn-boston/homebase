/**
 * Intent Decomposition (IE-02)
 *
 * Breaks a high-level intent into sub-intents, assigns authority tiers,
 * validates the dependency graph, and produces a parallel execution order.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import type { AuthorityTier, Intent } from "./intent-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubIntent {
	id: string;
	parentId: string;
	description: string;
	authorityTier: AuthorityTier;
	agentCategory: string;
	dependencies: string[];
	constraints: string[];
	budget?: number;
	order: number;
}

export interface DecompositionResult {
	parentIntent: string;
	subIntents: SubIntent[];
	dependencyGraph: { from: string; to: string }[];
	warnings: string[];
}

export interface DecomposeHints {
	aspects?: string[];
	maxDepth?: number;
}

// ---------------------------------------------------------------------------
// Risk → authority mapping
// ---------------------------------------------------------------------------

const HIGH_RISK_KEYWORDS = [
	"delete",
	"remove",
	"production",
	"deploy",
	"security",
	"credential",
	"secret",
];
const MEDIUM_RISK_KEYWORDS = [
	"modify",
	"update",
	"migrate",
	"refactor",
	"config",
];

function assessAuthorityTier(description: string): AuthorityTier {
	const lower = description.toLowerCase();
	if (HIGH_RISK_KEYWORDS.some((kw) => lower.includes(kw))) return "escalate";
	if (MEDIUM_RISK_KEYWORDS.some((kw) => lower.includes(kw))) return "propose";
	return "autonomous";
}

// ---------------------------------------------------------------------------
// IntentDecomposer
// ---------------------------------------------------------------------------

export class IntentDecomposer {
	decompose(intent: Intent, hints?: DecomposeHints): DecompositionResult {
		const aspects = hints?.aspects ?? this.inferAspects(intent);
		const warnings: string[] = [];
		const subIntents: SubIntent[] = [];
		const depGraph: { from: string; to: string }[] = [];

		for (let i = 0; i < aspects.length; i++) {
			const aspect = aspects[i];
			const sub: SubIntent = {
				id: randomUUID(),
				parentId: intent.id,
				description: aspect,
				authorityTier: assessAuthorityTier(aspect),
				agentCategory: this.inferAgentCategory(aspect),
				dependencies: [],
				constraints: [...intent.constraints],
				order: i,
			};
			subIntents.push(sub);
		}

		// Chain sequential dependencies by default (each depends on the previous)
		for (let i = 1; i < subIntents.length; i++) {
			subIntents[i].dependencies.push(subIntents[i - 1].id);
			depGraph.push({ from: subIntents[i].id, to: subIntents[i - 1].id });
		}

		if (subIntents.length === 0) {
			warnings.push("No aspects could be inferred; provide hints");
		}

		return {
			parentIntent: intent.id,
			subIntents,
			dependencyGraph: depGraph,
			warnings,
		};
	}

	validateDecomposition(result: DecompositionResult): string[] {
		const errors: string[] = [];
		const ids = new Set(result.subIntents.map((s) => s.id));

		// Check for references to non-existent sub-intents
		for (const sub of result.subIntents) {
			for (const dep of sub.dependencies) {
				if (!ids.has(dep)) {
					errors.push(
						`Sub-intent ${sub.id} depends on unknown ID: ${dep}`,
					);
				}
			}
		}

		// Circular dependency detection via topological sort
		if (this.hasCycle(result.subIntents)) {
			errors.push("Circular dependency detected in sub-intents");
		}

		// Constraints preserved
		if (result.subIntents.length > 0) {
			const parentConstraintCount = result.subIntents[0].constraints.length;
			for (const sub of result.subIntents) {
				if (sub.constraints.length < parentConstraintCount) {
					errors.push(
						`Sub-intent ${sub.id} lost parent constraints`,
					);
				}
			}
		}

		return errors;
	}

	getExecutionOrder(subIntents: SubIntent[]): SubIntent[][] {
		const idMap = new Map(subIntents.map((s) => [s.id, s]));
		const remaining = new Set(subIntents.map((s) => s.id));
		const completed = new Set<string>();
		const result: SubIntent[][] = [];

		while (remaining.size > 0) {
			const batch: SubIntent[] = [];
			for (const id of remaining) {
				const sub = idMap.get(id)!;
				const depsReady = sub.dependencies.every((d) =>
					completed.has(d),
				);
				if (depsReady) {
					batch.push(sub);
				}
			}

			if (batch.length === 0) {
				// Remaining items have unresolvable deps (cycle or missing)
				break;
			}

			for (const item of batch) {
				remaining.delete(item.id);
				completed.add(item.id);
			}
			result.push(batch);
		}

		return result;
	}

	// -----------------------------------------------------------------------
	// Private helpers
	// -----------------------------------------------------------------------

	private inferAspects(intent: Intent): string[] {
		// Split goal on common delimiters: "and", ",", ";"
		const parts = intent.goal
			.split(/\band\b|,|;/i)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		return parts.length > 1 ? parts : [intent.goal];
	}

	private inferAgentCategory(description: string): string {
		const lower = description.toLowerCase();
		if (lower.includes("test") || lower.includes("verify"))
			return "quality";
		if (lower.includes("deploy") || lower.includes("build")) return "ops";
		if (lower.includes("security") || lower.includes("audit"))
			return "security";
		if (lower.includes("document") || lower.includes("docs"))
			return "documentation";
		return "engineering";
	}

	private hasCycle(subIntents: SubIntent[]): boolean {
		const visited = new Set<string>();
		const inStack = new Set<string>();
		const idMap = new Map(subIntents.map((s) => [s.id, s]));

		const dfs = (id: string): boolean => {
			if (inStack.has(id)) return true;
			if (visited.has(id)) return false;
			visited.add(id);
			inStack.add(id);
			const sub = idMap.get(id);
			if (sub) {
				for (const dep of sub.dependencies) {
					if (dfs(dep)) return true;
				}
			}
			inStack.delete(id);
			return false;
		};

		for (const sub of subIntents) {
			if (dfs(sub.id)) return true;
		}
		return false;
	}
}
