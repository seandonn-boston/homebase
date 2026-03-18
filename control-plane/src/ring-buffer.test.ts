import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { RingBuffer } from "./ring-buffer";

describe("RingBuffer", () => {
  let buf: RingBuffer<number>;

  beforeEach(() => {
    buf = new RingBuffer(5);
  });

  it("constructor sets capacity", () => {
    assert.equal(buf.capacity, 5);
    assert.equal(buf.size, 0);
  });

  it("constructor throws for capacity < 1", () => {
    assert.throws(() => new RingBuffer(0), /capacity must be >= 1/);
  });

  it("push adds items up to capacity", () => {
    buf.push(1);
    buf.push(2);
    buf.push(3);
    assert.equal(buf.size, 3);
    assert.equal(buf.evictedCount, 0);
  });

  it("push evicts oldest when at capacity", () => {
    for (let i = 1; i <= 7; i++) buf.push(i);
    assert.equal(buf.size, 5);
    assert.equal(buf.evictedCount, 2);
    // Oldest surviving item should be 3
    assert.equal(buf.get(0), 3);
    assert.equal(buf.get(4), 7);
  });

  it("size reflects current count", () => {
    assert.equal(buf.size, 0);
    buf.push(1);
    assert.equal(buf.size, 1);
    for (let i = 2; i <= 5; i++) buf.push(i);
    assert.equal(buf.size, 5);
    buf.push(6); // evicts 1
    assert.equal(buf.size, 5);
  });

  it("evictedCount tracks evictions", () => {
    for (let i = 0; i < 5; i++) buf.push(i);
    assert.equal(buf.evictedCount, 0);
    buf.push(99);
    assert.equal(buf.evictedCount, 1);
    buf.push(100);
    assert.equal(buf.evictedCount, 2);
  });

  it("get returns item at logical index", () => {
    buf.push(10);
    buf.push(20);
    buf.push(30);
    assert.equal(buf.get(0), 10);
    assert.equal(buf.get(1), 20);
    assert.equal(buf.get(2), 30);
  });

  it("get returns undefined for out-of-range index", () => {
    buf.push(1);
    assert.equal(buf.get(-1), undefined);
    assert.equal(buf.get(1), undefined);
    assert.equal(buf.get(100), undefined);
  });

  it("toArray returns items oldest-first", () => {
    buf.push(1);
    buf.push(2);
    buf.push(3);
    assert.deepEqual(buf.toArray(), [1, 2, 3]);
  });

  it("toArray returns empty array when empty", () => {
    assert.deepEqual(buf.toArray(), []);
  });

  it("toArray returns correct order after wraparound", () => {
    // Fill to capacity, then push 3 more to force wraparound
    for (let i = 1; i <= 8; i++) buf.push(i);
    assert.deepEqual(buf.toArray(), [4, 5, 6, 7, 8]);
  });

  it("filter returns matching items", () => {
    for (let i = 1; i <= 5; i++) buf.push(i);
    const evens = buf.filter((n) => n % 2 === 0);
    assert.deepEqual(evens, [2, 4]);
  });

  it("filter returns empty array when no matches", () => {
    buf.push(1);
    buf.push(3);
    const result = buf.filter((n) => n > 10);
    assert.deepEqual(result, []);
  });

  it("iterator yields items oldest-first", () => {
    buf.push(10);
    buf.push(20);
    buf.push(30);
    const collected: number[] = [];
    const iter = buf[Symbol.iterator]();
    let next = iter.next();
    while (!next.done) {
      collected.push(next.value);
      next = iter.next();
    }
    assert.deepEqual(collected, [10, 20, 30]);
  });

  it("iterator works with for...of", () => {
    for (let i = 1; i <= 3; i++) buf.push(i);
    const collected: number[] = [];
    for (const item of buf) {
      collected.push(item);
    }
    assert.deepEqual(collected, [1, 2, 3]);
  });

  it("works with capacity of 1", () => {
    const tiny = new RingBuffer<string>(1);
    tiny.push("a");
    assert.equal(tiny.size, 1);
    assert.equal(tiny.get(0), "a");

    tiny.push("b");
    assert.equal(tiny.size, 1);
    assert.equal(tiny.evictedCount, 1);
    assert.equal(tiny.get(0), "b");
    assert.deepEqual(tiny.toArray(), ["b"]);
  });

  it("handles rapid push/evict cycles", () => {
    const small = new RingBuffer<number>(3);
    for (let i = 0; i < 1000; i++) small.push(i);
    assert.equal(small.size, 3);
    assert.equal(small.evictedCount, 997);
    assert.deepEqual(small.toArray(), [997, 998, 999]);
  });

  it("clear resets buffer", () => {
    for (let i = 0; i < 5; i++) buf.push(i);
    buf.push(99); // evict one
    buf.clear();
    assert.equal(buf.size, 0);
    assert.equal(buf.evictedCount, 0);
    assert.deepEqual(buf.toArray(), []);

    // Can reuse after clear
    buf.push(42);
    assert.equal(buf.size, 1);
    assert.equal(buf.get(0), 42);
  });
});
