/**
 * Admiral Framework — Rating Alerts (RT-10)
 *
 * Alert system for: tier regression, threshold crossings, dimension decline, gate invalidation.
 * RatingAlertManager class with configurable thresholds.
 * checkAlerts(currentReport, previousReport) returns alert list.
 *
 * Zero external dependencies.
 */

import {
  compareTiers,
  type DimensionId,
  RATING_DIMENSIONS,
  type RatingReport,
  type RatingTierCode,
} from "./types";

// ---------------------------------------------------------------------------
// Alert types
// ---------------------------------------------------------------------------

export type AlertType =
  | "tier_regression"
  | "tier_improvement"
  | "score_decline"
  | "score_improvement"
  | "dimension_decline"
  | "dimension_improvement"
  | "threshold_crossed_below"
  | "threshold_crossed_above"
  | "cap_activated"
  | "cap_cleared"
  | "gate_invalidation"
  | "expiry_warning";

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface RatingAlert {
  /** Unique alert identifier */
  id: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  /** Affected dimension, if applicable */
  dimension?: DimensionId;
  /** Current tier */
  currentTier: RatingTierCode;
  /** Previous tier, if applicable */
  previousTier?: RatingTierCode;
  /** Current score */
  currentScore: number;
  /** Previous score, if applicable */
  previousScore?: number;
  /** Numeric change (positive = improvement, negative = decline) */
  delta?: number;
  /** Whether this alert requires human action */
  actionRequired: boolean;
}

// ---------------------------------------------------------------------------
// Alert thresholds configuration
// ---------------------------------------------------------------------------

export interface AlertThresholds {
  /** Minimum score drop to trigger a score_decline alert (default: 5) */
  scoreDeclineThreshold: number;
  /** Minimum score gain to trigger a score_improvement alert (default: 5) */
  scoreImprovementThreshold: number;
  /** Minimum dimension score drop to trigger dimension_decline (default: 5) */
  dimensionDeclineThreshold: number;
  /** Minimum dimension score gain to trigger dimension_improvement (default: 8) */
  dimensionImprovementThreshold: number;
  /** Days before expiry to trigger expiry_warning (default: 30) */
  expiryWarningDays: number;
  /** Dimension scores to watch (triggers threshold_crossed alerts) */
  watchedThresholds: Partial<Record<DimensionId, number>>;
  /** Overall score thresholds to watch */
  watchedOverallThresholds: number[];
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  scoreDeclineThreshold: 5,
  scoreImprovementThreshold: 5,
  dimensionDeclineThreshold: 5,
  dimensionImprovementThreshold: 8,
  expiryWarningDays: 30,
  watchedThresholds: {
    enforcement_coverage: 50, // hard cap threshold
    security_posture: 70, // attack corpus threshold
    brain_utilization: 15, // knowledge reuse threshold
  },
  watchedOverallThresholds: [30, 60, 80, 95],
};

// ---------------------------------------------------------------------------
// RatingAlertManager
// ---------------------------------------------------------------------------

export class RatingAlertManager {
  private thresholds: AlertThresholds;
  private idCounter = 0;

  constructor(thresholds: Partial<AlertThresholds> = {}) {
    this.thresholds = {
      ...DEFAULT_THRESHOLDS,
      ...thresholds,
      watchedThresholds: {
        ...DEFAULT_THRESHOLDS.watchedThresholds,
        ...thresholds.watchedThresholds,
      },
      watchedOverallThresholds:
        thresholds.watchedOverallThresholds ?? DEFAULT_THRESHOLDS.watchedOverallThresholds,
    };
  }

  /**
   * Check for alerts by comparing the current report to the previous report.
   * Returns all triggered alerts sorted by severity (critical first).
   *
   * @param currentReport The latest rating report
   * @param previousReport The previous rating report to compare against
   * @returns Sorted list of triggered alerts
   */
  checkAlerts(currentReport: RatingReport, previousReport: RatingReport): RatingAlert[] {
    const alerts: RatingAlert[] = [];

    // Tier regression / improvement
    alerts.push(...this.checkTierChange(currentReport, previousReport));

    // Overall score change
    alerts.push(...this.checkOverallScoreChange(currentReport, previousReport));

    // Overall score threshold crossings
    alerts.push(...this.checkOverallThresholds(currentReport, previousReport));

    // Per-dimension checks
    alerts.push(...this.checkDimensionChanges(currentReport, previousReport));

    // Hard cap changes
    alerts.push(...this.checkCapChanges(currentReport, previousReport));

    // Expiry warning
    alerts.push(...this.checkExpiry(currentReport));

    return this.sortAlerts(alerts);
  }

  /**
   * Check a single report for self-standing alerts (no comparison needed).
   * Useful for monitoring current state against absolute thresholds.
   */
  checkAbsoluteAlerts(report: RatingReport): RatingAlert[] {
    const alerts: RatingAlert[] = [];

    // Check absolute dimension thresholds
    for (const ds of report.dimensionScores) {
      const threshold = this.thresholds.watchedThresholds[ds.dimensionId];
      if (threshold !== undefined && ds.score < threshold) {
        alerts.push(
          this.makeAlert({
            type: "threshold_crossed_below",
            severity: "high",
            title: `${RATING_DIMENSIONS[ds.dimensionId].name} below threshold`,
            message:
              `Dimension ${ds.dimensionId} score (${ds.score}) is below ` +
              `the watched threshold of ${threshold}.`,
            dimension: ds.dimensionId,
            currentTier: report.tier,
            currentScore: report.overallScore,
            delta: ds.score - threshold,
            actionRequired: true,
          }),
        );
      }
    }

    // Expiry check
    alerts.push(...this.checkExpiry(report));

    return this.sortAlerts(alerts);
  }

  // -------------------------------------------------------------------------
  // Private alert checkers
  // -------------------------------------------------------------------------

  private checkTierChange(current: RatingReport, previous: RatingReport): RatingAlert[] {
    const diff = compareTiers(current.tier, previous.tier);
    if (diff === 0) return [];

    if (diff < 0) {
      // Tier regression
      return [
        this.makeAlert({
          type: "tier_regression",
          severity: "critical",
          title: `Rating tier regression: ${previous.tier} → ${current.tier}`,
          message:
            `The rating has dropped from ${previous.tier} (${previous.ratingLabel}) ` +
            `to ${current.tier} (${current.ratingLabel}). ` +
            `This may trigger a formal re-evaluation requirement.`,
          currentTier: current.tier,
          previousTier: previous.tier,
          currentScore: current.overallScore,
          previousScore: previous.overallScore,
          delta: current.overallScore - previous.overallScore,
          actionRequired: true,
        }),
      ];
    } else {
      // Tier improvement
      return [
        this.makeAlert({
          type: "tier_improvement",
          severity: "info",
          title: `Rating tier improved: ${previous.tier} → ${current.tier}`,
          message:
            `The rating has improved from ${previous.tier} to ${current.tier}. ` +
            `Overall score: ${previous.overallScore} → ${current.overallScore}.`,
          currentTier: current.tier,
          previousTier: previous.tier,
          currentScore: current.overallScore,
          previousScore: previous.overallScore,
          delta: current.overallScore - previous.overallScore,
          actionRequired: false,
        }),
      ];
    }
  }

  private checkOverallScoreChange(current: RatingReport, previous: RatingReport): RatingAlert[] {
    const delta = current.overallScore - previous.overallScore;
    const alerts: RatingAlert[] = [];

    if (delta <= -this.thresholds.scoreDeclineThreshold) {
      alerts.push(
        this.makeAlert({
          type: "score_decline",
          severity: "high",
          title: `Overall score declined by ${Math.abs(delta).toFixed(1)} points`,
          message:
            `Overall rating score dropped from ${previous.overallScore} to ${current.overallScore} ` +
            `(−${Math.abs(delta).toFixed(1)} points). Review dimension scores for root cause.`,
          currentTier: current.tier,
          previousTier: previous.tier,
          currentScore: current.overallScore,
          previousScore: previous.overallScore,
          delta,
          actionRequired: true,
        }),
      );
    } else if (delta >= this.thresholds.scoreImprovementThreshold) {
      alerts.push(
        this.makeAlert({
          type: "score_improvement",
          severity: "info",
          title: `Overall score improved by ${delta.toFixed(1)} points`,
          message:
            `Overall rating score improved from ${previous.overallScore} to ${current.overallScore} ` +
            `(+${delta.toFixed(1)} points).`,
          currentTier: current.tier,
          previousTier: previous.tier,
          currentScore: current.overallScore,
          previousScore: previous.overallScore,
          delta,
          actionRequired: false,
        }),
      );
    }

    return alerts;
  }

  private checkOverallThresholds(current: RatingReport, previous: RatingReport): RatingAlert[] {
    const alerts: RatingAlert[] = [];

    for (const threshold of this.thresholds.watchedOverallThresholds) {
      const wasAbove = previous.overallScore >= threshold;
      const isAbove = current.overallScore >= threshold;

      if (wasAbove && !isAbove) {
        alerts.push(
          this.makeAlert({
            type: "threshold_crossed_below",
            severity: "high",
            title: `Overall score dropped below ${threshold}`,
            message:
              `The overall score has dropped below the watched threshold of ${threshold} ` +
              `(${previous.overallScore} → ${current.overallScore}).`,
            currentTier: current.tier,
            previousTier: previous.tier,
            currentScore: current.overallScore,
            previousScore: previous.overallScore,
            delta: current.overallScore - previous.overallScore,
            actionRequired: true,
          }),
        );
      } else if (!wasAbove && isAbove) {
        alerts.push(
          this.makeAlert({
            type: "threshold_crossed_above",
            severity: "info",
            title: `Overall score crossed above ${threshold}`,
            message:
              `The overall score has risen above ${threshold} ` +
              `(${previous.overallScore} → ${current.overallScore}).`,
            currentTier: current.tier,
            previousTier: previous.tier,
            currentScore: current.overallScore,
            previousScore: previous.overallScore,
            delta: current.overallScore - previous.overallScore,
            actionRequired: false,
          }),
        );
      }
    }

    return alerts;
  }

  private checkDimensionChanges(current: RatingReport, previous: RatingReport): RatingAlert[] {
    const alerts: RatingAlert[] = [];

    for (const currDs of current.dimensionScores) {
      const prevDs = previous.dimensionScores.find((d) => d.dimensionId === currDs.dimensionId);
      if (!prevDs) continue;

      const delta = currDs.score - prevDs.score;
      const dim = RATING_DIMENSIONS[currDs.dimensionId];

      if (delta <= -this.thresholds.dimensionDeclineThreshold) {
        alerts.push(
          this.makeAlert({
            type: "dimension_decline",
            severity: currDs.score < 30 ? "critical" : "medium",
            title: `${dim.name} score declined by ${Math.abs(delta)} points`,
            message:
              `${dim.name} dropped from ${prevDs.score} to ${currDs.score} ` +
              `(−${Math.abs(delta)} points).` +
              (currDs.score < 30 ? " This triggers the hard cap at ADM-3." : ""),
            dimension: currDs.dimensionId,
            currentTier: current.tier,
            currentScore: current.overallScore,
            previousScore: previous.overallScore,
            delta,
            actionRequired: currDs.score < 30,
          }),
        );
      } else if (delta >= this.thresholds.dimensionImprovementThreshold) {
        alerts.push(
          this.makeAlert({
            type: "dimension_improvement",
            severity: "info",
            title: `${dim.name} score improved by ${delta} points`,
            message: `${dim.name} improved from ${prevDs.score} to ${currDs.score} (+${delta} points).`,
            dimension: currDs.dimensionId,
            currentTier: current.tier,
            currentScore: current.overallScore,
            delta,
            actionRequired: false,
          }),
        );
      }

      // Check watched dimension thresholds
      const watchedThreshold = this.thresholds.watchedThresholds[currDs.dimensionId];
      if (watchedThreshold !== undefined) {
        const wasAbove = prevDs.score >= watchedThreshold;
        const isAbove = currDs.score >= watchedThreshold;

        if (wasAbove && !isAbove) {
          alerts.push(
            this.makeAlert({
              type: "threshold_crossed_below",
              severity: "high",
              title: `${dim.name} crossed below watched threshold (${watchedThreshold})`,
              message:
                `${dim.name} score dropped from ${prevDs.score} to ${currDs.score}, ` +
                `crossing below the governance threshold of ${watchedThreshold}. ` +
                `This may affect hard cap eligibility.`,
              dimension: currDs.dimensionId,
              currentTier: current.tier,
              currentScore: current.overallScore,
              delta,
              actionRequired: true,
            }),
          );
        } else if (!wasAbove && isAbove) {
          alerts.push(
            this.makeAlert({
              type: "threshold_crossed_above",
              severity: "info",
              title: `${dim.name} crossed above watched threshold (${watchedThreshold})`,
              message:
                `${dim.name} score improved from ${prevDs.score} to ${currDs.score}, ` +
                `crossing above the governance threshold of ${watchedThreshold}.`,
              dimension: currDs.dimensionId,
              currentTier: current.tier,
              currentScore: current.overallScore,
              delta,
              actionRequired: false,
            }),
          );
        }
      }
    }

    return alerts;
  }

  private checkCapChanges(current: RatingReport, previous: RatingReport): RatingAlert[] {
    const alerts: RatingAlert[] = [];

    const prevCapConditions = new Set(previous.activeCaps.map((c) => c.condition));
    const currCapConditions = new Set(current.activeCaps.map((c) => c.condition));

    // New caps activated
    for (const cap of current.activeCaps) {
      if (!prevCapConditions.has(cap.condition)) {
        alerts.push(
          this.makeAlert({
            type: "cap_activated",
            severity: "critical",
            title: `Hard cap activated: ${cap.condition}`,
            message:
              `A new hard cap has been activated: "${cap.condition}". ` +
              `This caps the maximum achievable rating at ${cap.maxTier}. ` +
              `Immediate remediation required.`,
            currentTier: current.tier,
            previousTier: previous.tier,
            currentScore: current.overallScore,
            actionRequired: true,
          }),
        );
      }
    }

    // Caps cleared
    for (const cap of previous.activeCaps) {
      if (!currCapConditions.has(cap.condition)) {
        alerts.push(
          this.makeAlert({
            type: "cap_cleared",
            severity: "info",
            title: `Hard cap cleared: ${cap.condition}`,
            message:
              `The hard cap "${cap.condition}" has been cleared. ` +
              `The rating is no longer capped at ${cap.maxTier}.`,
            currentTier: current.tier,
            currentScore: current.overallScore,
            actionRequired: false,
          }),
        );
      }
    }

    return alerts;
  }

  private checkExpiry(report: RatingReport): RatingAlert[] {
    const now = Date.now();
    const validUntil = new Date(report.validUntil).getTime();
    const daysUntilExpiry = (validUntil - now) / (1000 * 60 * 60 * 24);

    if (daysUntilExpiry >= 0 && daysUntilExpiry <= this.thresholds.expiryWarningDays) {
      const severity: AlertSeverity =
        daysUntilExpiry <= 7 ? "critical" : daysUntilExpiry <= 14 ? "high" : "medium";

      return [
        this.makeAlert({
          type: "expiry_warning",
          severity,
          title: `Rating expires in ${Math.ceil(daysUntilExpiry)} days`,
          message:
            `The current rating (${report.ratingLabel}) expires on ${report.validUntil}. ` +
            `Schedule a re-evaluation before expiry to maintain certification continuity.`,
          currentTier: report.tier,
          currentScore: report.overallScore,
          delta: daysUntilExpiry,
          actionRequired: daysUntilExpiry <= 14,
        }),
      ];
    }

    return [];
  }

  // -------------------------------------------------------------------------
  // Alert construction
  // -------------------------------------------------------------------------

  private makeAlert(fields: Omit<RatingAlert, "id" | "timestamp">): RatingAlert {
    this.idCounter++;
    return {
      id: `alert_${String(this.idCounter).padStart(4, "0")}`,
      timestamp: new Date().toISOString(),
      ...fields,
    };
  }

  private sortAlerts(alerts: RatingAlert[]): RatingAlert[] {
    const severityOrder: Record<AlertSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
      info: 4,
    };
    return [...alerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }
}
