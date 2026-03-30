import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import {
	EmbeddingPipeline,
	HashEmbeddingBackend,
} from "./embedding-pipeline";
import type { EmbeddingBackend, EmbeddingVector } from "./embedding-pipeline";

describe("EmbeddingPipeline", () => {
	let pipeline: EmbeddingPipeline;

	beforeEach(() => {
		pipeline = new EmbeddingPipeline(new HashEmbeddingBackend(64, "1.0.0"));
	});

	describe("generateEmbedding", () => {
		it("generates embedding for a single entry", async () => {
			const result = await pipeline.generateEmbedding("e1", "Hello world");
			assert.equal(result.success, true);
			assert.equal(result.dimensions, 64);
			assert.equal(result.entryId, "e1");
		});

		it("stores the embedding", async () => {
			await pipeline.generateEmbedding("e1", "Hello world");
			const stored = pipeline.getEmbedding("e1");
			assert.ok(stored);
			assert.equal(stored.entryId, "e1");
			assert.equal(stored.vector.length, 64);
			assert.equal(stored.modelName, "hash-embedding");
			assert.equal(stored.modelVersion, "1.0.0");
		});

		it("handles backend errors gracefully", async () => {
			const failBackend: EmbeddingBackend = {
				name: "fail",
				modelVersion: "1.0",
				dimensions: 64,
				embed: async () => { throw new Error("API error"); },
				embedBatch: async () => { throw new Error("API error"); },
			};
			const failPipeline = new EmbeddingPipeline(failBackend);
			const result = await failPipeline.generateEmbedding("e1", "test");
			assert.equal(result.success, false);
			assert.ok(result.error?.includes("API error"));
		});
	});

	describe("generateBatch", () => {
		it("generates embeddings for multiple entries", async () => {
			const results = await pipeline.generateBatch([
				{ id: "e1", text: "First entry" },
				{ id: "e2", text: "Second entry" },
				{ id: "e3", text: "Third entry" },
			]);
			assert.equal(results.length, 3);
			assert.ok(results.every((r) => r.success));
		});
	});

	describe("needsReembedding", () => {
		it("returns true for unknown entries", () => {
			assert.equal(pipeline.needsReembedding("unknown", "text"), true);
		});

		it("returns false for up-to-date entries", async () => {
			await pipeline.generateEmbedding("e1", "Hello");
			assert.equal(pipeline.needsReembedding("e1", "Hello"), false);
		});

		it("returns true when text changes", async () => {
			await pipeline.generateEmbedding("e1", "Hello");
			assert.equal(pipeline.needsReembedding("e1", "World"), true);
		});

		it("returns true after model switch", async () => {
			await pipeline.generateEmbedding("e1", "Hello");
			pipeline.switchBackend(new HashEmbeddingBackend(64, "2.0.0"));
			assert.equal(pipeline.needsReembedding("e1", "Hello"), true);
		});
	});

	describe("switchBackend", () => {
		it("updates the active backend", () => {
			pipeline.switchBackend(new HashEmbeddingBackend(128, "2.0.0"));
			const info = pipeline.getBackendInfo();
			assert.equal(info.version, "2.0.0");
			assert.equal(info.dimensions, 128);
		});

		it("records model history", () => {
			pipeline.switchBackend(new HashEmbeddingBackend(128, "2.0.0"));
			const history = pipeline.getModelHistory();
			assert.equal(history.length, 2);
			assert.equal(history[0].version, "1.0.0");
			assert.equal(history[1].version, "2.0.0");
		});
	});

	describe("reembedAll", () => {
		it("re-embeds stale entries after model switch", async () => {
			await pipeline.generateEmbedding("e1", "Hello");
			await pipeline.generateEmbedding("e2", "World");

			pipeline.switchBackend(new HashEmbeddingBackend(64, "2.0.0"));

			const report = await pipeline.reembedAll([
				{ id: "e1", text: "Hello" },
				{ id: "e2", text: "World" },
			]);
			assert.equal(report.reembedded, 2);
			assert.equal(report.skipped, 0);
			assert.ok(report.newModel.includes("2.0.0"));
		});

		it("skips up-to-date entries", async () => {
			await pipeline.generateEmbedding("e1", "Hello");
			const report = await pipeline.reembedAll([
				{ id: "e1", text: "Hello" },
			]);
			assert.equal(report.skipped, 1);
			assert.equal(report.reembedded, 0);
		});
	});

	describe("getStats", () => {
		it("returns correct statistics", async () => {
			await pipeline.generateEmbedding("e1", "Hello");
			await pipeline.generateEmbedding("e2", "World");

			const stats = pipeline.getStats(["e1", "e2", "e3"]);
			assert.equal(stats.totalEmbeddings, 2);
			assert.equal(stats.pendingEntries, 1);
			assert.equal(stats.staleEmbeddings, 0);
		});

		it("detects stale embeddings after model switch", async () => {
			await pipeline.generateEmbedding("e1", "Hello");
			pipeline.switchBackend(new HashEmbeddingBackend(64, "2.0.0"));

			const stats = pipeline.getStats(["e1"]);
			assert.equal(stats.staleEmbeddings, 1);
		});
	});

	describe("HashEmbeddingBackend", () => {
		it("produces normalized vectors", async () => {
			const backend = new HashEmbeddingBackend(32);
			const vector = await backend.embed("test input");
			const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0));
			assert.ok(Math.abs(magnitude - 1.0) < 0.01, `Magnitude ${magnitude} should be ~1.0`);
		});

		it("produces different vectors for different inputs", async () => {
			const backend = new HashEmbeddingBackend(32);
			const v1 = await backend.embed("apple");
			const v2 = await backend.embed("banana");
			const same = v1.every((val, i) => val === v2[i]);
			assert.equal(same, false);
		});

		it("batch produces same results as individual", async () => {
			const backend = new HashEmbeddingBackend(32);
			const [v1, v2] = await backend.embedBatch(["apple", "banana"]);
			const v1Solo = await backend.embed("apple");
			assert.deepEqual(v1, v1Solo);
		});
	});
});
