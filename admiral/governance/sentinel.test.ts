import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import {
	type GovernanceEvent,
	GovernanceEventBus,
	InterventionLevel,
} from "./framework";
import { SentinelAgent } from "./sentinel";

describe("SentinelAgent", () => {
	let bus: GovernanceEventBus;
	let sentinel: SentinelAgent;
	const now = Date.now();

	beforeEach(() => {
		bus = new GovernanceEventBus(500);
		sentinel = new SentinelAgent(bus, {
			loopWindow: 60_000,
			loopThreshold: 3,
			budgetWindow: 300_000,
			budgetMultiplier: 2.0,
			scopeThreshold: 3,
			failureWindow: 120_000,
			failureThreshold: 3,
		});
	});

	afterEach(() => {
		sentinel.stopMonitoring();
	});

	// -----------------------------------------------------------------------
	// Loop detection
	// -----------------------------------------------------------------------

	describe("detectLoops", () => {
		it("detects 3 identical events within window", () => {
			const events: GovernanceEvent[] = Array.from({ length: 3 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - 10_000 + i * 1000,
				type: "scope_drift" as const,
				sourceAgent: "agent-a",
				severity: "low" as const,
				data: { file: "foo.ts" },
			}));

			const findings = sentinel.detectLoops(events);
			assert.equal(findings.length, 1);
			assert.equal(findings[0].type, "loop_detected");
			assert.equal(findings[0].agentId, "agent-a");
		});

		it("does not trigger below threshold", () => {
			const events: GovernanceEvent[] = Array.from({ length: 2 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - 5000 + i * 1000,
				type: "scope_drift" as const,
				sourceAgent: "agent-a",
				severity: "low" as const,
				data: { file: "foo.ts" },
			}));

			const findings = sentinel.detectLoops(events);
			assert.equal(findings.length, 0);
		});

		it("ignores events outside the window", () => {
			const events: GovernanceEvent[] = Array.from({ length: 3 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - 120_000 + i * 1000, // outside 60s window
				type: "scope_drift" as const,
				sourceAgent: "agent-a",
				severity: "low" as const,
				data: { file: "foo.ts" },
			}));

			const findings = sentinel.detectLoops(events);
			assert.equal(findings.length, 0);
		});

		it("groups by agent and data pattern separately", () => {
			const events: GovernanceEvent[] = [
				{
					id: "e1",
					timestamp: now - 5000,
					type: "scope_drift",
					sourceAgent: "agent-a",
					severity: "low",
					data: { file: "a.ts" },
				},
				{
					id: "e2",
					timestamp: now - 4000,
					type: "scope_drift",
					sourceAgent: "agent-a",
					severity: "low",
					data: { file: "b.ts" },
				},
				{
					id: "e3",
					timestamp: now - 3000,
					type: "scope_drift",
					sourceAgent: "agent-a",
					severity: "low",
					data: { file: "a.ts" },
				},
				{
					id: "e4",
					timestamp: now - 2000,
					type: "scope_drift",
					sourceAgent: "agent-a",
					severity: "low",
					data: { file: "a.ts" },
				},
			];

			const findings = sentinel.detectLoops(events);
			assert.equal(findings.length, 1);
		});

		it("detects loops from multiple agents independently", () => {
			const events: GovernanceEvent[] = [
				...Array.from({ length: 3 }, (_, i) => ({
					id: `ea${i}`,
					timestamp: now - 5000 + i * 1000,
					type: "scope_drift" as const,
					sourceAgent: "agent-a",
					severity: "low" as const,
					data: { x: 1 },
				})),
				...Array.from({ length: 3 }, (_, i) => ({
					id: `eb${i}`,
					timestamp: now - 5000 + i * 1000,
					type: "scope_drift" as const,
					sourceAgent: "agent-b",
					severity: "low" as const,
					data: { x: 1 },
				})),
			];

			const findings = sentinel.detectLoops(events);
			assert.equal(findings.length, 2);
		});
	});

	// -----------------------------------------------------------------------
	// Budget anomaly detection
	// -----------------------------------------------------------------------

	describe("detectBudgetAnomaly", () => {
		it("detects high burn rate in recent window", () => {
			// Historical events spread far apart (1 per 10 min over 50 min, well outside budget window)
			const historical: GovernanceEvent[] = Array.from(
				{ length: 5 },
				(_, i) => ({
					id: `h${i}`,
					timestamp: now - 3_000_000 + i * 600_000,
					type: "budget_overrun" as const,
					sourceAgent: "agent-x",
					severity: "high" as const,
					data: {},
				}),
			);

			// Recent burst: 15 events in last 60 seconds (within the 5-min budget window)
			const recent: GovernanceEvent[] = Array.from({ length: 15 }, (_, i) => ({
				id: `r${i}`,
				timestamp: now - 60_000 + i * 4000,
				type: "budget_overrun" as const,
				sourceAgent: "agent-x",
				severity: "high" as const,
				data: {},
			}));

			const findings = sentinel.detectBudgetAnomaly([...historical, ...recent]);
			assert.equal(findings.length, 1);
			assert.equal(findings[0].type, "budget_overrun");
			assert.equal(findings[0].severity, "critical");
		});

		it("does not trigger when rate is normal", () => {
			// Evenly distributed events
			const events: GovernanceEvent[] = Array.from({ length: 5 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - 300_000 + i * 60_000,
				type: "budget_overrun" as const,
				sourceAgent: "agent-x",
				severity: "high" as const,
				data: {},
			}));

			const findings = sentinel.detectBudgetAnomaly(events);
			assert.equal(findings.length, 0);
		});

		it("returns empty for no budget events", () => {
			const events: GovernanceEvent[] = [
				{
					id: "e1",
					timestamp: now,
					type: "scope_drift",
					severity: "low",
					data: {},
				},
			];
			const findings = sentinel.detectBudgetAnomaly(events);
			assert.equal(findings.length, 0);
		});
	});

	// -----------------------------------------------------------------------
	// Scope drift detection
	// -----------------------------------------------------------------------

	describe("detectScopeDrift", () => {
		it("detects scope drift above threshold", () => {
			const events: GovernanceEvent[] = Array.from({ length: 4 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - i * 1000,
				type: "scope_drift" as const,
				sourceAgent: "agent-a",
				severity: "high" as const,
				data: { file: `out-of-scope-${i}.ts` },
			}));

			const findings = sentinel.detectScopeDrift(events);
			assert.equal(findings.length, 1);
			assert.equal(findings[0].type, "scope_drift");
			assert.equal(findings[0].agentId, "agent-a");
		});

		it("no finding below threshold", () => {
			const events: GovernanceEvent[] = Array.from({ length: 2 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - i * 1000,
				type: "scope_drift" as const,
				sourceAgent: "agent-a",
				severity: "high" as const,
				data: {},
			}));

			const findings = sentinel.detectScopeDrift(events);
			assert.equal(findings.length, 0);
		});

		it("ignores non-scope-drift events", () => {
			const events: GovernanceEvent[] = Array.from({ length: 5 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - i * 1000,
				type: "budget_overrun" as const,
				sourceAgent: "agent-a",
				severity: "high" as const,
				data: {},
			}));

			const findings = sentinel.detectScopeDrift(events);
			assert.equal(findings.length, 0);
		});
	});

	// -----------------------------------------------------------------------
	// Agent failure detection
	// -----------------------------------------------------------------------

	describe("detectAgentFailure", () => {
		it("detects consecutive failures within window", () => {
			const events: GovernanceEvent[] = Array.from({ length: 4 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - 10_000 + i * 2000,
				type: "agent_failure" as const,
				sourceAgent: "agent-broken",
				severity: "high" as const,
				data: { error: "timeout" },
			}));

			const findings = sentinel.detectAgentFailure(events);
			assert.equal(findings.length, 1);
			assert.equal(findings[0].type, "agent_failure");
			assert.equal(findings[0].agentId, "agent-broken");
			assert.equal(findings[0].recommendedAction, InterventionLevel.Suspend);
		});

		it("no finding below threshold", () => {
			const events: GovernanceEvent[] = Array.from({ length: 2 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - 5000 + i * 1000,
				type: "agent_failure" as const,
				sourceAgent: "agent-a",
				severity: "high" as const,
				data: {},
			}));

			const findings = sentinel.detectAgentFailure(events);
			assert.equal(findings.length, 0);
		});

		it("ignores failures outside window", () => {
			const events: GovernanceEvent[] = Array.from({ length: 4 }, (_, i) => ({
				id: `e${i}`,
				timestamp: now - 200_000 + i * 1000, // outside 120s window
				type: "agent_failure" as const,
				sourceAgent: "agent-a",
				severity: "high" as const,
				data: {},
			}));

			const findings = sentinel.detectAgentFailure(events);
			assert.equal(findings.length, 0);
		});
	});

	// -----------------------------------------------------------------------
	// analyze (combined)
	// -----------------------------------------------------------------------

	describe("analyze", () => {
		it("returns findings from all detectors", () => {
			const events: GovernanceEvent[] = [
				// Loop: 3 identical events
				...Array.from({ length: 3 }, (_, i) => ({
					id: `loop${i}`,
					timestamp: now - 5000 + i * 1000,
					type: "scope_drift" as const,
					sourceAgent: "looper",
					severity: "low" as const,
					data: { same: true },
				})),
				// Scope drift: 3 scope_drift events from another agent
				...Array.from({ length: 3 }, (_, i) => ({
					id: `drift${i}`,
					timestamp: now - 5000 + i * 1000,
					type: "scope_drift" as const,
					sourceAgent: "drifter",
					severity: "high" as const,
					data: { unique: i },
				})),
			];

			const findings = sentinel.analyze(events);
			assert.ok(findings.length >= 2);
		});

		it("returns empty array for clean events", () => {
			const events: GovernanceEvent[] = [
				{
					id: "e1",
					timestamp: now,
					type: "compliance_finding",
					severity: "low",
					data: {},
				},
			];

			const findings = sentinel.analyze(events);
			assert.equal(findings.length, 0);
		});
	});

	// -----------------------------------------------------------------------
	// Monitoring start/stop
	// -----------------------------------------------------------------------

	describe("startMonitoring / stopMonitoring", () => {
		it("starts and stops without error", () => {
			sentinel.startMonitoring(100_000);
			sentinel.stopMonitoring();
		});

		it("does not start twice", () => {
			sentinel.startMonitoring(100_000);
			sentinel.startMonitoring(100_000); // should be a no-op
			sentinel.stopMonitoring();
		});

		it("stopMonitoring is idempotent", () => {
			sentinel.stopMonitoring();
			sentinel.stopMonitoring();
		});
	});
});
