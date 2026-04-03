/**
 * Tests for Enhanced Structured Logging (OB-01)
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { EnhancedStructuredLogger } from "./structured-logging";

describe("EnhancedStructuredLogger", () => {
  let logger: EnhancedStructuredLogger;

  beforeEach(() => {
    logger = new EnhancedStructuredLogger("test-component");
  });

  it("creates log entries with all required fields", () => {
    const entry = logger.info("hello world");
    assert.ok(entry.timestamp);
    assert.strictEqual(entry.level, "info");
    assert.strictEqual(entry.component, "test-component");
    assert.strictEqual(entry.message, "hello world");
    assert.deepStrictEqual(entry.context, {});
  });

  it("supports all log levels", () => {
    assert.strictEqual(logger.debug("d").level, "debug");
    assert.strictEqual(logger.info("i").level, "info");
    assert.strictEqual(logger.warn("w").level, "warn");
    assert.strictEqual(logger.error("e").level, "error");
    assert.strictEqual(logger.fatal("f").level, "fatal");
  });

  it("includes context in log entries", () => {
    const entry = logger.info("ctx test", { key: "value", count: 42 });
    assert.deepStrictEqual(entry.context, { key: "value", count: 42 });
  });

  it("propagates correlation ID via withCorrelation", () => {
    const child = logger.withCorrelation("corr-123");
    const entry = child.info("correlated");
    assert.strictEqual(entry.correlationId, "corr-123");
  });

  it("propagates trace context via withTrace", () => {
    const child = logger.withTrace("trace-abc", "span-def");
    const entry = child.info("traced");
    assert.strictEqual(entry.traceId, "trace-abc");
    assert.strictEqual(entry.spanId, "span-def");
  });

  it("queries entries by level filter", () => {
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    const warnings = logger.getEntries({ level: "warn" });
    assert.strictEqual(warnings.length, 2); // warn + error
    assert.strictEqual(
      warnings.every((e) => ["warn", "error"].includes(e.level)),
      true,
    );
  });

  it("queries entries by component filter", () => {
    logger.info("from test-component");
    const child = logger.withCorrelation("c1");
    child.info("from child");

    // Child has its own entries array (no shared mutable state with parent)
    const parentEntries = logger.getEntries({ component: "test-component" });
    assert.strictEqual(parentEntries.length, 1);
    const childEntries = child.getEntries({ component: "test-component" });
    assert.strictEqual(childEntries.length, 1);
  });

  it("respects minLevel configuration", () => {
    const quietLogger = new EnhancedStructuredLogger("quiet", {
      minLevel: "warn",
    });
    quietLogger.debug("should not appear");
    quietLogger.info("should not appear");
    quietLogger.warn("should appear");
    quietLogger.error("should appear");

    const entries = quietLogger.getEntries();
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].level, "warn");
    assert.strictEqual(entries[1].level, "error");
  });
});
