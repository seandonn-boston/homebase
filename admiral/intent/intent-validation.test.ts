import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { IntentValidator } from "./intent-validation";
import { IntentCapture, type Intent, type IntentInput } from "./intent-schema";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInput(overrides?: Partial<IntentInput>): IntentInput {
	return {
		goal: "Migrate database schema to v3",
		priority: "high",
		constraints: ["no downtime"],
		failureModes: ["data loss"],
		judgmentBoundaries: [
			{
				description: "Rollback needed",
				threshold: "> 5% error rate",
				escalateTo: "admiral",
			},
		],
		values: ["safety", "correctness"],
		createdBy: "operator",
		authorityTier: "propose",
		metadata: {},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// IntentValidator tests
// ---------------------------------------------------------------------------

describe("IntentValidator", () => {
	let validator: IntentValidator;
	let capture: IntentCapture;

	beforeEach(() => {
		validator = new IntentValidator();
		capture = new IntentCapture();
	});

	// -- Completeness --

	it("reports 100% completeness for well-formed intent", () => {
		const intent = capture.create(makeInput());
		const result = validator.checkCompleteness(intent);
		assert.equal(result.score, 100);
		assert.equal(result.missing.length, 0);
	});

	it("reports missing fields correctly", () => {
		const intent = capture.create(
			makeInput({ constraints: [], values: [] }),
		);
		const result = validator.checkCompleteness(intent);
		assert.ok(result.missing.includes("constraints"));
		assert.ok(result.missing.includes("values"));
		assert.ok(result.score < 100);
	});

	it("reports empty goal as missing", () => {
		const intent = capture.create(makeInput({ goal: "" }));
		const result = validator.checkCompleteness(intent);
		assert.ok(result.missing.includes("goal"));
	});

	// -- Ambiguity --

	it("flags vague terms in the goal", () => {
		const intent = capture.create(
			makeInput({ goal: "Improve performance and make it faster" }),
		);
		const result = validator.checkAmbiguity(intent);
		assert.ok(result.found.length >= 2);
		assert.ok(result.suggestions.length >= 2);
	});

	it("reports no ambiguity for precise intent", () => {
		const intent = capture.create(
			makeInput({
				goal: "Add index on users.email column",
			}),
		);
		const result = validator.checkAmbiguity(intent);
		assert.equal(result.found.length, 0);
	});

	it("detects ambiguity in constraints", () => {
		const intent = capture.create(
			makeInput({ constraints: ["make it better"] }),
		);
		const result = validator.checkAmbiguity(intent);
		assert.ok(result.found.length > 0);
	});

	// -- Consistency --

	it("detects contradictory constraints", () => {
		const intent = capture.create(
			makeInput({
				constraints: ["maximize throughput", "minimize throughput"],
			}),
		);
		const result = validator.checkConsistency(intent);
		assert.ok(result.contradictions.length > 0);
	});

	it("flags low priority with escalate authority", () => {
		const intent = capture.create(
			makeInput({ priority: "low", authorityTier: "escalate" }),
		);
		const result = validator.checkConsistency(intent);
		assert.ok(
			result.contradictions.some((c) => c.includes("Low-priority")),
		);
	});

	it("reports no contradictions for consistent intent", () => {
		const intent = capture.create(makeInput());
		const result = validator.checkConsistency(intent);
		assert.equal(result.contradictions.length, 0);
	});

	// -- Achievability --

	it("reports feasible for well-formed intent", () => {
		const intent = capture.create(makeInput());
		const result = validator.checkAchievability(intent);
		assert.equal(result.feasible, true);
	});

	it("reports infeasible when no agents available", () => {
		const intent = capture.create(makeInput());
		const result = validator.checkAchievability(intent, []);
		assert.equal(result.feasible, false);
		assert.ok(result.reasons.some((r) => r.includes("No agents")));
	});

	// -- Scope --

	it("estimates simple scope for minimal intent", () => {
		const intent = capture.create(
			makeInput({
				constraints: ["one"],
				failureModes: [],
				judgmentBoundaries: [],
			}),
		);
		const result = validator.estimateScope(intent);
		assert.equal(result.complexity, "simple");
		assert.equal(result.agentCount, 1);
	});

	it("estimates complex scope for heavy intent", () => {
		const intent = capture.create(
			makeInput({
				constraints: ["a", "b", "c", "d"],
				failureModes: ["e", "f", "g"],
				judgmentBoundaries: [
					{
						description: "x",
						threshold: "y",
						escalateTo: "z",
					},
					{
						description: "x2",
						threshold: "y2",
						escalateTo: "z2",
					},
				],
			}),
		);
		const result = validator.estimateScope(intent);
		assert.equal(result.complexity, "complex");
		assert.ok(result.agentCount >= 3);
	});

	// -- Full validate --

	it("returns pass for a well-formed intent", () => {
		const intent = capture.create(makeInput());
		const result = validator.validate(intent);
		assert.equal(result.status, "pass");
	});

	it("returns fail for a severely incomplete intent", () => {
		const intent = capture.create(
			makeInput({
				goal: "",
				constraints: [],
				failureModes: [],
				judgmentBoundaries: [],
				values: [],
				createdBy: "",
			}),
		);
		const result = validator.validate(intent);
		assert.equal(result.status, "fail");
	});

	it("returns warn when ambiguity is present", () => {
		const intent = capture.create(
			makeInput({ goal: "Improve the system" }),
		);
		const result = validator.validate(intent);
		assert.equal(result.status, "warn");
	});
});
