/**
 * Tests for Session Thermal Model (OB-15)
 */

import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { SessionThermalModel } from "./session-thermal";

describe("SessionThermalModel", () => {
  let thermal: SessionThermalModel;

  beforeEach(() => {
    thermal = new SessionThermalModel();
  });

  it("creates a session with cold temperature", () => {
    const state = thermal.createSession("sess-1", 10000);
    assert.strictEqual(state.sessionId, "sess-1");
    assert.strictEqual(state.budget, 10000);
    assert.strictEqual(state.consumed, 0);
    assert.strictEqual(state.temperature, "cold");
  });

  it("creates unlimited budget sessions", () => {
    const state = thermal.createSession("sess-u");
    assert.strictEqual(state.budget, 0);
    assert.strictEqual(state.temperature, "cold");
  });

  it("transitions to warm at 50% budget", () => {
    thermal.createSession("sess-1", 10000);
    thermal.recordConsumption("sess-1", 5000);
    assert.strictEqual(thermal.getTemperature("sess-1"), "warm");
  });

  it("transitions to hot at 80% budget", () => {
    thermal.createSession("sess-1", 10000);
    thermal.recordConsumption("sess-1", 8000);
    assert.strictEqual(thermal.getTemperature("sess-1"), "hot");
  });

  it("transitions to critical at 95% budget", () => {
    thermal.createSession("sess-1", 10000);
    thermal.recordConsumption("sess-1", 9500);
    assert.strictEqual(thermal.getTemperature("sess-1"), "critical");
  });

  it("generates warnings at advisory checkpoints", () => {
    thermal.createSession("sess-1", 10000);
    thermal.recordConsumption("sess-1", 5000); // crosses 50%
    const warnings = thermal.getWarnings("sess-1");
    assert.strictEqual(warnings.length, 1);
    assert.ok(warnings[0].includes("5000"));
  });

  it("reports over-budget as informational only", () => {
    thermal.createSession("sess-1", 10000);
    assert.strictEqual(thermal.isOverBudget("sess-1"), false);
    thermal.recordConsumption("sess-1", 11000);
    assert.strictEqual(thermal.isOverBudget("sess-1"), true);
  });

  it("unlimited sessions are never over budget", () => {
    thermal.createSession("sess-u", 0);
    thermal.recordConsumption("sess-u", 999999);
    assert.strictEqual(thermal.isOverBudget("sess-u"), false);
  });
});
