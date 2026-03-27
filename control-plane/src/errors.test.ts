import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AdmiralError,
  NotFoundError,
  ValidationError,
  StateCorruptionError,
  IngestionError,
  errorMessage,
  errorCode,
} from "./errors.js";

describe("AdmiralError", () => {
  it("creates with message and default code", () => {
    const err = new AdmiralError("something broke");
    assert.equal(err.message, "something broke");
    assert.equal(err.code, "ADMIRAL_ERROR");
    assert.equal(err.name, "AdmiralError");
  });

  it("creates with custom code", () => {
    const err = new AdmiralError("custom", "CUSTOM_CODE");
    assert.equal(err.code, "CUSTOM_CODE");
  });

  it("is instanceof Error", () => {
    const err = new AdmiralError("test");
    assert.ok(err instanceof Error);
    assert.ok(err instanceof AdmiralError);
  });

  it("has a stack trace", () => {
    const err = new AdmiralError("test");
    assert.ok(err.stack);
    assert.ok(err.stack.includes("AdmiralError"));
  });
});

describe("NotFoundError", () => {
  it("creates with resource type and id", () => {
    const err = new NotFoundError("agent", "agent-123");
    assert.equal(err.message, "agent not found: agent-123");
    assert.equal(err.code, "NOT_FOUND");
    assert.equal(err.name, "NotFoundError");
    assert.equal(err.resourceType, "agent");
    assert.equal(err.resourceId, "agent-123");
  });

  it("is instanceof AdmiralError and Error", () => {
    const err = new NotFoundError("trace", "t-1");
    assert.ok(err instanceof Error);
    assert.ok(err instanceof AdmiralError);
    assert.ok(err instanceof NotFoundError);
  });
});

describe("ValidationError", () => {
  it("creates with message and field", () => {
    const err = new ValidationError("invalid capacity", "capacity");
    assert.equal(err.message, "invalid capacity");
    assert.equal(err.code, "VALIDATION_ERROR");
    assert.equal(err.name, "ValidationError");
    assert.equal(err.field, "capacity");
  });

  it("creates without field", () => {
    const err = new ValidationError("bad input");
    assert.equal(err.field, "");
  });

  it("is instanceof AdmiralError", () => {
    const err = new ValidationError("test");
    assert.ok(err instanceof AdmiralError);
  });
});

describe("StateCorruptionError", () => {
  it("creates with message and state path", () => {
    const err = new StateCorruptionError(
      "JSON parse failed",
      "/tmp/state.json",
    );
    assert.equal(err.message, "JSON parse failed");
    assert.equal(err.code, "STATE_CORRUPTION");
    assert.equal(err.name, "StateCorruptionError");
    assert.equal(err.statePath, "/tmp/state.json");
  });

  it("creates without state path", () => {
    const err = new StateCorruptionError("corrupt");
    assert.equal(err.statePath, "");
  });
});

describe("IngestionError", () => {
  it("creates with source and line", () => {
    const err = new IngestionError(
      "malformed JSONL",
      "event_log.jsonl",
      42,
    );
    assert.equal(err.message, "malformed JSONL");
    assert.equal(err.code, "INGESTION_ERROR");
    assert.equal(err.name, "IngestionError");
    assert.equal(err.source, "event_log.jsonl");
    assert.equal(err.line, 42);
  });

  it("creates without line", () => {
    const err = new IngestionError("read failed", "input.jsonl");
    assert.equal(err.line, undefined);
  });
});

describe("errorMessage", () => {
  it("extracts message from Error", () => {
    assert.equal(errorMessage(new Error("boom")), "boom");
  });

  it("extracts message from AdmiralError", () => {
    assert.equal(errorMessage(new AdmiralError("admiral boom")), "admiral boom");
  });

  it("converts string to string", () => {
    assert.equal(errorMessage("string error"), "string error");
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

describe("errorCode", () => {
  it("returns code from AdmiralError", () => {
    assert.equal(errorCode(new AdmiralError("test")), "ADMIRAL_ERROR");
  });

  it("returns code from NotFoundError", () => {
    assert.equal(errorCode(new NotFoundError("x", "y")), "NOT_FOUND");
  });

  it("returns UNKNOWN for plain Error", () => {
    assert.equal(errorCode(new Error("test")), "UNKNOWN");
  });

  it("returns UNKNOWN for non-Error", () => {
    assert.equal(errorCode("string"), "UNKNOWN");
    assert.equal(errorCode(null), "UNKNOWN");
  });
});
