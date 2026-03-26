/**
 * Knowledge Operations (DE-07 to DE-10)
 *
 * Quality metrics, cross-session transfer, export/import, and search API
 * for the Admiral knowledge layer.
 * Zero external dependencies — Node.js built-ins only.
 */

import type { BrainEntryLite, BrainLinkLite } from "./gardener.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** Tokenize a string into lowercase word tokens. */
function tokenize(text: string): Set<string> {
	const tokens = new Set<string>();
	for (const word of text.toLowerCase().split(/\W+/)) {
		if (word.length > 1) tokens.add(word);
	}
	return tokens;
}

// ---------------------------------------------------------------------------
// DE-07: Knowledge quality metrics
// ---------------------------------------------------------------------------

export interface KnowledgeHealthReport {
	timestamp: number;
	metrics: {
		freshness: number;
		accuracyProxy: number;
		usageFrequency: number;
		contradictionRate: number;
		coverage: number;
		linkDensity: number;
	};
	trends: {
		metric: string;
		direction: "improving" | "declining" | "stable";
		delta: number;
	}[];
	totalEntries: number;
	totalLinks: number;
}

export class KnowledgeQualityMetrics {
	private history: KnowledgeHealthReport[] = [];

	generateReport(
		entries: BrainEntryLite[],
		links: BrainLinkLite[],
		knownCategories?: string[],
	): KnowledgeHealthReport {
		const now = Date.now();
		const freshCutoff = now - 30 * DAY_MS;

		// Freshness: % entries updated within 30 days
		const freshCount = entries.filter(
			(e) => e.updated_at >= freshCutoff,
		).length;
		const freshness = entries.length > 0 ? freshCount / entries.length : 0;

		// Accuracy proxy: avg usefulness_score
		const accuracyProxy =
			entries.length > 0
				? entries.reduce((sum, e) => sum + e.usefulness_score, 0) /
					entries.length
				: 0;

		// Usage frequency: avg access_count
		const usageFrequency =
			entries.length > 0
				? entries.reduce((sum, e) => sum + e.access_count, 0) / entries.length
				: 0;

		// Contradiction rate: % entries involved in contradiction links
		const contradictionEntries = new Set<string>();
		for (const link of links) {
			if (link.link_type === "contradicts") {
				contradictionEntries.add(link.from_entry);
				contradictionEntries.add(link.to_entry);
			}
		}
		const contradictionRate =
			entries.length > 0 ? contradictionEntries.size / entries.length : 0;

		// Coverage: unique categories / total possible
		const uniqueCategories = new Set(entries.map((e) => e.category));
		const totalCategories = knownCategories
			? knownCategories.length
			: Math.max(uniqueCategories.size, 1);
		const coverage = uniqueCategories.size / totalCategories;

		// Link density: avg links per entry
		const linkDensity = entries.length > 0 ? links.length / entries.length : 0;

		const report: KnowledgeHealthReport = {
			timestamp: now,
			metrics: {
				freshness,
				accuracyProxy,
				usageFrequency,
				contradictionRate,
				coverage,
				linkDensity,
			},
			trends: [],
			totalEntries: entries.length,
			totalLinks: links.length,
		};

		// Compute trends against previous report
		report.trends = this.computeTrends(report);
		this.history.push(report);

		return report;
	}

	computeTrends(current?: KnowledgeHealthReport): {
		metric: string;
		direction: "improving" | "declining" | "stable";
		delta: number;
	}[] {
		const latest = current ?? this.history[this.history.length - 1];
		const previous = current
			? this.history[this.history.length - 1]
			: this.history[this.history.length - 2];

		if (!latest || !previous) return [];

		const trends: {
			metric: string;
			direction: "improving" | "declining" | "stable";
			delta: number;
		}[] = [];
		const metricKeys = Object.keys(
			latest.metrics,
		) as (keyof KnowledgeHealthReport["metrics"])[];

		for (const key of metricKeys) {
			const delta = latest.metrics[key] - previous.metrics[key];
			const improving =
				key === "contradictionRate" ? delta < -0.01 : delta > 0.01;
			const declining =
				key === "contradictionRate" ? delta > 0.01 : delta < -0.01;
			trends.push({
				metric: key,
				direction: improving ? "improving" : declining ? "declining" : "stable",
				delta,
			});
		}

		return trends;
	}

	getHistory(limit?: number): KnowledgeHealthReport[] {
		if (limit === undefined) return [...this.history];
		return this.history.slice(-limit);
	}
}

// ---------------------------------------------------------------------------
// DE-08: Cross-session knowledge transfer
// ---------------------------------------------------------------------------

export interface SessionTransfer {
	sessionId: string;
	capturedAt: number;
	entries: { id: string; title: string; category: string; relevance: number }[];
	lessons: string[];
	repeatFailures: string[];
}

export class CrossSessionTransfer {
	private transfers: SessionTransfer[] = [];

	captureSessionEnd(
		sessionId: string,
		entries: BrainEntryLite[],
		recentFailures?: string[],
	): SessionTransfer {
		// Rank entries by recency and usefulness
		const ranked = entries
			.map((e) => ({
				id: e.id,
				title: e.title,
				category: e.category,
				relevance:
					e.usefulness_score * 0.6 + Math.min(e.access_count / 10, 1) * 0.4,
			}))
			.sort((a, b) => b.relevance - a.relevance);

		// Extract lessons from high-usefulness entries
		const lessons = entries
			.filter((e) => e.usefulness_score > 0.7)
			.map((e) => e.title);

		// Detect repeat failures across sessions
		const previousFailures = new Set<string>();
		for (const t of this.transfers) {
			for (const f of t.repeatFailures) {
				previousFailures.add(f);
			}
		}

		const repeatFailures = (recentFailures ?? []).filter((f) =>
			previousFailures.has(f),
		);
		const allFailures = [
			...new Set([...(recentFailures ?? []), ...repeatFailures]),
		];

		const transfer: SessionTransfer = {
			sessionId,
			capturedAt: Date.now(),
			entries: ranked,
			lessons,
			repeatFailures: allFailures,
		};

		this.transfers.push(transfer);
		return transfer;
	}

	loadSessionStart(
		categories: string[],
		previousTransfers?: SessionTransfer[],
	): { relevant: BrainEntryLite[]; warnings: string[] } {
		const source = previousTransfers ?? this.transfers;
		const warnings: string[] = [];

		// Collect repeat failures from all previous sessions
		const failureCounts = new Map<string, number>();
		for (const t of source) {
			for (const f of t.repeatFailures) {
				failureCounts.set(f, (failureCounts.get(f) ?? 0) + 1);
			}
		}

		for (const [failure, count] of failureCounts) {
			if (count >= 2) {
				warnings.push(`Repeat failure (${count}x): ${failure}`);
			}
		}

		// Get relevant entries from most recent transfer
		const categorySet = new Set(categories);
		const relevant: BrainEntryLite[] = [];

		for (const t of source.slice(-3)) {
			for (const entry of t.entries) {
				if (categorySet.has(entry.category)) {
					// Reconstruct a minimal BrainEntryLite
					relevant.push({
						id: entry.id,
						title: entry.title,
						content: "",
						category: entry.category,
						tags: [],
						created_at: t.capturedAt,
						updated_at: t.capturedAt,
						access_count: 0,
						usefulness_score: entry.relevance,
						metadata: {},
					});
				}
			}
		}

		return { relevant, warnings };
	}

	getTransferHistory(limit?: number): SessionTransfer[] {
		if (limit === undefined) return [...this.transfers];
		return this.transfers.slice(-limit);
	}
}

// ---------------------------------------------------------------------------
// DE-09: Knowledge export/import
// ---------------------------------------------------------------------------

export interface KnowledgeArchive {
	version: string;
	exportedAt: number;
	exportedBy: string;
	filter?: {
		categories?: string[];
		tags?: string[];
		since?: number;
		minQuality?: number;
	};
	entries: BrainEntryLite[];
	links: BrainLinkLite[];
	metadata: { totalEntries: number; totalLinks: number };
}

export class KnowledgeExporter {
	export(
		entries: BrainEntryLite[],
		links: BrainLinkLite[],
		filter?: KnowledgeArchive["filter"],
	): KnowledgeArchive {
		let filtered = [...entries];

		if (filter?.categories && filter.categories.length > 0) {
			const cats = new Set(filter.categories);
			filtered = filtered.filter((e) => cats.has(e.category));
		}

		if (filter?.tags && filter.tags.length > 0) {
			const tagSet = new Set(filter.tags);
			filtered = filtered.filter((e) => e.tags.some((t) => tagSet.has(t)));
		}

		if (filter?.since !== undefined) {
			filtered = filtered.filter((e) => e.created_at >= filter.since!);
		}

		if (filter?.minQuality !== undefined) {
			filtered = filtered.filter(
				(e) => e.usefulness_score >= filter.minQuality!,
			);
		}

		// Filter links to only include those between filtered entries
		const entryIds = new Set(filtered.map((e) => e.id));
		const filteredLinks = links.filter(
			(l) => entryIds.has(l.from_entry) && entryIds.has(l.to_entry),
		);

		return {
			version: "1.0.0",
			exportedAt: Date.now(),
			exportedBy: "admiral-knowledge-exporter",
			filter,
			entries: filtered,
			links: filteredLinks,
			metadata: {
				totalEntries: filtered.length,
				totalLinks: filteredLinks.length,
			},
		};
	}

	stripPII(archive: KnowledgeArchive): KnowledgeArchive {
		const piiPatterns = [
			/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
			/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // phone numbers
			/\b\d{3}-\d{2}-\d{4}\b/g, // SSN
		];

		const scrub = (text: string): string => {
			let result = text;
			for (const pattern of piiPatterns) {
				result = result.replace(pattern, "[REDACTED]");
			}
			return result;
		};

		const scrubbed: KnowledgeArchive = {
			...archive,
			entries: archive.entries.map((e) => ({
				...e,
				title: scrub(e.title),
				content: scrub(e.content),
			})),
		};

		return scrubbed;
	}

	serialize(archive: KnowledgeArchive): string {
		return JSON.stringify(archive, null, 2);
	}
}

export class KnowledgeImporter {
	deserialize(json: string): KnowledgeArchive {
		const parsed = JSON.parse(json) as KnowledgeArchive;
		return parsed;
	}

	merge(
		existing: BrainEntryLite[],
		incoming: KnowledgeArchive,
	): { added: BrainEntryLite[]; duplicates: number; conflicts: number } {
		const existingTitles = new Map<string, BrainEntryLite>();
		for (const e of existing) {
			existingTitles.set(e.title.toLowerCase(), e);
		}

		const added: BrainEntryLite[] = [];
		let duplicates = 0;
		let conflicts = 0;

		for (const entry of incoming.entries) {
			const titleLower = entry.title.toLowerCase();
			const match = existingTitles.get(titleLower);

			if (match) {
				// Check if it's a true duplicate or a conflict
				const existingTokens = tokenize(match.content);
				const incomingTokens = tokenize(entry.content);
				let intersection = 0;
				for (const t of existingTokens) {
					if (incomingTokens.has(t)) intersection++;
				}
				const union = existingTokens.size + incomingTokens.size - intersection;
				const similarity = union === 0 ? 1 : intersection / union;

				if (similarity > 0.9) {
					duplicates++;
				} else {
					conflicts++;
				}
			} else {
				added.push(entry);
			}
		}

		return { added, duplicates, conflicts };
	}

	validate(archive: KnowledgeArchive): { valid: boolean; errors: string[] } {
		const errors: string[] = [];

		if (!archive.version) {
			errors.push("Missing version field");
		}

		if (!archive.exportedAt || typeof archive.exportedAt !== "number") {
			errors.push("Missing or invalid exportedAt timestamp");
		}

		if (!archive.exportedBy || typeof archive.exportedBy !== "string") {
			errors.push("Missing or invalid exportedBy field");
		}

		if (!Array.isArray(archive.entries)) {
			errors.push("entries must be an array");
		} else {
			for (let i = 0; i < archive.entries.length; i++) {
				const e = archive.entries[i];
				if (!e.id) errors.push(`Entry at index ${i} missing id`);
				if (!e.title) errors.push(`Entry at index ${i} missing title`);
			}
		}

		if (!Array.isArray(archive.links)) {
			errors.push("links must be an array");
		}

		if (!archive.metadata) {
			errors.push("Missing metadata field");
		}

		return { valid: errors.length === 0, errors };
	}
}

// ---------------------------------------------------------------------------
// DE-10: Knowledge search API
// ---------------------------------------------------------------------------

export interface SearchResult {
	entries: BrainEntryLite[];
	total: number;
	query: string;
	filters: Record<string, unknown>;
	timing: number;
}

export class KnowledgeSearchApi {
	search(
		query: string,
		entries: BrainEntryLite[],
		options?: {
			category?: string;
			tags?: string[];
			since?: number;
			limit?: number;
		},
	): SearchResult {
		const start = Date.now();
		const queryTokens = tokenize(query);

		// Score each entry by keyword overlap
		const scored = entries
			.map((e) => {
				const entryTokens = tokenize(
					`${e.title} ${e.content} ${e.tags.join(" ")}`,
				);
				let matchCount = 0;
				for (const qt of queryTokens) {
					if (entryTokens.has(qt)) matchCount++;
				}
				const score = queryTokens.size > 0 ? matchCount / queryTokens.size : 0;
				return { entry: e, score };
			})
			.filter((s) => s.score > 0);

		// Apply filters
		let filtered = scored;

		if (options?.category) {
			filtered = filtered.filter((s) => s.entry.category === options.category);
		}

		if (options?.tags && options.tags.length > 0) {
			const tagSet = new Set(options.tags);
			filtered = filtered.filter((s) =>
				s.entry.tags.some((t) => tagSet.has(t)),
			);
		}

		if (options?.since !== undefined) {
			filtered = filtered.filter((s) => s.entry.created_at >= options.since!);
		}

		// Sort by score descending, then by usefulness
		filtered.sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score;
			return b.entry.usefulness_score - a.entry.usefulness_score;
		});

		const limit = options?.limit ?? 20;
		const results = filtered.slice(0, limit).map((s) => s.entry);

		return {
			entries: results,
			total: filtered.length,
			query,
			filters: options ?? {},
			timing: Date.now() - start,
		};
	}

	getEntry(id: string, entries: BrainEntryLite[]): BrainEntryLite | undefined {
		return entries.find((e) => e.id === id);
	}

	getLinks(entryId: string, links: BrainLinkLite[]): BrainLinkLite[] {
		return links.filter(
			(l) => l.from_entry === entryId || l.to_entry === entryId,
		);
	}

	getHealth(
		entries: BrainEntryLite[],
		links: BrainLinkLite[],
	): { totalEntries: number; totalLinks: number; avgQuality: number } {
		const avgQuality =
			entries.length > 0
				? entries.reduce((sum, e) => sum + e.usefulness_score, 0) /
					entries.length
				: 0;

		return {
			totalEntries: entries.length,
			totalLinks: links.length,
			avgQuality,
		};
	}

	getStats(entries: BrainEntryLite[]): {
		byCategory: Record<string, number>;
		byMonth: Record<string, number>;
		topAccessed: { id: string; title: string; count: number }[];
	} {
		const byCategory: Record<string, number> = {};
		const byMonth: Record<string, number> = {};
		const accessList: { id: string; title: string; count: number }[] = [];

		for (const e of entries) {
			// By category
			byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;

			// By month
			const d = new Date(e.created_at);
			const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
			byMonth[monthKey] = (byMonth[monthKey] ?? 0) + 1;

			// Access tracking
			accessList.push({ id: e.id, title: e.title, count: e.access_count });
		}

		// Top 10 accessed
		accessList.sort((a, b) => b.count - a.count);
		const topAccessed = accessList.slice(0, 10);

		return { byCategory, byMonth, topAccessed };
	}
}
