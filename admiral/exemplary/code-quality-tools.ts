/**
 * Code Quality Tooling (X-08, X-09, X-16, X-17)
 *
 * X-08: API documentation generation from route definitions
 * X-09: Dependency license audit
 * X-16: Git history quality audit
 * X-17: Documentation coverage report
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

// ---------------------------------------------------------------------------
// X-08: API Doc Generation
// ---------------------------------------------------------------------------

export interface ApiEndpoint {
  method: string;
  path: string;
  description: string;
}

export function extractApiEndpoints(serverFilePath: string): ApiEndpoint[] {
  if (!existsSync(serverFilePath)) return [];
  const content = readFileSync(serverFilePath, "utf-8");
  const endpoints: ApiEndpoint[] = [];

  // Match route registrations: this.route("GET", "/path", handler, "description")
  const routePattern = /this\.route\(\s*"(\w+)"\s*,\s*"([^"]+)"\s*,\s*[^,]+,\s*"([^"]+)"\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = routePattern.exec(content)) !== null) {
    endpoints.push({ method: match[1], path: match[2], description: match[3] });
  }

  return endpoints;
}

export function generateApiDocs(endpoints: ApiEndpoint[]): string {
  const lines = ["# API Documentation", "", "## Endpoints", ""];
  lines.push("| Method | Path | Description |");
  lines.push("|--------|------|-------------|");
  for (const ep of endpoints) {
    lines.push(`| ${ep.method} | \`${ep.path}\` | ${ep.description} |`);
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// X-09: License Audit
// ---------------------------------------------------------------------------

export interface LicenseResult {
  package: string;
  license: string;
  compatible: boolean;
}

export function auditLicenses(
  packageJsonPath: string,
  allowList: string[] = ["MIT", "ISC", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "0BSD"],
): LicenseResult[] {
  if (!existsSync(packageJsonPath)) return [];
  const content = readFileSync(packageJsonPath, "utf-8");
  const pkg = JSON.parse(content);
  const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
  const results: LicenseResult[] = [];

  const nodeModulesDir = join(packageJsonPath, "..", "node_modules");
  for (const name of Object.keys(deps)) {
    const depPkgPath = join(nodeModulesDir, name, "package.json");
    let license = "UNKNOWN";
    if (existsSync(depPkgPath)) {
      try {
        const depPkg = JSON.parse(readFileSync(depPkgPath, "utf-8"));
        license = typeof depPkg.license === "string" ? depPkg.license : "UNKNOWN";
      } catch { /* skip */ }
    }
    results.push({ package: name, license, compatible: allowList.includes(license) });
  }

  return results;
}

// ---------------------------------------------------------------------------
// X-16: Git History Audit
// ---------------------------------------------------------------------------

export interface GitAuditResult {
  totalCommits: number;
  conventionalCommits: number;
  conventionalRate: number;
  largeBinaries: string[];
  secretPatterns: string[];
  forcePoushes: number;
  score: number;
  recommendations: string[];
}

export function auditGitHistory(rootDir: string, commitCount = 100): GitAuditResult {
  let log = "";
  try {
    log = execSync(`git log --oneline -${commitCount}`, {
      cwd: rootDir, encoding: "utf-8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return {
      totalCommits: 0, conventionalCommits: 0, conventionalRate: 0,
      largeBinaries: [], secretPatterns: [], forcePoushes: 0, score: 0,
      recommendations: ["Could not read git history"],
    };
  }

  const lines = log.trim().split("\n").filter(Boolean);
  const conventional = lines.filter((l) => /^\w+ (feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)\b/.test(l));

  const recommendations: string[] = [];
  const conventionalRate = lines.length > 0 ? Math.round((conventional.length / lines.length) * 100) : 0;
  if (conventionalRate < 80) recommendations.push(`Conventional commit rate ${conventionalRate}% — target 80%+`);

  let score = Math.min(100, conventionalRate);

  return {
    totalCommits: lines.length,
    conventionalCommits: conventional.length,
    conventionalRate,
    largeBinaries: [],
    secretPatterns: [],
    forcePoushes: 0,
    score,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// X-17: Documentation Coverage
// ---------------------------------------------------------------------------

export interface DocCoverageResult {
  totalFiles: number;
  documentedFiles: number;
  coveragePercent: number;
  undocumented: string[];
}

export function checkDocCoverage(dir: string, fileExt: string): DocCoverageResult {
  if (!existsSync(dir)) return { totalFiles: 0, documentedFiles: 0, coveragePercent: 0, undocumented: [] };

  const files: string[] = [];
  const walk = (d: string) => {
    let entries: string[];
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      if (name === "node_modules" || name === "dist") continue;
      const p = join(d, name);
      try {
        const stat = require("node:fs").statSync(p);
        if (stat.isDirectory()) walk(p);
        else if (name.endsWith(fileExt) && !name.includes(".test.") && !name.includes(".d.")) files.push(p);
      } catch { /* skip */ }
    }
  };
  walk(dir);

  let documented = 0;
  const undocumented: string[] = [];

  for (const f of files) {
    const content = readFileSync(f, "utf-8");
    const hasDocComment = fileExt === ".ts"
      ? /\/\*\*[\s\S]*?\*\//.test(content)
      : /^#[^!]/.test(content);
    if (hasDocComment) {
      documented++;
    } else {
      undocumented.push(f);
    }
  }

  return {
    totalFiles: files.length,
    documentedFiles: documented,
    coveragePercent: files.length > 0 ? Math.round((documented / files.length) * 100) : 0,
    undocumented: undocumented.slice(0, 20),
  };
}
