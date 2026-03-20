/**
 * Admiral Control Plane CLI
 *
 * Starts the control plane server with JSONL event ingestion.
 * Usage: node dist/src/cli.js [--project-dir <path>] [--port <number>]
 */

import { createAdmiral } from "./index";
import { JournalIngester } from "./ingest";
import { AdmiralServer } from "./server";

export function parseArgs(args: string[]): { projectDir: string; port: number } {
  let projectDir = process.cwd();
  let port = 4510;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project-dir" && args[i + 1]) {
      projectDir = args[++i];
    } else if (args[i] === "--port" && args[i + 1]) {
      const parsed = Number.parseInt(args[++i], 10);
      if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535) {
        throw new Error(`Invalid port: must be between 1 and 65535`);
      }
      port = parsed;
    }
  }

  return { projectDir, port };
}

async function main(): Promise<void> {
  const { projectDir, port } = parseArgs(process.argv.slice(2));

  console.log("Admiral Control Plane");
  console.log(`  Project: ${projectDir}`);
  console.log(`  Port:    ${port}`);
  console.log();

  // Create control plane
  const admiral = createAdmiral();
  const server = new AdmiralServer(admiral.stream, admiral.detector, admiral.trace, projectDir);

  // Start JSONL ingester
  const ingester = new JournalIngester(projectDir, admiral.stream);
  ingester.start();
  server.setIngester(ingester);
  console.log("  Ingesting: .admiral/event_log.jsonl");

  // Start HTTP server
  await server.start(port);

  // Graceful shutdown
  const shutdown = () => {
    console.log("\nShutting down...");
    ingester.stop();
    admiral.shutdown();
    server.stop().then(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Only run when executed directly, not when imported for testing
const isMainModule =
  typeof require !== "undefined" ? require.main === module : process.argv[1]?.endsWith("cli.js");

if (isMainModule) {
  main().catch((err) => {
    console.error("Failed to start:", err);
    process.exit(1);
  });
}
