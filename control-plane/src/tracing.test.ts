/**
 * Tests for Distributed Tracing (OB-02)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
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
    assert.ok(id.match(/^[0-9a-f]{32}$/));
  });

  it("generates valid span IDs (16 hex chars)", () => {
    const id = TracingContext.generateSpanId();
    assert.ok(id.match(/^[0-9a-f]{16}$/));
  });

  it("creates spans with all required fields", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    const span = ctx.startSpan("test_operation", {
      attributes: { key: "value" },
    });

    assert.strictEqual(span.trace_id, ctx.id);
    assert.ok(span.span_id.match(/^[0-9a-f]{16}$/));
    assert.strictEqual(span.operation, "test_operation");
    assert.ok(span.start_time.match(/^\d{4}-\d{2}-\d{2}T/));
    assert.strictEqual(span.end_time, null);
    assert.strictEqual(span.status, "in_progress");
    assert.deepStrictEqual(span.attributes, { key: "value" });
  });

  it("ends spans with duration calculation", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    const span = ctx.startSpan("test_op");

    ctx.endSpan(span.span_id, "ok", { result: "success" });

    const spans = ctx.getSpans();
    assert.strictEqual(spans[0].status, "ok");
    assert.ok(spans[0].end_time !== null);
    assert.ok(spans[0].duration_ms! >= 0);
    assert.strictEqual(spans[0].attributes.result, "success");
  });

  it("supports parent-child span relationships", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    const parent = ctx.startSpan("parent_op");
    const child = ctx.startSpan("child_op", {
      parentSpanId: parent.span_id,
    });

    assert.strictEqual(child.parent_span_id, parent.span_id);
  });

  it("builds tree from parent-child spans", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    const root = ctx.startSpan("root");
    ctx.startSpan("child1", { parentSpanId: root.span_id });
    ctx.startSpan("child2", { parentSpanId: root.span_id });

    const tree = ctx.buildTree();
    assert.strictEqual(tree.length, 1);
    assert.strictEqual(tree[0].children.length, 2);
    assert.strictEqual(tree[0].operation, "root");
  });

  it("writes spans to trace log file", () => {
    const ctx = new TracingContext({ logDir: tmpDir });
    ctx.startSpan("op1");
    ctx.startSpan("op2");

    const logFile = path.join(tmpDir, "traces.jsonl");
    assert.strictEqual(fs.existsSync(logFile), true);

    const spans = parseTraceFile(logFile);
    assert.ok(spans.length >= 2);
  });

  it("uses provided trace ID", () => {
    const customId = "a".repeat(32);
    const ctx = new TracingContext({ traceId: customId, logDir: tmpDir });
    assert.strictEqual(ctx.id, customId);

    const span = ctx.startSpan("op");
    assert.strictEqual(span.trace_id, customId);
  });
});

describe("parseTraceFile", () => {
  it("handles missing files", () => {
    assert.deepStrictEqual(parseTraceFile("/nonexistent"), []);
  });

  it("handles empty files", () => {
    const tmpFile = path.join(
      os.tmpdir(),
      `trace-test-${Date.now()}.jsonl`,
    );
    fs.writeFileSync(tmpFile, "");
    assert.deepStrictEqual(parseTraceFile(tmpFile), []);
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
    assert.strictEqual(result.length, 2);
  });
});
