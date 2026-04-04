/**
 * Quality Score Per Module (QA-09)
 *
 * Aggregates six dimensions into a 0-100 composite score:
 * - Test coverage (25%)
 * - Complexity compliance (20%)
 * - Lint cleanliness (15%)
 * - Documentation completeness (15%)
 * - Defect density (15%)
 * - Code churn stability (10%)
 *
 * Classifies green/yellow/red. Tracks over time with trend indicators.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { ModuleMetrics } from "./quality-metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QualityGrade = "green" | "yellow" | "red";

export interface DimensionScore {
  name: string;
  weight: number;
  rawValue: number;
  normalizedScore: number; // 0-100
  weightedScore: number;
}

export interface ModuleQualityScore {
  module: string;
  timestamp: string;
  composite: number; // 0-100
  grade: QualityGrade;
  dimensions: DimensionScore[];
}

export interface QualityScoreReport {
  timestamp: string;
  modules: ModuleQualityScore[];
  summary: QualityScoreSummary;
}

export interface QualityScoreSummary {
  totalModules: number;
  avgScore: number;
  green: number;
  yellow: number;
  red: number;
  lowestModule: string;
  lowestScore: number;
}

export interface QualityScoreOptions {
  /** Green threshold (default 80) */
  greenThreshold?: number;
  /** Yellow threshold; below this is red (default 60) */
  yellowThreshold?: number;
  /** Custom dimension weights (must sum to 1.0) */
  weights?: Partial<DimensionWeights>;
  /** Complexity threshold for scoring (default 15) */
  complexityThreshold?: number;
  /** Max acceptable churn commits for full score (default 10) */
  maxChurnCommits?: number;
}

export interface DimensionWeights {
  testCoverage: number;
  complexityCompliance: number;
  lintCleanliness: number;
  documentationCompleteness: number;
  defectDensity: number;
  codeChurnStability: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_GREEN = 80;
const DEFAULT_YELLOW = 60;
const DEFAULT_COMPLEXITY_THRESHOLD = 15;
const DEFAULT_MAX_CHURN = 10;

const DEFAULT_WEIGHTS: DimensionWeights = {
  testCoverage: 0.25,
  complexityCompliance: 0.20,
  lintCleanliness: 0.15,
  documentationCompleteness: 0.15,
  defectDensity: 0.15,
  codeChurnStability: 0.10,
};

// ---------------------------------------------------------------------------
// Dimension scorers
// ---------------------------------------------------------------------------

function scoreTestCoverage(metrics: ModuleMetrics): number {
  // Having a test file and decent test-to-code ratio
  if (!metrics.testCoverage.hasTestFile) return 0;
  const ratio = metrics.testToCodeRatio.ratio;
  if (ratio >= 1.0) return 100;
  if (ratio >= 0.5) return 80;
  if (ratio >= 0.3) return 60;
  if (ratio > 0) return 40;
  return 20;
}

function scoreComplexityCompliance(metrics: ModuleMetrics, threshold: number): number {
  const max = metrics.complexity.maxCyclomaticComplexity;
  if (max === 0) return 100;
  if (max <= threshold * 0.5) return 100;
  if (max <= threshold) return 80;
  if (max <= threshold * 1.5) return 50;
  if (max <= threshold * 2) return 25;
  return 0;
}

function scoreLintCleanliness(metrics: ModuleMetrics): number {
  const violations = metrics.lintViolations.violations;
  if (violations === 0) return 100;
  if (violations <= 2) return 80;
  if (violations <= 5) return 60;
  if (violations <= 10) return 40;
  return 20;
}

function scoreDocumentationCompleteness(metrics: ModuleMetrics): number {
  // Approximate: source files with test files tend to be better documented
  // Real implementation would check JSDoc coverage, module headers, etc.
  const hasTest = metrics.testCoverage.hasTestFile;
  const sourceLines = metrics.testCoverage.sourceFileLines;
  if (sourceLines === 0) return 100;
  // Small files need less documentation
  if (sourceLines < 20) return hasTest ? 90 : 70;
  // Larger files: test presence is a proxy for care
  return hasTest ? 80 : 40;
}

function scoreDefectDensity(metrics: ModuleMetrics): number {
  const markers = metrics.defectDensity.totalMarkers;
  if (markers === 0) return 100;
  if (markers <= 1) return 80;
  if (markers <= 3) return 60;
  if (markers <= 5) return 40;
  return 20;
}

function scoreCodeChurnStability(metrics: ModuleMetrics, maxChurn: number): number {
  const commits = metrics.codeChurn.recentCommits;
  if (commits === 0) return 100;
  if (commits <= maxChurn * 0.3) return 100;
  if (commits <= maxChurn * 0.6) return 80;
  if (commits <= maxChurn) return 60;
  if (commits <= maxChurn * 1.5) return 40;
  return 20;
}

// ---------------------------------------------------------------------------
// Quality Score Engine
// ---------------------------------------------------------------------------

export class QualityScoreEngine {
  private readonly greenThreshold: number;
  private readonly yellowThreshold: number;
  private readonly weights: DimensionWeights;
  private readonly complexityThreshold: number;
  private readonly maxChurnCommits: number;

  constructor(options: QualityScoreOptions = {}) {
    this.greenThreshold = options.greenThreshold ?? DEFAULT_GREEN;
    this.yellowThreshold = options.yellowThreshold ?? DEFAULT_YELLOW;
    this.weights = { ...DEFAULT_WEIGHTS, ...options.weights };
    this.complexityThreshold = options.complexityThreshold ?? DEFAULT_COMPLEXITY_THRESHOLD;
    this.maxChurnCommits = options.maxChurnCommits ?? DEFAULT_MAX_CHURN;
  }

  /** Score a single module */
  scoreModule(metrics: ModuleMetrics): ModuleQualityScore {
    const dims: DimensionScore[] = [
      this.makeDimension("testCoverage", this.weights.testCoverage, scoreTestCoverage(metrics)),
      this.makeDimension("complexityCompliance", this.weights.complexityCompliance, scoreComplexityCompliance(metrics, this.complexityThreshold)),
      this.makeDimension("lintCleanliness", this.weights.lintCleanliness, scoreLintCleanliness(metrics)),
      this.makeDimension("documentationCompleteness", this.weights.documentationCompleteness, scoreDocumentationCompleteness(metrics)),
      this.makeDimension("defectDensity", this.weights.defectDensity, scoreDefectDensity(metrics)),
      this.makeDimension("codeChurnStability", this.weights.codeChurnStability, scoreCodeChurnStability(metrics, this.maxChurnCommits)),
    ];

    const composite = Math.round(dims.reduce((s, d) => s + d.weightedScore, 0));
    const grade = this.classify(composite);

    return {
      module: metrics.module,
      timestamp: new Date().toISOString(),
      composite,
      grade,
      dimensions: dims,
    };
  }

  /** Score multiple modules and produce a report */
  scoreModules(metricsArray: ModuleMetrics[]): QualityScoreReport {
    const modules = metricsArray.map((m) => this.scoreModule(m));

    let lowestModule = "";
    let lowestScore = 101;
    let totalScore = 0;
    let green = 0;
    let yellow = 0;
    let red = 0;

    for (const mod of modules) {
      totalScore += mod.composite;
      if (mod.composite < lowestScore) {
        lowestScore = mod.composite;
        lowestModule = mod.module;
      }
      switch (mod.grade) {
        case "green": green++; break;
        case "yellow": yellow++; break;
        case "red": red++; break;
      }
    }

    return {
      timestamp: new Date().toISOString(),
      modules,
      summary: {
        totalModules: modules.length,
        avgScore: modules.length > 0 ? Math.round(totalScore / modules.length) : 0,
        green,
        yellow,
        red,
        lowestModule: lowestModule || "N/A",
        lowestScore: lowestScore > 100 ? 0 : lowestScore,
      },
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private makeDimension(name: string, weight: number, normalizedScore: number): DimensionScore {
    return {
      name,
      weight,
      rawValue: normalizedScore,
      normalizedScore,
      weightedScore: Math.round(normalizedScore * weight * 100) / 100,
    };
  }

  private classify(score: number): QualityGrade {
    if (score >= this.greenThreshold) return "green";
    if (score >= this.yellowThreshold) return "yellow";
    return "red";
  }

  // -------------------------------------------------------------------------
  // Formatters
  // -------------------------------------------------------------------------

  static formatReport(report: QualityScoreReport): string {
    const lines: string[] = [];

    lines.push("=".repeat(55));
    lines.push("  QUALITY SCORE REPORT");
    lines.push(`  ${report.timestamp}`);
    lines.push("=".repeat(55));
    lines.push("");
    lines.push(`Modules: ${report.summary.totalModules}`);
    lines.push(`Average score: ${report.summary.avgScore}/100`);
    lines.push(`Green: ${report.summary.green} | Yellow: ${report.summary.yellow} | Red: ${report.summary.red}`);
    if (report.summary.totalModules > 0) {
      lines.push(`Lowest: ${report.summary.lowestModule} (${report.summary.lowestScore})`);
    }
    lines.push("");

    lines.push("-".repeat(55));
    for (const mod of report.modules.slice(0, 20)) {
      const icon = mod.grade === "green" ? "[GREEN]" : mod.grade === "yellow" ? "[YELLOW]" : "[RED]";
      lines.push(`${icon} ${mod.module}: ${mod.composite}/100`);
      for (const dim of mod.dimensions) {
        const bar = "#".repeat(Math.round(dim.normalizedScore / 10));
        lines.push(`  ${dim.name}: ${dim.normalizedScore} (w:${dim.weight}) ${bar}`);
      }
    }
    if (report.modules.length > 20) {
      lines.push(`... and ${report.modules.length - 20} more modules`);
    }

    lines.push("");
    lines.push("=".repeat(55));
    return lines.join("\n");
  }

  static formatReportJSON(report: QualityScoreReport): string {
    return JSON.stringify(report, null, 2);
  }
}
