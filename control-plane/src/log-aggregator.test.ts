/**
 * Tests for Log Aggregation (OB-06)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LogAggregator } from "./log-aggregator";
import type { LogEntry } from "./logger";

function makeEntry(overrides?: Partial<LogEntry>): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level: "info",
    component: "test",
    correlation_id: "",
    message: "test message",
    context: {},
    ...overrides,
  };
}

describe("LogAggregator", () => {
  let tmpDir: string;
  let agg: LogAggregator;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admiral-log-agg-"));
    agg = new LogAggregator({ logDir: tmpDir });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("ingests and queries log entries", () => {
    agg.ingest(makeEntry({ message: "hello" }));
    agg.ingest(makeEntry({ message: "world" }));

    const result = agg.query({});
    expect(result.total).toBe(2);
    expect(result.entries[0].message).toBe("hello");
  });

  it("filters by component", () => {
    agg.ingest(makeEntry({ component: "hooks" }));
    agg.ingest(makeEntry({ component: "control_plane" }));
    agg.ingest(makeEntry({ component: "hooks" }));

    const result = agg.query({ component: "hooks" });
    expect(result.total).toBe(2);
  });

  it("filters by level", () => {
    agg.ingest(makeEntry({ level: "info" }));
    agg.ingest(makeEntry({ level: "error" }));
    agg.ingest(makeEntry({ level: "info" }));

    const result = agg.query({ level: "error" });
    expect(result.total).toBe(1);
  });

  it("filters by correlation ID", () => {
    agg.ingest(makeEntry({ correlation_id: "trace-1" }));
    agg.ingest(makeEntry({ correlation_id: "trace-2" }));

    const result = agg.query({ correlationId: "trace-1" });
    expect(result.total).toBe(1);
  });

  it("supports full-text search", () => {
    agg.ingest(makeEntry({ message: "Hook execution failed" }));
    agg.ingest(makeEntry({ message: "Brain query completed" }));

    const result = agg.query({ search: "hook" });
    expect(result.total).toBe(1);
    expect(result.entries[0].message).toContain("Hook");
  });

  it("supports pagination with limit and offset", () => {
    for (let i = 0; i < 10; i++) {
      agg.ingest(makeEntry({ message: `msg-${i}` }));
    }

    const page1 = agg.query({ limit: 3, offset: 0 });
    expect(page1.entries).toHaveLength(3);
    expect(page1.total).toBe(10);

    const page2 = agg.query({ limit: 3, offset: 3 });
    expect(page2.entries).toHaveLength(3);
    expect(page2.entries[0].message).toBe("msg-3");
  });

  it("rotates logs when file exceeds max size", () => {
    const smallAgg = new LogAggregator({
      logDir: tmpDir,
      maxFileSizeBytes: 100,
      maxRetainedFiles: 3,
    });

    // Write enough to trigger rotation
    for (let i = 0; i < 20; i++) {
      smallAgg.ingest(makeEntry({ message: `entry-${i}-padding-data` }));
    }

    const logFile = path.join(tmpDir, "admiral.jsonl");
    const rotated1 = `${logFile}.1`;
    expect(fs.existsSync(logFile)).toBe(true);
    expect(fs.existsSync(rotated1)).toBe(true);
  });

  it("returns distinct components", () => {
    agg.ingest(makeEntry({ component: "hooks" }));
    agg.ingest(makeEntry({ component: "brain" }));
    agg.ingest(makeEntry({ component: "hooks" }));

    const components = agg.getComponents();
    expect(components).toEqual(["brain", "hooks"]);
  });

  it("returns log statistics", () => {
    agg.ingest(makeEntry({ level: "info", component: "hooks" }));
    agg.ingest(makeEntry({ level: "error", component: "hooks" }));
    agg.ingest(makeEntry({ level: "info", component: "brain" }));

    const stats = agg.getStats();
    expect(stats.totalEntries).toBe(3);
    expect(stats.byLevel.info).toBe(2);
    expect(stats.byLevel.error).toBe(1);
    expect(stats.byComponent.hooks).toBe(2);
    expect(stats.byComponent.brain).toBe(1);
  });
});
