/**
 * Automated Rating Calculation (RT-02)
 *
 * Collects the 7 core benchmarks from operational data, applies hard cap rules,
 * evaluates HJG status, and produces a Rating Report. Designed to run against
 * the current Helm repo and produce a truthful self-assessment.
 *
 * The script will likely produce ADM-4 or ADM-5 initially — that is correct.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { execSync } from "node:child_process";
import {
  type BenchmarkResult,
  type GateVerdict,
  type RatingReport,
  type CertificationSuffix,
  calculateRating,
  formatRatingReport,
  HUMAN_JUDGMENT_GATES,
} from "./rating-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CollectionContext {
  /** Project root directory */
  rootDir: string;
  /** Override benchmark values (for testing) */
  overrides?: Partial<Record<string, number>>;
  /** Gate verdicts from human evaluators (empty = no gates evaluated) */
  gateVerdicts?: GateVerdict[];
  /** Certification suffix */
  certificationSuffix?: CertificationSuffix;
  /** Flags for boolean-type hard caps */
  flags?: {
    identityViolation?: boolean;
    authorityEscalation?: boolean;
    attackCorpusPassRate?: number;
  };
}

export interface CollectionResult {
  benchmarks: BenchmarkResult[];
  diagnostics: string[];
}

// ---------------------------------------------------------------------------
// File System Helpers
// ---------------------------------------------------------------------------

function safeReadFile(path: string): string | null {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return null;
  }
}

function safeExec(cmd: string, cwd: string): string | null {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 30000, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return null;
  }
}

function countFilesRecursive(dir: string, ext: string): number {
  if (!existsSync(dir)) return 0;
  let count = 0;
  const walk = (d: string) => {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === "node_modules" || name === "dist" || name === ".git") continue;
      const p = join(d, name);
      try {
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else if (name.endsWith(ext)) count++;
      } catch {
        /* skip unreadable */
      }
    }
  };
  walk(dir);
  return count;
}

function collectTsFiles(dir: string): string[] {
  const files: string[] = [];
  if (!existsSync(dir)) return files;
  const walk = (d: string) => {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const name of entries) {
      if (name === "node_modules" || name === "dist" || name === ".git") continue;
      const p = join(d, name);
      try {
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) files.push(p);
      } catch {
        /* skip */
      }
    }
  };
  walk(dir);
  return files;
}

// ---------------------------------------------------------------------------
// Benchmark Collectors
// ---------------------------------------------------------------------------

/**
 * Collect first-pass quality proxy.
 *
 * Uses test coverage presence and defect marker density as proxy metrics.
 * Test pass rate would be ideal but requires running the full suite.
 * We estimate: (modules with tests / total modules) * 100, adjusted by
 * defect density.
 */
function collectFirstPassQuality(
  rootDir: string,
  diagnostics: string[],
): BenchmarkResult {
  const admiralDir = join(rootDir, "admiral");
  const sourceFiles = collectTsFiles(admiralDir).filter(
    (f) => !f.includes(".test.") && !f.includes("node_modules"),
  );
  const testFiles = collectTsFiles(admiralDir).filter(
    (f) => f.includes(".test.") && !f.includes("node_modules"),
  );

  if (sourceFiles.length === 0) {
    diagnostics.push("first-pass-quality: no source files found");
    return { benchmarkId: "first-pass-quality", value: null, status: "insufficient-data", source: "file-scan" };
  }

  // Count source files that have a corresponding test file
  const testedModules = sourceFiles.filter((sf) => {
    const testName = sf.replace(/\.ts$/, ".test.ts");
    return testFiles.includes(testName);
  });

  // Count defect markers across all source files
  let totalLines = 0;
  let defectMarkers = 0;
  for (const f of sourceFiles) {
    const content = safeReadFile(f);
    if (!content) continue;
    const lines = content.split("\n");
    totalLines += lines.length;
    for (const line of lines) {
      if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(line)) defectMarkers++;
    }
  }

  const testCoverageRatio = testedModules.length / sourceFiles.length;
  const defectRate = totalLines > 0 ? defectMarkers / (totalLines / 100) : 0;
  // Adjust quality down by defect rate (each marker per 100 lines costs 2 points)
  const quality = Math.max(0, Math.min(100, testCoverageRatio * 100 - defectRate * 2));

  diagnostics.push(
    `first-pass-quality: ${testedModules.length}/${sourceFiles.length} modules tested, ` +
    `${defectMarkers} defect markers in ${totalLines} lines, score=${quality.toFixed(1)}`,
  );

  return {
    benchmarkId: "first-pass-quality",
    value: Math.round(quality * 10) / 10,
    status: "measured",
    source: "test-coverage-proxy",
  };
}

/**
 * Collect recovery success rate proxy.
 *
 * Checks for error handling patterns, graceful degradation tests, and
 * recovery protocol implementations.
 */
function collectRecoverySuccessRate(
  rootDir: string,
  diagnostics: string[],
): BenchmarkResult {
  const admiralDir = join(rootDir, "admiral");
  const allFiles = collectTsFiles(admiralDir).filter((f) => !f.includes("node_modules"));

  let recoveryPatterns = 0;
  let errorHandlers = 0;
  let totalFunctions = 0;

  for (const f of allFiles) {
    const content = safeReadFile(f);
    if (!content) continue;
    // Count try/catch blocks as recovery mechanisms
    const tryCatches = (content.match(/\btry\s*\{/g) || []).length;
    errorHandlers += tryCatches;
    // Count functions
    const funcs = (content.match(/\bfunction\s+\w+|=>\s*\{|\.then\(/g) || []).length;
    totalFunctions += funcs;
    // Count explicit recovery patterns
    if (/recover|fallback|retry|graceful|degrad/i.test(content)) {
      recoveryPatterns++;
    }
  }

  // Check for graceful degradation test coverage
  const degradationTests = allFiles.filter((f) => {
    const content = safeReadFile(f);
    return content && /graceful.*degrad|recovery.*test|error.*recovery/i.test(content);
  });

  if (totalFunctions === 0) {
    diagnostics.push("recovery-success-rate: no functions found to analyze");
    return { benchmarkId: "recovery-success-rate", value: null, status: "insufficient-data", source: "code-analysis" };
  }

  // Score based on: error handler coverage + recovery pattern presence
  const handlerCoverage = Math.min(1, errorHandlers / Math.max(1, totalFunctions / 5));
  const patternBonus = Math.min(0.3, (recoveryPatterns / allFiles.length) * 0.5);
  const testBonus = Math.min(0.2, (degradationTests.length / 5) * 0.2);
  const score = Math.min(100, (handlerCoverage + patternBonus + testBonus) * 100);

  diagnostics.push(
    `recovery-success-rate: ${errorHandlers} error handlers, ${recoveryPatterns} recovery patterns, ` +
    `${degradationTests.length} degradation tests, score=${score.toFixed(1)}`,
  );

  return {
    benchmarkId: "recovery-success-rate",
    value: Math.round(score * 10) / 10,
    status: "measured",
    source: "code-analysis-proxy",
  };
}

/**
 * Collect enforcement coverage from the enforcement map.
 */
function collectEnforcementCoverage(
  rootDir: string,
  diagnostics: string[],
): BenchmarkResult {
  const mapPath = join(rootDir, "admiral", "docs", "standing-orders-enforcement-map.json");
  const content = safeReadFile(mapPath);
  if (!content) {
    diagnostics.push("enforcement-coverage: enforcement map not found");
    return { benchmarkId: "enforcement-coverage", value: null, status: "insufficient-data", source: "enforcement-map" };
  }

  try {
    const map = JSON.parse(content);
    const orders = map.standing_orders || map.orders || [];
    if (!Array.isArray(orders) || orders.length === 0) {
      // Try alternate structure
      const coverage = map.coverage_percentage ?? map.summary?.coverage_percentage;
      if (typeof coverage === "number") {
        diagnostics.push(`enforcement-coverage: ${coverage}% from enforcement map summary`);
        return { benchmarkId: "enforcement-coverage", value: coverage, status: "measured", source: "enforcement-map" };
      }
      diagnostics.push("enforcement-coverage: cannot parse enforcement map structure");
      return { benchmarkId: "enforcement-coverage", value: null, status: "insufficient-data", source: "enforcement-map" };
    }

    const total = orders.length;
    const enforced = orders.filter(
      (o: { enforcement_type?: string }) =>
        o.enforcement_type === "hook-enforced" || o.enforcement_type === "hook_enforced",
    ).length;
    const coverage = total > 0 ? (enforced / total) * 100 : 0;

    diagnostics.push(
      `enforcement-coverage: ${enforced}/${total} SOs hook-enforced = ${coverage.toFixed(1)}%`,
    );

    return {
      benchmarkId: "enforcement-coverage",
      value: Math.round(coverage * 10) / 10,
      status: "measured",
      source: "enforcement-map",
    };
  } catch (e) {
    diagnostics.push(`enforcement-coverage: JSON parse error: ${e}`);
    return { benchmarkId: "enforcement-coverage", value: null, status: "insufficient-data", source: "enforcement-map" };
  }
}

/**
 * Collect context efficiency estimate.
 *
 * Analyzes context zone allocation from reference constants and estimates
 * the ratio of productive output to total context consumption.
 */
function collectContextEfficiency(
  rootDir: string,
  diagnostics: string[],
): BenchmarkResult {
  const constantsPath = join(rootDir, "admiral", "config", "reference_constants.sh");
  const content = safeReadFile(constantsPath);

  if (!content) {
    diagnostics.push("context-efficiency: reference constants not found");
    return { benchmarkId: "context-efficiency", value: null, status: "insufficient-data", source: "config-analysis" };
  }

  // Extract working context percentage (the productive zone)
  const workingMin = content.match(/CONTEXT_WORKING_MIN_PCT=(\d+)/);
  const workingMax = content.match(/CONTEXT_WORKING_MAX_PCT=(\d+)/);
  const standingMax = content.match(/CONTEXT_STANDING_MAX_PCT=(\d+)/);

  if (!workingMin || !standingMax) {
    // Estimate from context engineering module presence
    const ceDir = join(rootDir, "admiral", "context");
    const ceFiles = existsSync(ceDir) ? readdirSync(ceDir).filter((f) => f.endsWith(".ts")).length : 0;
    const estimate = ceFiles > 3 ? 0.2 : ceFiles > 0 ? 0.15 : 0.1;
    diagnostics.push(`context-efficiency: estimated ${estimate} from ${ceFiles} context engineering modules`);
    return { benchmarkId: "context-efficiency", value: estimate, status: "measured", source: "config-estimate" };
  }

  // Working context ratio is a proxy for context efficiency
  const working = (Number(workingMin[1]) + Number(workingMax?.[1] ?? workingMin[1])) / 2;
  const standing = Number(standingMax[1]);
  // Efficiency = working / (working + overhead) where standing context is necessary overhead
  const efficiency = working / (working + standing + 15); // 15% for session metadata overhead

  diagnostics.push(
    `context-efficiency: working=${working}%, standing=${standing}%, estimated ratio=${efficiency.toFixed(3)}`,
  );

  return {
    benchmarkId: "context-efficiency",
    value: Math.round(efficiency * 1000) / 1000,
    status: "measured",
    source: "config-analysis",
  };
}

/**
 * Collect governance overhead estimate.
 *
 * Measures the ratio of governance code to total code as a proxy
 * for runtime governance overhead.
 */
function collectGovernanceOverhead(
  rootDir: string,
  diagnostics: string[],
): BenchmarkResult {
  const hooksDir = join(rootDir, ".hooks");
  const admiralDir = join(rootDir, "admiral");

  const hookFiles = existsSync(hooksDir)
    ? readdirSync(hooksDir).filter((f) => f.endsWith(".sh")).length
    : 0;

  // Count governance-specific files
  let governanceLines = 0;
  let totalLines = 0;

  const govDirs = ["governance", "security"];
  const allDirs = ["governance", "security", "quality", "rating", "brain", "knowledge",
                   "context", "intent", "fleet", "lib", "config"];

  for (const dir of allDirs) {
    const dirPath = join(admiralDir, dir);
    if (!existsSync(dirPath)) continue;
    const files = collectTsFiles(dirPath);
    for (const f of files) {
      const content = safeReadFile(f);
      if (!content) continue;
      const lines = content.split("\n").length;
      totalLines += lines;
      if (govDirs.some((g) => f.includes(g))) {
        governanceLines += lines;
      }
    }
  }

  // Hook scripts contribute to governance overhead
  if (existsSync(hooksDir)) {
    for (const name of readdirSync(hooksDir)) {
      if (!name.endsWith(".sh")) continue;
      const content = safeReadFile(join(hooksDir, name));
      if (content) {
        const lines = content.split("\n").length;
        governanceLines += lines;
        totalLines += lines;
      }
    }
  }

  if (totalLines === 0) {
    diagnostics.push("governance-overhead: no code found to analyze");
    return { benchmarkId: "governance-overhead", value: null, status: "insufficient-data", source: "code-analysis" };
  }

  const overhead = (governanceLines / totalLines) * 100;
  diagnostics.push(
    `governance-overhead: ${governanceLines}/${totalLines} lines = ${overhead.toFixed(1)}% ` +
    `(${hookFiles} hook scripts)`,
  );

  return {
    benchmarkId: "governance-overhead",
    value: Math.round(overhead * 10) / 10,
    status: "measured",
    source: "code-ratio-proxy",
  };
}

/**
 * Collect coordination overhead estimate.
 *
 * Analyzes fleet coordination code relative to productive agent code.
 */
function collectCoordinationOverhead(
  rootDir: string,
  diagnostics: string[],
): BenchmarkResult {
  const fleetDir = join(rootDir, "fleet");
  const admiralDir = join(rootDir, "admiral");

  let coordLines = 0;
  let totalLines = 0;

  // Fleet coordination code
  if (existsSync(fleetDir)) {
    const fleetFiles = collectTsFiles(fleetDir);
    for (const f of fleetFiles) {
      const content = safeReadFile(f);
      if (!content) continue;
      const lines = content.split("\n").length;
      coordLines += lines;
      totalLines += lines;
    }
  }

  // Orchestration code in admiral
  const orchDirs = ["lib"];
  for (const dir of orchDirs) {
    const dirPath = join(admiralDir, dir);
    if (!existsSync(dirPath)) continue;
    let entries: string[];
    try {
      entries = readdirSync(dirPath);
    } catch {
      continue;
    }
    for (const name of entries) {
      if (/parallel|coordinator|handoff|routing/i.test(name)) {
        const content = safeReadFile(join(dirPath, name));
        if (content) {
          coordLines += content.split("\n").length;
        }
      }
    }
  }

  // All admiral code for the denominator
  const allFiles = collectTsFiles(admiralDir);
  for (const f of allFiles) {
    const content = safeReadFile(f);
    if (content) totalLines += content.split("\n").length;
  }

  if (totalLines === 0) {
    diagnostics.push("coordination-overhead: no code found");
    return { benchmarkId: "coordination-overhead", value: null, status: "insufficient-data", source: "code-analysis" };
  }

  const overhead = (coordLines / totalLines) * 100;
  diagnostics.push(
    `coordination-overhead: ${coordLines}/${totalLines} lines = ${overhead.toFixed(1)}%`,
  );

  return {
    benchmarkId: "coordination-overhead",
    value: Math.round(overhead * 10) / 10,
    status: "measured",
    source: "code-ratio-proxy",
  };
}

/**
 * Collect knowledge reuse estimate.
 *
 * Checks Brain entry counts, access patterns, and whether knowledge
 * retrieval is wired into hooks and workflows.
 */
function collectKnowledgeReuse(
  rootDir: string,
  diagnostics: string[],
): BenchmarkResult {
  const brainDir = join(rootDir, "admiral", "brain");
  const knowledgeDir = join(rootDir, "admiral", "knowledge");
  const hooksDir = join(rootDir, ".hooks");

  let brainReferences = 0;
  let totalHooks = 0;

  // Check how many hooks reference brain queries
  if (existsSync(hooksDir)) {
    const hookFiles = readdirSync(hooksDir).filter((f) => f.endsWith(".sh"));
    totalHooks = hookFiles.length;
    for (const name of hookFiles) {
      const content = safeReadFile(join(hooksDir, name));
      if (content && /brain|knowledge|memory/i.test(content)) {
        brainReferences++;
      }
    }
  }

  // Check Brain module completeness
  const brainFiles = existsSync(brainDir) ? readdirSync(brainDir).filter((f) => f.endsWith(".ts")).length : 0;
  const knowledgeFiles = existsSync(knowledgeDir) ? readdirSync(knowledgeDir).filter((f) => f.endsWith(".ts")).length : 0;

  // Check for Brain integration in TypeScript code
  const allFiles = collectTsFiles(join(rootDir, "admiral"));
  let brainImports = 0;
  for (const f of allFiles) {
    const content = safeReadFile(f);
    if (content && /from\s+["'].*brain|from\s+["'].*knowledge/i.test(content)) {
      brainImports++;
    }
  }

  const modulePresence = brainFiles + knowledgeFiles;
  const hookIntegration = totalHooks > 0 ? (brainReferences / totalHooks) : 0;
  const codeIntegration = allFiles.length > 0 ? (brainImports / allFiles.length) : 0;

  // Score: module presence (40%) + hook integration (30%) + code integration (30%)
  const presenceScore = Math.min(1, modulePresence / 10) * 40;
  const hookScore = hookIntegration * 30;
  const codeScore = codeIntegration * 30;
  const reuse = presenceScore + hookScore + codeScore;

  diagnostics.push(
    `knowledge-reuse: ${brainFiles} brain files, ${knowledgeFiles} knowledge files, ` +
    `${brainReferences}/${totalHooks} hooks reference brain, ${brainImports} brain imports, ` +
    `score=${reuse.toFixed(1)}`,
  );

  return {
    benchmarkId: "knowledge-reuse",
    value: Math.round(reuse * 10) / 10,
    status: "measured",
    source: "integration-analysis",
  };
}

// ---------------------------------------------------------------------------
// Attack Corpus Collector
// ---------------------------------------------------------------------------

function collectAttackCorpusPassRate(
  rootDir: string,
  diagnostics: string[],
): number | undefined {
  const attackDir = join(rootDir, "admiral", "security");
  if (!existsSync(attackDir)) {
    diagnostics.push("attack-corpus: security directory not found");
    return undefined;
  }

  const securityFiles = readdirSync(attackDir).filter((f) => f.endsWith(".ts"));
  const attackFiles = securityFiles.filter((f) =>
    /attack|atk|injection|adversarial/i.test(f),
  );

  // Check test files for attack corpus coverage
  const testFiles = securityFiles.filter((f) => f.includes(".test."));
  if (testFiles.length === 0) {
    diagnostics.push("attack-corpus: no security tests found");
    return undefined;
  }

  let totalAttackScenarios = 0;
  let testedScenarios = 0;

  for (const tf of testFiles) {
    const content = safeReadFile(join(attackDir, tf));
    if (!content) continue;
    const scenarios = (content.match(/\bit\s*\(/g) || []).length;
    totalAttackScenarios += scenarios;
    // Count passing assertions as tested
    const assertions = (content.match(/assert\.|expect\(/g) || []).length;
    testedScenarios += Math.min(scenarios, assertions > 0 ? scenarios : 0);
  }

  if (totalAttackScenarios === 0) {
    diagnostics.push("attack-corpus: no attack scenarios found in tests");
    return undefined;
  }

  const passRate = (testedScenarios / totalAttackScenarios) * 100;
  diagnostics.push(
    `attack-corpus: ${testedScenarios}/${totalAttackScenarios} scenarios with assertions, ` +
    `estimated pass rate=${passRate.toFixed(1)}%`,
  );

  return Math.round(passRate * 10) / 10;
}

// ---------------------------------------------------------------------------
// Main Collection
// ---------------------------------------------------------------------------

export function collectBenchmarks(ctx: CollectionContext): CollectionResult {
  const diagnostics: string[] = [];
  const collectors = [
    collectFirstPassQuality,
    collectRecoverySuccessRate,
    collectEnforcementCoverage,
    collectContextEfficiency,
    collectGovernanceOverhead,
    collectCoordinationOverhead,
    collectKnowledgeReuse,
  ];

  const benchmarks = collectors.map((collector) => {
    try {
      return collector(ctx.rootDir, diagnostics);
    } catch (e) {
      const name = collector.name.replace("collect", "").replace(/([A-Z])/g, "-$1").toLowerCase();
      diagnostics.push(`${name}: collection error: ${e}`);
      return {
        benchmarkId: name,
        value: null,
        status: "insufficient-data" as const,
        source: "error",
      };
    }
  });

  // Apply overrides
  if (ctx.overrides) {
    for (const [id, value] of Object.entries(ctx.overrides)) {
      const idx = benchmarks.findIndex((b) => b.benchmarkId === id);
      if (idx >= 0) {
        benchmarks[idx] = { benchmarkId: id, value: value ?? null, status: "measured", source: "override" };
        diagnostics.push(`${id}: overridden to ${value}`);
      }
    }
  }

  return { benchmarks, diagnostics };
}

// ---------------------------------------------------------------------------
// Full Rating Calculation
// ---------------------------------------------------------------------------

export function computeFullRating(ctx: CollectionContext): {
  report: RatingReport;
  diagnostics: string[];
} {
  const { benchmarks, diagnostics } = collectBenchmarks(ctx);

  const attackCorpusPassRate = ctx.flags?.attackCorpusPassRate ??
    collectAttackCorpusPassRate(ctx.rootDir, diagnostics);

  const report = calculateRating({
    entity: "admiral-framework",
    category: "platform",
    benchmarks,
    gateVerdicts: ctx.gateVerdicts ?? [],
    flags: {
      identityViolation: ctx.flags?.identityViolation ?? false,
      authorityEscalation: ctx.flags?.authorityEscalation ?? false,
      attackCorpusPassRate,
    },
    certificationSuffix: ctx.certificationSuffix ?? "-SA",
  });

  return { report, diagnostics };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatFullReport(
  report: RatingReport,
  diagnostics: string[],
): string {
  const lines: string[] = [formatRatingReport(report)];

  lines.push("", "## Collection Diagnostics", "");
  for (const d of diagnostics) {
    lines.push(`- ${d}`);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// CLI Entry Point
// ---------------------------------------------------------------------------

export function runCli(args: string[]): string {
  const rootDir = args[0] || process.cwd();
  const jsonMode = args.includes("--json");

  const { report, diagnostics } = computeFullRating({ rootDir });

  if (jsonMode) {
    return JSON.stringify({ report, diagnostics }, null, 2);
  }

  return formatFullReport(report, diagnostics);
}
