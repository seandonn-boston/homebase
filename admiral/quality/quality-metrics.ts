/**
 * Quality Metrics Collection (QA-04)
 *
 * Collects per-module metrics: cyclomatic complexity, test coverage, code churn,
 * defect density, lint violations, test-to-code ratio.
 * Outputs JSON consumable by the control plane dashboard.
 * Accumulates historical data across CI runs.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { type Dirent, existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";
import { execSync } from "node:child_process";
import { computeCyclomaticComplexity } from "./code-review";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleMetrics {
  module: string;
  timestamp: string;
  complexity: ComplexityMetrics;
  testCoverage: TestCoverageMetrics;
  codeChurn: CodeChurnMetrics;
  defectDensity: DefectDensityMetrics;
  lintViolations: LintMetrics;
  testToCodeRatio: TestRatioMetrics;
}

export interface ComplexityMetrics {
  avgCyclomaticComplexity: number;
  maxCyclomaticComplexity: number;
  functionCount: number;
  highComplexityFunctions: number;
}

export interface TestCoverageMetrics {
  hasTestFile: boolean;
  testFileLines: number;
  sourceFileLines: number;
}

export interface CodeChurnMetrics {
  recentCommits: number;
  linesAdded: number;
  linesDeleted: number;
}

export interface DefectDensityMetrics {
  todoCount: number;
  fixmeCount: number;
  hackCount: number;
  totalMarkers: number;
  markersPerHundredLines: number;
}

export interface LintMetrics {
  violations: number;
}

export interface TestRatioMetrics {
  ratio: number;
  testLines: number;
  sourceLines: number;
}

export interface MetricsSnapshot {
  timestamp: string;
  rootDir: string;
  modules: ModuleMetrics[];
  summary: MetricsSummary;
}

export interface MetricsSummary {
  totalModules: number;
  avgComplexity: number;
  totalDefectMarkers: number;
  modulesWithTests: number;
  modulesWithoutTests: number;
  avgTestToCodeRatio: number;
}

export interface MetricsHistory {
  snapshots: MetricsSnapshot[];
}

export interface MetricsCollectorOptions {
  rootDir: string;
  historyPath?: string;
  maxHistorySnapshots?: number;
  complexityThreshold?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_EXTENSIONS = new Set([".ts", ".js", ".tsx", ".jsx"]);
const DEFAULT_MAX_HISTORY = 100;
const DEFAULT_COMPLEXITY_THRESHOLD = 15;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isSourceFile(ext: string): boolean {
  return SOURCE_EXTENSIONS.has(ext);
}

function isTestFile(filePath: string): boolean {
  return filePath.includes(".test.") || filePath.includes(".spec.");
}

function discoverModules(rootDir: string): Map<string, { source: string; test?: string }> {
  const modules = new Map<string, { source: string; test?: string }>();

  function walk(dir: string): void {
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(dir, { withFileTypes: true, encoding: "utf-8" }) as Dirent<string>[];
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".git") {
          walk(fullPath);
        }
      } else if (isSourceFile(extname(entry.name)) && !isTestFile(entry.name)) {
        const rel = relative(rootDir, fullPath);
        const nameBase = entry.name.replace(/\.(ts|js|tsx|jsx)$/, "");
        const testVariants = [
          join(dir, `${nameBase}.test.ts`),
          join(dir, `${nameBase}.test.js`),
          join(dir, `${nameBase}.spec.ts`),
          join(dir, `${nameBase}.spec.js`),
        ];
        const testFile = testVariants.find((t) => existsSync(t));
        modules.set(rel, { source: fullPath, test: testFile });
      }
    }
  }

  walk(rootDir);
  return modules;
}

function countLines(filePath: string): number {
  try {
    const content = readFileSync(filePath, "utf-8");
    return content.split("\n").length;
  } catch {
    return 0;
  }
}

function extractFunctionBodies(content: string): string[] {
  const bodies: string[] = [];
  const funcPattern = /(?:(?:export\s+)?(?:async\s+)?function\s+\w+|(?:const|let)\s+\w+\s*=\s*(?:async\s+)?(?:\([^)]*\)|[^=])\s*=>)/g;
  let match: RegExpExecArray | null;

  while ((match = funcPattern.exec(content)) !== null) {
    const braceStart = content.indexOf("{", match.index + match[0].length);
    if (braceStart === -1) continue;

    let depth = 0;
    let braceEnd = -1;
    for (let i = braceStart; i < content.length; i++) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") {
        depth--;
        if (depth === 0) {
          braceEnd = i;
          break;
        }
      }
    }

    if (braceEnd > braceStart) {
      bodies.push(content.slice(braceStart, braceEnd + 1));
    }
  }

  return bodies;
}

function computeComplexityMetrics(filePath: string, threshold: number): ComplexityMetrics {
  try {
    const content = readFileSync(filePath, "utf-8");
    const bodies = extractFunctionBodies(content);

    if (bodies.length === 0) {
      return { avgCyclomaticComplexity: 0, maxCyclomaticComplexity: 0, functionCount: 0, highComplexityFunctions: 0 };
    }

    const complexities = bodies.map((b) => computeCyclomaticComplexity(b));
    const avg = complexities.reduce((a, b) => a + b, 0) / complexities.length;
    const max = Math.max(...complexities);
    const high = complexities.filter((c) => c > threshold).length;

    return {
      avgCyclomaticComplexity: Math.round(avg * 100) / 100,
      maxCyclomaticComplexity: max,
      functionCount: bodies.length,
      highComplexityFunctions: high,
    };
  } catch {
    return { avgCyclomaticComplexity: 0, maxCyclomaticComplexity: 0, functionCount: 0, highComplexityFunctions: 0 };
  }
}

function computeDefectDensity(filePath: string): DefectDensityMetrics {
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const lineCount = lines.length;

    let todoCount = 0;
    let fixmeCount = 0;
    let hackCount = 0;

    for (const line of lines) {
      if (/\bTODO\b/i.test(line)) todoCount++;
      if (/\bFIXME\b/i.test(line)) fixmeCount++;
      if (/\bHACK\b/i.test(line)) hackCount++;
    }

    const total = todoCount + fixmeCount + hackCount;
    const per100 = lineCount > 0 ? Math.round((total / lineCount) * 100 * 100) / 100 : 0;

    return { todoCount, fixmeCount, hackCount, totalMarkers: total, markersPerHundredLines: per100 };
  } catch {
    return { todoCount: 0, fixmeCount: 0, hackCount: 0, totalMarkers: 0, markersPerHundredLines: 0 };
  }
}

function computeCodeChurn(filePath: string, rootDir: string): CodeChurnMetrics {
  try {
    const relPath = relative(rootDir, filePath).replace(/\\/g, "/");
    const output = execSync(`git log --oneline --follow -30 -- "${relPath}"`, {
      cwd: rootDir,
      encoding: "utf-8",
      timeout: 10_000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const commits = output.trim().split("\n").filter(Boolean).length;

    let added = 0;
    let deleted = 0;
    try {
      const diffStat = execSync(`git log --numstat --follow -10 -- "${relPath}"`, {
        cwd: rootDir,
        encoding: "utf-8",
        timeout: 10_000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      for (const line of diffStat.split("\n")) {
        const match = line.match(/^(\d+)\s+(\d+)\s+/);
        if (match) {
          added += parseInt(match[1], 10);
          deleted += parseInt(match[2], 10);
        }
      }
    } catch {
      // git stats not available
    }

    return { recentCommits: commits, linesAdded: added, linesDeleted: deleted };
  } catch {
    return { recentCommits: 0, linesAdded: 0, linesDeleted: 0 };
  }
}

// ---------------------------------------------------------------------------
// Metrics Collector
// ---------------------------------------------------------------------------

export class MetricsCollector {
  private readonly options: Required<Omit<MetricsCollectorOptions, "historyPath">> & Pick<MetricsCollectorOptions, "historyPath">;

  constructor(options: MetricsCollectorOptions) {
    this.options = {
      rootDir: options.rootDir,
      historyPath: options.historyPath,
      maxHistorySnapshots: options.maxHistorySnapshots ?? DEFAULT_MAX_HISTORY,
      complexityThreshold: options.complexityThreshold ?? DEFAULT_COMPLEXITY_THRESHOLD,
    };
  }

  /** Collect metrics for a single module */
  collectModule(sourcePath: string, testPath?: string): ModuleMetrics {
    const rel = relative(this.options.rootDir, sourcePath);
    const sourceLines = countLines(sourcePath);
    const testLines = testPath ? countLines(testPath) : 0;

    return {
      module: rel,
      timestamp: new Date().toISOString(),
      complexity: computeComplexityMetrics(sourcePath, this.options.complexityThreshold),
      testCoverage: {
        hasTestFile: !!testPath,
        testFileLines: testLines,
        sourceFileLines: sourceLines,
      },
      codeChurn: computeCodeChurn(sourcePath, this.options.rootDir),
      defectDensity: computeDefectDensity(sourcePath),
      lintViolations: { violations: 0 }, // populated externally from lint output
      testToCodeRatio: {
        ratio: sourceLines > 0 ? Math.round((testLines / sourceLines) * 100) / 100 : 0,
        testLines,
        sourceLines,
      },
    };
  }

  /** Collect metrics for all modules in the root directory */
  collectAll(): MetricsSnapshot {
    const modules = discoverModules(this.options.rootDir);
    const metrics: ModuleMetrics[] = [];

    for (const [_rel, { source, test }] of modules) {
      metrics.push(this.collectModule(source, test));
    }

    const summary = this.buildSummary(metrics);

    return {
      timestamp: new Date().toISOString(),
      rootDir: this.options.rootDir,
      modules: metrics,
      summary,
    };
  }

  /** Collect and append to history file */
  collectAndSave(): MetricsSnapshot {
    const snapshot = this.collectAll();

    if (this.options.historyPath) {
      const history = this.loadHistory();
      history.snapshots.push(snapshot);

      // Trim to max history
      while (history.snapshots.length > this.options.maxHistorySnapshots) {
        history.snapshots.shift();
      }

      writeFileSync(this.options.historyPath, JSON.stringify(history, null, 2), "utf-8");
    }

    return snapshot;
  }

  /** Load history from file */
  loadHistory(): MetricsHistory {
    if (!this.options.historyPath || !existsSync(this.options.historyPath)) {
      return { snapshots: [] };
    }
    try {
      const raw = readFileSync(this.options.historyPath, "utf-8");
      return JSON.parse(raw);
    } catch {
      return { snapshots: [] };
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------

  private buildSummary(metrics: ModuleMetrics[]): MetricsSummary {
    if (metrics.length === 0) {
      return {
        totalModules: 0,
        avgComplexity: 0,
        totalDefectMarkers: 0,
        modulesWithTests: 0,
        modulesWithoutTests: 0,
        avgTestToCodeRatio: 0,
      };
    }

    const totalComplexity = metrics.reduce((s, m) => s + m.complexity.avgCyclomaticComplexity, 0);
    const totalDefects = metrics.reduce((s, m) => s + m.defectDensity.totalMarkers, 0);
    const withTests = metrics.filter((m) => m.testCoverage.hasTestFile).length;
    const ratioSum = metrics.reduce((s, m) => s + m.testToCodeRatio.ratio, 0);

    return {
      totalModules: metrics.length,
      avgComplexity: Math.round((totalComplexity / metrics.length) * 100) / 100,
      totalDefectMarkers: totalDefects,
      modulesWithTests: withTests,
      modulesWithoutTests: metrics.length - withTests,
      avgTestToCodeRatio: Math.round((ratioSum / metrics.length) * 100) / 100,
    };
  }

  // -------------------------------------------------------------------------
  // Formatters
  // -------------------------------------------------------------------------

  static formatSnapshot(snapshot: MetricsSnapshot): string {
    const lines: string[] = [];

    lines.push("=".repeat(55));
    lines.push("  QUALITY METRICS SNAPSHOT");
    lines.push(`  ${snapshot.timestamp}`);
    lines.push("=".repeat(55));
    lines.push("");
    lines.push(`Modules: ${snapshot.summary.totalModules}`);
    lines.push(`Avg complexity: ${snapshot.summary.avgComplexity}`);
    lines.push(`Defect markers: ${snapshot.summary.totalDefectMarkers}`);
    lines.push(`With tests: ${snapshot.summary.modulesWithTests} / ${snapshot.summary.totalModules}`);
    lines.push(`Avg test:code ratio: ${snapshot.summary.avgTestToCodeRatio}`);
    lines.push("");

    lines.push("-".repeat(55));
    for (const mod of snapshot.modules.slice(0, 20)) {
      lines.push(`  ${mod.module}`);
      lines.push(`    Complexity: avg=${mod.complexity.avgCyclomaticComplexity} max=${mod.complexity.maxCyclomaticComplexity} fns=${mod.complexity.functionCount}`);
      lines.push(`    Test:code: ${mod.testToCodeRatio.ratio} (${mod.testToCodeRatio.testLines}/${mod.testToCodeRatio.sourceLines})`);
      lines.push(`    Defects: ${mod.defectDensity.totalMarkers} (${mod.defectDensity.markersPerHundredLines}/100 lines)`);
      lines.push(`    Churn: ${mod.codeChurn.recentCommits} commits, +${mod.codeChurn.linesAdded}/-${mod.codeChurn.linesDeleted}`);
    }
    if (snapshot.modules.length > 20) {
      lines.push(`  ... and ${snapshot.modules.length - 20} more modules`);
    }

    lines.push("");
    lines.push("=".repeat(55));
    return lines.join("\n");
  }

  static formatSnapshotJSON(snapshot: MetricsSnapshot): string {
    return JSON.stringify(snapshot, null, 2);
  }
}
