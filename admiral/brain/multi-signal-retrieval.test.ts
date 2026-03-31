import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { MultiSignalRetrieval } from "./multi-signal-retrieval";
import type { SignalContext } from "./multi-signal-retrieval";

describe("MultiSignalRetrieval", () => {
	let retrieval: MultiSignalRetrieval;
	let context: SignalContext;

	beforeEach(() => {
		retrieval = new MultiSignalRetrieval();

		const now = Date.now();
		context = {
			now,
			entryCreatedAt: new Map([
				["e1", now - 1000],
				["e2", now - 86400_000 * 7],
				["e3", now - 86400_000 * 90],
			]),
			keywordScores: new Map([
				["e1", 0.9],
				["e2", 0.3],
				["e3", 0.1],
			]),
			semanticScores: new Map([
				["e1", 0.5],
				["e2", 0.8],
				["e3", 0.6],
			]),
			linkScores: new Map([
				["e1", 0.2],
				["e2", 0.7],
				["e3", 0.1],
			]),
		};
	});

	describe("retrieve", () => {
		it("returns blended results sorted by score", () => {
			const result = retrieval.retrieve(
				["e1", "e2", "e3"],
				"test query",
				context,
			);
			assert.ok(result.results.length > 0);
			for (let i = 1; i < result.results.length; i++) {
				assert.ok(result.results[i - 1].blended >= result.results[i].blended);
			}
		});

		it("includes all 4 signal scores", () => {
			const result = retrieval.retrieve(["e1"], "test", context);
			const r = result.results[0];
			assert.ok(r.keyword > 0);
			assert.ok(r.semantic > 0);
			assert.ok(r.temporal > 0);
			assert.ok(r.link > 0);
		});

		it("respects limit", () => {
			const result = retrieval.retrieve(
				["e1", "e2", "e3"],
				"test",
				context,
				{ limit: 1 },
			);
			assert.equal(result.results.length, 1);
		});

		it("respects minScore", () => {
			const result = retrieval.retrieve(
				["e1", "e2", "e3"],
				"test",
				context,
				{ minScore: 0.99 },
			);
			for (const r of result.results) {
				assert.ok(r.blended >= 0.99);
			}
		});

		it("reports total candidates", () => {
			const result = retrieval.retrieve(
				["e1", "e2", "e3"],
				"test",
				context,
			);
			assert.equal(result.totalCandidates, 3);
		});
	});

	describe("signal selection", () => {
		it("uses only selected signals", () => {
			const result = retrieval.retrieve(
				["e1"],
				"test",
				context,
				{ signals: ["keyword", "semantic"] },
			);
			assert.deepEqual(result.signalsUsed, ["keyword", "semantic"]);
			// Temporal and link should be 0 since not selected
			assert.equal(result.results[0].temporal, 0);
			assert.equal(result.results[0].link, 0);
		});

		it("keyword-only retrieval works", () => {
			const result = retrieval.retrieve(
				["e1", "e2", "e3"],
				"test",
				context,
				{ signals: ["keyword"] },
			);
			// With keyword only, e1 (0.9) should be first
			assert.equal(result.results[0].entryId, "e1");
		});

		it("semantic-only retrieval works", () => {
			const result = retrieval.retrieve(
				["e1", "e2", "e3"],
				"test",
				context,
				{ signals: ["semantic"] },
			);
			// With semantic only, e2 (0.8) should be first
			assert.equal(result.results[0].entryId, "e2");
		});
	});

	describe("custom weights", () => {
		it("respects query-time weight overrides", () => {
			// Heavy keyword weight should favor e1 (keyword=0.9)
			const result = retrieval.retrieve(
				["e1", "e2", "e3"],
				"test",
				context,
				{ weights: { keyword: 0.9, semantic: 0.05, temporal: 0.025, link: 0.025 } },
			);
			assert.equal(result.results[0].entryId, "e1");
		});

		it("reports weights used", () => {
			const result = retrieval.retrieve(
				["e1"],
				"test",
				context,
				{ weights: { keyword: 0.5 } },
			);
			assert.ok(result.weightsUsed.keyword > 0);
		});
	});

	describe("temporal signal", () => {
		it("scores recent entries higher", () => {
			const result = retrieval.retrieve(
				["e1", "e3"],
				"test",
				context,
				{ signals: ["temporal"] },
			);
			// e1 is 1 second old, e3 is 90 days old
			assert.ok(result.results[0].entryId === "e1");
			assert.ok(result.results[0].temporal > result.results[1].temporal);
		});
	});

	describe("getWeights / setWeights", () => {
		it("returns default weights", () => {
			const w = retrieval.getWeights();
			assert.equal(w.keyword, 0.3);
			assert.equal(w.semantic, 0.4);
		});

		it("updates weights", () => {
			retrieval.setWeights({ keyword: 0.5 });
			assert.equal(retrieval.getWeights().keyword, 0.5);
		});
	});

	describe("edge cases", () => {
		it("handles empty candidate list", () => {
			const result = retrieval.retrieve([], "test", context);
			assert.equal(result.results.length, 0);
			assert.equal(result.totalCandidates, 0);
		});

		it("handles entries with no signal data", () => {
			const result = retrieval.retrieve(
				["unknown-entry"],
				"test",
				context,
			);
			assert.equal(result.results.length, 1);
			assert.equal(result.results[0].blended, 0);
		});
	});
});
