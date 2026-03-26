import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { BrainMigrator, validateB1Entry } from "./migration";
import { BrainDatabase } from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
	return mkdtempSync(join(tmpdir(), "brain-mig-"));
}

function writeB1File(
	dir: string,
	filename: string,
	data: Record<string, unknown>,
): void {
	writeFileSync(join(dir, filename), JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// validateB1Entry
// ---------------------------------------------------------------------------

describe("validateB1Entry", () => {
	it("accepts valid entry", () => {
		assert.ok(
			validateB1Entry({
				title: "Test",
				content: "Content",
				category: "decision",
			}),
		);
	});

	it("rejects null", () => {
		assert.equal(validateB1Entry(null), false);
	});

	it("rejects missing title", () => {
		assert.equal(validateB1Entry({ content: "x" }), false);
	});

	it("rejects missing content", () => {
		assert.equal(validateB1Entry({ title: "x" }), false);
	});

	it("rejects empty title", () => {
		assert.equal(validateB1Entry({ title: "", content: "x" }), false);
	});

	it("rejects non-object", () => {
		assert.equal(validateB1Entry("string"), false);
	});
});

// ---------------------------------------------------------------------------
// BrainMigrator
// ---------------------------------------------------------------------------

describe("BrainMigrator", () => {
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

	it("migrates valid B1 JSON files", () => {
		writeB1File(b1Dir, "entry1.json", {
			title: "Adapter pattern",
			content: "Chose adapter pattern for hooks",
			category: "decision",
			project: "helm",
			source_agent: "implementer",
		});
		writeB1File(b1Dir, "entry2.json", {
			title: "Standing orders format",
			content: "Structured JSON for standing orders",
			category: "decision",
		});

		const migrator = new BrainMigrator(b1Dir, db);
		const report = migrator.migrate();

		assert.equal(report.entriesMigrated, 2);
		assert.equal(report.entriesSkipped, 0);
		assert.equal(report.errors.length, 0);
		assert.ok(report.startedAt > 0);
		assert.ok(report.completedAt >= report.startedAt);
	});

	it("skips duplicate entries (idempotent)", () => {
		writeB1File(b1Dir, "entry.json", {
			title: "Unique Entry",
			content: "Some content",
			category: "decision",
		});

		const m1 = new BrainMigrator(b1Dir, db);
		const r1 = m1.migrate();
		assert.equal(r1.entriesMigrated, 1);

		const m2 = new BrainMigrator(b1Dir, db);
		const r2 = m2.migrate();
		assert.equal(r2.entriesMigrated, 0);
		assert.equal(r2.entriesSkipped, 1);
	});

	it("reports errors for invalid JSON files", () => {
		writeFileSync(join(b1Dir, "bad.json"), "not valid json");

		const migrator = new BrainMigrator(b1Dir, db);
		const report = migrator.migrate();

		assert.equal(report.errors.length, 1);
		assert.equal(report.errors[0].file, "bad.json");
	});

	it("reports errors for entries missing required fields", () => {
		writeB1File(b1Dir, "incomplete.json", {
			title: "Has title only",
		});

		const migrator = new BrainMigrator(b1Dir, db);
		const report = migrator.migrate();

		assert.equal(report.errors.length, 1);
		assert.ok(report.errors[0].error.includes("Validation failed"));
	});

	it("handles empty B1 directory", () => {
		const migrator = new BrainMigrator(b1Dir, db);
		const report = migrator.migrate();

		assert.equal(report.entriesMigrated, 0);
		assert.equal(report.errors.length, 0);
	});

	it("handles nonexistent B1 directory", () => {
		const migrator = new BrainMigrator("/tmp/nonexistent-b1-dir", db);
		const report = migrator.migrate();

		assert.equal(report.entriesMigrated, 0);
	});

	it("creates contradiction links", () => {
		writeB1File(b1Dir, "a.json", {
			title: "Entry A",
			content: "First approach",
			category: "decision",
			contradicts: ["Entry B"],
		});
		writeB1File(b1Dir, "b.json", {
			title: "Entry B",
			content: "Second approach",
			category: "decision",
		});

		const migrator = new BrainMigrator(b1Dir, db);
		const report = migrator.migrate();

		assert.equal(report.entriesMigrated, 2);
		assert.equal(report.linksCreated, 1);
	});

	it("preserves metadata and tags from B1", () => {
		writeB1File(b1Dir, "meta.json", {
			title: "Meta Entry",
			content: "Has metadata",
			category: "outcome",
			tags: ["tag1", "tag2"],
			metadata: { custom: "value" },
		});

		const migrator = new BrainMigrator(b1Dir, db);
		migrator.migrate();

		const results = db.search("meta entry");
		assert.equal(results.length, 1);
		assert.deepEqual(results[0].tags, ["tag1", "tag2"]);
	});

	it("generates a report matching migration state", () => {
		writeB1File(b1Dir, "ok.json", {
			title: "Good",
			content: "Valid",
			category: "decision",
		});

		const migrator = new BrainMigrator(b1Dir, db);
		migrator.migrate();
		const report = migrator.generateReport();

		assert.equal(report.entriesMigrated, 1);
		assert.ok(report.completedAt > 0);
	});

	it("ignores non-JSON files", () => {
		writeFileSync(join(b1Dir, "readme.md"), "# Not a brain entry");
		writeB1File(b1Dir, "valid.json", {
			title: "Real Entry",
			content: "Real content",
			category: "decision",
		});

		const migrator = new BrainMigrator(b1Dir, db);
		const report = migrator.migrate();

		assert.equal(report.entriesMigrated, 1);
		assert.equal(report.errors.length, 0);
	});
});
