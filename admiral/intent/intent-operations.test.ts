/**
 * Tests for Intent Operations (IE-04, IE-06, IE-07, IE-08, IE-09, IE-10)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { IntentCapture } from "./intent-schema.js";
import type { Intent } from "./intent-schema.js";
import {
	IntentDashboard,
	IntentHistoryTracker,
	IntentTemplateManager,
	IntentConflictDetector,
	InflectionPointDetector,
	JudgmentBoundaryEnforcer,
	INTENT_TEMPLATES,
} from "./intent-operations.js";

const now = Date.now();

function makeIntent(overrides: Partial<Intent> = {}): Intent {
	return {
		id: "i-1",
		goal: "Fix the broken login flow",
		priority: "high",
		constraints: ["Must not break existing tests"],
		failureModes: ["Fix introduces new bugs"],
		judgmentBoundaries: [],
		values: ["correctness"],
		status: "active",
		createdAt: now - 3600000,
		createdBy: "test-agent",
		authorityTier: "autonomous",
		metadata: {},
		...overrides,
	};
}

// =========================================================================
// IE-04: IntentDashboard
// =========================================================================

describe("IntentDashboard", () => {
	it("should return dashboard data with active intents", () => {
		const capture = new IntentCapture();
		const intent = capture.create({
			goal: "Test goal",
			priority: "high",
			constraints: [],
			failureModes: [],
			judgmentBoundaries: [],
			values: [],
			createdBy: "test",
			authorityTier: "autonomous",
			metadata: {},
		});
		capture.update(intent.id, { status: "active" });

		const dashboard = new IntentDashboard(capture);
		const data = dashboard.getData();
		assert.equal(data.activeIntents.length, 1);
		assert.ok(typeof data.completionRate === "number");
	});

	it("should calculate completion rate", () => {
		const capture = new IntentCapture();
		const i1 = capture.create({
			goal: "Goal 1",
			priority: "high",
			constraints: [],
			failureModes: [],
			judgmentBoundaries: [],
			values: [],
			createdBy: "test",
			authorityTier: "autonomous",
			metadata: {},
		});
		capture.update(i1.id, { status: "completed" });
		capture.create({
			goal: "Goal 2",
			priority: "high",
			constraints: [],
			failureModes: [],
			judgmentBoundaries: [],
			values: [],
			createdBy: "test",
			authorityTier: "autonomous",
			metadata: {},
		});

		const dashboard = new IntentDashboard(capture);
		const data = dashboard.getData();
		assert.equal(data.completionRate, 0.5);
	});

	it("should return 0 progress for unknown intent", () => {
		const capture = new IntentCapture();
		const dashboard = new IntentDashboard(capture);
		assert.equal(dashboard.getIntentProgress("nonexistent"), 0);
	});

	it("should return 100 progress for completed intent", () => {
		const capture = new IntentCapture();
		const intent = capture.create({
			goal: "Done",
			priority: "high",
			constraints: [],
			failureModes: [],
			judgmentBoundaries: [],
			values: [],
			createdBy: "test",
			authorityTier: "autonomous",
			metadata: {},
		});
		capture.update(intent.id, { status: "completed" });

		const dashboard = new IntentDashboard(capture);
		assert.equal(dashboard.getIntentProgress(intent.id), 100);
	});

	it("should detect failing health from violations", () => {
		const dashboard = new IntentDashboard(new IntentCapture());
		const intent = makeIntent({
			metadata: { violations: [{ constraint: "X", violation: "Y" }] },
		});
		assert.equal(dashboard.getHealthIndicator(intent), "failing");
	});

	it("should detect at-risk health from stale intent", () => {
		const dashboard = new IntentDashboard(new IntentCapture());
		const intent = makeIntent({
			createdAt: now - 48 * 3600000,
			metadata: {},
		});
		assert.equal(dashboard.getHealthIndicator(intent), "at_risk");
	});

	it("should detect healthy intent with recent progress", () => {
		const dashboard = new IntentDashboard(new IntentCapture());
		const intent = makeIntent({
			metadata: { lastProgressUpdate: now - 1000 },
		});
		assert.equal(dashboard.getHealthIndicator(intent), "healthy");
	});

	it("should report constraint violations from metadata", () => {
		const capture = new IntentCapture();
		const intent = capture.create({
			goal: "Test",
			priority: "high",
			constraints: [],
			failureModes: [],
			judgmentBoundaries: [],
			values: [],
			createdBy: "test",
			authorityTier: "autonomous",
			metadata: { violations: [{ constraint: "X", violation: "Y" }] },
		});
		capture.update(intent.id, { status: "active" });

		const dashboard = new IntentDashboard(capture);
		const data = dashboard.getData();
		assert.ok(data.constraintViolations.length > 0);
	});
});

// =========================================================================
// IE-06: IntentHistoryTracker
// =========================================================================

describe("IntentHistoryTracker", () => {
	it("should start tracking an intent", () => {
		const tracker = new IntentHistoryTracker();
		tracker.startTracking("i-1");
		const lifecycle = tracker.getLifecycle("i-1");
		assert.ok(lifecycle);
		assert.equal(lifecycle.events.length, 1);
		assert.equal(lifecycle.events[0].type, "started");
	});

	it("should record events", () => {
		const tracker = new IntentHistoryTracker();
		tracker.startTracking("i-1");
		tracker.recordEvent("i-1", "routed", "Routed to engineering");
		const lifecycle = tracker.getLifecycle("i-1");
		assert.ok(lifecycle);
		assert.equal(lifecycle.events.length, 2);
	});

	it("should throw when recording event for untracked intent", () => {
		const tracker = new IntentHistoryTracker();
		assert.throws(() => tracker.recordEvent("missing", "test", "details"));
	});

	it("should end tracking with outcome", () => {
		const tracker = new IntentHistoryTracker();
		tracker.startTracking("i-1");
		tracker.recordEvent("i-1", "progress", "50% done");
		const result = tracker.endTracking("i-1", "success");
		assert.equal(result.outcome, "success");
		assert.equal(result.routingEffectiveness, 100);
		assert.ok(result.duration >= 0);
	});

	it("should throw when ending untracked intent", () => {
		const tracker = new IntentHistoryTracker();
		assert.throws(() => tracker.endTracking("missing", "success"));
	});

	it("should return undefined for unknown lifecycle", () => {
		const tracker = new IntentHistoryTracker();
		assert.equal(tracker.getLifecycle("missing"), undefined);
	});

	it("should detect recurring patterns", () => {
		const tracker = new IntentHistoryTracker();
		tracker.startTracking("i-1");
		tracker.recordEvent("i-1", "retry", "Retried operation");
		tracker.startTracking("i-2");
		tracker.recordEvent("i-2", "retry", "Retried operation");
		tracker.recordEvent("i-2", "retry", "Retried again");

		const patterns = tracker.getRecurringPatterns();
		assert.ok(patterns.some((p) => p.pattern === "retry" && p.frequency >= 2));
	});

	it("should compute routing effectiveness by agent category", () => {
		const tracker = new IntentHistoryTracker();
		tracker.startTracking("i-1");
		tracker.recordEvent("i-1", "routed", "Routed to engineering");
		tracker.endTracking("i-1", "success");

		const effectiveness = tracker.getRoutingEffectiveness("engineering");
		assert.equal(effectiveness, 100);
	});

	it("should return 0 effectiveness for unknown agent", () => {
		const tracker = new IntentHistoryTracker();
		assert.equal(tracker.getRoutingEffectiveness("unknown"), 0);
	});

	it("should set 0 effectiveness for failure outcome", () => {
		const tracker = new IntentHistoryTracker();
		tracker.startTracking("i-1");
		const result = tracker.endTracking("i-1", "failure");
		assert.equal(result.routingEffectiveness, 0);
	});
});

// =========================================================================
// IE-07: IntentTemplateManager
// =========================================================================

describe("IntentTemplateManager", () => {
	it("should load default templates", () => {
		const manager = new IntentTemplateManager();
		assert.ok(manager.getAllTemplates().length >= 5);
	});

	it("should get template by id", () => {
		const manager = new IntentTemplateManager();
		const template = manager.getTemplate("bug-fix");
		assert.ok(template);
		assert.equal(template.name, "Bug Fix");
	});

	it("should return undefined for unknown template", () => {
		const manager = new IntentTemplateManager();
		assert.equal(manager.getTemplate("nonexistent"), undefined);
	});

	it("should create intent from template with overrides", () => {
		const manager = new IntentTemplateManager();
		const intent = manager.createFromTemplate("bug-fix", {
			goal: "Fix login crash on Safari",
			createdBy: "test-user",
		});
		assert.ok(intent.id);
		assert.equal(intent.goal, "Fix login crash on Safari");
		assert.equal(intent.priority, "high");
		assert.ok(intent.constraints.length > 0);
		assert.ok(intent.failureModes.length > 0);
	});

	it("should throw when required override is missing", () => {
		const manager = new IntentTemplateManager();
		assert.throws(() => manager.createFromTemplate("bug-fix", {}));
	});

	it("should throw when template not found", () => {
		const manager = new IntentTemplateManager();
		assert.throws(() => manager.createFromTemplate("nonexistent", { goal: "test" }));
	});

	it("should add custom template", () => {
		const manager = new IntentTemplateManager();
		manager.addTemplate({
			id: "custom",
			name: "Custom",
			description: "Custom template",
			defaults: { priority: "low" },
			requiredOverrides: ["goal"],
		});
		assert.ok(manager.getTemplate("custom"));
	});

	it("should create from feature-implementation template", () => {
		const manager = new IntentTemplateManager();
		const intent = manager.createFromTemplate("feature-implementation", {
			goal: "Add dark mode",
			createdBy: "test",
		});
		assert.equal(intent.priority, "medium");
		assert.ok(intent.values.includes("completeness"));
	});

	it("should create from security-audit template", () => {
		const manager = new IntentTemplateManager();
		const intent = manager.createFromTemplate("security-audit", {
			goal: "Audit auth module",
			createdBy: "test",
		});
		assert.equal(intent.priority, "critical");
	});

	it("should have all 5 built-in templates", () => {
		assert.equal(INTENT_TEMPLATES.length, 5);
		const ids = INTENT_TEMPLATES.map((t) => t.id);
		assert.ok(ids.includes("bug-fix"));
		assert.ok(ids.includes("feature-implementation"));
		assert.ok(ids.includes("refactoring"));
		assert.ok(ids.includes("code-review"));
		assert.ok(ids.includes("security-audit"));
	});
});

// =========================================================================
// IE-08: IntentConflictDetector
// =========================================================================

describe("IntentConflictDetector", () => {
	const detector = new IntentConflictDetector();

	it("should detect goal contradiction (add vs remove)", () => {
		const a = makeIntent({ id: "i-1", goal: "Add caching to the API layer" });
		const b = makeIntent({ id: "i-2", goal: "Remove caching from the API layer" });
		const conflict = detector.detectGoalContradiction(a, b);
		assert.ok(conflict);
		assert.equal(conflict.type, "goal_contradiction");
	});

	it("should not detect contradiction for unrelated goals", () => {
		const a = makeIntent({ id: "i-1", goal: "Add logging" });
		const b = makeIntent({ id: "i-2", goal: "Fix database migration" });
		const conflict = detector.detectGoalContradiction(a, b);
		assert.equal(conflict, null);
	});

	it("should detect scope overlap", () => {
		const a = makeIntent({ id: "i-1", goal: "Refactor the authentication module" });
		const b = makeIntent({ id: "i-2", goal: "Update the authentication module validation" });
		const conflict = detector.detectScopeOverlap(a, b);
		assert.ok(conflict);
		assert.equal(conflict.type, "scope_overlap");
	});

	it("should not detect scope overlap for different domains", () => {
		const a = makeIntent({ id: "i-1", goal: "Refactor the payment system" });
		const b = makeIntent({ id: "i-2", goal: "Update the email notification service" });
		const conflict = detector.detectScopeOverlap(a, b);
		assert.equal(conflict, null);
	});

	it("should detect priority inversion", () => {
		const a = makeIntent({ id: "i-1", goal: "Critical fix", priority: "critical", parentIntentId: "i-2" });
		const b = makeIntent({ id: "i-2", goal: "Low priority task", priority: "low" });
		const conflict = detector.detectPriorityInversion(a, b);
		assert.ok(conflict);
		assert.equal(conflict.type, "priority_inversion");
	});

	it("should not detect priority inversion without parent relationship", () => {
		const a = makeIntent({ id: "i-1", goal: "High task", priority: "high" });
		const b = makeIntent({ id: "i-2", goal: "Low task", priority: "low" });
		const conflict = detector.detectPriorityInversion(a, b);
		assert.equal(conflict, null);
	});

	it("should detect all conflicts in a set of intents", () => {
		const intents = [
			makeIntent({ id: "i-1", goal: "Add caching to the API module" }),
			makeIntent({ id: "i-2", goal: "Remove caching from the API module" }),
		];
		const conflicts = detector.detectConflicts(intents);
		assert.ok(conflicts.length > 0);
	});

	it("should return empty array for single intent", () => {
		const conflicts = detector.detectConflicts([makeIntent()]);
		assert.equal(conflicts.length, 0);
	});

	it("should return empty array for empty intents", () => {
		const conflicts = detector.detectConflicts([]);
		assert.equal(conflicts.length, 0);
	});
});

// =========================================================================
// IE-09: InflectionPointDetector
// =========================================================================

describe("InflectionPointDetector", () => {
	const detector = new InflectionPointDetector();

	it("should detect taste inflection point", () => {
		const intent = makeIntent({ goal: "Update the branding style for the homepage" });
		const points = detector.detect(intent);
		assert.ok(points.some((p) => p.type === "taste"));
	});

	it("should detect ethics inflection point", () => {
		const intent = makeIntent({ goal: "Implement user tracking with privacy considerations" });
		const points = detector.detect(intent);
		assert.ok(points.some((p) => p.type === "ethics"));
	});

	it("should detect strategy inflection point", () => {
		const intent = makeIntent({ goal: "Pivot the pricing model for the market" });
		const points = detector.detect(intent);
		assert.ok(points.some((p) => p.type === "strategy"));
	});

	it("should detect stakeholder inflection point", () => {
		const intent = makeIntent({ goal: "Address customer feedback on the dashboard" });
		const points = detector.detect(intent);
		assert.ok(points.some((p) => p.type === "stakeholder"));
	});

	it("should detect novel ambiguity from failure modes", () => {
		const intent = makeIntent({
			failureModes: ["Unknown edge case in the new protocol"],
		});
		const points = detector.detect(intent);
		assert.ok(points.some((p) => p.type === "novel_ambiguity"));
	});

	it("should return no inflection points for straightforward intent", () => {
		const intent = makeIntent({ goal: "Fix null pointer exception", failureModes: ["Regression"] });
		const points = detector.detect(intent);
		assert.equal(points.length, 0);
	});

	it("should detect escalation required", () => {
		const intent = makeIntent({ goal: "Review ethical implications of bias detection" });
		assert.equal(detector.isEscalationRequired(intent), true);
	});

	it("should not require escalation for routine intent", () => {
		const intent = makeIntent({ goal: "Fix null pointer exception", failureModes: ["Regression"] });
		assert.equal(detector.isEscalationRequired(intent), false);
	});

	it("should check constraints and values for inflection keywords", () => {
		const intent = makeIntent({
			goal: "Simple task",
			constraints: ["Must maintain fairness across user groups"],
			failureModes: ["Regression"],
		});
		const points = detector.detect(intent);
		assert.ok(points.some((p) => p.type === "ethics"));
	});
});

// =========================================================================
// IE-10: JudgmentBoundaryEnforcer
// =========================================================================

describe("JudgmentBoundaryEnforcer", () => {
	const enforcer = new JudgmentBoundaryEnforcer();

	it("should detect safe action within boundaries", () => {
		const intent = makeIntent({
			judgmentBoundaries: [
				{ description: "Do not modify production", threshold: "production deploy", escalateTo: "admin" },
			],
		});
		const result = enforcer.checkBoundaries(intent, "run local tests");
		assert.equal(result.safe, true);
		assert.equal(result.violations.length, 0);
	});

	it("should detect boundary violation", () => {
		const intent = makeIntent({
			judgmentBoundaries: [
				{ description: "Do not modify production", threshold: "production deploy", escalateTo: "admin" },
			],
		});
		const result = enforcer.checkBoundaries(intent, "production deploy of new version");
		assert.equal(result.safe, false);
		assert.ok(result.violations.length > 0);
	});

	it("should detect near-boundary action", () => {
		const intent = makeIntent({
			judgmentBoundaries: [
				{ description: "Do not modify production database", threshold: "production database migration", escalateTo: "dba" },
			],
		});
		const result = enforcer.checkBoundaries(intent, "review production schema");
		assert.equal(result.nearBoundary, true);
	});

	it("should detect constraint violations for negative constraints", () => {
		const intent = makeIntent({
			constraints: ["Must not modify shared state"],
			judgmentBoundaries: [],
		});
		const result = enforcer.checkBoundaries(intent, "modify the shared state variables");
		assert.equal(result.safe, false);
		assert.ok(result.violations.some((v) => v.includes("constraint")));
	});

	it("should return safe for intent with no boundaries or constraints", () => {
		const intent = makeIntent({ judgmentBoundaries: [], constraints: [] });
		const result = enforcer.checkBoundaries(intent, "do anything");
		assert.equal(result.safe, true);
	});

	it("should return proximity warnings", () => {
		const intent = makeIntent({
			judgmentBoundaries: [
				{ description: "Do not delete user data", threshold: "delete user", escalateTo: "admin" },
			],
		});
		const warnings = enforcer.getProximityWarnings(intent, "archive old user accounts");
		assert.ok(warnings.some((w) => w.includes("user")));
	});

	it("should return empty warnings when far from boundaries", () => {
		const intent = makeIntent({
			judgmentBoundaries: [
				{ description: "Do not delete production data", threshold: "delete production", escalateTo: "admin" },
			],
		});
		const warnings = enforcer.getProximityWarnings(intent, "run unit tests locally");
		assert.equal(warnings.length, 0);
	});
});
