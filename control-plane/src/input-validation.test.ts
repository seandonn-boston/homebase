/**
 * Tests for Input Validation Hardening (SEC-12)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  containsNullBytes,
  containsInvalidChars,
  validateSize,
  validateJson,
  validatePath,
  validateRequestBody,
  validateJsonRequestBody,
  LIMITS,
} from "./input-validation";

describe("containsNullBytes", () => {
  it("detects null bytes", () => {
    assert.strictEqual(containsNullBytes("hello\0world"), true);
  });

  it("passes clean strings", () => {
    assert.strictEqual(containsNullBytes("hello world"), false);
  });
});

describe("containsInvalidChars", () => {
  it("detects control characters", () => {
    assert.strictEqual(containsInvalidChars("hello\x01world"), true);
    assert.strictEqual(containsInvalidChars("hello\x7fworld"), true);
  });

  it("allows tabs, newlines, carriage returns", () => {
    assert.strictEqual(containsInvalidChars("hello\tworld\n"), false);
    assert.strictEqual(containsInvalidChars("line1\r\nline2"), false);
  });

  it("allows normal text", () => {
    assert.strictEqual(containsInvalidChars("Hello World! 123 @#$%"), false);
  });
});

describe("validateSize", () => {
  it("passes within limit", () => {
    assert.strictEqual(validateSize("hello", 100).valid, true);
  });

  it("rejects oversized input", () => {
    const result = validateSize("x".repeat(200), 100);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors[0].includes("too large"));
  });
});

describe("validateJson", () => {
  it("validates well-formed JSON", () => {
    assert.strictEqual(validateJson('{"key":"value"}').valid, true);
    assert.strictEqual(validateJson("[]").valid, true);
    assert.strictEqual(validateJson('"string"').valid, true);
  });

  it("rejects malformed JSON", () => {
    assert.strictEqual(validateJson("{broken").valid, false);
    assert.strictEqual(validateJson("not json at all").valid, false);
  });
});

describe("validatePath", () => {
  it("passes normal paths", () => {
    assert.strictEqual(validatePath("/tmp/test.txt").valid, true);
    assert.strictEqual(validatePath("admiral/lib/test.sh").valid, true);
  });

  it("rejects paths with null bytes", () => {
    assert.strictEqual(validatePath("/tmp/test\0.txt").valid, false);
  });

  it("rejects excessively long paths", () => {
    const longPath = "a/".repeat(LIMITS.MAX_PATH_LENGTH);
    assert.strictEqual(validatePath(longPath).valid, false);
  });

  it("rejects excessive path traversal", () => {
    assert.strictEqual(validatePath("../../../etc/passwd").valid, false);
  });

  it("allows limited path traversal", () => {
    assert.strictEqual(validatePath("../../file.txt").valid, true);
  });
});

describe("validateRequestBody", () => {
  it("passes valid request bodies", () => {
    assert.strictEqual(validateRequestBody('{"hello":"world"}').valid, true);
  });

  it("rejects null bytes", () => {
    const result = validateRequestBody("hello\0world");
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.includes("Request body contains null bytes"));
  });

  it("rejects control characters", () => {
    const result = validateRequestBody("hello\x01world");
    assert.strictEqual(result.valid, false);
    assert.ok(
      result.errors.includes(
        "Request body contains invalid control characters",
      ),
    );
  });

  it("rejects oversized bodies", () => {
    const result = validateRequestBody("x".repeat(200), 100);
    assert.strictEqual(result.valid, false);
  });
});

describe("validateJsonRequestBody", () => {
  it("passes valid JSON bodies", () => {
    assert.strictEqual(validateJsonRequestBody('{"key":"value"}').valid, true);
  });

  it("rejects non-JSON bodies", () => {
    const result = validateJsonRequestBody("not json");
    assert.strictEqual(result.valid, false);
  });

  it("rejects valid JSON with null bytes", () => {
    const result = validateJsonRequestBody('{"key":"val\0ue"}');
    assert.strictEqual(result.valid, false);
  });
});
