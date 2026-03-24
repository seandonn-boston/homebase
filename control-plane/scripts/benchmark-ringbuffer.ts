/**
 * Admiral RingBuffer Benchmark (T-13)
 *
 * Benchmarks push, toArray, filter at 10K/100K/1M elements.
 * Verifies push is O(1) amortized and memory is bounded.
 *
 * Usage: npx tsx scripts/benchmark-ringbuffer.ts
 */

import { RingBuffer } from "../src/ring-buffer";

function bench(label: string, fn: () => void, iterations = 1): number {
  const start = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const elapsed = performance.now() - start;
  return elapsed / iterations;
}

function formatMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  return `${ms.toFixed(1)}ms`;
}

console.log("=== Admiral RingBuffer Benchmark ===\n");

const sizes = [10_000, 100_000, 1_000_000];

console.log(`${"Size".padEnd(12)} ${"Push All".padStart(12)} ${"Push/Item".padStart(12)} ${"toArray".padStart(12)} ${"Filter".padStart(12)} ${"Mem (MB)".padStart(10)}`);
console.log("-".repeat(72));

for (const size of sizes) {
  const buf = new RingBuffer<number>(size);

  // Benchmark push
  const memBefore = process.memoryUsage().heapUsed;
  const pushTime = bench("push", () => {
    for (let i = 0; i < size; i++) buf.push(i);
  });
  const memAfter = process.memoryUsage().heapUsed;
  const pushPerItem = (pushTime / size) * 1_000_000; // nanoseconds

  // Benchmark toArray
  const toArrayTime = bench("toArray", () => { buf.toArray(); }, 5);

  // Benchmark filter (match ~10%)
  const filterTime = bench("filter", () => { buf.filter((x) => x % 10 === 0); }, 5);

  const memMB = ((memAfter - memBefore) / (1024 * 1024)).toFixed(1);

  console.log(
    `${String(size).padEnd(12)} ${formatMs(pushTime).padStart(12)} ${`${pushPerItem.toFixed(0)}ns`.padStart(12)} ${formatMs(toArrayTime).padStart(12)} ${formatMs(filterTime).padStart(12)} ${memMB.padStart(10)}`
  );
}

// Verify bounded memory: push 2M items into 1M buffer
console.log("\n--- Bounded memory verification ---");
const bounded = new RingBuffer<number>(1_000_000);
const memStart = process.memoryUsage().heapUsed;
for (let i = 0; i < 2_000_000; i++) bounded.push(i);
const memEnd = process.memoryUsage().heapUsed;
console.log(`Buffer size: ${bounded.size} (capacity: 1M)`);
console.log(`Evicted: ${bounded.evictedCount}`);
console.log(`Memory: ${((memEnd - memStart) / (1024 * 1024)).toFixed(1)}MB`);
console.log(`First item: ${bounded.get(0)} (should be 1000000)`);

console.log("\nDone.");
