/**
 * Tests for StructuredLogger (OB-01)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { StructuredLogger, parseLogFile } from "./logger";
import type { LogEntry } from "./logger";

describe("StructuredLogger", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admiral-log-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("emits valid JSON log entries with all required fields", () => {
    const logger = new StructuredLogger({
      component: "test-component",
      minLevel: "debug",
      correlationId: "trace-123",
      logDir: tmpDir,
    });

    logger.info("Test message", { key: "value" });

    const logFile = path.join(tmpDir, "admiral.jsonl");
    assert.strictEqual(fs.existsSync(logFile), true);

    const entries = parseLogFile(logFile);
    assert.strictEqual(entries.length, 1);

    const entry = entries[0];
    assert.strictEqual(entry.level, "info");
    assert.strictEqual(entry.component, "test-component");
    assert.strictEqual(entry.correlation_id, "trace-123");
    assert.strictEqual(entry.message, "Test message");
    assert.deepStrictEqual(entry.context, { key: "value" });
    assert.ok(entry.timestamp.match(/^\d{4}-\d{2}-\d{2}T/));
  });

  it("respects minimum log level", () => {
    const logger = new StructuredLogger({
      component: "test",
      minLevel: "warn",
      logDir: tmpDir,
    });

    logger.debug("should not appear");
    logger.info("should not appear");
    logger.warn("should appear");
    logger.error("should appear");

    const entries = parseLogFile(path.join(tmpDir, "admiral.jsonl"));
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].level, "warn");
    assert.strictEqual(entries[1].level, "error");
  });

  it("creates child loggers with inherited settings", () => {
    const parent = new StructuredLogger({
      component: "parent",
      minLevel: "debug",
      correlationId: "trace-abc",
      logDir: tmpDir,
    });

    const child = parent.child("child-component");
    child.info("child log");

    const entries = parseLogFile(path.join(tmpDir, "admiral.jsonl"));
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].component, "child-component");
    assert.strictEqual(entries[0].correlation_id, "trace-abc");
  });

  it("handles missing context gracefully", () => {
    const logger = new StructuredLogger({
      component: "test",
      minLevel: "debug",
      logDir: tmpDir,
    });

    logger.info("no context");

    const entries = parseLogFile(path.join(tmpDir, "admiral.jsonl"));
    assert.strictEqual(entries.length, 1);
    assert.deepStrictEqual(entries[0].context, {});
  });

  it("supports all five log levels", () => {
    const logger = new StructuredLogger({
      component: "test",
      minLevel: "debug",
      logDir: tmpDir,
    });

    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    logger.fatal("f");

    const entries = parseLogFile(path.join(tmpDir, "admiral.jsonl"));
    assert.strictEqual(entries.length, 5);
    assert.deepStrictEqual(
      entries.map((e: LogEntry) => e.level),
      ["debug", "info", "warn", "error", "fatal"],
    );
  });

  it("updates correlation ID via setter", () => {
    const logger = new StructuredLogger({
      component: "test",
      minLevel: "debug",
      logDir: tmpDir,
    });

    logger.info("before");
    logger.setCorrelationId("new-trace-id");
    logger.info("after");

    const entries = parseLogFile(path.join(tmpDir, "admiral.jsonl"));
    assert.strictEqual(entries[0].correlation_id, "");
    assert.strictEqual(entries[1].correlation_id, "new-trace-id");
  });

  it("parseLogFile handles empty/missing files", () => {
    assert.deepStrictEqual(parseLogFile("/nonexistent/path"), []);
    const emptyFile = path.join(tmpDir, "empty.jsonl");
    fs.writeFileSync(emptyFile, "");
    assert.deepStrictEqual(parseLogFile(emptyFile), []);
  });
});
