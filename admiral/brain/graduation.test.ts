import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { GraduationMeasurement } from "./graduation";

// ---------------------------------------------------------------------------
// GraduationMeasurement tests
// ---------------------------------------------------------------------------

describe("GraduationMeasurement", () => {
	let gm: GraduationMeasurement;

	beforeEach(() => {
		gm = new GraduationMeasurement();
	});

	// -- B1→B2 --

	it("reports ready when all B1→B2 criteria pass", () => {
		const result = gm.assessB1ToB2({
			hitRate: 90,
			precision: 95,
			entryCount: 100,
		});
		assert.equal(result.ready, true);
		assert.equal(result.fromTier, "B1");
		assert.equal(result.toTier, "B2");
	});

	it("reports not ready when hitRate below threshold", () => {
		const result = gm.assessB1ToB2({
			hitRate: 80,
			precision: 95,
			entryCount: 100,
		});
		assert.equal(result.ready, false);
		assert.ok(result.recommendation.includes("hitRate"));
	});

	it("reports not ready when precision below threshold", () => {
		const result = gm.assessB1ToB2({
			hitRate: 90,
			precision: 85,
			entryCount: 100,
		});
		assert.equal(result.ready, false);
		assert.ok(result.recommendation.includes("precision"));
	});

	it("reports not ready when entryCount below threshold", () => {
		const result = gm.assessB1ToB2({
			hitRate: 90,
			precision: 95,
			entryCount: 30,
		});
		assert.equal(result.ready, false);
		assert.ok(result.recommendation.includes("entryCount"));
	});

	it("passes at exact boundary values for B1→B2", () => {
		const result = gm.assessB1ToB2({
			hitRate: 85,
			precision: 90,
			entryCount: 50,
		});
		assert.equal(result.ready, true);
	});

	// -- B2→B3 --

	it("reports ready when all B2→B3 criteria pass", () => {
		const result = gm.assessB2ToB3({
			reuseRate: 40,
			semanticPrecision: 85,
		});
		assert.equal(result.ready, true);
		assert.equal(result.fromTier, "B2");
		assert.equal(result.toTier, "B3");
	});

	it("reports not ready when reuseRate below threshold", () => {
		const result = gm.assessB2ToB3({
			reuseRate: 20,
			semanticPrecision: 85,
		});
		assert.equal(result.ready, false);
		assert.ok(result.recommendation.includes("reuseRate"));
	});

	it("reports not ready when semanticPrecision below threshold", () => {
		const result = gm.assessB2ToB3({
			reuseRate: 40,
			semanticPrecision: 70,
		});
		assert.equal(result.ready, false);
		assert.ok(result.recommendation.includes("semanticPrecision"));
	});

	// -- History & Trends --

	it("records and retrieves assessment history", () => {
		const a1 = gm.assessB1ToB2({
			hitRate: 90,
			precision: 95,
			entryCount: 100,
		});
		gm.recordAssessment(a1);
		const a2 = gm.assessB2ToB3({
			reuseRate: 40,
			semanticPrecision: 85,
		});
		gm.recordAssessment(a2);
		assert.equal(gm.getAssessmentHistory().length, 2);
	});

	it("filters history by tier", () => {
		const a1 = gm.assessB1ToB2({
			hitRate: 90,
			precision: 95,
			entryCount: 100,
		});
		gm.recordAssessment(a1);
		const a2 = gm.assessB2ToB3({
			reuseRate: 40,
			semanticPrecision: 85,
		});
		gm.recordAssessment(a2);
		assert.equal(gm.getAssessmentHistory("B1").length, 1);
		assert.equal(gm.getAssessmentHistory("B3").length, 1);
	});

	it("returns trend data for assessments", () => {
		const a = gm.assessB1ToB2({
			hitRate: 90,
			precision: 95,
			entryCount: 100,
		});
		gm.recordAssessment(a);
		const trend = gm.getTrend();
		assert.equal(trend.length, 1);
		assert.equal(trend[0].criteria["hitRate"], 90);
		assert.equal(trend[0].criteria["precision"], 95);
	});

	it("filters trend by days window", () => {
		const a = gm.assessB1ToB2({
			hitRate: 90,
			precision: 95,
			entryCount: 100,
		});
		// Manually set old date
		a.assessedAt = Date.now() - 10 * 24 * 60 * 60 * 1000;
		gm.recordAssessment(a);

		const recent = gm.getTrend(5);
		assert.equal(recent.length, 0);

		const all = gm.getTrend(15);
		assert.equal(all.length, 1);
	});
});
