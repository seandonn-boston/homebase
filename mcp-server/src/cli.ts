/**
 * CLI entry point for the Admiral MCP Server.
 *
 * Usage:
 *   node dist/src/cli.js --transport stdio
 *   node dist/src/cli.js --transport http --port 3100
 */

import { McpServer } from "./server.js";

function parseArgs(argv: string[]): { transport: "stdio" | "http"; port: number } {
  let transport: "stdio" | "http" = "stdio";
  let port = 3100;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--transport" && argv[i + 1]) {
      const val = argv[i + 1];
      if (val === "stdio" || val === "http") {
        transport = val;
      }
      i++;
    }
    if (argv[i] === "--port" && argv[i + 1]) {
      const p = parseInt(argv[i + 1], 10);
      if (!isNaN(p) && p > 0) {
        port = p;
      }
      i++;
    }
  }

  return { transport, port };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const server = new McpServer({ transport: args.transport, port: args.port });

  // Register a built-in ping tool for smoke-testing
  server.registerTool(
    {
      name: "system.ping",
      description: "Returns pong — basic connectivity check",
      inputSchema: { type: "object", properties: {} },
      category: "system",
    },
    async () => ({ pong: true, timestamp: new Date().toISOString() }),
  );

  await server.start();

  if (args.transport === "http") {
    console.error(`[mcp-server] HTTP transport listening on port ${args.port}`);
  } else {
    console.error("[mcp-server] Stdio transport ready");
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.error("[mcp-server] Shutting down...");
    await server.stop();
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

void main();
