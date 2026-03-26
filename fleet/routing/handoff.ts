/**
 * Handoff Protocol & Contract Validation (O-04, O-05a)
 *
 * Validates inter-agent handoffs against defined contracts,
 * tracks handoff history, and flags decomposition review at 3+ failures.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface HandoffPayload {
  id: string;
  fromAgent: string;
  toAgent: string;
  taskId: string;
  context: Record<string, unknown>;
  outputs: Record<string, unknown>;
  metadata: {
    startedAt: number;
    completedAt: number;
    tokensBurned: number;
    quality?: "pass" | "fail" | "partial";
  };
}

export interface HandoffContract {
  fromRole: string;
  toRole: string;
  requiredOutputs: string[];
  requiredContext: string[];
}

// ---------------------------------------------------------------------------
// HandoffValidator
// ---------------------------------------------------------------------------

export class HandoffValidator {
  private readonly contracts: HandoffContract[];

  constructor(contracts: HandoffContract[]) {
    this.contracts = [...contracts];
  }

  validate(payload: HandoffPayload): { valid: boolean; violations: string[] } {
    const contract = this.getContract(payload.fromAgent, payload.toAgent);
    const violations: string[] = [];

    if (!contract) {
      violations.push(
        `No contract defined for handoff from "${payload.fromAgent}" to "${payload.toAgent}"`,
      );
      return { valid: false, violations };
    }

    // Check required outputs
    for (const key of contract.requiredOutputs) {
      if (!(key in payload.outputs)) {
        violations.push(`Missing required output: "${key}"`);
      }
    }

    // Check required context
    for (const key of contract.requiredContext) {
      if (!(key in payload.context)) {
        violations.push(`Missing required context: "${key}"`);
      }
    }

    // Validate metadata
    if (payload.metadata.completedAt < payload.metadata.startedAt) {
      violations.push("completedAt is before startedAt");
    }

    if (payload.metadata.tokensBurned < 0) {
      violations.push("tokensBurned cannot be negative");
    }

    return { valid: violations.length === 0, violations };
  }

  getContract(fromRole: string, toRole: string): HandoffContract | undefined {
    return this.contracts.find(
      (c) => c.fromRole === fromRole && c.toRole === toRole,
    );
  }
}

// ---------------------------------------------------------------------------
// HandoffProtocol
// ---------------------------------------------------------------------------

export class HandoffProtocol {
  private validator: HandoffValidator;
  private history: HandoffPayload[] = [];
  private failureCounts: Map<string, number> = new Map();

  constructor(contracts: HandoffContract[]) {
    this.validator = new HandoffValidator(contracts);
  }

  createHandoff(
    from: string,
    to: string,
    taskId: string,
    context: Record<string, unknown>,
    outputs: Record<string, unknown>,
  ): HandoffPayload {
    const now = Date.now();
    return {
      id: `handoff_${randomUUID()}`,
      fromAgent: from,
      toAgent: to,
      taskId,
      context,
      outputs,
      metadata: {
        startedAt: now,
        completedAt: now,
        tokensBurned: 0,
      },
    };
  }

  validateAndRecord(payload: HandoffPayload): { valid: boolean; violations: string[] } {
    const result = this.validator.validate(payload);

    this.history.push({ ...payload });

    if (!result.valid) {
      const current = this.failureCounts.get(payload.fromAgent) ?? 0;
      this.failureCounts.set(payload.fromAgent, current + 1);
    }

    return result;
  }

  getHistory(taskId?: string): HandoffPayload[] {
    if (taskId !== undefined) {
      return this.history.filter((h) => h.taskId === taskId);
    }
    return [...this.history];
  }

  /**
   * Get the failure count for a given source agent.
   * At 3+, decomposition review should be triggered.
   */
  getFailureCount(fromAgent: string): number {
    return this.failureCounts.get(fromAgent) ?? 0;
  }

  /**
   * Check if an agent's failures warrant decomposition review (3+ failures).
   */
  needsDecompositionReview(fromAgent: string): boolean {
    return this.getFailureCount(fromAgent) >= 3;
  }

  /**
   * Get the underlying validator for direct contract queries.
   */
  getValidator(): HandoffValidator {
    return this.validator;
  }
}
