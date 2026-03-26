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
							const overlap = this.findKeywordOverlap(
								entry,
								other,
							);
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
							const overlap = this.findKeywordOverlap(
								entry,
								other,
							);
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
				this.db.addLink(
					entryA,
					entryB,
					"supersedes",
					1.0,
					resolvedBy,
				);
				break;
			case "withdraw":
				// Delete the contradicting entry
				this.db.deleteEntry(entryB);
				break;
			case "diverge":
				// Keep both, add a "related_to" link to acknowledge divergence
				this.db.addLink(
					entryA,
					entryB,
					"related_to",
					0.5,
					resolvedBy,
				);
				break;
		}

		this.resolutions.push(resolution);
		return resolution;
	}

	getPending(): { entryA: string; entryB: string }[] {
		const all = this.detectContradictions();
		const resolvedKeys = new Set(
			this.resolutions.map((r) =>
				[r.entryA, r.entryB].sort().join(":"),
			),
		);
		return all
			.filter(
				(c) =>
					!resolvedKeys.has(
						[c.entryA, c.entryB].sort().join(":"),
					),
			)
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
			errors.push(
				`authorityTier must be one of: ${validTiers.join(", ")}`,
			);
		}

		if (typeof obj.agent !== "string" || obj.agent.length === 0) {
			errors.push("agent must be a non-empty string");
		}

		if (obj.outcome !== undefined) {
			const validOutcomes = [
				"success",
				"failure",
				"partial",
				"pending",
			];
			if (!validOutcomes.includes(obj.outcome as string)) {
				errors.push(
					`outcome must be one of: ${validOutcomes.join(", ")}`,
				);
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
		| "id"
		| "created_at"
		| "updated_at"
		| "usefulness_score"
		| "access_count"
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
