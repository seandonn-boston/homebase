/**
 * Tests for Admiral error hierarchy.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AdmiralError,
  errorMessage,
  IngestionError,
  NotFoundError,
  StateCorruptionError,
  ValidationError,
} from "./errors";

describe("AdmiralError hierarchy", () => {
  it("AdmiralError is an instance of Error", () => {
    const err = new AdmiralError("test");
    assert.ok(err instanceof Error);
    assert.ok(err instanceof AdmiralError);
    assert.equal(err.message, "test");
    assert.equal(err.code, "ADMIRAL_ERROR");
    assert.equal(err.name, "AdmiralError");
  });

  it("AdmiralError accepts custom code", () => {
    const err = new AdmiralError("test", "CUSTOM");
    assert.equal(err.code, "CUSTOM");
  });

  it("NotFoundError formats message with resource", () => {
    const err = new NotFoundError("Agent");
    assert.equal(err.message, "Agent not found");
    assert.equal(err.code, "NOT_FOUND");
    assert.equal(err.name, "NotFoundError");
    assert.ok(err instanceof AdmiralError);
  });

  it("NotFoundError includes resourceId", () => {
    const err = new NotFoundError("Agent", "agent-42");
    assert.equal(err.message, "Agent 'agent-42' not found");
    assert.equal(err.resourceId, "agent-42");
  });

  it("ValidationError has field property", () => {
    const err = new ValidationError("Invalid email", "email");
    assert.equal(err.message, "Invalid email");
    assert.equal(err.field, "email");
    assert.equal(err.code, "VALIDATION_ERROR");
    assert.equal(err.name, "ValidationError");
    assert.ok(err instanceof AdmiralError);
  });

  it("StateCorruptionError has statePath", () => {
    const err = new StateCorruptionError("JSON parse failed", "/tmp/state.json");
    assert.equal(err.message, "JSON parse failed");
    assert.equal(err.statePath, "/tmp/state.json");
    assert.equal(err.code, "STATE_CORRUPTION");
    assert.equal(err.name, "StateCorruptionError");
    assert.ok(err instanceof AdmiralError);
  });

  it("IngestionError has line number", () => {
    const err = new IngestionError("Malformed JSON", 42);
    assert.equal(err.message, "Malformed JSON");
    assert.equal(err.line, 42);
    assert.equal(err.code, "INGESTION_ERROR");
    assert.equal(err.name, "IngestionError");
    assert.ok(err instanceof AdmiralError);
  });

  it("all error types can be caught as AdmiralError", () => {
    const errors = [
      new NotFoundError("x"),
      new ValidationError("x"),
      new StateCorruptionError("x"),
      new IngestionError("x"),
    ];
    for (const err of errors) {
      assert.ok(err instanceof AdmiralError);
      assert.ok(err instanceof Error);
    }
  });
});

describe("errorMessage", () => {
  it("extracts message from Error", () => {
    assert.equal(errorMessage(new Error("test")), "test");
  });

  it("extracts message from AdmiralError", () => {
    assert.equal(errorMessage(new AdmiralError("admiral")), "admiral");
  });

  it("converts string to string", () => {
    assert.equal(errorMessage("plain string"), "plain string");
  });

  it("converts number to string", () => {
    assert.equal(errorMessage(42), "42");
  });

  it("converts null to string", () => {
    assert.equal(errorMessage(null), "null");
  });

  it("converts undefined to string", () => {
    assert.equal(errorMessage(undefined), "undefined");
  });
});
