import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fc from "fast-check";
import { RingBuffer } from "./ring-buffer";

describe("RingBuffer property-based tests", () => {
  // Invariant 1: size never exceeds capacity
  it("size never exceeds capacity after N pushes", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 2000 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
            assert.ok(buf.size <= capacity, `size ${buf.size} exceeded capacity ${capacity}`);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Invariant 2: toArray returns items in insertion order
  it("toArray returns items in insertion order", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 500 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }
          const arr = buf.toArray();

          // The array should contain the last min(items.length, capacity) items
          const expected = items.slice(-capacity);
          assert.deepEqual(arr, expected);
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Invariant 3: correct element count after N pushes
  it("size equals min(pushCount, capacity)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 2000 }),
        (capacity, pushCount) => {
          const buf = new RingBuffer<number>(capacity);
          for (let i = 0; i < pushCount; i++) {
            buf.push(i);
          }
          assert.equal(buf.size, Math.min(pushCount, capacity));
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Invariant 4: evicted elements are the oldest
  it("evictedCount equals max(0, pushCount - capacity)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 500 }),
        fc.integer({ min: 0, max: 2000 }),
        (capacity, pushCount) => {
          const buf = new RingBuffer<number>(capacity);
          for (let i = 0; i < pushCount; i++) {
            buf.push(i);
          }
          assert.equal(buf.evictedCount, Math.max(0, pushCount - capacity));
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Invariant 5: get(i) matches toArray()[i] for all valid indices
  it("get(i) is consistent with toArray()[i]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.integer(), { minLength: 1, maxLength: 300 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }
          const arr = buf.toArray();
          for (let i = 0; i < arr.length; i++) {
            assert.equal(buf.get(i), arr[i], `get(${i}) mismatch: ${buf.get(i)} vs ${arr[i]}`);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Invariant 6: iterator yields same sequence as toArray
  it("iterator yields same sequence as toArray", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 300 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }
          const fromArray = buf.toArray();
          const fromIter = [...buf];
          assert.deepEqual(fromIter, fromArray);
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Invariant 7: clear resets all state
  it("clear resets size, evictedCount, and contents", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.integer(), { minLength: 1, maxLength: 200 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }
          buf.clear();
          assert.equal(buf.size, 0);
          assert.equal(buf.evictedCount, 0);
          assert.deepEqual(buf.toArray(), []);
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Invariant 8: buffer is reusable after clear
  it("buffer works correctly after clear and reuse", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer(), { minLength: 1, maxLength: 100 }),
        fc.array(fc.integer(), { minLength: 1, maxLength: 100 }),
        (capacity, firstBatch, secondBatch) => {
          const buf = new RingBuffer<number>(capacity);

          for (const item of firstBatch) buf.push(item);
          buf.clear();

          for (const item of secondBatch) buf.push(item);

          assert.equal(buf.size, Math.min(secondBatch.length, capacity));
          assert.deepEqual(buf.toArray(), secondBatch.slice(-capacity));
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Invariant 9: filter preserves ordering and is a subset of toArray
  it("filter results are a subset of toArray in order", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer({ min: -100, max: 100 }), {
          minLength: 1,
          maxLength: 200,
        }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) buf.push(item);

          const predicate = (n: number) => n > 0;
          const filtered = buf.filter(predicate);
          const allItems = buf.toArray();
          const expected = allItems.filter(predicate);

          assert.deepEqual(filtered, expected);
        },
      ),
      { numRuns: 1000 },
    );
  });

  // Invariant 10: capacity of 1 always holds only the last item
  it("capacity-1 buffer always holds only the last pushed item", () => {
    fc.assert(
      fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 500 }), (items) => {
        const buf = new RingBuffer<number>(1);
        for (const item of items) buf.push(item);

        assert.equal(buf.size, 1);
        assert.equal(buf.get(0), items[items.length - 1]);
        assert.equal(buf.evictedCount, items.length - 1);
      }),
      { numRuns: 1000 },
    );
  });
});
