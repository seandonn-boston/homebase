import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { EmbeddingPipeline, HashEmbeddingBackend } from "./embedding-pipeline";
import { SimilaritySearch, cosineSimilarity } from "./similarity-search";
import type { KeywordMatcher } from "./similarity-search";

describe("cosineSimilarity", () => {
	it("returns 1 for identical vectors", () => {
		const v = [1, 0, 0];
		assert.equal(cosineSimilarity(v, v), 1);
	});

	it("returns 0 for orthogonal vectors", () => {
		assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
	});

	it("returns -1 for opposite vectors", () => {
		const sim = cosineSimilarity([1, 0], [-1, 0]);
		assert.ok(Math.abs(sim - (-1)) < 0.001);
	});

	it("returns 0 for mismatched lengths", () => {
		assert.equal(cosineSimilarity([1, 0], [1, 0, 0]), 0);
	});

	it("returns 0 for zero vectors", () => {
		assert.equal(cosineSimilarity([0, 0], [0, 0]), 0);
	});
});

describe("SimilaritySearch", () => {
	let pipeline: EmbeddingPipeline;
	let search: SimilaritySearch;

	beforeEach(async () => {
		pipeline = new EmbeddingPipeline(new HashEmbeddingBackend(64, "1.0.0"));

		// Pre-populate embeddings
		await pipeline.generateEmbedding("e1", "kubernetes deployment strategy");
		await pipeline.generateEmbedding("e2", "docker container management");
		await pipeline.generateEmbedding("e3", "react component patterns");
		await pipeline.generateEmbedding("e4", "kubernetes pod scaling");

		search = new SimilaritySearch(pipeline);
	});

	describe("searchSemantic", () => {
		it("returns results sorted by similarity", async () => {
			const results = await search.searchSemantic(
				"kubernetes deployment",
				["e1", "e2", "e3", "e4"],
			);
			assert.ok(results.length > 0);
			// Results should be sorted descending
			for (let i = 1; i < results.length; i++) {
				assert.ok(results[i - 1].blendedScore >= results[i].blendedScore);
			}
		});

		it("respects limit", async () => {
			const results = await search.searchSemantic(
				"kubernetes",
				["e1", "e2", "e3", "e4"],
				{ limit: 2 },
			);
			assert.ok(results.length <= 2);
		});

		it("respects minScore", async () => {
			const results = await search.searchSemantic(
				"kubernetes deployment",
				["e1", "e2", "e3", "e4"],
				{ minScore: 0.99 },
			);
			// High threshold should filter most results
			for (const r of results) {
				assert.ok(r.blendedScore >= 0.99);
			}
		});

		it("returns empty for no embeddings", async () => {
			const emptyPipeline = new EmbeddingPipeline(new HashEmbeddingBackend(64));
			const emptySearch = new SimilaritySearch(emptyPipeline);
			const results = await emptySearch.searchSemantic("test", ["e1"]);
			assert.equal(results.length, 0);
		});

		it("sets matchType to semantic", async () => {
			const results = await search.searchSemantic(
				"kubernetes",
				["e1", "e2", "e3", "e4"],
			);
			for (const r of results) {
				assert.equal(r.matchType, "semantic");
			}
		});
	});

	describe("searchBlended", () => {
		it("blends keyword and semantic scores", async () => {
			const keywordMatcher: KeywordMatcher = {
				search: (query) => {
					if (query.includes("kubernetes")) {
						return [
							{ entryId: "e1", score: 0.9 },
							{ entryId: "e4", score: 0.8 },
						];
					}
					return [];
				},
			};

			const blendedSearch = new SimilaritySearch(pipeline, keywordMatcher);
			const results = await blendedSearch.searchBlended(
				"kubernetes deployment",
				["e1", "e2", "e3", "e4"],
			);

			assert.ok(results.length > 0);
			// e1 should have blended match type since it matches both signals
			const e1 = results.find((r) => r.entryId === "e1");
			assert.ok(e1);
			assert.equal(e1.matchType, "blended");
			assert.ok(e1.keywordScore > 0);
			assert.ok(e1.semanticScore > 0);
		});

		it("respects custom weights", async () => {
			const keywordMatcher: KeywordMatcher = {
				search: () => [{ entryId: "e1", score: 1.0 }],
			};

			const blendedSearch = new SimilaritySearch(pipeline, keywordMatcher);
			const heavyKeyword = await blendedSearch.searchBlended(
				"test",
				["e1"],
				{ semanticWeight: 0.1, keywordWeight: 0.9 },
			);
			const heavySemantic = await blendedSearch.searchBlended(
				"test",
				["e1"],
				{ semanticWeight: 0.9, keywordWeight: 0.1 },
			);

			// With heavy keyword weight, blended score should be closer to keyword score
			assert.ok(heavyKeyword[0].blendedScore > heavySemantic[0].blendedScore);
		});

		it("works without keyword matcher (semantic only)", async () => {
			const results = await search.searchBlended(
				"kubernetes",
				["e1", "e2", "e3", "e4"],
			);
			assert.ok(results.length > 0);
			for (const r of results) {
				assert.equal(r.keywordScore, 0);
			}
		});
	});

	describe("findSimilar", () => {
		it("finds entries similar to a given entry", () => {
			const results = search.findSimilar("e1", ["e1", "e2", "e3", "e4"]);
			assert.ok(results.length > 0);
			// Should not include the source entry
			assert.ok(!results.some((r) => r.entryId === "e1"));
		});

		it("respects limit", () => {
			const results = search.findSimilar("e1", ["e1", "e2", "e3", "e4"], 1);
			assert.equal(results.length, 1);
		});

		it("returns empty for unknown entry", () => {
			const results = search.findSimilar("unknown", ["e1", "e2"]);
			assert.equal(results.length, 0);
		});

		it("returns sorted by similarity", () => {
			const results = search.findSimilar("e1", ["e1", "e2", "e3", "e4"]);
			for (let i = 1; i < results.length; i++) {
				assert.ok(results[i - 1].blendedScore >= results[i].blendedScore);
			}
		});
	});
});
