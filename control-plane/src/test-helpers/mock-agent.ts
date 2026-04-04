/**
 * Mock Agent for E2E Multi-Agent Tests (E2E-01)
 *
 * Simulates agent behavior without LLM API calls. Mock agents
 * execute predefined behaviors (succeed, fail, timeout, produce output)
 * and are used with the real ExecutionRuntime and routing engine.
 */

import type { ExecutionRuntime, Session } from "../execution-runtime";

// ── Types ──────────────────────────────────────────────────────

export type MockBehavior = "succeed" | "fail" | "timeout" | "produce_output";

export interface MockAgentConfig {
  agentId: string;
  agentName: string;
  behavior: MockBehavior;
  output?: unknown;
  error?: string;
  delayMs?: number;
  tokensUsed?: number;
  fileWrites?: number;
}

export interface MockExecutionResult {
  session: Session;
  output?: unknown;
  handoffPayload?: HandoffPayload;
}

export interface HandoffPayload {
  fromAgent: string;
  toAgent: string;
  taskId: string;
  context: Record<string, unknown>;
  results: unknown;
  timestamp: number;
}

// ── MockAgent ──────────────────────────────────────────────────

export class MockAgent {
  readonly config: MockAgentConfig;

  constructor(config: MockAgentConfig) {
    this.config = config;
  }

  /**
   * Execute the mock agent's behavior on a session.
   * Simulates the agent's work by updating token usage, file writes,
   * and completing/failing the session based on configured behavior.
   */
  async execute(runtime: ExecutionRuntime, sessionId: string): Promise<MockExecutionResult> {
    const session = runtime.getSession(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    // Simulate work delay
    if (this.config.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.config.delayMs));
    }

    // Simulate token usage
    if (this.config.tokensUsed) {
      runtime.recordTokens(sessionId, this.config.tokensUsed);
    }

    // Simulate file writes
    if (this.config.fileWrites) {
      for (let i = 0; i < this.config.fileWrites; i++) {
        runtime.recordFileWrite(sessionId);
      }
    }

    // Execute behavior
    switch (this.config.behavior) {
      case "succeed":
        return this.succeed(runtime, sessionId);
      case "fail":
        return this.fail(runtime, sessionId);
      case "timeout":
        return this.timeout(runtime, sessionId);
      case "produce_output":
        return this.produceOutput(runtime, sessionId);
    }
  }

  /**
   * Create a handoff payload for passing work to another agent.
   */
  createHandoff(taskId: string, toAgent: string, results: unknown): HandoffPayload {
    return {
      fromAgent: this.config.agentId,
      toAgent,
      taskId,
      context: { agentName: this.config.agentName },
      results,
      timestamp: Date.now(),
    };
  }

  private succeed(runtime: ExecutionRuntime, sessionId: string): MockExecutionResult {
    const session = runtime.completeSession(sessionId, this.config.output ?? { status: "done" });
    return { session, output: this.config.output ?? { status: "done" } };
  }

  private fail(runtime: ExecutionRuntime, sessionId: string): MockExecutionResult {
    const session = runtime.failSession(sessionId, this.config.error ?? "Mock agent failure");
    return { session };
  }

  private timeout(_runtime: ExecutionRuntime, _sessionId: string): MockExecutionResult {
    // Don't complete — let the wall-clock timeout handle it
    // Return the session as-is (still running)
    const session = _runtime.getSession(_sessionId)!;
    return { session };
  }

  private produceOutput(runtime: ExecutionRuntime, sessionId: string): MockExecutionResult {
    const output = this.config.output ?? { analysis: "Mock analysis result" };
    const session = runtime.completeSession(sessionId, output);
    return { session, output };
  }
}

// ── Test Assertion Helpers ─────────────────────────────────────

export function assertSessionComplete(session: Session): void {
  if (session.state !== "complete") {
    throw new Error(`Expected session ${session.sessionId} to be complete, got "${session.state}"`);
  }
}

export function assertSessionFailed(session: Session): void {
  if (session.state !== "failed") {
    throw new Error(`Expected session ${session.sessionId} to be failed, got "${session.state}"`);
  }
}

export function assertHandoffValid(handoff: HandoffPayload): void {
  if (!handoff.fromAgent) throw new Error("Handoff missing fromAgent");
  if (!handoff.toAgent) throw new Error("Handoff missing toAgent");
  if (!handoff.taskId) throw new Error("Handoff missing taskId");
  if (!handoff.timestamp) throw new Error("Handoff missing timestamp");
  if (handoff.fromAgent === handoff.toAgent) {
    throw new Error("Handoff fromAgent and toAgent must be different");
  }
}
