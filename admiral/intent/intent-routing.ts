/**
 * Intent Routing (IE-05)
 *
 * Maps decomposed sub-intents to agent categories and selects a
 * coordination pattern (sequential, parallel, pipeline).
 * Zero external dependencies — Node.js built-ins only.
 */

import type { DecompositionResult, SubIntent } from "./intent-decomposition";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IntentAssignment {
	subIntentId: string;
	agentCategory: string;
	modelTier: string;
	rationale: string;
}

export interface IntentRoutingPlan {
	intentId: string;
	assignments: IntentAssignment[];
	coordinationPattern: "sequential" | "parallel" | "pipeline";
	fallbackRouting: string[];
}

// ---------------------------------------------------------------------------
// Model tier mapping
// ---------------------------------------------------------------------------

const TIER_BY_AUTHORITY: Record<string, string> = {
	autonomous: "standard",
	propose: "enhanced",
	escalate: "premium",
};

const FALLBACK_AGENTS: Record<string, string> = {
	engineering: "general-engineering",
	quality: "general-quality",
	ops: "general-ops",
	security: "general-security",
	documentation: "general-documentation",
};

// ---------------------------------------------------------------------------
// IntentRouter
// ---------------------------------------------------------------------------

export class IntentRouter {
	createRoutingPlan(decomposition: DecompositionResult): IntentRoutingPlan {
		const assignments: IntentAssignment[] = decomposition.subIntents.map(
			(sub) => ({
				subIntentId: sub.id,
				agentCategory: sub.agentCategory,
				modelTier: TIER_BY_AUTHORITY[sub.authorityTier] ?? "standard",
				rationale: this.buildRationale(sub),
			}),
		);

		const coordinationPattern = this.selectCoordinationPattern(
			decomposition.subIntents,
		);

		// Build fallback routing from unique agent categories
		const categories = [
			...new Set(decomposition.subIntents.map((s) => s.agentCategory)),
		];
		const fallbackRouting = categories.map(
			(cat) => FALLBACK_AGENTS[cat] ?? `general-${cat}`,
		);

		return {
			intentId: decomposition.parentIntent,
			assignments,
			coordinationPattern,
			fallbackRouting,
		};
	}

	selectCoordinationPattern(
		subIntents: SubIntent[],
	): "sequential" | "parallel" | "pipeline" {
		if (subIntents.length <= 1) return "sequential";

		const hasDeps = subIntents.some((s) => s.dependencies.length > 0);
		if (!hasDeps) return "parallel";

		// Check if it's a strict chain (pipeline): each depends only on the previous
		const isChain = subIntents.every((s, i) => {
			if (i === 0) return s.dependencies.length === 0;
			return (
				s.dependencies.length === 1 &&
				s.dependencies[0] === subIntents[i - 1].id
			);
		});

		if (isChain) return "pipeline";

		// Mixed dependencies → sequential (safest)
		return "sequential";
	}

	// -----------------------------------------------------------------------
	// Private
	// -----------------------------------------------------------------------

	private buildRationale(sub: SubIntent): string {
		const parts: string[] = [];
		parts.push(`Category: ${sub.agentCategory}`);
		parts.push(`Authority: ${sub.authorityTier}`);
		if (sub.dependencies.length > 0) {
			parts.push(`Depends on ${sub.dependencies.length} prior task(s)`);
		}
		return parts.join("; ");
	}
}
