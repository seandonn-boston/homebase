/**
 * T-12: Server performance benchmark
 *
 * Benchmarks /api/events endpoint with 100/1000/10000 events.
 * Measures response time and memory.
 *
 * Run: node dist/src/server.benchmark.js
 */

import * as http from "node:http";
import { EventStream } from "./events";
import { RunawayDetector } from "./runaway-detector";
import { AdmiralServer } from "./server";
import { ExecutionTrace } from "./trace";

function httpGet(url: string): Promise<{ status: number; body: string; ms: number }> {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk: string) => {
          body += chunk;
        });
        res.on("end", () =>
          resolve({ status: res.statusCode!, body, ms: performance.now() - start }),
        );
      })
      .on("error", reject);
  });
}

async function benchmark(eventCount: number, baseUrl: string, stream: EventStream) {
  // Clear and fill
  stream.clear();
  for (let i = 0; i < eventCount; i++) {
    stream.emit("agent-1", "BenchAgent", "tool_called", { tool: "read", index: i });
  }

  // Warm up
  await httpGet(`${baseUrl}/api/events`);

  // Measure
  const iterations = 5;
  const times: number[] = [];
  let bodySize = 0;

  for (let i = 0; i < iterations; i++) {
    const result = await httpGet(`${baseUrl}/api/events`);
    times.push(result.ms);
    bodySize = result.body.length;
  }

  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p50 = times[Math.floor(times.length * 0.5)];
  const p99 = times[times.length - 1];

  return { eventCount, avg, p50, p99, bodySize };
}

async function main() {
  const stream = new EventStream();
  const detector = new RunawayDetector(stream);
  const trace = new ExecutionTrace(stream);
  const server = new AdmiralServer(stream, detector, trace);
  const port = await server.start(0);
  const baseUrl = `http://localhost:${port}`;

  console.log("Server Performance Benchmark");
  console.log("============================");
  console.log(`Server running on port ${port}`);
  console.log("");

  const sizes = [100, 1000, 10_000];
  console.log("GET /api/events (5 iterations each):");
  console.log("  Events  | Avg (ms) | p50 (ms) | p99 (ms) | Body (KB)");
  console.log("  --------|----------|----------|----------|----------");

  for (const size of sizes) {
    const result = await benchmark(size, baseUrl, stream);
    console.log(
      `  ${String(result.eventCount).padStart(7)} | ${result.avg.toFixed(1).padStart(8)} | ${result.p50.toFixed(1).padStart(8)} | ${result.p99.toFixed(1).padStart(8)} | ${(result.bodySize / 1024).toFixed(1).padStart(8)}`,
    );
  }

  const memUsage = process.memoryUsage();
  console.log("");
  console.log(`Memory: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)} MB heap used`);

  await server.stop();
  detector.stop();
  console.log("");
  console.log("Done.");
}

main().catch(console.error);
