/**
 * MCP Server configuration — load, merge, and validate.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpServerFullConfig {
	port: number;
	transport: "stdio" | "http";
	tools: {
		enabled: string[]; // tool names to enable, "*" for all
		disabled: string[]; // overrides enabled
	};
	auth: {
		secret: string;
		tokenTtlMs: number;
		requireAuth: boolean;
	};
	brain: {
		directory: string;
	};
	fleet: {
		registryPath: string;
	};
	governance: {
		standingOrdersDir: string;
	};
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULTS: McpServerFullConfig = {
	port: 3100,
	transport: "stdio",
	tools: {
		enabled: ["*"],
		disabled: [],
	},
	auth: {
		secret: "",
		tokenTtlMs: 3_600_000, // 1 hour
		requireAuth: true,
	},
	brain: {
		directory: ".brain/helm",
	},
	fleet: {
		registryPath: "fleet/agents/capability-registry.json",
	},
	governance: {
		standingOrdersDir: "admiral/standing-orders",
	},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deepMerge(
	base: Record<string, any>,
	overrides: Record<string, any>,
): any {
	const result = { ...base };
	for (const key of Object.keys(overrides)) {
		const val = overrides[key];
		if (val === undefined) continue;
		if (
			typeof val === "object" &&
			val !== null &&
			!Array.isArray(val) &&
			typeof base[key] === "object" &&
			base[key] !== null &&
			!Array.isArray(base[key])
		) {
			result[key] = deepMerge(base[key], val);
		} else {
			result[key] = val;
		}
	}
	return result;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Load configuration by merging defaults with optional overrides.
 */
export function loadConfig(
	overrides?: Partial<McpServerFullConfig>,
): McpServerFullConfig {
	if (!overrides)
		return {
			...DEFAULTS,
			tools: { ...DEFAULTS.tools },
			auth: { ...DEFAULTS.auth },
			brain: { ...DEFAULTS.brain },
			fleet: { ...DEFAULTS.fleet },
			governance: { ...DEFAULTS.governance },
		};
	return deepMerge(DEFAULTS, overrides);
}

/**
 * Validate a configuration object. Returns an array of error strings
 * (empty if valid).
 */
export function validateConfig(config: McpServerFullConfig): string[] {
	const errors: string[] = [];

	if (
		typeof config.port !== "number" ||
		config.port < 1 ||
		config.port > 65535
	) {
		errors.push("port must be a number between 1 and 65535");
	}

	if (config.transport !== "stdio" && config.transport !== "http") {
		errors.push('transport must be "stdio" or "http"');
	}

	if (!Array.isArray(config.tools.enabled)) {
		errors.push("tools.enabled must be an array");
	}

	if (!Array.isArray(config.tools.disabled)) {
		errors.push("tools.disabled must be an array");
	}

	if (config.auth.requireAuth && !config.auth.secret) {
		errors.push("auth.secret is required when auth.requireAuth is true");
	}

	if (
		typeof config.auth.tokenTtlMs !== "number" ||
		config.auth.tokenTtlMs <= 0
	) {
		errors.push("auth.tokenTtlMs must be a positive number");
	}

	if (typeof config.brain.directory !== "string" || !config.brain.directory) {
		errors.push("brain.directory must be a non-empty string");
	}

	if (
		typeof config.fleet.registryPath !== "string" ||
		!config.fleet.registryPath
	) {
		errors.push("fleet.registryPath must be a non-empty string");
	}

	if (
		typeof config.governance.standingOrdersDir !== "string" ||
		!config.governance.standingOrdersDir
	) {
		errors.push("governance.standingOrdersDir must be a non-empty string");
	}

	return errors;
}
