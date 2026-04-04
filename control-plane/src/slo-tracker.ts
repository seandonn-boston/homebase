/**
 * Admiral Framework — SLO/SLI Tracker (OB-08)
 *
 * Defines Service Level Indicators (SLIs) and Service Level Objectives (SLOs)
 * for Admiral components. Tracks 30-day rolling error budgets.
 */

export interface SLI {
  name: string;
  description: string;
  unit: string;
  goodThreshold: number;
  direction: "below" | "above"; // "below" = good when value < threshold
}

export interface SLO {
  sli: string;
  target: number; // e.g., 0.999 for 99.9%
  windowMs: number; // rolling window
}

export interface SLIObservation {
  timestamp: number;
  value: number;
  good: boolean;
}

export interface SLOStatus {
  sli: string;
  target: number;
  current: number;
  errorBudgetTotal: number;
  errorBudgetRemaining: number;
  errorBudgetConsumedPct: number;
  inViolation: boolean;
  observationCount: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/** Core SLIs matching aiStrat/admiral/reference/benchmarks.md */
export const CORE_SLIS: SLI[] = [
  {
    name: "hook_latency_p99",
    description: "Hook execution latency (p99)",
    unit: "ms",
    goodThreshold: 100,
    direction: "below",
  },
  {
    name: "event_ingestion_p99",
    description: "Event ingestion latency (p99)",
    unit: "ms",
    goodThreshold: 500,
    direction: "below",
  },
  {
    name: "brain_query_p99",
    description: "Brain query latency (p99)",
    unit: "ms",
    goodThreshold: 1000,
    direction: "below",
  },
  {
    name: "api_availability",
    description: "Control plane API availability",
    unit: "ratio",
    goodThreshold: 0.999,
    direction: "above",
  },
  {
    name: "first_pass_quality",
    description: "First-pass quality rate",
    unit: "ratio",
    goodThreshold: 0.75,
    direction: "above",
  },
  {
    name: "governance_overhead",
    description: "Governance overhead ratio",
    unit: "ratio",
    goodThreshold: 0.15,
    direction: "below",
  },
  {
    name: "hook_pass_rate",
    description: "Hook pass rate",
    unit: "ratio",
    goodThreshold: 0.95,
    direction: "above",
  },
];

export const CORE_SLOS: SLO[] = CORE_SLIS.map((sli) => ({
  sli: sli.name,
  target: sli.direction === "below" ? 0.99 : sli.goodThreshold,
  windowMs: THIRTY_DAYS_MS,
}));

export class SLOTracker {
  private observations: Map<string, SLIObservation[]> = new Map();
  private slis: Map<string, SLI> = new Map();
  private slos: Map<string, SLO> = new Map();

  constructor(slis?: SLI[], slos?: SLO[]) {
    for (const sli of slis ?? CORE_SLIS) {
      this.slis.set(sli.name, sli);
      this.observations.set(sli.name, []);
    }
    for (const slo of slos ?? CORE_SLOS) {
      this.slos.set(slo.sli, slo);
    }
  }

  /** Record an SLI observation */
  observe(sliName: string, value: number): void {
    const sli = this.slis.get(sliName);
    if (!sli) return;

    const good =
      sli.direction === "below" ? value <= sli.goodThreshold : value >= sli.goodThreshold;

    const observations = this.observations.get(sliName);
    if (observations) {
      observations.push({ timestamp: Date.now(), value, good });
      // Auto-prune when array grows large to prevent unbounded memory growth
      if (observations.length > 10_000) {
        this.pruneOne(sliName);
      }
    }
  }

  /** Get SLO status for a given SLI */
  getStatus(sliName: string): SLOStatus | null {
    const sli = this.slis.get(sliName);
    const slo = this.slos.get(sliName);
    const observations = this.observations.get(sliName);
    if (!sli || !slo || !observations) return null;

    // Filter to rolling window
    const now = Date.now();
    const windowStart = now - slo.windowMs;
    const inWindow = observations.filter((o) => o.timestamp >= windowStart);

    if (inWindow.length === 0) {
      return {
        sli: sliName,
        target: slo.target,
        current: 1,
        errorBudgetTotal: 1 - slo.target,
        errorBudgetRemaining: 1 - slo.target,
        errorBudgetConsumedPct: 0,
        inViolation: false,
        observationCount: 0,
      };
    }

    const goodCount = inWindow.filter((o) => o.good).length;
    const current = goodCount / inWindow.length;
    const errorBudgetTotal = 1 - slo.target;
    const errorBudgetUsed = Math.max(0, 1 - current);
    const errorBudgetRemaining = Math.max(0, errorBudgetTotal - errorBudgetUsed);
    const errorBudgetConsumedPct =
      errorBudgetTotal > 0 ? Math.min(100, (errorBudgetUsed / errorBudgetTotal) * 100) : 0;

    return {
      sli: sliName,
      target: slo.target,
      current,
      errorBudgetTotal,
      errorBudgetRemaining,
      errorBudgetConsumedPct,
      inViolation: current < slo.target,
      observationCount: inWindow.length,
    };
  }

  /** Get status for all SLOs */
  getAllStatus(): SLOStatus[] {
    const statuses: SLOStatus[] = [];
    for (const sliName of this.slis.keys()) {
      const status = this.getStatus(sliName);
      if (status) statuses.push(status);
    }
    return statuses;
  }

  /** Prune old observations outside all windows */
  prune(): number {
    let pruned = 0;
    const now = Date.now();

    for (const [sliName, observations] of this.observations.entries()) {
      const slo = this.slos.get(sliName);
      if (!slo) continue;
      const cutoff = now - slo.windowMs;
      const before = observations.length;
      const kept = observations.filter((o) => o.timestamp >= cutoff);
      this.observations.set(sliName, kept);
      pruned += before - kept.length;
    }

    return pruned;
  }

  private pruneOne(sliName: string): void {
    const slo = this.slos.get(sliName);
    const observations = this.observations.get(sliName);
    if (!slo || !observations) return;
    const cutoff = Date.now() - slo.windowMs;
    this.observations.set(
      sliName,
      observations.filter((o) => o.timestamp >= cutoff),
    );
  }
}
