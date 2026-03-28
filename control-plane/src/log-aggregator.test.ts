/**
 * Tests for Log Aggregation (OB-06)
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
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
    assert.strictEqual(result.total, 2);
    assert.strictEqual(result.entries[0].message, "hello");
  });

  it("filters by component", () => {
    agg.ingest(makeEntry({ component: "hooks" }));
    agg.ingest(makeEntry({ component: "control_plane" }));
    agg.ingest(makeEntry({ component: "hooks" }));

    const result = agg.query({ component: "hooks" });
    assert.strictEqual(result.total, 2);
  });

  it("filters by level", () => {
    agg.ingest(makeEntry({ level: "info" }));
    agg.ingest(makeEntry({ level: "error" }));
    agg.ingest(makeEntry({ level: "info" }));

    const result = agg.query({ level: "error" });
    assert.strictEqual(result.total, 1);
  });

  it("filters by correlation ID", () => {
    agg.ingest(makeEntry({ correlation_id: "trace-1" }));
    agg.ingest(makeEntry({ correlation_id: "trace-2" }));

    const result = agg.query({ correlationId: "trace-1" });
    assert.strictEqual(result.total, 1);
  });

  it("supports full-text search", () => {
    agg.ingest(makeEntry({ message: "Hook execution failed" }));
    agg.ingest(makeEntry({ message: "Brain query completed" }));

    const result = agg.query({ search: "hook" });
    assert.strictEqual(result.total, 1);
    assert.ok(result.entries[0].message.includes("Hook"));
  });

  it("supports pagination with limit and offset", () => {
    for (let i = 0; i < 10; i++) {
      agg.ingest(makeEntry({ message: `msg-${i}` }));
    }

    const page1 = agg.query({ limit: 3, offset: 0 });
    assert.strictEqual(page1.entries.length, 3);
    assert.strictEqual(page1.total, 10);

    const page2 = agg.query({ limit: 3, offset: 3 });
    assert.strictEqual(page2.entries.length, 3);
    assert.strictEqual(page2.entries[0].message, "msg-3");
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
    assert.strictEqual(fs.existsSync(logFile), true);
    assert.strictEqual(fs.existsSync(rotated1), true);
  });

  it("returns distinct components", () => {
    agg.ingest(makeEntry({ component: "hooks" }));
    agg.ingest(makeEntry({ component: "brain" }));
    agg.ingest(makeEntry({ component: "hooks" }));

    const components = agg.getComponents();
    assert.deepStrictEqual(components, ["brain", "hooks"]);
  });

  it("returns log statistics", () => {
    agg.ingest(makeEntry({ level: "info", component: "hooks" }));
    agg.ingest(makeEntry({ level: "error", component: "hooks" }));
    agg.ingest(makeEntry({ level: "info", component: "brain" }));

    const stats = agg.getStats();
    assert.strictEqual(stats.totalEntries, 3);
    assert.strictEqual(stats.byLevel.info, 2);
    assert.strictEqual(stats.byLevel.error, 1);
    assert.strictEqual(stats.byComponent.hooks, 2);
    assert.strictEqual(stats.byComponent.brain, 1);
  });
});
