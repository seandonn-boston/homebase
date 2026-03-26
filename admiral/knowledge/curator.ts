/**
 * Knowledge Curator (DE-03)
 *
 * Propose-tier agent that suggests metadata enrichment, quality scores,
 * and link suggestions for brain entries. Does NOT modify data.
 * Zero external dependencies — Node.js built-ins only.
 */

import type { BrainEntryLite, BrainLinkLite } from "./gardener.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CuratorImprovement {
	entryId: string;
	type:
		| "metadata"
		| "format"
		| "description"
		| "link_suggestion"
		| "quality_score";
	before: string;
	after: string;
	confidence: number;
}

export interface CurationReport {
	timestamp: number;
	improvements: CuratorImprovement[];
	qualityScores: { entryId: string; score: number }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000;

/** Simple keyword extraction: words of length >= 3 that appear in content. */
function extractKeywords(text: string): Set<string> {
	const words = new Set<string>();
	for (const w of text.toLowerCase().split(/\W+/)) {
		if (w.length >= 3) words.add(w);
	}
	return words;
}

// ---------------------------------------------------------------------------
// KnowledgeCurator
// ---------------------------------------------------------------------------

export class KnowledgeCurator {
	analyze(entries: BrainEntryLite[], links: BrainLinkLite[]): CurationReport {
		const improvements: CuratorImprovement[] = [];
		const qualityScores: { entryId: string; score: number }[] = [];

		for (const entry of entries) {
			improvements.push(...this.suggestMetadataEnrichment(entry));
			qualityScores.push({
				entryId: entry.id,
				score: this.scoreQuality(entry),
			});
		}

		// Link suggestions for each entry against all others
		for (const entry of entries) {
			const suggestions = this.suggestLinks(entry, entries);
			for (const s of suggestions) {
				// Skip if link already exists
				const exists = links.some(
					(l) =>
						(l.from_entry === entry.id && l.to_entry === s.targetId) ||
						(l.from_entry === s.targetId && l.to_entry === entry.id),
				);
				if (!exists) {
					improvements.push({
						entryId: entry.id,
						type: "link_suggestion",
						before: "no link",
						after: `${s.linkType} -> ${s.targetId}`,
						confidence: s.confidence,
					});
				}
			}
		}

		return {
			timestamp: Date.now(),
			improvements,
			qualityScores,
		};
	}

	/** Suggest metadata improvements for a single entry. */
	suggestMetadataEnrichment(entry: BrainEntryLite): CuratorImprovement[] {
		const improvements: CuratorImprovement[] = [];

		// Missing tags — suggest keywords from content
		if (!entry.tags || entry.tags.length === 0) {
			const keywords = extractKeywords(entry.content);
			const suggested = Array.from(keywords).slice(0, 5);
			if (suggested.length > 0) {
				improvements.push({
					entryId: entry.id,
					type: "metadata",
					before: "[]",
					after: JSON.stringify(suggested),
					confidence: 0.6,
				});
			}
		}

		// Missing or empty category
		if (!entry.category || entry.category.trim() === "") {
			improvements.push({
				entryId: entry.id,
				type: "metadata",
				before: entry.category ?? "",
				after: "uncategorized",
				confidence: 0.3,
			});
		}

		// Title could be standardized (e.g., all lowercase, too short)
		if (entry.title.length < 5) {
			improvements.push({
				entryId: entry.id,
				type: "format",
				before: entry.title,
				after: `${entry.title} (needs descriptive title)`,
				confidence: 0.5,
			});
		}

		// Missing source attribution
		if (!entry.source_agent) {
			improvements.push({
				entryId: entry.id,
				type: "metadata",
				before: "",
				after: "unknown",
				confidence: 0.4,
			});
		}

		return improvements;
	}

	/**
	 * Quality score 0-1 based on:
	 * - has category (0.2)
	 * - has tags (0.2)
	 * - has content > 100 chars (0.2)
	 * - has source (0.2)
	 * - accessed recently (0.2)
	 */
	scoreQuality(entry: BrainEntryLite): number {
		let score = 0;

		if (entry.category && entry.category.trim() !== "") score += 0.2;
		if (entry.tags && entry.tags.length > 0) score += 0.2;
		if (entry.content && entry.content.length > 100) score += 0.2;
		if (entry.source_agent) score += 0.2;

		// Accessed in last 30 days
		const recentCutoff = Date.now() - 30 * DAY_MS;
		if (entry.updated_at > recentCutoff || entry.access_count > 0) score += 0.2;

		return Math.round(score * 100) / 100;
	}

	/** Keyword overlap suggests related_to links. */
	suggestLinks(
		entry: BrainEntryLite,
		otherEntries: BrainEntryLite[],
	): { targetId: string; linkType: string; confidence: number }[] {
		const suggestions: {
			targetId: string;
			linkType: string;
			confidence: number;
		}[] = [];
		const entryKeywords = extractKeywords(`${entry.title} ${entry.content}`);

		if (entryKeywords.size === 0) return suggestions;

		for (const other of otherEntries) {
			if (other.id === entry.id) continue;

			const otherKeywords = extractKeywords(`${other.title} ${other.content}`);
			if (otherKeywords.size === 0) continue;

			let overlap = 0;
			for (const kw of entryKeywords) {
				if (otherKeywords.has(kw)) overlap++;
			}

			const similarity =
				overlap / (entryKeywords.size + otherKeywords.size - overlap);

			if (similarity > 0.3) {
				suggestions.push({
					targetId: other.id,
					linkType: "related_to",
					confidence: Math.round(similarity * 100) / 100,
				});
			}
		}

		return suggestions.sort((a, b) => b.confidence - a.confidence);
	}
}
