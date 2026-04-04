/**
 * Tests for Canonical Trace Format (OB-17)
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { CanonicalTraceBuilder } from "./trace-format";

describe("CanonicalTraceBuilder", () => {
  let builder: CanonicalTraceBuilder;

  beforeEach(() => {
    builder = new CanonicalTraceBuilder("trace-001", "session-001");
  });

  it("builds a trace with metadata", () => {
    builder.addSpan({
      spanId: "s1",
      agentId: "agent-1",
      operation: "plan",
      startTime: 1000,
      endTime: 2000,
      duration: 1000,
      costAttribution: { tokens: 500, modelTier: "tier-1" },
      tags: {},
    });

    const trace = builder.build();
    assert.strictEqual(trace.traceId, "trace-001");
    assert.strictEqual(trace.sessionId, "session-001");
    assert.strictEqual(trace.spans.length, 1);
    assert.strictEqual(trace.metadata.agentCount, 1);
    assert.strictEqual(trace.metadata.totalCost, 500);
  });

  it("sets traceId on added spans", () => {
    builder.addSpan({
      spanId: "s1",
      agentId: "a1",
      operation: "op",
      startTime: 100,
      endTime: 200,
      duration: 100,
      costAttribution: { tokens: 10, modelTier: "t1" },
      tags: {},
    });

    const trace = builder.build();
    assert.strictEqual(trace.spans[0].traceId, "trace-001");
  });

  it("counts distinct agents", () => {
    builder.addSpan({
      spanId: "s1",
      agentId: "agent-1",
      operation: "op1",
      startTime: 100,
      endTime: 200,
      duration: 100,
      costAttribution: { tokens: 10, modelTier: "t1" },
      tags: {},
    });
    builder.addSpan({
      spanId: "s2",
      agentId: "agent-2",
      operation: "op2",
      startTime: 200,
      endTime: 300,
      duration: 100,
      costAttribution: { tokens: 20, modelTier: "t1" },
      tags: {},
    });
    builder.addSpan({
      spanId: "s3",
      agentId: "agent-1",
      operation: "op3",
      startTime: 300,
      endTime: 400,
      duration: 100,
      costAttribution: { tokens: 30, modelTier: "t1" },
      tags: {},
    });

    const trace = builder.build();
    assert.strictEqual(trace.metadata.agentCount, 2);
    assert.strictEqual(trace.metadata.totalCost, 60);
  });

  it("tracks governance events from violations", () => {
    builder.addSpan({
      spanId: "s1",
      agentId: "a1",
      operation: "op",
      startTime: 100,
      endTime: 200,
      duration: 100,
      costAttribution: { tokens: 10, modelTier: "t1" },
      governanceMetadata: {
        standingOrdersChecked: ["SO-001"],
        violations: ["V-001", "V-002"],
      },
      tags: {},
    });

    const trace = builder.build();
    assert.strictEqual(trace.metadata.governanceEvents, 2);
  });

  it("adds causal links", () => {
    builder.addCausalLink({
      from: "s1",
      to: "s2",
      type: "triggers",
    });
    builder.addCausalLink({
      from: "s2",
      to: "s3",
      type: "depends_on",
    });

    const trace = builder.build();
    assert.strictEqual(trace.causalLinks.length, 2);
    assert.strictEqual(trace.causalLinks[0].type, "triggers");
  });

  it("computes start and end times from spans", () => {
    builder.addSpan({
      spanId: "s1",
      agentId: "a1",
      operation: "first",
      startTime: 500,
      endTime: 800,
      duration: 300,
      costAttribution: { tokens: 10, modelTier: "t1" },
      tags: {},
    });
    builder.addSpan({
      spanId: "s2",
      agentId: "a1",
      operation: "second",
      startTime: 200,
      endTime: 1200,
      duration: 1000,
      costAttribution: { tokens: 10, modelTier: "t1" },
      tags: {},
    });

    const trace = builder.build();
    assert.strictEqual(trace.startTime, 200);
    assert.strictEqual(trace.endTime, 1200);
  });

  it("serializes to JSON", () => {
    builder.addSpan({
      spanId: "s1",
      agentId: "a1",
      operation: "op",
      startTime: 100,
      endTime: 200,
      duration: 100,
      costAttribution: { tokens: 10, modelTier: "t1" },
      tags: {},
    });

    const json = builder.toJSON();
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.traceId, "trace-001");
    assert.strictEqual(parsed.spans.length, 1);
  });

  it("exports to OpenTelemetry format", () => {
    builder.addSpan({
      spanId: "s1",
      agentId: "a1",
      operation: "op",
      startTime: 100,
      endTime: 200,
      duration: 100,
      costAttribution: { tokens: 10, modelTier: "t1" },
      tags: { env: "test" },
    });

    // biome-ignore lint/suspicious/noExplicitAny: test assertion on dynamic export format
    const otel = builder.toOpenTelemetry() as any;
    assert.ok(otel.resourceSpans !== undefined);
    const spans = otel.resourceSpans[0].scopeSpans[0].spans;
    assert.strictEqual(spans.length, 1);
    assert.strictEqual(spans[0].name, "op");
    // biome-ignore lint/suspicious/noExplicitAny: test attribute lookup
    assert.ok(spans[0].attributes.find((a: any) => a.key === "agent.id") !== undefined);
  });
});
