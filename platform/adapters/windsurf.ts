/**
 * Windsurf/Codeium Platform Adapter (PA-04)
 *
 * Translates Admiral governance into Windsurf's .windsurfrules format.
 * Similar capability profile to Cursor — context injection and MCP only.
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

export class WindsurfAdapter extends PlatformAdapter {
	readonly platformId = "windsurf";
	readonly platformName = "Windsurf/Codeium";
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
		return { allow: false, message: "Hooks not supported on Windsurf" };
	}

	async injectContext(
		_agentId: string,
		context: ContextInjection,
	): Promise<void> {
		if (!this.initialized) {
			throw new Error("Adapter not initialized");
		}

		this._lastInjectedContext = this.generateWindsurfRules(context.standing, [
			...context.session,
			...context.working,
		]);
	}

	async checkToolPermission(_agentId: string, _tool: string): Promise<boolean> {
		return true;
	}

	async loadConfig(_path: string): Promise<Record<string, unknown>> {
		return { ...this.config };
	}

	on(_event: string, _callback: EventCallback): void {
		// Not supported
	}

	emit(_event: AdapterEvent): void {
		// Not supported
	}

	/**
	 * Generate .windsurfrules content from Admiral governance.
	 */
	generateWindsurfRules(
		standingOrders: string[],
		constraints: string[],
	): string {
		const lines: string[] = [];
		lines.push("# Admiral Framework Governance for Windsurf");
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
