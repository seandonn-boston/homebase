/**
 * Code Complexity Budget (QA-07)
 *
 * Enforces per-module maximum cyclomatic complexity. Blocks over-budget
 * commits in CI. Implements a complexity credit system (net complexity
 * must not increase). Generates refactoring recommendations.
 * Budgets ratchet — loosening requires Admiral approval.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { computeCyclomaticComplexity } from "./code-review";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModuleBudget {
  module: string;
  maxComplexity: number;
  currentComplexity: number;
  functions: FunctionComplexity[];
}

export interface FunctionComplexity {
  name: string;
  complexity: number;
  line: number;
}

export type BudgetVerdict = "pass" | "over-budget" | "credit-violation";

export interface BudgetCheckResult {
  module: string;
  verdict: BudgetVerdict;
  budget: number;
  actual: number;
  netChange: number;
  overBudgetFunctions: FunctionComplexity[];
  recommendations: string[];
}

export interface BudgetReport {
  timestamp: string;
  results: BudgetCheckResult[];
  summary: BudgetSummary;
}

export interface BudgetSummary {
  totalModules: number;
  passing: number;
  overBudget: number;
  creditViolations: number;
  totalNetChange: number;
  overallVerdict: "pass" | "fail";
}

export interface BudgetConfig {
  /** Default max complexity per function (default 15) */
  defaultMax: number;
  /** Per-module overrides */
  overrides: Record<string, number>;
  /** Baseline complexities from last approved state */
  baselines: Record<string, number>;
}

export interface ComplexityBudgetOptions {
  rootDir: string;
  configPath?: string;
  defaultMax?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_MAX_COMPLEXITY = 15;

// ---------------------------------------------------------------------------
// Complexity extraction
// ---------------------------------------------------------------------------

function extractFunctionComplexities(content: string): FunctionComplexity[] {
  const results: FunctionComplexity[] = [];
  const funcPattern = /(?:(?:export\s+)?(?:async\s+)?function\s+(\w+))/g;
  let match: RegExpExecArray | null;

  // Pre-build line index
  const newlineOffsets: number[] = [-1];
  for (let i = 0; i < content.length; i++) {
    if (content[i] === "\n") newlineOffsets.push(i);
  }

  while ((match = funcPattern.exec(content)) !== null) {
    const name = match[1];
    const braceStart = content.indexOf("{", match.index + match[0].length);
    if (braceStart === -1) continue;

    let depth = 0;
    let braceEnd = -1;
    for (let i = braceStart; i < content.length; i++) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") {
        depth--;
        if (depth === 0) { braceEnd = i; break; }
      }
    }
    if (braceEnd === -1) continue;

    const body = content.slice(braceStart, braceEnd + 1);
    const complexity = computeCyclomaticComplexity(body);

    // Binary search for line number
    let lo = 0;
    let hi = newlineOffsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (newlineOffsets[mid] < match.index) lo = mid;
      else hi = mid - 1;
    }
    const line = lo + 1;

    results.push({ name, complexity, line });
  }

  return results;
}

function getMaxComplexity(functions: FunctionComplexity[]): number {
  if (functions.length === 0) return 0;
  return Math.max(...functions.map((f) => f.complexity));
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

function generateRecommendations(overBudget: FunctionComplexity[], budget: number): string[] {
  const recs: string[] = [];

  for (const fn of overBudget) {
    const ratio = fn.complexity / budget;
    if (ratio > 2) {
      recs.push(`'${fn.name}' (line ${fn.line}): complexity ${fn.complexity} is ${ratio.toFixed(1)}x budget — consider splitting into 2-3 smaller functions`);
    } else if (ratio > 1.5) {
      recs.push(`'${fn.name}' (line ${fn.line}): complexity ${fn.complexity} — extract conditional logic into helper functions`);
    } else {
      recs.push(`'${fn.name}' (line ${fn.line}): complexity ${fn.complexity} — simplify by reducing nesting or using early returns`);
    }
  }

  return recs;
}

// ---------------------------------------------------------------------------
// Complexity Budget Engine
// ---------------------------------------------------------------------------

export class ComplexityBudgetEngine {
  private readonly rootDir: string;
  private readonly config: BudgetConfig;
  private readonly configPath?: string;

  constructor(options: ComplexityBudgetOptions) {
    this.rootDir = options.rootDir;
    this.configPath = options.configPath;
    this.config = this.loadConfig(options.defaultMax ?? DEFAULT_MAX_COMPLEXITY);
  }

  /** Check a single module against its budget */
  checkModule(filePath: string, content?: string): BudgetCheckResult {
    const rel = relative(this.rootDir, filePath);
    const fileContent = content ?? this.readFile(filePath);
    const functions = extractFunctionComplexities(fileContent);
    const maxComplexity = getMaxComplexity(functions);
    const budget = this.config.overrides[rel] ?? this.config.defaultMax;
    const baseline = this.config.baselines[rel] ?? 0;
    const netChange = maxComplexity - baseline;

    const overBudgetFunctions = functions.filter((f) => f.complexity > budget);
    const recommendations = generateRecommendations(overBudgetFunctions, budget);

    let verdict: BudgetVerdict = "pass";
    if (overBudgetFunctions.length > 0) {
      verdict = "over-budget";
    } else if (baseline > 0 && netChange > 0) {
      verdict = "credit-violation";
    }

    return {
      module: rel,
      verdict,
      budget,
      actual: maxComplexity,
      netChange,
      overBudgetFunctions,
      recommendations,
    };
  }

  /** Check multiple modules */
  checkModules(filePaths: string[]): BudgetReport {
    const results = filePaths
      .filter((p) => !p.includes(".test.") && !p.includes(".spec."))
      .map((p) => this.checkModule(p));

    const passing = results.filter((r) => r.verdict === "pass").length;
    const overBudget = results.filter((r) => r.verdict === "over-budget").length;
    const creditViolations = results.filter((r) => r.verdict === "credit-violation").length;
    const totalNetChange = results.reduce((s, r) => s + r.netChange, 0);

    return {
      timestamp: new Date().toISOString(),
      results,
      summary: {
        totalModules: results.length,
        passing,
        overBudget,
        creditViolations,
        totalNetChange,
        overallVerdict: overBudget > 0 || creditViolations > 0 ? "fail" : "pass",
      },
    };
  }

  /** Update baselines to current state (ratchet) */
  ratchet(filePaths: string[]): void {
    for (const filePath of filePaths) {
      if (filePath.includes(".test.") || filePath.includes(".spec.")) continue;
      const rel = relative(this.rootDir, filePath);
      const content = this.readFile(filePath);
      const functions = extractFunctionComplexities(content);
      this.config.baselines[rel] = getMaxComplexity(functions);
    }
    this.saveConfig();
  }

  /** Get current config */
  getConfig(): Readonly<BudgetConfig> {
    return this.config;
  }

  /** Set budget override for a module (requires Admiral approval context) */
  setOverride(module: string, maxComplexity: number): void {
    this.config.overrides[module] = maxComplexity;
    this.saveConfig();
  }

  // -------------------------------------------------------------------------
  // Config I/O
  // -------------------------------------------------------------------------

  private loadConfig(defaultMax: number): BudgetConfig {
    if (this.configPath && existsSync(this.configPath)) {
      try {
        const raw = readFileSync(this.configPath, "utf-8");
        const parsed = JSON.parse(raw);
        return {
          defaultMax: parsed.defaultMax ?? defaultMax,
          overrides: parsed.overrides ?? {},
          baselines: parsed.baselines ?? {},
        };
      } catch {
        // fall through to defaults
      }
    }
    return { defaultMax, overrides: {}, baselines: {} };
  }

  private saveConfig(): void {
    if (this.configPath) {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), "utf-8");
    }
  }

  private readFile(filePath: string): string {
    try {
      return readFileSync(filePath, "utf-8");
    } catch {
      return "";
    }
  }

  // -------------------------------------------------------------------------
  // Formatters
  // -------------------------------------------------------------------------

  static formatReport(report: BudgetReport): string {
    const lines: string[] = [];

    lines.push("=".repeat(55));
    lines.push("  COMPLEXITY BUDGET REPORT");
    lines.push(`  ${report.timestamp}`);
    lines.push("=".repeat(55));
    lines.push("");
    lines.push(`Overall: ${report.summary.overallVerdict.toUpperCase()}`);
    lines.push(`Modules: ${report.summary.totalModules} (${report.summary.passing} pass, ${report.summary.overBudget} over-budget, ${report.summary.creditViolations} credit violations)`);
    lines.push(`Net complexity change: ${report.summary.totalNetChange >= 0 ? "+" : ""}${report.summary.totalNetChange}`);
    lines.push("");

    const failingResults = report.results.filter((r) => r.verdict !== "pass");
    if (failingResults.length > 0) {
      lines.push("-".repeat(55));
      lines.push("  VIOLATIONS");
      lines.push("-".repeat(55));

      for (const result of failingResults) {
        const icon = result.verdict === "over-budget" ? "[OVER]" : "[CREDIT]";
        lines.push(`${icon} ${result.module}: actual ${result.actual}, budget ${result.budget}, net ${result.netChange >= 0 ? "+" : ""}${result.netChange}`);
        for (const rec of result.recommendations) {
          lines.push(`  -> ${rec}`);
        }
      }
      lines.push("");
    }

    lines.push("=".repeat(55));
    return lines.join("\n");
  }

  static formatReportJSON(report: BudgetReport): string {
    return JSON.stringify(report, null, 2);
  }
}
