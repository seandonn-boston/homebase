/**
 * Admiral Control Plane CLI
 *
 * Starts the control plane server with JSONL event ingestion.
 * Usage: node dist/src/cli.js [--project-dir <path>] [--port <number>]
 */

import { createAdmiral } from "./index";
import { JournalIngester } from "./ingest";
import { AdmiralServer } from "./server";

function parseArgs(args: string[]): { projectDir: string; port: number } {
  let projectDir = process.cwd();
  let port = 4510;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--project-dir" && args[i + 1]) {
      projectDir = args[++i];
    } else if (args[i] === "--port" && args[i + 1]) {
      port = Number.parseInt(args[++i], 10);
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

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
