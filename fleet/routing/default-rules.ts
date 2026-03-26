/**
 * Default routing rules for the Admiral fleet system.
 * Maps 86 task types to primary agents, fallbacks, and constraints.
 * Agent IDs use kebab-case matching the capability registry.
 */

export interface RoutingRule {
	taskType: string;
	primaryAgent: string;
	fallbackAgent: string | null;
	escalationTarget: string;
	constraints: string[];
}

export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
	// ─── Frontend ───────────────────────────────────────────────────────
	{
		taskType: "ui-component-implementation",
		primaryAgent: "frontend-implementer",
		fallbackAgent: "responsive-layout-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "responsive-layout",
		primaryAgent: "responsive-layout-agent",
		fallbackAgent: "frontend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "accessibility-audit",
		primaryAgent: "accessibility-auditor",
		fallbackAgent: "qa-agent",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "interaction-design",
		primaryAgent: "interaction-designer",
		fallbackAgent: "frontend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "state-management",
		primaryAgent: "state-management-agent",
		fallbackAgent: "frontend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "design-system-update",
		primaryAgent: "design-systems-agent",
		fallbackAgent: "frontend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "css-styling",
		primaryAgent: "frontend-implementer",
		fallbackAgent: "responsive-layout-agent",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Backend ────────────────────────────────────────────────────────
	{
		taskType: "api-design",
		primaryAgent: "api-designer",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "api-implementation",
		primaryAgent: "backend-implementer",
		fallbackAgent: "api-designer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "database-schema-design",
		primaryAgent: "database-agent",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "database-migration",
		primaryAgent: "migration-agent",
		fallbackAgent: "database-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "database-query-optimization",
		primaryAgent: "database-agent",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "queue-messaging",
		primaryAgent: "queue-messaging-agent",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "cache-strategy",
		primaryAgent: "cache-strategist",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "background-job",
		primaryAgent: "backend-implementer",
		fallbackAgent: "queue-messaging-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "webhook-implementation",
		primaryAgent: "backend-implementer",
		fallbackAgent: "integration-agent",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Integration ────────────────────────────────────────────────────
	{
		taskType: "third-party-integration",
		primaryAgent: "integration-agent",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "data-migration",
		primaryAgent: "migration-agent",
		fallbackAgent: "data-engineer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "code-refactoring",
		primaryAgent: "refactoring-agent",
		fallbackAgent: "architect",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "dependency-update",
		primaryAgent: "dependency-manager",
		fallbackAgent: "dependency-sentinel",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "dependency-audit",
		primaryAgent: "dependency-sentinel",
		fallbackAgent: "dependency-manager",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},

	// ─── DevOps & Infrastructure ────────────────────────────────────────
	{
		taskType: "ci-cd-pipeline",
		primaryAgent: "devops-agent",
		fallbackAgent: "infrastructure-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "infrastructure-provisioning",
		primaryAgent: "infrastructure-agent",
		fallbackAgent: "devops-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "containerization",
		primaryAgent: "containerization-agent",
		fallbackAgent: "devops-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "monitoring-setup",
		primaryAgent: "observability-agent",
		fallbackAgent: "devops-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "alerting-configuration",
		primaryAgent: "observability-agent",
		fallbackAgent: "devops-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "log-aggregation",
		primaryAgent: "observability-agent",
		fallbackAgent: "devops-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "deployment-automation",
		primaryAgent: "devops-agent",
		fallbackAgent: "release-orchestrator",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Testing & QA ──────────────────────────────────────────────────
	{
		taskType: "unit-test-writing",
		primaryAgent: "unit-test-writer",
		fallbackAgent: "qa-agent",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "integration-test-writing",
		primaryAgent: "qa-agent",
		fallbackAgent: "unit-test-writer",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "e2e-test-writing",
		primaryAgent: "e2e-test-writer",
		fallbackAgent: "qa-agent",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "performance-testing",
		primaryAgent: "performance-tester",
		fallbackAgent: "qa-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "chaos-testing",
		primaryAgent: "chaos-agent",
		fallbackAgent: "qa-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "regression-analysis",
		primaryAgent: "regression-guardian",
		fallbackAgent: "qa-agent",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "contract-test-writing",
		primaryAgent: "contract-test-writer",
		fallbackAgent: "qa-agent",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "test-strategy",
		primaryAgent: "qa-agent",
		fallbackAgent: "architect",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Security ───────────────────────────────────────────────────────
	{
		taskType: "security-audit",
		primaryAgent: "security-auditor",
		fallbackAgent: "penetration-tester",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "penetration-testing",
		primaryAgent: "penetration-tester",
		fallbackAgent: "security-auditor",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "compliance-review",
		primaryAgent: "compliance-agent",
		fallbackAgent: "security-auditor",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "privacy-review",
		primaryAgent: "privacy-agent",
		fallbackAgent: "compliance-agent",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "auth-implementation",
		primaryAgent: "auth-identity-specialist",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "vulnerability-remediation",
		primaryAgent: "security-auditor",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Documentation ─────────────────────────────────────────────────
	{
		taskType: "technical-documentation",
		primaryAgent: "technical-writer",
		fallbackAgent: "architect",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "api-documentation",
		primaryAgent: "technical-writer",
		fallbackAgent: "api-designer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "architecture-diagram",
		primaryAgent: "diagram-agent",
		fallbackAgent: "architect",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "runbook-creation",
		primaryAgent: "technical-writer",
		fallbackAgent: "devops-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "changelog-update",
		primaryAgent: "technical-writer",
		fallbackAgent: "release-orchestrator",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Architecture & Design ─────────────────────────────────────────
	{
		taskType: "architecture-review",
		primaryAgent: "architect",
		fallbackAgent: "admiral",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "system-design",
		primaryAgent: "architect",
		fallbackAgent: "admiral",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "pattern-enforcement",
		primaryAgent: "pattern-enforcer",
		fallbackAgent: "architect",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "role-crystallization",
		primaryAgent: "role-crystallizer",
		fallbackAgent: "architect",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "scope-definition",
		primaryAgent: "admiral",
		fallbackAgent: null,
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Data & Analytics ──────────────────────────────────────────────
	{
		taskType: "data-pipeline",
		primaryAgent: "data-engineer",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "analytics-implementation",
		primaryAgent: "analytics-implementer",
		fallbackAgent: "data-engineer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "ml-model-integration",
		primaryAgent: "ml-engineer",
		fallbackAgent: "data-engineer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "data-validation",
		primaryAgent: "data-validator",
		fallbackAgent: "data-engineer",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "visualization",
		primaryAgent: "visualization-agent",
		fallbackAgent: "frontend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── UX & Research ─────────────────────────────────────────────────
	{
		taskType: "ux-research",
		primaryAgent: "ux-researcher",
		fallbackAgent: "interaction-designer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "user-simulation",
		primaryAgent: "simulated-user",
		fallbackAgent: "ux-researcher",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "copy-writing",
		primaryAgent: "copywriter",
		fallbackAgent: "technical-writer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "seo-optimization",
		primaryAgent: "seo-crawler",
		fallbackAgent: "frontend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Adversarial & Review ──────────────────────────────────────────
	{
		taskType: "devils-advocate-review",
		primaryAgent: "devils-advocate",
		fallbackAgent: "red-team-agent",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "red-team-assessment",
		primaryAgent: "red-team-agent",
		fallbackAgent: "penetration-tester",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "persona-simulation",
		primaryAgent: "persona-agent",
		fallbackAgent: "simulated-user",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "bias-detection",
		primaryAgent: "bias-sentinel",
		fallbackAgent: "devils-advocate",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},
	{
		taskType: "hallucination-audit",
		primaryAgent: "hallucination-auditor",
		fallbackAgent: "qa-agent",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},

	// ─── Operational Health ────────────────────────────────────────────
	{
		taskType: "token-budget-management",
		primaryAgent: "token-budgeter",
		fallbackAgent: "admiral",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "drift-monitoring",
		primaryAgent: "drift-monitor",
		fallbackAgent: "observability-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "loop-detection",
		primaryAgent: "loop-breaker",
		fallbackAgent: "admiral",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "context-health-check",
		primaryAgent: "context-health-monitor",
		fallbackAgent: "context-curator",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "contradiction-detection",
		primaryAgent: "contradiction-detector",
		fallbackAgent: "devils-advocate",
		escalationTarget: "admiral",
		constraints: ["no-self-review"],
	},

	// ─── Release & Operations ──────────────────────────────────────────
	{
		taskType: "release-orchestration",
		primaryAgent: "release-orchestrator",
		fallbackAgent: "devops-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "incident-response",
		primaryAgent: "incident-response-agent",
		fallbackAgent: "devops-agent",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "feature-flag-management",
		primaryAgent: "feature-flag-strategist",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Specialized Domains ───────────────────────────────────────────
	{
		taskType: "internationalization",
		primaryAgent: "internationalization-agent",
		fallbackAgent: "frontend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "search-relevance",
		primaryAgent: "search-relevance-agent",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "payment-billing",
		primaryAgent: "payment-billing-agent",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "real-time-systems",
		primaryAgent: "real-time-systems-agent",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "media-processing",
		primaryAgent: "media-processing-agent",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "notification-orchestration",
		primaryAgent: "notification-orchestrator",
		fallbackAgent: "backend-implementer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "sdk-developer-experience",
		primaryAgent: "sdk-dev-experience-agent",
		fallbackAgent: "api-designer",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "monorepo-management",
		primaryAgent: "monorepo-coordinator",
		fallbackAgent: "devops-agent",
		escalationTarget: "admiral",
		constraints: [],
	},

	// ─── Orchestration & Coordination ──────────────────────────────────
	{
		taskType: "task-triage",
		primaryAgent: "triage-agent",
		fallbackAgent: "admiral",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "conflict-mediation",
		primaryAgent: "mediator",
		fallbackAgent: "admiral",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "context-curation",
		primaryAgent: "context-curator",
		fallbackAgent: "architect",
		escalationTarget: "admiral",
		constraints: [],
	},
	{
		taskType: "fleet-orchestration",
		primaryAgent: "orchestrator",
		fallbackAgent: "admiral",
		escalationTarget: "admiral",
		constraints: [],
	},
];
