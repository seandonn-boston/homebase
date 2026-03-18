/**
 * Generic circular buffer with O(1) push/evict.
 * Replaces array + `.splice(0, n)` (O(n)) and array + `.shift()` (O(n))
 * patterns used throughout the control plane.
 */
export class RingBuffer<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private count = 0;
  private _evictedCount = 0;
  private readonly _capacity: number;

  constructor(capacity: number) {
    if (capacity < 1) throw new Error("RingBuffer capacity must be >= 1");
    this._capacity = capacity;
    this.buffer = new Array(capacity);
  }

  /** Add an item. If at capacity, evicts the oldest item. O(1). */
  push(item: T): void {
    if (this.count < this._capacity) {
      this.buffer[(this.head + this.count) % this._capacity] = item;
      this.count++;
    } else {
      this.buffer[this.head] = item;
      this.head = (this.head + 1) % this._capacity;
      this._evictedCount++;
    }
  }

  /** Number of items currently stored. */
  get size(): number {
    return this.count;
  }

  /** Maximum capacity. */
  get capacity(): number {
    return this._capacity;
  }

  /** Total items ever evicted since creation. */
  get evictedCount(): number {
    return this._evictedCount;
  }

  /** Get item at logical index (0 = oldest). O(1). */
  get(index: number): T | undefined {
    if (index < 0 || index >= this.count) return undefined;
    return this.buffer[(this.head + index) % this._capacity];
  }

  /** Return all items as an array, oldest first. O(n). */
  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.count; i++) {
      result.push(this.buffer[(this.head + i) % this._capacity] as T);
    }
    return result;
  }

  /** Filter items matching a predicate. O(n). */
  filter(predicate: (item: T) => boolean): T[] {
    return this.toArray().filter(predicate);
  }

  /** Reset the buffer to empty state. */
  clear(): void {
    this.head = 0;
    this.count = 0;
    this._evictedCount = 0;
    this.buffer = new Array(this._capacity);
  }

  /** Iterate from oldest to newest. */
  [Symbol.iterator](): Iterator<T> {
    let i = 0;
    const self = this;
    return {
      next(): IteratorResult<T> {
        if (i < self.count) {
          const value = self.buffer[(self.head + i) % self._capacity] as T;
          i++;
          return { value, done: false };
        }
        return { value: undefined, done: true };
      },
    };
  }
}
