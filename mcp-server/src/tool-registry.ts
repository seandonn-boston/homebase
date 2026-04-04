/**
 * MCP Tool Registry — discovery, registration, RBAC filtering, and invocation.
 */

import {
	INTERNAL_ERROR,
	INVALID_PARAMS,
	METHOD_NOT_FOUND,
} from "./protocol.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToolDefinition {
	name: string;
	description: string;
	inputSchema: Record<string, unknown>; // JSON Schema
	outputSchema?: Record<string, unknown>;
	requiredRole?: string; // minimum RBAC role
	category: "brain" | "fleet" | "governance" | "system";
}

export type ToolHandler = (
	params: Record<string, unknown>,
	context: ToolContext,
) => Promise<unknown>;

export interface ToolContext {
	agentId: string;
	role: string;
	sessionId: string;
	requestId: string;
}

// ---------------------------------------------------------------------------
// Role hierarchy (higher index = more privilege)
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: readonly string[] = [
	"observer",
	"agent",
	"lieutenant",
	"admiral",
] as const;

function roleIndex(role: string): number {
	const idx = ROLE_HIERARCHY.indexOf(role);
	return idx === -1 ? 0 : idx;
}

function hasRole(actual: string, required: string): boolean {
	return roleIndex(actual) >= roleIndex(required);
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

interface RegisteredTool {
	definition: ToolDefinition;
	handler: ToolHandler;
}

export class ToolRegistry {
	private tools = new Map<string, RegisteredTool>();

	/**
	 * Register a tool. Throws if a tool with the same name already exists.
	 */
	register(definition: ToolDefinition, handler: ToolHandler): void {
		if (this.tools.has(definition.name)) {
			throw new Error(`Tool already registered: ${definition.name}`);
		}
		this.tools.set(definition.name, { definition, handler });
	}

	/**
	 * Remove a tool by name.
	 */
	unregister(name: string): void {
		this.tools.delete(name);
	}

	/**
	 * List all tool definitions, optionally filtered by RBAC role.
	 * If a role is provided, only tools whose requiredRole is at or below
	 * the given role are included.
	 */
	listTools(role?: string): ToolDefinition[] {
		const result: ToolDefinition[] = [];
		for (const { definition } of this.tools.values()) {
			if (role !== undefined && definition.requiredRole !== undefined) {
				if (!hasRole(role, definition.requiredRole)) {
					continue;
				}
			}
			result.push(definition);
		}
		return result;
	}

	/**
	 * Invoke a tool by name. Returns the handler's result or throws a
	 * JSON-RPC-shaped error object.
	 */
	async invoke(
		name: string,
		params: Record<string, unknown>,
		context: ToolContext,
	): Promise<unknown> {
		const entry = this.tools.get(name);
		if (!entry) {
			throw { code: METHOD_NOT_FOUND, message: `Tool not found: ${name}` };
		}

		// RBAC check
		if (entry.definition.requiredRole !== undefined) {
			if (!hasRole(context.role, entry.definition.requiredRole)) {
				throw {
					code: INVALID_PARAMS,
					message: `Insufficient role: requires ${entry.definition.requiredRole}, have ${context.role}`,
				};
			}
		}

		try {
			return await entry.handler(params, context);
		} catch (err: unknown) {
			// Re-throw structured errors
			if (
				typeof err === "object" &&
				err !== null &&
				"code" in err &&
				"message" in err
			) {
				throw err;
			}
			throw {
				code: INTERNAL_ERROR,
				message: `Tool execution failed: ${err instanceof Error ? err.message : String(err)}`,
			};
		}
	}

	/**
	 * Get a single tool definition by name.
	 */
	getDefinition(name: string): ToolDefinition | undefined {
		return this.tools.get(name)?.definition;
	}
}
