/**
 * MCP Health Monitor (M-09)
 *
 * Health status reporting and usage metrics with percentile latency tracking.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealthStatus {
	status: "healthy" | "degraded" | "unhealthy";
	uptime: number;
	connectedClients: number;
	toolCount: number;
	storageHealth: "ok" | "degraded" | "unavailable";
	lastCheck: number;
}

export interface UsageMetrics {
	requestsPerTool: Record<string, number>;
	requestsPerAgent: Record<string, number>;
	latencyP50: number;
	latencyP95: number;
	latencyP99: number;
	errorRate: number;
	totalRequests: number;
	tokenConsumption: number;
}

// ---------------------------------------------------------------------------
// McpHealthMonitor
// ---------------------------------------------------------------------------

export class McpHealthMonitor {
	private startTime: number;
	private latencies: number[] = [];
	private toolRequests: Map<string, number> = new Map();
	private agentRequests: Map<string, number> = new Map();
	private totalRequests = 0;
	private totalErrors = 0;
	private totalTokens = 0;
	private lastCheckTime = 0;

	constructor() {
		this.startTime = Date.now();
	}

	getHealth(): HealthStatus {
		this.lastCheckTime = Date.now();
		const errorRate =
			this.totalRequests > 0 ? this.totalErrors / this.totalRequests : 0;

		let status: "healthy" | "degraded" | "unhealthy";
		if (errorRate > 0.5) {
			status = "unhealthy";
		} else if (errorRate > 0.1) {
			status = "degraded";
		} else {
			status = "healthy";
		}

		return {
			status,
			uptime: Date.now() - this.startTime,
			connectedClients: 0,
			toolCount: this.toolRequests.size,
			storageHealth: "ok",
			lastCheck: this.lastCheckTime,
		};
	}

	getMetrics(): UsageMetrics {
		const sorted = [...this.latencies].sort((a, b) => a - b);
		return {
			requestsPerTool: Object.fromEntries(this.toolRequests),
			requestsPerAgent: Object.fromEntries(this.agentRequests),
			latencyP50: percentile(sorted, 0.5),
			latencyP95: percentile(sorted, 0.95),
			latencyP99: percentile(sorted, 0.99),
			errorRate:
				this.totalRequests > 0 ? this.totalErrors / this.totalRequests : 0,
			totalRequests: this.totalRequests,
			tokenConsumption: this.totalTokens,
		};
	}

	recordRequest(
		tool: string,
		agent: string,
		latencyMs: number,
		success: boolean,
		tokens?: number,
	): void {
		this.totalRequests++;
		if (!success) this.totalErrors++;
		this.latencies.push(latencyMs);
		this.toolRequests.set(tool, (this.toolRequests.get(tool) ?? 0) + 1);
		this.agentRequests.set(agent, (this.agentRequests.get(agent) ?? 0) + 1);
		if (tokens !== undefined) this.totalTokens += tokens;
	}

	reset(): void {
		this.startTime = Date.now();
		this.latencies = [];
		this.toolRequests.clear();
		this.agentRequests.clear();
		this.totalRequests = 0;
		this.totalErrors = 0;
		this.totalTokens = 0;
		this.lastCheckTime = 0;
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return 0;
	const idx = Math.ceil(p * sorted.length) - 1;
	return sorted[Math.max(0, idx)];
}
