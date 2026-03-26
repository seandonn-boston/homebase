/**
 * Tests for Brain Excellence (B-22 to B-29)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	BrainVersioning,
	BrainExpiration,
	BrainUsageAnalytics,
	BrainBackup,
	BrainEntryTemplateManager,
	ProvenanceTracker,
	BRAIN_ENTRY_TEMPLATES,
} from "./brain-excellence.js";
import type { ProvenanceMetadata } from "./brain-excellence.js";

const DAY_MS = 86_400_000;
const now = Date.now();

// =========================================================================
// B-22: BrainVersioning
// =========================================================================

describe("BrainVersioning", () => {
	it("should record a version", () => {
		const versioning = new BrainVersioning();
		const v = versioning.recordVersion("e-1", "content v1", "agent", "Initial");
		assert.equal(v.entryId, "e-1");
		assert.equal(v.version, 1);
		assert.equal(v.content, "content v1");
	});

	it("should increment version numbers", () => {
		const versioning = new BrainVersioning();
		versioning.recordVersion("e-1", "v1", "agent", "First");
		const v2 = versioning.recordVersion("e-1", "v2", "agent", "Second");
		assert.equal(v2.version, 2);
	});

	it("should get all versions for an entry", () => {
		const versioning = new BrainVersioning();
		versioning.recordVersion("e-1", "v1", "agent", "First");
		versioning.recordVersion("e-1", "v2", "agent", "Second");
		const versions = versioning.getVersions("e-1");
		assert.equal(versions.length, 2);
	});

	it("should return empty array for unknown entry", () => {
		const versioning = new BrainVersioning();
		assert.deepEqual(versioning.getVersions("unknown"), []);
	});

	it("should rollback to a specific version", () => {
		const versioning = new BrainVersioning();
		versioning.recordVersion("e-1", "content v1", "agent", "First");
		versioning.recordVersion("e-1", "content v2", "agent", "Second");
		const rolled = versioning.rollback("e-1", 1);
		assert.ok(rolled);
		assert.equal(rolled.content, "content v1");
	});

	it("should return undefined when rollback target does not exist", () => {
		const versioning = new BrainVersioning();
		assert.equal(versioning.rollback("e-1", 99), undefined);
	});

	it("should return supersession chain", () => {
		const versioning = new BrainVersioning();
		versioning.recordVersion("e-1", "v1", "agent", "First");
		versioning.recordVersion("e-1", "v2", "agent", "Second");
		const chain = versioning.getSupersessionChain("e-1");
		assert.equal(chain.length, 2);
		assert.equal(chain[0], "e-1@v1");
		assert.equal(chain[1], "e-1@v2");
	});

	it("should return empty chain for unknown entry", () => {
		const versioning = new BrainVersioning();
		assert.deepEqual(versioning.getSupersessionChain("unknown"), []);
	});
});

// =========================================================================
// B-23: BrainExpiration
// =========================================================================

describe("BrainExpiration", () => {
	const policy = { ttlDays: 365, warningDays: 30, autoArchive: true };

	it("should detect expiring entries within warning window", () => {
		const expiration = new BrainExpiration(policy);
		const entries = [
			{ id: "e-1", updated_at: now - 350 * DAY_MS }, // 15 days remaining
		];
		const expiring = expiration.getExpiring(entries, now);
		assert.equal(expiring.length, 1);
		assert.equal(expiring[0].id, "e-1");
		assert.ok(expiring[0].daysRemaining <= 30);
	});

	it("should not include non-expiring entries", () => {
		const expiration = new BrainExpiration(policy);
		const entries = [
			{ id: "e-1", updated_at: now - 100 * DAY_MS }, // 265 days remaining
		];
		const expiring = expiration.getExpiring(entries, now);
		assert.equal(expiring.length, 0);
	});

	it("should detect expired entries", () => {
		const expiration = new BrainExpiration(policy);
		const entries = [
			{ id: "e-1", updated_at: now - 400 * DAY_MS }, // expired
			{ id: "e-2", updated_at: now - 100 * DAY_MS }, // not expired
		];
		const expired = expiration.getExpired(entries, now);
		assert.equal(expired.length, 1);
		assert.equal(expired[0], "e-1");
	});

	it("should return no expired for fresh entries", () => {
		const expiration = new BrainExpiration(policy);
		const entries = [{ id: "e-1", updated_at: now }];
		assert.equal(expiration.getExpired(entries, now).length, 0);
	});

	it("should return warnings for entries near expiry", () => {
		const expiration = new BrainExpiration(policy);
		const entries = [
			{ id: "e-1", updated_at: now - 345 * DAY_MS },
		];
		const warnings = expiration.getWarnings(entries, now);
		assert.equal(warnings.length, 1);
		assert.ok(warnings[0].daysRemaining > 0);
	});

	it("should handle custom ttl and warning days", () => {
		const shortPolicy = { ttlDays: 30, warningDays: 7, autoArchive: false };
		const expiration = new BrainExpiration(shortPolicy);
		const entries = [
			{ id: "e-1", updated_at: now - 25 * DAY_MS }, // 5 days remaining
		];
		const warnings = expiration.getWarnings(entries, now);
		assert.equal(warnings.length, 1);
	});
});

// =========================================================================
// B-25: BrainUsageAnalytics
// =========================================================================

describe("BrainUsageAnalytics", () => {
	it("should return top queried entries", () => {
		const analytics = new BrainUsageAnalytics();
		const entries = [
			{ id: "e-1", access_count: 50, usefulness_score: 0.5, category: "test" },
			{ id: "e-2", access_count: 10, usefulness_score: 0.5, category: "test" },
		];
		const result = analytics.analyze(entries);
		assert.equal(result.topQueried[0].id, "e-1");
		assert.equal(result.topQueried[0].count, 50);
	});

	it("should return top strengthened entries", () => {
		const analytics = new BrainUsageAnalytics();
		const entries = [
			{ id: "e-1", access_count: 1, usefulness_score: 0.9, category: "test" },
			{ id: "e-2", access_count: 1, usefulness_score: 0.2, category: "test" },
		];
		const result = analytics.analyze(entries);
		assert.equal(result.topStrengthened[0].id, "e-1");
	});

	it("should detect gap areas (categories with < 3 entries)", () => {
		const analytics = new BrainUsageAnalytics();
		const entries = [
			{ id: "e-1", access_count: 1, usefulness_score: 0.5, category: "sparse" },
			{ id: "e-2", access_count: 1, usefulness_score: 0.5, category: "sparse" },
			{ id: "e-3", access_count: 1, usefulness_score: 0.5, category: "full" },
			{ id: "e-4", access_count: 1, usefulness_score: 0.5, category: "full" },
			{ id: "e-5", access_count: 1, usefulness_score: 0.5, category: "full" },
		];
		const result = analytics.analyze(entries);
		assert.ok(result.gapAreas.includes("sparse"));
		assert.ok(!result.gapAreas.includes("full"));
	});

	it("should detect unused entries", () => {
		const analytics = new BrainUsageAnalytics();
		const entries = [
			{ id: "e-1", access_count: 0, usefulness_score: 0, category: "test" },
			{ id: "e-2", access_count: 5, usefulness_score: 0.5, category: "test" },
		];
		const result = analytics.analyze(entries);
		assert.ok(result.unusedEntries.includes("e-1"));
		assert.ok(!result.unusedEntries.includes("e-2"));
	});

	it("should compute ROI usage rate", () => {
		const analytics = new BrainUsageAnalytics();
		const entries = [
			{ id: "e-1", access_count: 5, usefulness_score: 0.5, category: "test" },
			{ id: "e-2", access_count: 0, usefulness_score: 0, category: "test" },
		];
		const result = analytics.analyze(entries);
		assert.equal(result.roi.entriesUsed, 1);
		assert.equal(result.roi.entriesTotal, 2);
		assert.equal(result.roi.usageRate, 0.5);
	});

	it("should handle empty entries", () => {
		const analytics = new BrainUsageAnalytics();
		const result = analytics.analyze([]);
		assert.equal(result.topQueried.length, 0);
		assert.equal(result.roi.usageRate, 0);
	});
});

// =========================================================================
// B-26: BrainBackup
// =========================================================================

describe("BrainBackup", () => {
	it("should create a backup with hash", () => {
		const backup = new BrainBackup();
		const result = backup.createBackup([{ id: "e-1" }], [{ id: "l-1" }]);
		assert.ok(result.data);
		assert.ok(result.hash);
		assert.ok(result.timestamp > 0);
	});

	it("should verify a valid backup", () => {
		const backup = new BrainBackup();
		const result = backup.createBackup([{ id: "e-1" }], []);
		assert.equal(backup.verifyBackup(result), true);
	});

	it("should fail verification for tampered backup", () => {
		const backup = new BrainBackup();
		const result = backup.createBackup([{ id: "e-1" }], []);
		result.data = result.data.replace("e-1", "e-2");
		assert.equal(backup.verifyBackup(result), false);
	});

	it("should restore entries and links from backup", () => {
		const backup = new BrainBackup();
		const entries = [{ id: "e-1", title: "Test" }];
		const links = [{ id: "l-1", from: "e-1", to: "e-2" }];
		const created = backup.createBackup(entries, links);
		const restored = backup.restore(created);
		assert.equal((restored.entries as { id: string }[]).length, 1);
		assert.equal((restored.links as { id: string }[]).length, 1);
	});

	it("should handle empty backup", () => {
		const backup = new BrainBackup();
		const created = backup.createBackup([], []);
		const restored = backup.restore(created);
		assert.equal((restored.entries as unknown[]).length, 0);
		assert.equal((restored.links as unknown[]).length, 0);
	});
});

// =========================================================================
// B-28: BrainEntryTemplateManager
// =========================================================================

describe("BrainEntryTemplateManager", () => {
	it("should load default templates", () => {
		const manager = new BrainEntryTemplateManager();
		assert.ok(manager.getAllTemplates().length >= 5);
	});

	it("should get template by id", () => {
		const manager = new BrainEntryTemplateManager();
		const t = manager.getTemplate("decision");
		assert.ok(t);
		assert.equal(t.name, "Decision Record");
	});

	it("should return undefined for unknown template", () => {
		const manager = new BrainEntryTemplateManager();
		assert.equal(manager.getTemplate("nonexistent"), undefined);
	});

	it("should create entry from decision template", () => {
		const manager = new BrainEntryTemplateManager();
		const result = manager.createFromTemplate("decision", "Use TypeScript over JavaScript");
		assert.equal(result.title, "Use TypeScript over JavaScript");
		assert.equal(result.category, "decision");
		assert.ok(result.content.includes("## Decision"));
		assert.ok(result.tags.includes("decision"));
	});

	it("should create entry from lesson template", () => {
		const manager = new BrainEntryTemplateManager();
		const result = manager.createFromTemplate("lesson", "Always validate input");
		assert.equal(result.category, "lesson");
		assert.ok(result.content.includes("## Root Cause"));
	});

	it("should apply overrides to content template", () => {
		const manager = new BrainEntryTemplateManager();
		const result = manager.createFromTemplate("decision", "Test Decision", {
			Decision: "We decided to use X",
		});
		assert.ok(result.content.includes("We decided to use X"));
	});

	it("should throw when template not found", () => {
		const manager = new BrainEntryTemplateManager();
		assert.throws(() => manager.createFromTemplate("nonexistent", "Title"));
	});

	it("should add custom template", () => {
		const manager = new BrainEntryTemplateManager();
		manager.addTemplate({
			id: "custom",
			name: "Custom",
			category: "custom",
			contentTemplate: "## Custom\n",
			requiredFields: ["title"],
			tags: ["custom"],
		});
		assert.ok(manager.getTemplate("custom"));
	});

	it("should have all 5 built-in templates", () => {
		assert.equal(BRAIN_ENTRY_TEMPLATES.length, 5);
		const ids = BRAIN_ENTRY_TEMPLATES.map((t) => t.id);
		assert.ok(ids.includes("decision"));
		assert.ok(ids.includes("lesson"));
		assert.ok(ids.includes("pattern"));
		assert.ok(ids.includes("failure"));
		assert.ok(ids.includes("convention"));
	});
});

// =========================================================================
// B-29: ProvenanceTracker
// =========================================================================

describe("ProvenanceTracker", () => {
	const tracker = new ProvenanceTracker();

	const sampleProvenance: ProvenanceMetadata = {
		sourceAgent: "test-agent",
		sourceType: "direct_observation",
		confidence: 0.9,
		timestamp: now,
	};

	it("should attach provenance to entry data", () => {
		const data = { title: "Test", content: "Content", metadata: {} };
		const result = tracker.attachProvenance(data, sampleProvenance);
		assert.ok((result.metadata as Record<string, unknown>).provenance);
	});

	it("should preserve existing metadata when attaching provenance", () => {
		const data = { title: "Test", metadata: { existing: true } };
		const result = tracker.attachProvenance(data, sampleProvenance);
		const meta = result.metadata as Record<string, unknown>;
		assert.equal(meta.existing, true);
		assert.ok(meta.provenance);
	});

	it("should get provenance from entry", () => {
		const entry = { metadata: { provenance: sampleProvenance } };
		const result = tracker.getProvenance(entry);
		assert.ok(result);
		assert.equal(result.sourceAgent, "test-agent");
	});

	it("should return null for entry without provenance", () => {
		const entry = { metadata: {} };
		assert.equal(tracker.getProvenance(entry), null);
	});

	it("should filter by trust (min confidence)", () => {
		const entries = [
			{ metadata: { provenance: { ...sampleProvenance, confidence: 0.9 } } },
			{ metadata: { provenance: { ...sampleProvenance, confidence: 0.3 } } },
			{ metadata: {} },
		];
		const filtered = tracker.filterByTrust(entries, 0.5);
		assert.equal(filtered.length, 1);
	});

	it("should weight by provenance type", () => {
		const entries = [
			{ metadata: { provenance: { ...sampleProvenance, sourceType: "direct_observation", confidence: 1.0 } } },
			{ metadata: { provenance: { ...sampleProvenance, sourceType: "handoff", confidence: 1.0 } } },
		];
		const weighted = tracker.weightByProvenance(entries);
		assert.equal(weighted.length, 2);
		// direct_observation should have higher weight than handoff
		assert.ok(weighted[0].weight > weighted[1].weight);
	});

	it("should assign 0.5 weight to entries without provenance", () => {
		const entries = [{ metadata: {} }];
		const weighted = tracker.weightByProvenance(entries);
		assert.equal(weighted[0].weight, 0.5);
	});

	it("should weight mcp_derived at 0.8", () => {
		const entries = [
			{ metadata: { provenance: { ...sampleProvenance, sourceType: "mcp_derived", confidence: 1.0 } } },
		];
		const weighted = tracker.weightByProvenance(entries);
		assert.ok(Math.abs(weighted[0].weight - 0.8) < 0.001);
	});

	it("should weight a2a at 0.6", () => {
		const entries = [
			{ metadata: { provenance: { ...sampleProvenance, sourceType: "a2a", confidence: 1.0 } } },
		];
		const weighted = tracker.weightByProvenance(entries);
		assert.ok(Math.abs(weighted[0].weight - 0.6) < 0.001);
	});

	it("should multiply type weight by confidence", () => {
		const entries = [
			{ metadata: { provenance: { ...sampleProvenance, sourceType: "direct_observation", confidence: 0.5 } } },
		];
		const weighted = tracker.weightByProvenance(entries);
		assert.ok(Math.abs(weighted[0].weight - 0.5) < 0.001);
	});
});
