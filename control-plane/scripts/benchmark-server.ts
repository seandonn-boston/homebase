/**
 * Admiral Server Performance Benchmark (T-12)
 *
 * Benchmarks server under load: /api/events with various event counts.
 * Measures response time and memory usage.
 *
 * Usage: npx tsx scripts/benchmark-server.ts
 */

import * as http from "node:http";
import { EventStream } from "../src/events";
import { RunawayDetector } from "../src/runaway-detector";
import { AdmiralServer } from "../src/server";
import { ExecutionTrace } from "../src/trace";

function httpGet(url: string): Promise<{ status: number; body: string; durationMs: number }> {
  const start = performance.now();
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = "";
        res.on("data", (chunk: string) => { body += chunk; });
        res.on("end", () => {
          resolve({ status: res.statusCode!, body, durationMs: performance.now() - start });
        });
      })
      .on("error", reject);
  });
}

async function benchmark(eventCount: number, server: AdmiralServer, stream: EventStream, baseUrl: string) {
  // Populate events
  for (let i = 0; i < eventCount; i++) {
    stream.emit(`agent-${i % 5}`, `Agent-${i % 5}`, "tool_called", { tool: "read", index: i });
  }

  const iterations = 20;
  const durations: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const result = await httpGet(`${baseUrl}/api/events`);
    durations.push(result.durationMs);
  }

  durations.sort((a, b) => a - b);
  const p50 = durations[Math.floor(iterations * 0.5)];
  const p95 = durations[Math.floor(iterations * 0.95)];
  const mean = durations.reduce((a, b) => a + b, 0) / iterations;
  const bodySize = (await httpGet(`${baseUrl}/api/events`)).body.length;

  return { eventCount, p50, p95, mean, bodyKB: Math.round(bodySize / 1024) };
}

async function main() {
  console.log("=== Admiral Server Performance Benchmark ===\n");

  const memBefore = process.memoryUsage().heapUsed;
  const configs = [100, 1000, 5000];

  console.log(
    `${"Events".padEnd(10)} ${"p50 (ms)".padStart(10)} ${"p95 (ms)".padStart(10)} ${"Mean (ms)".padStart(10)} ${"Body (KB)".padStart(10)}`
  );
  console.log("-".repeat(52));

  for (const count of configs) {
    const stream = new EventStream({ maxEvents: count + 100 });
    const detector = new RunawayDetector(stream);
    const trace = new ExecutionTrace(stream);
    const server = new AdmiralServer(stream, detector, trace);
    const port = await server.start(0);
    const baseUrl = `http://localhost:${port}`;

    const result = await benchmark(count, server, stream, baseUrl);
    console.log(
      `${String(result.eventCount).padEnd(10)} ${result.p50.toFixed(1).padStart(10)} ${result.p95.toFixed(1).padStart(10)} ${result.mean.toFixed(1).padStart(10)} ${String(result.bodyKB).padStart(10)}`
    );

    await server.stop();
  }

  const memAfter = process.memoryUsage().heapUsed;
  console.log(`\nMemory delta: ${Math.round((memAfter - memBefore) / 1024)}KB`);
  console.log("Done.");
}

main().catch(console.error);
