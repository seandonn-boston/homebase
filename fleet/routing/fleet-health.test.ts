import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { type AgentHealthMetrics, FleetHealthMonitor } from "./fleet-health";

describe("FleetHealthMonitor", () => {
	let monitor: FleetHealthMonitor;

	beforeEach(() => {
		monitor = new FleetHealthMonitor();
	});

	describe("updateMetrics / getMetrics", () => {
		it("creates metrics for new agent", () => {
			monitor.updateMetrics("agent-a", { utilization: 50, errorRate: 5 });
			const m = monitor.getMetrics("agent-a");
			assert.ok(m);
			assert.equal(m.utilization, 50);
			assert.equal(m.errorRate, 5);
		});

		it("updates existing agent metrics", () => {
			monitor.updateMetrics("agent-a", { utilization: 50 });
			monitor.updateMetrics("agent-a", { utilization: 75 });
			const m = monitor.getMetrics("agent-a");
			assert.equal(m?.utilization, 75);
		});

		it("returns undefined for unknown agent", () => {
			assert.equal(monitor.getMetrics("unknown"), undefined);
		});

		it("defaults missing fields to zero", () => {
			monitor.updateMetrics("agent-a", {});
			const m = monitor.getMetrics("agent-a");
			assert.ok(m);
			assert.equal(m.throughput, 0);
			assert.equal(m.budgetBurn, 0);
			assert.equal(m.firstPassQuality, 100);
		});
	});

	describe("getAllMetrics", () => {
		it("returns all agents", () => {
			monitor.updateMetrics("agent-a", { utilization: 10 });
			monitor.updateMetrics("agent-b", { utilization: 20 });
			assert.equal(monitor.getAllMetrics().length, 2);
		});
	});

	describe("checkHealth", () => {
		it("generates alert for high error rate", () => {
			monitor.updateMetrics("agent-a", { errorRate: 25 });
			const alerts = monitor.checkHealth();
			assert.ok(alerts.length >= 1);
			assert.ok(alerts.some((a) => a.metric === "errorRate"));
			assert.ok(alerts.some((a) => a.agentId === "agent-a"));
		});

		it("generates critical alert for very high error rate", () => {
			monitor.updateMetrics("agent-a", { errorRate: 55 });
			const alerts = monitor.checkHealth();
			assert.ok(alerts.some((a) => a.severity === "critical"));
		});

		it("generates alert for high utilization", () => {
			monitor.updateMetrics("agent-a", { utilization: 95 });
			const alerts = monitor.checkHealth();
			assert.ok(alerts.some((a) => a.metric === "utilization"));
		});

		it("generates alert for high budget burn", () => {
			monitor.updateMetrics("agent-a", { budgetBurn: 15000 });
			const alerts = monitor.checkHealth();
			assert.ok(alerts.some((a) => a.metric === "budgetBurn"));
		});

		it("does not alert for healthy agent", () => {
			monitor.updateMetrics("agent-a", {
				utilization: 50,
				errorRate: 5,
				budgetBurn: 1000,
			});
			const alerts = monitor.checkHealth();
			assert.equal(alerts.length, 0);
		});

		it("deduplicates alerts within 5 min window", () => {
			monitor.updateMetrics("agent-a", { errorRate: 30 });
			const first = monitor.checkHealth();
			const second = monitor.checkHealth();
			assert.equal(first.length, 1);
			assert.equal(second.length, 0); // deduped
		});
	});

	describe("acknowledgeAlert", () => {
		it("marks alert as acknowledged", () => {
			monitor.updateMetrics("agent-a", { errorRate: 30 });
			const alerts = monitor.checkHealth();
			assert.ok(alerts.length > 0);
			monitor.acknowledgeAlert(alerts[0].id);
			const all = monitor.getAlerts();
			assert.ok(all.some((a) => a.acknowledged));
		});
	});

	describe("getAlerts", () => {
		it("filters by severity", () => {
			monitor.updateMetrics("agent-a", { errorRate: 25 }); // high
			monitor.updateMetrics("agent-b", { utilization: 95 }); // medium
			monitor.checkHealth();
			const high = monitor.getAlerts("high");
			assert.ok(high.every((a) => a.severity === "high"));
		});

		it("returns all alerts when no filter", () => {
			monitor.updateMetrics("agent-a", { errorRate: 25 });
			monitor.checkHealth();
			assert.ok(monitor.getAlerts().length >= 1);
		});
	});

	describe("getSummary", () => {
		it("returns correct counts", () => {
			// healthy
			monitor.updateMetrics("h1", { errorRate: 5, utilization: 50 });
			// degraded (high error)
			monitor.updateMetrics("d1", { errorRate: 25, utilization: 50 });
			// blocked (high error + high utilization)
			monitor.updateMetrics("b1", { errorRate: 25, utilization: 95 });

			const summary = monitor.getSummary();
			assert.equal(summary.totalAgents, 3);
			assert.equal(summary.healthy, 1);
			assert.equal(summary.degraded, 1);
			assert.equal(summary.blocked, 1);
		});

		it("computes aggregate metrics", () => {
			monitor.updateMetrics("a", {
				utilization: 40,
				errorRate: 10,
				throughput: 5,
				budgetBurn: 100,
			});
			monitor.updateMetrics("b", {
				utilization: 60,
				errorRate: 20,
				throughput: 10,
				budgetBurn: 200,
			});

			const summary = monitor.getSummary();
			assert.equal(summary.aggregateMetrics.avgUtilization, 50);
			assert.equal(summary.aggregateMetrics.avgErrorRate, 15);
			assert.equal(summary.aggregateMetrics.totalThroughput, 15);
			assert.equal(summary.aggregateMetrics.totalBudgetBurn, 300);
		});
	});
});
