/**
 * Tests for KnowledgeGardener (DE-02)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	KnowledgeGardener,
	type BrainEntryLite,
	type BrainLinkLite,
} from "./gardener.js";

const DAY_MS = 86_400_000;
const now = Date.now();

function makeEntry(overrides: Partial<BrainEntryLite> = {}): BrainEntryLite {
	return {
		id: "e-1",
		title: "Test Entry",
		content: "Some test content for the entry",
		category: "test",
		tags: ["testing"],
		created_at: now - 10 * DAY_MS,
		updated_at: now - 5 * DAY_MS,
		access_count: 1,
		usefulness_score: 0.5,
		source_agent: "test-agent",
		metadata: {},
		...overrides,
	};
}

function makeLink(overrides: Partial<BrainLinkLite> = {}): BrainLinkLite {
	return {
		id: "l-1",
		from_entry: "e-1",
		to_entry: "e-2",
		link_type: "related_to",
		confidence: 0.8,
		...overrides,
	};
}

describe("KnowledgeGardener", () => {
	const gardener = new KnowledgeGardener();

	describe("detectStale", () => {
		it("should detect entries not updated in 90+ days with zero access", () => {
			const entry = makeEntry({
				id: "stale-1",
				updated_at: now - 100 * DAY_MS,
				access_count: 0,
			});
			const findings = gardener.detectStale([entry]);
			assert.equal(findings.length, 1);
			assert.equal(findings[0].type, "stale");
			assert.equal(findings[0].severity, "medium");
		});

		it("should detect entries not updated in 90+ days with some access", () => {
			const entry = makeEntry({
				id: "stale-2",
				updated_at: now - 100 * DAY_MS,
				access_count: 5,
			});
			const findings = gardener.detectStale([entry]);
			assert.equal(findings.length, 1);
			assert.equal(findings[0].severity, "low");
		});

		it("should not flag recently updated entries", () => {
			const entry = makeEntry({ updated_at: now - 10 * DAY_MS });
			const findings = gardener.detectStale([entry]);
			assert.equal(findings.length, 0);
		});

		it("should respect custom staleDays parameter", () => {
			const entry = makeEntry({
				updated_at: now - 15 * DAY_MS,
				access_count: 0,
			});
			const findings = gardener.detectStale([entry], 10);
			assert.equal(findings.length, 1);
		});
	});

	describe("detectContradictions", () => {
		it("should detect entries with explicit contradicts links", () => {
			const entries = [
				makeEntry({ id: "a", title: "Pattern A" }),
				makeEntry({ id: "b", title: "Pattern B" }),
			];
			const links = [
				makeLink({
					from_entry: "a",
					to_entry: "b",
					link_type: "contradicts",
					confidence: 0.9,
				}),
			];
			const findings = gardener.detectContradictions(entries, links);
			assert.ok(findings.length >= 1);
			assert.equal(findings[0].type, "contradiction");
			assert.equal(findings[0].severity, "high");
		});

		it("should detect possible conflicts from similar titles in same category", () => {
			// Jaccard: intersection=6/union=7 = 0.857 — within (0.7, 0.95) range
			const entries = [
				makeEntry({
					id: "x",
					title: "configure database connection timeout retry settings behavior",
					category: "config",
				}),
				makeEntry({
					id: "y",
					title: "configure database connection timeout retry settings pooling",
					category: "config",
				}),
			];
			const findings = gardener.detectContradictions(entries, []);
			assert.ok(findings.length >= 1);
			assert.equal(findings[0].type, "contradiction");
		});

		it("should not flag entries in different categories", () => {
			const entries = [
				makeEntry({
					id: "x",
					title: "same title here",
					category: "catA",
				}),
				makeEntry({
					id: "y",
					title: "same title here",
					category: "catB",
				}),
			];
			// Same title but different categories — detected as potential contradiction only if same category
			const findings = gardener.detectContradictions(entries, []);
			// These have similarity > 0.95 so won't be flagged as contradiction (that range is 0.7-0.95)
			// and they're in different categories
			assert.equal(findings.length, 0);
		});
	});

	describe("detectDuplicates", () => {
		it("should detect entries with >95% content similarity", () => {
			const entries = [
				makeEntry({
					id: "d1",
					title: "Understanding async patterns",
					content: "Async patterns in JavaScript are important",
				}),
				makeEntry({
					id: "d2",
					title: "Understanding async patterns",
					content: "Async patterns in JavaScript are important",
				}),
			];
			const findings = gardener.detectDuplicates(entries);
			assert.equal(findings.length, 1);
			assert.equal(findings[0].type, "duplicate");
		});

		it("should not flag dissimilar entries", () => {
			const entries = [
				makeEntry({
					id: "d1",
					title: "Understanding async",
					content: "JavaScript async await promises",
				}),
				makeEntry({
					id: "d2",
					title: "Database design",
					content: "SQL normalization schema tables",
				}),
			];
			const findings = gardener.detectDuplicates(entries);
			assert.equal(findings.length, 0);
		});
	});

	describe("detectOrphans", () => {
		it("should detect entries with no links after 30 days", () => {
			const entries = [
				makeEntry({
					id: "orphan-1",
					created_at: now - 60 * DAY_MS,
				}),
			];
			const findings = gardener.detectOrphans(entries, []);
			assert.equal(findings.length, 1);
			assert.equal(findings[0].type, "orphan");
		});

		it("should not flag entries with links", () => {
			const entries = [
				makeEntry({
					id: "linked-1",
					created_at: now - 60 * DAY_MS,
				}),
			];
			const links = [makeLink({ from_entry: "linked-1" })];
			const findings = gardener.detectOrphans(entries, links);
			assert.equal(findings.length, 0);
		});

		it("should not flag new entries (< 30 days)", () => {
			const entries = [
				makeEntry({ id: "new-1", created_at: now - 5 * DAY_MS }),
			];
			const findings = gardener.detectOrphans(entries, []);
			assert.equal(findings.length, 0);
		});
	});

	describe("checkMetadataHygiene", () => {
		it("should flag entries with no category", () => {
			const entry = makeEntry({ id: "m1", category: "" });
			const findings = gardener.checkMetadataHygiene([entry]);
			assert.ok(findings.some((f) => f.description.includes("no category")));
		});

		it("should flag entries with no tags", () => {
			const entry = makeEntry({ id: "m2", tags: [] });
			const findings = gardener.checkMetadataHygiene([entry]);
			assert.ok(findings.some((f) => f.description.includes("no tags")));
		});

		it("should flag entries with no source attribution", () => {
			const entry = makeEntry({
				id: "m3",
				source_agent: undefined,
			});
			const findings = gardener.checkMetadataHygiene([entry]);
			assert.ok(
				findings.some((f) =>
					f.description.includes("no source attribution"),
				),
			);
		});

		it("should not flag well-formed entries", () => {
			const entry = makeEntry();
			const findings = gardener.checkMetadataHygiene([entry]);
			assert.equal(findings.length, 0);
		});
	});

	describe("analyze", () => {
		it("should produce a complete MaintenanceReport", () => {
			const entries = [
				makeEntry({
					id: "a1",
					created_at: now - 60 * DAY_MS,
					updated_at: now - 100 * DAY_MS,
					access_count: 0,
					tags: [],
				}),
			];
			const report = gardener.analyze(entries, []);
			assert.equal(typeof report.timestamp, "number");
			assert.ok(Array.isArray(report.findings));
			assert.ok(report.staleEntries >= 1);
			assert.ok(report.orphans >= 0);
			assert.ok(report.metadataIssues >= 1);
		});

		it("should return zero findings for perfect entries", () => {
			const entries = [
				makeEntry({
					id: "perfect",
					created_at: now - 5 * DAY_MS,
					updated_at: now - 1 * DAY_MS,
				}),
			];
			const links = [makeLink({ from_entry: "perfect" })];
			const report = gardener.analyze(entries, links);
			assert.equal(report.findings.length, 0);
		});
	});
});
