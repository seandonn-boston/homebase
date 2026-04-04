/**
 * Fleet tools — status, registry query, and task routing.
 *
 * Reads from capability-registry.json and produces routing recommendations.
 */

import * as fs from "node:fs";
import { INVALID_PARAMS } from "../protocol.js";
import type { ToolRegistry } from "../tool-registry.js";
import { TOOL_SCHEMAS } from "./tool-schemas.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentCapabilityEntry {
	id: string;
	name: string;
	role: string;
	modelTier?: string;
	capabilities: string[];
	status?: string; // "active" | "idle" | "error"
	taskState?: string; // "working" | "idle" | "blocked"
	health?: string; // "healthy" | "degraded" | "error"
}

export interface AgentStatus {
	id: string;
	name: string;
	role: string;
	status: string;
	health: string;
	taskState: string;
}

export interface AgentMatch {
	id: string;
	name: string;
	role: string;
	modelTier: string;
	capabilities: string[];
	relevance: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadRegistry(registryPath: string): AgentCapabilityEntry[] {
	try {
		const raw = fs.readFileSync(registryPath, "utf-8");
		const data = JSON.parse(raw);
		// Handle both array and { agents: [...] } formats
		if (Array.isArray(data)) return data;
		if (data && Array.isArray(data.agents)) return data.agents;
		return [];
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerFleetTools(
	registry: ToolRegistry,
	registryPath: string,
): void {
	// -----------------------------------------------------------------------
	// fleet_status — agent+
	// -----------------------------------------------------------------------
	registry.register(
		{
			name: "fleet_status",
			description: "Get fleet agent status with optional filters",
			inputSchema: TOOL_SCHEMAS.fleet_status.input,
			outputSchema: TOOL_SCHEMAS.fleet_status.output,
			requiredRole: "agent",
			category: "fleet",
		},
		async (params: Record<string, unknown>): Promise<unknown> => {
			const agents = loadRegistry(registryPath);
			const filter = (params.filter ?? {}) as Record<string, unknown>;

			const statuses: AgentStatus[] = [];
			let active = 0;
			let idle = 0;
			let errorCount = 0;

			for (const agent of agents) {
				const status = agent.status ?? "idle";
				const health = agent.health ?? "healthy";
				const taskState = agent.taskState ?? "idle";

				// Apply filters
				if (filter.role && agent.role !== filter.role) continue;
				if (filter.health && health !== filter.health) continue;
				if (filter.taskState && taskState !== filter.taskState) continue;

				statuses.push({
					id: agent.id,
					name: agent.name,
					role: agent.role,
					status,
					health,
					taskState,
				});

				if (status === "active") active++;
				else if (status === "error") errorCount++;
				else idle++;
			}

			return {
				agents: statuses,
				summary: {
					total: statuses.length,
					active,
					idle,
					error: errorCount,
				},
			};
		},
	);

	// -----------------------------------------------------------------------
	// agent_registry — universal
	// -----------------------------------------------------------------------
	registry.register(
		{
			name: "agent_registry",
			description: "Query the agent capability registry",
			inputSchema: TOOL_SCHEMAS.agent_registry.input,
			outputSchema: TOOL_SCHEMAS.agent_registry.output,
			category: "fleet",
		},
		async (params: Record<string, unknown>): Promise<unknown> => {
			const agents = loadRegistry(registryPath);
			const reqCaps = (params.capabilities as string[]) ?? [];
			const reqRole = params.role as string | undefined;
			const reqTier = params.modelTier as string | undefined;

			const matches: AgentMatch[] = [];

			for (const agent of agents) {
				if (reqRole && agent.role !== reqRole) continue;
				if (reqTier && agent.modelTier !== reqTier) continue;

				// Compute relevance based on capability overlap
				let relevance = 1; // base relevance
				if (reqCaps.length > 0) {
					const overlap = reqCaps.filter((c) =>
						agent.capabilities.includes(c),
					).length;
					if (overlap === 0) continue;
					relevance = overlap / reqCaps.length;
				}

				matches.push({
					id: agent.id,
					name: agent.name,
					role: agent.role,
					modelTier: agent.modelTier ?? "unknown",
					capabilities: agent.capabilities,
					relevance,
				});
			}

			// Sort by relevance descending
			matches.sort((a, b) => b.relevance - a.relevance);

			return { agents: matches, total: matches.length };
		},
	);

	// -----------------------------------------------------------------------
	// task_route — agent+
	// -----------------------------------------------------------------------
	registry.register(
		{
			name: "task_route",
			description: "Recommend an agent for a task (read-only, does not assign)",
			inputSchema: TOOL_SCHEMAS.task_route.input,
			outputSchema: TOOL_SCHEMAS.task_route.output,
			requiredRole: "agent",
			category: "fleet",
		},
		async (params: Record<string, unknown>): Promise<unknown> => {
			const agents = loadRegistry(registryPath);
			const taskType = params.taskType as string | undefined;
			const filePaths = (params.filePaths as string[]) ?? [];
			const requiredCaps = (params.requiredCapabilities as string[]) ?? [];

			if (agents.length === 0) {
				return {
					recommendation: {
						agent: "none",
						strategy: "no-agents-available",
						confidence: 0,
						fallback: null,
						reasoning: "No agents found in capability registry",
					},
				};
			}

			// Score each agent
			const scored = agents.map((agent) => {
				let score = 0;
				const reasons: string[] = [];

				// Capability match
				if (requiredCaps.length > 0) {
					const overlap = requiredCaps.filter((c) =>
						agent.capabilities.includes(c),
					).length;
					score += (overlap / requiredCaps.length) * 50;
					if (overlap > 0)
						reasons.push(
							`${overlap}/${requiredCaps.length} capabilities match`,
						);
				} else {
					score += 25; // No specific caps required, everyone gets base
				}

				// Task type heuristic: if agent capabilities include the task type
				if (taskType && agent.capabilities.includes(taskType)) {
					score += 30;
					reasons.push(`specializes in ${taskType}`);
				}

				// File path heuristic: agents with "code" capability for code files
				if (filePaths.length > 0) {
					const hasCodeCap = agent.capabilities.some((c) =>
						["code", "coding", "development", "implementation"].includes(c),
					);
					if (hasCodeCap) {
						score += 10;
						reasons.push("has code capabilities for file operations");
					}
				}

				// Prefer healthy, idle agents
				if (agent.status === "idle" || agent.taskState === "idle") {
					score += 10;
					reasons.push("currently idle");
				}
				if (agent.health === "error") {
					score -= 20;
					reasons.push("health is error");
				}

				return { agent, score, reasons };
			});

			scored.sort((a, b) => b.score - a.score);

			const best = scored[0];
			const fallbackAgent = scored.length > 1 ? scored[1] : null;

			return {
				recommendation: {
					agent: best.agent.id,
					strategy: taskType ? `specialized-${taskType}` : "best-fit",
					confidence: Math.min(best.score / 100, 1),
					fallback: fallbackAgent ? fallbackAgent.agent.id : null,
					reasoning: best.reasons.join("; ") || "default selection",
				},
			};
		},
	);
}
