/**
 * Governance Operations (MG-08 to MG-13)
 *
 * Audit dashboard, self-governance, metrics, multi-operator governance,
 * operator handoff, and fallback decomposer.
 * Zero external dependencies — Node.js built-ins only.
 */

import type { GovernanceEvent, GovernanceEventBus } from "./framework";
import type { Intervention, InterventionProtocol } from "./intervention";

// ---------------------------------------------------------------------------
// MG-08: Governance Audit Dashboard
// ---------------------------------------------------------------------------

export class GovernanceAuditDashboard {
	private bus: GovernanceEventBus;
	private interventionProtocol: InterventionProtocol;

	constructor(
		bus: GovernanceEventBus,
		interventionProtocol: InterventionProtocol,
	) {
		this.bus = bus;
		this.interventionProtocol = interventionProtocol;
	}

	getActiveFindingsView(): {
		type: string;
		severity: string;
		agent: string;
		timestamp: number;
	}[] {
		const events = this.bus.getHistory({
			types: [
				"scope_drift",
				"budget_overrun",
				"loop_detected",
				"trust_violation",
				"compliance_finding",
			],
		});
		return events.map((e) => ({
			type: e.type,
			severity: e.severity,
			agent: e.targetAgent ?? e.sourceAgent ?? "unknown",
			timestamp: e.timestamp,
		}));
	}

	getInterventionHistory(limit?: number): Intervention[] {
		const history = this.interventionProtocol.getHistory();
		if (limit !== undefined) {
			return history.slice(-limit);
		}
		return history;
	}

	getComplianceScorecard(): { orderId: string; compliance: number }[] {
		// Derive compliance from event patterns
		const events = this.bus.getHistory();
		const orderMap = new Map<string, { total: number; compliant: number }>();

		for (const e of events) {
			const orderId = (e.data?.orderId as string) ?? "default";
			let entry = orderMap.get(orderId);
			if (!entry) {
				entry = { total: 0, compliant: 0 };
				orderMap.set(orderId, entry);
			}
			entry.total++;
			if (e.type !== "compliance_finding") {
				entry.compliant++;
			}
		}

		return Array.from(orderMap.entries()).map(([orderId, data]) => ({
			orderId,
			compliance: data.total > 0 ? data.compliant / data.total : 1,
		}));
	}

	getGovernanceAgentHealth(): {
		agentId: string;
		healthy: boolean;
		lastActivity: number;
	}[] {
		const events = this.bus.getHistory();
		const agentMap = new Map<string, number>();

		for (const e of events) {
			if (e.sourceAgent) {
				const existing = agentMap.get(e.sourceAgent) ?? 0;
				if (e.timestamp > existing) {
					agentMap.set(e.sourceAgent, e.timestamp);
				}
			}
		}

		const now = Date.now();
		const healthThreshold = 5 * 60 * 1000; // 5 minutes

		return Array.from(agentMap.entries()).map(([agentId, lastActivity]) => ({
			agentId,
			healthy: now - lastActivity < healthThreshold,
			lastActivity,
		}));
	}

	getFalsePositiveRate(): number {
		const history = this.interventionProtocol.getHistory();
		if (history.length === 0) return 0;
		const reversed = history.filter((i) => i.status === "reversed").length;
		return reversed / history.length;
	}
}

// ---------------------------------------------------------------------------
// MG-09: Self-Governance
// ---------------------------------------------------------------------------

interface AuditTrailEntry {
	action: string;
	agentId: string;
	timestamp: number;
	details: Record<string, unknown>;
}

export class GovernanceSelfGovernance {
	private bus: GovernanceEventBus;
	private auditTrail: AuditTrailEntry[] = [];
	private interventionCounts: Map<string, { timestamps: number[] }> = new Map();

	constructor(bus: GovernanceEventBus) {
		this.bus = bus;
	}

	validateNoSelfModification(
		agentId: string,
		targetConfig: string,
	): { allowed: boolean; reason: string } {
		// Governance agents cannot modify their own configuration
		const selfTargets = [
			"governance-operations",
			"governance-framework",
			"intervention-protocol",
			"rule-engine",
		];
		const isSelfTarget = selfTargets.some((t) => targetConfig.includes(t));

		this.auditTrail.push({
			action: "self_modification_check",
			agentId,
			timestamp: Date.now(),
			details: { targetConfig, isSelfTarget },
		});

		if (isSelfTarget) {
			return {
				allowed: false,
				reason: "Self-modification of governance configuration is prohibited",
			};
		}
		return { allowed: true, reason: "Target is not a governance component" };
	}

	checkBudgetLimits(
		agentId: string,
		currentSpend: number,
		maxBudget: number,
	): { withinLimits: boolean } {
		this.auditTrail.push({
			action: "budget_check",
			agentId,
			timestamp: Date.now(),
			details: { currentSpend, maxBudget },
		});
		return { withinLimits: currentSpend <= maxBudget };
	}

	checkInterventionRateLimit(
		agentId: string,
		windowMs: number,
		maxInterventions: number,
	): { allowed: boolean; currentRate: number } {
		const now = Date.now();
		let entry = this.interventionCounts.get(agentId);
		if (!entry) {
			entry = { timestamps: [] };
			this.interventionCounts.set(agentId, entry);
		}

		// Clean old entries
		entry.timestamps = entry.timestamps.filter((t) => now - t <= windowMs);
		const currentRate = entry.timestamps.length;

		this.auditTrail.push({
			action: "rate_limit_check",
			agentId,
			timestamp: now,
			details: { windowMs, maxInterventions, currentRate },
		});

		if (currentRate >= maxInterventions) {
			return { allowed: false, currentRate };
		}

		entry.timestamps.push(now);
		return { allowed: true, currentRate: currentRate + 1 };
	}

	getAuditTrail(): AuditTrailEntry[] {
		return [...this.auditTrail];
	}
}

// ---------------------------------------------------------------------------
// MG-10: Governance Metrics
// ---------------------------------------------------------------------------

export class GovernanceMetrics {
	private bus: GovernanceEventBus;
	private interventionProtocol: InterventionProtocol;
	private detectionTimestamps: Map<
		string,
		{ eventTime: number; findingTime: number }
	> = new Map();
	private resolutionTimestamps: Map<
		string,
		{ findingTime: number; resolvedTime: number }
	> = new Map();
	private governanceTimeMs = 0;
	private totalFleetTimeMs = 0;

	constructor(
		bus: GovernanceEventBus,
		interventionProtocol: InterventionProtocol,
	) {
		this.bus = bus;
		this.interventionProtocol = interventionProtocol;
	}

	getInterventionRate(windowMs?: number): number {
		const history = this.interventionProtocol.getHistory();
		if (!windowMs) return history.length;
		const cutoff = Date.now() - windowMs;
		return history.filter((i) => i.timestamp >= cutoff).length;
	}

	getFalsePositiveRate(): number {
		const history = this.interventionProtocol.getHistory();
		if (history.length === 0) return 0;
		const reversed = history.filter((i) => i.status === "reversed").length;
		return reversed / history.length;
	}

	getDetectionLatency(): number {
		if (this.detectionTimestamps.size === 0) return 0;
		let total = 0;
		for (const entry of this.detectionTimestamps.values()) {
			total += entry.findingTime - entry.eventTime;
		}
		return total / this.detectionTimestamps.size;
	}

	getResolutionTime(): number {
		if (this.resolutionTimestamps.size === 0) return 0;
		let total = 0;
		for (const entry of this.resolutionTimestamps.values()) {
			total += entry.resolvedTime - entry.findingTime;
		}
		return total / this.resolutionTimestamps.size;
	}

	getComplianceScore(): number {
		const events = this.bus.getHistory();
		if (events.length === 0) return 100;
		const findings = events.filter(
			(e) => e.type === "compliance_finding",
		).length;
		return Math.max(0, 100 - (findings / events.length) * 100);
	}

	getGovernanceOverhead(): number {
		if (this.totalFleetTimeMs === 0) return 0;
		return (this.governanceTimeMs / this.totalFleetTimeMs) * 100;
	}

	recordDetection(id: string, eventTime: number, findingTime: number): void {
		this.detectionTimestamps.set(id, { eventTime, findingTime });
	}

	recordResolution(
		id: string,
		findingTime: number,
		resolvedTime: number,
	): void {
		this.resolutionTimestamps.set(id, { findingTime, resolvedTime });
	}

	recordGovernanceTime(governanceMs: number, totalMs: number): void {
		this.governanceTimeMs += governanceMs;
		this.totalFleetTimeMs += totalMs;
	}

	exportMetrics(): Record<string, number> {
		return {
			interventionRate: this.getInterventionRate(),
			falsePositiveRate: this.getFalsePositiveRate(),
			detectionLatency: this.getDetectionLatency(),
			resolutionTime: this.getResolutionTime(),
			complianceScore: this.getComplianceScore(),
			governanceOverhead: this.getGovernanceOverhead(),
		};
	}
}

// ---------------------------------------------------------------------------
// MG-11: Multi-Operator Governance
// ---------------------------------------------------------------------------

export interface OperatorRole {
	operatorId: string;
	level: "owner" | "operator" | "observer";
	assignedAt: number;
}

const LEVEL_RANK: Record<string, number> = {
	owner: 3,
	operator: 2,
	observer: 1,
};

const ACTION_PERMISSIONS: Record<string, number> = {
	read: 1,
	list: 1,
	intervene: 2,
	configure: 3,
	override: 3,
	terminate: 3,
};

export class MultiOperatorGovernance {
	private operators: Map<string, OperatorRole> = new Map();
	private maxOperators: number;

	constructor(maxOperators: number = 3) {
		this.maxOperators = maxOperators;
	}

	addOperator(
		operatorId: string,
		level: "owner" | "operator" | "observer",
	): OperatorRole {
		if (
			this.operators.size >= this.maxOperators &&
			!this.operators.has(operatorId)
		) {
			throw new Error(`Maximum operator limit (${this.maxOperators}) reached`);
		}
		const role: OperatorRole = {
			operatorId,
			level,
			assignedAt: Date.now(),
		};
		this.operators.set(operatorId, role);
		return { ...role };
	}

	removeOperator(operatorId: string): void {
		this.operators.delete(operatorId);
	}

	getOperators(): OperatorRole[] {
		return Array.from(this.operators.values()).map((o) => ({ ...o }));
	}

	resolveConflict(
		operatorA: string,
		operatorB: string,
		_action: string,
	): { winner: string; reason: string } {
		const roleA = this.operators.get(operatorA);
		const roleB = this.operators.get(operatorB);

		if (!roleA) return { winner: operatorB, reason: `${operatorA} not found` };
		if (!roleB) return { winner: operatorA, reason: `${operatorB} not found` };

		const rankA = LEVEL_RANK[roleA.level];
		const rankB = LEVEL_RANK[roleB.level];

		if (rankA > rankB) {
			return {
				winner: operatorA,
				reason: `Higher authority: ${roleA.level} > ${roleB.level}`,
			};
		}
		if (rankB > rankA) {
			return {
				winner: operatorB,
				reason: `Higher authority: ${roleB.level} > ${roleA.level}`,
			};
		}
		// Same tier: conservative action wins (operatorB is assumed to be the blocker)
		return {
			winner: operatorB,
			reason: "Same authority level — conservative action prevails",
		};
	}

	canPerformAction(operatorId: string, action: string): boolean {
		const role = this.operators.get(operatorId);
		if (!role) return false;
		const requiredLevel = ACTION_PERMISSIONS[action] ?? 2;
		return LEVEL_RANK[role.level] >= requiredLevel;
	}
}

// ---------------------------------------------------------------------------
// MG-12: Operator Handoff
// ---------------------------------------------------------------------------

export interface FleetState {
	roster: { agentId: string; state: string }[];
	trustState: Record<string, unknown>;
	brainHealth: { entries: number; lastWrite: number };
	activeTasks: { taskId: string; agent: string; status: string }[];
	exportedAt: number;
	exportedBy: string;
}

export class OperatorHandoff {
	private currentState: FleetState | null = null;
	private acknowledged = false;

	constructor() {}

	exportState(): FleetState {
		return (
			this.currentState ?? {
				roster: [],
				trustState: null,
				brainHealth: { entries: 0, lastWrite: 0 },
				activeTasks: [],
				exportedAt: Date.now(),
				exportedBy: "system",
			}
		);
	}

	importState(state: FleetState, _newOperatorId: string): void {
		this.currentState = { ...state };
		this.acknowledged = false;
	}

	acknowledgeHandoff(operatorId: string): boolean {
		if (!this.currentState) return false;
		this.acknowledged = true;
		this.currentState.exportedBy = operatorId;
		return true;
	}

	isAcknowledged(): boolean {
		return this.acknowledged;
	}

	getCurrentState(): FleetState | null {
		return this.currentState;
	}
}

// ---------------------------------------------------------------------------
// MG-13: Fallback Decomposer
// ---------------------------------------------------------------------------

export class FallbackDecomposer {
	private maxTasks: number;
	private maxDurationMs: number;
	private active = false;
	private activatedAt = 0;
	private activationReason = "";

	constructor(maxTasks: number = 3, maxDurationMs: number = 300_000) {
		this.maxTasks = maxTasks;
		this.maxDurationMs = maxDurationMs;
	}

	isActive(): boolean {
		return this.active;
	}

	activate(reason: string): void {
		this.active = true;
		this.activatedAt = Date.now();
		this.activationReason = reason;
	}

	deactivate(): void {
		this.active = false;
		this.activatedAt = 0;
		this.activationReason = "";
	}

	decompose(task: string): {
		subtasks: string[];
		routing: Record<string, string>;
	} {
		if (!this.active) {
			throw new Error("FallbackDecomposer is not active");
		}

		// Simple decomposition: split into 1-3 macro-tasks, serial execution
		// In a real system this would use task analysis; here we provide a
		// deterministic fallback pattern
		const subtasks: string[] = [];
		const routing: Record<string, string> = {};

		// Always produce at most maxTasks subtasks
		const taskParts = [
			`analyze: ${task}`,
			`execute: ${task}`,
			`verify: ${task}`,
		];

		const count = Math.min(this.maxTasks, taskParts.length);
		for (let i = 0; i < count; i++) {
			subtasks.push(taskParts[i]);
			routing[taskParts[i]] = "tier1-specialist";
		}

		return { subtasks, routing };
	}

	checkTimeout(): boolean {
		if (!this.active) return false;
		return Date.now() - this.activatedAt > this.maxDurationMs;
	}

	getActivationReason(): string {
		return this.activationReason;
	}
}
