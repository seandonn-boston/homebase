/**
 * Per-Module Ratings (RT-07)
 *
 * Extends rating calculation to module/directory level.
 * Critical module ratings cap the project rating.
 * Highlights consistency gaps between best and worst modules.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { RatingTier } from "./rating-model";
import { compareTiers, TIER_ELIGIBILITY, CORE_BENCHMARKS } from "./rating-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ModuleCriticality = "critical" | "standard" | "peripheral";

export interface ModuleCriticalityConfig {
  [modulePath: string]: ModuleCriticality;
}

export interface ModuleRatingResult {
  module: string;
  criticality: ModuleCriticality;
  rating: RatingTier;
  scores: ModuleScores;
}

export interface ModuleScores {
  testCoverage: number | null;
  complexity: number | null;
  enforcementCoverage: number | null;
  documentationCompleteness: number | null;
}

export interface ModuleRatingReport {
  timestamp: string;
  modules: ModuleRatingResult[];
  projectCap: RatingTier | null;
  consistencyGap: number;
  bestModule: string | null;
  worstModule: string | null;
}

// ---------------------------------------------------------------------------
// Default Criticality Config
// ---------------------------------------------------------------------------

const DEFAULT_CRITICALITY: ModuleCriticalityConfig = {
  ".hooks": "critical",
  "admiral/governance": "critical",
  "admiral/security": "critical",
  "admiral/rating": "standard",
  "admiral/quality": "standard",
  "admiral/brain": "standard",
  "admiral/knowledge": "standard",
  "admiral/context": "standard",
  "admiral/intent": "standard",
  "admiral/config": "standard",
  "admiral/lib": "standard",
  "admiral/fleet": "standard",
  "fleet": "standard",
  "control-plane": "standard",
  "platform": "standard",
  "mcp-server": "standard",
  "docs": "peripheral",
  "plan": "peripheral",
  "research": "peripheral",
};

// ---------------------------------------------------------------------------
// Module Analysis
// ---------------------------------------------------------------------------

function safeReadFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

const SKIP_DIRS = new Set(["node_modules", "dist", ".git"]);

function collectFiles(dir: string, ext: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  const walk = (d: string) => {
    let entries: string[];
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;
      const p = join(d, name);
      try {
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else if (name.endsWith(ext)) results.push(p);
      } catch { /* skip */ }
    }
  };
  walk(dir);
  return results;
}

function analyzeModule(rootDir: string, modulePath: string): ModuleScores {
  const fullPath = join(rootDir, modulePath);
  if (!existsSync(fullPath)) {
    return { testCoverage: null, complexity: null, enforcementCoverage: null, documentationCompleteness: null };
  }

  // Test coverage: ratio of test files to source files
  const tsFiles = collectFiles(fullPath, ".ts").filter((f) => !f.endsWith(".d.ts") && !f.includes("node_modules"));
  const shFiles = collectFiles(fullPath, ".sh").filter((f) => !f.includes("node_modules"));
  const sourceFiles = [...tsFiles, ...shFiles].filter((f) => !f.includes(".test.") && !f.includes("/tests/"));
  const testFiles = [...tsFiles, ...shFiles].filter((f) => f.includes(".test.") || f.includes("/tests/"));

  const testCoverage = sourceFiles.length > 0 ? (testFiles.length / sourceFiles.length) * 100 : null;

  // Complexity: count high-complexity functions (rough proxy)
  let totalFunctions = 0;
  let highComplexity = 0;
  for (const f of tsFiles.filter((f) => !f.includes(".test."))) {
    const content = safeReadFile(f);
    if (!content) continue;
    const funcs = (content.match(/\bfunction\s+\w+|=>\s*\{/g) || []).length;
    totalFunctions += funcs;
    // Lines-per-function as complexity proxy
    const lines = content.split("\n").length;
    if (funcs > 0 && lines / funcs > 30) highComplexity++;
  }
  const complexity = totalFunctions > 0 ? Math.max(0, 100 - (highComplexity / totalFunctions) * 100) : null;

  // Documentation: check for README, JSDoc comments, or .md files
  const mdFiles = collectFiles(fullPath, ".md");
  const hasReadme = mdFiles.some((f) => f.toLowerCase().includes("readme"));
  let docComments = 0;
  for (const f of tsFiles.filter((f) => !f.includes(".test."))) {
    const content = safeReadFile(f);
    if (content && /\/\*\*[\s\S]*?\*\//.test(content)) docComments++;
  }
  const docRatio = tsFiles.length > 0 ? docComments / tsFiles.filter((f) => !f.includes(".test.")).length : 0;
  const documentationCompleteness = (hasReadme ? 30 : 0) + docRatio * 70;

  return {
    testCoverage: testCoverage !== null ? Math.round(testCoverage * 10) / 10 : null,
    complexity: complexity !== null ? Math.round(complexity * 10) / 10 : null,
    enforcementCoverage: null, // Only measurable for hooks-related modules
    documentationCompleteness: Math.round(documentationCompleteness * 10) / 10,
  };
}

function scoresToTier(scores: ModuleScores): RatingTier {
  // Combine available scores into a composite
  const values: number[] = [];
  if (scores.testCoverage !== null) values.push(scores.testCoverage);
  if (scores.complexity !== null) values.push(scores.complexity);
  if (scores.documentationCompleteness !== null) values.push(scores.documentationCompleteness);
  if (scores.enforcementCoverage !== null) values.push(scores.enforcementCoverage);

  if (values.length === 0) return "ADM-5";

  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  if (avg >= 85) return "ADM-1";
  if (avg >= 70) return "ADM-2";
  if (avg >= 55) return "ADM-3";
  if (avg >= 35) return "ADM-4";
  return "ADM-5";
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

export function calculateModuleRatings(
  rootDir: string,
  criticalityOverrides?: ModuleCriticalityConfig,
): ModuleRatingReport {
  const criticality = { ...DEFAULT_CRITICALITY, ...criticalityOverrides };
  const modules: ModuleRatingResult[] = [];

  for (const [modulePath, crit] of Object.entries(criticality)) {
    const fullPath = join(rootDir, modulePath);
    if (!existsSync(fullPath)) continue;

    const scores = analyzeModule(rootDir, modulePath);
    const rating = scoresToTier(scores);

    modules.push({ module: modulePath, criticality: crit, rating, scores });
  }

  // Sort by rating (worst first)
  modules.sort((a, b) => compareTiers(b.rating, a.rating));

  // Project cap = worst critical module rating
  const criticalModules = modules.filter((m) => m.criticality === "critical");
  const projectCap = criticalModules.length > 0
    ? criticalModules.reduce<RatingTier>((worst, m) => {
        return compareTiers(m.rating, worst) > 0 ? m.rating : worst;
      }, "ADM-1")
    : null;

  // Consistency gap
  const allRatings = modules.map((m) => compareTiers(m.rating, "ADM-1"));
  const bestIdx = Math.min(...allRatings);
  const worstIdx = Math.max(...allRatings);
  const consistencyGap = worstIdx - bestIdx;

  return {
    timestamp: new Date().toISOString(),
    modules,
    projectCap,
    consistencyGap,
    bestModule: modules.length > 0 ? modules[modules.length - 1].module : null,
    worstModule: modules.length > 0 ? modules[0].module : null,
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatModuleRatings(report: ModuleRatingReport): string {
  const lines: string[] = [
    "# Per-Module Rating Report",
    "",
    `**Timestamp:** ${report.timestamp}`,
    `**Project Cap:** ${report.projectCap ?? "N/A"} (worst critical module)`,
    `**Consistency Gap:** ${report.consistencyGap} tiers`,
    `**Best Module:** ${report.bestModule ?? "N/A"}`,
    `**Worst Module:** ${report.worstModule ?? "N/A"}`,
    "",
    "## Module Ratings",
    "",
    "| Module | Criticality | Rating | Test Coverage | Complexity | Docs |",
    "|--------|-------------|--------|---------------|------------|------|",
  ];

  for (const m of report.modules) {
    const tc = m.scores.testCoverage !== null ? `${m.scores.testCoverage}%` : "N/A";
    const cx = m.scores.complexity !== null ? `${m.scores.complexity}` : "N/A";
    const dc = m.scores.documentationCompleteness !== null ? `${m.scores.documentationCompleteness}%` : "N/A";
    lines.push(`| ${m.module} | ${m.criticality} | ${m.rating} | ${tc} | ${cx} | ${dc} |`);
  }

  return lines.join("\n");
}
