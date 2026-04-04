import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { IntentDecomposer } from "./intent-decomposition";
import { IntentCapture, type IntentInput } from "./intent-schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides?: Partial<IntentInput>): IntentInput {
	return {
		goal: "Build auth module and write tests",
		priority: "high",
		constraints: ["no external deps"],
		failureModes: ["regression"],
		judgmentBoundaries: [
			{
				description: "complexity",
				threshold: "> 200 LOC",
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
// IntentDecomposer tests
// ---------------------------------------------------------------------------

describe("IntentDecomposer", () => {
	let decomposer: IntentDecomposer;
	let capture: IntentCapture;

	beforeEach(() => {
		decomposer = new IntentDecomposer();
		capture = new IntentCapture();
	});

	it("decomposes a multi-part goal into sub-intents", () => {
		const intent = capture.create(makeInput());
		const result = decomposer.decompose(intent);
		assert.ok(result.subIntents.length >= 2);
		assert.equal(result.parentIntent, intent.id);
	});

	it("inherits parent constraints to all sub-intents", () => {
		const intent = capture.create(makeInput());
		const result = decomposer.decompose(intent);
		for (const sub of result.subIntents) {
			assert.ok(sub.constraints.includes("no external deps"));
		}
	});

	it("uses provided hints for aspects", () => {
		const intent = capture.create(makeInput({ goal: "Do everything" }));
		const result = decomposer.decompose(intent, {
			aspects: ["setup", "implement", "verify"],
		});
		assert.equal(result.subIntents.length, 3);
		assert.equal(result.subIntents[0].description, "setup");
	});

	it("assigns escalate authority for high-risk descriptions", () => {
		const intent = capture.create(makeInput());
		const result = decomposer.decompose(intent, {
			aspects: ["delete production data"],
		});
		assert.equal(result.subIntents[0].authorityTier, "escalate");
	});

	it("assigns propose authority for medium-risk descriptions", () => {
		const intent = capture.create(makeInput());
		const result = decomposer.decompose(intent, {
			aspects: ["modify configuration"],
		});
		assert.equal(result.subIntents[0].authorityTier, "propose");
	});

	it("builds dependency graph between sequential sub-intents", () => {
		const intent = capture.create(makeInput());
		const result = decomposer.decompose(intent, {
			aspects: ["a", "b", "c"],
		});
		assert.equal(result.dependencyGraph.length, 2);
	});

	it("validates a well-formed decomposition with no errors", () => {
		const intent = capture.create(makeInput());
		const result = decomposer.decompose(intent);
		const errors = decomposer.validateDecomposition(result);
		assert.equal(errors.length, 0);
	});

	it("detects circular dependencies", () => {
		const intent = capture.create(makeInput());
		const result = decomposer.decompose(intent, {
			aspects: ["a", "b"],
		});
		// Inject cycle: a depends on b, b depends on a
		result.subIntents[0].dependencies.push(result.subIntents[1].id);
		const errors = decomposer.validateDecomposition(result);
		assert.ok(errors.some((e) => e.includes("Circular")));
	});

	it("returns execution order as parallel groups", () => {
		const intent = capture.create(makeInput());
		const result = decomposer.decompose(intent, {
			aspects: ["a", "b", "c"],
		});
		const order = decomposer.getExecutionOrder(result.subIntents);
		// With sequential deps: 3 groups of 1 each
		assert.equal(order.length, 3);
		assert.equal(order[0].length, 1);
	});

	it("groups independent sub-intents in same batch", () => {
		const intent = capture.create(makeInput());
		const result = decomposer.decompose(intent, {
			aspects: ["a", "b", "c"],
		});
		// Remove all dependencies to make them independent
		for (const sub of result.subIntents) {
			sub.dependencies = [];
		}
		const order = decomposer.getExecutionOrder(result.subIntents);
		assert.equal(order.length, 1);
		assert.equal(order[0].length, 3);
	});
});
