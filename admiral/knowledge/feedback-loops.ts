/**
 * Knowledge Feedback Loops (DE-05, DE-06)
 *
 * DE-05: Code review feedback — accepted patterns strengthen, rejected weaken.
 * DE-06: Test result feedback — pass strengthens, fail weakens + proposes lessons.
 * Zero external dependencies — Node.js built-ins only.
 */

import type { ProposedEntry } from "./harvester.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedbackEvent {
	type: "code_review" | "test_result";
	outcome: "accepted" | "rejected" | "passed" | "failed";
	relatedEntryId?: string;
	context: string;
	timestamp: number;
}

interface EntryStats {
	acceptCount: number;
	rejectCount: number;
	passCount: number;
	failCount: number;
}

// ---------------------------------------------------------------------------
// KnowledgeFeedbackLoop
// ---------------------------------------------------------------------------

export class KnowledgeFeedbackLoop {
	private stats: Map<string, EntryStats> = new Map();
	private flagged: Set<string> = new Set();

	constructor() {
		// stateless except for running session stats
	}

	/**
	 * DE-05: Process code review outcome.
	 * Accepted patterns strengthen entries, rejected weaken.
	 * > 50% rejection rate flags for supersession.
	 */
	processCodeReviewOutcome(event: FeedbackEvent): {
		strengthened: string[];
		weakened: string[];
		flagged: string[];
	} {
		const strengthened: string[] = [];
		const weakened: string[] = [];
		const flaggedResult: string[] = [];

		if (!event.relatedEntryId) {
			return { strengthened, weakened, flagged: flaggedResult };
		}

		const entryId = event.relatedEntryId;
		const stat = this.getOrCreateStats(entryId);

		if (event.outcome === "accepted") {
			stat.acceptCount++;
			strengthened.push(entryId);
		} else if (event.outcome === "rejected") {
			stat.rejectCount++;
			weakened.push(entryId);

			// Check rejection rate
			const rate = this.getRejectionRate(entryId);
			if (rate > 0.5) {
				this.flagged.add(entryId);
				flaggedResult.push(entryId);
			}
		}

		return { strengthened, weakened, flagged: flaggedResult };
	}

	/**
	 * DE-06: Process test outcome.
	 * Pass strengthens, fail weakens with failure context.
	 * New lessons proposed when failures reveal knowledge gaps.
	 */
	processTestOutcome(event: FeedbackEvent): {
		strengthened: string[];
		weakened: string[];
		newLessons: ProposedEntry[];
	} {
		const strengthened: string[] = [];
		const weakened: string[] = [];
		const newLessons: ProposedEntry[] = [];

		if (event.relatedEntryId) {
			const entryId = event.relatedEntryId;
			const stat = this.getOrCreateStats(entryId);

			if (event.outcome === "passed") {
				stat.passCount++;
				strengthened.push(entryId);
			} else if (event.outcome === "failed") {
				stat.failCount++;
				weakened.push(entryId);

				// Propose a lesson from the failure
				if (event.context && event.context.length > 10) {
					newLessons.push({
						title: `Test failure lesson: ${event.context.slice(0, 60)}`,
						content: `Test failure context: ${event.context}. Related entry: ${entryId}`,
						category: "lesson",
						tags: ["test_failure", "lesson"],
						sourceAttribution: "test_feedback",
						confidence: 0.6,
					});
				}
			}
		} else if (
			event.outcome === "failed" &&
			event.context &&
			event.context.length > 10
		) {
			// No related entry — this failure reveals a knowledge gap
			newLessons.push({
				title: `Knowledge gap: ${event.context.slice(0, 60)}`,
				content: `Unlinked test failure suggests missing knowledge: ${event.context}`,
				category: "gap",
				tags: ["knowledge_gap", "test_failure"],
				sourceAttribution: "test_feedback",
				confidence: 0.5,
			});
		}

		return { strengthened, weakened, newLessons };
	}

	/** Get rejection rate for an entry (0-1). Returns 0 if no reviews. */
	getRejectionRate(entryId: string): number {
		const stat = this.stats.get(entryId);
		if (!stat) return 0;
		const total = stat.acceptCount + stat.rejectCount;
		if (total === 0) return 0;
		return stat.rejectCount / total;
	}

	/** Get all entries flagged for supersession (>50% rejection rate). */
	getFlaggedEntries(): string[] {
		return Array.from(this.flagged);
	}

	// -----------------------------------------------------------------------
	// Private helpers
	// -----------------------------------------------------------------------

	private getOrCreateStats(entryId: string): EntryStats {
		let stat = this.stats.get(entryId);
		if (!stat) {
			stat = {
				acceptCount: 0,
				rejectCount: 0,
				passCount: 0,
				failCount: 0,
			};
			this.stats.set(entryId, stat);
		}
		return stat;
	}
}
