/**
 * Data Classification Tags & Cross-Server Flow Control (S-45)
 *
 * Defines sensitivity labels enforced at data origin. Server sensitivity
 * ceilings are configurable. Cross-classification transfers require Admiral
 * approval gates. Provenance tracking follows data through the pipeline.
 *
 * Levels (ordered by sensitivity, lowest to highest):
 *   PUBLIC < INTERNAL < CONFIDENTIAL < RESTRICTED
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Data sensitivity levels, ordered from least to most sensitive */
export type SensitivityLevel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

/** Numeric ordering for comparison */
const SENSITIVITY_ORDER: Record<SensitivityLevel, number> = {
	PUBLIC: 0,
	INTERNAL: 1,
	CONFIDENTIAL: 2,
	RESTRICTED: 3,
};

/** Classification tag attached to data at origin */
export interface ClassificationTag {
	level: SensitivityLevel;
	sourceServer: string;
	sourceAgent: string;
	classifiedAt: string;
	reason?: string;
}

/** Provenance entry tracking data flow through the pipeline */
export interface ProvenanceEntry {
	server: string;
	agent: string;
	action: "read" | "write" | "transform" | "transfer";
	timestamp: string;
	classification: SensitivityLevel;
}

/** Full provenance chain for a piece of data */
export interface ProvenanceChain {
	originTag: ClassificationTag;
	chain: ProvenanceEntry[];
}

/** Server sensitivity ceiling configuration */
export interface ServerSensitivityConfig {
	serverName: string;
	maxReceiveCeiling: SensitivityLevel;
	defaultOutputClassification: SensitivityLevel;
}

/** Result of a flow control check */
export interface FlowCheckResult {
	allowed: boolean;
	reason: string;
	sourceLevel: SensitivityLevel;
	targetCeiling: SensitivityLevel;
	requiresApproval: boolean;
}

/** Transfer approval record */
export interface TransferApproval {
	id: string;
	fromServer: string;
	toServer: string;
	dataClassification: SensitivityLevel;
	approvedBy: string;
	approvedAt: string;
	expiresAt?: string;
}

// ---------------------------------------------------------------------------
// DataClassifier
// ---------------------------------------------------------------------------

export class DataClassifier {
	private serverConfigs: Map<string, ServerSensitivityConfig> = new Map();
	private approvals: Map<string, TransferApproval> = new Map();
	private violations: FlowCheckResult[] = [];

	/** Register a server's sensitivity configuration */
	registerServer(config: ServerSensitivityConfig): void {
		this.serverConfigs.set(config.serverName, config);
	}

	/** Classify data at its origin */
	classify(
		content: string,
		sourceServer: string,
		sourceAgent: string,
		explicitLevel?: SensitivityLevel,
	): ClassificationTag {
		const serverConfig = this.serverConfigs.get(sourceServer);
		const level =
			explicitLevel ?? serverConfig?.defaultOutputClassification ?? "INTERNAL";

		return {
			level,
			sourceServer,
			sourceAgent,
			classifiedAt: new Date().toISOString(),
		};
	}

	/** Check if data can flow from source to target server */
	checkFlow(
		tag: ClassificationTag,
		targetServer: string,
	): FlowCheckResult {
		const targetConfig = this.serverConfigs.get(targetServer);

		if (!targetConfig) {
			return {
				allowed: false,
				reason: `Target server '${targetServer}' has no sensitivity configuration`,
				sourceLevel: tag.level,
				targetCeiling: "PUBLIC",
				requiresApproval: false,
			};
		}

		const sourceOrder = SENSITIVITY_ORDER[tag.level];
		const ceilingOrder = SENSITIVITY_ORDER[targetConfig.maxReceiveCeiling];

		if (sourceOrder <= ceilingOrder) {
			return {
				allowed: true,
				reason: `${tag.level} data allowed — within ${targetConfig.maxReceiveCeiling} ceiling`,
				sourceLevel: tag.level,
				targetCeiling: targetConfig.maxReceiveCeiling,
				requiresApproval: false,
			};
		}

		// Check for pre-approved transfers
		const approvalKey = `${tag.sourceServer}:${targetServer}:${tag.level}`;
		const approval = this.approvals.get(approvalKey);
		if (approval) {
			if (!approval.expiresAt || new Date(approval.expiresAt) > new Date()) {
				return {
					allowed: true,
					reason: `Cross-classification transfer approved by ${approval.approvedBy}`,
					sourceLevel: tag.level,
					targetCeiling: targetConfig.maxReceiveCeiling,
					requiresApproval: false,
				};
			}
		}

		const result: FlowCheckResult = {
			allowed: false,
			reason: `${tag.level} data exceeds ${targetServer} ceiling of ${targetConfig.maxReceiveCeiling} — Admiral approval required`,
			sourceLevel: tag.level,
			targetCeiling: targetConfig.maxReceiveCeiling,
			requiresApproval: true,
		};

		this.violations.push(result);
		return result;
	}

	/** Record an Admiral approval for a cross-classification transfer */
	recordApproval(approval: TransferApproval): void {
		const key = `${approval.fromServer}:${approval.toServer}:${approval.dataClassification}`;
		this.approvals.set(key, approval);
	}

	/** Create a new provenance chain from an origin classification */
	createProvenanceChain(tag: ClassificationTag): ProvenanceChain {
		return {
			originTag: tag,
			chain: [
				{
					server: tag.sourceServer,
					agent: tag.sourceAgent,
					action: "write",
					timestamp: tag.classifiedAt,
					classification: tag.level,
				},
			],
		};
	}

	/** Append a provenance entry to an existing chain */
	appendProvenance(
		chain: ProvenanceChain,
		entry: Omit<ProvenanceEntry, "classification">,
	): ProvenanceChain {
		return {
			...chain,
			chain: [
				...chain.chain,
				{ ...entry, classification: chain.originTag.level },
			],
		};
	}

	/** Compare two sensitivity levels */
	static compareLevels(a: SensitivityLevel, b: SensitivityLevel): number {
		return SENSITIVITY_ORDER[a] - SENSITIVITY_ORDER[b];
	}

	/** Check if a level is valid */
	static isValidLevel(level: string): level is SensitivityLevel {
		return level in SENSITIVITY_ORDER;
	}

	/** Get all recorded violations */
	getViolations(): FlowCheckResult[] {
		return [...this.violations];
	}

	/** Get server configuration */
	getServerConfig(serverName: string): ServerSensitivityConfig | undefined {
		return this.serverConfigs.get(serverName);
	}

	/** Get all registered server configs */
	getAllServerConfigs(): ServerSensitivityConfig[] {
		return Array.from(this.serverConfigs.values());
	}

	/** Reset state (for testing) */
	reset(): void {
		this.serverConfigs.clear();
		this.approvals.clear();
		this.violations = [];
	}
}
