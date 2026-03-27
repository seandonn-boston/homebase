/**
 * Thesis Metrics Definition (TV-01)
 *
 * Defines measurable metrics for both Admiral thesis claims:
 * 1. "Deterministic enforcement beats advisory guidance"
 * 2. "AI agents can be governed as a workforce"
 *
 * Each metric includes: measurement method, evidence-for threshold,
 * evidence-against threshold, and null hypothesis.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ThesisMetric {
  id: string;
  claim: ThesisClaim;
  name: string;
  description: string;
  measurementMethod: string;
  unit: string;
  /** Direction: true = higher supports thesis, false = lower supports thesis */
  higherSupportsThesis: boolean;
  /** Threshold above/below which the thesis is supported */
  evidenceForThreshold: number;
  /** Threshold above/below which the thesis is contradicted */
  evidenceAgainstThreshold: number;
  nullHypothesis: string;
  collectionFrequency: string;
  minimumSampleSize: number;
}

export type ThesisClaim =
  | "enforcement-beats-advisory"
  | "agents-as-workforce";

export interface ThesisClaimDefinition {
  id: ThesisClaim;
  statement: string;
  operationalDefinition: string;
  metrics: string[]; // metric IDs
}

export interface MetricMeasurement {
  metricId: string;
  timestamp: string;
  value: number;
  sampleSize: number;
  conditions: string;
  notes: string;
}

export interface ThesisEvidenceAssessment {
  metricId: string;
  currentValue: number | null;
  sampleSize: number;
  verdict: "supports" | "contradicts" | "inconclusive" | "insufficient-data";
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Thesis Claims
// ---------------------------------------------------------------------------

export const THESIS_CLAIMS: readonly ThesisClaimDefinition[] = [
  {
    id: "enforcement-beats-advisory",
    statement:
      "Deterministic enforcement beats advisory guidance for AI agent governance.",
    operationalDefinition:
      "When identical tasks are run under advisory-only mode (hooks warn but don't block) " +
      "vs. enforcement mode (hooks block violations), enforcement mode produces fewer " +
      "constraint violations, higher first-pass quality, and equivalent or better task " +
      "completion times. The improvement from enforcement must be statistically significant " +
      "(p < 0.05) across a minimum sample of 10 task pairs.",
    metrics: [
      "violation-rate-reduction",
      "violation-severity-reduction",
      "first-pass-quality-improvement",
      "completion-time-impact",
      "escalation-rate-impact",
      "false-positive-rate",
    ],
  },
  {
    id: "agents-as-workforce",
    statement:
      "AI agents can be governed as a workforce — not just used as tools — " +
      "when the right infrastructure exists.",
    operationalDefinition:
      "A governed agent fleet can sustain multi-session, multi-agent work with " +
      "decreasing failure rates over time, improving first-pass quality correlated " +
      "with governance maturity, and institutional knowledge accumulation (Brain reuse " +
      "rate > 15%). Governance overhead must remain below 25% of total execution time.",
    metrics: [
      "quality-improvement-correlation",
      "knowledge-reuse-rate",
      "governance-overhead-ratio",
      "multi-session-continuity",
      "fleet-coordination-success",
      "recovery-rate-improvement",
    ],
  },
];

// ---------------------------------------------------------------------------
// Metric Definitions
// ---------------------------------------------------------------------------

export const THESIS_METRICS: readonly ThesisMetric[] = [
  // Claim 1: Enforcement beats advisory
  {
    id: "violation-rate-reduction",
    claim: "enforcement-beats-advisory",
    name: "Violation Rate Reduction",
    description:
      "Percentage reduction in constraint violations when enforcement is active " +
      "vs. advisory-only mode.",
    measurementMethod:
      "A/B comparison: run identical tasks with hooks in advisory mode (A) and " +
      "enforcement mode (B). Count violations per task in each mode. Calculate " +
      "(A_violations - B_violations) / A_violations * 100.",
    unit: "percent",
    higherSupportsThesis: true,
    evidenceForThreshold: 50,
    evidenceAgainstThreshold: 10,
    nullHypothesis:
      "H0: There is no significant difference in violation rates between advisory " +
      "and enforcement modes (violation_rate_advisory = violation_rate_enforcement).",
    collectionFrequency: "per A/B test run",
    minimumSampleSize: 10,
  },
  {
    id: "violation-severity-reduction",
    claim: "enforcement-beats-advisory",
    name: "Violation Severity Reduction",
    description:
      "Reduction in mean violation severity when enforcement is active. Severity " +
      "is classified as critical (4), high (3), medium (2), low (1).",
    measurementMethod:
      "For each A/B pair, compute mean severity of violations in advisory mode vs. " +
      "enforcement mode. Report the difference and its significance.",
    unit: "severity-points",
    higherSupportsThesis: true,
    evidenceForThreshold: 1.0,
    evidenceAgainstThreshold: 0.2,
    nullHypothesis:
      "H0: Mean violation severity is the same in advisory and enforcement modes.",
    collectionFrequency: "per A/B test run",
    minimumSampleSize: 10,
  },
  {
    id: "first-pass-quality-improvement",
    claim: "enforcement-beats-advisory",
    name: "First-Pass Quality Improvement",
    description:
      "Percentage point improvement in first-pass quality (outputs that pass " +
      "review without revision) under enforcement vs. advisory.",
    measurementMethod:
      "Compare first-pass quality rate in enforcement mode vs. advisory mode. " +
      "A reviewer (or automated check) evaluates whether each task output meets " +
      "quality criteria on first submission.",
    unit: "percentage-points",
    higherSupportsThesis: true,
    evidenceForThreshold: 10,
    evidenceAgainstThreshold: -5,
    nullHypothesis:
      "H0: First-pass quality rate is equal in advisory and enforcement modes.",
    collectionFrequency: "per A/B test run",
    minimumSampleSize: 10,
  },
  {
    id: "completion-time-impact",
    claim: "enforcement-beats-advisory",
    name: "Completion Time Impact",
    description:
      "Percentage change in task completion time under enforcement vs. advisory. " +
      "Enforcement should not increase completion time by more than 15%.",
    measurementMethod:
      "Measure wall-clock time per task in both modes. Calculate " +
      "(enforcement_time - advisory_time) / advisory_time * 100. " +
      "Negative = enforcement is faster.",
    unit: "percent",
    higherSupportsThesis: false,
    evidenceForThreshold: 15,
    evidenceAgainstThreshold: 30,
    nullHypothesis:
      "H0: Task completion time is the same in advisory and enforcement modes.",
    collectionFrequency: "per A/B test run",
    minimumSampleSize: 10,
  },
  {
    id: "escalation-rate-impact",
    claim: "enforcement-beats-advisory",
    name: "Escalation Rate Impact",
    description:
      "Change in escalation rate under enforcement. Some increase is expected " +
      "(enforcement catches more issues), but excessive escalation indicates " +
      "the governance is too rigid.",
    measurementMethod:
      "Count escalations per task in both modes. A moderate increase (up to 2x) " +
      "in enforcement mode is acceptable if violations decrease proportionally.",
    unit: "ratio",
    higherSupportsThesis: false,
    evidenceForThreshold: 2.0,
    evidenceAgainstThreshold: 5.0,
    nullHypothesis:
      "H0: Escalation rate is the same in advisory and enforcement modes.",
    collectionFrequency: "per A/B test run",
    minimumSampleSize: 10,
  },
  {
    id: "false-positive-rate",
    claim: "enforcement-beats-advisory",
    name: "False Positive Rate",
    description:
      "Percentage of enforcement actions that block legitimate work. " +
      "High false positive rates undermine the thesis.",
    measurementMethod:
      "Track every hook block. Classify as true positive (correctly blocked) or " +
      "false positive (incorrectly blocked legitimate action). Calculate " +
      "false_positives / total_blocks * 100.",
    unit: "percent",
    higherSupportsThesis: false,
    evidenceForThreshold: 5,
    evidenceAgainstThreshold: 20,
    nullHypothesis:
      "H0: The false positive rate of enforcement hooks exceeds 20%.",
    collectionFrequency: "continuous",
    minimumSampleSize: 50,
  },

  // Claim 2: Agents as workforce
  {
    id: "quality-improvement-correlation",
    claim: "agents-as-workforce",
    name: "Quality-Governance Correlation",
    description:
      "Correlation coefficient between governance coverage percentage and " +
      "agent output quality over time. Positive correlation supports the thesis.",
    measurementMethod:
      "Track governance coverage (% of SOs enforced) and first-pass quality rate " +
      "over time. Compute Pearson correlation coefficient. Annotate governance " +
      "milestones (new hooks, new SOs) on the quality timeline.",
    unit: "correlation-coefficient",
    higherSupportsThesis: true,
    evidenceForThreshold: 0.5,
    evidenceAgainstThreshold: 0.0,
    nullHypothesis:
      "H0: There is no correlation between governance coverage and output quality " +
      "(r = 0).",
    collectionFrequency: "weekly",
    minimumSampleSize: 12,
  },
  {
    id: "knowledge-reuse-rate",
    claim: "agents-as-workforce",
    name: "Knowledge Reuse Rate",
    description:
      "Percentage of tasks that leverage existing Brain entries. " +
      "Workforce agents build and reuse institutional knowledge.",
    measurementMethod:
      "For each task, check whether Brain entries were queried and whether query " +
      "results influenced the output (non-empty results that the agent referenced). " +
      "Calculate tasks_with_brain_reuse / total_tasks * 100.",
    unit: "percent",
    higherSupportsThesis: true,
    evidenceForThreshold: 15,
    evidenceAgainstThreshold: 5,
    nullHypothesis:
      "H0: Knowledge reuse rate is below 5% (agents do not meaningfully reuse " +
      "institutional knowledge).",
    collectionFrequency: "per session",
    minimumSampleSize: 20,
  },
  {
    id: "governance-overhead-ratio",
    claim: "agents-as-workforce",
    name: "Governance Overhead Ratio",
    description:
      "Percentage of total execution time/tokens consumed by governance. " +
      "Must remain below 25% (rating system hard cap).",
    measurementMethod:
      "Measure tokens consumed by governance (hook processing, context injection, " +
      "enforcement checks) vs. total tokens consumed. Calculate " +
      "governance_tokens / total_tokens * 100.",
    unit: "percent",
    higherSupportsThesis: false,
    evidenceForThreshold: 25,
    evidenceAgainstThreshold: 40,
    nullHypothesis:
      "H0: Governance overhead exceeds 25% of total execution resources.",
    collectionFrequency: "per session",
    minimumSampleSize: 10,
  },
  {
    id: "multi-session-continuity",
    claim: "agents-as-workforce",
    name: "Multi-Session Continuity",
    description:
      "Percentage of multi-session tasks that complete successfully without " +
      "context loss or state corruption across session boundaries.",
    measurementMethod:
      "Track tasks that span multiple sessions. Measure whether session handoff " +
      "preserves context (Brain entries, git state, plan progress). Calculate " +
      "successful_continuations / total_continuations * 100.",
    unit: "percent",
    higherSupportsThesis: true,
    evidenceForThreshold: 80,
    evidenceAgainstThreshold: 50,
    nullHypothesis:
      "H0: Multi-session continuity rate is below 50% (governance does not " +
      "meaningfully improve cross-session work).",
    collectionFrequency: "per multi-session task",
    minimumSampleSize: 10,
  },
  {
    id: "fleet-coordination-success",
    claim: "agents-as-workforce",
    name: "Fleet Coordination Success Rate",
    description:
      "Percentage of multi-agent tasks where handoffs and coordination complete " +
      "without conflict or data loss.",
    measurementMethod:
      "Track multi-agent coordination events (handoffs, parallel work, conflict " +
      "resolution). Measure successful_coordinations / total_coordinations * 100.",
    unit: "percent",
    higherSupportsThesis: true,
    evidenceForThreshold: 85,
    evidenceAgainstThreshold: 60,
    nullHypothesis:
      "H0: Fleet coordination success rate is below 60% (governance does not " +
      "enable effective multi-agent coordination).",
    collectionFrequency: "per fleet task",
    minimumSampleSize: 10,
  },
  {
    id: "recovery-rate-improvement",
    claim: "agents-as-workforce",
    name: "Recovery Rate Improvement",
    description:
      "Improvement in error recovery rate over time as governance matures. " +
      "Workforce agents should get better at recovering from failures.",
    measurementMethod:
      "Track recovery success rate at governance milestones. Compute the trend " +
      "line slope. Positive slope = improving recovery.",
    unit: "percentage-points-per-quarter",
    higherSupportsThesis: true,
    evidenceForThreshold: 5,
    evidenceAgainstThreshold: -2,
    nullHypothesis:
      "H0: Recovery rate does not improve as governance matures (slope <= 0).",
    collectionFrequency: "quarterly",
    minimumSampleSize: 4,
  },
];

// ---------------------------------------------------------------------------
// Evidence Assessment
// ---------------------------------------------------------------------------

export function assessMetric(
  metric: ThesisMetric,
  value: number | null,
  sampleSize: number,
): ThesisEvidenceAssessment {
  if (value === null || sampleSize < metric.minimumSampleSize) {
    return {
      metricId: metric.id,
      currentValue: value,
      sampleSize,
      verdict: "insufficient-data",
      confidence: "low",
      reasoning: value === null
        ? "No measurement data available."
        : `Sample size ${sampleSize} below minimum ${metric.minimumSampleSize}.`,
    };
  }

  const supports = metric.higherSupportsThesis
    ? value >= metric.evidenceForThreshold
    : value <= metric.evidenceForThreshold;

  const contradicts = metric.higherSupportsThesis
    ? value <= metric.evidenceAgainstThreshold
    : value >= metric.evidenceAgainstThreshold;

  const confidence: ThesisEvidenceAssessment["confidence"] =
    sampleSize >= metric.minimumSampleSize * 3 ? "high" :
    sampleSize >= metric.minimumSampleSize ? "medium" : "low";

  if (supports) {
    return {
      metricId: metric.id,
      currentValue: value,
      sampleSize,
      verdict: "supports",
      confidence,
      reasoning: `Value ${value} ${metric.unit} meets evidence-for threshold ` +
        `(${metric.higherSupportsThesis ? ">=" : "<="} ${metric.evidenceForThreshold}).`,
    };
  }

  if (contradicts) {
    return {
      metricId: metric.id,
      currentValue: value,
      sampleSize,
      verdict: "contradicts",
      confidence,
      reasoning: `Value ${value} ${metric.unit} meets evidence-against threshold ` +
        `(${metric.higherSupportsThesis ? "<=" : ">="} ${metric.evidenceAgainstThreshold}).`,
    };
  }

  return {
    metricId: metric.id,
    currentValue: value,
    sampleSize,
    verdict: "inconclusive",
    confidence,
    reasoning: `Value ${value} ${metric.unit} is between thresholds ` +
      `(for: ${metric.evidenceForThreshold}, against: ${metric.evidenceAgainstThreshold}).`,
  };
}

/**
 * Assess all metrics for a claim and produce a summary verdict.
 */
export function assessClaim(
  claim: ThesisClaim,
  measurements: Map<string, { value: number | null; sampleSize: number }>,
): {
  claim: ThesisClaim;
  assessments: ThesisEvidenceAssessment[];
  overallVerdict: "supports" | "contradicts" | "inconclusive" | "insufficient-data";
  summary: string;
} {
  const claimMetrics = THESIS_METRICS.filter((m) => m.claim === claim);
  const assessments = claimMetrics.map((m) => {
    const data = measurements.get(m.id);
    return assessMetric(m, data?.value ?? null, data?.sampleSize ?? 0);
  });

  const supporting = assessments.filter((a) => a.verdict === "supports").length;
  const contradicting = assessments.filter((a) => a.verdict === "contradicts").length;
  const insufficient = assessments.filter((a) => a.verdict === "insufficient-data").length;
  const total = assessments.length;

  let overallVerdict: "supports" | "contradicts" | "inconclusive" | "insufficient-data";
  let summary: string;

  if (insufficient > total / 2) {
    overallVerdict = "insufficient-data";
    summary = `${insufficient}/${total} metrics lack sufficient data. Cannot assess claim.`;
  } else if (contradicting > supporting) {
    overallVerdict = "contradicts";
    summary = `${contradicting}/${total} metrics contradict the claim vs. ${supporting} supporting.`;
  } else if (supporting > total / 2) {
    overallVerdict = "supports";
    summary = `${supporting}/${total} metrics support the claim. ${contradicting} contradict.`;
  } else {
    overallVerdict = "inconclusive";
    summary = `Mixed evidence: ${supporting} support, ${contradicting} contradict, ` +
      `${total - supporting - contradicting} inconclusive/insufficient.`;
  }

  return { claim, assessments, overallVerdict, summary };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatMetricsDefinition(): string {
  const lines: string[] = [
    "# Admiral Thesis Metrics Definition",
    "",
    "## Thesis Claims",
    "",
  ];

  for (const claim of THESIS_CLAIMS) {
    lines.push(`### ${claim.statement}`);
    lines.push("", `**Operational Definition:** ${claim.operationalDefinition}`, "");
    lines.push("**Metrics:**");
    for (const metricId of claim.metrics) {
      const m = THESIS_METRICS.find((t) => t.id === metricId);
      if (m) lines.push(`- ${m.name} (${m.unit})`);
    }
    lines.push("");
  }

  lines.push("## Metric Definitions", "");
  lines.push("| Metric | Claim | Unit | Evidence For | Evidence Against | Null Hypothesis |");
  lines.push("|--------|-------|------|-------------|-----------------|-----------------|");

  for (const m of THESIS_METRICS) {
    const dir = m.higherSupportsThesis ? ">=" : "<=";
    const dirAgainst = m.higherSupportsThesis ? "<=" : ">=";
    lines.push(
      `| ${m.name} | ${m.claim} | ${m.unit} | ` +
      `${dir} ${m.evidenceForThreshold} | ` +
      `${dirAgainst} ${m.evidenceAgainstThreshold} | ` +
      `${m.nullHypothesis.slice(0, 60)}... |`,
    );
  }

  return lines.join("\n");
}
