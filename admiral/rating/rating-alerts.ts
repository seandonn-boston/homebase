/**
 * Rating Alerts (RT-10)
 *
 * Alerts on rating regressions, hard cap threshold crossings,
 * dimension declines, invalidated gates, and rating expiration.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { RatingTier, RatingReport } from "./rating-model";
import { compareTiers, HARD_CAP_RULES, CORE_BENCHMARKS } from "./rating-model";
import type { HistoryEntry, TrendSummary } from "./history-tracker";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertTrigger =
  | "rating-regression"
  | "hard-cap-crossed"
  | "dimension-decline"
  | "gate-invalidated"
  | "rating-expiration";

export interface RatingAlert {
  id: string;
  severity: AlertSeverity;
  trigger: AlertTrigger;
  title: string;
  details: string;
  currentValue: string;
  threshold: string;
  recommendedAction: string;
  timestamp: string;
}

export interface AlertReport {
  timestamp: string;
  alerts: RatingAlert[];
  summary: AlertSummary;
}

export interface AlertSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

// ---------------------------------------------------------------------------
// Alert Detection
// ---------------------------------------------------------------------------

/**
 * Check for overall rating regression.
 */
function checkRatingRegression(
  current: RatingReport,
  previousEntries: HistoryEntry[],
): RatingAlert[] {
  if (previousEntries.length === 0) return [];

  const previous = previousEntries[previousEntries.length - 1];
  if (compareTiers(current.rating, previous.rating) > 0) {
    return [
      {
        id: `regression-${Date.now()}`,
        severity: "critical",
        trigger: "rating-regression",
        title: "Rating Regression Detected",
        details: `Rating dropped from ${previous.rating} to ${current.rating}`,
        currentValue: current.rating,
        threshold: previous.rating,
        recommendedAction: `Investigate what changed since commit ${previous.commitSha}. Check active hard caps and benchmark scores.`,
        timestamp: new Date().toISOString(),
      },
    ];
  }
  return [];
}

/**
 * Check for hard cap threshold crossings.
 */
function checkHardCapCrossings(current: RatingReport): RatingAlert[] {
  return current.activeHardCaps.map((cap) => {
    const rule = HARD_CAP_RULES.find((r) => r.id === cap.ruleId);
    return {
      id: `hardcap-${cap.ruleId}-${Date.now()}`,
      severity: "high" as AlertSeverity,
      trigger: "hard-cap-crossed" as AlertTrigger,
      title: `Hard Cap Active: ${rule?.condition ?? cap.ruleId}`,
      details: `Rating capped at ${cap.maxTier} due to ${rule?.condition ?? cap.ruleId}`,
      currentValue: cap.currentValue !== null ? String(cap.currentValue) : "flagged",
      threshold: cap.threshold !== null ? String(cap.threshold) : "any",
      recommendedAction: rule?.rationale
        ? `${rule.rationale}. Address this to remove the ${cap.maxTier} ceiling.`
        : `Address ${cap.ruleId} to remove the ${cap.maxTier} ceiling.`,
      timestamp: new Date().toISOString(),
    };
  });
}

/**
 * Check for >15% dimension decline in 30 days.
 */
function checkDimensionDeclines(trendSummary?: TrendSummary): RatingAlert[] {
  if (!trendSummary) return [];

  const window30 = trendSummary.windows.find((w) => w.label === "30-day");
  if (!window30) return [];

  const alerts: RatingAlert[] = [];

  for (const trend of window30.benchmarkTrends) {
    if (
      trend.direction === "declining" &&
      trend.startValue !== null &&
      trend.change !== null
    ) {
      const declinePercent = Math.abs(trend.change / trend.startValue) * 100;
      if (declinePercent > 15) {
        alerts.push({
          id: `decline-${trend.benchmarkId}-${Date.now()}`,
          severity: "medium",
          trigger: "dimension-decline",
          title: `${trend.name} Declining Rapidly`,
          details: `${trend.name} declined ${declinePercent.toFixed(1)}% in the last 30 days (from ${trend.startValue} to ${trend.endValue})`,
          currentValue: String(trend.endValue),
          threshold: `>${15}% decline`,
          recommendedAction: `Investigate recent changes affecting ${trend.name}. Review commits in the 30-day window.`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

/**
 * Check for invalidated gate verdicts.
 */
function checkGateInvalidation(
  current: RatingReport,
  previousEntries: HistoryEntry[],
): RatingAlert[] {
  if (previousEntries.length === 0) return [];

  const previous = previousEntries[previousEntries.length - 1];
  const currentPassedGates = current.gateVerdicts.filter((v) => v.passed).length;
  const previousPassedGates = previous.gatesPassed;

  if (currentPassedGates < previousPassedGates) {
    return [
      {
        id: `gate-invalidated-${Date.now()}`,
        severity: "high",
        trigger: "gate-invalidated",
        title: "Human Judgment Gate Invalidated",
        details: `Gate count dropped from ${previousPassedGates} to ${currentPassedGates} passed`,
        currentValue: String(currentPassedGates),
        threshold: String(previousPassedGates),
        recommendedAction: "Review which gate verdicts changed and re-evaluate if needed.",
        timestamp: new Date().toISOString(),
      },
    ];
  }
  return [];
}

/**
 * Check for approaching rating expiration (12-month validity).
 */
function checkRatingExpiration(previousEntries: HistoryEntry[]): RatingAlert[] {
  if (previousEntries.length === 0) return [];

  // Find the last time the rating changed
  let lastChangeIdx = 0;
  for (let i = previousEntries.length - 1; i > 0; i--) {
    if (previousEntries[i].rating !== previousEntries[i - 1].rating) {
      lastChangeIdx = i;
      break;
    }
  }

  const lastChange = new Date(previousEntries[lastChangeIdx].timestamp);
  const now = new Date();
  const daysSinceChange = (now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24);
  const daysRemaining = 365 - daysSinceChange;

  if (daysRemaining <= 30 && daysRemaining > 0) {
    return [
      {
        id: `expiration-${Date.now()}`,
        severity: "low",
        trigger: "rating-expiration",
        title: "Rating Approaching Expiration",
        details: `Current rating has been unchanged for ${Math.round(daysSinceChange)} days. Expires in ${Math.round(daysRemaining)} days.`,
        currentValue: `${Math.round(daysSinceChange)} days`,
        threshold: "365 days",
        recommendedAction: "Schedule a re-evaluation to maintain the current rating.",
        timestamp: new Date().toISOString(),
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

export function evaluateAlerts(
  current: RatingReport,
  previousEntries: HistoryEntry[],
  trendSummary?: TrendSummary,
): AlertReport {
  const alerts: RatingAlert[] = [
    ...checkRatingRegression(current, previousEntries),
    ...checkHardCapCrossings(current),
    ...checkDimensionDeclines(trendSummary),
    ...checkGateInvalidation(current, previousEntries),
    ...checkRatingExpiration(previousEntries),
  ];

  // Sort by severity
  const severityOrder: Record<AlertSeverity, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    timestamp: new Date().toISOString(),
    alerts,
    summary: {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === "critical").length,
      high: alerts.filter((a) => a.severity === "high").length,
      medium: alerts.filter((a) => a.severity === "medium").length,
      low: alerts.filter((a) => a.severity === "low").length,
    },
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatAlerts(report: AlertReport): string {
  const lines: string[] = [
    "# Rating Alerts",
    "",
    `**Total:** ${report.summary.total} | ` +
      `Critical: ${report.summary.critical} | ` +
      `High: ${report.summary.high} | ` +
      `Medium: ${report.summary.medium} | ` +
      `Low: ${report.summary.low}`,
  ];

  if (report.alerts.length === 0) {
    lines.push("", "No alerts. All rating indicators are within acceptable ranges.");
    return lines.join("\n");
  }

  lines.push("", "| Severity | Alert | Details | Action |");
  lines.push("|----------|-------|---------|--------|");

  for (const a of report.alerts) {
    lines.push(
      `| ${a.severity.toUpperCase()} | ${a.title} | ${a.details.slice(0, 80)} | ${a.recommendedAction.slice(0, 80)} |`,
    );
  }

  return lines.join("\n");
}
