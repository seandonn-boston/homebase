/**
 * Tests for Distributed Tracing (OB-02)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TracingContext, parseTraceFile, getSpansByTraceId } from "./tracing";

describe("TracingContext", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admiral-trace-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("generates valid trace IDs (32 hex chars)", () => {
    const id = TracingContext.generateTraceId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("generates valid span IDs (16 hex chars)", () => {
    const id = TracingContext.generateSpanId();
    expect(id).toMatch(/^[0-9a-f]{16}$/);
  });

  it("creates spans with all required fields", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    const span = ctx.startSpan("test_operation", {
      attributes: { key: "value" },
    });

    expect(span.trace_id).toBe(ctx.id);
    expect(span.span_id).toMatch(/^[0-9a-f]{16}$/);
    expect(span.operation).toBe("test_operation");
    expect(span.start_time).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(span.end_time).toBeNull();
    expect(span.status).toBe("in_progress");
    expect(span.attributes).toEqual({ key: "value" });
  });

  it("ends spans with duration calculation", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    const span = ctx.startSpan("test_op");

    ctx.endSpan(span.span_id, "ok", { result: "success" });

    const spans = ctx.getSpans();
    expect(spans[0].status).toBe("ok");
    expect(spans[0].end_time).not.toBeNull();
    expect(spans[0].duration_ms).toBeGreaterThanOrEqual(0);
    expect(spans[0].attributes.result).toBe("success");
  });

  it("supports parent-child span relationships", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    const parent = ctx.startSpan("parent_op");
    const child = ctx.startSpan("child_op", {
      parentSpanId: parent.span_id,
    });

    expect(child.parent_span_id).toBe(parent.span_id);
  });

  it("builds tree from parent-child spans", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    const root = ctx.startSpan("root");
    ctx.startSpan("child1", { parentSpanId: root.span_id });
    ctx.startSpan("child2", { parentSpanId: root.span_id });

    const tree = ctx.buildTree();
    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].operation).toBe("root");
  });

  it("writes spans to trace log file", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    ctx.startSpan("op1");
    ctx.startSpan("op2");

    const logFile = path.join(tmpDir, "traces.jsonl");
    expect(fs.existsSync(logFile)).toBe(true);

    const spans = parseTraceFile(logFile);
    expect(spans.length).toBeGreaterThanOrEqual(2);
  });

  it("uses provided trace ID", () => {
    const customId = "a".repeat(32);
    const ctx = new TracingContext({ traceId: customId, logDir: tmpDir });
    expect(ctx.id).toBe(customId);

    const span = ctx.startSpan("op");
    expect(span.trace_id).toBe(customId);
  });
});

describe("parseTraceFile", () => {
  it("handles missing files", () => {
    expect(parseTraceFile("/nonexistent")).toEqual([]);
  });

  it("handles empty files", () => {
    const tmpFile = path.join(
      os.tmpdir(),
      `trace-test-${Date.now()}.jsonl`,
    );
    fs.writeFileSync(tmpFile, "");
    expect(parseTraceFile(tmpFile)).toEqual([]);
    fs.unlinkSync(tmpFile);
  });
});

describe("getSpansByTraceId", () => {
  it("filters spans by trace ID", () => {
    const spans = [
      { trace_id: "aaa", span_id: "1" },
      { trace_id: "bbb", span_id: "2" },
      { trace_id: "aaa", span_id: "3" },
    ] as any[];

    const result = getSpansByTraceId(spans, "aaa");
    expect(result).toHaveLength(2);
  });
});
