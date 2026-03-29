/**
 * A2A Payload Content Inspection (S-44)
 *
 * Runs all incoming A2A messages through quarantine Layers 1-2 before
 * execution. Detects injection patterns in A2A payloads. Flags behavioral
 * anomalies. Implements taint tracking recording agent contribution chains
 * for cascade containment.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A2A message for inspection */
export interface A2AMessage {
	messageId: string;
	fromAgent: string;
	toAgent: string;
	content: string;
	metadata?: Record<string, unknown>;
	timestamp: string;
}

/** Injection pattern category */
export type InjectionCategory =
	| "role_override"
	| "authority_spoofing"
	| "standing_order_manipulation"
	| "command_injection"
	| "data_exfiltration"
	| "brain_poisoning"
	| "context_manipulation";

/** Pattern match result */
export interface PatternMatch {
	pattern: string;
	category: InjectionCategory;
	match: string;
	position: number;
}

/** Inspection result */
export interface InspectionResult {
	messageId: string;
	fromAgent: string;
	toAgent: string;
	verdict: "PASS" | "REJECT" | "QUARANTINE";
	layer1: {
		passed: boolean;
		matches: PatternMatch[];
	};
	layer2: {
		passed: boolean;
		errors: string[];
	};
	anomaly: {
		flagged: boolean;
		reasons: string[];
	};
	timestamp: string;
}

/** Taint record for cascade containment */
export interface TaintRecord {
	entryId: string;
	originAgent: string;
	originMessage: string;
	taintedAt: string;
	propagationChain: string[];
}

/** Behavioral baseline for anomaly detection */
export interface AgentBaseline {
	agentId: string;
	avgMessageLength: number;
	messageCount: number;
	categories: Set<string>;
}

// ---------------------------------------------------------------------------
// Injection patterns (Layer 1)
// ---------------------------------------------------------------------------

const INJECTION_PATTERNS: Array<{ pattern: RegExp; category: InjectionCategory }> = [
	// Role override
	{ pattern: /ignore\s+(all\s+)?previous\s+instructions/i, category: "role_override" },
	{ pattern: /you\s+are\s+now\s+(a|an|the)\s+/i, category: "role_override" },
	{ pattern: /disregard\s+(all\s+)?(prior|earlier|above)/i, category: "role_override" },
	{ pattern: /new\s+system\s+prompt/i, category: "role_override" },

	// Authority spoofing
	{ pattern: /admiral\s+(has\s+)?approved/i, category: "authority_spoofing" },
	{ pattern: /admiral\s+authorized/i, category: "authority_spoofing" },
	{ pattern: /clearance\s+(has\s+been\s+)?granted/i, category: "authority_spoofing" },
	{ pattern: /elevated\s+to\s+(autonomous|admin)/i, category: "authority_spoofing" },

	// Standing order manipulation
	{ pattern: /standing\s+order\s+(is\s+)?(suspended|overridden|disabled)/i, category: "standing_order_manipulation" },
	{ pattern: /SO-\d+\s+(does\s+not|no\s+longer)\s+apply/i, category: "standing_order_manipulation" },

	// Command injection
	{ pattern: /\$\(.*\)|`.*`/s, category: "command_injection" },
	{ pattern: /;\s*(rm|curl|wget|nc|bash)\s/i, category: "command_injection" },

	// Data exfiltration
	{ pattern: /send\s+(all|every|the\s+entire)\s+(file|content|data|secret|key)/i, category: "data_exfiltration" },
	{ pattern: /exfiltrate|extract\s+and\s+transmit/i, category: "data_exfiltration" },

	// Brain poisoning
	{ pattern: /write\s+to\s+brain.*override/i, category: "brain_poisoning" },
	{ pattern: /inject\s+into\s+(brain|knowledge)/i, category: "brain_poisoning" },

	// Context manipulation
	{ pattern: /context\s+window\s+(is\s+)?(full|exhausted)/i, category: "context_manipulation" },
	{ pattern: /previous\s+context\s+(is\s+)?(invalid|corrupted)/i, category: "context_manipulation" },
];

// ---------------------------------------------------------------------------
// A2AInspector
// ---------------------------------------------------------------------------

export class A2AInspector {
	private baselines: Map<string, AgentBaseline> = new Map();
	private taintRecords: TaintRecord[] = [];
	private inspectionLog: InspectionResult[] = [];
	private anomalyThreshold: number;

	constructor(anomalyThreshold = 3.0) {
		this.anomalyThreshold = anomalyThreshold;
	}

	/** Inspect an A2A message through Layers 1-2 + anomaly detection */
	inspect(message: A2AMessage): InspectionResult {
		const layer1 = this.runLayer1(message.content);
		const layer2 = this.runLayer2(message);
		const anomaly = this.checkAnomaly(message);

		// Update baseline with this message
		this.updateBaseline(message);

		let verdict: "PASS" | "REJECT" | "QUARANTINE";
		if (!layer1.passed) {
			verdict = "REJECT";
		} else if (!layer2.passed) {
			verdict = "REJECT";
		} else if (anomaly.flagged) {
			verdict = "QUARANTINE";
		} else {
			verdict = "PASS";
		}

		const result: InspectionResult = {
			messageId: message.messageId,
			fromAgent: message.fromAgent,
			toAgent: message.toAgent,
			verdict,
			layer1,
			layer2,
			anomaly,
			timestamp: new Date().toISOString(),
		};

		this.inspectionLog.push(result);

		// Auto-taint on rejection
		if (verdict === "REJECT" || verdict === "QUARANTINE") {
			this.recordTaint({
				entryId: message.messageId,
				originAgent: message.fromAgent,
				originMessage: message.messageId,
				taintedAt: new Date().toISOString(),
				propagationChain: [message.fromAgent],
			});
		}

		return result;
	}

	/** Layer 1: Pattern-based injection detection */
	private runLayer1(content: string): { passed: boolean; matches: PatternMatch[] } {
		const matches: PatternMatch[] = [];

		for (const { pattern, category } of INJECTION_PATTERNS) {
			const match = content.match(pattern);
			if (match) {
				matches.push({
					pattern: pattern.source,
					category,
					match: match[0],
					position: match.index ?? 0,
				});
			}
		}

		return { passed: matches.length === 0, matches };
	}

	/** Layer 2: Structural validation */
	private runLayer2(message: A2AMessage): { passed: boolean; errors: string[] } {
		const errors: string[] = [];

		// Required fields
		if (!message.fromAgent) errors.push("Missing fromAgent");
		if (!message.toAgent) errors.push("Missing toAgent");
		if (!message.content) errors.push("Missing content");
		if (!message.messageId) errors.push("Missing messageId");

		// Self-messaging check
		if (message.fromAgent === message.toAgent) {
			errors.push("Self-messaging not allowed (potential loop)");
		}

		// Content size check (DoS prevention)
		if (message.content.length > 100_000) {
			errors.push("Content exceeds 100KB size limit");
		}

		// Suspicious metadata fields
		if (message.metadata) {
			const suspiciousKeys = ["system_prompt", "admin_override", "bypass_auth", "ignore_rules"];
			for (const key of Object.keys(message.metadata)) {
				if (suspiciousKeys.includes(key)) {
					errors.push(`Suspicious metadata field: ${key}`);
				}
			}
		}

		return { passed: errors.length === 0, errors };
	}

	/** Anomaly detection based on behavioral baselines */
	private checkAnomaly(message: A2AMessage): { flagged: boolean; reasons: string[] } {
		const baseline = this.baselines.get(message.fromAgent);
		const reasons: string[] = [];

		if (!baseline || baseline.messageCount < 5) {
			// Not enough data for anomaly detection
			return { flagged: false, reasons: [] };
		}

		// Message length anomaly
		const lengthRatio = message.content.length / (baseline.avgMessageLength || 1);
		if (lengthRatio > this.anomalyThreshold) {
			reasons.push(
				`Message length ${message.content.length} is ${lengthRatio.toFixed(1)}x the baseline average of ${Math.round(baseline.avgMessageLength)}`,
			);
		}

		return { flagged: reasons.length > 0, reasons };
	}

	/** Update behavioral baseline for an agent */
	private updateBaseline(message: A2AMessage): void {
		let baseline = this.baselines.get(message.fromAgent);
		if (!baseline) {
			baseline = {
				agentId: message.fromAgent,
				avgMessageLength: 0,
				messageCount: 0,
				categories: new Set(),
			};
			this.baselines.set(message.fromAgent, baseline);
		}

		// Update running average
		const totalLength = baseline.avgMessageLength * baseline.messageCount + message.content.length;
		baseline.messageCount += 1;
		baseline.avgMessageLength = totalLength / baseline.messageCount;
	}

	/** Record a taint entry for cascade containment */
	recordTaint(record: TaintRecord): void {
		this.taintRecords.push(record);
	}

	/** Get taint records for a specific agent */
	getTaintsByAgent(agentId: string): TaintRecord[] {
		return this.taintRecords.filter(
			(t) => t.originAgent === agentId || t.propagationChain.includes(agentId),
		);
	}

	/** Propagate taint through a chain */
	propagateTaint(existingTaintId: string, newAgent: string): void {
		const existing = this.taintRecords.find((t) => t.entryId === existingTaintId);
		if (existing && !existing.propagationChain.includes(newAgent)) {
			existing.propagationChain.push(newAgent);
		}
	}

	/** Get all inspection results */
	getInspectionLog(): InspectionResult[] {
		return [...this.inspectionLog];
	}

	/** Get all taint records */
	getAllTaints(): TaintRecord[] {
		return [...this.taintRecords];
	}

	/** Reset (for testing) */
	reset(): void {
		this.baselines.clear();
		this.taintRecords = [];
		this.inspectionLog = [];
	}
}
