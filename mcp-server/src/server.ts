/**
 * McpServer — main entry point that wires the ToolRegistry to a transport.
 */

import type { ToolDefinition, ToolHandler } from "./tool-registry.js";
import { ToolRegistry } from "./tool-registry.js";
import { HttpTransport } from "./transport-http.js";
import { StdioTransport } from "./transport-stdio.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface McpServerConfig {
	port?: number; // default 3100
	transport?: "stdio" | "http";
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

export class McpServer {
	private registry: ToolRegistry;
	private config: Required<McpServerConfig>;
	private stdioTransport: StdioTransport | null = null;
	private httpTransport: HttpTransport | null = null;

	constructor(config: McpServerConfig = {}) {
		this.config = {
			port: config.port ?? 3100,
			transport: config.transport ?? "stdio",
		};
		this.registry = new ToolRegistry();
	}

	/**
	 * Register a tool on the server.
	 */
	registerTool(definition: ToolDefinition, handler: ToolHandler): void {
		this.registry.register(definition, handler);
	}

	/**
	 * Start the server with the specified transport (overrides config).
	 */
	async start(transport?: "stdio" | "http"): Promise<void> {
		const mode = transport ?? this.config.transport;

		if (mode === "stdio") {
			this.stdioTransport = new StdioTransport(this.registry);
			this.stdioTransport.start();
		} else {
			this.httpTransport = new HttpTransport(this.registry, this.config.port);
			await this.httpTransport.start();
		}
	}

	/**
	 * Stop the server and release resources.
	 */
	async stop(): Promise<void> {
		if (this.stdioTransport) {
			this.stdioTransport.stop();
			this.stdioTransport = null;
		}
		if (this.httpTransport) {
			await this.httpTransport.stop();
			this.httpTransport = null;
		}
	}

	/**
	 * Access the underlying registry (for testing or advanced use).
	 */
	getRegistry(): ToolRegistry {
		return this.registry;
	}
}
