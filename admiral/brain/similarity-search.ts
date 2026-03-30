/**
 * Similarity Search (B-11)
 *
 * Cosine distance similarity search over Brain entry embeddings.
 * Blends keyword (FTS) and semantic (embedding) signals with
 * configurable weights.
 */

import type { EmbeddingPipeline, EmbeddingVector } from "./embedding-pipeline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Search result with blended score */
export interface SimilarityResult {
	entryId: string;
	semanticScore: number;
	keywordScore: number;
	blendedScore: number;
	matchType: "semantic" | "keyword" | "blended";
}

/** Search options */
export interface SimilaritySearchOptions {
	/** Weight for semantic signal (0-1, default 0.6) */
	semanticWeight?: number;
	/** Weight for keyword signal (0-1, default 0.4) */
	keywordWeight?: number;
	/** Maximum results to return */
	limit?: number;
	/** Minimum blended score threshold */
	minScore?: number;
}

/** Keyword match provider interface */
export interface KeywordMatcher {
	search(query: string): Array<{ entryId: string; score: number }>;
}

// ---------------------------------------------------------------------------
// Cosine similarity
// ---------------------------------------------------------------------------

/** Compute cosine similarity between two vectors */
export function cosineSimilarity(a: EmbeddingVector, b: EmbeddingVector): number {
	if (a.length !== b.length) return 0;
	let dot = 0;
	let magA = 0;
	let magB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		magA += a[i] * a[i];
		magB += b[i] * b[i];
	}
	const denom = Math.sqrt(magA) * Math.sqrt(magB);
	return denom === 0 ? 0 : dot / denom;
}

// ---------------------------------------------------------------------------
// SimilaritySearch
// ---------------------------------------------------------------------------

export class SimilaritySearch {
	private pipeline: EmbeddingPipeline;
	private keywordMatcher?: KeywordMatcher;

	constructor(pipeline: EmbeddingPipeline, keywordMatcher?: KeywordMatcher) {
		this.pipeline = pipeline;
		this.keywordMatcher = keywordMatcher;
	}

	/**
	 * Search by semantic similarity to a query string.
	 * Generates an embedding for the query, then compares against all stored embeddings.
	 */
	async searchSemantic(
		query: string,
		allEntryIds: string[],
		options?: SimilaritySearchOptions,
	): Promise<SimilarityResult[]> {
		const limit = options?.limit ?? 10;
		const minScore = options?.minScore ?? 0;

		// Generate query embedding
		const queryResult = await this.pipeline.generateEmbedding("__query__", query);
		if (!queryResult.success) return [];

		const queryEmbedding = this.pipeline.getEmbedding("__query__");
		if (!queryEmbedding) return [];

		// Compare against all stored embeddings
		const results: SimilarityResult[] = [];
		for (const entryId of allEntryIds) {
			if (entryId === "__query__") continue;
			const stored = this.pipeline.getEmbedding(entryId);
			if (!stored) continue;

			const score = cosineSimilarity(queryEmbedding.vector, stored.vector);
			if (score >= minScore) {
				results.push({
					entryId,
					semanticScore: score,
					keywordScore: 0,
					blendedScore: score,
					matchType: "semantic",
				});
			}
		}

		results.sort((a, b) => b.blendedScore - a.blendedScore);
		return results.slice(0, limit);
	}

	/**
	 * Blended search: combine keyword and semantic signals.
	 */
	async searchBlended(
		query: string,
		allEntryIds: string[],
		options?: SimilaritySearchOptions,
	): Promise<SimilarityResult[]> {
		const semanticWeight = options?.semanticWeight ?? 0.6;
		const keywordWeight = options?.keywordWeight ?? 0.4;
		const limit = options?.limit ?? 10;
		const minScore = options?.minScore ?? 0;

		// Get semantic scores
		const semanticResults = await this.searchSemantic(query, allEntryIds, {
			limit: allEntryIds.length,
			minScore: 0,
		});
		const semanticMap = new Map(
			semanticResults.map((r) => [r.entryId, r.semanticScore]),
		);

		// Get keyword scores
		const keywordMap = new Map<string, number>();
		if (this.keywordMatcher) {
			const keywordResults = this.keywordMatcher.search(query);
			for (const r of keywordResults) {
				keywordMap.set(r.entryId, r.score);
			}
		}

		// Blend scores
		const allIds = new Set([...semanticMap.keys(), ...keywordMap.keys()]);
		const results: SimilarityResult[] = [];

		for (const entryId of allIds) {
			const semantic = semanticMap.get(entryId) ?? 0;
			const keyword = keywordMap.get(entryId) ?? 0;
			const blended = semantic * semanticWeight + keyword * keywordWeight;

			if (blended >= minScore) {
				const matchType =
					semantic > 0 && keyword > 0
						? "blended"
						: semantic > 0
							? "semantic"
							: "keyword";

				results.push({
					entryId,
					semanticScore: semantic,
					keywordScore: keyword,
					blendedScore: blended,
					matchType,
				});
			}
		}

		results.sort((a, b) => b.blendedScore - a.blendedScore);
		return results.slice(0, limit);
	}

	/**
	 * Find entries most similar to a given entry.
	 */
	findSimilar(
		entryId: string,
		allEntryIds: string[],
		limit = 5,
	): SimilarityResult[] {
		const source = this.pipeline.getEmbedding(entryId);
		if (!source) return [];

		const results: SimilarityResult[] = [];
		for (const otherId of allEntryIds) {
			if (otherId === entryId) continue;
			const other = this.pipeline.getEmbedding(otherId);
			if (!other) continue;

			const score = cosineSimilarity(source.vector, other.vector);
			results.push({
				entryId: otherId,
				semanticScore: score,
				keywordScore: 0,
				blendedScore: score,
				matchType: "semantic",
			});
		}

		results.sort((a, b) => b.blendedScore - a.blendedScore);
		return results.slice(0, limit);
	}
}
