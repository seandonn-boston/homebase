/**
 * Tests for McpHealthMonitor (M-09).
 */

import * as assert from "node:assert/strict";
import { describe, it } from "node:test";

import { McpHealthMonitor } from "./health.js";

describe("McpHealthMonitor", () => {
	it("starts healthy with zero metrics", () => {
		const monitor = new McpHealthMonitor();
		const health = monitor.getHealth();
		assert.equal(health.status, "healthy");
		assert.ok(health.uptime >= 0);
		assert.equal(health.connectedClients, 0);
		assert.equal(health.storageHealth, "ok");
	});

	it("records requests and updates metrics", () => {
		const monitor = new McpHealthMonitor();
		monitor.recordRequest("tool-a", "agent-1", 50, true, 100);
		monitor.recordRequest("tool-a", "agent-1", 100, true, 200);
		const metrics = monitor.getMetrics();
		assert.equal(metrics.totalRequests, 2);
		assert.equal(metrics.requestsPerTool["tool-a"], 2);
		assert.equal(metrics.requestsPerAgent["agent-1"], 2);
		assert.equal(metrics.tokenConsumption, 300);
		assert.equal(metrics.errorRate, 0);
	});

	it("computes percentile latencies", () => {
		const monitor = new McpHealthMonitor();
		for (let i = 1; i <= 100; i++) {
			monitor.recordRequest("tool-a", "agent-1", i, true);
		}
		const metrics = monitor.getMetrics();
		assert.equal(metrics.latencyP50, 50);
		assert.equal(metrics.latencyP95, 95);
		assert.equal(metrics.latencyP99, 99);
	});

	it("tracks error rate", () => {
		const monitor = new McpHealthMonitor();
		monitor.recordRequest("tool-a", "agent-1", 10, true);
		monitor.recordRequest("tool-a", "agent-1", 10, false);
		const metrics = monitor.getMetrics();
		assert.equal(metrics.errorRate, 0.5);
	});

	it("reports degraded when error rate exceeds 10%", () => {
		const monitor = new McpHealthMonitor();
		for (let i = 0; i < 8; i++) {
			monitor.recordRequest("tool-a", "agent-1", 10, true);
		}
		for (let i = 0; i < 2; i++) {
			monitor.recordRequest("tool-a", "agent-1", 10, false);
		}
		const health = monitor.getHealth();
		assert.equal(health.status, "degraded");
	});

	it("reports unhealthy when error rate exceeds 50%", () => {
		const monitor = new McpHealthMonitor();
		monitor.recordRequest("tool-a", "agent-1", 10, false);
		monitor.recordRequest("tool-a", "agent-1", 10, false);
		monitor.recordRequest("tool-a", "agent-1", 10, true);
		const health = monitor.getHealth();
		assert.equal(health.status, "unhealthy");
	});

	it("tracks multiple tools and agents independently", () => {
		const monitor = new McpHealthMonitor();
		monitor.recordRequest("tool-a", "agent-1", 10, true);
		monitor.recordRequest("tool-b", "agent-2", 20, true);
		const metrics = monitor.getMetrics();
		assert.equal(metrics.requestsPerTool["tool-a"], 1);
		assert.equal(metrics.requestsPerTool["tool-b"], 1);
		assert.equal(metrics.requestsPerAgent["agent-1"], 1);
		assert.equal(metrics.requestsPerAgent["agent-2"], 1);
	});

	it("resets all state", () => {
		const monitor = new McpHealthMonitor();
		monitor.recordRequest("tool-a", "agent-1", 10, true, 50);
		monitor.reset();
		const metrics = monitor.getMetrics();
		assert.equal(metrics.totalRequests, 0);
		assert.equal(metrics.tokenConsumption, 0);
		assert.equal(Object.keys(metrics.requestsPerTool).length, 0);
	});
});
