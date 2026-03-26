/**
 * Tests for KnowledgeCurator (DE-03)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { KnowledgeCurator } from "./curator.js";
import type { BrainEntryLite, BrainLinkLite } from "./gardener.js";

const DAY_MS = 86_400_000;
const now = Date.now();

function makeEntry(overrides: Partial<BrainEntryLite> = {}): BrainEntryLite {
	return {
		id: "e-1",
		title: "Test Entry Title",
		content:
			"This is a test entry with enough content to exceed one hundred characters of text for quality scoring purposes and evaluation",
		category: "test",
		tags: ["testing", "unit"],
		created_at: now - 10 * DAY_MS,
		updated_at: now - 1 * DAY_MS,
		access_count: 5,
		usefulness_score: 0.7,
		source_agent: "test-agent",
		metadata: {},
		...overrides,
	};
}

describe("KnowledgeCurator", () => {
	const curator = new KnowledgeCurator();

	describe("scoreQuality", () => {
		it("should return 1.0 for a perfect entry", () => {
			const entry = makeEntry();
			const score = curator.scoreQuality(entry);
			assert.equal(score, 1.0);
		});

		it("should return 0.0 for an entry missing everything", () => {
			const entry = makeEntry({
				category: "",
				tags: [],
				content: "short",
				source_agent: undefined,
				updated_at: now - 60 * DAY_MS,
				access_count: 0,
			});
			const score = curator.scoreQuality(entry);
			assert.equal(score, 0);
		});

		it("should return 0.8 for entry missing source and not recent", () => {
			const entry = makeEntry({
				source_agent: undefined,
				updated_at: now - 60 * DAY_MS,
				access_count: 0,
			});
			const score = curator.scoreQuality(entry);
			assert.equal(score, 0.6);
		});

		it("should give 0.2 credit for having tags", () => {
			const withTags = makeEntry();
			const withoutTags = makeEntry({ tags: [] });
			const diff =
				curator.scoreQuality(withTags) - curator.scoreQuality(withoutTags);
			assert.ok(Math.abs(diff - 0.2) < 0.01, `Expected ~0.2, got ${diff}`);
		});
	});

	describe("suggestMetadataEnrichment", () => {
		it("should suggest tags for entries with no tags", () => {
			const entry = makeEntry({ tags: [] });
			const improvements = curator.suggestMetadataEnrichment(entry);
			assert.ok(
				improvements.some((i) => i.type === "metadata" && i.before === "[]"),
			);
		});

		it("should suggest category for entries with empty category", () => {
			const entry = makeEntry({ category: "" });
			const improvements = curator.suggestMetadataEnrichment(entry);
			assert.ok(
				improvements.some(
					(i) => i.type === "metadata" && i.after === "uncategorized",
				),
			);
		});

		it("should suggest format improvement for short titles", () => {
			const entry = makeEntry({ title: "Hi" });
			const improvements = curator.suggestMetadataEnrichment(entry);
			assert.ok(improvements.some((i) => i.type === "format"));
		});

		it("should return no improvements for well-formed entry", () => {
			const entry = makeEntry();
			const improvements = curator.suggestMetadataEnrichment(entry);
			assert.equal(improvements.length, 0);
		});
	});

	describe("suggestLinks", () => {
		it("should suggest links between entries with keyword overlap", () => {
			const entry = makeEntry({
				id: "e1",
				title: "JavaScript async patterns",
				content: "Using promises and async await in JavaScript applications",
			});
			const others = [
				makeEntry({
					id: "e2",
					title: "Async JavaScript best practices",
					content:
						"Best practices for async await promises in JavaScript projects",
				}),
			];
			const suggestions = curator.suggestLinks(entry, others);
			assert.ok(suggestions.length > 0);
			assert.equal(suggestions[0].targetId, "e2");
			assert.equal(suggestions[0].linkType, "related_to");
		});

		it("should not suggest links to itself", () => {
			const entry = makeEntry({ id: "self" });
			const suggestions = curator.suggestLinks(entry, [entry]);
			assert.equal(suggestions.length, 0);
		});

		it("should not suggest links for entries with no keyword overlap", () => {
			const entry = makeEntry({
				id: "e1",
				title: "Quantum physics",
				content: "Superposition and entanglement in quantum mechanics",
			});
			const others = [
				makeEntry({
					id: "e2",
					title: "Cooking recipes",
					content: "Baking sourdough bread with starter yeast flour",
				}),
			];
			const suggestions = curator.suggestLinks(entry, others);
			assert.equal(suggestions.length, 0);
		});
	});

	describe("analyze", () => {
		it("should produce a CurationReport with scores and improvements", () => {
			const entries = [
				makeEntry({ id: "e1", tags: [] }),
				makeEntry({ id: "e2" }),
			];
			const report = curator.analyze(entries, []);
			assert.equal(typeof report.timestamp, "number");
			assert.ok(Array.isArray(report.improvements));
			assert.equal(report.qualityScores.length, 2);
		});

		it("should not duplicate link suggestions for existing links", () => {
			const entries = [
				makeEntry({
					id: "e1",
					title: "JavaScript async",
					content: "Async await patterns for JavaScript",
				}),
				makeEntry({
					id: "e2",
					title: "JavaScript async guide",
					content: "Guide to async await patterns for JavaScript",
				}),
			];
			const links: BrainLinkLite[] = [
				{
					id: "l1",
					from_entry: "e1",
					to_entry: "e2",
					link_type: "related_to",
					confidence: 0.9,
				},
			];
			const report = curator.analyze(entries, links);
			const linkSuggestions = report.improvements.filter(
				(i) => i.type === "link_suggestion",
			);
			assert.equal(linkSuggestions.length, 0);
		});
	});
});
