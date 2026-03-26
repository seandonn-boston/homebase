/**
 * Admiral Framework — Canonical Trace Format (OB-17)
 *
 * Defines the canonical trace format for Admiral, including
 * causal links, cost attribution, and governance metadata.
 * Supports OpenTelemetry-compatible export.
 */

export interface CanonicalTrace {
  traceId: string;
  sessionId: string;
  startTime: number;
  endTime?: number;
  spans: CanonicalSpan[];
  causalLinks: CausalLink[];
  metadata: {
    agentCount: number;
    totalCost: number;
    governanceEvents: number;
  };
}

export interface CanonicalSpan {
  spanId: string;
  parentSpanId?: string;
  traceId: string;
  agentId: string;
  operation: string;
  startTime: number;
  endTime: number;
  duration: number;
  costAttribution: { tokens: number; modelTier: string };
  governanceMetadata?: {
    standingOrdersChecked: string[];
    violations: string[];
  };
  tags: Record<string, string>;
}

export interface CausalLink {
  from: string; // spanId
  to: string; // spanId
  type: "triggers" | "depends_on" | "produces" | "consumes";
}

/**
 * Builds a CanonicalTrace incrementally from spans and causal links.
 */
export class CanonicalTraceBuilder {
  private traceId: string;
  private sessionId: string;
  private spans: CanonicalSpan[] = [];
  private causalLinks: CausalLink[] = [];

  constructor(traceId: string, sessionId: string) {
    this.traceId = traceId;
    this.sessionId = sessionId;
  }

  addSpan(span: Omit<CanonicalSpan, "traceId">): void {
    this.spans.push({ ...span, traceId: this.traceId });
  }

  addCausalLink(link: CausalLink): void {
    this.causalLinks.push(link);
  }

  build(): CanonicalTrace {
    const agentIds = new Set(this.spans.map((s) => s.agentId));
    const totalCost = this.spans.reduce(
      (sum, s) => sum + s.costAttribution.tokens,
      0,
    );
    const governanceEvents = this.spans.reduce(
      (sum, s) => sum + (s.governanceMetadata?.violations.length ?? 0),
      0,
    );

    const startTimes = this.spans.map((s) => s.startTime);
    const endTimes = this.spans.map((s) => s.endTime);

    return {
      traceId: this.traceId,
      sessionId: this.sessionId,
      startTime: startTimes.length > 0 ? Math.min(...startTimes) : 0,
      endTime: endTimes.length > 0 ? Math.max(...endTimes) : undefined,
      spans: [...this.spans],
      causalLinks: [...this.causalLinks],
      metadata: {
        agentCount: agentIds.size,
        totalCost,
        governanceEvents,
      },
    };
  }

  toJSON(): string {
    return JSON.stringify(this.build(), null, 2);
  }

  toOpenTelemetry(): object {
    const trace = this.build();
    return {
      resourceSpans: [
        {
          resource: {
            attributes: [
              { key: "service.name", value: { stringValue: "admiral" } },
              {
                key: "session.id",
                value: { stringValue: trace.sessionId },
              },
            ],
          },
          scopeSpans: [
            {
              scope: { name: "admiral.canonical-trace" },
              spans: trace.spans.map((s) => ({
                traceId: s.traceId,
                spanId: s.spanId,
                parentSpanId: s.parentSpanId ?? "",
                name: s.operation,
                kind: 1,
                startTimeUnixNano: s.startTime * 1_000_000,
                endTimeUnixNano: s.endTime * 1_000_000,
                status: { code: 1 },
                attributes: [
                  {
                    key: "agent.id",
                    value: { stringValue: s.agentId },
                  },
                  {
                    key: "cost.tokens",
                    value: { intValue: s.costAttribution.tokens },
                  },
                  {
                    key: "cost.model_tier",
                    value: { stringValue: s.costAttribution.modelTier },
                  },
                  ...Object.entries(s.tags).map(([k, v]) => ({
                    key: k,
                    value: { stringValue: v },
                  })),
                ],
              })),
            },
          ],
        },
      ],
    };
  }
}
