import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { IntentCapture, type Intent, type IntentInput } from "./intent-schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides?: Partial<IntentInput>): IntentInput {
	return {
		goal: "Refactor the auth module",
		priority: "high",
		constraints: ["no breaking API changes"],
		failureModes: ["regression in login flow"],
		judgmentBoundaries: [
			{
				description: "Complexity spike",
				threshold: "> 500 lines changed",
				escalateTo: "admiral",
			},
		],
		values: ["safety"],
		createdBy: "operator",
		authorityTier: "autonomous",
		metadata: {},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// IntentCapture tests
// ---------------------------------------------------------------------------

describe("IntentCapture", () => {
	let capture: IntentCapture;

	beforeEach(() => {
		capture = new IntentCapture();
	});

	it("creates an intent with generated id and draft status", () => {
		const intent = capture.create(makeInput());
		assert.ok(intent.id);
		assert.equal(intent.status, "draft");
		assert.equal(typeof intent.createdAt, "number");
	});

	it("assigns a unique id to each intent", () => {
		const a = capture.create(makeInput());
		const b = capture.create(makeInput());
		assert.notEqual(a.id, b.id);
	});

	it("retrieves an intent by id", () => {
		const created = capture.create(makeInput());
		const fetched = capture.get(created.id);
		assert.deepStrictEqual(fetched, created);
	});

	it("returns undefined for unknown id", () => {
		assert.equal(capture.get("nonexistent"), undefined);
	});

	it("updates an existing intent", () => {
		const created = capture.create(makeInput());
		const updated = capture.update(created.id, { status: "active" });
		assert.equal(updated.status, "active");
		assert.equal(updated.id, created.id);
	});

	it("throws on update of unknown id", () => {
		assert.throws(() => capture.update("bad-id", { status: "active" }), {
			message: /not found/i,
		});
	});

	it("returns only active intents from getActive()", () => {
		const a = capture.create(makeInput());
		capture.create(makeInput());
		capture.update(a.id, { status: "active" });
		const active = capture.getActive();
		assert.equal(active.length, 1);
		assert.equal(active[0].id, a.id);
	});

	it("returns all intents from getAll()", () => {
		capture.create(makeInput());
		capture.create(makeInput());
		capture.create(makeInput());
		assert.equal(capture.getAll().length, 3);
	});

	// -- Completeness assessment --

	it("reports full completeness for well-formed intent", () => {
		const intent = capture.create(makeInput());
		const result = capture.assessCompleteness(intent);
		assert.equal(result.complete, true);
		assert.equal(result.score, 100);
		assert.equal(result.warnings.length, 0);
	});

	it("reports missing goal", () => {
		const intent = capture.create(makeInput({ goal: "" }));
		const result = capture.assessCompleteness(intent);
		assert.equal(result.complete, false);
		assert.ok(result.warnings.some((w) => w.includes("goal")));
	});

	it("reports missing constraints", () => {
		const intent = capture.create(makeInput({ constraints: [] }));
		const result = capture.assessCompleteness(intent);
		assert.equal(result.complete, false);
		assert.ok(result.warnings.some((w) => w.includes("constraint")));
	});

	it("progressive score reflects number of filled fields", () => {
		const intent = capture.create(
			makeInput({
				constraints: [],
				failureModes: [],
				judgmentBoundaries: [],
				values: [],
			}),
		);
		const result = capture.assessCompleteness(intent);
		// Only goal and createdBy are filled → 2/6
		assert.equal(result.score, 33);
		assert.equal(result.warnings.length, 4);
	});
});
