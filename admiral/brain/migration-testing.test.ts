/**
 * Brain Schema Migration Testing (B-27)
 *
 * Tests B1→B2 migrations: all entry types, metadata preservation,
 * edge cases (empty brain, special chars, large content), idempotency,
 * contradiction link creation, and version tracking.
 */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { BrainMigrator, validateB1Entry } from "./migration";
import { BrainDatabase } from "./schema";

function makeTmpDir(): string {
	return mkdtempSync(join(tmpdir(), "brain-migration-test-"));
}

function writeB1Entry(
	dir: string,
	filename: string,
	entry: Record<string, unknown>,
): void {
	writeFileSync(join(dir, filename), JSON.stringify(entry, null, 2));
}

describe("B-27: Schema Migration Testing", () => {
	let dbDir: string;
	let b1Dir: string;
	let db: BrainDatabase;

	beforeEach(() => {
		dbDir = makeTmpDir();
		b1Dir = makeTmpDir();
		db = new BrainDatabase(dbDir);
		db.migrate();
	});

	afterEach(() => {
		db.close();
		rmSync(dbDir, { recursive: true, force: true });
		rmSync(b1Dir, { recursive: true, force: true });
	});

	describe("B1→B2 migration basics", () => {
		it("migrates a standard entry", () => {
			writeB1Entry(b1Dir, "lesson-01.json", {
				title: "Always validate inputs",
				content: "Input validation prevents injection attacks",
				category: "LESSON",
				tags: ["security", "validation"],
			});

			const migrator = new BrainMigrator(b1Dir, db);
			const report = migrator.migrate();

			assert.equal(report.entriesMigrated, 1);
			assert.equal(report.entriesSkipped, 0);
			assert.equal(report.errors.length, 0);
		});

		it("migrates multiple entries", () => {
			for (let i = 0; i < 5; i++) {
				writeB1Entry(b1Dir, `entry-${i}.json`, {
					title: `Entry ${i}`,
					content: `Content for entry ${i}`,
					category: "LESSON",
				});
			}

			const migrator = new BrainMigrator(b1Dir, db);
			const report = migrator.migrate();
			assert.equal(report.entriesMigrated, 5);
		});

		it("handles empty B1 directory", () => {
			const migrator = new BrainMigrator(b1Dir, db);
			const report = migrator.migrate();

			assert.equal(report.entriesMigrated, 0);
			assert.equal(report.errors.length, 0);
		});

		it("handles missing B1 directory", () => {
			const migrator = new BrainMigrator("/nonexistent/path", db);
			const report = migrator.migrate();

			assert.equal(report.entriesMigrated, 0);
		});
	});

	describe("entry type coverage", () => {
		it("migrates LESSON entries", () => {
			writeB1Entry(b1Dir, "lesson.json", {
				title: "Lesson learned",
				content: "Details",
				category: "LESSON",
			});
			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(report.entriesMigrated, 1);
			const entries = db.getAllEntries();
			assert.equal(entries[0].category, "LESSON");
		});

		it("migrates DECISION entries", () => {
			writeB1Entry(b1Dir, "decision.json", {
				title: "Decision: use TypeScript",
				content: "TypeScript provides type safety",
				category: "decision",
				metadata: { authorityTier: "autonomous" },
			});
			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(report.entriesMigrated, 1);
		});

		it("migrates FAILURE entries", () => {
			writeB1Entry(b1Dir, "failure.json", {
				title: "Failure: timeout issue",
				content: "DB connection pooling fix",
				category: "FAILURE",
				tags: ["bug", "database"],
			});
			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(report.entriesMigrated, 1);
		});

		it("migrates uncategorized entries", () => {
			writeB1Entry(b1Dir, "misc.json", {
				title: "Random note",
				content: "Some content",
			});
			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(report.entriesMigrated, 1);
			const entries = db.getAllEntries();
			assert.equal(entries[0].category, "uncategorized");
		});
	});

	describe("metadata preservation", () => {
		it("preserves tags", () => {
			writeB1Entry(b1Dir, "tagged.json", {
				title: "Tagged entry",
				content: "Has tags",
				tags: ["alpha", "beta", "gamma"],
			});
			new BrainMigrator(b1Dir, db).migrate();
			const entries = db.getAllEntries();
			assert.deepEqual(entries[0].tags, ["alpha", "beta", "gamma"]);
		});

		it("preserves source_agent", () => {
			writeB1Entry(b1Dir, "agent.json", {
				title: "Agent entry",
				content: "From an agent",
				source_agent: "implementer-1",
			});
			new BrainMigrator(b1Dir, db).migrate();
			const entries = db.getAllEntries();
			assert.equal(entries[0].source_agent, "implementer-1");
		});

		it("preserves confidence", () => {
			writeB1Entry(b1Dir, "confident.json", {
				title: "High confidence",
				content: "Very sure",
				confidence: 0.95,
			});
			new BrainMigrator(b1Dir, db).migrate();
			const entries = db.getAllEntries();
			assert.equal(entries[0].confidence, 0.95);
		});

		it("preserves metadata object", () => {
			writeB1Entry(b1Dir, "meta.json", {
				title: "With metadata",
				content: "Has extra data",
				metadata: { custom_field: "value", count: 42 },
			});
			new BrainMigrator(b1Dir, db).migrate();
			const entries = db.getAllEntries();
			assert.equal(entries[0].metadata.custom_field, "value");
			assert.equal(entries[0].metadata.count, 42);
		});

		it("preserves scope/project", () => {
			writeB1Entry(b1Dir, "scoped.json", {
				title: "Scoped entry",
				content: "Has scope",
				scope: "my-project",
			});
			new BrainMigrator(b1Dir, db).migrate();
			const entries = db.getAllEntries();
			assert.equal(entries[0].scope, "my-project");
		});
	});

	describe("edge cases", () => {
		it("handles special characters in content", () => {
			writeB1Entry(b1Dir, "special.json", {
				title: "Special chars: <>&\"'",
				content: "Content with\nnewlines\tand\ttabs and unicode: \u00e9\u00e8\u00ea",
			});
			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(report.entriesMigrated, 1);
			const entries = db.getAllEntries();
			assert.ok(entries[0].title.includes("<>&"));
		});

		it("handles long content", () => {
			writeB1Entry(b1Dir, "long.json", {
				title: "Long entry",
				content: "x".repeat(100_000),
			});
			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(report.entriesMigrated, 1);
		});

		it("handles empty tags array", () => {
			writeB1Entry(b1Dir, "no-tags.json", {
				title: "No tags",
				content: "Content",
				tags: [],
			});
			new BrainMigrator(b1Dir, db).migrate();
			const entries = db.getAllEntries();
			assert.deepEqual(entries[0].tags, []);
		});

		it("reports invalid JSON files as errors", () => {
			writeFileSync(join(b1Dir, "invalid.json"), "not valid json");
			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(report.errors.length, 1);
		});

		it("reports entries missing required fields", () => {
			writeB1Entry(b1Dir, "incomplete.json", {
				title: "",
				content: "Missing title",
			});
			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(report.errors.length, 1);
		});
	});

	describe("idempotency", () => {
		it("skips already-migrated entries", () => {
			writeB1Entry(b1Dir, "entry.json", {
				title: "Idempotent entry",
				content: "Should only appear once",
			});

			const r1 = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(r1.entriesMigrated, 1);

			const r2 = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(r2.entriesMigrated, 0);
			assert.equal(r2.entriesSkipped, 1);

			assert.equal(db.getAllEntries().length, 1);
		});
	});

	describe("contradiction links", () => {
		it("creates contradiction links between entries", () => {
			writeB1Entry(b1Dir, "a.json", {
				title: "Approach A",
				content: "Use method A",
				contradicts: ["Approach B"],
			});
			writeB1Entry(b1Dir, "b.json", {
				title: "Approach B",
				content: "Use method B",
			});

			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.equal(report.linksCreated, 1);

			const entries = db.getAllEntries();
			const entryA = entries.find((e) => e.title === "Approach A");
			assert.ok(entryA);

			const links = db.getLinks(entryA!.id, "outgoing");
			const contradictLink = links.find((l) => l.link_type === "contradicts");
			assert.ok(contradictLink);
		});
	});

	describe("version tracking", () => {
		it("schema version is 1 after migration", () => {
			assert.equal(db.getVersion(), 1);
		});

		it("reports timestamps", () => {
			writeB1Entry(b1Dir, "entry.json", {
				title: "Test",
				content: "Content",
			});
			const report = new BrainMigrator(b1Dir, db).migrate();
			assert.ok(report.startedAt > 0);
			assert.ok(report.completedAt >= report.startedAt);
		});
	});

	describe("validateB1Entry", () => {
		it("accepts valid entry", () => {
			assert.equal(
				validateB1Entry({ title: "Test", content: "Content" }),
				true,
			);
		});

		it("rejects null", () => {
			assert.equal(validateB1Entry(null), false);
		});

		it("rejects missing title", () => {
			assert.equal(validateB1Entry({ content: "Content" }), false);
		});

		it("rejects empty title", () => {
			assert.equal(validateB1Entry({ title: "", content: "Content" }), false);
		});

		it("rejects missing content", () => {
			assert.equal(validateB1Entry({ title: "Test" }), false);
		});
	});
});
