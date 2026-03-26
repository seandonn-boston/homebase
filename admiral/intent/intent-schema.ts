/**
 * Intent Schema & Capture (IE-01)
 *
 * Core intent data model and CRUD operations for the Admiral intent
 * engineering pipeline. Provides progressive-completeness scoring so
 * partially-specified intents can be refined incrementally.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JudgmentBoundary {
	description: string;
	threshold: string;
	escalateTo: string;
}

export type IntentPriority = "critical" | "high" | "medium" | "low";
export type IntentStatus =
	| "draft"
	| "active"
	| "completed"
	| "failed"
	| "cancelled";
export type AuthorityTier = "autonomous" | "propose" | "escalate";

export interface Intent {
	id: string;
	goal: string;
	priority: IntentPriority;
	constraints: string[];
	failureModes: string[];
	judgmentBoundaries: JudgmentBoundary[];
	values: string[];
	status: IntentStatus;
	createdAt: number;
	createdBy: string;
	authorityTier: AuthorityTier;
	parentIntentId?: string;
	subIntents?: string[];
	metadata: Record<string, unknown>;
}

export interface CompletenessResult {
	complete: boolean;
	warnings: string[];
	score: number;
}

export type IntentInput = Omit<Intent, "id" | "status" | "createdAt">;

// ---------------------------------------------------------------------------
// IntentCapture
// ---------------------------------------------------------------------------

export class IntentCapture {
	private readonly intents = new Map<string, Intent>();

	create(input: IntentInput): Intent {
		const intent: Intent = {
			...input,
			id: randomUUID(),
			status: "draft",
			createdAt: Date.now(),
		};
		this.intents.set(intent.id, intent);
		return intent;
	}

	update(id: string, updates: Partial<Intent>): Intent {
		const existing = this.intents.get(id);
		if (!existing) {
			throw new Error(`Intent not found: ${id}`);
		}
		const updated: Intent = { ...existing, ...updates, id: existing.id };
		this.intents.set(id, updated);
		return updated;
	}

	get(id: string): Intent | undefined {
		return this.intents.get(id);
	}

	getActive(): Intent[] {
		return [...this.intents.values()].filter((i) => i.status === "active");
	}

	getAll(): Intent[] {
		return [...this.intents.values()];
	}

	assessCompleteness(intent: Intent): CompletenessResult {
		const warnings: string[] = [];
		let filled = 0;
		const fields = 6; // goal, constraints, failureModes, judgmentBoundaries, values, failureModes

		if (intent.goal && intent.goal.trim().length > 0) {
			filled++;
		} else {
			warnings.push("Missing goal");
		}

		if (intent.constraints.length > 0) {
			filled++;
		} else {
			warnings.push("No constraints specified");
		}

		if (intent.failureModes.length > 0) {
			filled++;
		} else {
			warnings.push("No failure modes specified");
		}

		if (intent.judgmentBoundaries.length > 0) {
			filled++;
		} else {
			warnings.push("No judgment boundaries specified");
		}

		if (intent.values.length > 0) {
			filled++;
		} else {
			warnings.push("No values specified");
		}

		if (intent.createdBy && intent.createdBy.trim().length > 0) {
			filled++;
		} else {
			warnings.push("Missing createdBy");
		}

		const score = Math.round((filled / fields) * 100);
		return {
			complete: warnings.length === 0,
			warnings,
			score,
		};
	}
}
