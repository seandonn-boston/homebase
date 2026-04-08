/**
 * Load Testing for Control Plane Server (X-15)
 *
 * Verifies server handles 1000+ concurrent connections.
 * Uses Node.js built-in http module — no external deps.
 */

import http from "node:http";

interface LoadTestResult {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  avgLatencyMs: number;
  p99LatencyMs: number;
  maxLatencyMs: number;
  requestsPerSecond: number;
  durationMs: number;
}

async function makeRequest(url: string): Promise<number> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk: Buffer) => {
        data += chunk.toString();
      });
      res.on("end", () => resolve(Date.now() - start));
    });
    req.on("error", reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

export async function runLoadTest(
  baseUrl: string,
  concurrency: number,
  totalRequests: number,
): Promise<LoadTestResult> {
  const latencies: number[] = [];
  let successCount = 0;
  let failureCount = 0;
  const start = Date.now();

  const endpoints = ["/health", "/api/events", "/api/alerts", "/api/stats"];

  const batch = async (batchSize: number): Promise<void> => {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < batchSize; i++) {
      const endpoint = endpoints[i % endpoints.length];
      promises.push(
        makeRequest(`${baseUrl}${endpoint}`)
          .then((latency) => {
            latencies.push(latency);
            successCount++;
          })
          .catch(() => {
            failureCount++;
          }),
      );
    }
    await Promise.all(promises);
  };

  let remaining = totalRequests;
  while (remaining > 0) {
    const batchSize = Math.min(concurrency, remaining);
    await batch(batchSize);
    remaining -= batchSize;
  }

  const durationMs = Date.now() - start;
  const sorted = latencies.sort((a, b) => a - b);

  return {
    totalRequests,
    successCount,
    failureCount,
    avgLatencyMs: sorted.length > 0 ? sorted.reduce((s, v) => s + v, 0) / sorted.length : 0,
    p99LatencyMs: sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0,
    maxLatencyMs: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
    requestsPerSecond: durationMs > 0 ? (totalRequests / durationMs) * 1000 : 0,
    durationMs,
  };
}

// CLI entry point
if (process.argv[1]?.endsWith("load-test.js")) {
  const port = Number(process.argv[2] || 4510);
  const concurrency = Number(process.argv[3] || 100);
  const total = Number(process.argv[4] || 1000);

  console.log(`Load test: ${total} requests, ${concurrency} concurrent, port ${port}`);
  runLoadTest(`http://localhost:${port}`, concurrency, total).then((result) => {
    console.log(JSON.stringify(result, null, 2));
    if (result.failureCount > result.totalRequests * 0.01) {
      console.log("FAIL: > 1% failure rate");
      process.exit(1);
    }
    console.log("PASS");
  });
}
