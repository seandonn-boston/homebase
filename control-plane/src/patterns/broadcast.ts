/**
 * Admiral Framework — Broadcast Collaboration Pattern (IF-11)
 *
 * One-to-many messaging: a single message is sent to all subscribers.
 * Each subscriber processes independently. Results are collected.
 */

export interface BroadcastSubscriber<T = unknown, R = unknown> {
  agentId: string;
  handle: (message: T) => R | Promise<R>;
}

export interface BroadcastResult<R = unknown> {
  agentId: string;
  success: boolean;
  result: R | null;
  error: string | null;
  durationMs: number;
}

/**
 * Broadcasts a message to all subscribers and collects results.
 */
export class Broadcaster<T = unknown, R = unknown> {
  private subscribers: BroadcastSubscriber<T, R>[] = [];

  subscribe(subscriber: BroadcastSubscriber<T, R>): this {
    this.subscribers.push(subscriber);
    return this;
  }

  unsubscribe(agentId: string): boolean {
    const before = this.subscribers.length;
    this.subscribers = this.subscribers.filter((s) => s.agentId !== agentId);
    return this.subscribers.length < before;
  }

  getSubscribers(): BroadcastSubscriber<T, R>[] {
    return [...this.subscribers];
  }

  /**
   * Send a message to all subscribers concurrently.
   */
  async broadcast(message: T): Promise<BroadcastResult<R>[]> {
    const results = await Promise.all(
      this.subscribers.map(async (sub) => {
        const start = Date.now();
        try {
          const result = await sub.handle(message);
          return {
            agentId: sub.agentId,
            success: true,
            result,
            error: null,
            durationMs: Date.now() - start,
          };
        } catch (err) {
          return {
            agentId: sub.agentId,
            success: false,
            result: null,
            error: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - start,
          };
        }
      }),
    );
    return results;
  }
}
