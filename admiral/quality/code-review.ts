/**
 * Code Review Automation (QA-01)
 *
 * Automated checks on code changes: naming conventions, cyclomatic complexity,
 * test presence, import hygiene, documentation presence, file size limits.
 * Produces structured QA Issue Reports.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { readFileSync, statSync, existsSync, readdirSync } from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Severity = "Blocker" | "Critical" | "Major" | "Minor" | "Info";

export interface QAIssue {
  issue: string;
  severity: Severity;
  location: string;
  expected: string;
  actual: string;
  confidence: number; // 0-1
}

export interface ReviewReport {
  timestamp: string;
  files: string[];
  issues: QAIssue[];
  summary: ReviewSummary;
  durationMs: number;
}

export interface ReviewSummary {
  totalFiles: number;
  totalIssues: number;
  byseverity: Record<Severity, number>;
  passRate: number; // 0-1, files with zero Blocker/Critical issues
}

export interface ReviewOptions {
  maxFileLines?: number;
  maxFileSizeBytes?: number;
  maxCyclomaticComplexity?: number;
  checkers?: CheckerName[];
}

export type CheckerName =
  | "naming"
  | "complexity"
  | "testPresence"
  | "importHygiene"
  | "documentation"
  | "fileSize";

type Checker = (filePath: string, content: string, lines: string[]) => QAIssue[];

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_MAX_FILE_LINES = 500;
const DEFAULT_MAX_FILE_SIZE_BYTES = 50_000;
const DEFAULT_MAX_CYCLOMATIC_COMPLEXITY = 15;

const ALL_CHECKERS: CheckerName[] = [
  "naming",
  "complexity",
  "testPresence",
  "importHygiene",
  "documentation",
  "fileSize",
];

// ---------------------------------------------------------------------------
// Naming Conventions Checker
// ---------------------------------------------------------------------------

function checkNaming(filePath: string, _content: string, lines: string[]): QAIssue[] {
  const issues: QAIssue[] = [];
  const ext = extname(filePath);

  // File name: should be kebab-case or dot-notation for .test/.spec files
  const file = basename(filePath);
  const nameWithoutExt = file.replace(/\.(test|spec)\.(ts|js|tsx|jsx)$/, "").replace(/\.(ts|js|tsx|jsx)$/, "");
  if (nameWithoutExt !== nameWithoutExt.toLowerCase()) {
    issues.push({
      issue: "File name not lowercase/kebab-case",
      severity: "Minor",
      location: filePath,
      expected: "Lowercase kebab-case file name (e.g., my-module.ts)",
      actual: file,
      confidence: 0.9,
    });
  }

  if (ext === ".ts" || ext === ".js") {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Exported class names should be PascalCase
      const classMatch = line.match(/export\s+class\s+(\w+)/);
      if (classMatch) {
        const name = classMatch[1];
        if (name[0] !== name[0].toUpperCase() || name.includes("_")) {
          issues.push({
            issue: "Exported class not PascalCase",
            severity: "Minor",
            location: `${filePath}:${i + 1}`,
            expected: "PascalCase class name",
            actual: name,
            confidence: 0.95,
          });
        }
      }

      // Exported function names should be camelCase
      const funcMatch = line.match(/export\s+(?:async\s+)?function\s+(\w+)/);
      if (funcMatch) {
        const name = funcMatch[1];
        if (name[0] !== name[0].toLowerCase()) {
          issues.push({
            issue: "Exported function not camelCase",
            severity: "Minor",
            location: `${filePath}:${i + 1}`,
            expected: "camelCase function name",
            actual: name,
            confidence: 0.9,
          });
        }
      }

      // Exported constants: UPPER_SNAKE or camelCase are both acceptable
      // Only flag if it's PascalCase (likely a misnamed class/type)
      const constMatch = line.match(/export\s+const\s+(\w+)/);
      if (constMatch) {
        const name = constMatch[1];
        const isPascalCase = /^[A-Z][a-z]/.test(name) && !name.includes("_");
        if (isPascalCase) {
          issues.push({
            issue: "Exported const uses PascalCase (reserved for classes/types)",
            severity: "Info",
            location: `${filePath}:${i + 1}`,
            expected: "camelCase or UPPER_SNAKE_CASE for constants",
            actual: name,
            confidence: 0.7,
          });
        }
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Cyclomatic Complexity Checker
// ---------------------------------------------------------------------------

export function computeCyclomaticComplexity(functionBody: string): number {
  // Start at 1 for the function itself
  let complexity = 1;

  // Count decision points
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcase\s+/g,
    /\bcatch\s*\(/g,
    /\?\?/g,    // nullish coalescing
    /\?\./g,    // optional chaining (decision point)
    /&&/g,      // logical AND
    /\|\|/g,    // logical OR
    /\?[^.?]/g, // ternary (but not ?. or ??)
  ];

  for (const pattern of patterns) {
    const matches = functionBody.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  // Subtract double-counted else-if (counted once in if and once in else if)
  const elseIfCount = (functionBody.match(/\belse\s+if\s*\(/g) || []).length;
  complexity -= elseIfCount;

  return complexity;
}

interface FunctionSpan {
  name: string;
  startLine: number;
  body: string;
}

function extractFunctions(lines: string[]): FunctionSpan[] {
  const functions: FunctionSpan[] = [];
  const content = lines.join("\n");

  // Match function/method declarations and extract their bodies via brace counting
  const funcPattern = /(?:(?:export\s+)?(?:async\s+)?function\s+(\w+)|(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*\{)/g;
  let match: RegExpExecArray | null;

  while ((match = funcPattern.exec(content)) !== null) {
    const name = match[1] || match[2];
    // Skip common false positives
    if (["if", "for", "while", "switch", "catch"].includes(name)) continue;

    const braceStart = content.indexOf("{", match.index + match[0].length - 1);
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

    if (braceEnd === -1) continue;

    const body = content.slice(braceStart, braceEnd + 1);
    const startLine = content.slice(0, match.index).split("\n").length;

    functions.push({ name, startLine, body });
  }

  return functions;
}

function checkComplexity(
  filePath: string,
  _content: string,
  lines: string[],
  maxComplexity = DEFAULT_MAX_CYCLOMATIC_COMPLEXITY,
): QAIssue[] {
  const issues: QAIssue[] = [];
  const ext = extname(filePath);

  if (ext !== ".ts" && ext !== ".js") return issues;
  // Skip test files — test functions are naturally longer
  if (filePath.includes(".test.") || filePath.includes(".spec.")) return issues;

  const functions = extractFunctions(lines);

  for (const fn of functions) {
    const complexity = computeCyclomaticComplexity(fn.body);
    if (complexity > maxComplexity) {
      issues.push({
        issue: `Function '${fn.name}' has cyclomatic complexity ${complexity}`,
        severity: complexity > maxComplexity * 2 ? "Critical" : "Major",
        location: `${filePath}:${fn.startLine}`,
        expected: `Cyclomatic complexity ≤ ${maxComplexity}`,
        actual: `Complexity: ${complexity}`,
        confidence: 0.85,
      });
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Test Presence Checker
// ---------------------------------------------------------------------------

function checkTestPresence(filePath: string, _content: string, _lines: string[]): QAIssue[] {
  const issues: QAIssue[] = [];
  const ext = extname(filePath);

  if (ext !== ".ts" && ext !== ".js") return issues;
  // Skip if this IS a test file
  if (filePath.includes(".test.") || filePath.includes(".spec.")) return issues;
  // Skip type-only files, config files, index files
  const file = basename(filePath);
  if (file === "index.ts" || file === "index.js" || file.endsWith(".d.ts")) return issues;

  const dir = dirname(filePath);
  const nameWithoutExt = file.replace(/\.(ts|js)$/, "");

  const testVariants = [
    join(dir, `${nameWithoutExt}.test.ts`),
    join(dir, `${nameWithoutExt}.test.js`),
    join(dir, `${nameWithoutExt}.spec.ts`),
    join(dir, `${nameWithoutExt}.spec.js`),
    join(dir, "__tests__", `${nameWithoutExt}.test.ts`),
    join(dir, "__tests__", `${nameWithoutExt}.test.js`),
  ];

  const hasTest = testVariants.some((p) => existsSync(p));

  if (!hasTest) {
    issues.push({
      issue: "No corresponding test file found",
      severity: "Major",
      location: filePath,
      expected: `Test file at ${nameWithoutExt}.test.ts or similar`,
      actual: "No test file found",
      confidence: 0.8,
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Import Hygiene Checker
// ---------------------------------------------------------------------------

function checkImportHygiene(filePath: string, _content: string, lines: string[]): QAIssue[] {
  const issues: QAIssue[] = [];
  const ext = extname(filePath);

  if (ext !== ".ts" && ext !== ".js") return issues;

  let lastImportLine = -1;
  let hasNonImportBeforeImport = false;
  const importedNames = new Map<string, number>(); // name -> line number

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (line === "" || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) {
      continue;
    }

    const isImport = line.startsWith("import ");
    if (isImport) {
      if (hasNonImportBeforeImport && lastImportLine !== -1) {
        issues.push({
          issue: "Import statement after non-import code",
          severity: "Minor",
          location: `${filePath}:${i + 1}`,
          expected: "All imports grouped at top of file",
          actual: "Import found after non-import statement",
          confidence: 0.9,
        });
      }
      lastImportLine = i;

      // Check for duplicate imports
      const nameMatch = line.match(/import\s+(?:type\s+)?(?:\{[^}]*\}\s+from\s+|(\w+)\s+from\s+)?["']([^"']+)["']/);
      if (nameMatch) {
        const source = nameMatch[2];
        if (importedNames.has(source)) {
          issues.push({
            issue: `Duplicate import from '${source}'`,
            severity: "Minor",
            location: `${filePath}:${i + 1}`,
            expected: "Single import per module (merge named imports)",
            actual: `Also imported at line ${importedNames.get(source)! + 1}`,
            confidence: 0.95,
          });
        } else {
          importedNames.set(source, i);
        }
      }

      // Check for wildcard imports
      if (/import\s+\*\s+as/.test(line)) {
        issues.push({
          issue: "Wildcard import detected",
          severity: "Info",
          location: `${filePath}:${i + 1}`,
          expected: "Named imports for better tree-shaking",
          actual: line,
          confidence: 0.7,
        });
      }
    } else if (lastImportLine === -1 || i > lastImportLine) {
      if (!isImport && line !== "") {
        hasNonImportBeforeImport = true;
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Documentation Presence Checker
// ---------------------------------------------------------------------------

function checkDocumentation(filePath: string, _content: string, lines: string[]): QAIssue[] {
  const issues: QAIssue[] = [];
  const ext = extname(filePath);

  if (ext !== ".ts" && ext !== ".js") return issues;
  if (filePath.includes(".test.") || filePath.includes(".spec.")) return issues;

  // Check for module-level documentation (JSDoc comment or header comment in first 10 lines)
  const headerLines = lines.slice(0, 10).join("\n");
  const hasModuleDoc = /\/\*\*[\s\S]*?\*\//.test(headerLines) || /^\/\//.test(headerLines.trim());

  if (!hasModuleDoc) {
    issues.push({
      issue: "No module-level documentation",
      severity: "Minor",
      location: `${filePath}:1`,
      expected: "JSDoc or header comment describing module purpose",
      actual: "No documentation in first 10 lines",
      confidence: 0.8,
    });
  }

  // Check exported classes/interfaces have documentation
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/export\s+(class|interface|enum)\s+\w+/.test(line)) {
      // Check if preceded by a comment (within 3 lines above)
      const hasDoc =
        (i > 0 &&
          (lines[i - 1].trim().startsWith("*/") ||
            lines[i - 1].trim().startsWith("//") ||
            lines[i - 1].trim().startsWith("/**"))) ||
        (i > 1 &&
          (lines[i - 2].trim().startsWith("*/") ||
            lines[i - 2].trim().startsWith("/**"))) ||
        (i > 2 && lines[i - 3].trim().startsWith("*/"));

      if (!hasDoc) {
        const match = line.match(/export\s+(?:class|interface|enum)\s+(\w+)/);
        issues.push({
          issue: `Exported ${match ? match[0].replace("export ", "") : "declaration"} lacks documentation`,
          severity: "Info",
          location: `${filePath}:${i + 1}`,
          expected: "JSDoc or comment above exported declarations",
          actual: `No documentation for '${match?.[1] ?? "unknown"}'`,
          confidence: 0.75,
        });
      }
    }
  }

  return issues;
}

// ---------------------------------------------------------------------------
// File Size Checker
// ---------------------------------------------------------------------------

function checkFileSize(
  filePath: string,
  _content: string,
  lines: string[],
  maxLines = DEFAULT_MAX_FILE_LINES,
  maxBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
): QAIssue[] {
  const issues: QAIssue[] = [];

  if (lines.length > maxLines) {
    issues.push({
      issue: `File exceeds ${maxLines} line limit`,
      severity: lines.length > maxLines * 2 ? "Critical" : "Major",
      location: filePath,
      expected: `≤ ${maxLines} lines`,
      actual: `${lines.length} lines`,
      confidence: 0.95,
    });
  }

  try {
    const stat = statSync(filePath);
    if (stat.size > maxBytes) {
      issues.push({
        issue: `File exceeds ${maxBytes} byte limit`,
        severity: stat.size > maxBytes * 2 ? "Critical" : "Major",
        location: filePath,
        expected: `≤ ${maxBytes} bytes`,
        actual: `${stat.size} bytes`,
        confidence: 0.95,
      });
    }
  } catch {
    // File may not exist on disk (e.g., in-memory review)
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Code Review Engine
// ---------------------------------------------------------------------------

export class CodeReviewEngine {
  private readonly options: Required<ReviewOptions>;

  constructor(options: ReviewOptions = {}) {
    this.options = {
      maxFileLines: options.maxFileLines ?? DEFAULT_MAX_FILE_LINES,
      maxFileSizeBytes: options.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES,
      maxCyclomaticComplexity: options.maxCyclomaticComplexity ?? DEFAULT_MAX_CYCLOMATIC_COMPLEXITY,
      checkers: options.checkers ?? ALL_CHECKERS,
    };
  }

  private getChecker(name: CheckerName): Checker {
    switch (name) {
      case "naming":
        return checkNaming;
      case "complexity":
        return (fp, c, l) => checkComplexity(fp, c, l, this.options.maxCyclomaticComplexity);
      case "testPresence":
        return checkTestPresence;
      case "importHygiene":
        return checkImportHygiene;
      case "documentation":
        return checkDocumentation;
      case "fileSize":
        return (fp, c, l) =>
          checkFileSize(fp, c, l, this.options.maxFileLines, this.options.maxFileSizeBytes);
    }
  }

  /**
   * Review a single file, returning all issues found.
   */
  reviewFile(filePath: string, content?: string): QAIssue[] {
    const fileContent = content ?? readFileSync(filePath, "utf-8");
    const lines = fileContent.split("\n");
    const issues: QAIssue[] = [];

    for (const checkerName of this.options.checkers) {
      const checker = this.getChecker(checkerName);
      issues.push(...checker(filePath, fileContent, lines));
    }

    return issues;
  }

  /**
   * Review multiple files and produce a structured report.
   */
  reviewFiles(filePaths: string[]): ReviewReport {
    const start = performance.now();
    const allIssues: QAIssue[] = [];

    for (const filePath of filePaths) {
      try {
        allIssues.push(...this.reviewFile(filePath));
      } catch (err) {
        allIssues.push({
          issue: `Failed to read file: ${err instanceof Error ? err.message : String(err)}`,
          severity: "Info",
          location: filePath,
          expected: "Readable file",
          actual: "Read error",
          confidence: 1.0,
        });
      }
    }

    const durationMs = Math.round(performance.now() - start);

    const byseverity: Record<Severity, number> = {
      Blocker: 0,
      Critical: 0,
      Major: 0,
      Minor: 0,
      Info: 0,
    };
    for (const issue of allIssues) {
      byseverity[issue.severity]++;
    }

    // Pass rate: files with zero Blocker/Critical issues
    const filesWithBlockers = new Set<string>();
    for (const issue of allIssues) {
      if (issue.severity === "Blocker" || issue.severity === "Critical") {
        // Extract file path from location (may include :line)
        filesWithBlockers.add(issue.location.split(":")[0]);
      }
    }
    const passRate = filePaths.length === 0 ? 1 : (filePaths.length - filesWithBlockers.size) / filePaths.length;

    return {
      timestamp: new Date().toISOString(),
      files: filePaths,
      issues: allIssues,
      summary: {
        totalFiles: filePaths.length,
        totalIssues: allIssues.length,
        byseverity,
        passRate,
      },
      durationMs,
    };
  }

  /**
   * Discover TypeScript/JavaScript files in a directory (non-recursive by default).
   */
  static discoverFiles(dir: string, recursive = true): string[] {
    const files: string[] = [];
    const extensions = new Set([".ts", ".js", ".tsx", ".jsx"]);

    function walk(currentDir: string): void {
      let entries: string[];
      try {
        entries = readdirSync(currentDir);
      } catch {
        return;
      }

      for (const entry of entries) {
        const fullPath = join(currentDir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            if (recursive && entry !== "node_modules" && entry !== "dist" && entry !== ".git") {
              walk(fullPath);
            }
          } else if (extensions.has(extname(entry))) {
            files.push(fullPath);
          }
        } catch {
          // Skip inaccessible entries
        }
      }
    }

    walk(dir);
    return files.sort();
  }

  /**
   * Format a report as human-readable text.
   */
  static formatReport(report: ReviewReport): string {
    const lines: string[] = [];

    lines.push("═══════════════════════════════════════════════════════");
    lines.push("  QA CODE REVIEW REPORT");
    lines.push(`  ${report.timestamp}`);
    lines.push("═══════════════════════════════════════════════════════");
    lines.push("");
    lines.push(`Files reviewed: ${report.summary.totalFiles}`);
    lines.push(`Issues found:   ${report.summary.totalIssues}`);
    lines.push(`Pass rate:      ${(report.summary.passRate * 100).toFixed(1)}%`);
    lines.push(`Duration:       ${report.durationMs}ms`);
    lines.push("");

    const { byseverity } = report.summary;
    lines.push("By severity:");
    for (const sev of ["Blocker", "Critical", "Major", "Minor", "Info"] as Severity[]) {
      if (byseverity[sev] > 0) {
        lines.push(`  ${sev}: ${byseverity[sev]}`);
      }
    }
    lines.push("");

    if (report.issues.length > 0) {
      lines.push("───────────────────────────────────────────────────────");
      lines.push("  ISSUES");
      lines.push("───────────────────────────────────────────────────────");

      for (const issue of report.issues) {
        lines.push("");
        lines.push(`[${issue.severity}] ${issue.issue}`);
        lines.push(`  Location:   ${issue.location}`);
        lines.push(`  Expected:   ${issue.expected}`);
        lines.push(`  Actual:     ${issue.actual}`);
        lines.push(`  Confidence: ${(issue.confidence * 100).toFixed(0)}%`);
      }
    } else {
      lines.push("No issues found. ✓");
    }

    lines.push("");
    lines.push("═══════════════════════════════════════════════════════");
    return lines.join("\n");
  }

  /**
   * Format a report as JSON (for CI/pipeline consumption).
   */
  static formatReportJSON(report: ReviewReport): string {
    return JSON.stringify(report, null, 2);
  }
}
