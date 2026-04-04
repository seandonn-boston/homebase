/**
 * Intent Operations (IE-04, IE-06, IE-07, IE-08, IE-09, IE-10)
 *
 * Dashboard, history tracking, templates, conflict detection,
 * inflection point detection, and judgment boundary enforcement.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import type { Intent, IntentCapture, IntentPriority } from "./intent-schema.js";

// ---------------------------------------------------------------------------
// IE-04: Intent tracking dashboard
// ---------------------------------------------------------------------------

export interface IntentDashboardData {
	activeIntents: {
		id: string;
		goal: string;
		status: string;
		progress: number;
	}[];
	completionRate: number;
	avgCompletionTime: number;
	healthIndicators: {
		intentId: string;
		health: "healthy" | "at_risk" | "failing";
		reason: string;
	}[];
	constraintViolations: {
		intentId: string;
		constraint: string;
		violation: string;
	}[];
}

export class IntentDashboard {
	constructor(private capture: IntentCapture) {}

	getData(): IntentDashboardData {
		const all = this.capture.getAll();
		const active = this.capture.getActive();

		const completed = all.filter((i) => i.status === "completed");
		const _failed = all.filter((i) => i.status === "failed");

		const completionRate = all.length > 0 ? completed.length / all.length : 0;

		// Avg completion time for completed intents
		const completionTimes = completed
			.filter((i) => i.metadata?.completedAt)
			.map((i) => (i.metadata.completedAt as number) - i.createdAt);
		const avgCompletionTime =
			completionTimes.length > 0
				? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
				: 0;

		const healthIndicators = active.map((intent) => ({
			intentId: intent.id,
			health: this.getHealthIndicator(intent),
			reason: this.getHealthReason(intent),
		}));

		const constraintViolations: IntentDashboardData["constraintViolations"] =
			[];
		for (const intent of active) {
			if (intent.metadata?.violations) {
				for (const v of intent.metadata.violations as {
					constraint: string;
					violation: string;
				}[]) {
					constraintViolations.push({
						intentId: intent.id,
						constraint: v.constraint,
						violation: v.violation,
					});
				}
			}
		}

		return {
			activeIntents: active.map((i) => ({
				id: i.id,
				goal: i.goal,
				status: i.status,
				progress: this.getIntentProgress(i.id),
			})),
			completionRate,
			avgCompletionTime,
			healthIndicators,
			constraintViolations,
		};
	}

	getIntentProgress(intentId: string): number {
		const intent = this.capture.get(intentId);
		if (!intent) return 0;

		// If explicit progress is set, use it
		if (typeof intent.metadata?.progress === "number") {
			return intent.metadata.progress as number;
		}

		// Estimate from sub-intents if present
		if (intent.subIntents && intent.subIntents.length > 0) {
			let completedCount = 0;
			for (const subId of intent.subIntents) {
				const sub = this.capture.get(subId);
				if (sub && sub.status === "completed") completedCount++;
			}
			return Math.round((completedCount / intent.subIntents.length) * 100);
		}

		// Status-based fallback
		if (intent.status === "completed") return 100;
		if (intent.status === "failed" || intent.status === "cancelled") return 0;
		if (intent.status === "active") return 50;
		return 0;
	}

	getHealthIndicator(intent: Intent): "healthy" | "at_risk" | "failing" {
		// Failing: has constraint violations or explicit failure markers
		if (
			intent.metadata?.violations &&
			(intent.metadata.violations as unknown[]).length > 0
		) {
			return "failing";
		}
		if (intent.status === "failed") return "failing";

		// At risk: stale (no progress update in a long time) or approaching boundary
		const age = Date.now() - intent.createdAt;
		const hasProgress = typeof intent.metadata?.lastProgressUpdate === "number";
		const timeSinceProgress = hasProgress
			? Date.now() - (intent.metadata.lastProgressUpdate as number)
			: age;

		if (timeSinceProgress > 24 * 60 * 60 * 1000) return "at_risk"; // 24h stale

		return "healthy";
	}

	private getHealthReason(intent: Intent): string {
		const health = this.getHealthIndicator(intent);
		if (health === "failing") {
			if (
				intent.metadata?.violations &&
				(intent.metadata.violations as unknown[]).length > 0
			) {
				return "Constraint violations detected";
			}
			return "Intent has failed status";
		}
		if (health === "at_risk") return "No progress update in 24+ hours";
		return "On track";
	}
}

// ---------------------------------------------------------------------------
// IE-06: Intent history and learning
// ---------------------------------------------------------------------------

export interface IntentLifecycle {
	intentId: string;
	events: { type: string; timestamp: number; details: string }[];
	routingEffectiveness: number;
	duration: number;
	outcome: "success" | "failure" | "partial" | "cancelled";
}

export class IntentHistoryTracker {
	private lifecycles: Map<string, IntentLifecycle> = new Map();

	startTracking(intentId: string): void {
		this.lifecycles.set(intentId, {
			intentId,
			events: [
				{ type: "started", timestamp: Date.now(), details: "Tracking started" },
			],
			routingEffectiveness: 0,
			duration: 0,
			outcome: "partial",
		});
	}

	recordEvent(intentId: string, type: string, details: string): void {
		const lifecycle = this.lifecycles.get(intentId);
		if (!lifecycle) {
			throw new Error(`No tracking for intent: ${intentId}`);
		}
		lifecycle.events.push({ type, timestamp: Date.now(), details });
	}

	endTracking(
		intentId: string,
		outcome: IntentLifecycle["outcome"],
	): IntentLifecycle {
		const lifecycle = this.lifecycles.get(intentId);
		if (!lifecycle) {
			throw new Error(`No tracking for intent: ${intentId}`);
		}

		lifecycle.events.push({
			type: "ended",
			timestamp: Date.now(),
			details: `Outcome: ${outcome}`,
		});

		const startEvent = lifecycle.events[0];
		const endEvent = lifecycle.events[lifecycle.events.length - 1];
		lifecycle.duration = endEvent.timestamp - startEvent.timestamp;
		lifecycle.outcome = outcome;

		// Calculate routing effectiveness based on outcome
		lifecycle.routingEffectiveness =
			outcome === "success"
				? 100
				: outcome === "partial"
					? 50
					: outcome === "failure"
						? 0
						: 0;

		return lifecycle;
	}

	getLifecycle(intentId: string): IntentLifecycle | undefined {
		return this.lifecycles.get(intentId);
	}

	getRecurringPatterns(): { pattern: string; frequency: number }[] {
		const eventTypeCounts = new Map<string, number>();

		for (const lifecycle of this.lifecycles.values()) {
			for (const event of lifecycle.events) {
				if (event.type !== "started" && event.type !== "ended") {
					eventTypeCounts.set(
						event.type,
						(eventTypeCounts.get(event.type) ?? 0) + 1,
					);
				}
			}
		}

		return [...eventTypeCounts.entries()]
			.filter(([, count]) => count >= 2)
			.map(([pattern, frequency]) => ({ pattern, frequency }))
			.sort((a, b) => b.frequency - a.frequency);
	}

	getRoutingEffectiveness(agentCategory: string): number {
		const relevant: IntentLifecycle[] = [];

		for (const lifecycle of this.lifecycles.values()) {
			const hasRouting = lifecycle.events.some(
				(e) => e.type === "routed" && e.details.includes(agentCategory),
			);
			if (hasRouting) relevant.push(lifecycle);
		}

		if (relevant.length === 0) return 0;
		return (
			relevant.reduce((sum, l) => sum + l.routingEffectiveness, 0) /
			relevant.length
		);
	}
}

// ---------------------------------------------------------------------------
// IE-07: Intent templates
// ---------------------------------------------------------------------------

export interface IntentTemplate {
	id: string;
	name: string;
	description: string;
	defaults: Partial<Intent>;
	requiredOverrides: string[];
}

export const INTENT_TEMPLATES: IntentTemplate[] = [
	{
		id: "bug-fix",
		name: "Bug Fix",
		description: "Fix a reported bug with regression test",
		defaults: {
			priority: "high",
			constraints: [
				"Must include regression test",
				"Must not break existing tests",
			],
			failureModes: [
				"Fix introduces new bugs",
				"Root cause not addressed",
				"Regression test insufficient",
			],
			values: ["correctness", "safety"],
		},
		requiredOverrides: ["goal"],
	},
	{
		id: "feature-implementation",
		name: "Feature Implementation",
		description: "Implement a new feature end-to-end",
		defaults: {
			priority: "medium",
			constraints: [
				"Must follow existing patterns",
				"Must include tests",
				"Must update documentation",
			],
			failureModes: [
				"Scope creep",
				"Incomplete implementation",
				"Poor test coverage",
			],
			values: ["completeness", "consistency"],
		},
		requiredOverrides: ["goal"],
	},
	{
		id: "refactoring",
		name: "Code Refactoring",
		description: "Improve code structure without changing behavior",
		defaults: {
			priority: "medium",
			constraints: [
				"No behavior change",
				"All existing tests must pass",
				"No new dependencies",
			],
			failureModes: [
				"Behavior change introduced",
				"Performance degradation",
				"Incomplete refactor",
			],
			values: ["simplicity", "maintainability"],
		},
		requiredOverrides: ["goal"],
	},
	{
		id: "code-review",
		name: "Code Review",
		description: "Review code changes for quality and correctness",
		defaults: {
			priority: "medium",
			constraints: [
				"Must check security implications",
				"Must verify test coverage",
			],
			failureModes: [
				"False sense of security",
				"Missed vulnerability",
				"Rubber-stamp approval",
			],
			values: ["thoroughness", "security"],
		},
		requiredOverrides: ["goal"],
	},
	{
		id: "security-audit",
		name: "Security Audit",
		description: "Comprehensive security review of a component",
		defaults: {
			priority: "critical",
			constraints: [
				"Must check OWASP top 10",
				"Must verify auth/authz",
				"Must test injection vectors",
			],
			failureModes: [
				"Missed vulnerability class",
				"False negative",
				"Incomplete coverage",
			],
			values: ["security", "thoroughness"],
		},
		requiredOverrides: ["goal"],
	},
];

export class IntentTemplateManager {
	private templates: Map<string, IntentTemplate>;

	constructor() {
		this.templates = new Map<string, IntentTemplate>();
		for (const t of INTENT_TEMPLATES) {
			this.templates.set(t.id, t);
		}
	}

	getTemplate(id: string): IntentTemplate | undefined {
		return this.templates.get(id);
	}

	getAllTemplates(): IntentTemplate[] {
		return [...this.templates.values()];
	}

	createFromTemplate(templateId: string, overrides: Partial<Intent>): Intent {
		const template = this.templates.get(templateId);
		if (!template) {
			throw new Error(`Template not found: ${templateId}`);
		}

		// Validate required overrides are present
		for (const field of template.requiredOverrides) {
			if (
				!(field in overrides) ||
				!(overrides as Record<string, unknown>)[field]
			) {
				throw new Error(`Required override missing: ${field}`);
			}
		}

		const intent: Intent = {
			id: randomUUID(),
			goal: (overrides.goal ?? template.defaults.goal) as string,
			priority: (overrides.priority ??
				template.defaults.priority ??
				"medium") as IntentPriority,
			constraints: overrides.constraints ?? template.defaults.constraints ?? [],
			failureModes:
				overrides.failureModes ?? template.defaults.failureModes ?? [],
			judgmentBoundaries:
				overrides.judgmentBoundaries ??
				template.defaults.judgmentBoundaries ??
				[],
			values: overrides.values ?? template.defaults.values ?? [],
			status: "draft",
			createdAt: Date.now(),
			createdBy: (overrides.createdBy ?? "template") as string,
			authorityTier:
				overrides.authorityTier ??
				template.defaults.authorityTier ??
				"autonomous",
			metadata: overrides.metadata ?? {},
		};

		if (overrides.parentIntentId)
			intent.parentIntentId = overrides.parentIntentId;
		if (overrides.subIntents) intent.subIntents = overrides.subIntents;

		return intent;
	}

	addTemplate(template: IntentTemplate): void {
		this.templates.set(template.id, template);
	}
}

// ---------------------------------------------------------------------------
// IE-08: Intent conflict detection
// ---------------------------------------------------------------------------

export interface IntentConflict {
	type:
		| "goal_contradiction"
		| "constraint_violation"
		| "resource_contention"
		| "scope_overlap"
		| "priority_inversion";
	intentA: string;
	intentB: string;
	description: string;
	recommendation: "reorder" | "defer" | "merge" | "escalate";
}

/** Tokenize for comparison. */
function tokenize(text: string): Set<string> {
	const tokens = new Set<string>();
	for (const word of text.toLowerCase().split(/\W+/)) {
		if (word.length > 1) tokens.add(word);
	}
	return tokens;
}

export class IntentConflictDetector {
	detectConflicts(intents: Intent[]): IntentConflict[] {
		const conflicts: IntentConflict[] = [];

		for (let i = 0; i < intents.length; i++) {
			for (let j = i + 1; j < intents.length; j++) {
				const goal = this.detectGoalContradiction(intents[i], intents[j]);
				if (goal) conflicts.push(goal);

				const scope = this.detectScopeOverlap(intents[i], intents[j]);
				if (scope) conflicts.push(scope);

				const priority = this.detectPriorityInversion(intents[i], intents[j]);
				if (priority) conflicts.push(priority);
			}
		}

		return conflicts;
	}

	detectGoalContradiction(a: Intent, b: Intent): IntentConflict | null {
		const contradictionPairs = [
			["add", "remove"],
			["create", "delete"],
			["enable", "disable"],
			["increase", "decrease"],
			["allow", "block"],
			["open", "close"],
		];

		const aLower = a.goal.toLowerCase();
		const bLower = b.goal.toLowerCase();

		// Check if goals target the same thing but in opposite directions
		const aTokens = tokenize(a.goal);
		const bTokens = tokenize(b.goal);

		// Find common target words (nouns)
		let commonTargets = 0;
		for (const t of aTokens) {
			if (bTokens.has(t)) commonTargets++;
		}

		if (commonTargets < 1) return null;

		for (const [pos, neg] of contradictionPairs) {
			if (
				(aLower.includes(pos) && bLower.includes(neg)) ||
				(aLower.includes(neg) && bLower.includes(pos))
			) {
				return {
					type: "goal_contradiction",
					intentA: a.id,
					intentB: b.id,
					description: `Goals "${a.goal}" and "${b.goal}" appear contradictory`,
					recommendation: "escalate",
				};
			}
		}

		return null;
	}

	detectScopeOverlap(a: Intent, b: Intent): IntentConflict | null {
		const aTokens = tokenize(a.goal);
		const bTokens = tokenize(b.goal);

		let intersection = 0;
		for (const t of aTokens) {
			if (bTokens.has(t)) intersection++;
		}

		const minSize = Math.min(aTokens.size, bTokens.size);
		if (minSize === 0) return null;

		const overlap = intersection / minSize;

		if (overlap > 0.6) {
			return {
				type: "scope_overlap",
				intentA: a.id,
				intentB: b.id,
				description: `Goals overlap significantly (${(overlap * 100).toFixed(0)}% keyword overlap)`,
				recommendation: "merge",
			};
		}

		return null;
	}

	detectPriorityInversion(a: Intent, b: Intent): IntentConflict | null {
		const priorityRank: Record<string, number> = {
			critical: 4,
			high: 3,
			medium: 2,
			low: 1,
		};

		const aRank = priorityRank[a.priority] ?? 0;
		const bRank = priorityRank[b.priority] ?? 0;

		// Check if lower priority intent is a dependency of higher priority
		if (aRank > bRank && a.parentIntentId === b.id) {
			return {
				type: "priority_inversion",
				intentA: a.id,
				intentB: b.id,
				description: `Higher-priority intent "${a.goal}" depends on lower-priority "${b.goal}"`,
				recommendation: "reorder",
			};
		}

		if (bRank > aRank && b.parentIntentId === a.id) {
			return {
				type: "priority_inversion",
				intentA: b.id,
				intentB: a.id,
				description: `Higher-priority intent "${b.goal}" depends on lower-priority "${a.goal}"`,
				recommendation: "reorder",
			};
		}

		return null;
	}
}

// ---------------------------------------------------------------------------
// IE-09: Human inflection point detection
// ---------------------------------------------------------------------------

export interface InflectionPoint {
	intentId: string;
	type: "taste" | "ethics" | "strategy" | "stakeholder" | "novel_ambiguity";
	description: string;
	escalateTo: string;
	context: string;
}

const TASTE_KEYWORDS = [
	"style",
	"aesthetic",
	"prefer",
	"look and feel",
	"tone",
	"voice",
	"branding",
];
const ETHICS_KEYWORDS = [
	"privacy",
	"bias",
	"fairness",
	"consent",
	"surveillance",
	"discrimination",
	"ethical",
];
const STRATEGY_KEYWORDS = [
	"roadmap",
	"pivot",
	"business model",
	"pricing",
	"market",
	"competitive",
	"vision",
];
const STAKEHOLDER_KEYWORDS = [
	"customer",
	"user feedback",
	"executive",
	"board",
	"stakeholder",
	"investor",
];

export class InflectionPointDetector {
	detect(intent: Intent): InflectionPoint[] {
		const points: InflectionPoint[] = [];
		const _goalLower = intent.goal.toLowerCase();
		const allText = [
			intent.goal,
			...intent.constraints,
			...intent.failureModes,
			...intent.values,
		]
			.join(" ")
			.toLowerCase();

		// Taste decisions
		for (const kw of TASTE_KEYWORDS) {
			if (allText.includes(kw)) {
				points.push({
					intentId: intent.id,
					type: "taste",
					description: `Intent involves subjective taste decision (keyword: "${kw}")`,
					escalateTo: "human-designer",
					context: intent.goal,
				});
				break;
			}
		}

		// Ethics decisions
		for (const kw of ETHICS_KEYWORDS) {
			if (allText.includes(kw)) {
				points.push({
					intentId: intent.id,
					type: "ethics",
					description: `Intent involves ethical consideration (keyword: "${kw}")`,
					escalateTo: "human-ethics-reviewer",
					context: intent.goal,
				});
				break;
			}
		}

		// Strategy decisions
		for (const kw of STRATEGY_KEYWORDS) {
			if (allText.includes(kw)) {
				points.push({
					intentId: intent.id,
					type: "strategy",
					description: `Intent involves strategic decision (keyword: "${kw}")`,
					escalateTo: "human-product-owner",
					context: intent.goal,
				});
				break;
			}
		}

		// Stakeholder decisions
		for (const kw of STAKEHOLDER_KEYWORDS) {
			if (allText.includes(kw)) {
				points.push({
					intentId: intent.id,
					type: "stakeholder",
					description: `Intent involves stakeholder input (keyword: "${kw}")`,
					escalateTo: "human-stakeholder",
					context: intent.goal,
				});
				break;
			}
		}

		// Novel ambiguity: failure modes that suggest unknown territory
		for (const fm of intent.failureModes) {
			const fmLower = fm.toLowerCase();
			if (
				fmLower.includes("unknown") ||
				fmLower.includes("unclear") ||
				fmLower.includes("ambiguous") ||
				fmLower.includes("novel")
			) {
				points.push({
					intentId: intent.id,
					type: "novel_ambiguity",
					description: `Failure mode suggests novel ambiguity: "${fm}"`,
					escalateTo: "human-domain-expert",
					context: intent.goal,
				});
				break;
			}
		}

		return points;
	}

	isEscalationRequired(intent: Intent): boolean {
		return this.detect(intent).length > 0;
	}
}

// ---------------------------------------------------------------------------
// IE-10: Judgment boundary enforcement
// ---------------------------------------------------------------------------

export class JudgmentBoundaryEnforcer {
	checkBoundaries(
		intent: Intent,
		currentAction: string,
	): { safe: boolean; nearBoundary: boolean; violations: string[] } {
		const violations: string[] = [];
		let nearBoundary = false;
		const actionLower = currentAction.toLowerCase();

		for (const boundary of intent.judgmentBoundaries) {
			const thresholdLower = boundary.threshold.toLowerCase();
			const _descLower = boundary.description.toLowerCase();

			// Direct threshold violation
			if (actionLower.includes(thresholdLower)) {
				violations.push(
					`Action "${currentAction}" crosses boundary: ${boundary.description} (threshold: ${boundary.threshold}, escalate to: ${boundary.escalateTo})`,
				);
			}

			// Check proximity to boundary using keyword overlap
			const actionTokens = tokenize(currentAction);
			const thresholdTokens = tokenize(
				`${boundary.threshold} ${boundary.description}`,
			);
			let overlap = 0;
			for (const t of actionTokens) {
				if (thresholdTokens.has(t)) overlap++;
			}

			if (overlap > 0 && violations.length === 0) {
				nearBoundary = true;
			}
		}

		// Also check constraints
		for (const constraint of intent.constraints) {
			const constraintLower = constraint.toLowerCase();
			// Detect negative constraints being violated
			if (
				constraintLower.startsWith("must not") ||
				constraintLower.startsWith("no ") ||
				constraintLower.startsWith("never")
			) {
				const forbidden = constraintLower
					.replace(/^must not\s+/, "")
					.replace(/^no\s+/, "")
					.replace(/^never\s+/, "");
				const forbiddenTokens = tokenize(forbidden);
				const actionTokens = tokenize(currentAction);

				let matchCount = 0;
				for (const t of forbiddenTokens) {
					if (actionTokens.has(t)) matchCount++;
				}

				if (
					forbiddenTokens.size > 0 &&
					matchCount / forbiddenTokens.size > 0.5
				) {
					violations.push(`Action may violate constraint: "${constraint}"`);
				}
			}
		}

		return {
			safe: violations.length === 0,
			nearBoundary,
			violations,
		};
	}

	getProximityWarnings(intent: Intent, currentAction: string): string[] {
		const warnings: string[] = [];
		const actionTokens = tokenize(currentAction);

		for (const boundary of intent.judgmentBoundaries) {
			const boundaryTokens = tokenize(
				`${boundary.threshold} ${boundary.description}`,
			);
			let overlap = 0;
			for (const t of actionTokens) {
				if (boundaryTokens.has(t)) overlap++;
			}

			if (overlap > 0) {
				warnings.push(
					`Approaching boundary: ${boundary.description} (escalate to: ${boundary.escalateTo})`,
				);
			}
		}

		return warnings;
	}
}
