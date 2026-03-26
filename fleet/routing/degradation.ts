/**
 * Degradation Policy Engine (O-02b)
 *
 * Manages agent failure tracking with exponential backoff, degradation policies,
 * and recovery logic. One agent's failure cannot block dependent agents.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface DegradationPolicy {
  agentId: string;
  policy: "degraded" | "blocked";
  maxRetries: number;
  backoffMs: number[];
  lastFailure?: number;
  consecutiveFailures: number;
  status: "healthy" | "degraded" | "blocked" | "recovering";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_RETRIES = 4;
const DEFAULT_BACKOFF_MS = [1000, 2000, 4000, 8000];
const MAX_BACKOFF_MS = 30_000;
const RECOVERY_SUCCESSES_NEEDED = 2;

// ---------------------------------------------------------------------------
// DegradationEngine
// ---------------------------------------------------------------------------

export class DegradationEngine {
  private policies: Map<string, DegradationPolicy> = new Map();
  /** Track consecutive successes during recovery. */
  private recoverySuccesses: Map<string, number> = new Map();
  /** Warnings logged for dependent agent awareness (no cascading). */
  private warnings: string[] = [];

  constructor() {}

  // --- Policy access / creation ---

  private ensurePolicy(agentId: string): DegradationPolicy {
    let policy = this.policies.get(agentId);
    if (!policy) {
      policy = {
        agentId,
        policy: "blocked",
        maxRetries: DEFAULT_MAX_RETRIES,
        backoffMs: [...DEFAULT_BACKOFF_MS],
        consecutiveFailures: 0,
        status: "healthy",
      };
      this.policies.set(agentId, policy);
    }
    return policy;
  }

  // --- Failure recording ---

  recordFailure(agentId: string): DegradationPolicy {
    const policy = this.ensurePolicy(agentId);
    policy.consecutiveFailures++;
    policy.lastFailure = Date.now();
    this.recoverySuccesses.set(agentId, 0);

    if (policy.consecutiveFailures >= policy.maxRetries) {
      if (policy.policy === "blocked") {
        policy.status = "blocked";
      } else {
        policy.status = "degraded";
      }
    } else {
      policy.status = "degraded";
    }

    // No cascading: log warning instead of blocking dependents
    this.warnings.push(
      `[degradation] Agent "${agentId}" failure #${policy.consecutiveFailures} — dependent agents NOT blocked`,
    );

    return { ...policy };
  }

  // --- Success recording ---

  recordSuccess(agentId: string): DegradationPolicy {
    const policy = this.ensurePolicy(agentId);

    if (policy.status === "healthy") {
      // Already healthy — no state change needed
      return { ...policy };
    }

    if (policy.status === "blocked" || policy.status === "degraded") {
      // First success: move to recovering
      policy.status = "recovering";
      this.recoverySuccesses.set(agentId, 1);
    } else if (policy.status === "recovering") {
      const current = (this.recoverySuccesses.get(agentId) ?? 0) + 1;
      this.recoverySuccesses.set(agentId, current);

      if (current >= RECOVERY_SUCCESSES_NEEDED) {
        policy.status = "healthy";
        policy.consecutiveFailures = 0;
        this.recoverySuccesses.set(agentId, 0);
      }
    }

    return { ...policy };
  }

  // --- Getters ---

  getPolicy(agentId: string): DegradationPolicy {
    return { ...this.ensurePolicy(agentId) };
  }

  getStatus(agentId: string): "healthy" | "degraded" | "blocked" | "recovering" {
    return this.ensurePolicy(agentId).status;
  }

  shouldRetry(agentId: string): { retry: boolean; delayMs: number } {
    const policy = this.ensurePolicy(agentId);

    if (policy.status === "blocked") {
      return { retry: false, delayMs: 0 };
    }

    if (policy.status === "healthy") {
      return { retry: true, delayMs: 0 };
    }

    // degraded or recovering: use backoff
    const index = Math.min(
      policy.consecutiveFailures - 1,
      policy.backoffMs.length - 1,
    );
    const delay = index >= 0 ? policy.backoffMs[index] : 0;
    return { retry: true, delayMs: Math.min(delay, MAX_BACKOFF_MS) };
  }

  getAllPolicies(): DegradationPolicy[] {
    return Array.from(this.policies.values()).map((p) => ({ ...p }));
  }

  reset(agentId: string): void {
    this.policies.delete(agentId);
    this.recoverySuccesses.delete(agentId);
  }

  // --- Diagnostics ---

  getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Set the policy type for an agent ("degraded" = fallback, "blocked" = error).
   */
  setPolicy(agentId: string, policyType: "degraded" | "blocked"): void {
    const policy = this.ensurePolicy(agentId);
    policy.policy = policyType;
  }

  /**
   * Configure max retries and custom backoff schedule.
   */
  configure(
    agentId: string,
    opts: { maxRetries?: number; backoffMs?: number[] },
  ): void {
    const policy = this.ensurePolicy(agentId);
    if (opts.maxRetries !== undefined) policy.maxRetries = opts.maxRetries;
    if (opts.backoffMs !== undefined) policy.backoffMs = [...opts.backoffMs];
  }
}
