/**
 * Tests for Input Validation Hardening (SEC-12)
 */

import { describe, it, expect } from "vitest";
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
    expect(containsNullBytes("hello\0world")).toBe(true);
  });

  it("passes clean strings", () => {
    expect(containsNullBytes("hello world")).toBe(false);
  });
});

describe("containsInvalidChars", () => {
  it("detects control characters", () => {
    expect(containsInvalidChars("hello\x01world")).toBe(true);
    expect(containsInvalidChars("hello\x7fworld")).toBe(true);
  });

  it("allows tabs, newlines, carriage returns", () => {
    expect(containsInvalidChars("hello\tworld\n")).toBe(false);
    expect(containsInvalidChars("line1\r\nline2")).toBe(false);
  });

  it("allows normal text", () => {
    expect(containsInvalidChars("Hello World! 123 @#$%")).toBe(false);
  });
});

describe("validateSize", () => {
  it("passes within limit", () => {
    expect(validateSize("hello", 100).valid).toBe(true);
  });

  it("rejects oversized input", () => {
    const result = validateSize("x".repeat(200), 100);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("too large");
  });
});

describe("validateJson", () => {
  it("validates well-formed JSON", () => {
    expect(validateJson('{"key":"value"}').valid).toBe(true);
    expect(validateJson("[]").valid).toBe(true);
    expect(validateJson('"string"').valid).toBe(true);
  });

  it("rejects malformed JSON", () => {
    expect(validateJson("{broken").valid).toBe(false);
    expect(validateJson("not json at all").valid).toBe(false);
  });
});

describe("validatePath", () => {
  it("passes normal paths", () => {
    expect(validatePath("/tmp/test.txt").valid).toBe(true);
    expect(validatePath("admiral/lib/test.sh").valid).toBe(true);
  });

  it("rejects paths with null bytes", () => {
    expect(validatePath("/tmp/test\0.txt").valid).toBe(false);
  });

  it("rejects excessively long paths", () => {
    const longPath = "a/".repeat(LIMITS.MAX_PATH_LENGTH);
    expect(validatePath(longPath).valid).toBe(false);
  });

  it("rejects excessive path traversal", () => {
    expect(validatePath("../../../etc/passwd").valid).toBe(false);
  });

  it("allows limited path traversal", () => {
    expect(validatePath("../../file.txt").valid).toBe(true);
  });
});

describe("validateRequestBody", () => {
  it("passes valid request bodies", () => {
    expect(validateRequestBody('{"hello":"world"}').valid).toBe(true);
  });

  it("rejects null bytes", () => {
    const result = validateRequestBody("hello\0world");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Request body contains null bytes");
  });

  it("rejects control characters", () => {
    const result = validateRequestBody("hello\x01world");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Request body contains invalid control characters",
    );
  });

  it("rejects oversized bodies", () => {
    const result = validateRequestBody("x".repeat(200), 100);
    expect(result.valid).toBe(false);
  });
});

describe("validateJsonRequestBody", () => {
  it("passes valid JSON bodies", () => {
    expect(validateJsonRequestBody('{"key":"value"}').valid).toBe(true);
  });

  it("rejects non-JSON bodies", () => {
    const result = validateJsonRequestBody("not json");
    expect(result.valid).toBe(false);
  });

  it("rejects valid JSON with null bytes", () => {
    const result = validateJsonRequestBody('{"key":"val\0ue"}');
    expect(result.valid).toBe(false);
  });
});
