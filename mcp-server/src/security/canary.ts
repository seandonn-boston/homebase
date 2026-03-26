/**
 * Canary Framework (M-14)
 *
 * Creates canary tokens to detect data exfiltration and MITM attacks
 * on MCP server connections.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CanaryOperation {
  id: string;
  serverId: string;
  data: string;
  sentAt: number;
  expectedResponse?: string;
  actualResponse?: string;
  passedThrough: boolean;
  modifiedInTransit: boolean;
  detectedInEgress: boolean;
}

// ---------------------------------------------------------------------------
// CanaryFramework
// ---------------------------------------------------------------------------

export class CanaryFramework {
  private canaries: Map<string, CanaryOperation> = new Map();

  constructor() {}

  createCanary(serverId: string): CanaryOperation {
    const id = `canary_${randomUUID()}`;
    const data = `canary_data_${randomUUID()}`;
    const canary: CanaryOperation = {
      id,
      serverId,
      data,
      sentAt: Date.now(),
      expectedResponse: data, // expect echo-back of the same data
      passedThrough: false,
      modifiedInTransit: false,
      detectedInEgress: false,
    };
    this.canaries.set(id, canary);
    return { ...canary };
  }

  verifyCanary(canaryId: string, response: string): CanaryOperation {
    const canary = this.canaries.get(canaryId);
    if (!canary) throw new Error(`Canary ${canaryId} not found`);

    canary.actualResponse = response;
    canary.passedThrough = true;
    canary.modifiedInTransit = response !== canary.expectedResponse;
    return { ...canary };
  }

  checkEgress(canaryId: string, egressData: string): CanaryOperation {
    const canary = this.canaries.get(canaryId);
    if (!canary) throw new Error(`Canary ${canaryId} not found`);

    // If canary data appears in egress, the server is leaking data
    canary.detectedInEgress = egressData.includes(canary.data);
    return { ...canary };
  }

  getCanaries(serverId?: string): CanaryOperation[] {
    const all = Array.from(this.canaries.values());
    if (serverId) {
      return all.filter((c) => c.serverId === serverId).map((c) => ({ ...c }));
    }
    return all.map((c) => ({ ...c }));
  }

  getCompromised(): CanaryOperation[] {
    return Array.from(this.canaries.values())
      .filter((c) => c.modifiedInTransit || c.detectedInEgress)
      .map((c) => ({ ...c }));
  }
}
