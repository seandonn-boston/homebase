/**
 * HTTP + SSE transport for the Admiral MCP Server.
 *
 * Routes:
 *   POST /rpc    — JSON-RPC request/response
 *   GET  /tools  — tool discovery
 *   GET  /health — basic health check
 *   GET  /events — SSE event stream (placeholder)
 */

import * as http from "node:http";
import {
  parseRequest,
  formatResponse,
  formatError,
  PARSE_ERROR,
  INTERNAL_ERROR,
} from "./protocol.js";
import type { ToolRegistry } from "./tool-registry.js";
import type { ToolContext } from "./tool-registry.js";

export class HttpTransport {
  private server: http.Server | null = null;
  private sseClients: Set<http.ServerResponse> = new Set();

  constructor(
    private registry: ToolRegistry,
    private port: number,
  ) {}

  async start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        void this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    // Close all SSE clients
    for (const client of this.sseClients) {
      client.end();
    }
    this.sseClients.clear();

    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }
      this.server.close((err) => {
        this.server = null;
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Emit an SSE event to all connected clients.
   */
  emitEvent(event: string, data: unknown): void {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.sseClients) {
      client.write(payload);
    }
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const url = req.url ?? "/";
    const method = req.method ?? "GET";

    // CORS headers for browser-based clients
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (url === "/health" && method === "GET") {
        this.handleHealth(res);
      } else if (url === "/tools" && method === "GET") {
        this.handleToolList(res);
      } else if (url === "/events" && method === "GET") {
        this.handleSSE(req, res);
      } else if (url === "/rpc" && method === "POST") {
        await this.handleRpc(req, res);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  }

  private handleHealth(res: http.ServerResponse): void {
    const payload = {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      transport: "http",
      port: this.port,
    };
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  }

  private handleToolList(res: http.ServerResponse): void {
    const tools = this.registry.listTools();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ tools }));
  }

  private handleSSE(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);

    this.sseClients.add(res);

    req.on("close", () => {
      this.sseClients.delete(res);
    });
  }

  private async handleRpc(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const body = await this.readBody(req);
    let id: string | number | null = null;

    try {
      const request = parseRequest(body);
      id = request.id;

      // Handle built-in MCP methods
      if (request.method === "tools/list") {
        const role = request.params?.role as string | undefined;
        const tools = this.registry.listTools(role);
        this.sendJson(res, formatResponse(id, { tools }));
        return;
      }

      if (request.method === "tools/call") {
        const toolName = request.params?.name as string | undefined;
        if (!toolName) {
          this.sendJson(res, formatError(id, -32602, "Missing required param: name"));
          return;
        }
        const toolParams = (request.params?.arguments ?? {}) as Record<string, unknown>;
        const context: ToolContext = {
          agentId: (request.params?.agentId as string) ?? "anonymous",
          role: (request.params?.role as string) ?? "agent",
          sessionId: (request.params?.sessionId as string) ?? "http",
          requestId: String(id),
        };
        const result = await this.registry.invoke(toolName, toolParams, context);
        this.sendJson(res, formatResponse(id, result));
        return;
      }

      // Unknown method
      this.sendJson(res, formatError(id, -32601, `Method not found: ${request.method}`));
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && "message" in err) {
        const rpcErr = err as { code: number; message: string; data?: unknown };
        this.sendJson(res, formatError(id, rpcErr.code, rpcErr.message, rpcErr.data));
      } else {
        this.sendJson(
          res,
          formatError(id, INTERNAL_ERROR, err instanceof Error ? err.message : "Internal error"),
        );
      }
    }
  }

  private sendJson(res: http.ServerResponse, data: unknown): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  private readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
      req.on("error", reject);
    });
  }
}
