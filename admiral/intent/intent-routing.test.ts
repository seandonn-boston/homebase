import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { IntentDecomposer } from "./intent-decomposition";
import { IntentRouter } from "./intent-routing";
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
// IntentRouter tests
// ---------------------------------------------------------------------------

describe("IntentRouter", () => {
	let router: IntentRouter;
	let decomposer: IntentDecomposer;
	let capture: IntentCapture;

	beforeEach(() => {
		router = new IntentRouter();
		decomposer = new IntentDecomposer();
		capture = new IntentCapture();
	});

	it("creates a routing plan from decomposition", () => {
		const intent = capture.create(makeInput());
		const decomp = decomposer.decompose(intent);
		const plan = router.createRoutingPlan(decomp);
		assert.equal(plan.intentId, intent.id);
		assert.ok(plan.assignments.length > 0);
	});

	it("assigns model tier based on authority level", () => {
		const intent = capture.create(makeInput());
		const decomp = decomposer.decompose(intent, {
			aspects: ["delete production data"],
		});
		const plan = router.createRoutingPlan(decomp);
		assert.equal(plan.assignments[0].modelTier, "premium");
	});

	it("assigns standard tier for autonomous authority", () => {
		const intent = capture.create(makeInput());
		const decomp = decomposer.decompose(intent, {
			aspects: ["read a file"],
		});
		const plan = router.createRoutingPlan(decomp);
		assert.equal(plan.assignments[0].modelTier, "standard");
	});

	it("includes rationale in each assignment", () => {
		const intent = capture.create(makeInput());
		const decomp = decomposer.decompose(intent);
		const plan = router.createRoutingPlan(decomp);
		for (const assignment of plan.assignments) {
			assert.ok(assignment.rationale.length > 0);
		}
	});

	it("populates fallback routing from agent categories", () => {
		const intent = capture.create(makeInput());
		const decomp = decomposer.decompose(intent);
		const plan = router.createRoutingPlan(decomp);
		assert.ok(plan.fallbackRouting.length > 0);
	});

	it("selects parallel coordination when no dependencies", () => {
		const intent = capture.create(makeInput());
		const decomp = decomposer.decompose(intent, {
			aspects: ["a", "b", "c"],
		});
		for (const sub of decomp.subIntents) {
			sub.dependencies = [];
		}
		const pattern = router.selectCoordinationPattern(decomp.subIntents);
		assert.equal(pattern, "parallel");
	});

	it("selects pipeline coordination for strict chain", () => {
		const intent = capture.create(makeInput());
		const decomp = decomposer.decompose(intent, {
			aspects: ["a", "b", "c"],
		});
		// Default decomposition creates a chain
		const pattern = router.selectCoordinationPattern(decomp.subIntents);
		assert.equal(pattern, "pipeline");
	});

	it("selects sequential for single sub-intent", () => {
		const intent = capture.create(makeInput());
		const decomp = decomposer.decompose(intent, { aspects: ["only one"] });
		const pattern = router.selectCoordinationPattern(decomp.subIntents);
		assert.equal(pattern, "sequential");
	});
});
