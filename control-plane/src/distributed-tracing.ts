/**
 * Admiral Framework — Distributed Tracing (OB-02 enhancement)
 *
 * Extends the base TracingContext with multi-agent trace correlation,
 * session reconstruction, and OpenTelemetry-compatible export.
 */

import * as crypto from "node:crypto";

export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  operationName: string;
  agentId?: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: "ok" | "error";
  tags: Record<string, string>;
  logs: { timestamp: number; message: string }[];
}

/**
 * Distributed tracer supporting multi-agent trace correlation,
 * session-level reconstruction, and OpenTelemetry-compatible export.
 */
export class DistributedTracer {
  private spans: Map<string, TraceSpan> = new Map();
  private traceIndex: Map<string, Set<string>> = new Map();
  private sessionIndex: Map<string, Set<string>> = new Map();

  /** Generate a 32-char hex trace ID */
  private generateTraceId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /** Generate a 16-char hex span ID */
  private generateSpanId(): string {
    return crypto.randomBytes(8).toString("hex");
  }

  /**
   * Start a new top-level trace.
   * Returns the root span.
   */
  startTrace(operationName: string, agentId?: string): TraceSpan {
    const traceId = this.generateTraceId();
    const spanId = this.generateSpanId();

    const span: TraceSpan = {
      traceId,
      spanId,
      operationName,
      agentId,
      startTime: Date.now(),
      status: "ok",
      tags: {},
      logs: [],
    };

    this.spans.set(spanId, span);
    this.indexByTrace(traceId, spanId);

    return span;
  }

  /**
   * Start a child span within an existing trace.
   */
  startSpan(
    traceId: string,
    operationName: string,
    parentSpanId?: string,
  ): TraceSpan {
    const spanId = this.generateSpanId();

    const span: TraceSpan = {
      traceId,
      spanId,
      parentSpanId,
      operationName,
      startTime: Date.now(),
      status: "ok",
      tags: {},
      logs: [],
    };

    this.spans.set(spanId, span);
    this.indexByTrace(traceId, spanId);

    return span;
  }

  /**
   * End a span by its spanId.
   */
  endSpan(spanId: string, status: "ok" | "error" = "ok"): TraceSpan {
    const span = this.spans.get(spanId);
    if (!span) {
      throw new Error(`Span not found: ${spanId}`);
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;

    return span;
  }

  /**
   * Get all spans belonging to a trace, ordered by startTime.
   */
  getTrace(traceId: string): TraceSpan[] {
    const spanIds = this.traceIndex.get(traceId);
    if (!spanIds) return [];

    return Array.from(spanIds)
      .map((id) => this.spans.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Get a single span by ID.
   */
  getSpan(spanId: string): TraceSpan | undefined {
    return this.spans.get(spanId);
  }

  /**
   * Tag a span with a session ID for later reconstruction.
   */
  tagSession(spanId: string, sessionId: string): void {
    const span = this.spans.get(spanId);
    if (!span) return;
    span.tags["session.id"] = sessionId;

    if (!this.sessionIndex.has(sessionId)) {
      this.sessionIndex.set(sessionId, new Set());
    }
    this.sessionIndex.get(sessionId)!.add(spanId);
  }

  /**
   * Add a log entry to a span.
   */
  addLog(spanId: string, message: string): void {
    const span = this.spans.get(spanId);
    if (!span) return;
    span.logs.push({ timestamp: Date.now(), message });
  }

  /**
   * Export a trace in OpenTelemetry-compatible format.
   */
  exportTrace(traceId: string): object {
    const spans = this.getTrace(traceId);
    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "admiral" } },
            ],
          },
          scopeSpans: [
            {
              scope: { name: "admiral.distributed-tracer" },
              spans: spans.map((s) => ({
                traceId: s.traceId,
                spanId: s.spanId,
                parentSpanId: s.parentSpanId ?? "",
                name: s.operationName,
                kind: 1, // INTERNAL
                startTimeUnixNano: s.startTime * 1_000_000,
                endTimeUnixNano: (s.endTime ?? s.startTime) * 1_000_000,
                status: { code: s.status === "ok" ? 1 : 2 },
                attributes: Object.entries(s.tags).map(([k, v]) => ({
                  key: k,
                  value: { stringValue: v },
                })),
                events: s.logs.map((l) => ({
                  timeUnixNano: l.timestamp * 1_000_000,
                  name: l.message,
                })),
              })),
            },
          ],
        },
      ],
    };
  }

  /**
   * Reconstruct all spans for a given session ID.
   */
  reconstructBySession(sessionId: string): TraceSpan[] {
    const spanIds = this.sessionIndex.get(sessionId);
    if (!spanIds) return [];

    return Array.from(spanIds)
      .map((id) => this.spans.get(id)!)
      .filter(Boolean)
      .sort((a, b) => a.startTime - b.startTime);
  }

  private indexByTrace(traceId: string, spanId: string): void {
    if (!this.traceIndex.has(traceId)) {
      this.traceIndex.set(traceId, new Set());
    }
    this.traceIndex.get(traceId)!.add(spanId);
  }
}
