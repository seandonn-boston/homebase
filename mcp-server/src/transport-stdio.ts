/**
 * Stdio transport — reads newline-delimited JSON-RPC from stdin,
 * dispatches via ToolRegistry, writes responses to stdout.
 */

import * as readline from "node:readline";
import {
	formatError,
	formatResponse,
	INTERNAL_ERROR,
	PARSE_ERROR,
	parseRequest,
} from "./protocol.js";
import type { ToolContext, ToolRegistry } from "./tool-registry.js";

export class StdioTransport {
	private rl: readline.Interface | null = null;
	private running = false;

	constructor(private registry: ToolRegistry) {}

	start(): void {
		if (this.running) return;
		this.running = true;

		this.rl = readline.createInterface({
			input: process.stdin,
			terminal: false,
		});

		this.rl.on("line", (line: string) => {
			void this.handleLine(line);
		});

		this.rl.on("close", () => {
			this.running = false;
		});
	}

	stop(): void {
		this.running = false;
		if (this.rl) {
			this.rl.close();
			this.rl = null;
		}
	}

	private async handleLine(line: string): Promise<void> {
		const trimmed = line.trim();
		if (trimmed.length === 0) return;

		let id: string | number | null = null;

		try {
			const request = parseRequest(trimmed);
			id = request.id;

			// Handle built-in MCP methods
			if (request.method === "tools/list") {
				const role = request.params?.role as string | undefined;
				const tools = this.registry.listTools(role);
				this.send(formatResponse(id, { tools }));
				return;
			}

			if (request.method === "tools/call") {
				const toolName = request.params?.name as string | undefined;
				if (!toolName) {
					this.send(formatError(id, -32602, "Missing required param: name"));
					return;
				}
				const toolParams = (request.params?.arguments ?? {}) as Record<
					string,
					unknown
				>;
				const context: ToolContext = {
					agentId: (request.params?.agentId as string) ?? "anonymous",
					role: (request.params?.role as string) ?? "agent",
					sessionId: (request.params?.sessionId as string) ?? "stdio",
					requestId: String(id),
				};
				const result = await this.registry.invoke(
					toolName,
					toolParams,
					context,
				);
				this.send(formatResponse(id, result));
				return;
			}

			// Unknown method
			this.send(formatError(id, -32601, `Method not found: ${request.method}`));
		} catch (err: unknown) {
			if (
				typeof err === "object" &&
				err !== null &&
				"code" in err &&
				"message" in err
			) {
				const rpcErr = err as { code: number; message: string; data?: unknown };
				this.send(formatError(id, rpcErr.code, rpcErr.message, rpcErr.data));
			} else {
				this.send(
					formatError(
						id,
						INTERNAL_ERROR,
						err instanceof Error ? err.message : "Internal error",
					),
				);
			}
		}
	}

	private send(response: unknown): void {
		process.stdout.write(JSON.stringify(response) + "\n");
	}
}
