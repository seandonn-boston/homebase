/**
 * Lightweight MCP Client SDK (M-08)
 *
 * Connects to an MCP server over stdio or HTTP and provides
 * tool discovery and invocation.
 * Zero external dependencies — Node.js built-ins only.
 */

import * as http from "node:http";

import type { ToolDefinition } from "./tool-registry.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpClientConfig {
  transport: "stdio" | "http";
  host?: string;
  port?: number;
}

// ---------------------------------------------------------------------------
// McpClient
// ---------------------------------------------------------------------------

export class McpClient {
  private config: McpClientConfig;
  private connected = false;

  constructor(config: McpClientConfig) {
    this.config = {
      host: config.host ?? "127.0.0.1",
      port: config.port ?? 3100,
      transport: config.transport,
    };
  }

  async connect(): Promise<void> {
    if (this.config.transport === "http") {
      // Verify server is reachable via health endpoint
      await this.httpGet("/health");
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listTools(): Promise<ToolDefinition[]> {
    this.ensureConnected();
    if (this.config.transport === "http") {
      const result = await this.httpGet("/tools");
      return JSON.parse(result) as ToolDefinition[];
    }
    // stdio: not implemented in this lightweight SDK
    return [];
  }

  async callTool(name: string, params: Record<string, unknown>): Promise<unknown> {
    this.ensureConnected();
    if (this.config.transport === "http") {
      const body = JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: `tools/${name}`,
        params,
      });
      const result = await this.httpPost("/rpc", body);
      const parsed = JSON.parse(result) as { result?: unknown; error?: unknown };
      if (parsed.error) {
        throw new Error(`RPC error: ${JSON.stringify(parsed.error)}`);
      }
      return parsed.result;
    }
    // stdio: not implemented in this lightweight SDK
    throw new Error("stdio transport not implemented in McpClient");
  }

  isConnected(): boolean {
    return this.connected;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private ensureConnected(): void {
    if (!this.connected) {
      throw new Error("McpClient is not connected");
    }
  }

  private httpGet(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = http.get(
        {
          hostname: this.config.host,
          port: this.config.port,
          path,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => resolve(data));
        },
      );
      req.on("error", reject);
    });
  }

  private httpPost(path: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: this.config.host,
          port: this.config.port,
          path,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          let data = "";
          res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
          res.on("end", () => resolve(data));
        },
      );
      req.on("error", reject);
      req.write(body);
      req.end();
    });
  }
}
