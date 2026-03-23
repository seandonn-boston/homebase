/**
 * Comprehensive unit tests for JournalIngester.
 *
 * Covers: ingestNewLines(), start()/stop(), getStats(), getOffset()
 * with valid JSONL, malformed lines, missing file, file growth, offset
 * tracking, start/stop lifecycle, and all event type mappings.
 *
 * Target: >=80% branch coverage of ingest.ts
 */

import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { EventStream } from "./events";
import { JournalIngester } from "./ingest";

describe("JournalIngester", () => {
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

  // -------------------------------------------------------------------------
  // ingestNewLines — basic
  // -------------------------------------------------------------------------
  describe("ingestNewLines", () => {
    it("returns 0 when log file does not exist", () => {
      const ingester = new JournalIngester("/nonexistent/dir", stream);
      assert.equal(ingester.ingestNewLines(), 0);
    });

    it("returns 0 for empty file", () => {
      fs.writeFileSync(logPath, "");
      const ingester = new JournalIngester(tmpDir, stream);
      assert.equal(ingester.ingestNewLines(), 0);
    });

    it("ingests valid JSONL lines", () => {
      const lines = [
        JSON.stringify({
          event: "session_start",
          timestamp: "2025-01-01T00:00:00Z",
          trace_id: "t1",
          agent_id: "a1",
          agent_name: "Agent-1",
          model: "claude",
        }),
        JSON.stringify({
          event: "tool_called",
          timestamp: "2025-01-01T00:00:01Z",
          trace_id: "t1",
          agent_id: "a1",
          agent_name: "Agent-1",
          tool: "read_file",
          tool_call_count: 1,
        }),
      ];
      fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

      const ingester = new JournalIngester(tmpDir, stream);
      const count = ingester.ingestNewLines();
      assert.equal(count, 2);
      assert.equal(stream.getEvents().length, 2);
    });

    it("handles malformed lines gracefully", () => {
      const lines = [
        JSON.stringify({
          event: "session_start",
          timestamp: "2025-01-01T00:00:00Z",
          trace_id: "t1",
        }),
        "THIS IS NOT JSON",
        JSON.stringify({
          event: "tool_called",
          timestamp: "2025-01-01T00:00:01Z",
          trace_id: "t1",
          tool: "bash",
        }),
      ];
      fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

      const ingester = new JournalIngester(tmpDir, stream);
      const count = ingester.ingestNewLines();
      assert.equal(count, 2);
      const stats = ingester.getStats();
      assert.equal(stats.malformedLines, 1);
    });

    it("tracks offset and only reads new content", () => {
      const line1 = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
      fs.writeFileSync(logPath, line1);

      const ingester = new JournalIngester(tmpDir, stream);
      assert.equal(ingester.ingestNewLines(), 1);
      assert.equal(ingester.getOffset(), Buffer.byteLength(line1));

      const line2 = `${JSON.stringify({ event: "tool_called", timestamp: "2025-01-01T00:00:01Z", trace_id: "t1", tool: "bash" })}\n`;
      fs.appendFileSync(logPath, line2);

      assert.equal(ingester.ingestNewLines(), 1);
      assert.equal(stream.getEvents().length, 2);
    });

    it("returns 0 on second call with no new data", () => {
      const line = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
      fs.writeFileSync(logPath, line);

      const ingester = new JournalIngester(tmpDir, stream);
      assert.equal(ingester.ingestNewLines(), 1);
      assert.equal(ingester.ingestNewLines(), 0);
    });

    it("skips whitespace-only lines", () => {
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
      fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

      const ingester = new JournalIngester(tmpDir, stream);
      const count = ingester.ingestNewLines();
      assert.equal(count, 2);
    });

    it("handles multiple malformed lines — only logs first", () => {
      const lines = [
        "BAD LINE 1",
        "BAD LINE 2",
        "BAD LINE 3",
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

    it("accumulates stats across multiple ingest calls", () => {
      const line1 = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
      fs.writeFileSync(logPath, line1);

      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();

      const line2 = `${JSON.stringify({ event: "tool_called", timestamp: "2025-01-01T00:00:01Z", trace_id: "t1", tool: "bash" })}\n`;
      fs.appendFileSync(logPath, line2);
      ingester.ingestNewLines();

      const stats = ingester.getStats();
      assert.equal(stats.ingested, 2);
      assert.equal(stats.readErrors, 0);
    });
  });

  // -------------------------------------------------------------------------
  // Event type mapping
  // -------------------------------------------------------------------------
  describe("event type mapping", () => {
    it("maps session_start to agent_started", () => {
      const line = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      assert.equal(stream.getEvents()[0].type, "agent_started");
    });

    it("maps tool_called to tool_called", () => {
      const line = `${JSON.stringify({ event: "tool_called", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", tool: "bash" })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      assert.equal(stream.getEvents()[0].type, "tool_called");
    });

    it("maps token_spent to token_spent", () => {
      const line = `${JSON.stringify({ event: "token_spent", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", token_count: 100, token_total: 100 })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      assert.equal(stream.getEvents()[0].type, "token_spent");
    });

    it("maps policy_violation to policy_violation", () => {
      const line = `${JSON.stringify({ event: "policy_violation", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", detail: "bad" })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      assert.equal(stream.getEvents()[0].type, "policy_violation");
    });

    it("maps post_tool_use (legacy) to tool_called", () => {
      const line = `${JSON.stringify({ event: "post_tool_use", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", tool: "write" })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      assert.equal(stream.getEvents()[0].type, "tool_called");
    });

    it("maps unknown event types to tool_called", () => {
      const line = `${JSON.stringify({ event: "custom_event", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      assert.equal(stream.getEvents()[0].type, "tool_called");
    });
  });

  // -------------------------------------------------------------------------
  // Data extraction
  // -------------------------------------------------------------------------
  describe("data extraction", () => {
    it("extracts session_start fields", () => {
      const line = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", model: "claude-3", standing_orders_loaded: 5 })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      const event = stream.getEvents()[0];
      assert.equal(event.data.model, "claude-3");
      assert.equal(event.data.standing_orders_loaded, 5);
      assert.equal(event.data.trace_id, "t1");
    });

    it("extracts tool_called fields", () => {
      const line = `${JSON.stringify({ event: "tool_called", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", tool: "read_file", tool_call_count: 3, tokens_used: 150 })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      const event = stream.getEvents()[0];
      assert.equal(event.data.tool, "read_file");
      assert.equal(event.data.tool_call_count, 3);
      assert.equal(event.data.tokens_used, 150);
    });

    it("extracts post_tool_use fields (same as tool_called)", () => {
      const line = `${JSON.stringify({ event: "post_tool_use", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", tool: "write_file", tool_call_count: 1 })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      const event = stream.getEvents()[0];
      assert.equal(event.data.tool, "write_file");
      assert.equal(event.data.tool_call_count, 1);
    });

    it("extracts token_spent fields", () => {
      const line = `${JSON.stringify({ event: "token_spent", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", token_count: 250, token_total: 1000 })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      const event = stream.getEvents()[0];
      assert.equal(event.data.count, 250);
      assert.equal(event.data.total, 1000);
    });

    it("extracts policy_violation fields", () => {
      const line = `${JSON.stringify({ event: "policy_violation", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", detail: "secret exposed" })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      const event = stream.getEvents()[0];
      assert.equal(event.data.rule, "hook_alert");
      assert.equal(event.data.details, "secret exposed");
    });

    it("uses default agent values when agent_id and agent_name are missing", () => {
      const line = `${JSON.stringify({ event: "tool_called", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", tool: "bash" })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      const event = stream.getEvents()[0];
      assert.equal(event.agentId, "claude-code");
      assert.equal(event.agentName, "Claude Code Agent");
    });

    it("uses provided agent_id and agent_name", () => {
      const line = `${JSON.stringify({ event: "tool_called", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1", tool: "bash", agent_id: "custom-agent", agent_name: "Custom Agent" })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      const event = stream.getEvents()[0];
      assert.equal(event.agentId, "custom-agent");
      assert.equal(event.agentName, "Custom Agent");
    });
  });

  // -------------------------------------------------------------------------
  // start / stop lifecycle
  // -------------------------------------------------------------------------
  describe("start/stop", () => {
    it("start ingests existing events immediately", () => {
      const line = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
      fs.writeFileSync(logPath, line);

      const ingester = new JournalIngester(tmpDir, stream);
      ingester.start(5000);
      assert.equal(stream.getEvents().length, 1);
      ingester.stop();
    });

    it("stop is safe to call when not started", () => {
      const ingester = new JournalIngester(tmpDir, stream);
      // Should not throw
      ingester.stop();
    });

    it("stop can be called multiple times safely", () => {
      const line = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
      fs.writeFileSync(logPath, line);

      const ingester = new JournalIngester(tmpDir, stream);
      ingester.start(5000);
      ingester.stop();
      ingester.stop(); // second stop should not throw
    });
  });

  // -------------------------------------------------------------------------
  // getOffset / getStats
  // -------------------------------------------------------------------------
  describe("getOffset and getStats", () => {
    it("getOffset starts at zero", () => {
      const ingester = new JournalIngester(tmpDir, stream);
      assert.equal(ingester.getOffset(), 0);
    });

    it("getOffset advances after ingestion", () => {
      const line = `${JSON.stringify({ event: "session_start", timestamp: "2025-01-01T00:00:00Z", trace_id: "t1" })}\n`;
      fs.writeFileSync(logPath, line);
      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();
      assert.equal(ingester.getOffset(), Buffer.byteLength(line));
    });

    it("getStats returns correct cumulative statistics", () => {
      const lines = [
        JSON.stringify({
          event: "session_start",
          timestamp: "2025-01-01T00:00:00Z",
          trace_id: "t1",
        }),
        "bad json here",
        JSON.stringify({
          event: "tool_called",
          timestamp: "2025-01-01T00:00:01Z",
          trace_id: "t1",
          tool: "bash",
        }),
      ];
      fs.writeFileSync(logPath, `${lines.join("\n")}\n`);

      const ingester = new JournalIngester(tmpDir, stream);
      ingester.ingestNewLines();

      const stats = ingester.getStats();
      assert.equal(stats.ingested, 2);
      assert.equal(stats.malformedLines, 1);
      assert.equal(stats.readErrors, 0);
      assert.ok(stats.offset > 0);
    });

    it("getStats returns zeroes before any ingestion", () => {
      const ingester = new JournalIngester(tmpDir, stream);
      const stats = ingester.getStats();
      assert.equal(stats.ingested, 0);
      assert.equal(stats.malformedLines, 0);
      assert.equal(stats.readErrors, 0);
      assert.equal(stats.offset, 0);
    });
  });
});
