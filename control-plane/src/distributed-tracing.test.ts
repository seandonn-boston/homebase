/**
 * Tests for Distributed Tracing (OB-02 enhancement)
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { DistributedTracer } from "./distributed-tracing";

describe("DistributedTracer", () => {
  let tracer: DistributedTracer;

  beforeEach(() => {
    tracer = new DistributedTracer();
  });

  it("starts a trace with a root span", () => {
    const span = tracer.startTrace("root-op", "agent-1");
    assert.ok(span.traceId);
    assert.ok(span.spanId);
    assert.strictEqual(span.operationName, "root-op");
    assert.strictEqual(span.agentId, "agent-1");
    assert.strictEqual(span.status, "ok");
    assert.strictEqual(span.parentSpanId, undefined);
  });

  it("creates child spans within a trace", () => {
    const root = tracer.startTrace("root", "agent-1");
    const child = tracer.startSpan(root.traceId, "child-op", root.spanId);
    assert.strictEqual(child.traceId, root.traceId);
    assert.strictEqual(child.parentSpanId, root.spanId);
    assert.strictEqual(child.operationName, "child-op");
  });

  it("ends a span with duration and status", () => {
    const root = tracer.startTrace("op");
    const ended = tracer.endSpan(root.spanId, "ok");
    assert.ok(ended.endTime !== undefined);
    assert.ok(ended.duration! >= 0);
    assert.strictEqual(ended.status, "ok");
  });

  it("ends a span with error status", () => {
    const root = tracer.startTrace("failing-op");
    const ended = tracer.endSpan(root.spanId, "error");
    assert.strictEqual(ended.status, "error");
  });

  it("throws when ending a non-existent span", () => {
    assert.throws(() => tracer.endSpan("nonexistent"), /Span not found/);
  });

  it("retrieves all spans for a trace", () => {
    const root = tracer.startTrace("root");
    tracer.startSpan(root.traceId, "child1", root.spanId);
    tracer.startSpan(root.traceId, "child2", root.spanId);

    const spans = tracer.getTrace(root.traceId);
    assert.strictEqual(spans.length, 3);
  });

  it("retrieves a single span by ID", () => {
    const root = tracer.startTrace("op");
    const found = tracer.getSpan(root.spanId);
    assert.ok(found !== undefined);
    assert.strictEqual(found!.operationName, "op");
    assert.strictEqual(tracer.getSpan("nonexistent"), undefined);
  });

  it("reconstructs spans by session ID", () => {
    const s1 = tracer.startTrace("session-op-1");
    const s2 = tracer.startTrace("session-op-2");
    tracer.tagSession(s1.spanId, "sess-abc");
    tracer.tagSession(s2.spanId, "sess-abc");

    const sessionSpans = tracer.reconstructBySession("sess-abc");
    assert.strictEqual(sessionSpans.length, 2);
  });

  it("adds log entries to spans", () => {
    const root = tracer.startTrace("op");
    tracer.addLog(root.spanId, "step 1 done");
    tracer.addLog(root.spanId, "step 2 done");

    const span = tracer.getSpan(root.spanId)!;
    assert.strictEqual(span.logs.length, 2);
    assert.strictEqual(span.logs[0].message, "step 1 done");
  });

  it("exports trace in OpenTelemetry format", () => {
    const root = tracer.startTrace("export-op", "agent-1");
    tracer.endSpan(root.spanId);

    const exported = tracer.exportTrace(root.traceId) as any;
    assert.ok(exported.resourceSpans !== undefined);
    assert.strictEqual(exported.resourceSpans[0].scopeSpans[0].spans.length, 1);
    assert.strictEqual(exported.resourceSpans[0].scopeSpans[0].spans[0].name, "export-op");
  });
});
