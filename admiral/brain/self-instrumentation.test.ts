import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { BrainDatabase } from "./schema";
import type { InsertEntry } from "./schema";
import {
	BrainMetaNamespace,
	BrainStaleDetector,
	ContradictionResolver,
	DecisionEntryValidator,
} from "./self-instrumentation";
import type { DecisionEntry } from "./self-instrumentation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
	return mkdtempSync(join(tmpdir(), "brain-instr-"));
}

function makeEntry(overrides?: Partial<InsertEntry>): InsertEntry {
	return {
		title: overrides?.title ?? "Test Entry",
		content: overrides?.content ?? "Some content here.",
		category: overrides?.category ?? "decision",
		scope: overrides?.scope ?? "helm",
		tags: overrides?.tags ?? [],
		metadata: overrides?.metadata ?? {},
	};
}

// ---------------------------------------------------------------------------
// B-21b: Stale Detection
// ---------------------------------------------------------------------------

describe("BrainStaleDetector", () => {
	it("starts fresh (not stale)", () => {
		const detector = new BrainStaleDetector();
		assert.equal(detector.isStale(), false);
		assert.equal(detector.getAdvisory(), null);
	});

	it("becomes stale after threshold tool calls", () => {
		const detector = new BrainStaleDetector();
		for (let i = 0; i < 20; i++) {
			detector.recordToolCall(false);
		}
		assert.equal(detector.isStale(), true);
		assert.ok(detector.getAdvisory()?.includes("BRAIN STALE"));
	});

	it("resets on brain query", () => {
		const detector = new BrainStaleDetector();
		for (let i = 0; i < 25; i++) {
			detector.recordToolCall(false);
		}
		assert.equal(detector.isStale(), true);

		detector.recordToolCall(true);
		assert.equal(detector.isStale(), false);
		assert.equal(detector.getAdvisory(), null);
	});

	it("respects custom threshold", () => {
		const detector = new BrainStaleDetector();
		for (let i = 0; i < 5; i++) {
			detector.recordToolCall(false);
		}
		assert.equal(detector.isStale(5), true);
		assert.equal(detector.isStale(10), false);
	});

	it("tracks tool calls since last query", () => {
		const detector = new BrainStaleDetector();
		detector.recordToolCall(false);
		detector.recordToolCall(false);
		assert.equal(detector.getToolCallsSinceQuery(), 2);
	});

	it("reset clears state", () => {
		const detector = new BrainStaleDetector();
		for (let i = 0; i < 30; i++) {
			detector.recordToolCall(false);
		}
		detector.reset();
		assert.equal(detector.isStale(), false);
		assert.equal(detector.getToolCallsSinceQuery(), 0);
	});
});

// ---------------------------------------------------------------------------
// B-21c: Meta Namespace
// ---------------------------------------------------------------------------

describe("BrainMetaNamespace", () => {
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

	it("captures a snapshot with correct counts", () => {
		db.insertEntry(makeEntry({ title: "A", category: "decision" }));
		db.insertEntry(makeEntry({ title: "B", category: "outcome" }));

		const meta = new BrainMetaNamespace(db);
		const snap = meta.captureSnapshot();

		assert.equal(snap.entryCount, 2);
		assert.equal(snap.linkCount, 0);
		assert.ok(snap.timestamp > 0);
		assert.ok(snap.healthScore >= 0);
		assert.ok(snap.healthScore <= 100);
	});

	it("tracks snapshots over time", () => {
		const meta = new BrainMetaNamespace(db);
		meta.captureSnapshot();
		db.insertEntry(makeEntry({ title: "New" }));
		meta.captureSnapshot();

		const snaps = meta.getSnapshots();
		assert.equal(snaps.length, 2);
		assert.ok(snaps[1].entryCount >= snaps[0].entryCount);
	});

	it("limits snapshot retrieval", () => {
		const meta = new BrainMetaNamespace(db);
		meta.captureSnapshot();
		meta.captureSnapshot();
		meta.captureSnapshot();

		const snaps = meta.getSnapshots(2);
		assert.equal(snaps.length, 2);
	});

	it("detects knowledge gaps from zero-result demands", () => {
		db.recordDemand("unknown topic", "agent-1", 0);
		db.recordDemand("known topic", "agent-1", 5);

		const meta = new BrainMetaNamespace(db);
		const snap = meta.captureSnapshot();

		assert.ok(snap.gaps.includes("unknown topic"));
	});

	it("graduation assessment fails with empty database", () => {
		const meta = new BrainMetaNamespace(db);
		const assessment = meta.getGraduationAssessment();

		assert.equal(assessment.ready, false);
		assert.ok(assessment.criteria.length >= 3);
	});

	it("graduation assessment passes with sufficient data", () => {
		// Insert 50 entries, 20 links across 3 categories
		const ids: string[] = [];
		for (let i = 0; i < 50; i++) {
			const cat = i < 20 ? "decision" : i < 35 ? "outcome" : "lesson";
			const e = db.insertEntry(
				makeEntry({ title: `Entry ${i}`, category: cat }),
			);
			ids.push(e.id);
		}
		for (let i = 0; i < 20; i++) {
			db.addLink(ids[i], ids[i + 1], "supports");
		}

		const meta = new BrainMetaNamespace(db);
		const assessment = meta.getGraduationAssessment();

		assert.equal(assessment.ready, true);
		assert.ok(assessment.criteria.every((c) => c.passed));
	});

	it("includes top categories in snapshot", () => {
		for (let i = 0; i < 5; i++) {
			db.insertEntry(
				makeEntry({ title: `D${i}`, category: "decision" }),
			);
		}
		db.insertEntry(makeEntry({ title: "O1", category: "outcome" }));

		const meta = new BrainMetaNamespace(db);
		const snap = meta.captureSnapshot();

		assert.equal(snap.topCategories[0].category, "decision");
		assert.equal(snap.topCategories[0].count, 5);
	});
});

// ---------------------------------------------------------------------------
// B-21d: Contradiction Resolution
// ---------------------------------------------------------------------------

describe("ContradictionResolver", () => {
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

	it("detects contradictions from links", () => {
		const a = db.insertEntry(makeEntry({ title: "Approach A" }));
		const b = db.insertEntry(makeEntry({ title: "Approach B" }));
		db.addLink(a.id, b.id, "contradicts");

		const resolver = new ContradictionResolver(db);
		const contradictions = resolver.detectContradictions();

		assert.equal(contradictions.length, 1);
		assert.equal(contradictions[0].entryA, a.id);
		assert.equal(contradictions[0].entryB, b.id);
	});

	it("resolves contradiction via supersede", () => {
		const a = db.insertEntry(makeEntry({ title: "New approach" }));
		const b = db.insertEntry(makeEntry({ title: "Old approach" }));
		db.addLink(a.id, b.id, "contradicts");

		const resolver = new ContradictionResolver(db);
		const resolution = resolver.resolve(
			a.id,
			b.id,
			"supersede",
			"human",
			"New approach is better",
		);

		assert.equal(resolution.action, "supersede");
		const updated = db.getEntry(b.id);
		assert.equal(updated?.superseded_by, a.id);
	});

	it("resolves contradiction via withdraw", () => {
		const a = db.insertEntry(makeEntry({ title: "Keep this" }));
		const b = db.insertEntry(makeEntry({ title: "Remove this" }));
		db.addLink(a.id, b.id, "contradicts");

		const resolver = new ContradictionResolver(db);
		resolver.resolve(a.id, b.id, "withdraw", "human", "B was wrong");

		assert.equal(db.getEntry(b.id), undefined);
	});

	it("resolves contradiction via diverge", () => {
		const a = db.insertEntry(makeEntry({ title: "Context A" }));
		const b = db.insertEntry(makeEntry({ title: "Context B" }));
		db.addLink(a.id, b.id, "contradicts");

		const resolver = new ContradictionResolver(db);
		resolver.resolve(
			a.id,
			b.id,
			"diverge",
			"human",
			"Different contexts",
		);

		// Both should still exist
		assert.ok(db.getEntry(a.id));
		assert.ok(db.getEntry(b.id));
	});

	it("getPending excludes resolved contradictions", () => {
		const a = db.insertEntry(makeEntry({ title: "P1" }));
		const b = db.insertEntry(makeEntry({ title: "P2" }));
		db.addLink(a.id, b.id, "contradicts");

		const resolver = new ContradictionResolver(db);
		assert.equal(resolver.getPending().length, 1);

		resolver.resolve(a.id, b.id, "diverge", "human", "OK");
		assert.equal(resolver.getPending().length, 0);
	});

	it("getResolutions returns all resolutions", () => {
		const a = db.insertEntry(makeEntry({ title: "R1" }));
		const b = db.insertEntry(makeEntry({ title: "R2" }));
		db.addLink(a.id, b.id, "contradicts");

		const resolver = new ContradictionResolver(db);
		resolver.resolve(a.id, b.id, "diverge", "human", "Reason");

		const resolutions = resolver.getResolutions();
		assert.equal(resolutions.length, 1);
		assert.equal(resolutions[0].rationale, "Reason");
	});

	it("returns overlap keywords", () => {
		const a = db.insertEntry(
			makeEntry({
				title: "Deployment strategy alpha",
				content: "Deploy using kubernetes",
			}),
		);
		const b = db.insertEntry(
			makeEntry({
				title: "Deployment approach beta",
				content: "Deploy using docker only",
			}),
		);
		db.addLink(a.id, b.id, "contradicts");

		const resolver = new ContradictionResolver(db);
		const contradictions = resolver.detectContradictions();

		assert.ok(contradictions[0].overlap.length > 0);
		assert.ok(contradictions[0].overlap.includes("deploy"));
	});
});

// ---------------------------------------------------------------------------
// B-21e: Decision Entry Validation
// ---------------------------------------------------------------------------

describe("DecisionEntryValidator", () => {
	const validator = new DecisionEntryValidator();

	function validDecision(): DecisionEntry {
		return {
			decision: "Use SQLite for brain storage",
			alternatives: ["JSON files", "PostgreSQL"],
			reasoning: "SQLite is embedded and fast",
			authorityTier: "autonomous",
			agent: "implementer",
			timestamp: Date.now(),
		};
	}

	it("validates a correct decision entry", () => {
		const result = validator.validate(validDecision());
		assert.equal(result.valid, true);
		assert.equal(result.errors.length, 0);
	});

	it("rejects null input", () => {
		const result = validator.validate(null);
		assert.equal(result.valid, false);
	});

	it("rejects missing decision field", () => {
		const d = { ...validDecision(), decision: "" };
		const result = validator.validate(d);
		assert.equal(result.valid, false);
		assert.ok(result.errors.some((e) => e.includes("decision")));
	});

	it("rejects missing alternatives", () => {
		const d = { ...validDecision(), alternatives: "not-array" };
		const result = validator.validate(d);
		assert.equal(result.valid, false);
		assert.ok(result.errors.some((e) => e.includes("alternatives")));
	});

	it("rejects invalid authorityTier", () => {
		const d = { ...validDecision(), authorityTier: "invalid" };
		const result = validator.validate(d);
		assert.equal(result.valid, false);
		assert.ok(result.errors.some((e) => e.includes("authorityTier")));
	});

	it("rejects invalid outcome", () => {
		const d = { ...validDecision(), outcome: "unknown" };
		const result = validator.validate(d);
		assert.equal(result.valid, false);
		assert.ok(result.errors.some((e) => e.includes("outcome")));
	});

	it("accepts valid outcome", () => {
		const d = { ...validDecision(), outcome: "success" };
		const result = validator.validate(d);
		assert.equal(result.valid, true);
	});

	it("rejects negative timestamp", () => {
		const d = { ...validDecision(), timestamp: -1 };
		const result = validator.validate(d);
		assert.equal(result.valid, false);
	});

	it("converts to BrainEntry format", () => {
		const entry = validator.toEntry(validDecision());
		assert.ok(entry.title.startsWith("Decision:"));
		assert.equal(entry.category, "decision");
		assert.ok(entry.tags.includes("decision"));
		assert.ok(entry.tags.includes("autonomous"));
		assert.ok(entry.content.includes("SQLite"));
	});

	it("includes outcome in content when present", () => {
		const d = { ...validDecision(), outcome: "success" as const };
		const entry = validator.toEntry(d);
		assert.ok(entry.content.includes("Outcome: success"));
	});

	it("omits outcome line when not present", () => {
		const d = validDecision();
		delete d.outcome;
		const entry = validator.toEntry(d);
		assert.ok(!entry.content.includes("Outcome:"));
	});
});
