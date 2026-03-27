/**
 * Quality Gate Pipeline (QA-03)
 *
 * Multi-stage pipeline: lint, type-check, test, coverage, security, review.
 * Stops on Blocker failures, collects full reports for non-Blockers,
 * and produces summary JSON with per-stage pass/fail and timing.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { execSync, type ExecSyncOptionsWithStringEncoding } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CodeReviewEngine, type ReviewReport, type Severity } from "./code-review";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StageName = "lint" | "typeCheck" | "test" | "coverage" | "security" | "review";

export type StageStatus = "pass" | "fail" | "skip" | "blocker";

export interface StageResult {
  stage: StageName;
  status: StageStatus;
  durationMs: number;
  issues: StageIssue[];
  output?: string;
}

export interface StageIssue {
  message: string;
  severity: Severity;
  location?: string;
}

export interface PipelineResult {
  timestamp: string;
  stages: StageResult[];
  summary: PipelineSummary;
  durationMs: number;
  haltedAt?: StageName;
}

export interface PipelineSummary {
  totalStages: number;
  passed: number;
  failed: number;
  skipped: number;
  blockers: number;
  overallStatus: "pass" | "fail" | "blocker";
}

export interface PipelineOptions {
  /** Root directory to run checks against */
  rootDir: string;
  /** Stages to run (defaults to all) */
  stages?: StageName[];
  /** Stop pipeline on first Blocker (default true) */
  haltOnBlocker?: boolean;
  /** Files to scope the review stage to (defaults to all discovered files) */
  reviewFiles?: string[];
  /** Coverage threshold as a percentage 0-100 (default 80) */
  coverageThreshold?: number;
  /** Path to write JSON report (optional) */
  reportPath?: string;
  /** Custom lint command (default: npx biome check) */
  lintCommand?: string;
  /** Custom type-check command (default: npx tsc --noEmit) */
  typeCheckCommand?: string;
  /** Custom test command (default: npx tsx --test) */
  testCommand?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_STAGES: StageName[] = ["lint", "typeCheck", "test", "coverage", "security", "review"];

const DEFAULT_COVERAGE_THRESHOLD = 80;

// ---------------------------------------------------------------------------
// Stage runners
// ---------------------------------------------------------------------------

function runShellCommand(cmd: string, cwd: string, timeoutMs = 120_000): { ok: boolean; output: string } {
  const opts: ExecSyncOptionsWithStringEncoding = {
    cwd,
    encoding: "utf-8",
    timeout: timeoutMs,
    stdio: ["pipe", "pipe", "pipe"],
  };
  try {
    const stdout = execSync(cmd, opts);
    return { ok: true, output: stdout };
  } catch (err: unknown) {
    const msg = err instanceof Error ? (err as Error & { stdout?: string; stderr?: string }).stdout ?? (err as Error & { stderr?: string }).stderr ?? err.message : String(err);
    return { ok: false, output: msg };
  }
}

function parseLintIssues(output: string): StageIssue[] {
  const issues: StageIssue[] = [];
  const lines = output.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("Checked") || trimmed.startsWith("Found")) continue;
    // Biome outputs lines like: path/file.ts:10:5 lint/rule message
    const match = trimmed.match(/^(.+?:\d+:\d+)\s+(.+)$/);
    if (match) {
      issues.push({
        message: match[2],
        severity: "Major",
        location: match[1],
      });
    }
  }
  return issues;
}

function parseTypeCheckIssues(output: string): StageIssue[] {
  const issues: StageIssue[] = [];
  const lines = output.split("\n");
  for (const line of lines) {
    // tsc outputs: file(line,col): error TSxxxx: message
    const match = line.match(/^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+TS\d+:\s+(.+)$/);
    if (match) {
      issues.push({
        message: match[5],
        severity: match[4] === "error" ? "Blocker" : "Major",
        location: `${match[1]}:${match[2]}`,
      });
    }
  }
  return issues;
}

function parseTestIssues(output: string): StageIssue[] {
  const issues: StageIssue[] = [];

  // node:test outputs "not ok N - <test name>" for failures
  const failPattern = /^not ok \d+ - (.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = failPattern.exec(output)) !== null) {
    issues.push({
      message: `Test failed: ${match[1]}`,
      severity: "Blocker",
    });
  }

  // Also check summary line: "# fail N"
  const failCount = output.match(/# fail (\d+)/);
  if (failCount && parseInt(failCount[1], 10) > 0 && issues.length === 0) {
    issues.push({
      message: `${failCount[1]} test(s) failed`,
      severity: "Blocker",
    });
  }

  return issues;
}

function parseCoverageFromOutput(output: string): number | null {
  // Look for "All files" line in Istanbul/c8 output: "All files | 85.3 | ..."
  const allFilesMatch = output.match(/All files\s*\|\s*([\d.]+)/);
  if (allFilesMatch) return parseFloat(allFilesMatch[1]);

  // Look for percentage in simpler outputs
  const pctMatch = output.match(/Statements\s*:\s*([\d.]+)%/);
  if (pctMatch) return parseFloat(pctMatch[1]);

  return null;
}

/** Scan for common security issues in source files */
function runSecurityScan(rootDir: string, files: string[]): StageIssue[] {
  const issues: StageIssue[] = [];

  const patterns: Array<{ pattern: RegExp; message: string; severity: Severity }> = [
    { pattern: /eval\s*\(/, message: "Use of eval() detected", severity: "Critical" },
    { pattern: /new Function\s*\(/, message: "Use of new Function() detected", severity: "Critical" },
    { pattern: /child_process.*exec\(/, message: "Unguarded exec() usage", severity: "Major" },
    { pattern: /innerHTML\s*=/, message: "innerHTML assignment (XSS risk)", severity: "Major" },
    { pattern: /\bpassword\s*[:=]\s*["'][^"']+["']/, message: "Hardcoded password detected", severity: "Blocker" },
    { pattern: /(?:api[_-]?key|secret|token)\s*[:=]\s*["'][A-Za-z0-9+/=]{16,}["']/, message: "Hardcoded secret/token detected", severity: "Blocker" },
    { pattern: /https?:\/\/[^"'\s]+(?:password|secret|token)=[^"'\s&]+/, message: "Secret in URL detected", severity: "Blocker" },
    { pattern: /console\.log\(.*(?:password|secret|token|key)/i, message: "Potential secret logged to console", severity: "Critical" },
  ];

  for (const filePath of files) {
    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Skip test files and comments
        if (filePath.includes(".test.") || filePath.includes(".spec.")) continue;
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

        for (const { pattern, message, severity } of patterns) {
          if (pattern.test(line)) {
            issues.push({
              message,
              severity,
              location: `${filePath}:${i + 1}`,
            });
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Pipeline
// ---------------------------------------------------------------------------

export class QualityGatePipeline {
  private readonly options: Required<Omit<PipelineOptions, "reportPath" | "reviewFiles">> & Pick<PipelineOptions, "reportPath" | "reviewFiles">;

  constructor(options: PipelineOptions) {
    this.options = {
      rootDir: options.rootDir,
      stages: options.stages ?? ALL_STAGES,
      haltOnBlocker: options.haltOnBlocker ?? true,
      reviewFiles: options.reviewFiles,
      coverageThreshold: options.coverageThreshold ?? DEFAULT_COVERAGE_THRESHOLD,
      reportPath: options.reportPath,
      lintCommand: options.lintCommand ?? "npx biome check .",
      typeCheckCommand: options.typeCheckCommand ?? "npx tsc --noEmit",
      testCommand: options.testCommand ?? "npx tsx --test",
    };
  }

  /** Run a single stage and produce a StageResult */
  runStage(stage: StageName): StageResult {
    const start = performance.now();

    switch (stage) {
      case "lint":
        return this.runLint(start);
      case "typeCheck":
        return this.runTypeCheck(start);
      case "test":
        return this.runTest(start);
      case "coverage":
        return this.runCoverage(start);
      case "security":
        return this.runSecurity(start);
      case "review":
        return this.runReview(start);
      default:
        return {
          stage,
          status: "skip",
          durationMs: Math.round(performance.now() - start),
          issues: [{ message: `Unknown stage: ${stage}`, severity: "Info" }],
        };
    }
  }

  /** Run the full pipeline */
  run(): PipelineResult {
    const pipelineStart = performance.now();
    const stages: StageResult[] = [];
    let haltedAt: StageName | undefined;

    for (const stageName of this.options.stages) {
      const result = this.runStage(stageName);
      stages.push(result);

      if (result.status === "blocker" && this.options.haltOnBlocker) {
        haltedAt = stageName;
        // Mark remaining stages as skipped
        for (const remaining of this.options.stages.slice(this.options.stages.indexOf(stageName) + 1)) {
          stages.push({
            stage: remaining,
            status: "skip",
            durationMs: 0,
            issues: [{ message: `Skipped: pipeline halted at ${stageName}`, severity: "Info" }],
          });
        }
        break;
      }
    }

    const durationMs = Math.round(performance.now() - pipelineStart);
    const summary = this.buildSummary(stages);

    const result: PipelineResult = {
      timestamp: new Date().toISOString(),
      stages,
      summary,
      durationMs,
      ...(haltedAt ? { haltedAt } : {}),
    };

    if (this.options.reportPath) {
      writeFileSync(this.options.reportPath, JSON.stringify(result, null, 2), "utf-8");
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Individual stage runners
  // -------------------------------------------------------------------------

  private runLint(start: number): StageResult {
    const { ok, output } = runShellCommand(this.options.lintCommand, this.options.rootDir);
    const issues = ok ? [] : parseLintIssues(output);
    const hasBlocker = issues.some((i) => i.severity === "Blocker" || i.severity === "Critical");

    return {
      stage: "lint",
      status: ok ? "pass" : hasBlocker ? "blocker" : "fail",
      durationMs: Math.round(performance.now() - start),
      issues,
      output: output.slice(0, 2000),
    };
  }

  private runTypeCheck(start: number): StageResult {
    const { ok, output } = runShellCommand(this.options.typeCheckCommand, this.options.rootDir);
    const issues = ok ? [] : parseTypeCheckIssues(output);
    const hasBlocker = issues.some((i) => i.severity === "Blocker");

    return {
      stage: "typeCheck",
      status: ok ? "pass" : hasBlocker ? "blocker" : "fail",
      durationMs: Math.round(performance.now() - start),
      issues,
      output: output.slice(0, 2000),
    };
  }

  private runTest(start: number): StageResult {
    const { ok, output } = runShellCommand(this.options.testCommand, this.options.rootDir);
    const issues = ok ? [] : parseTestIssues(output);
    // Test failures are always blockers
    const status: StageStatus = ok ? "pass" : "blocker";

    return {
      stage: "test",
      status,
      durationMs: Math.round(performance.now() - start),
      issues,
      output: output.slice(0, 2000),
    };
  }

  private runCoverage(start: number): StageResult {
    // Try to read coverage summary if it exists
    const coveragePath = join(this.options.rootDir, "coverage", "coverage-summary.json");
    const issues: StageIssue[] = [];
    let coverage: number | null = null;
    let output = "";

    if (existsSync(coveragePath)) {
      try {
        const raw = readFileSync(coveragePath, "utf-8");
        const data = JSON.parse(raw);
        coverage = data?.total?.statements?.pct ?? null;
        output = `Coverage: ${coverage}%`;
      } catch {
        output = "Failed to parse coverage report";
      }
    } else {
      // No coverage file — skip with informational message
      return {
        stage: "coverage",
        status: "skip",
        durationMs: Math.round(performance.now() - start),
        issues: [{ message: "No coverage report found (coverage/coverage-summary.json)", severity: "Info" }],
        output: "No coverage data available",
      };
    }

    if (coverage !== null && coverage < this.options.coverageThreshold) {
      const severity: Severity = coverage < this.options.coverageThreshold - 20 ? "Blocker" : "Major";
      issues.push({
        message: `Coverage ${coverage}% is below threshold ${this.options.coverageThreshold}%`,
        severity,
      });
    }

    const hasBlocker = issues.some((i) => i.severity === "Blocker");
    return {
      stage: "coverage",
      status: issues.length === 0 ? "pass" : hasBlocker ? "blocker" : "fail",
      durationMs: Math.round(performance.now() - start),
      issues,
      output,
    };
  }

  private runSecurity(start: number): StageResult {
    const files = this.options.reviewFiles ?? CodeReviewEngine.discoverFiles(this.options.rootDir);
    const issues = runSecurityScan(this.options.rootDir, files);
    const hasBlocker = issues.some((i) => i.severity === "Blocker" || i.severity === "Critical");

    return {
      stage: "security",
      status: issues.length === 0 ? "pass" : hasBlocker ? "blocker" : "fail",
      durationMs: Math.round(performance.now() - start),
      issues,
      output: `Scanned ${files.length} files, found ${issues.length} security issues`,
    };
  }

  private runReview(start: number): StageResult {
    const engine = new CodeReviewEngine();
    const files = this.options.reviewFiles ?? CodeReviewEngine.discoverFiles(this.options.rootDir);
    const report: ReviewReport = engine.reviewFiles(files);

    const issues: StageIssue[] = report.issues.map((qi) => ({
      message: qi.issue,
      severity: qi.severity,
      location: qi.location,
    }));

    const hasBlocker = issues.some((i) => i.severity === "Blocker" || i.severity === "Critical");

    return {
      stage: "review",
      status: issues.length === 0 ? "pass" : hasBlocker ? "blocker" : "fail",
      durationMs: Math.round(performance.now() - start),
      issues,
      output: `Reviewed ${files.length} files: ${report.summary.totalIssues} issues, pass rate ${(report.summary.passRate * 100).toFixed(1)}%`,
    };
  }

  // -------------------------------------------------------------------------
  // Summary builder
  // -------------------------------------------------------------------------

  private buildSummary(stages: StageResult[]): PipelineSummary {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let blockers = 0;

    for (const s of stages) {
      switch (s.status) {
        case "pass":
          passed++;
          break;
        case "fail":
          failed++;
          break;
        case "skip":
          skipped++;
          break;
        case "blocker":
          blockers++;
          break;
      }
    }

    const overallStatus: "pass" | "fail" | "blocker" = blockers > 0 ? "blocker" : failed > 0 ? "fail" : "pass";

    return {
      totalStages: stages.length,
      passed,
      failed,
      skipped,
      blockers,
      overallStatus,
    };
  }

  // -------------------------------------------------------------------------
  // Formatters
  // -------------------------------------------------------------------------

  static formatResult(result: PipelineResult): string {
    const lines: string[] = [];

    lines.push("=".repeat(55));
    lines.push("  QUALITY GATE PIPELINE REPORT");
    lines.push(`  ${result.timestamp}`);
    lines.push("=".repeat(55));
    lines.push("");
    lines.push(`Overall: ${result.summary.overallStatus.toUpperCase()}`);
    lines.push(`Duration: ${result.durationMs}ms`);
    if (result.haltedAt) lines.push(`Halted at: ${result.haltedAt}`);
    lines.push("");
    lines.push(`Stages: ${result.summary.passed} passed, ${result.summary.failed} failed, ${result.summary.blockers} blockers, ${result.summary.skipped} skipped`);
    lines.push("");

    lines.push("-".repeat(55));
    lines.push("  STAGE DETAILS");
    lines.push("-".repeat(55));

    for (const stage of result.stages) {
      const icon = stage.status === "pass" ? "[PASS]" : stage.status === "skip" ? "[SKIP]" : stage.status === "blocker" ? "[HALT]" : "[FAIL]";
      lines.push("");
      lines.push(`${icon} ${stage.stage} (${stage.durationMs}ms)`);
      if (stage.issues.length > 0) {
        for (const issue of stage.issues.slice(0, 10)) {
          const loc = issue.location ? ` @ ${issue.location}` : "";
          lines.push(`  [${issue.severity}] ${issue.message}${loc}`);
        }
        if (stage.issues.length > 10) {
          lines.push(`  ... and ${stage.issues.length - 10} more issues`);
        }
      }
    }

    lines.push("");
    lines.push("=".repeat(55));
    return lines.join("\n");
  }

  static formatResultJSON(result: PipelineResult): string {
    return JSON.stringify(result, null, 2);
  }
}
