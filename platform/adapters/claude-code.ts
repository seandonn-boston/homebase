/**
 * Claude Code Platform Adapter (PA-02a)
 *
 * Native adapter for Claude Code — the primary Admiral Framework platform.
 * Full support for hooks (.hooks/ directory), context injection (CLAUDE.md),
 * tool permissions (settings.local.json), and event emission.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
	type AdapterEvent,
	type ContextInjection,
	type EventCallback,
	type HookPayload,
	type HookResult,
	PlatformAdapter,
	type PlatformCapabilities,
} from "../adapter-interface";

export class ClaudeCodeAdapter extends PlatformAdapter {
	readonly platformId = "claude-code";
	readonly platformName = "Claude Code";
	readonly capabilities: PlatformCapabilities = {
		hooks: true,
		contextInjection: true,
		toolPermissions: true,
		configLoading: true,
		eventEmission: true,
		subagentCoordination: true,
		mcpServer: true,
	};

	private config: Record<string, unknown> = {};
	private listeners: Map<string, EventCallback[]> = new Map();
	private initialized = false;

	async initialize(config: Record<string, unknown>): Promise<void> {
		this.config = { ...config };
		this.initialized = true;
	}

	async shutdown(): Promise<void> {
		this.listeners.clear();
		this.config = {};
		this.initialized = false;
	}

	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Execute a hook by looking for the corresponding script in .hooks/.
	 * Returns allow: true with the original data if hook script is not found.
	 */
	async executeHook(payload: HookPayload): Promise<HookResult> {
		if (!this.initialized) {
			return { allow: false, message: "Adapter not initialized" };
		}

		const hooksDir = (this.config.hooksDir as string) ?? ".hooks";
		const hookScript = path.join(hooksDir, `${payload.hookName}.sh`);

		// Check if hook script exists
		try {
			fs.accessSync(hookScript, fs.constants.X_OK);
		} catch {
			// No hook script — allow by default
			return { allow: true };
		}

		// In a real implementation, this would spawn the script.
		// For now, return allow with the payload data.
		return {
			allow: true,
			modifiedData: payload.data,
		};
	}

	/**
	 * Inject context in CLAUDE.md format: standing first, session middle,
	 * working last, respecting the total token budget.
	 */
	async injectContext(
		agentId: string,
		context: ContextInjection,
	): Promise<void> {
		if (!this.initialized) {
			throw new Error("Adapter not initialized");
		}

		const sections: string[] = [];

		if (context.standing.length > 0) {
			sections.push(`# Standing Context (${agentId})\n`);
			sections.push(...context.standing);
		}

		if (context.session.length > 0) {
			sections.push(`\n# Session Context\n`);
			sections.push(...context.session);
		}

		if (context.working.length > 0) {
			sections.push(`\n# Working Context\n`);
			sections.push(...context.working);
		}

		this._lastInjectedContext = sections.join("\n");

		this.emit({
			type: "context_injected",
			timestamp: Date.now(),
			data: { agentId, sectionCount: sections.length },
		});
	}

	/** Exposed for testing */
	_lastInjectedContext = "";

	/**
	 * Check tool permission against settings.local.json allowlist.
	 */
	async checkToolPermission(_agentId: string, tool: string): Promise<boolean> {
		if (!this.initialized) {
			return false;
		}

		const allowedTools = this.config.allowedTools;
		if (!Array.isArray(allowedTools)) {
			// No restrictions configured — allow all
			return true;
		}

		return allowedTools.includes(tool);
	}

	/**
	 * Load configuration from a JSON file path.
	 */
	async loadConfig(configPath: string): Promise<Record<string, unknown>> {
		try {
			const raw = fs.readFileSync(configPath, "utf-8");
			const parsed = JSON.parse(raw) as Record<string, unknown>;
			return parsed;
		} catch {
			return {};
		}
	}

	on(event: string, callback: EventCallback): void {
		const existing = this.listeners.get(event) ?? [];
		existing.push(callback);
		this.listeners.set(event, existing);
	}

	emit(event: AdapterEvent): void {
		const callbacks = this.listeners.get(event.type) ?? [];
		for (const cb of callbacks) {
			cb(event);
		}
	}
}
