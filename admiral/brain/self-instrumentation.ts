/**
 * Brain Self-Instrumentation (B-21b to B-21e)
 *
 * - B-21b: Stale detection (warns when brain hasn't been queried recently)
 * - B-21c: Mobius Loop _meta namespace (brain-about-brain snapshots)
 * - B-21d: Contradiction resolution workflow
 * - B-21e: Decision entry schema and validation
 */

import type { BrainDatabase, BrainEntry } from "./schema";

// ---------------------------------------------------------------------------
// B-21b: Stale Detection
// ---------------------------------------------------------------------------

export class BrainStaleDetector {
	private lastQueryToolCall: number = Date.now();
	private toolCallsSinceQuery: number = 0;

	recordToolCall(isBrainQuery: boolean): void {
		if (isBrainQuery) {
			this.lastQueryToolCall = Date.now();
			this.toolCallsSinceQuery = 0;
		} else {
			this.toolCallsSinceQuery++;
		}
	}

	isStale(threshold = 20): boolean {
		return this.toolCallsSinceQuery >= threshold;
	}

	getAdvisory(): string | null {
		if (this.isStale()) {
			return `BRAIN STALE: ${this.toolCallsSinceQuery} tool calls since last brain query`;
		}
		return null;
	}

	getToolCallsSinceQuery(): number {
		return this.toolCallsSinceQuery;
	}

	getLastQueryTime(): number {
		return this.lastQueryToolCall;
	}

	reset(): void {
		this.lastQueryToolCall = Date.now();
		this.toolCallsSinceQuery = 0;
	}
}

// ---------------------------------------------------------------------------
// B-21c: Mobius Loop _meta Namespace
// ---------------------------------------------------------------------------

export interface MetaSnapshot {
	timestamp: number;
	entryCount: number;
	linkCount: number;
	topCategories: { category: string; count: number }[];
	queryPatterns: { query: string; count: number }[];
	healthScore: number; // 0-100
	gaps: string[]; // detected knowledge gaps
}

export class BrainMetaNamespace {
	private snapshots: MetaSnapshot[] = [];

	constructor(private db: BrainDatabase) {}

	captureSnapshot(): MetaSnapshot {
		const stats = this.db.getStats();
		const categories = this.db.getEntriesByCategory();

		// Analyze demand signals for query patterns
		const demands = this.db.getDemandSignals();
		const queryMap = new Map<string, number>();
		for (const d of demands) {
			const normalized = d.query.toLowerCase().trim();
			queryMap.set(normalized, (queryMap.get(normalized) ?? 0) + 1);
		}
		const queryPatterns = [...queryMap.entries()]
			.map(([query, count]) => ({ query, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 10);

		// Detect knowledge gaps: queries with zero results
		const zeroResultQueries = demands
			.filter((d) => d.results_found === 0)
			.map((d) => d.query);
		const gapSet = new Set(zeroResultQueries);
		const gaps = [...gapSet].slice(0, 20);

		// Health score calculation
		const healthScore = this.computeHealthScore(stats, categories, gaps);

		const snapshot: MetaSnapshot = {
			timestamp: Date.now(),
			entryCount: stats.entries,
			linkCount: stats.links,
			topCategories: categories.slice(0, 10),
			queryPatterns,
			healthScore,
			gaps,
		};

		this.snapshots.push(snapshot);
		return snapshot;
	}

	getSnapshots(limit?: number): MetaSnapshot[] {
		const max = limit ?? this.snapshots.length;
		return this.snapshots.slice(-max);
	}

	getGraduationAssessment(): {
		ready: boolean;
		criteria: {
			name: string;
			target: number;
			actual: number;
			passed: boolean;
		}[];
	} {
		const stats = this.db.getStats();
		const categories = this.db.getEntriesByCategory();

		const criteria = [
			{
				name: "minimum_entries",
				target: 50,
				actual: stats.entries,
				passed: stats.entries >= 50,
			},
			{
				name: "minimum_links",
				target: 20,
				actual: stats.links,
				passed: stats.links >= 20,
			},
			{
				name: "minimum_categories",
				target: 3,
				actual: categories.length,
				passed: categories.length >= 3,
			},
			{
				name: "schema_version",
				target: 1,
				actual: stats.version,
				passed: stats.version >= 1,
			},
		];

		return {
			ready: criteria.every((c) => c.passed),
			criteria,
		};
	}

	private computeHealthScore(
		stats: { entries: number; links: number; demands: number },
		categories: { category: string; count: number }[],
		gaps: string[],
	): number {
		let score = 0;

		// Entries: 0-30 points
		score += Math.min(30, stats.entries * 0.6);

		// Links: 0-20 points (knowledge graph connectivity)
		score += Math.min(20, stats.links * 1.0);

		// Category diversity: 0-20 points
		score += Math.min(20, categories.length * 4);

		// Demand coverage: 0-20 points (fewer gaps = better)
		if (stats.demands > 0) {
			const gapRatio = gaps.length / Math.max(1, stats.demands);
			score += Math.max(0, 20 * (1 - gapRatio));
		} else {
			score += 10; // Neutral if no demands yet
		}

		// Version bonus: 0-10 points
		score += 10;

		return Math.round(Math.min(100, score));
	}
}

// ---------------------------------------------------------------------------
// B-21d: Contradiction Resolution Workflow
// ---------------------------------------------------------------------------

export type ResolutionAction = "supersede" | "diverge" | "withdraw";

export interface ContradictionResolution {
	entryA: string;
	entryB: string;
	action: ResolutionAction;
	resolvedBy: string;
	rationale: string;
	timestamp: number;
}

export class ContradictionResolver {
	private resolutions: ContradictionResolution[] = [];

	constructor(private db: BrainDatabase) {}

	detectContradictions(): {
		entryA: string;
		entryB: string;
		overlap: string[];
	}[] {
		const contradictions: {
			entryA: string;
			entryB: string;
			overlap: string[];
		}[] = [];
		const seen = new Set<string>();

		const entries = this.db.getAllEntries();

		for (const entry of entries) {
			// Check entries with explicit contradiction links
			const links = this.db.getLinks(entry.id, "outgoing");
			for (const link of links) {
				if (link.link_type === "contradicts") {
					const key = [entry.id, link.to_entry].sort().join(":");
					if (!seen.has(key)) {
						seen.add(key);
						const other = this.db.getEntry(link.to_entry);
						if (other) {
							const overlap = this.findKeywordOverlap(entry, other);
							contradictions.push({
								entryA: entry.id,
								entryB: link.to_entry,
								overlap,
							});
						}
					}
				}
			}

			// Check entries with contradicts field
			if (entry.contradicts && entry.contradicts.length > 0) {
				for (const contradictId of entry.contradicts) {
					const key = [entry.id, contradictId].sort().join(":");
					if (!seen.has(key)) {
						seen.add(key);
						const other = this.db.getEntry(contradictId);
						if (other) {
							const overlap = this.findKeywordOverlap(entry, other);
							contradictions.push({
								entryA: entry.id,
								entryB: contradictId,
								overlap,
							});
						}
					}
				}
			}
		}

		return contradictions;
	}

	resolve(
		entryA: string,
		entryB: string,
		action: ResolutionAction,
		resolvedBy: string,
		rationale: string,
	): ContradictionResolution {
		const resolution: ContradictionResolution = {
			entryA,
			entryB,
			action,
			resolvedBy,
			rationale,
			timestamp: Date.now(),
		};

		// Apply the resolution
		switch (action) {
			case "supersede":
				// Mark entryB as superseded by entryA
				this.db.updateEntry(entryB, { superseded_by: entryA });
				this.db.addLink(entryA, entryB, "supersedes", 1.0, resolvedBy);
				break;
			case "withdraw":
				// Delete the contradicting entry
				this.db.deleteEntry(entryB);
				break;
			case "diverge":
				// Keep both, add a "related_to" link to acknowledge divergence
				this.db.addLink(entryA, entryB, "related_to", 0.5, resolvedBy);
				break;
		}

		this.resolutions.push(resolution);
		return resolution;
	}

	getPending(): { entryA: string; entryB: string }[] {
		const all = this.detectContradictions();
		const resolvedKeys = new Set(
			this.resolutions.map((r) => [r.entryA, r.entryB].sort().join(":")),
		);
		return all
			.filter((c) => !resolvedKeys.has([c.entryA, c.entryB].sort().join(":")))
			.map(({ entryA, entryB }) => ({ entryA, entryB }));
	}

	getResolutions(): ContradictionResolution[] {
		return [...this.resolutions];
	}

	private findKeywordOverlap(a: BrainEntry, b: BrainEntry): string[] {
		const wordsA = this.extractKeywords(a);
		const wordsB = this.extractKeywords(b);
		return [...wordsA].filter((w) => wordsB.has(w));
	}

	private extractKeywords(entry: BrainEntry): Set<string> {
		const text = `${entry.title} ${entry.content} ${entry.tags.join(" ")}`;
		const words = text
			.toLowerCase()
			.split(/\W+/)
			.filter((w) => w.length > 3);
		return new Set(words);
	}
}

/** Result of a conflict-aware retrieval */
export interface ConflictAwareResult {
	entry: BrainEntry;
	hasConflicts: boolean;
	conflictingEntries: string[];
}

/** Result of an insert with conflict check */
export interface InsertWithConflictResult {
	entryId: string;
	conflicts: Array<{
		entryId: string;
		overlap: string[];
	}>;
	requiresResolution: boolean;
}

/** Escalation recommendation */
export interface EscalationRecommendation {
	trigger: "contradiction_in_decision_dependency";
	decisionEntryId: string;
	conflictingEntries: [string, string];
	severity: "high" | "critical";
	message: string;
}

/**
 * Extended contradiction resolution workflow (B-21d completion).
 * Adds auto-detection on insert, conflict-aware retrieval, and
 * escalation triggers for decision dependencies.
 */
export class ConflictAwareResolver extends ContradictionResolver {
	private escalations: EscalationRecommendation[] = [];

	constructor(private database: BrainDatabase) {
		super(database);
	}

	/**
	 * Insert a brain entry with automatic contradiction scanning.
	 * Returns the entry ID and any detected conflicts.
	 */
	insertWithConflictCheck(
		entry: Omit<BrainEntry, "id" | "created_at" | "updated_at" | "usefulness_score" | "access_count">,
	): InsertWithConflictResult {
		// Insert the entry
		const inserted = this.database.insertEntry(entry);
		const id = inserted.id;

		// Scan for contradictions involving the new entry
		const newEntry = this.database.getEntry(id);
		if (!newEntry) {
			return { entryId: id, conflicts: [], requiresResolution: false };
		}

		const allEntries = this.database.getAllEntries();
		const conflicts: Array<{ entryId: string; overlap: string[] }> = [];

		for (const existing of allEntries) {
			if (existing.id === id) continue;

			// Check for keyword overlap
			const overlap = this.computeOverlap(newEntry, existing);
			if (overlap.length >= 3) {
				// Significant overlap — potential contradiction
				conflicts.push({ entryId: existing.id, overlap });

				// Auto-add contradicts metadata
				const currentContradicts = newEntry.contradicts ?? [];
				if (!currentContradicts.includes(existing.id)) {
					this.database.updateEntry(id, {
						contradicts: [...currentContradicts, existing.id],
					});
				}
			}
		}

		return {
			entryId: id,
			conflicts,
			requiresResolution: conflicts.length > 0,
		};
	}

	/**
	 * Retrieve entries with explicit conflict flags.
	 * Each result indicates whether the entry has active contradictions.
	 */
	retrieveWithConflictFlag(entryId: string): ConflictAwareResult | null {
		const entry = this.database.getEntry(entryId);
		if (!entry) return null;

		const conflicting: string[] = [];

		// Check explicit contradicts field
		if (entry.contradicts) {
			conflicting.push(...entry.contradicts);
		}

		// Check contradiction links
		const links = this.database.getLinks(entryId, "outgoing");
		for (const link of links) {
			if (link.link_type === "contradicts" && !conflicting.includes(link.to_entry)) {
				conflicting.push(link.to_entry);
			}
		}

		// Check incoming contradiction links
		const incomingLinks = this.database.getLinks(entryId, "incoming");
		for (const link of incomingLinks) {
			if (link.link_type === "contradicts" && !conflicting.includes(link.from_entry)) {
				conflicting.push(link.from_entry);
			}
		}

		// Filter out entries that have been resolved (superseded)
		const activeConflicts = conflicting.filter((cId) => {
			const conflictEntry = this.database.getEntry(cId);
			return conflictEntry && !conflictEntry.superseded_by;
		});

		return {
			entry,
			hasConflicts: activeConflicts.length > 0,
			conflictingEntries: activeConflicts,
		};
	}

	/**
	 * Check if a decision entry depends on conflicting Brain entries.
	 * If so, generates an escalation recommendation.
	 */
	checkDecisionDependencies(decisionEntryId: string): EscalationRecommendation | null {
		const entry = this.database.getEntry(decisionEntryId);
		if (!entry || entry.category !== "decision") return null;

		// Find entries referenced in the decision's metadata or content
		const referencedIds: string[] = [];
		if (entry.metadata?.dependencies && Array.isArray(entry.metadata.dependencies)) {
			referencedIds.push(...(entry.metadata.dependencies as string[]));
		}

		// Check if any referenced entries are in conflict
		for (const refId of referencedIds) {
			const result = this.retrieveWithConflictFlag(refId);
			if (result && result.hasConflicts) {
				const escalation: EscalationRecommendation = {
					trigger: "contradiction_in_decision_dependency",
					decisionEntryId,
					conflictingEntries: [refId, result.conflictingEntries[0]],
					severity: "critical",
					message: `Decision '${entry.title}' depends on entry '${refId}' which has unresolved contradictions with ${result.conflictingEntries.join(", ")}`,
				};
				this.escalations.push(escalation);
				return escalation;
			}
		}

		return null;
	}

	/** Get all escalation recommendations */
	getEscalations(): EscalationRecommendation[] {
		return [...this.escalations];
	}

	private computeOverlap(a: BrainEntry, b: BrainEntry): string[] {
		const wordsA = this.extractWords(a);
		const wordsB = this.extractWords(b);
		return [...wordsA].filter((w) => wordsB.has(w));
	}

	private extractWords(entry: BrainEntry): Set<string> {
		const text = `${entry.title} ${entry.content} ${entry.tags.join(" ")}`;
		return new Set(
			text.toLowerCase().split(/\W+/).filter((w) => w.length > 3),
		);
	}
}

// ---------------------------------------------------------------------------
// B-21e: Decision Entry Schema & Validation
// ---------------------------------------------------------------------------

export interface DecisionEntry {
	decision: string;
	alternatives: string[];
	reasoning: string;
	authorityTier: "autonomous" | "propose" | "escalate";
	agent: string;
	outcome?: "success" | "failure" | "partial" | "pending";
	timestamp: number;
}

export class DecisionEntryValidator {
	validate(entry: unknown): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (typeof entry !== "object" || entry === null) {
			return { valid: false, errors: ["Entry must be a non-null object"] };
		}

		const obj = entry as Record<string, unknown>;

		if (typeof obj.decision !== "string" || obj.decision.length === 0) {
			errors.push("decision must be a non-empty string");
		}

		if (!Array.isArray(obj.alternatives)) {
			errors.push("alternatives must be an array");
		}

		if (typeof obj.reasoning !== "string" || obj.reasoning.length === 0) {
			errors.push("reasoning must be a non-empty string");
		}

		const validTiers = ["autonomous", "propose", "escalate"];
		if (!validTiers.includes(obj.authorityTier as string)) {
			errors.push(`authorityTier must be one of: ${validTiers.join(", ")}`);
		}

		if (typeof obj.agent !== "string" || obj.agent.length === 0) {
			errors.push("agent must be a non-empty string");
		}

		if (obj.outcome !== undefined) {
			const validOutcomes = ["success", "failure", "partial", "pending"];
			if (!validOutcomes.includes(obj.outcome as string)) {
				errors.push(`outcome must be one of: ${validOutcomes.join(", ")}`);
			}
		}

		if (typeof obj.timestamp !== "number" || obj.timestamp <= 0) {
			errors.push("timestamp must be a positive number");
		}

		return { valid: errors.length === 0, errors };
	}

	toEntry(
		decision: DecisionEntry,
	): Omit<
		BrainEntry,
		"id" | "created_at" | "updated_at" | "usefulness_score" | "access_count"
	> {
		return {
			title: `Decision: ${decision.decision}`,
			content: [
				`Decision: ${decision.decision}`,
				`Alternatives: ${decision.alternatives.join("; ")}`,
				`Reasoning: ${decision.reasoning}`,
				`Authority Tier: ${decision.authorityTier}`,
				decision.outcome ? `Outcome: ${decision.outcome}` : "",
			]
				.filter(Boolean)
				.join("\n"),
			category: "decision",
			scope: "helm",
			tags: ["decision", decision.authorityTier, decision.agent],
			source_agent: decision.agent,
			source_type: "direct",
			confidence: 1.0,
			metadata: {
				alternatives: decision.alternatives,
				reasoning: decision.reasoning,
				authorityTier: decision.authorityTier,
				outcome: decision.outcome,
				originalTimestamp: decision.timestamp,
			},
		};
	}
}
