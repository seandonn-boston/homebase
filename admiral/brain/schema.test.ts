import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { InsertEntry } from "./schema";
import { BrainDatabase } from "./schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
	return mkdtempSync(join(tmpdir(), "brain-test-"));
}

function makeEntry(overrides?: Partial<InsertEntry>): InsertEntry {
	return {
		title: overrides?.title ?? "Test Entry",
		content: overrides?.content ?? "Some test content for the brain entry.",
		category: overrides?.category ?? "decision",
		scope: overrides?.scope ?? "helm",
		tags: overrides?.tags ?? ["test"],
		metadata: overrides?.metadata ?? {},
		source_agent: overrides?.source_agent,
		source_type: overrides?.source_type,
		confidence: overrides?.confidence,
		superseded_by: overrides?.superseded_by,
		contradicts: overrides?.contradicts,
	};
}

// ---------------------------------------------------------------------------
// Schema Management
// ---------------------------------------------------------------------------

describe("BrainDatabase — schema", () => {
	let dir: string;
	let db: BrainDatabase;

	beforeEach(() => {
		dir = makeTmpDir();
		db = new BrainDatabase(dir);
	});

	afterEach(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it("starts at version 0 before migration", () => {
		assert.equal(db.getVersion(), 0);
	});

	it("migrates to version 1", () => {
		db.migrate();
		assert.equal(db.getVersion(), 1);
	});

	it("migration is idempotent", () => {
		db.migrate();
		db.migrate();
		assert.equal(db.getVersion(), 1);
	});
});

// ---------------------------------------------------------------------------
// Entry CRUD
// ---------------------------------------------------------------------------

describe("BrainDatabase — CRUD", () => {
	let dir: string;
	let db: BrainDatabase;

	beforeEach(() => {
		dir = makeTmpDir();
		db = new BrainDatabase(dir);
		db.migrate();
	});

	afterEach(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it("inserts and retrieves an entry", () => {
		const entry = db.insertEntry(makeEntry({ title: "Alpha" }));
		assert.ok(entry.id);
		assert.equal(entry.title, "Alpha");
		assert.equal(entry.usefulness_score, 0);
		assert.equal(entry.access_count, 0);

		const fetched = db.getEntry(entry.id);
		assert.ok(fetched);
		assert.equal(fetched.title, "Alpha");
		assert.equal(fetched.access_count, 1); // bumped on get
	});

	it("returns undefined for missing entry", () => {
		assert.equal(db.getEntry("nonexistent"), undefined);
	});

	it("updates an entry", () => {
		const entry = db.insertEntry(makeEntry());
		const updated = db.updateEntry(entry.id, {
			title: "Updated Title",
			tags: ["updated"],
		});
		assert.equal(updated.title, "Updated Title");
		assert.deepEqual(updated.tags, ["updated"]);
		assert.ok(updated.updated_at >= entry.updated_at);
	});

	it("throws when updating nonexistent entry", () => {
		assert.throws(() => db.updateEntry("nope", { title: "X" }), /not found/i);
	});

	it("deletes an entry", () => {
		const entry = db.insertEntry(makeEntry());
		assert.equal(db.deleteEntry(entry.id), true);
		assert.equal(db.getEntry(entry.id), undefined);
	});

	it("returns false when deleting nonexistent entry", () => {
		assert.equal(db.deleteEntry("nope"), false);
	});

	it("preserves metadata round-trip", () => {
		const meta = { key: "value", nested: { a: 1 } };
		const entry = db.insertEntry(makeEntry({ metadata: meta }));
		const fetched = db.getEntry(entry.id);
		assert.deepEqual(fetched?.metadata, meta);
	});

	it("preserves tags round-trip", () => {
		const tags = ["alpha", "beta", "gamma"];
		const entry = db.insertEntry(makeEntry({ tags }));
		const fetched = db.getEntry(entry.id);
		assert.deepEqual(fetched?.tags, tags);
	});

	it("handles optional fields as undefined", () => {
		const entry = db.insertEntry(makeEntry());
		const fetched = db.getEntry(entry.id);
		assert.equal(fetched?.source_agent, undefined);
		assert.equal(fetched?.confidence, undefined);
		assert.equal(fetched?.superseded_by, undefined);
	});

	it("updates usefulness_score", () => {
		const entry = db.insertEntry(makeEntry());
		const updated = db.updateEntry(entry.id, { usefulness_score: 4.5 });
		assert.equal(updated.usefulness_score, 4.5);
	});
});

// ---------------------------------------------------------------------------
// FTS5 Search
// ---------------------------------------------------------------------------

describe("BrainDatabase — search", () => {
	let dir: string;
	let db: BrainDatabase;

	beforeEach(() => {
		dir = makeTmpDir();
		db = new BrainDatabase(dir);
		db.migrate();
	});

	afterEach(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it("finds entries by title keyword", () => {
		db.insertEntry(makeEntry({ title: "Adapter pattern for hooks" }));
		db.insertEntry(makeEntry({ title: "Standing orders format" }));

		const results = db.search("adapter");
		assert.equal(results.length, 1);
		assert.equal(results[0].title, "Adapter pattern for hooks");
	});

	it("finds entries by content keyword", () => {
		db.insertEntry(
			makeEntry({
				title: "Entry A",
				content: "The governance framework uses ring buffers",
			}),
		);
		db.insertEntry(
			makeEntry({ title: "Entry B", content: "MCP tools are great" }),
		);

		const results = db.search("governance");
		assert.equal(results.length, 1);
		assert.equal(results[0].title, "Entry A");
	});

	it("returns empty for no match", () => {
		db.insertEntry(makeEntry({ title: "Something" }));
		assert.deepEqual(db.search("xyznonexistent"), []);
	});

	it("returns empty for empty query", () => {
		db.insertEntry(makeEntry());
		assert.deepEqual(db.search(""), []);
	});

	it("filters by category", () => {
		db.insertEntry(
			makeEntry({ title: "Decision Alpha", category: "decision" }),
		);
		db.insertEntry(makeEntry({ title: "Outcome Alpha", category: "outcome" }));

		const results = db.search("alpha", { category: "decision" });
		assert.equal(results.length, 1);
		assert.equal(results[0].category, "decision");
	});

	it("filters by scope", () => {
		db.insertEntry(makeEntry({ title: "Helm thing", scope: "helm" }));
		db.insertEntry(makeEntry({ title: "Global thing", scope: "global" }));

		const results = db.search("thing", { scope: "helm" });
		assert.equal(results.length, 1);
		assert.equal(results[0].scope, "helm");
	});

	it("filters by time range", () => {
		const e1 = db.insertEntry(makeEntry({ title: "Early entry" }));
		// Entries inserted at same millisecond; use since/until
		const results = db.search("entry", {
			since: e1.created_at,
			until: e1.created_at + 1000,
		});
		assert.ok(results.length >= 1);
	});

	it("filters by tags", () => {
		db.insertEntry(makeEntry({ title: "Tagged one", tags: ["alpha"] }));
		db.insertEntry(makeEntry({ title: "Tagged two", tags: ["beta"] }));

		const results = db.search("tagged", { tags: ["alpha"] });
		assert.equal(results.length, 1);
		assert.equal(results[0].title, "Tagged one");
	});

	it("respects limit", () => {
		for (let i = 0; i < 5; i++) {
			db.insertEntry(makeEntry({ title: `Item ${i}` }));
		}
		const results = db.search("item", undefined, 2);
		assert.equal(results.length, 2);
	});

	it("handles special characters in query", () => {
		db.insertEntry(makeEntry({ title: "Test entry" }));
		// Should not throw
		const results = db.search('test "quoted" (paren) *wild*');
		assert.ok(results.length >= 1);
	});
});

// ---------------------------------------------------------------------------
// Links (DE-01)
// ---------------------------------------------------------------------------

describe("BrainDatabase — links", () => {
	let dir: string;
	let db: BrainDatabase;

	beforeEach(() => {
		dir = makeTmpDir();
		db = new BrainDatabase(dir);
		db.migrate();
	});

	afterEach(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it("adds and retrieves links", () => {
		const a = db.insertEntry(makeEntry({ title: "A" }));
		const b = db.insertEntry(makeEntry({ title: "B" }));

		const link = db.addLink(a.id, b.id, "supports", 0.9, "test-agent");
		assert.ok(link.id);
		assert.equal(link.link_type, "supports");
		assert.equal(link.confidence, 0.9);

		const outgoing = db.getLinks(a.id, "outgoing");
		assert.equal(outgoing.length, 1);
		assert.equal(outgoing[0].to_entry, b.id);

		const incoming = db.getLinks(b.id, "incoming");
		assert.equal(incoming.length, 1);
		assert.equal(incoming[0].from_entry, a.id);

		const both = db.getLinks(a.id, "both");
		assert.equal(both.length, 1);
	});

	it("removes a link", () => {
		const a = db.insertEntry(makeEntry({ title: "A" }));
		const b = db.insertEntry(makeEntry({ title: "B" }));
		const link = db.addLink(a.id, b.id, "related_to");

		assert.equal(db.removeLink(link.id), true);
		assert.equal(db.getLinks(a.id).length, 0);
	});

	it("returns false when removing nonexistent link", () => {
		assert.equal(db.removeLink("nope"), false);
	});

	it("deleting an entry removes its links", () => {
		const a = db.insertEntry(makeEntry({ title: "A" }));
		const b = db.insertEntry(makeEntry({ title: "B" }));
		db.addLink(a.id, b.id, "supports");

		db.deleteEntry(a.id);
		assert.equal(db.getLinks(b.id).length, 0);
	});
});

// ---------------------------------------------------------------------------
// Link Traversal
// ---------------------------------------------------------------------------

describe("BrainDatabase — traversal", () => {
	let dir: string;
	let db: BrainDatabase;

	beforeEach(() => {
		dir = makeTmpDir();
		db = new BrainDatabase(dir);
		db.migrate();
	});

	afterEach(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it("traverses multi-hop links", () => {
		const a = db.insertEntry(makeEntry({ title: "A" }));
		const b = db.insertEntry(makeEntry({ title: "B" }));
		const c = db.insertEntry(makeEntry({ title: "C" }));
		db.addLink(a.id, b.id, "supports");
		db.addLink(b.id, c.id, "derived_from");

		const results = db.traverseLinks(a.id, 3);
		assert.equal(results.length, 2);
		assert.equal(results[0].depth, 1);
		assert.equal(results[1].depth, 2);
	});

	it("respects maxDepth", () => {
		const a = db.insertEntry(makeEntry({ title: "A" }));
		const b = db.insertEntry(makeEntry({ title: "B" }));
		const c = db.insertEntry(makeEntry({ title: "C" }));
		db.addLink(a.id, b.id, "supports");
		db.addLink(b.id, c.id, "supports");

		const results = db.traverseLinks(a.id, 1);
		assert.equal(results.length, 1);
		assert.equal(results[0].entry.title, "B");
	});

	it("handles cycles without infinite loop", () => {
		const a = db.insertEntry(makeEntry({ title: "A" }));
		const b = db.insertEntry(makeEntry({ title: "B" }));
		db.addLink(a.id, b.id, "supports");
		db.addLink(b.id, a.id, "supports");

		const results = db.traverseLinks(a.id, 5);
		assert.equal(results.length, 1); // just B, not revisiting A
	});

	it("filters by link type", () => {
		const a = db.insertEntry(makeEntry({ title: "A" }));
		const b = db.insertEntry(makeEntry({ title: "B" }));
		const c = db.insertEntry(makeEntry({ title: "C" }));
		db.addLink(a.id, b.id, "supports");
		db.addLink(a.id, c.id, "contradicts");

		const results = db.traverseLinks(a.id, 1, ["supports"]);
		assert.equal(results.length, 1);
		assert.equal(results[0].entry.title, "B");
	});

	it("includes path in traversal results", () => {
		const a = db.insertEntry(makeEntry({ title: "A" }));
		const b = db.insertEntry(makeEntry({ title: "B" }));
		db.addLink(a.id, b.id, "supports");

		const results = db.traverseLinks(a.id, 2);
		assert.equal(results[0].path.length, 2);
		assert.equal(results[0].path[0], a.id);
		assert.equal(results[0].path[1], b.id);
	});
});

// ---------------------------------------------------------------------------
// Demand Signals
// ---------------------------------------------------------------------------

describe("BrainDatabase — demand signals", () => {
	let dir: string;
	let db: BrainDatabase;

	beforeEach(() => {
		dir = makeTmpDir();
		db = new BrainDatabase(dir);
		db.migrate();
	});

	afterEach(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it("records and retrieves demand signals", () => {
		const signal = db.recordDemand("how to deploy", "agent-1", 3);
		assert.ok(signal.id);
		assert.equal(signal.query, "how to deploy");

		const all = db.getDemandSignals();
		assert.equal(all.length, 1);
		assert.equal(all[0].query, "how to deploy");
	});

	it("filters by since timestamp", () => {
		const before = Date.now() - 1000;
		db.recordDemand("old query");
		const after = Date.now() + 1;

		const results = db.getDemandSignals(after);
		assert.equal(results.length, 0);

		const all = db.getDemandSignals(before);
		assert.equal(all.length, 1);
	});
});

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

describe("BrainDatabase — persistence", () => {
	let dir: string;

	beforeEach(() => {
		dir = makeTmpDir();
	});

	afterEach(() => {
		rmSync(dir, { recursive: true, force: true });
	});

	it("persists data across close/reopen", () => {
		const db1 = new BrainDatabase(dir);
		db1.migrate();
		db1.insertEntry(makeEntry({ title: "Persistent Entry" }));
		db1.close();

		const db2 = new BrainDatabase(dir);
		// No need to migrate again — schema already exists
		const results = db2.search("persistent");
		assert.equal(results.length, 1);
		assert.equal(results[0].title, "Persistent Entry");
		db2.close();
	});
});

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

describe("BrainDatabase — stats", () => {
	let dir: string;
	let db: BrainDatabase;

	beforeEach(() => {
		dir = makeTmpDir();
		db = new BrainDatabase(dir);
		db.migrate();
	});

	afterEach(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	it("returns correct counts", () => {
		const a = db.insertEntry(makeEntry({ title: "A" }));
		const b = db.insertEntry(makeEntry({ title: "B" }));
		db.addLink(a.id, b.id, "supports");
		db.recordDemand("test query");

		const stats = db.getStats();
		assert.equal(stats.entries, 2);
		assert.equal(stats.links, 1);
		assert.equal(stats.demands, 1);
		assert.equal(stats.version, 1);
	});

	it("getEntriesByCategory returns grouped counts", () => {
		db.insertEntry(makeEntry({ title: "D1", category: "decision" }));
		db.insertEntry(makeEntry({ title: "D2", category: "decision" }));
		db.insertEntry(makeEntry({ title: "O1", category: "outcome" }));

		const cats = db.getEntriesByCategory();
		assert.equal(cats.length, 2);
		assert.equal(cats[0].category, "decision");
		assert.equal(cats[0].count, 2);
	});
});
