/**
 * Tests for KnowledgeHarvester (DE-04)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { KnowledgeHarvester, type HarvestSource } from "./harvester.js";

const now = Date.now();

describe("KnowledgeHarvester", () => {
	const harvester = new KnowledgeHarvester();

	describe("extractFromDiff", () => {
		it("should extract new exports from diff", () => {
			const diff = [
				"--- a/src/old.ts",
				"+++ b/src/new.ts",
				"@@ -1,3 +1,5 @@",
				"+export class MyNewService {",
				"+  constructor() {}",
				"+}",
			].join("\n");
			const entries = harvester.extractFromDiff(diff);
			assert.ok(entries.length > 0);
			assert.ok(entries[0].title.includes("MyNewService"));
		});

		it("should detect refactoring when exports are removed and added", () => {
			const diff = [
				"--- a/src/old.ts",
				"+++ b/src/new.ts",
				"-export class OldService {",
				"+export class NewService {",
			].join("\n");
			const entries = harvester.extractFromDiff(diff);
			assert.ok(entries.some((e) => e.category === "refactoring"));
		});

		it("should return empty for empty diff", () => {
			const entries = harvester.extractFromDiff("");
			assert.equal(entries.length, 0);
		});
	});

	describe("extractFromPR", () => {
		it("should extract rationale from PR description", () => {
			const desc = [
				"## Add caching layer",
				"",
				"## Rationale",
				"We needed caching to reduce latency by 50%.",
				"",
				"## Changes",
				"- Added Redis integration",
			].join("\n");
			const entries = harvester.extractFromPR(desc);
			assert.ok(entries.some((e) => e.category === "decision"));
		});

		it("should produce a general entry for unstructured PRs", () => {
			const desc =
				"This PR adds a new feature for handling user notifications in the system with multiple channels.";
			const entries = harvester.extractFromPR(desc);
			assert.ok(entries.length > 0);
			assert.equal(entries[0].category, "change");
		});

		it("should return empty for empty description", () => {
			const entries = harvester.extractFromPR("");
			assert.equal(entries.length, 0);
		});
	});

	describe("extractFromCommit", () => {
		it("should parse conventional commit: fix", () => {
			const entries = harvester.extractFromCommit(
				"fix(auth): resolve token expiration race condition",
			);
			assert.equal(entries.length, 1);
			assert.equal(entries[0].category, "bug_fix");
			assert.ok(entries[0].tags.includes("fix"));
		});

		it("should parse conventional commit: feat", () => {
			const entries = harvester.extractFromCommit(
				"feat(api): add pagination support",
			);
			assert.equal(entries.length, 1);
			assert.equal(entries[0].category, "feature");
		});

		it("should handle non-conventional commits", () => {
			const entries = harvester.extractFromCommit(
				"Updated the README with new instructions for developers",
			);
			assert.ok(entries.length > 0);
			assert.equal(entries[0].category, "change");
		});

		it("should return empty for empty message", () => {
			const entries = harvester.extractFromCommit("");
			assert.equal(entries.length, 0);
		});
	});

	describe("filterSensitive", () => {
		it("should detect API keys", () => {
			const result = harvester.filterSensitive({
				title: "Config",
				content: "Use key sk-abc123defghijklmn for auth",
				category: "config",
				tags: [],
				sourceAttribution: "test",
				confidence: 0.5,
			});
			assert.equal(result, true);
		});

		it("should detect email addresses", () => {
			const result = harvester.filterSensitive({
				title: "Contact",
				content: "Email admin@example.com for access",
				category: "config",
				tags: [],
				sourceAttribution: "test",
				confidence: 0.5,
			});
			assert.equal(result, true);
		});

		it("should pass clean content", () => {
			const result = harvester.filterSensitive({
				title: "Pattern",
				content: "Use the factory pattern for object creation",
				category: "pattern",
				tags: [],
				sourceAttribution: "test",
				confidence: 0.5,
			});
			assert.equal(result, false);
		});
	});

	describe("harvest", () => {
		it("should filter sensitive entries from results", () => {
			const source: HarvestSource = {
				type: "commit_message",
				content: "fix: remove hardcoded key sk-abc123secretkey456 from config",
				timestamp: now,
				author: "dev",
			};
			const result = harvester.harvest(source);
			// The entry should be filtered because it contains an API key
			assert.equal(result.entries.length, 0);
		});

		it("should set author from source", () => {
			const source: HarvestSource = {
				type: "commit_message",
				content: "feat(core): add new validation layer",
				timestamp: now,
				author: "alice",
			};
			const result = harvester.harvest(source);
			assert.ok(result.entries.length > 0);
			assert.equal(result.entries[0].sourceAttribution, "alice");
		});
	});
});
