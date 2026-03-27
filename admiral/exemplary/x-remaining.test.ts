/**
 * Tests for X-02 (Chaos), X-03 (Session Sim)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ALL_SCENARIOS, runChaosTests, generatePayloadForScenario } from "./chaos-testing";
import { simulateSession, type SimulatedToolCall } from "./session-simulation";

// ---------------------------------------------------------------------------
// X-02: Chaos Testing
// ---------------------------------------------------------------------------

describe("X-02: Chaos Testing", () => {
  it("defines 26+ failure scenarios", () => {
    assert.ok(ALL_SCENARIOS.length >= 26);
  });

  it("generates payloads for each scenario", () => {
    for (const scenario of ALL_SCENARIOS) {
      const payload = generatePayloadForScenario(scenario);
      assert.ok(payload !== undefined, `payload for ${scenario} should not be undefined`);
    }
  });

  it("runs chaos tests with mock runner", () => {
    const results = runChaosTests(
      "test_hook",
      (_hook, _payload, _scenario) => ({ failedOpen: true, stateCorrupted: false, error: null }),
      ["missing-jq", "corrupted-state", "malformed-json"],
    );
    assert.equal(results.totalScenarios, 3);
    assert.equal(results.passed, 3);
    assert.equal(results.allFailOpen, true);
    assert.equal(results.noStateCorruption, true);
  });

  it("detects non-fail-open hooks", () => {
    const results = runChaosTests(
      "bad_hook",
      (_hook, _payload, scenario) => ({
        failedOpen: scenario !== "missing-jq",
        stateCorrupted: false,
        error: scenario === "missing-jq" ? "jq not found" : null,
      }),
      ["missing-jq", "corrupted-state"],
    );
    assert.equal(results.allFailOpen, false);
    assert.equal(results.failed, 1);
  });

  it("detects state corruption", () => {
    const results = runChaosTests(
      "corrupt_hook",
      () => ({ failedOpen: true, stateCorrupted: true, error: "state file damaged" }),
      ["partial-write"],
    );
    assert.equal(results.noStateCorruption, false);
  });
});

// ---------------------------------------------------------------------------
// X-03: Session Simulation
// ---------------------------------------------------------------------------

describe("X-03: Session Simulation", () => {
  function makeCall(tool: string, tokens: number): SimulatedToolCall {
    return { tool, input: {}, output: "ok", tokensUsed: tokens };
  }

  it("simulates a complete session", () => {
    const calls = Array.from({ length: 50 }, (_, i) => makeCall(`tool-${i % 5}`, 100));
    const report = simulateSession({ toolCalls: calls, tokenBudget: 10000, loopThreshold: 5 });
    assert.equal(report.completedCycles, 50);
    assert.equal(report.tokensConsumed, 5000);
    assert.equal(report.finalState.currentPhase, "complete");
  });

  it("detects budget exhaustion", () => {
    const calls = Array.from({ length: 50 }, () => makeCall("Read", 500));
    const report = simulateSession({ toolCalls: calls, tokenBudget: 5000, loopThreshold: 5 });
    assert.ok(report.completedCycles < 50);
    assert.ok(report.stateProgression.some((s) => s.includes("budget-exceeded")));
  });

  it("detects loop patterns", () => {
    const calls = Array.from({ length: 10 }, () => makeCall("Read", 100));
    const report = simulateSession({ toolCalls: calls, tokenBudget: 10000, loopThreshold: 3 });
    assert.ok(report.loopsDetected > 0);
  });

  it("tracks brain entries", () => {
    const calls = [
      makeCall("Read", 100),
      makeCall("brain_record", 50),
      makeCall("brain_record", 50),
      makeCall("Write", 200),
    ];
    const report = simulateSession({ toolCalls: calls, tokenBudget: 10000, loopThreshold: 5 });
    assert.equal(report.finalState.brainEntriesCreated, 2);
  });

  it("tracks errors", () => {
    const calls = [
      { tool: "Read", input: {}, output: "ok", tokensUsed: 100 },
      { tool: "Write", input: {}, output: "ERROR: permission denied", tokensUsed: 100 },
    ];
    const report = simulateSession({ toolCalls: calls, tokenBudget: 10000, loopThreshold: 5 });
    assert.equal(report.errorsEncountered, 1);
  });
});
