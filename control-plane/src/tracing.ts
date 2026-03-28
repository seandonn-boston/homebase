/**
 * Admiral Framework — Distributed Tracing (OB-02)
 *
 * Trace ID generation, span creation, and context propagation.
 * OpenTelemetry-compatible format. Extends the existing ExecutionTrace
 * with structured tracing primitives.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

export interface Span {
  trace_id: string;
  span_id: string;
  parent_span_id: string | null;
  operation: string;
  start_time: string;
  end_time: string | null;
  status: "in_progress" | "ok" | "error";
  attributes: Record<string, unknown>;
  duration_ms?: number;
}

export class TracingContext {
  private traceId: string;
  private spans: Map<string, Span> = new Map();
  private logFile: string | null;
  private logDir: string | null;

  constructor(opts?: { traceId?: string; logDir?: string }) {
    this.traceId = opts?.traceId ?? TracingContext.generateTraceId();
    this.logDir = opts?.logDir ?? null;
    this.logFile = this.logDir
      ? path.join(this.logDir, "traces.jsonl")
      : null;
  }

  /** Generate a 32-char hex trace ID */
  static generateTraceId(): string {
    return crypto.randomBytes(16).toString("hex");
  }

  /** Generate a 16-char hex span ID */
  static generateSpanId(): string {
    return crypto.randomBytes(8).toString("hex");
  }

  get id(): string {
    return this.traceId;
  }

  /** Start a new span */
  startSpan(
    operation: string,
    opts?: {
      parentSpanId?: string;
      attributes?: Record<string, unknown>;
    },
  ): Span {
    const span: Span = {
      trace_id: this.traceId,
      span_id: TracingContext.generateSpanId(),
      parent_span_id: opts?.parentSpanId ?? null,
      operation,
      start_time: new Date().toISOString(),
      end_time: null,
      status: "in_progress",
      attributes: opts?.attributes ?? {},
    };

    this.spans.set(span.span_id, span);
    this.writeSpan(span);
    return span;
  }

  /** End a span */
  endSpan(
    spanId: string,
    status: "ok" | "error" = "ok",
    attributes?: Record<string, unknown>,
  ): void {
    const span = this.spans.get(spanId);
    if (!span) return;

    span.end_time = new Date().toISOString();
    span.status = status;
    if (attributes) {
      span.attributes = { ...span.attributes, ...attributes };
    }
    span.duration_ms =
      new Date(span.end_time).getTime() -
      new Date(span.start_time).getTime();

    this.writeSpan(span);
  }

  /** Get all spans for this trace */
  getSpans(): Span[] {
    return Array.from(this.spans.values());
  }

  /** Build a tree structure from spans */
  buildTree(): Array<Span & { children: Span[] }> {
    const spanMap = new Map<string, Span & { children: Span[] }>();
    const roots: Array<Span & { children: Span[] }> = [];

    for (const span of this.spans.values()) {
      spanMap.set(span.span_id, { ...span, children: [] });
    }

    for (const node of spanMap.values()) {
      if (node.parent_span_id && spanMap.has(node.parent_span_id)) {
        spanMap.get(node.parent_span_id)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  private writeSpan(span: Span): void {
    if (!this.logFile || !this.logDir) return;
    try {
      fs.mkdirSync(this.logDir, { recursive: true });
      fs.appendFileSync(this.logFile, `${JSON.stringify(span)}\n`);
    } catch {
      // Tracing should never crash the application
    }
  }
}

/** Parse a traces.jsonl file into Span array */
export function parseTraceFile(filePath: string): Span[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8").trim();
  if (!content) return [];
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Span);
}

/** Filter spans by trace ID from a parsed trace file */
export function getSpansByTraceId(spans: Span[], traceId: string): Span[] {
  return spans.filter((s) => s.trace_id === traceId);
}
