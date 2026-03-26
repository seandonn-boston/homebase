import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
	type GovernanceEvent,
	GovernanceEventBus,
	InterventionLevel,
} from "./framework";
import { type GovernanceRule, GovernanceRuleEngine } from "./rule-engine";

describe("GovernanceRuleEngine", () => {
	let bus: GovernanceEventBus;
	let engine: GovernanceRuleEngine;
	const now = Date.now();

	beforeEach(() => {
		bus = new GovernanceEventBus(500);
		engine = new GovernanceRuleEngine(bus);
	});

	// -----------------------------------------------------------------------
	// Rule management
	// -----------------------------------------------------------------------

	describe("addRule / removeRule", () => {
		it("adds and retrieves a rule", () => {
			const rule = makeThresholdRule("r1", "cpu", ">", 80);
			engine.addRule(rule);
			assert.equal(engine.getRules().length, 1);
			assert.equal(engine.getRule("r1")!.id, "r1");
		});

		it("removes a rule", () => {
			engine.addRule(makeThresholdRule("r1", "cpu", ">", 80));
			engine.removeRule("r1");
			assert.equal(engine.getRules().length, 0);
			assert.equal(engine.getRule("r1"), undefined);
		});
	});

	describe("enableRule / disableRule", () => {
		it("disables a rule so it is skipped during evaluation", () => {
			engine.addRule(makeThresholdRule("r1", "cpu", ">", 80));
			engine.disableRule("r1");

			const results = engine.evaluate([], { cpu: 99 });
			assert.equal(results.length, 0);
		});

		it("re-enables a disabled rule", () => {
			engine.addRule(makeThresholdRule("r1", "cpu", ">", 80));
			engine.disableRule("r1");
			engine.enableRule("r1");

			const results = engine.evaluate([], { cpu: 99 });
			assert.equal(results.length, 1);
			assert.equal(results[0].triggered, true);
		});
	});

	// -----------------------------------------------------------------------
	// Threshold evaluation
	// -----------------------------------------------------------------------

	describe("threshold rules", () => {
		it("triggers when metric exceeds threshold", () => {
			engine.addRule(makeThresholdRule("r1", "error_rate", ">", 50));
			const results = engine.evaluate([], { error_rate: 75 });
			assert.equal(results[0].triggered, true);
			assert.ok(results[0].action);
		});

		it("does not trigger when metric is below threshold", () => {
			engine.addRule(makeThresholdRule("r1", "error_rate", ">", 50));
			const results = engine.evaluate([], { error_rate: 25 });
			assert.equal(results[0].triggered, false);
			assert.equal(results[0].action, undefined);
		});

		it("handles >= operator", () => {
			engine.addRule(makeThresholdRule("r1", "count", ">=", 10));
			const eq = engine.evaluate([], { count: 10 });
			assert.equal(eq[0].triggered, true);
			const below = engine.evaluate([], { count: 9 });
			assert.equal(below[0].triggered, false);
		});

		it("handles < operator", () => {
			engine.addRule(makeThresholdRule("r1", "health", "<", 50));
			const results = engine.evaluate([], { health: 30 });
			assert.equal(results[0].triggered, true);
		});

		it("handles == operator", () => {
			engine.addRule(makeThresholdRule("r1", "status", "==", 0));
			const results = engine.evaluate([], { status: 0 });
			assert.equal(results[0].triggered, true);
		});

		it("does not trigger when metric is missing", () => {
			engine.addRule(makeThresholdRule("r1", "missing_metric", ">", 50));
			const results = engine.evaluate([], {});
			assert.equal(results[0].triggered, false);
		});
	});

	// -----------------------------------------------------------------------
	// Pattern evaluation
	// -----------------------------------------------------------------------

	describe("pattern rules", () => {
		it("triggers when event count meets threshold in window", () => {
			const rule: GovernanceRule = {
				id: "p1",
				name: "Failure burst",
				description: "Multiple failures in short window",
				enabled: true,
				conditionType: "pattern",
				condition: {
					eventTypes: ["agent_failure"],
					minOccurrences: 3,
					windowMs: 60_000,
				},
				action: {
					level: InterventionLevel.Restrict,
					message: "Too many failures",
				},
				version: 1,
				lastModified: now,
			};
			engine.addRule(rule);

			const events: GovernanceEvent[] = Array.from({ length: 4 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - 10_000 + i * 1000,
				type: "agent_failure" as const,
				severity: "high" as const,
				data: {},
			}));

			const results = engine.evaluate(events);
			assert.equal(results[0].triggered, true);
		});

		it("does not trigger when below occurrence count", () => {
			const rule: GovernanceRule = {
				id: "p1",
				name: "Failure burst",
				description: "",
				enabled: true,
				conditionType: "pattern",
				condition: {
					eventTypes: ["agent_failure"],
					minOccurrences: 5,
					windowMs: 60_000,
				},
				action: { level: InterventionLevel.Warn, message: "failures" },
				version: 1,
				lastModified: now,
			};
			engine.addRule(rule);

			const events: GovernanceEvent[] = Array.from({ length: 2 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - 5000 + i * 1000,
				type: "agent_failure" as const,
				severity: "high" as const,
				data: {},
			}));

			const results = engine.evaluate(events);
			assert.equal(results[0].triggered, false);
		});
	});

	// -----------------------------------------------------------------------
	// Temporal evaluation
	// -----------------------------------------------------------------------

	describe("temporal rules", () => {
		it("triggers on metric increase above threshold", () => {
			const rule: GovernanceRule = {
				id: "t1",
				name: "Cost spike",
				description: "Cost increased >50%",
				enabled: true,
				conditionType: "temporal",
				condition: {
					metric: "cost",
					changePercent: 50,
					windowMs: 300_000,
					direction: "increase",
				},
				action: { level: InterventionLevel.Warn, message: "Cost spike" },
				version: 1,
				lastModified: now,
			};
			engine.addRule(rule);

			const results = engine.evaluate([], { cost: 180, cost_baseline: 100 });
			assert.equal(results[0].triggered, true);
		});

		it("does not trigger when change is below threshold", () => {
			const rule: GovernanceRule = {
				id: "t1",
				name: "Cost spike",
				description: "",
				enabled: true,
				conditionType: "temporal",
				condition: {
					metric: "cost",
					changePercent: 50,
					windowMs: 300_000,
					direction: "increase",
				},
				action: { level: InterventionLevel.Warn, message: "Cost spike" },
				version: 1,
				lastModified: now,
			};
			engine.addRule(rule);

			const results = engine.evaluate([], { cost: 120, cost_baseline: 100 });
			assert.equal(results[0].triggered, false);
		});

		it("detects decrease direction", () => {
			const rule: GovernanceRule = {
				id: "t2",
				name: "Health drop",
				description: "",
				enabled: true,
				conditionType: "temporal",
				condition: {
					metric: "health",
					changePercent: 30,
					windowMs: 60_000,
					direction: "decrease",
				},
				action: {
					level: InterventionLevel.Restrict,
					message: "Health dropping",
				},
				version: 1,
				lastModified: now,
			};
			engine.addRule(rule);

			const results = engine.evaluate([], { health: 50, health_baseline: 100 });
			assert.equal(results[0].triggered, true);
		});
	});

	// -----------------------------------------------------------------------
	// Composite evaluation
	// -----------------------------------------------------------------------

	describe("composite rules", () => {
		it("AND: triggers only when all sub-conditions met", () => {
			const rule: GovernanceRule = {
				id: "comp1",
				name: "Combined alert",
				description: "",
				enabled: true,
				conditionType: "composite",
				condition: {
					operator: "AND",
					conditions: [
						{ metric: "cpu", operator: ">", value: 80 },
						{ metric: "memory", operator: ">", value: 90 },
					],
				},
				action: {
					level: InterventionLevel.Suspend,
					message: "Resource overload",
				},
				version: 1,
				lastModified: now,
			};
			engine.addRule(rule);

			const both = engine.evaluate([], { cpu: 95, memory: 95 });
			assert.equal(both[0].triggered, true);

			const oneOnly = engine.evaluate([], { cpu: 95, memory: 50 });
			assert.equal(oneOnly[0].triggered, false);
		});

		it("OR: triggers when any sub-condition met", () => {
			const rule: GovernanceRule = {
				id: "comp2",
				name: "Any anomaly",
				description: "",
				enabled: true,
				conditionType: "composite",
				condition: {
					operator: "OR",
					conditions: [
						{ metric: "cpu", operator: ">", value: 90 },
						{ metric: "disk", operator: ">", value: 95 },
					],
				},
				action: { level: InterventionLevel.Warn, message: "Resource warning" },
				version: 1,
				lastModified: now,
			};
			engine.addRule(rule);

			const one = engine.evaluate([], { cpu: 95, disk: 50 });
			assert.equal(one[0].triggered, true);

			const none = engine.evaluate([], { cpu: 50, disk: 50 });
			assert.equal(none[0].triggered, false);
		});
	});

	// -----------------------------------------------------------------------
	// Export / Import
	// -----------------------------------------------------------------------

	describe("exportRules / importRules", () => {
		it("round-trips rules through JSON", () => {
			engine.addRule(makeThresholdRule("r1", "cpu", ">", 80));
			engine.addRule(makeThresholdRule("r2", "mem", ">=", 90));

			const json = engine.exportRules();
			const engine2 = new GovernanceRuleEngine(bus);
			engine2.importRules(json);

			assert.equal(engine2.getRules().length, 2);
			assert.equal(engine2.getRule("r1")!.name, "Threshold: cpu > 80");
			assert.equal(engine2.getRule("r2")!.name, "Threshold: mem >= 90");
		});

		it("exported JSON is valid", () => {
			engine.addRule(makeThresholdRule("r1", "x", ">", 1));
			const json = engine.exportRules();
			assert.doesNotThrow(() => JSON.parse(json));
		});
	});

	// -----------------------------------------------------------------------
	// Bus emission on trigger
	// -----------------------------------------------------------------------

	describe("bus integration", () => {
		it("emits compliance_finding event when rule triggers", () => {
			const received: GovernanceEvent[] = [];
			bus.subscribe({ types: ["compliance_finding"] }, (e) => received.push(e));

			engine.addRule(makeThresholdRule("r1", "errors", ">", 10));
			engine.evaluate([], { errors: 50 });

			assert.equal(received.length, 1);
			assert.equal((received[0].data as any).ruleId, "r1");
		});

		it("does not emit when rule does not trigger", () => {
			const received: GovernanceEvent[] = [];
			bus.subscribe({ types: ["compliance_finding"] }, (e) => received.push(e));

			engine.addRule(makeThresholdRule("r1", "errors", ">", 10));
			engine.evaluate([], { errors: 5 });

			assert.equal(received.length, 0);
		});
	});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeThresholdRule(
	id: string,
	metric: string,
	operator: ">" | ">=" | "<" | "<=" | "==",
	value: number,
): GovernanceRule {
	return {
		id,
		name: `Threshold: ${metric} ${operator} ${value}`,
		description: `Alert when ${metric} ${operator} ${value}`,
		enabled: true,
		conditionType: "threshold",
		condition: { metric, operator, value },
		action: { level: InterventionLevel.Warn, message: `${metric} exceeded` },
		version: 1,
		lastModified: Date.now(),
	};
}
