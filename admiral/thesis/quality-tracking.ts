/**
 * Agent Quality Improvement Tracking (TV-04)
 *
 * Tracks agent output quality longitudinally correlated with
 * governance maturity. Annotates governance milestones.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GovernanceMilestone {
  id: string;
  timestamp: string;
  description: string;
  governanceCoverage: number;
  hookCount: number;
  soEnforced: number;
}

export interface QualitySnapshot {
  timestamp: string;
  firstPassQualityRate: number;
  defectDensity: number;
  escalationRate: number;
  governanceCoverage: number;
  milestoneId: string | null;
}

export interface QualityCorrelation {
  milestoneId: string;
  description: string;
  beforeQuality: QualitySnapshot;
  afterQuality: QualitySnapshot;
  qualityDelta: number;
  defectDelta: number;
  escalationDelta: number;
  coverageDelta: number;
}

export interface QualityTrend {
  snapshots: QualitySnapshot[];
  milestones: GovernanceMilestone[];
  correlations: QualityCorrelation[];
  overallTrend: "improving" | "declining" | "stable" | "insufficient-data";
  summary: string;
}

// ---------------------------------------------------------------------------
// Quality Tracker
// ---------------------------------------------------------------------------

export class QualityTracker {
  private snapshots: QualitySnapshot[] = [];
  private milestones: GovernanceMilestone[] = [];

  addSnapshot(snapshot: QualitySnapshot): void {
    this.snapshots.push(snapshot);
  }

  addMilestone(milestone: GovernanceMilestone): void {
    this.milestones.push(milestone);
  }

  computeCorrelations(): QualityCorrelation[] {
    const correlations: QualityCorrelation[] = [];

    for (const milestone of this.milestones) {
      const before = this.snapshots
        .filter((s) => s.timestamp < milestone.timestamp)
        .slice(-3);
      const after = this.snapshots
        .filter((s) => s.timestamp >= milestone.timestamp)
        .slice(0, 3);

      if (before.length === 0 || after.length === 0) continue;

      const avgBefore = average(before.map((s) => s.firstPassQualityRate));
      const avgAfter = average(after.map((s) => s.firstPassQualityRate));
      const defectBefore = average(before.map((s) => s.defectDensity));
      const defectAfter = average(after.map((s) => s.defectDensity));
      const escBefore = average(before.map((s) => s.escalationRate));
      const escAfter = average(after.map((s) => s.escalationRate));

      correlations.push({
        milestoneId: milestone.id,
        description: milestone.description,
        beforeQuality: before[before.length - 1],
        afterQuality: after[0],
        qualityDelta: round(avgAfter - avgBefore),
        defectDelta: round(defectAfter - defectBefore),
        escalationDelta: round(escAfter - escBefore),
        coverageDelta: round(
          (after[0].governanceCoverage) - (before[before.length - 1].governanceCoverage),
        ),
      });
    }

    return correlations;
  }

  computeTrend(): QualityTrend {
    const correlations = this.computeCorrelations();

    let overallTrend: QualityTrend["overallTrend"];
    if (this.snapshots.length < 3) {
      overallTrend = "insufficient-data";
    } else {
      const first3 = this.snapshots.slice(0, 3);
      const last3 = this.snapshots.slice(-3);
      const earlyAvg = average(first3.map((s) => s.firstPassQualityRate));
      const lateAvg = average(last3.map((s) => s.firstPassQualityRate));
      const delta = lateAvg - earlyAvg;
      overallTrend = delta > 3 ? "improving" : delta < -3 ? "declining" : "stable";
    }

    const improvingCorrelations = correlations.filter((c) => c.qualityDelta > 0).length;
    const summary = this.snapshots.length < 3
      ? "Insufficient data for trend analysis."
      : `${this.snapshots.length} snapshots, ${this.milestones.length} milestones. ` +
        `${improvingCorrelations}/${correlations.length} milestones showed quality improvement. ` +
        `Overall trend: ${overallTrend}.`;

    return {
      snapshots: [...this.snapshots],
      milestones: [...this.milestones],
      correlations,
      overallTrend,
      summary,
    };
  }

  getSnapshotCount(): number {
    return this.snapshots.length;
  }
}

function average(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
