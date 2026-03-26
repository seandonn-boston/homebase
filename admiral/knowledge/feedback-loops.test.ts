/**
 * Tests for KnowledgeFeedbackLoop (DE-05, DE-06)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	KnowledgeFeedbackLoop,
	type FeedbackEvent,
} from "./feedback-loops.js";

const now = Date.now();

describe("KnowledgeFeedbackLoop", () => {
	describe("processCodeReviewOutcome (DE-05)", () => {
		it("should strengthen entry on accepted review", () => {
			const loop = new KnowledgeFeedbackLoop();
			const event: FeedbackEvent = {
				type: "code_review",
				outcome: "accepted",
				relatedEntryId: "entry-1",
				context: "PR #42 approved",
				timestamp: now,
			};
			const result = loop.processCodeReviewOutcome(event);
			assert.deepEqual(result.strengthened, ["entry-1"]);
			assert.deepEqual(result.weakened, []);
			assert.deepEqual(result.flagged, []);
		});

		it("should weaken entry on rejected review", () => {
			const loop = new KnowledgeFeedbackLoop();
			const event: FeedbackEvent = {
				type: "code_review",
				outcome: "rejected",
				relatedEntryId: "entry-2",
				context: "PR #43 rejected",
				timestamp: now,
			};
			const result = loop.processCodeReviewOutcome(event);
			assert.deepEqual(result.weakened, ["entry-2"]);
		});

		it("should flag entry when rejection rate exceeds 50%", () => {
			const loop = new KnowledgeFeedbackLoop();
			// 1 accept, 2 rejects → 66% rejection
			loop.processCodeReviewOutcome({
				type: "code_review",
				outcome: "accepted",
				relatedEntryId: "entry-3",
				context: "",
				timestamp: now,
			});
			loop.processCodeReviewOutcome({
				type: "code_review",
				outcome: "rejected",
				relatedEntryId: "entry-3",
				context: "",
				timestamp: now,
			});
			const result = loop.processCodeReviewOutcome({
				type: "code_review",
				outcome: "rejected",
				relatedEntryId: "entry-3",
				context: "",
				timestamp: now,
			});
			assert.ok(result.flagged.includes("entry-3"));
		});

		it("should not flag when rejection rate is at 50%", () => {
			const loop = new KnowledgeFeedbackLoop();
			loop.processCodeReviewOutcome({
				type: "code_review",
				outcome: "accepted",
				relatedEntryId: "entry-4",
				context: "",
				timestamp: now,
			});
			const result = loop.processCodeReviewOutcome({
				type: "code_review",
				outcome: "rejected",
				relatedEntryId: "entry-4",
				context: "",
				timestamp: now,
			});
			assert.deepEqual(result.flagged, []);
		});

		it("should handle events with no relatedEntryId", () => {
			const loop = new KnowledgeFeedbackLoop();
			const result = loop.processCodeReviewOutcome({
				type: "code_review",
				outcome: "accepted",
				context: "no entry",
				timestamp: now,
			});
			assert.deepEqual(result.strengthened, []);
		});
	});

	describe("processTestOutcome (DE-06)", () => {
		it("should strengthen entry on passed test", () => {
			const loop = new KnowledgeFeedbackLoop();
			const result = loop.processTestOutcome({
				type: "test_result",
				outcome: "passed",
				relatedEntryId: "entry-5",
				context: "All tests pass",
				timestamp: now,
			});
			assert.deepEqual(result.strengthened, ["entry-5"]);
			assert.deepEqual(result.weakened, []);
		});

		it("should weaken entry and propose lesson on failed test", () => {
			const loop = new KnowledgeFeedbackLoop();
			const result = loop.processTestOutcome({
				type: "test_result",
				outcome: "failed",
				relatedEntryId: "entry-6",
				context:
					"Timeout in database connection handler caused test failure",
				timestamp: now,
			});
			assert.deepEqual(result.weakened, ["entry-6"]);
			assert.ok(result.newLessons.length > 0);
			assert.equal(result.newLessons[0].category, "lesson");
		});

		it("should propose knowledge gap for unlinked failures", () => {
			const loop = new KnowledgeFeedbackLoop();
			const result = loop.processTestOutcome({
				type: "test_result",
				outcome: "failed",
				context:
					"Race condition in concurrent write operations was not documented",
				timestamp: now,
			});
			assert.ok(result.newLessons.length > 0);
			assert.equal(result.newLessons[0].category, "gap");
		});

		it("should not propose lesson for short context", () => {
			const loop = new KnowledgeFeedbackLoop();
			const result = loop.processTestOutcome({
				type: "test_result",
				outcome: "failed",
				relatedEntryId: "entry-7",
				context: "fail",
				timestamp: now,
			});
			assert.equal(result.newLessons.length, 0);
		});
	});

	describe("getRejectionRate", () => {
		it("should return 0 for unknown entry", () => {
			const loop = new KnowledgeFeedbackLoop();
			assert.equal(loop.getRejectionRate("unknown"), 0);
		});

		it("should calculate correct rate", () => {
			const loop = new KnowledgeFeedbackLoop();
			loop.processCodeReviewOutcome({
				type: "code_review",
				outcome: "accepted",
				relatedEntryId: "e1",
				context: "",
				timestamp: now,
			});
			loop.processCodeReviewOutcome({
				type: "code_review",
				outcome: "rejected",
				relatedEntryId: "e1",
				context: "",
				timestamp: now,
			});
			assert.equal(loop.getRejectionRate("e1"), 0.5);
		});
	});

	describe("getFlaggedEntries", () => {
		it("should return all flagged entries", () => {
			const loop = new KnowledgeFeedbackLoop();
			// Flag entry by giving it >50% rejection
			loop.processCodeReviewOutcome({
				type: "code_review",
				outcome: "rejected",
				relatedEntryId: "flagme",
				context: "",
				timestamp: now,
			});
			const flagged = loop.getFlaggedEntries();
			assert.ok(flagged.includes("flagme"));
		});
	});
});
