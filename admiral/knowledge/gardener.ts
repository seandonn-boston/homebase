/**
 * Knowledge Gardener (DE-02)
 *
 * Propose-tier maintenance agent that analyzes brain entries for staleness,
 * contradictions, duplicates, orphans, and metadata hygiene issues.
 * Does NOT modify data — only reports findings.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Lite interfaces (decoupled from full BrainDatabase)
// ---------------------------------------------------------------------------

export interface BrainEntryLite {
	id: string;
	title: string;
	content: string;
	category: string;
	tags: string[];
	created_at: number;
	updated_at: number;
	access_count: number;
	usefulness_score: number;
	source_agent?: string;
	metadata: Record<string, unknown>;
}

export interface BrainLinkLite {
	id: string;
	from_entry: string;
	to_entry: string;
	link_type: string;
	confidence: number;
}

// ---------------------------------------------------------------------------
// Finding types
// ---------------------------------------------------------------------------

export interface GardenerFinding {
	type: "stale" | "contradiction" | "duplicate" | "orphan" | "metadata_hygiene";
	entryId: string;
	description: string;
	severity: "high" | "medium" | "low";
	recommendation: string;
}

export interface MaintenanceReport {
	timestamp: number;
	findings: GardenerFinding[];
	staleEntries: number;
	contradictions: number;
	duplicates: number;
	orphans: number;
	metadataIssues: number;
}

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

/** Jaccard similarity between two token sets. */
function jaccard(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 1;
	let intersection = 0;
	for (const t of a) {
		if (b.has(t)) intersection++;
	}
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

// ---------------------------------------------------------------------------
// KnowledgeGardener
// ---------------------------------------------------------------------------

export class KnowledgeGardener {
	analyze(
		entries: BrainEntryLite[],
		links: BrainLinkLite[],
	): MaintenanceReport {
		const stale = this.detectStale(entries);
		const contradictions = this.detectContradictions(entries, links);
		const duplicates = this.detectDuplicates(entries);
		const orphans = this.detectOrphans(entries, links);
		const metadataIssues = this.checkMetadataHygiene(entries);

		const findings = [
			...stale,
			...contradictions,
			...duplicates,
			...orphans,
			...metadataIssues,
		];

		return {
			timestamp: Date.now(),
			findings,
			staleEntries: stale.length,
			contradictions: contradictions.length,
			duplicates: duplicates.length,
			orphans: orphans.length,
			metadataIssues: metadataIssues.length,
		};
	}

	/** Entries not accessed in `staleDays` (default 90) days. */
	detectStale(
		entries: BrainEntryLite[],
		staleDays: number = 90,
	): GardenerFinding[] {
		const cutoff = Date.now() - staleDays * DAY_MS;
		const findings: GardenerFinding[] = [];

		for (const e of entries) {
			if (e.updated_at < cutoff && e.access_count === 0) {
				findings.push({
					type: "stale",
					entryId: e.id,
					description: `Entry "${e.title}" not updated or accessed in ${staleDays}+ days`,
					severity: "medium",
					recommendation: "Review for relevance or archive",
				});
			} else if (e.updated_at < cutoff) {
				findings.push({
					type: "stale",
					entryId: e.id,
					description: `Entry "${e.title}" not updated in ${staleDays}+ days`,
					severity: "low",
					recommendation: "Review for relevance",
				});
			}
		}

		return findings;
	}

	/** Entries with contradicts links or conflicting content in same category. */
	detectContradictions(
		entries: BrainEntryLite[],
		links: BrainLinkLite[],
	): GardenerFinding[] {
		const findings: GardenerFinding[] = [];
		const entryMap = new Map<string, BrainEntryLite>();
		for (const e of entries) entryMap.set(e.id, e);

		// Explicit contradicts links
		for (const link of links) {
			if (link.link_type === "contradicts") {
				const from = entryMap.get(link.from_entry);
				const to = entryMap.get(link.to_entry);
				if (from && to) {
					findings.push({
						type: "contradiction",
						entryId: from.id,
						description: `Entry "${from.title}" contradicts "${to.title}" (confidence: ${link.confidence})`,
						severity: link.confidence > 0.8 ? "high" : "medium",
						recommendation: "Resolve contradiction — one entry may be outdated",
					});
				}
			}
		}

		// Same-category entries with high similarity but different conclusions
		const byCategory = new Map<string, BrainEntryLite[]>();
		for (const e of entries) {
			const list = byCategory.get(e.category) ?? [];
			list.push(e);
			byCategory.set(e.category, list);
		}

		for (const group of byCategory.values()) {
			for (let i = 0; i < group.length; i++) {
				for (let j = i + 1; j < group.length; j++) {
					const tokA = tokenize(group[i].title);
					const tokB = tokenize(group[j].title);
					const sim = jaccard(tokA, tokB);
					if (sim > 0.7 && sim < 0.95) {
						// High title similarity but not duplicate → possible contradiction
						findings.push({
							type: "contradiction",
							entryId: group[i].id,
							description: `"${group[i].title}" and "${group[j].title}" may conflict (title similarity ${(sim * 100).toFixed(0)}%)`,
							severity: "low",
							recommendation: "Review both entries for consistency",
						});
					}
				}
			}
		}

		return findings;
	}

	/** Title/content similarity > 0.95 (simple Jaccard on tokenized words). */
	detectDuplicates(entries: BrainEntryLite[]): GardenerFinding[] {
		const findings: GardenerFinding[] = [];
		const seen = new Set<string>();

		for (let i = 0; i < entries.length; i++) {
			for (let j = i + 1; j < entries.length; j++) {
				const pairKey = `${entries[i].id}:${entries[j].id}`;
				if (seen.has(pairKey)) continue;
				seen.add(pairKey);

				const tokA = tokenize(`${entries[i].title} ${entries[i].content}`);
				const tokB = tokenize(`${entries[j].title} ${entries[j].content}`);
				const sim = jaccard(tokA, tokB);

				if (sim > 0.95) {
					findings.push({
						type: "duplicate",
						entryId: entries[i].id,
						description: `"${entries[i].title}" appears to duplicate "${entries[j].title}" (similarity ${(sim * 100).toFixed(1)}%)`,
						severity: "medium",
						recommendation: `Merge with entry ${entries[j].id} or remove`,
					});
				}
			}
		}

		return findings;
	}

	/** Entries with zero incoming or outgoing links after 30+ days. */
	detectOrphans(
		entries: BrainEntryLite[],
		links: BrainLinkLite[],
	): GardenerFinding[] {
		const findings: GardenerFinding[] = [];
		const cutoff = Date.now() - 30 * DAY_MS;

		const connected = new Set<string>();
		for (const link of links) {
			connected.add(link.from_entry);
			connected.add(link.to_entry);
		}

		for (const e of entries) {
			if (!connected.has(e.id) && e.created_at < cutoff) {
				findings.push({
					type: "orphan",
					entryId: e.id,
					description: `Entry "${e.title}" has no links after 30+ days`,
					severity: "low",
					recommendation: "Add related links or review for removal",
				});
			}
		}

		return findings;
	}

	/** Missing category, empty tags, no source attribution. */
	checkMetadataHygiene(entries: BrainEntryLite[]): GardenerFinding[] {
		const findings: GardenerFinding[] = [];

		for (const e of entries) {
			if (!e.category || e.category.trim() === "") {
				findings.push({
					type: "metadata_hygiene",
					entryId: e.id,
					description: `Entry "${e.title}" has no category`,
					severity: "high",
					recommendation: "Assign a category",
				});
			}

			if (!e.tags || e.tags.length === 0) {
				findings.push({
					type: "metadata_hygiene",
					entryId: e.id,
					description: `Entry "${e.title}" has no tags`,
					severity: "medium",
					recommendation: "Add relevant tags",
				});
			}

			if (!e.source_agent) {
				findings.push({
					type: "metadata_hygiene",
					entryId: e.id,
					description: `Entry "${e.title}" has no source attribution`,
					severity: "low",
					recommendation: "Add source_agent attribution",
				});
			}
		}

		return findings;
	}
}
