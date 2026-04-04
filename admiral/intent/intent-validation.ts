/**
 * Intent Validation (IE-03)
 *
 * Validates intents for completeness, ambiguity, consistency, achievability,
 * and scope estimation. Returns structured results so callers can decide
 * whether to proceed, warn, or block.
 * Zero external dependencies — Node.js built-ins only.
 */

import type { Intent } from "./intent-schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ValidationResult {
	status: "pass" | "warn" | "fail";
	completeness: { score: number; missing: string[] };
	ambiguity: { found: string[]; suggestions: string[] };
	consistency: { contradictions: string[] };
	achievability: { feasible: boolean; reasons: string[] };
	scopeEstimate: {
		complexity: "simple" | "standard" | "complex";
		agentCount: number;
	};
}

// ---------------------------------------------------------------------------
// Ambiguity detection wordlists
// ---------------------------------------------------------------------------

const VAGUE_TERMS: { term: RegExp; suggestion: string }[] = [
	{
		term: /\bimprove\b/i,
		suggestion: 'Replace "improve" with a measurable target',
	},
	{
		term: /\boptimize\b/i,
		suggestion: 'Replace "optimize" with a specific metric and threshold',
	},
	{
		term: /\bbetter\b/i,
		suggestion: 'Replace "better" with a concrete comparison criterion',
	},
	{
		term: /\bfast(er)?\b/i,
		suggestion: 'Replace "fast/faster" with a latency or throughput target',
	},
	{
		term: /\befficient(ly)?\b/i,
		suggestion: 'Replace "efficient" with a measurable efficiency criterion',
	},
	{
		term: /\bsoon\b/i,
		suggestion: 'Replace "soon" with a specific deadline or timeframe',
	},
	{
		term: /\bnice\b/i,
		suggestion: 'Replace "nice" with specific acceptance criteria',
	},
	{
		term: /\bgood\b/i,
		suggestion: 'Replace "good" with measurable quality criteria',
	},
];

// ---------------------------------------------------------------------------
// IntentValidator
// ---------------------------------------------------------------------------

export class IntentValidator {
	validate(intent: Intent): ValidationResult {
		const completeness = this.checkCompleteness(intent);
		const ambiguity = this.checkAmbiguity(intent);
		const consistency = this.checkConsistency(intent);
		const achievability = this.checkAchievability(intent);
		const scopeEstimate = this.estimateScope(intent);

		// Determine overall status
		let status: "pass" | "warn" | "fail" = "pass";
		if (completeness.score < 50 || !achievability.feasible) {
			status = "fail";
		} else if (
			completeness.missing.length > 0 ||
			ambiguity.found.length > 0 ||
			consistency.contradictions.length > 0
		) {
			status = "warn";
		}

		return {
			status,
			completeness,
			ambiguity,
			consistency,
			achievability,
			scopeEstimate,
		};
	}

	checkCompleteness(intent: Intent): { score: number; missing: string[] } {
		const missing: string[] = [];
		const fields = 6;
		let filled = 0;

		if (intent.goal && intent.goal.trim().length > 0) filled++;
		else missing.push("goal");

		if (intent.constraints.length > 0) filled++;
		else missing.push("constraints");

		if (intent.failureModes.length > 0) filled++;
		else missing.push("failureModes");

		if (intent.judgmentBoundaries.length > 0) filled++;
		else missing.push("judgmentBoundaries");

		if (intent.values.length > 0) filled++;
		else missing.push("values");

		if (intent.createdBy && intent.createdBy.trim().length > 0) filled++;
		else missing.push("createdBy");

		return { score: Math.round((filled / fields) * 100), missing };
	}

	checkAmbiguity(intent: Intent): {
		found: string[];
		suggestions: string[];
	} {
		const found: string[] = [];
		const suggestions: string[] = [];
		const text = [intent.goal, ...intent.constraints, ...intent.values].join(
			" ",
		);

		for (const { term, suggestion } of VAGUE_TERMS) {
			if (term.test(text)) {
				const match = text.match(term);
				if (match) found.push(match[0]);
				suggestions.push(suggestion);
			}
		}

		return { found, suggestions };
	}

	checkConsistency(intent: Intent): { contradictions: string[] } {
		const contradictions: string[] = [];

		// Detect opposing constraint pairs
		const constraintText = intent.constraints.join(" ").toLowerCase();
		const opposites: [string, string][] = [
			["maximize", "minimize"],
			["increase", "decrease"],
			["allow", "forbid"],
			["enable", "disable"],
			["fast", "thorough"],
		];

		for (const [a, b] of opposites) {
			if (constraintText.includes(a) && constraintText.includes(b)) {
				contradictions.push(
					`Constraints contain opposing terms: "${a}" and "${b}"`,
				);
			}
		}

		// Check if priority is low but authority is escalate
		if (intent.priority === "low" && intent.authorityTier === "escalate") {
			contradictions.push(
				"Low-priority intent should not require escalation authority",
			);
		}

		return { contradictions };
	}

	checkAchievability(
		intent: Intent,
		availableAgents?: string[],
	): { feasible: boolean; reasons: string[] } {
		const reasons: string[] = [];
		let feasible = true;

		// Must have a goal
		if (!intent.goal || intent.goal.trim().length === 0) {
			feasible = false;
			reasons.push("No goal specified");
		}

		// If agents are specified, check there is at least one
		if (availableAgents !== undefined && availableAgents.length === 0) {
			feasible = false;
			reasons.push("No agents available to fulfill the intent");
		}

		// If all failure modes are critical and no judgment boundaries, flag risk
		if (
			intent.failureModes.length > 0 &&
			intent.judgmentBoundaries.length === 0
		) {
			reasons.push(
				"Failure modes defined but no judgment boundaries to guard them",
			);
		}

		return { feasible, reasons };
	}

	estimateScope(intent: Intent): {
		complexity: "simple" | "standard" | "complex";
		agentCount: number;
	} {
		let complexity: "simple" | "standard" | "complex" = "simple";
		let agentCount = 1;

		const factors =
			intent.constraints.length +
			intent.failureModes.length +
			intent.judgmentBoundaries.length;

		if (factors > 8) {
			complexity = "complex";
			agentCount = 3;
		} else if (factors > 3) {
			complexity = "standard";
			agentCount = 2;
		}

		// Sub-intents increase agent count
		if (intent.subIntents && intent.subIntents.length > 0) {
			agentCount = Math.max(agentCount, intent.subIntents.length);
		}

		return { complexity, agentCount };
	}
}
