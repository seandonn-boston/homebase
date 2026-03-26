/**
 * Compliance Monitor Agent (MG-04)
 *
 * Monitors standing order compliance through mechanical (hook-based)
 * and judgment-based assessment. Generates compliance reports with trends.
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
// Types
// ---------------------------------------------------------------------------

export interface StandingOrderDef {
	id: string;
	name: string;
	enforcement: "mechanical" | "judgment" | "advisory";
	hookName?: string;
}

export interface StandingOrderCompliance {
	orderId: string;
	name: string;
	enforced: boolean;
	mechanicalCompliance: number; // 0-100
	judgmentCompliance: number; // 0-100
	violationCount: number;
	lastViolation?: number;
	trend: "improving" | "declining" | "stable";
}

export interface ComplianceReport {
	timestamp: number;
	period: { from: number; to: number };
	orders: StandingOrderCompliance[];
	overallScore: number; // 0-100
	trends: { improving: string[]; declining: string[]; stable: string[] };
}

// ---------------------------------------------------------------------------
// ComplianceMonitorAgent
// ---------------------------------------------------------------------------

export class ComplianceMonitorAgent extends GovernanceAgent {
	readonly agentId = "compliance-monitor";
	readonly name = "Compliance Monitor";

	private standingOrders: StandingOrderDef[];
	private history: ComplianceReport[] = [];

	constructor(bus: GovernanceEventBus, standingOrders: StandingOrderDef[]) {
		super(bus, InterventionLevel.Warn);
		this.standingOrders = standingOrders;
	}

	// -----------------------------------------------------------------------
	// GovernanceAgent contract
	// -----------------------------------------------------------------------

	analyze(events: GovernanceEvent[]): GovernanceFinding[] {
		const findings: GovernanceFinding[] = [];
		const mechanical = this.checkMechanicalCompliance(events);
		const judgment = this.checkJudgmentCompliance(events);

		const allCompliance = [...mechanical, ...judgment];
		for (const compliance of allCompliance) {
			const score = Math.max(
				compliance.mechanicalCompliance,
				compliance.judgmentCompliance,
			);
			if (score < 50) {
				findings.push({
					agentId: this.agentId,
					type: "compliance_finding",
					severity: score < 25 ? "critical" : "high",
					description: `Standing order "${compliance.name}" compliance at ${score}% (${compliance.violationCount} violations)`,
					evidence: {
						orderId: compliance.orderId,
						score,
						violationCount: compliance.violationCount,
					},
					recommendedAction: InterventionLevel.Warn,
				});
			}
		}

		return findings;
	}

	// -----------------------------------------------------------------------
	// Mechanical compliance (hook-based)
	// -----------------------------------------------------------------------

	checkMechanicalCompliance(
		events: GovernanceEvent[],
	): StandingOrderCompliance[] {
		const results: StandingOrderCompliance[] = [];

		for (const order of this.standingOrders) {
			if (order.enforcement !== "mechanical" || !order.hookName) continue;

			const hookEvents = events.filter(
				(e) => e.data.hookName === order.hookName,
			);

			const passes = hookEvents.filter((e) => e.data.result === "pass").length;
			const failures = hookEvents.filter(
				(e) => e.data.result === "fail",
			).length;
			const total = passes + failures;
			const score = total > 0 ? Math.round((passes / total) * 100) : 100;

			const failureEvents = hookEvents.filter((e) => e.data.result === "fail");
			const lastViolation =
				failureEvents.length > 0
					? Math.max(...failureEvents.map((e) => e.timestamp))
					: undefined;

			results.push({
				orderId: order.id,
				name: order.name,
				enforced: true,
				mechanicalCompliance: score,
				judgmentCompliance: 0,
				violationCount: failures,
				lastViolation,
				trend: this.computeTrend(order.id),
			});
		}

		return results;
	}

	// -----------------------------------------------------------------------
	// Judgment compliance (sampling-based)
	// -----------------------------------------------------------------------

	checkJudgmentCompliance(
		events: GovernanceEvent[],
	): StandingOrderCompliance[] {
		const results: StandingOrderCompliance[] = [];

		for (const order of this.standingOrders) {
			if (order.enforcement !== "judgment") continue;

			// Sample compliance_finding events related to this order
			const orderEvents = events.filter((e) => e.data.orderId === order.id);

			const compliant = orderEvents.filter(
				(e) => e.data.compliant === true,
			).length;
			const nonCompliant = orderEvents.filter(
				(e) => e.data.compliant === false,
			).length;
			const total = compliant + nonCompliant;
			const score = total > 0 ? Math.round((compliant / total) * 100) : 100;

			const violationEvents = orderEvents.filter(
				(e) => e.data.compliant === false,
			);
			const lastViolation =
				violationEvents.length > 0
					? Math.max(...violationEvents.map((e) => e.timestamp))
					: undefined;

			results.push({
				orderId: order.id,
				name: order.name,
				enforced: false,
				mechanicalCompliance: 0,
				judgmentCompliance: score,
				violationCount: nonCompliant,
				lastViolation,
				trend: this.computeTrend(order.id),
			});
		}

		return results;
	}

	// -----------------------------------------------------------------------
	// Report generation
	// -----------------------------------------------------------------------

	generateReport(windowMs: number = 3_600_000): ComplianceReport {
		const now = Date.now();
		const events = this.bus.getRecentEvents(windowMs);
		const mechanical = this.checkMechanicalCompliance(events);
		const judgment = this.checkJudgmentCompliance(events);

		const allOrders = [...mechanical, ...judgment];

		// Fill in advisory orders with default values
		for (const order of this.standingOrders) {
			if (order.enforcement === "advisory") {
				allOrders.push({
					orderId: order.id,
					name: order.name,
					enforced: false,
					mechanicalCompliance: 0,
					judgmentCompliance: 100,
					violationCount: 0,
					trend: "stable",
				});
			}
		}

		const scores = allOrders.map((o) =>
			Math.max(o.mechanicalCompliance, o.judgmentCompliance),
		);
		const overallScore =
			scores.length > 0
				? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
				: 100;

		const trends = {
			improving: [] as string[],
			declining: [] as string[],
			stable: [] as string[],
		};
		for (const order of allOrders) {
			trends[order.trend].push(order.orderId);
		}

		const report: ComplianceReport = {
			timestamp: now,
			period: { from: now - windowMs, to: now },
			orders: allOrders,
			overallScore,
			trends,
		};

		this.history.push(report);
		return report;
	}

	// -----------------------------------------------------------------------
	// Trend tracking
	// -----------------------------------------------------------------------

	getComplianceTrend(orderId: string, periods: number = 5): number[] {
		const relevant = this.history
			.filter((r) => r.orders.some((o) => o.orderId === orderId))
			.slice(-periods);

		return relevant.map((r) => {
			const order = r.orders.find((o) => o.orderId === orderId);
			if (!order) return 0;
			return Math.max(order.mechanicalCompliance, order.judgmentCompliance);
		});
	}

	// -----------------------------------------------------------------------
	// Private helpers
	// -----------------------------------------------------------------------

	private computeTrend(orderId: string): "improving" | "declining" | "stable" {
		const scores = this.getComplianceTrend(orderId, 3);
		if (scores.length < 2) return "stable";

		const first = scores[0];
		const last = scores[scores.length - 1];
		const diff = last - first;

		if (diff > 5) return "improving";
		if (diff < -5) return "declining";
		return "stable";
	}
}
