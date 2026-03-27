/**
 * Technical Debt Tracker (QA-06)
 *
 * Scans five debt sources: TODO/FIXME/HACK comments, high-complexity modules,
 * skipped tests, vulnerable/outdated dependencies, code duplication.
 * Estimates remediation effort (S/M/L). Produces prioritized backlog
 * sorted by risk and a debt ratio metric.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { type Dirent, existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { execSync } from "node:child_process";
import { computeCyclomaticComplexity } from "./code-review";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DebtSource =
  | "comment-markers"
  | "high-complexity"
  | "skipped-tests"
  | "outdated-deps"
  | "code-duplication";

export type EffortEstimate = "S" | "M" | "L";

export type RiskLevel = "high" | "medium" | "low";

export interface DebtItem {
  source: DebtSource;
  location: string;
  description: string;
  effort: EffortEstimate;
  risk: RiskLevel;
  priority: number; // 0-100, higher = more urgent
}

export interface DebtReport {
  timestamp: string;
  rootDir: string;
  items: DebtItem[];
  summary: DebtSummary;
}

export interface DebtSummary {
  totalItems: number;
  bySource: Record<DebtSource, number>;
  byEffort: Record<EffortEstimate, number>;
  byRisk: Record<RiskLevel, number>;
  debtRatio: number; // debt items per 1000 lines of code
  totalSourceLines: number;
}

export interface DebtTrackerOptions {
  rootDir: string;
  complexityThreshold?: number;
  /** Paths to exclude from scanning */
  exclude?: string[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SOURCE_EXTENSIONS = new Set([".ts", ".js", ".tsx", ".jsx"]);
const DEFAULT_COMPLEXITY_THRESHOLD = 15;
const DEFAULT_EXCLUDE = ["node_modules", "dist", ".git", "coverage"];

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

function discoverSourceFiles(rootDir: string, exclude: string[]): string[] {
  const files: string[] = [];

  function walk(dir: string): void {
    let entries: Dirent<string>[];
    try {
      entries = readdirSync(dir, { withFileTypes: true, encoding: "utf-8" }) as Dirent<string>[];
    } catch {
      return;
    }

    for (const entry of entries) {
      if (exclude.includes(entry.name)) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  walk(rootDir);
  return files.sort();
}

// ---------------------------------------------------------------------------
// Scanners
// ---------------------------------------------------------------------------

function scanCommentMarkers(filePath: string, rootDir: string): DebtItem[] {
  const items: DebtItem[] = [];
  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const rel = relative(rootDir, filePath);

    const markers = [
      { pattern: /\bTODO\b/i, label: "TODO" },
      { pattern: /\bFIXME\b/i, label: "FIXME" },
      { pattern: /\bHACK\b/i, label: "HACK" },
      { pattern: /\bXXX\b/, label: "XXX" },
      { pattern: /\bWORKAROUND\b/i, label: "WORKAROUND" },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const { pattern, label } of markers) {
        if (pattern.test(line)) {
          const comment = line.trim().replace(/^\/\/\s*/, "").replace(/^\/\*\s*/, "").replace(/\s*\*\/$/, "");
          items.push({
            source: "comment-markers",
            location: `${rel}:${i + 1}`,
            description: `${label}: ${comment.slice(0, 120)}`,
            effort: label === "HACK" || label === "WORKAROUND" ? "M" : "S",
            risk: label === "FIXME" || label === "HACK" ? "high" : label === "TODO" ? "medium" : "low",
            priority: label === "FIXME" ? 80 : label === "HACK" ? 75 : label === "TODO" ? 50 : 30,
          });
          break; // Only count one marker per line
        }
      }
    }
  } catch {
    // skip unreadable files
  }
  return items;
}

function scanHighComplexity(filePath: string, rootDir: string, threshold: number): DebtItem[] {
  const items: DebtItem[] = [];
  if (filePath.includes(".test.") || filePath.includes(".spec.")) return items;

  try {
    const content = readFileSync(filePath, "utf-8");
    const rel = relative(rootDir, filePath);

    // Extract function bodies
    const funcPattern = /(?:(?:export\s+)?(?:async\s+)?function\s+(\w+))/g;
    let match: RegExpExecArray | null;

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

      if (complexity > threshold) {
        const lineNum = content.slice(0, match.index).split("\n").length;
        const ratio = complexity / threshold;
        items.push({
          source: "high-complexity",
          location: `${rel}:${lineNum}`,
          description: `Function '${name}' has complexity ${complexity} (threshold: ${threshold})`,
          effort: ratio > 2 ? "L" : "M",
          risk: ratio > 2 ? "high" : "medium",
          priority: Math.min(90, Math.round(50 + ratio * 20)),
        });
      }
    }
  } catch {
    // skip
  }
  return items;
}

function scanSkippedTests(filePath: string, rootDir: string): DebtItem[] {
  const items: DebtItem[] = [];
  if (!filePath.includes(".test.") && !filePath.includes(".spec.")) return items;

  try {
    const content = readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    const rel = relative(rootDir, filePath);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // it.skip, describe.skip, test.skip, xit, xdescribe, xtest
      if (/\b(?:it|describe|test)\.skip\b/.test(line) || /\b(?:xit|xdescribe|xtest)\b/.test(line)) {
        const desc = line.trim().slice(0, 100);
        items.push({
          source: "skipped-tests",
          location: `${rel}:${i + 1}`,
          description: `Skipped test: ${desc}`,
          effort: "S",
          risk: "medium",
          priority: 60,
        });
      }
      // .todo tests
      if (/\b(?:it|test)\.todo\b/.test(line)) {
        const desc = line.trim().slice(0, 100);
        items.push({
          source: "skipped-tests",
          location: `${rel}:${i + 1}`,
          description: `Todo test: ${desc}`,
          effort: "S",
          risk: "low",
          priority: 40,
        });
      }
    }
  } catch {
    // skip
  }
  return items;
}

function scanOutdatedDeps(rootDir: string): DebtItem[] {
  const items: DebtItem[] = [];
  const pkgPath = join(rootDir, "package.json");

  if (!existsSync(pkgPath)) return items;

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

    for (const [name, version] of Object.entries(allDeps)) {
      const ver = String(version);
      // Flag pinned-to-old-major or deprecated patterns
      if (ver.startsWith("0.")) {
        items.push({
          source: "outdated-deps",
          location: `package.json`,
          description: `Pre-1.0 dependency: ${name}@${ver}`,
          effort: "M",
          risk: "low",
          priority: 20,
        });
      }
    }

    // Try npm outdated (if available)
    try {
      const output = execSync("npm outdated --json 2>/dev/null", {
        cwd: rootDir,
        encoding: "utf-8",
        timeout: 15_000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      const outdated = JSON.parse(output || "{}");
      for (const [name, info] of Object.entries(outdated)) {
        const { current, wanted, latest } = info as { current: string; wanted: string; latest: string };
        if (current !== latest) {
          const majorDiff = parseInt(latest.split(".")[0], 10) - parseInt(current.split(".")[0], 10);
          items.push({
            source: "outdated-deps",
            location: "package.json",
            description: `Outdated: ${name} ${current} → ${latest} (wanted: ${wanted})`,
            effort: majorDiff > 0 ? "L" : "S",
            risk: majorDiff > 0 ? "medium" : "low",
            priority: majorDiff > 0 ? 55 : 25,
          });
        }
      }
    } catch {
      // npm outdated not available or failed — skip
    }
  } catch {
    // skip
  }
  return items;
}

function scanCodeDuplication(files: string[], rootDir: string): DebtItem[] {
  const items: DebtItem[] = [];

  // Simple line-hash based duplication detection
  const lineHashes = new Map<string, Array<{ file: string; line: number }>>();
  const WINDOW = 5; // consecutive lines

  for (const filePath of files) {
    if (filePath.includes(".test.") || filePath.includes(".spec.")) continue;

    try {
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith("//") && !l.startsWith("*") && !l.startsWith("import "));

      if (lines.length < WINDOW) continue;

      const rel = relative(rootDir, filePath);
      for (let i = 0; i <= lines.length - WINDOW; i++) {
        const block = lines.slice(i, i + WINDOW).join("\n");
        if (block.length < 50) continue; // Skip trivially short blocks

        const key = block;
        if (!lineHashes.has(key)) {
          lineHashes.set(key, []);
        }
        lineHashes.get(key)!.push({ file: rel, line: i + 1 });
      }
    } catch {
      // skip
    }
  }

  // Report blocks that appear in multiple files
  const reported = new Set<string>();
  for (const [_block, locations] of lineHashes) {
    const uniqueFiles = new Set(locations.map((l) => l.file));
    if (uniqueFiles.size < 2) continue;

    const key = [...uniqueFiles].sort().join(",");
    if (reported.has(key)) continue;
    reported.add(key);

    const fileList = [...uniqueFiles].slice(0, 3).join(", ");
    items.push({
      source: "code-duplication",
      location: fileList,
      description: `Duplicated ${WINDOW}-line block found in ${uniqueFiles.size} files`,
      effort: "M",
      risk: "low",
      priority: 35,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Debt Tracker
// ---------------------------------------------------------------------------

export class DebtTracker {
  private readonly rootDir: string;
  private readonly complexityThreshold: number;
  private readonly exclude: string[];

  constructor(options: DebtTrackerOptions) {
    this.rootDir = options.rootDir;
    this.complexityThreshold = options.complexityThreshold ?? DEFAULT_COMPLEXITY_THRESHOLD;
    this.exclude = options.exclude ?? DEFAULT_EXCLUDE;
  }

  /** Run full debt scan and produce report */
  scan(): DebtReport {
    const files = discoverSourceFiles(this.rootDir, this.exclude);
    const items: DebtItem[] = [];

    // Scan all sources
    for (const file of files) {
      items.push(...scanCommentMarkers(file, this.rootDir));
      items.push(...scanHighComplexity(file, this.rootDir, this.complexityThreshold));
      items.push(...scanSkippedTests(file, this.rootDir));
    }
    items.push(...scanOutdatedDeps(this.rootDir));
    items.push(...scanCodeDuplication(files, this.rootDir));

    // Sort by priority (highest first), then risk
    items.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      const riskOrder: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 };
      return riskOrder[b.risk] - riskOrder[a.risk];
    });

    // Compute summary
    const totalLines = this.countTotalLines(files);
    const summary = this.buildSummary(items, totalLines);

    return {
      timestamp: new Date().toISOString(),
      rootDir: this.rootDir,
      items,
      summary,
    };
  }

  private countTotalLines(files: string[]): number {
    let total = 0;
    for (const file of files) {
      if (file.includes(".test.") || file.includes(".spec.")) continue;
      try {
        const content = readFileSync(file, "utf-8");
        total += content.split("\n").length;
      } catch {
        // skip
      }
    }
    return total;
  }

  private buildSummary(items: DebtItem[], totalLines: number): DebtSummary {
    const bySource: Record<DebtSource, number> = {
      "comment-markers": 0,
      "high-complexity": 0,
      "skipped-tests": 0,
      "outdated-deps": 0,
      "code-duplication": 0,
    };
    const byEffort: Record<EffortEstimate, number> = { S: 0, M: 0, L: 0 };
    const byRisk: Record<RiskLevel, number> = { high: 0, medium: 0, low: 0 };

    for (const item of items) {
      bySource[item.source]++;
      byEffort[item.effort]++;
      byRisk[item.risk]++;
    }

    const debtRatio = totalLines > 0 ? Math.round((items.length / totalLines) * 1000 * 100) / 100 : 0;

    return {
      totalItems: items.length,
      bySource,
      byEffort,
      byRisk,
      debtRatio,
      totalSourceLines: totalLines,
    };
  }

  // -------------------------------------------------------------------------
  // Formatters
  // -------------------------------------------------------------------------

  static formatReport(report: DebtReport): string {
    const lines: string[] = [];

    lines.push("=".repeat(55));
    lines.push("  TECHNICAL DEBT REPORT");
    lines.push(`  ${report.timestamp}`);
    lines.push("=".repeat(55));
    lines.push("");
    lines.push(`Total debt items: ${report.summary.totalItems}`);
    lines.push(`Source lines: ${report.summary.totalSourceLines}`);
    lines.push(`Debt ratio: ${report.summary.debtRatio} items/1000 lines`);
    lines.push("");

    lines.push("By source:");
    for (const [source, count] of Object.entries(report.summary.bySource)) {
      if (count > 0) lines.push(`  ${source}: ${count}`);
    }
    lines.push("");

    lines.push("By effort: S=" + report.summary.byEffort.S + " M=" + report.summary.byEffort.M + " L=" + report.summary.byEffort.L);
    lines.push("By risk: high=" + report.summary.byRisk.high + " medium=" + report.summary.byRisk.medium + " low=" + report.summary.byRisk.low);
    lines.push("");

    if (report.items.length > 0) {
      lines.push("-".repeat(55));
      lines.push("  PRIORITIZED BACKLOG");
      lines.push("-".repeat(55));

      for (const item of report.items.slice(0, 30)) {
        lines.push(`[${item.risk.toUpperCase()}/${item.effort}] ${item.description}`);
        lines.push(`  @ ${item.location} (priority: ${item.priority})`);
      }
      if (report.items.length > 30) {
        lines.push(`... and ${report.items.length - 30} more items`);
      }
    }

    lines.push("");
    lines.push("=".repeat(55));
    return lines.join("\n");
  }

  static formatReportJSON(report: DebtReport): string {
    return JSON.stringify(report, null, 2);
  }
}
