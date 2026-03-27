/**
 * End-to-End Session Simulation (X-03)
 *
 * Simulate full session lifecycle with PreToolUse/PostToolUse cycles.
 * Verify state progression, token tracking, loop detection.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SimulatedToolCall {
  tool: string;
  input: Record<string, unknown>;
  output: string;
  tokensUsed: number;
}

export interface SessionState {
  sessionId: string;
  toolCallCount: number;
  totalTokens: number;
  loopsDetected: number;
  errors: number;
  brainEntriesCreated: number;
  currentPhase: "init" | "running" | "complete" | "error";
}

export interface SimulationConfig {
  toolCalls: SimulatedToolCall[];
  tokenBudget: number;
  loopThreshold: number;
}

export interface SimulationReport {
  totalCycles: number;
  completedCycles: number;
  tokensConsumed: number;
  budgetUtilization: number;
  loopsDetected: number;
  errorsEncountered: number;
  finalState: SessionState;
  stateProgression: string[];
}

// ---------------------------------------------------------------------------
// Session Simulator
// ---------------------------------------------------------------------------

export function simulateSession(config: SimulationConfig): SimulationReport {
  const state: SessionState = {
    sessionId: `sim-${Date.now()}`,
    toolCallCount: 0,
    totalTokens: 0,
    loopsDetected: 0,
    errors: 0,
    brainEntriesCreated: 0,
    currentPhase: "init",
  };

  const progression: string[] = ["init"];
  const recentTools: string[] = [];
  let completedCycles = 0;

  state.currentPhase = "running";
  progression.push("running");

  for (const call of config.toolCalls) {
    // PreToolUse check
    state.toolCallCount++;
    state.totalTokens += call.tokensUsed;

    // Budget check
    if (state.totalTokens > config.tokenBudget) {
      state.currentPhase = "error";
      progression.push(`budget-exceeded at cycle ${state.toolCallCount}`);
      break;
    }

    // Loop detection
    recentTools.push(call.tool);
    if (recentTools.length > config.loopThreshold) {
      const recent = recentTools.slice(-config.loopThreshold);
      if (recent.every((t) => t === recent[0])) {
        state.loopsDetected++;
        progression.push(`loop-detected: ${recent[0]} x${config.loopThreshold}`);
      }
    }

    // Track brain writes
    if (call.tool === "brain_record") {
      state.brainEntriesCreated++;
    }

    // Track errors
    if (call.output.startsWith("ERROR")) {
      state.errors++;
    }

    completedCycles++;
  }

  if (state.currentPhase === "running") {
    state.currentPhase = "complete";
    progression.push("complete");
  }

  return {
    totalCycles: config.toolCalls.length,
    completedCycles,
    tokensConsumed: state.totalTokens,
    budgetUtilization: config.tokenBudget > 0 ? Math.round((state.totalTokens / config.tokenBudget) * 100) : 0,
    loopsDetected: state.loopsDetected,
    errorsEncountered: state.errors,
    finalState: state,
    stateProgression: progression,
  };
}
