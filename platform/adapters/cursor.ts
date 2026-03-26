/**
 * Cursor IDE Platform Adapter (PA-03)
 *
 * Translates Admiral governance into Cursor's .cursorrules format.
 * Limited capability — no hooks or tool permissions, context injection
 * via .cursorrules file, MCP server support.
 */

import {
	type AdapterEvent,
	type ContextInjection,
	type EventCallback,
	type HookPayload,
	type HookResult,
	PlatformAdapter,
	type PlatformCapabilities,
} from "../adapter-interface";

export class CursorAdapter extends PlatformAdapter {
	readonly platformId = "cursor";
	readonly platformName = "Cursor IDE";
	readonly capabilities: PlatformCapabilities = {
		hooks: false,
		contextInjection: true,
		toolPermissions: false,
		configLoading: true,
		eventEmission: false,
		subagentCoordination: false,
		mcpServer: true,
	};

	private config: Record<string, unknown> = {};
	private initialized = false;

	/** Exposed for testing */
	_lastInjectedContext = "";

	async initialize(config: Record<string, unknown>): Promise<void> {
		this.config = { ...config };
		this.initialized = true;
	}

	async shutdown(): Promise<void> {
		this.config = {};
		this.initialized = false;
	}

	async executeHook(_payload: HookPayload): Promise<HookResult> {
		return { allow: false, message: "Hooks not supported on Cursor" };
	}

	/**
	 * Inject context by generating .cursorrules content.
	 */
	async injectContext(
		_agentId: string,
		context: ContextInjection,
	): Promise<void> {
		if (!this.initialized) {
			throw new Error("Adapter not initialized");
		}

		this._lastInjectedContext = this.generateCursorRules(context.standing, [
			...context.session,
			...context.working,
		]);
	}

	async checkToolPermission(_agentId: string, _tool: string): Promise<boolean> {
		// Cursor has no tool permission system — always allow
		return true;
	}

	async loadConfig(_path: string): Promise<Record<string, unknown>> {
		return { ...this.config };
	}

	on(_event: string, _callback: EventCallback): void {
		// Event emission not supported on Cursor
	}

	emit(_event: AdapterEvent): void {
		// Event emission not supported on Cursor
	}

	/**
	 * Generate .cursorrules content from Admiral standing orders and constraints.
	 */
	generateCursorRules(standingOrders: string[], constraints: string[]): string {
		const lines: string[] = [];
		lines.push("# Admiral Framework Governance");
		lines.push("# Auto-generated — do not edit manually");
		lines.push("");

		if (standingOrders.length > 0) {
			lines.push("## Standing Orders");
			for (const order of standingOrders) {
				lines.push(`- ${order}`);
			}
			lines.push("");
		}

		if (constraints.length > 0) {
			lines.push("## Constraints");
			for (const constraint of constraints) {
				lines.push(`- ${constraint}`);
			}
			lines.push("");
		}

		return lines.join("\n");
	}
}
