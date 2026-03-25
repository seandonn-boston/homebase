/**
 * Tests for StructuredLogger (OB-01)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
    expect(fs.existsSync(logFile)).toBe(true);

    const entries = parseLogFile(logFile);
    expect(entries).toHaveLength(1);

    const entry = entries[0];
    expect(entry.level).toBe("info");
    expect(entry.component).toBe("test-component");
    expect(entry.correlation_id).toBe("trace-123");
    expect(entry.message).toBe("Test message");
    expect(entry.context).toEqual({ key: "value" });
    expect(entry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
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
    expect(entries).toHaveLength(2);
    expect(entries[0].level).toBe("warn");
    expect(entries[1].level).toBe("error");
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
    expect(entries).toHaveLength(1);
    expect(entries[0].component).toBe("child-component");
    expect(entries[0].correlation_id).toBe("trace-abc");
  });

  it("handles missing context gracefully", () => {
    const logger = new StructuredLogger({
      component: "test",
      minLevel: "debug",
      logDir: tmpDir,
    });

    logger.info("no context");

    const entries = parseLogFile(path.join(tmpDir, "admiral.jsonl"));
    expect(entries).toHaveLength(1);
    expect(entries[0].context).toEqual({});
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
    expect(entries).toHaveLength(5);
    expect(entries.map((e: LogEntry) => e.level)).toEqual([
      "debug",
      "info",
      "warn",
      "error",
      "fatal",
    ]);
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
    expect(entries[0].correlation_id).toBe("");
    expect(entries[1].correlation_id).toBe("new-trace-id");
  });

  it("parseLogFile handles empty/missing files", () => {
    expect(parseLogFile("/nonexistent/path")).toEqual([]);
    const emptyFile = path.join(tmpDir, "empty.jsonl");
    fs.writeFileSync(emptyFile, "");
    expect(parseLogFile(emptyFile)).toEqual([]);
  });
});
