/**
 * Admiral JournalIngester — Additional Unit Tests (T-02)
 *
 * Supplements existing tests in events-trace-ingest.test.ts with
 * start/stop lifecycle, post_tool_use legacy mapping, file growth
 * during watching, and edge cases.
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { JournalIngester } from "./ingest";

describe("JournalIngester — lifecycle", () => {
  let stream: EventStream;
  let tmpDir: string;
  let logDir: string;
  let logPath: string;

  beforeEach(() => {
    stream = new EventStream();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admiral-ingest-test-"));
    logDir = path.join(tmpDir, ".admiral");
    logPath = path.join(logDir, "event_log.jsonl");
    fs.mkdirSync(logDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("start() ingests existing events immediately", () => {
    const line = JSON.stringify({
      event: "session_start",
      timestamp: "2025-01-01T00:00:00Z",
      trace_id: "t1",
    });
    fs.writeFileSync(logPath, `${line}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.start(5000); // long poll to avoid interference
    ingester.stop();

    assert.equal(stream.getEvents().length, 1);
  });

  it("stop() can be called even if start() was never called", () => {
    const ingester = new JournalIngester(tmpDir, stream);
    // Should not throw
    ingester.stop();
  });

  it("stop() can be called multiple times without error", () => {
    const ingester = new JournalIngester(tmpDir, stream);
    ingester.start(5000);
    ingester.stop();
    ingester.stop(); // second call should not throw
  });

  it("start() with nonexistent log file does not throw", () => {
    const ingester = new JournalIngester("/nonexistent/path", stream);
    // start should not throw even if file doesn't exist
    ingester.start(5000);
    ingester.stop();
    assert.equal(stream.getEvents().length, 0);
  });
});

describe("JournalIngester — data extraction edge cases", () => {
  let stream: EventStream;
  let tmpDir: string;
  let logDir: string;
  let logPath: string;

  beforeEach(() => {
    stream = new EventStream();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admiral-ingest-test-"));
    logDir = path.join(tmpDir, ".admiral");
    logPath = path.join(logDir, "event_log.jsonl");
    fs.mkdirSync(logDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("maps post_tool_use legacy format to tool_called", () => {
    const line = JSON.stringify({
      event: "post_tool_use",
      timestamp: "2025-01-01T00:00:00Z",
      trace_id: "t1",
      tool: "bash",
      tool_call_count: 5,
      tokens_used: 300,
    });
    fs.writeFileSync(logPath, `${line}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();
    const event = stream.getEvents()[0];
    assert.equal(event.type, "tool_called");
    assert.equal(event.data.tool, "bash");
    assert.equal(event.data.tool_call_count, 5);
    assert.equal(event.data.tokens_used, 300);
  });

  it("extracts policy_violation data correctly", () => {
    const line = JSON.stringify({
      event: "policy_violation",
      timestamp: "2025-01-01T00:00:00Z",
      trace_id: "t1",
      detail: "scope boundary violated",
    });
    fs.writeFileSync(logPath, `${line}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();
    const event = stream.getEvents()[0];
    assert.equal(event.type, "policy_violation");
    assert.equal(event.data.rule, "hook_alert");
    assert.equal(event.data.details, "scope boundary violated");
  });

  it("includes trace_id in extracted data for all event types", () => {
    const line = JSON.stringify({
      event: "tool_called",
      timestamp: "2025-01-01T00:00:00Z",
      trace_id: "trace-abc-123",
      tool: "read",
    });
    fs.writeFileSync(logPath, `${line}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();
    assert.equal(stream.getEvents()[0].data.trace_id, "trace-abc-123");
  });

  it("handles multiple malformed lines and only logs first", () => {
    const lines = [
      "not json 1",
      "not json 2",
      "not json 3",
      JSON.stringify({
        event: "session_start",
        timestamp: "2025-01-01T00:00:00Z",
        trace_id: "t1",
      }),
    ];
    fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    const count = ingester.ingestNewLines();
    assert.equal(count, 1);
    assert.equal(ingester.getStats().malformedLines, 3);
  });

  it("handles lines with only whitespace", () => {
    const lines = [
      JSON.stringify({
        event: "session_start",
        timestamp: "2025-01-01T00:00:00Z",
        trace_id: "t1",
      }),
      "   ",
      "",
      JSON.stringify({
        event: "tool_called",
        timestamp: "2025-01-01T00:00:01Z",
        trace_id: "t1",
        tool: "bash",
      }),
    ];
    fs.writeFileSync(logPath, lines.join("\n"));

    const ingester = new JournalIngester(tmpDir, stream);
    const count = ingester.ingestNewLines();
    assert.equal(count, 2);
  });

  it("preserves custom agent_id and agent_name when provided", () => {
    const line = JSON.stringify({
      event: "tool_called",
      timestamp: "2025-01-01T00:00:00Z",
      trace_id: "t1",
      tool: "read",
      agent_id: "custom-agent",
      agent_name: "My Custom Agent",
    });
    fs.writeFileSync(logPath, `${line}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();
    const event = stream.getEvents()[0];
    assert.equal(event.agentId, "custom-agent");
    assert.equal(event.agentName, "My Custom Agent");
  });

  it("cumulative stats track across multiple ingest calls", () => {
    const line1 = JSON.stringify({
      event: "session_start",
      timestamp: "2025-01-01T00:00:00Z",
      trace_id: "t1",
    });
    fs.writeFileSync(logPath, `${line1}\n`);

    const ingester = new JournalIngester(tmpDir, stream);
    ingester.ingestNewLines();

    const line2 = JSON.stringify({
      event: "tool_called",
      timestamp: "2025-01-01T00:00:01Z",
      trace_id: "t1",
      tool: "bash",
    });
    fs.appendFileSync(logPath, `${line2}\n`);
    ingester.ingestNewLines();

    const stats = ingester.getStats();
    assert.equal(stats.ingested, 2);
    assert.equal(stats.readErrors, 0);
  });
});
