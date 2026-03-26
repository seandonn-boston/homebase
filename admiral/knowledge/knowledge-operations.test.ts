/**
 * Tests for Knowledge Operations (DE-07 to DE-10)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BrainEntryLite, BrainLinkLite } from "./gardener.js";
import {
	CrossSessionTransfer,
	KnowledgeExporter,
	KnowledgeImporter,
	KnowledgeQualityMetrics,
	KnowledgeSearchApi,
} from "./knowledge-operations.js";

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

// =========================================================================
// DE-07: KnowledgeQualityMetrics
// =========================================================================

describe("KnowledgeQualityMetrics", () => {
	it("should generate a report with all metric fields", () => {
		const metrics = new KnowledgeQualityMetrics();
		const entries = [makeEntry({ id: "e-1", updated_at: now - 2 * DAY_MS })];
		const links = [makeLink()];

		const report = metrics.generateReport(entries, links);

		assert.ok(report.timestamp > 0);
		assert.equal(report.totalEntries, 1);
		assert.equal(report.totalLinks, 1);
		assert.ok("freshness" in report.metrics);
		assert.ok("accuracyProxy" in report.metrics);
		assert.ok("usageFrequency" in report.metrics);
		assert.ok("contradictionRate" in report.metrics);
		assert.ok("coverage" in report.metrics);
		assert.ok("linkDensity" in report.metrics);
	});

	it("should compute freshness correctly for recent entries", () => {
		const metrics = new KnowledgeQualityMetrics();
		const entries = [
			makeEntry({ id: "e-1", updated_at: now - 2 * DAY_MS }),
			makeEntry({ id: "e-2", updated_at: now - 60 * DAY_MS }),
		];
		const report = metrics.generateReport(entries, []);
		assert.equal(report.metrics.freshness, 0.5);
	});

	it("should compute freshness as 0 for no entries", () => {
		const metrics = new KnowledgeQualityMetrics();
		const report = metrics.generateReport([], []);
		assert.equal(report.metrics.freshness, 0);
	});

	it("should compute accuracy proxy as average usefulness_score", () => {
		const metrics = new KnowledgeQualityMetrics();
		const entries = [
			makeEntry({ id: "e-1", usefulness_score: 0.8 }),
			makeEntry({ id: "e-2", usefulness_score: 0.4 }),
		];
		const report = metrics.generateReport(entries, []);
		assert.ok(Math.abs(report.metrics.accuracyProxy - 0.6) < 0.001);
	});

	it("should compute contradiction rate from contradiction links", () => {
		const metrics = new KnowledgeQualityMetrics();
		const entries = [
			makeEntry({ id: "e-1" }),
			makeEntry({ id: "e-2" }),
			makeEntry({ id: "e-3" }),
		];
		const links = [
			makeLink({
				from_entry: "e-1",
				to_entry: "e-2",
				link_type: "contradicts",
			}),
		];
		const report = metrics.generateReport(entries, links);
		// 2 entries out of 3 involved in contradictions
		assert.ok(Math.abs(report.metrics.contradictionRate - 2 / 3) < 0.001);
	});

	it("should compute coverage with known categories", () => {
		const metrics = new KnowledgeQualityMetrics();
		const entries = [
			makeEntry({ id: "e-1", category: "test" }),
			makeEntry({ id: "e-2", category: "pattern" }),
		];
		const report = metrics.generateReport(
			entries,
			[],
			["test", "pattern", "decision", "lesson"],
		);
		assert.equal(report.metrics.coverage, 0.5);
	});

	it("should compute link density", () => {
		const metrics = new KnowledgeQualityMetrics();
		const entries = [makeEntry({ id: "e-1" }), makeEntry({ id: "e-2" })];
		const links = [
			makeLink({ id: "l-1" }),
			makeLink({ id: "l-2" }),
			makeLink({ id: "l-3" }),
		];
		const report = metrics.generateReport(entries, links);
		assert.equal(report.metrics.linkDensity, 1.5);
	});

	it("should compute trends between reports", () => {
		const metrics = new KnowledgeQualityMetrics();
		metrics.generateReport(
			[makeEntry({ id: "e-1", usefulness_score: 0.3 })],
			[],
		);
		const report2 = metrics.generateReport(
			[makeEntry({ id: "e-1", usefulness_score: 0.8 })],
			[],
		);
		assert.ok(report2.trends.length > 0);
		const accuracy = report2.trends.find((t) => t.metric === "accuracyProxy");
		assert.ok(accuracy);
		assert.equal(accuracy.direction, "improving");
	});

	it("should return empty trends for first report", () => {
		const metrics = new KnowledgeQualityMetrics();
		const report = metrics.generateReport([makeEntry()], []);
		assert.deepEqual(report.trends, []);
	});

	it("should return history with limit", () => {
		const metrics = new KnowledgeQualityMetrics();
		metrics.generateReport([makeEntry()], []);
		metrics.generateReport([makeEntry()], []);
		metrics.generateReport([makeEntry()], []);
		assert.equal(metrics.getHistory(2).length, 2);
		assert.equal(metrics.getHistory().length, 3);
	});
});

// =========================================================================
// DE-08: CrossSessionTransfer
// =========================================================================

describe("CrossSessionTransfer", () => {
	it("should capture session end data", () => {
		const transfer = new CrossSessionTransfer();
		const entries = [makeEntry({ id: "e-1", usefulness_score: 0.9 })];
		const result = transfer.captureSessionEnd("session-1", entries);
		assert.equal(result.sessionId, "session-1");
		assert.equal(result.entries.length, 1);
		assert.ok(result.capturedAt > 0);
	});

	it("should rank entries by relevance", () => {
		const transfer = new CrossSessionTransfer();
		const entries = [
			makeEntry({ id: "e-1", usefulness_score: 0.2, access_count: 0 }),
			makeEntry({ id: "e-2", usefulness_score: 0.9, access_count: 5 }),
		];
		const result = transfer.captureSessionEnd("session-1", entries);
		assert.equal(result.entries[0].id, "e-2");
	});

	it("should extract lessons from high-usefulness entries", () => {
		const transfer = new CrossSessionTransfer();
		const entries = [
			makeEntry({
				id: "e-1",
				title: "Important Lesson",
				usefulness_score: 0.9,
			}),
			makeEntry({ id: "e-2", title: "Low Value", usefulness_score: 0.2 }),
		];
		const result = transfer.captureSessionEnd("session-1", entries);
		assert.ok(result.lessons.includes("Important Lesson"));
		assert.ok(!result.lessons.includes("Low Value"));
	});

	it("should detect repeat failures across sessions", () => {
		const transfer = new CrossSessionTransfer();
		transfer.captureSessionEnd("s-1", [], ["deploy failure"]);
		const result = transfer.captureSessionEnd("s-2", [], ["deploy failure"]);
		assert.ok(result.repeatFailures.includes("deploy failure"));
	});

	it("should load relevant entries for new session by category", () => {
		const transfer = new CrossSessionTransfer();
		const entries = [
			makeEntry({ id: "e-1", category: "test" }),
			makeEntry({ id: "e-2", category: "pattern" }),
		];
		transfer.captureSessionEnd("s-1", entries);
		const result = transfer.loadSessionStart(["test"]);
		assert.ok(result.relevant.length > 0);
		assert.equal(result.relevant[0].category, "test");
	});

	it("should warn about repeat failures on session start", () => {
		const transfer = new CrossSessionTransfer();
		transfer.captureSessionEnd("s-1", [], ["deploy error"]);
		transfer.captureSessionEnd("s-2", [], ["deploy error"]);
		const result = transfer.loadSessionStart(["test"]);
		assert.ok(result.warnings.some((w) => w.includes("deploy error")));
	});

	it("should return transfer history with limit", () => {
		const transfer = new CrossSessionTransfer();
		transfer.captureSessionEnd("s-1", []);
		transfer.captureSessionEnd("s-2", []);
		transfer.captureSessionEnd("s-3", []);
		assert.equal(transfer.getTransferHistory(2).length, 2);
		assert.equal(transfer.getTransferHistory().length, 3);
	});
});

// =========================================================================
// DE-09: KnowledgeExporter
// =========================================================================

describe("KnowledgeExporter", () => {
	it("should export all entries and links without filter", () => {
		const exporter = new KnowledgeExporter();
		const entries = [makeEntry({ id: "e-1" }), makeEntry({ id: "e-2" })];
		const links = [makeLink({ from_entry: "e-1", to_entry: "e-2" })];
		const archive = exporter.export(entries, links);
		assert.equal(archive.entries.length, 2);
		assert.equal(archive.links.length, 1);
		assert.equal(archive.version, "1.0.0");
	});

	it("should filter by category", () => {
		const exporter = new KnowledgeExporter();
		const entries = [
			makeEntry({ id: "e-1", category: "test" }),
			makeEntry({ id: "e-2", category: "pattern" }),
		];
		const archive = exporter.export(entries, [], { categories: ["test"] });
		assert.equal(archive.entries.length, 1);
		assert.equal(archive.entries[0].category, "test");
	});

	it("should filter by tags", () => {
		const exporter = new KnowledgeExporter();
		const entries = [
			makeEntry({ id: "e-1", tags: ["alpha"] }),
			makeEntry({ id: "e-2", tags: ["beta"] }),
		];
		const archive = exporter.export(entries, [], { tags: ["alpha"] });
		assert.equal(archive.entries.length, 1);
	});

	it("should filter by since date", () => {
		const exporter = new KnowledgeExporter();
		const entries = [
			makeEntry({ id: "e-1", created_at: now - 5 * DAY_MS }),
			makeEntry({ id: "e-2", created_at: now - 60 * DAY_MS }),
		];
		const archive = exporter.export(entries, [], { since: now - 10 * DAY_MS });
		assert.equal(archive.entries.length, 1);
	});

	it("should filter by minimum quality", () => {
		const exporter = new KnowledgeExporter();
		const entries = [
			makeEntry({ id: "e-1", usefulness_score: 0.9 }),
			makeEntry({ id: "e-2", usefulness_score: 0.2 }),
		];
		const archive = exporter.export(entries, [], { minQuality: 0.5 });
		assert.equal(archive.entries.length, 1);
	});

	it("should filter links to match filtered entries", () => {
		const exporter = new KnowledgeExporter();
		const entries = [
			makeEntry({ id: "e-1", category: "test" }),
			makeEntry({ id: "e-2", category: "pattern" }),
		];
		const links = [
			makeLink({ id: "l-1", from_entry: "e-1", to_entry: "e-2" }),
			makeLink({ id: "l-2", from_entry: "e-1", to_entry: "e-1" }),
		];
		const archive = exporter.export(entries, links, { categories: ["test"] });
		assert.equal(archive.links.length, 1); // only l-2 has both entries in set
	});

	it("should strip PII from archive", () => {
		const exporter = new KnowledgeExporter();
		const entries = [
			makeEntry({ id: "e-1", content: "Contact user@example.com for details" }),
		];
		const archive = exporter.export(entries, []);
		const stripped = exporter.stripPII(archive);
		assert.ok(!stripped.entries[0].content.includes("user@example.com"));
		assert.ok(stripped.entries[0].content.includes("[REDACTED]"));
	});

	it("should strip phone numbers", () => {
		const exporter = new KnowledgeExporter();
		const entries = [makeEntry({ id: "e-1", content: "Call 555-123-4567" })];
		const archive = exporter.export(entries, []);
		const stripped = exporter.stripPII(archive);
		assert.ok(!stripped.entries[0].content.includes("555-123-4567"));
	});

	it("should serialize to valid JSON", () => {
		const exporter = new KnowledgeExporter();
		const archive = exporter.export([makeEntry()], []);
		const json = exporter.serialize(archive);
		assert.doesNotThrow(() => JSON.parse(json));
	});
});

// =========================================================================
// DE-09: KnowledgeImporter
// =========================================================================

describe("KnowledgeImporter", () => {
	it("should deserialize a valid JSON archive", () => {
		const exporter = new KnowledgeExporter();
		const importer = new KnowledgeImporter();
		const archive = exporter.export([makeEntry()], []);
		const json = exporter.serialize(archive);
		const parsed = importer.deserialize(json);
		assert.equal(parsed.entries.length, 1);
	});

	it("should merge incoming entries with existing, detecting duplicates", () => {
		const importer = new KnowledgeImporter();
		const existing = [makeEntry({ id: "e-1", title: "Existing Entry" })];
		const archive = {
			version: "1.0.0",
			exportedAt: now,
			exportedBy: "test",
			entries: [
				makeEntry({
					id: "e-2",
					title: "Existing Entry",
					content: "Some test content for the entry",
				}),
			],
			links: [],
			metadata: { totalEntries: 1, totalLinks: 0 },
		};
		const result = importer.merge(existing, archive);
		assert.equal(result.duplicates, 1);
		assert.equal(result.added.length, 0);
	});

	it("should detect conflicts when same title but different content", () => {
		const importer = new KnowledgeImporter();
		const existing = [
			makeEntry({
				id: "e-1",
				title: "Shared Title",
				content: "Original content here",
			}),
		];
		const archive = {
			version: "1.0.0",
			exportedAt: now,
			exportedBy: "test",
			entries: [
				makeEntry({
					id: "e-2",
					title: "Shared Title",
					content: "Completely different content about something else entirely",
				}),
			],
			links: [],
			metadata: { totalEntries: 1, totalLinks: 0 },
		};
		const result = importer.merge(existing, archive);
		assert.equal(result.conflicts, 1);
	});

	it("should add new entries that don't exist", () => {
		const importer = new KnowledgeImporter();
		const existing = [makeEntry({ id: "e-1", title: "Existing" })];
		const archive = {
			version: "1.0.0",
			exportedAt: now,
			exportedBy: "test",
			entries: [makeEntry({ id: "e-2", title: "Brand New Entry" })],
			links: [],
			metadata: { totalEntries: 1, totalLinks: 0 },
		};
		const result = importer.merge(existing, archive);
		assert.equal(result.added.length, 1);
	});

	it("should validate a valid archive", () => {
		const importer = new KnowledgeImporter();
		const archive = {
			version: "1.0.0",
			exportedAt: now,
			exportedBy: "test",
			entries: [makeEntry()],
			links: [],
			metadata: { totalEntries: 1, totalLinks: 0 },
		};
		const result = importer.validate(archive);
		assert.equal(result.valid, true);
		assert.equal(result.errors.length, 0);
	});

	it("should detect missing version", () => {
		const importer = new KnowledgeImporter();
		const archive = {
			version: "",
			exportedAt: now,
			exportedBy: "test",
			entries: [],
			links: [],
			metadata: { totalEntries: 0, totalLinks: 0 },
		};
		const result = importer.validate(archive);
		assert.equal(result.valid, false);
		assert.ok(result.errors.some((e) => e.includes("version")));
	});

	it("should detect entries missing id", () => {
		const importer = new KnowledgeImporter();
		const archive = {
			version: "1.0.0",
			exportedAt: now,
			exportedBy: "test",
			entries: [{ ...makeEntry(), id: "" }],
			links: [],
			metadata: { totalEntries: 1, totalLinks: 0 },
		};
		const result = importer.validate(archive);
		assert.equal(result.valid, false);
	});
});

// =========================================================================
// DE-10: KnowledgeSearchApi
// =========================================================================

describe("KnowledgeSearchApi", () => {
	const api = new KnowledgeSearchApi();

	it("should search entries by keyword", () => {
		const entries = [
			makeEntry({
				id: "e-1",
				title: "TypeScript patterns",
				content: "How to use generics",
			}),
			makeEntry({
				id: "e-2",
				title: "Python basics",
				content: "Intro to Python",
			}),
		];
		const result = api.search("TypeScript generics", entries);
		assert.equal(result.entries.length, 1);
		assert.equal(result.entries[0].id, "e-1");
	});

	it("should return empty results for no matches", () => {
		const entries = [makeEntry({ id: "e-1", title: "Unrelated" })];
		const result = api.search("nonexistent gibberish", entries);
		assert.equal(result.entries.length, 0);
	});

	it("should filter by category", () => {
		const entries = [
			makeEntry({ id: "e-1", title: "Test entry", category: "test" }),
			makeEntry({ id: "e-2", title: "Test entry too", category: "pattern" }),
		];
		const result = api.search("test entry", entries, { category: "pattern" });
		assert.equal(result.entries.length, 1);
		assert.equal(result.entries[0].category, "pattern");
	});

	it("should filter by tags", () => {
		const entries = [
			makeEntry({ id: "e-1", title: "Alpha entry", tags: ["alpha"] }),
			makeEntry({ id: "e-2", title: "Alpha beta entry", tags: ["beta"] }),
		];
		const result = api.search("alpha entry", entries, { tags: ["beta"] });
		assert.equal(result.entries.length, 1);
		assert.equal(result.entries[0].id, "e-2");
	});

	it("should respect limit option", () => {
		const entries = Array.from({ length: 10 }, (_, i) =>
			makeEntry({
				id: `e-${i}`,
				title: `Test item ${i}`,
				content: "Common content",
			}),
		);
		const result = api.search("test common content", entries, { limit: 3 });
		assert.equal(result.entries.length, 3);
	});

	it("should include timing in results", () => {
		const result = api.search("test", [makeEntry()]);
		assert.ok(typeof result.timing === "number");
		assert.ok(result.timing >= 0);
	});

	it("should get entry by id", () => {
		const entries = [makeEntry({ id: "e-1" }), makeEntry({ id: "e-2" })];
		assert.equal(api.getEntry("e-1", entries)?.id, "e-1");
		assert.equal(api.getEntry("nonexistent", entries), undefined);
	});

	it("should get links for an entry", () => {
		const links = [
			makeLink({ id: "l-1", from_entry: "e-1", to_entry: "e-2" }),
			makeLink({ id: "l-2", from_entry: "e-3", to_entry: "e-1" }),
			makeLink({ id: "l-3", from_entry: "e-3", to_entry: "e-4" }),
		];
		const result = api.getLinks("e-1", links);
		assert.equal(result.length, 2);
	});

	it("should return health summary", () => {
		const entries = [
			makeEntry({ id: "e-1", usefulness_score: 0.8 }),
			makeEntry({ id: "e-2", usefulness_score: 0.4 }),
		];
		const links = [makeLink()];
		const health = api.getHealth(entries, links);
		assert.equal(health.totalEntries, 2);
		assert.equal(health.totalLinks, 1);
		assert.ok(Math.abs(health.avgQuality - 0.6) < 0.001);
	});

	it("should return stats by category and month", () => {
		const entries = [
			makeEntry({ id: "e-1", category: "test", created_at: now }),
			makeEntry({ id: "e-2", category: "test", created_at: now }),
			makeEntry({ id: "e-3", category: "pattern", created_at: now }),
		];
		const stats = api.getStats(entries);
		assert.equal(stats.byCategory.test, 2);
		assert.equal(stats.byCategory.pattern, 1);
		assert.ok(Object.keys(stats.byMonth).length > 0);
	});

	it("should return top accessed entries", () => {
		const entries = [
			makeEntry({ id: "e-1", access_count: 10 }),
			makeEntry({ id: "e-2", access_count: 50 }),
			makeEntry({ id: "e-3", access_count: 1 }),
		];
		const stats = api.getStats(entries);
		assert.equal(stats.topAccessed[0].id, "e-2");
		assert.equal(stats.topAccessed[0].count, 50);
	});
});
