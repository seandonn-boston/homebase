/**
 * Admiral Approval UI/API (AU-11)
 *
 * Operator-facing interface for approving/deferring trust promotions.
 * Presents evidence, requires rationale, logs to Brain.
 */

export interface ApprovalRequest {
  id: string;
  agentId: string;
  requestType: "trust_promotion" | "trust_demotion" | "scope_expansion" | "capability_grant";
  currentLevel: string;
  proposedLevel: string;
  evidence: ApprovalEvidence;
  requestedAt: number;
  status: "pending" | "approved" | "denied" | "deferred";
  decidedAt?: number;
  decidedBy?: string;
  rationale?: string;
}

export interface ApprovalEvidence {
  consecutiveSuccesses: number;
  timePeriodDays: number;
  failureHistory: number;
  qualityRate: number;
  reworkRate: number;
}

export interface ApprovalDecision {
  requestId: string;
  decision: "approved" | "denied" | "deferred";
  rationale: string;
  decidedBy: string;
}

export class ApprovalManager {
  private requests: Map<string, ApprovalRequest> = new Map();
  private counter = 0;

  createRequest(
    agentId: string,
    requestType: ApprovalRequest["requestType"],
    currentLevel: string,
    proposedLevel: string,
    evidence: ApprovalEvidence,
  ): ApprovalRequest {
    this.counter++;
    const request: ApprovalRequest = {
      id: `apr_${Date.now()}_${this.counter}`,
      agentId,
      requestType,
      currentLevel,
      proposedLevel,
      evidence,
      requestedAt: Date.now(),
      status: "pending",
    };

    this.requests.set(request.id, request);
    return request;
  }

  decide(decision: ApprovalDecision): ApprovalRequest {
    const request = this.requests.get(decision.requestId);
    if (!request) throw new Error(`Approval request not found: ${decision.requestId}`);
    if (request.status !== "pending") throw new Error(`Request ${decision.requestId} already decided: ${request.status}`);

    request.status = decision.decision;
    request.decidedAt = Date.now();
    request.decidedBy = decision.decidedBy;
    request.rationale = decision.rationale;

    return request;
  }

  getPending(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.status === "pending");
  }

  getAll(): ApprovalRequest[] {
    return Array.from(this.requests.values());
  }

  getRequest(id: string): ApprovalRequest | undefined {
    return this.requests.get(id);
  }

  getByAgent(agentId: string): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter((r) => r.agentId === agentId);
  }
}
