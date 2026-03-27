/**
 * Prediction Model Specifications (IF-13)
 *
 * 6 prediction models: context exhaustion, budget exhaustion,
 * quality degradation, retry loop risk, tool failure cascade,
 * orchestrator overload. Simple trend extrapolation, not ML.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PredictionType =
  | "context-exhaustion"
  | "budget-exhaustion"
  | "quality-degradation"
  | "retry-loop-risk"
  | "tool-failure-cascade"
  | "orchestrator-overload";

export interface PredictionInput {
  /** Recent data points (most recent last) */
  dataPoints: number[];
  /** Timestamps matching data points */
  timestamps: string[];
  /** Current capacity/limit */
  limit: number;
  /** Threshold that triggers warning */
  warningThreshold: number;
}

export interface Prediction {
  type: PredictionType;
  riskLevel: "low" | "medium" | "high" | "critical";
  timeToThresholdMs: number | null;
  currentValue: number;
  projectedValue: number;
  confidence: "high" | "medium" | "low";
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Trend Extrapolation
// ---------------------------------------------------------------------------

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

function projectValue(values: number[], stepsAhead: number): number {
  const { slope, intercept } = linearRegression(values);
  return intercept + slope * (values.length - 1 + stepsAhead);
}

function timeToThreshold(values: number[], threshold: number, intervalMs: number): number | null {
  const { slope, intercept } = linearRegression(values);
  if (slope === 0) return null;

  const currentIdx = values.length - 1;
  const currentValue = intercept + slope * currentIdx;

  // For increasing trends approaching threshold from below
  if (slope > 0 && currentValue < threshold) {
    const stepsNeeded = (threshold - currentValue) / slope;
    return Math.max(0, stepsNeeded * intervalMs);
  }

  // For decreasing trends approaching threshold from above
  if (slope < 0 && currentValue > threshold) {
    const stepsNeeded = (currentValue - threshold) / Math.abs(slope);
    return Math.max(0, stepsNeeded * intervalMs);
  }

  // Already past threshold
  if ((slope > 0 && currentValue >= threshold) || (slope < 0 && currentValue <= threshold)) {
    return 0;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Prediction Models
// ---------------------------------------------------------------------------

/**
 * Context exhaustion: linear extrapolation of context usage.
 */
export function predictContextExhaustion(input: PredictionInput): Prediction {
  const current = input.dataPoints[input.dataPoints.length - 1] ?? 0;
  const projected = projectValue(input.dataPoints, 5);
  const ttl = timeToThreshold(input.dataPoints, input.limit, 60000);

  return {
    type: "context-exhaustion",
    riskLevel: current > input.limit * 0.9 ? "critical" : current > input.limit * 0.7 ? "high" : current > input.limit * 0.5 ? "medium" : "low",
    timeToThresholdMs: ttl,
    currentValue: current,
    projectedValue: Math.round(projected),
    confidence: input.dataPoints.length >= 5 ? "high" : input.dataPoints.length >= 3 ? "medium" : "low",
    recommendation: current > input.limit * 0.8 ? "Compress context or checkpoint session." : "Monitor context growth rate.",
  };
}

/**
 * Budget exhaustion: burn rate projection.
 */
export function predictBudgetExhaustion(input: PredictionInput): Prediction {
  const current = input.dataPoints[input.dataPoints.length - 1] ?? 0;
  const projected = projectValue(input.dataPoints, 10);
  const ttl = timeToThreshold(input.dataPoints, input.limit, 60000);

  return {
    type: "budget-exhaustion",
    riskLevel: current > input.limit * 0.9 ? "critical" : current > input.limit * 0.75 ? "high" : current > input.limit * 0.5 ? "medium" : "low",
    timeToThresholdMs: ttl,
    currentValue: current,
    projectedValue: Math.round(projected),
    confidence: input.dataPoints.length >= 5 ? "high" : "medium",
    recommendation: current > input.limit * 0.8 ? "Reduce model tier or pause non-critical tasks." : "Monitor burn rate.",
  };
}

/**
 * Quality degradation: correlated threshold warning.
 */
export function predictQualityDegradation(input: PredictionInput): Prediction {
  const current = input.dataPoints[input.dataPoints.length - 1] ?? 100;
  const { slope } = linearRegression(input.dataPoints);
  const projected = projectValue(input.dataPoints, 5);

  return {
    type: "quality-degradation",
    riskLevel: slope < -3 ? "critical" : slope < -1 ? "high" : slope < 0 ? "medium" : "low",
    timeToThresholdMs: slope < 0 ? timeToThreshold(input.dataPoints, input.warningThreshold, 60000) : null,
    currentValue: current,
    projectedValue: Math.round(projected),
    confidence: input.dataPoints.length >= 5 ? "high" : "medium",
    recommendation: slope < -1 ? "Investigate quality decline. Check context, fatigue, or complexity increase." : "Quality stable.",
  };
}

/**
 * Retry loop risk: frequency-based >3 errors/5min.
 */
export function predictRetryLoopRisk(input: PredictionInput): Prediction {
  const recent = input.dataPoints.slice(-5);
  const errorRate = recent.reduce((a, b) => a + b, 0) / Math.max(recent.length, 1);
  const projected = projectValue(input.dataPoints, 3);

  return {
    type: "retry-loop-risk",
    riskLevel: errorRate > 3 ? "critical" : errorRate > 2 ? "high" : errorRate > 1 ? "medium" : "low",
    timeToThresholdMs: errorRate > input.warningThreshold ? 0 : null,
    currentValue: errorRate,
    projectedValue: Math.round(projected * 100) / 100,
    confidence: input.dataPoints.length >= 5 ? "high" : "low",
    recommendation: errorRate > 2 ? "Break retry loop: change approach or escalate." : "Error rate normal.",
  };
}

/**
 * Tool failure cascade: latency trend extrapolation.
 */
export function predictToolFailureCascade(input: PredictionInput): Prediction {
  const current = input.dataPoints[input.dataPoints.length - 1] ?? 0;
  const { slope } = linearRegression(input.dataPoints);
  const projected = projectValue(input.dataPoints, 5);

  return {
    type: "tool-failure-cascade",
    riskLevel: slope > 500 ? "critical" : slope > 200 ? "high" : slope > 50 ? "medium" : "low",
    timeToThresholdMs: slope > 0 ? timeToThreshold(input.dataPoints, input.limit, 1000) : null,
    currentValue: current,
    projectedValue: Math.round(projected),
    confidence: input.dataPoints.length >= 5 ? "high" : "medium",
    recommendation: slope > 200 ? "Tool latency increasing rapidly. Check downstream services." : "Tool latency stable.",
  };
}

/**
 * Orchestrator overload: multi-signal composite.
 */
export function predictOrchestratorOverload(input: PredictionInput): Prediction {
  const current = input.dataPoints[input.dataPoints.length - 1] ?? 0;
  const { slope } = linearRegression(input.dataPoints);
  const projected = projectValue(input.dataPoints, 5);

  return {
    type: "orchestrator-overload",
    riskLevel: current > input.limit * 0.9 ? "critical" : current > input.limit * 0.7 ? "high" : current > input.limit * 0.5 ? "medium" : "low",
    timeToThresholdMs: slope > 0 ? timeToThreshold(input.dataPoints, input.limit, 60000) : null,
    currentValue: current,
    projectedValue: Math.round(projected),
    confidence: input.dataPoints.length >= 5 ? "high" : "medium",
    recommendation: current > input.limit * 0.7 ? "Reduce fleet size or defer non-critical tasks." : "Orchestrator load normal.",
  };
}

/** Run all 6 predictions. */
export function runAllPredictions(inputs: Record<PredictionType, PredictionInput>): Prediction[] {
  return [
    predictContextExhaustion(inputs["context-exhaustion"]),
    predictBudgetExhaustion(inputs["budget-exhaustion"]),
    predictQualityDegradation(inputs["quality-degradation"]),
    predictRetryLoopRisk(inputs["retry-loop-risk"]),
    predictToolFailureCascade(inputs["tool-failure-cascade"]),
    predictOrchestratorOverload(inputs["orchestrator-overload"]),
  ];
}
