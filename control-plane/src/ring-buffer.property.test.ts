/**
 * T-15: Property-based testing for RingBuffer using fast-check.
 *
 * Verifies invariants:
 * - Size never exceeds capacity
 * - toArray returns insertion order
 * - Correct element count after N pushes
 * - Evicted elements are oldest
 *
 * Target: 1000+ generated test cases
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as fc from "fast-check";
import { RingBuffer } from "./ring-buffer";

describe("RingBuffer property tests", () => {
  it("size never exceeds capacity", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 500 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
            assert.ok(buf.size <= capacity, `size ${buf.size} > capacity ${capacity}`);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("size equals min(pushCount, capacity)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 500 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }
          assert.equal(buf.size, Math.min(items.length, capacity));
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("toArray returns items in insertion order", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 200 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }

          const arr = buf.toArray();
          // Should be the last `capacity` items in insertion order
          const expected = items.slice(-capacity);
          assert.deepEqual(arr, expected);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("evicted elements are the oldest", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 200 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }

          const evictedCount = Math.max(0, items.length - capacity);
          assert.equal(buf.evictedCount, evictedCount);

          // Remaining items should be the most recent ones
          const arr = buf.toArray();
          if (items.length > 0) {
            const lastItem = items[items.length - 1];
            assert.equal(arr[arr.length - 1], lastItem);
          }
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("get(i) matches toArray()[i]", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer(), { minLength: 1, maxLength: 100 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }

          const arr = buf.toArray();
          for (let i = 0; i < arr.length; i++) {
            assert.equal(buf.get(i), arr[i]);
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it("get out of bounds returns undefined", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 100 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }

          assert.equal(buf.get(-1), undefined);
          assert.equal(buf.get(buf.size), undefined);
          assert.equal(buf.get(capacity + 10), undefined);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("totalEmitted = size + evictedCount", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 200 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }
          assert.equal(buf.size + buf.evictedCount, items.length);
        },
      ),
      { numRuns: 1000 },
    );
  });

  it("iterator matches toArray", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer(), { minLength: 0, maxLength: 100 }),
        (capacity, items) => {
          const buf = new RingBuffer<number>(capacity);
          for (const item of items) {
            buf.push(item);
          }

          const fromIter = [...buf];
          const fromArray = buf.toArray();
          assert.deepEqual(fromIter, fromArray);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("clear resets all counters", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.array(fc.integer(), { minLength: 1, maxLength: 100 }),
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
      { numRuns: 500 },
    );
  });
});
