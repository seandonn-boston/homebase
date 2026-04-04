/**
 * Sentinel Agent (MG-02)
 *
 * Continuous monitoring agent that detects loops, budget anomalies,
 * scope drift, and agent failures. Extends GovernanceAgent.
 * Zero external dependencies — Node.js built-ins only.
 */

import {
	GovernanceAgent,
	type GovernanceEvent,
	type GovernanceEventBus,
	type GovernanceFinding,
	InterventionLevel,
} from "./framework";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface SentinelConfig {
	loopWindow: number; // ms, default 60000
	loopThreshold: number; // default 3
	budgetWindow: number; // ms, default 300000
	budgetMultiplier: number; // default 2.0
	scopeThreshold: number; // default 3
	failureWindow: number; // ms, default 120000
	failureThreshold: number; // default 3
}

const DEFAULT_CONFIG: SentinelConfig = {
	loopWindow: 60_000,
	loopThreshold: 3,
	budgetWindow: 300_000,
	budgetMultiplier: 2.0,
	scopeThreshold: 3,
	failureWindow: 120_000,
	failureThreshold: 3,
};

// ---------------------------------------------------------------------------
// SentinelAgent
// ---------------------------------------------------------------------------

export class SentinelAgent extends GovernanceAgent {
	readonly agentId = "sentinel";
	readonly name = "Sentinel";

	private config: SentinelConfig;
	private monitoringTimer: ReturnType<typeof setInterval> | null = null;

	constructor(bus: GovernanceEventBus, config?: Partial<SentinelConfig>) {
		super(bus, InterventionLevel.Restrict);
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	// -----------------------------------------------------------------------
	// GovernanceAgent contract
	// -----------------------------------------------------------------------

	analyze(events: GovernanceEvent[]): GovernanceFinding[] {
		return [
			...this.detectLoops(events),
			...this.detectBudgetAnomaly(events),
			...this.detectScopeDrift(events),
			...this.detectAgentFailure(events),
		];
	}

	// -----------------------------------------------------------------------
	// Detection: cross-session loops
	// -----------------------------------------------------------------------

	detectLoops(events: GovernanceEvent[]): GovernanceFinding[] {
		const findings: GovernanceFinding[] = [];
		const now = Date.now();
		const cutoff = now - this.config.loopWindow;
		const recent = events.filter((e) => e.timestamp >= cutoff);

		// Group by agent + type + serialised data pattern
		const groups = new Map<string, GovernanceEvent[]>();
		for (const event of recent) {
			const key = `${event.sourceAgent ?? "unknown"}|${event.type}|${stableStringify(event.data)}`;
			const arr = groups.get(key) ?? [];
			arr.push(event);
			groups.set(key, arr);
		}

		for (const [key, group] of groups) {
			if (group.length >= this.config.loopThreshold) {
				const [agent] = key.split("|");
				findings.push({
					agentId: agent,
					type: "loop_detected",
					severity: "high",
					description: `Loop detected: ${group.length} identical events from ${agent} in ${this.config.loopWindow}ms window`,
					evidence: {
						count: group.length,
						window: this.config.loopWindow,
						sampleEventId: group[0].id,
					},
					recommendedAction: InterventionLevel.Restrict,
				});
			}
		}

		return findings;
	}

	// -----------------------------------------------------------------------
	// Shared helper: group events by sourceAgent
	// -----------------------------------------------------------------------

	private groupByAgent(
		events: GovernanceEvent[],
	): Map<string, GovernanceEvent[]> {
		const groups = new Map<string, GovernanceEvent[]>();
		for (const event of events) {
			const agent = event.sourceAgent ?? "unknown";
			const arr = groups.get(agent) ?? [];
			arr.push(event);
			groups.set(agent, arr);
		}
		return groups;
	}

	// -----------------------------------------------------------------------
	// Detection: budget anomalies
	// -----------------------------------------------------------------------

	detectBudgetAnomaly(events: GovernanceEvent[]): GovernanceFinding[] {
		const findings: GovernanceFinding[] = [];
		const now = Date.now();
		const budgetEvents = events.filter((e) => e.type === "budget_overrun");

		if (budgetEvents.length === 0) return findings;

		// Calculate overall average rate (events per ms)
		const sorted = [...budgetEvents].sort((a, b) => a.timestamp - b.timestamp);
		const totalSpan = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
		if (totalSpan <= 0) return findings;

		const avgRate = budgetEvents.length / totalSpan;

		// Recent window rate
		const cutoff = now - this.config.budgetWindow;
		const recent = budgetEvents.filter((e) => e.timestamp >= cutoff);
		const windowSpan = now - cutoff;
		const recentRate = recent.length / windowSpan;

		if (
			recentRate > avgRate * this.config.budgetMultiplier &&
			recent.length >= 2
		) {
			const agentIds = [
				...new Set(recent.map((e) => e.sourceAgent ?? "unknown")),
			];
			for (const agentId of agentIds) {
				findings.push({
					agentId,
					type: "budget_overrun",
					severity: "critical",
					description: `Budget burn rate ${(recentRate / avgRate).toFixed(1)}x average over ${this.config.budgetWindow}ms window`,
					evidence: {
						recentRate,
						avgRate,
						multiplier: recentRate / avgRate,
						recentCount: recent.length,
					},
					recommendedAction: InterventionLevel.Restrict,
				});
			}
		}

		return findings;
	}

	// -----------------------------------------------------------------------
	// Detection: scope drift
	// -----------------------------------------------------------------------

	detectScopeDrift(events: GovernanceEvent[]): GovernanceFinding[] {
		const findings: GovernanceFinding[] = [];
		const scopeEvents = events.filter((e) => e.type === "scope_drift");

		const groups = this.groupByAgent(scopeEvents);

		for (const [agent, group] of groups) {
			if (group.length >= this.config.scopeThreshold) {
				findings.push({
					agentId: agent,
					type: "scope_drift",
					severity: "high",
					description: `Scope drift: ${group.length} out-of-scope events from ${agent}`,
					evidence: {
						count: group.length,
						threshold: this.config.scopeThreshold,
					},
					recommendedAction: InterventionLevel.Restrict,
				});
			}
		}

		return findings;
	}

	// -----------------------------------------------------------------------
	// Detection: agent failures
	// -----------------------------------------------------------------------

	detectAgentFailure(events: GovernanceEvent[]): GovernanceFinding[] {
		const findings: GovernanceFinding[] = [];
		const now = Date.now();
		const cutoff = now - this.config.failureWindow;
		const failures = events.filter(
			(e) => e.type === "agent_failure" && e.timestamp >= cutoff,
		);

		const groups = this.groupByAgent(failures);

		for (const [agent, group] of groups) {
			// All events in the group are failures within the window.
			// Since we only observe agent_failure events (no interleaved successes),
			// the total count IS the consecutive failure count.
			const totalFailures = group.length;

			if (totalFailures >= this.config.failureThreshold) {
				findings.push({
					agentId: agent,
					type: "agent_failure",
					severity: "critical",
					description: `Agent failure: ${totalFailures} consecutive failures from ${agent} within ${this.config.failureWindow}ms`,
					evidence: {
						consecutiveFailures: totalFailures,
						window: this.config.failureWindow,
					},
					recommendedAction: InterventionLevel.Suspend,
				});
			}
		}

		return findings;
	}

	// -----------------------------------------------------------------------
	// Continuous monitoring
	// -----------------------------------------------------------------------

	startMonitoring(intervalMs: number = 10_000): void {
		if (this.monitoringTimer) return;
		this.monitoringTimer = setInterval(() => {
			const events = this.bus.getRecentEvents(
				Math.max(
					this.config.loopWindow,
					this.config.budgetWindow,
					this.config.failureWindow,
				),
			);
			const findings = this.analyze(events);
			for (const finding of findings) {
				this.emitFinding(finding);
			}
		}, intervalMs);
	}

	stopMonitoring(): void {
		if (this.monitoringTimer) {
			clearInterval(this.monitoringTimer);
			this.monitoringTimer = null;
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stableStringify(obj: Record<string, unknown>): string {
	const keys = Object.keys(obj).sort();
	const parts: string[] = [];
	for (const key of keys) {
		parts.push(`${key}:${JSON.stringify(obj[key])}`);
	}
	return parts.join("|");
}
