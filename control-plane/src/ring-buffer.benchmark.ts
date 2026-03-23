/**
 * T-13: RingBuffer benchmark
 *
 * Benchmarks push, toArray, filter at 10K/100K/1M elements.
 * Verifies push is O(1) amortized and memory is bounded.
 *
 * Run: node dist/src/ring-buffer.benchmark.js
 */

import { RingBuffer } from "./ring-buffer";

function benchPush(capacity: number, count: number): number {
  const buf = new RingBuffer<number>(capacity);
  const start = performance.now();
  for (let i = 0; i < count; i++) {
    buf.push(i);
  }
  return performance.now() - start;
}

function benchToArray(capacity: number, fill: number): number {
  const buf = new RingBuffer<number>(capacity);
  for (let i = 0; i < fill; i++) buf.push(i);
  const start = performance.now();
  buf.toArray();
  return performance.now() - start;
}

function benchFilter(capacity: number, fill: number): number {
  const buf = new RingBuffer<number>(capacity);
  for (let i = 0; i < fill; i++) buf.push(i);
  const start = performance.now();
  buf.filter((x) => x % 2 === 0);
  return performance.now() - start;
}

console.log("RingBuffer Benchmark");
console.log("====================");
console.log("");

const sizes = [10_000, 100_000, 1_000_000];

console.log("Push (ms):");
console.log("  Size       | Time (ms) | Per-op (ns)");
console.log("  -----------|-----------|------------");
for (const size of sizes) {
  const ms = benchPush(size, size);
  const nsPerOp = (ms * 1_000_000) / size;
  console.log(`  ${size.toLocaleString().padStart(10)} | ${ms.toFixed(2).padStart(9)} | ${nsPerOp.toFixed(1).padStart(10)}`);
}

console.log("");
console.log("toArray (ms):");
console.log("  Size       | Time (ms)");
console.log("  -----------|----------");
for (const size of sizes) {
  const ms = benchToArray(size, size);
  console.log(`  ${size.toLocaleString().padStart(10)} | ${ms.toFixed(2).padStart(9)}`);
}

console.log("");
console.log("Filter (ms):");
console.log("  Size       | Time (ms)");
console.log("  -----------|----------");
for (const size of sizes) {
  const ms = benchFilter(size, size);
  console.log(`  ${size.toLocaleString().padStart(10)} | ${ms.toFixed(2).padStart(9)}`);
}

// Memory check: push 1M items into a 10K buffer — should stay bounded
const memBefore = process.memoryUsage().heapUsed;
const bounded = new RingBuffer<{ data: string }>(10_000);
for (let i = 0; i < 1_000_000; i++) {
  bounded.push({ data: `item-${i}` });
}
const memAfter = process.memoryUsage().heapUsed;
const memDelta = (memAfter - memBefore) / 1024 / 1024;

console.log("");
console.log(`Memory (1M pushes into 10K buffer): ${memDelta.toFixed(1)} MB heap delta`);
console.log(`  Buffer size: ${bounded.size} (should be 10000)`);
console.log(`  Evicted: ${bounded.evictedCount} (should be 990000)`);
console.log("");
console.log("Done.");
