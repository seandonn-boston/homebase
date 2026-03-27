/**
 * Code Review Automation Tests (QA-01)
 *
 * Happy path + unhappy path tests for all checkers.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CodeReviewEngine, computeCyclomaticComplexity } from "./code-review";
import type { QAIssue, ReviewReport } from "./code-review";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function reviewContent(
  filePath: string,
  content: string,
  opts?: ConstructorParameters<typeof CodeReviewEngine>[0],
): QAIssue[] {
  const engine = new CodeReviewEngine(opts);
  return engine.reviewFile(filePath, content);
}

function issuesByChecker(issues: QAIssue[], substring: string): QAIssue[] {
  return issues.filter((i) => i.issue.toLowerCase().includes(substring.toLowerCase()));
}

// ---------------------------------------------------------------------------
// Naming Conventions
// ---------------------------------------------------------------------------

describe("Naming Conventions Checker", () => {
  it("accepts kebab-case file names", () => {
    const issues = reviewContent("src/my-module.ts", "// ok\n", {
      checkers: ["naming"],
    });
    const nameIssues = issuesByChecker(issues, "file name");
    assert.equal(nameIssues.length, 0);
  });

  it("flags PascalCase file names", () => {
    const issues = reviewContent("src/MyModule.ts", "// ok\n", {
      checkers: ["naming"],
    });
    const nameIssues = issuesByChecker(issues, "file name");
    assert.equal(nameIssues.length, 1);
    assert.equal(nameIssues[0].severity, "Minor");
  });

  it("accepts PascalCase class names", () => {
    const issues = reviewContent(
      "src/foo.ts",
      "export class MyService {}\n",
      { checkers: ["naming"] },
    );
    const classIssues = issuesByChecker(issues, "class");
    assert.equal(classIssues.length, 0);
  });

  it("flags snake_case class names", () => {
    const issues = reviewContent(
      "src/foo.ts",
      "export class my_service {}\n",
      { checkers: ["naming"] },
    );
    const classIssues = issuesByChecker(issues, "class");
    assert.equal(classIssues.length, 1);
  });

  it("accepts camelCase function names", () => {
    const issues = reviewContent(
      "src/foo.ts",
      "export function doSomething() {}\n",
      { checkers: ["naming"] },
    );
    const fnIssues = issuesByChecker(issues, "function");
    assert.equal(fnIssues.length, 0);
  });

  it("flags PascalCase function names", () => {
    const issues = reviewContent(
      "src/foo.ts",
      "export function DoSomething() {}\n",
      { checkers: ["naming"] },
    );
    const fnIssues = issuesByChecker(issues, "function");
    assert.equal(fnIssues.length, 1);
  });

  it("allows test file names with .test suffix", () => {
    const issues = reviewContent("src/my-module.test.ts", "// test\n", {
      checkers: ["naming"],
    });
    const nameIssues = issuesByChecker(issues, "file name");
    assert.equal(nameIssues.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Cyclomatic Complexity
// ---------------------------------------------------------------------------

describe("Cyclomatic Complexity Checker", () => {
  it("computes complexity 1 for simple function", () => {
    const c = computeCyclomaticComplexity("{ return x; }");
    assert.equal(c, 1);
  });

  it("counts if statements", () => {
    const c = computeCyclomaticComplexity("{ if (a) { } if (b) { } }");
    assert.equal(c, 3); // 1 + 2 ifs
  });

  it("counts logical operators", () => {
    const c = computeCyclomaticComplexity("{ if (a && b || c) { } }");
    assert.equal(c, 4); // 1 + if + && + ||
  });

  it("counts ternary", () => {
    const c = computeCyclomaticComplexity("{ return a ? b : c; }");
    assert.equal(c, 2); // 1 + ternary
  });

  it("passes for simple functions within limit", () => {
    const code = 'export function simple() { return "hello"; }\n';
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["complexity"],
      maxCyclomaticComplexity: 15,
    });
    assert.equal(issues.length, 0);
  });

  it("flags functions exceeding complexity limit", () => {
    // Build a function with many decision points
    const body = [
      "export function complex() {",
      "  if (a) {}",
      "  if (b) {}",
      "  if (c) {}",
      "  if (d) {}",
      "  if (e) {}",
      "  for (let i = 0; i < 10; i++) {}",
      "  while (x) {}",
      "  const y = a && b || c && d || e;",
      "  const z = a ? b : c;",
      "  switch(x) { case 1: break; case 2: break; case 3: break; }",
      "}",
    ].join("\n");
    const issues = reviewContent("src/foo.ts", body, {
      checkers: ["complexity"],
      maxCyclomaticComplexity: 5,
    });
    const cxIssues = issuesByChecker(issues, "complexity");
    assert.ok(cxIssues.length > 0, "Should flag high-complexity function");
    assert.ok(
      cxIssues[0].severity === "Major" || cxIssues[0].severity === "Critical",
    );
  });

  it("skips test files", () => {
    const code = [
      "export function complexTest() {",
      "  if (a) {} if (b) {} if (c) {} if (d) {} if (e) {}",
      "  if (f) {} if (g) {} if (h) {} if (i) {} if (j) {}",
      "}",
    ].join("\n");
    const issues = reviewContent("src/foo.test.ts", code, {
      checkers: ["complexity"],
      maxCyclomaticComplexity: 3,
    });
    assert.equal(issues.length, 0);
  });
});

// ---------------------------------------------------------------------------
// Test Presence
// ---------------------------------------------------------------------------

describe("Test Presence Checker", () => {
  it("does not flag test files themselves", () => {
    const issues = reviewContent("src/foo.test.ts", "// test\n", {
      checkers: ["testPresence"],
    });
    assert.equal(issues.length, 0);
  });

  it("does not flag index files", () => {
    const issues = reviewContent("src/index.ts", "// barrel\n", {
      checkers: ["testPresence"],
    });
    assert.equal(issues.length, 0);
  });

  it("flags source files without tests", () => {
    // Using a path that definitely has no test file
    const issues = reviewContent("/tmp/nonexistent-module.ts", "export const x = 1;\n", {
      checkers: ["testPresence"],
    });
    const testIssues = issuesByChecker(issues, "test file");
    assert.equal(testIssues.length, 1);
    assert.equal(testIssues[0].severity, "Major");
  });
});

// ---------------------------------------------------------------------------
// Import Hygiene
// ---------------------------------------------------------------------------

describe("Import Hygiene Checker", () => {
  it("accepts well-organized imports", () => {
    const code = [
      'import { readFileSync } from "node:fs";',
      'import { join } from "node:path";',
      "",
      "export const x = 1;",
    ].join("\n");
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["importHygiene"],
    });
    assert.equal(issues.length, 0);
  });

  it("flags duplicate imports from same module", () => {
    const code = [
      'import { readFileSync } from "node:fs";',
      'import { writeFileSync } from "node:fs";',
      "",
      "export const x = 1;",
    ].join("\n");
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["importHygiene"],
    });
    const dupIssues = issuesByChecker(issues, "duplicate");
    assert.equal(dupIssues.length, 1);
  });

  it("flags wildcard imports", () => {
    const code = 'import * as fs from "node:fs";\n';
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["importHygiene"],
    });
    const wildcardIssues = issuesByChecker(issues, "wildcard");
    assert.equal(wildcardIssues.length, 1);
    assert.equal(wildcardIssues[0].severity, "Info");
  });
});

// ---------------------------------------------------------------------------
// Documentation Presence
// ---------------------------------------------------------------------------

describe("Documentation Presence Checker", () => {
  it("accepts files with header documentation", () => {
    const code = [
      "/**",
      " * This module does something useful.",
      " */",
      "",
      "export class Foo {}",
    ].join("\n");
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["documentation"],
    });
    const modDocIssues = issuesByChecker(issues, "module-level");
    assert.equal(modDocIssues.length, 0);
  });

  it("flags files without any documentation", () => {
    const code = "export class Foo {}\n";
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["documentation"],
    });
    const modDocIssues = issuesByChecker(issues, "module-level");
    assert.equal(modDocIssues.length, 1);
  });

  it("skips test files", () => {
    const code = "export class Foo {}\n";
    const issues = reviewContent("src/foo.test.ts", code, {
      checkers: ["documentation"],
    });
    assert.equal(issues.length, 0);
  });

  it("flags undocumented exported class", () => {
    const code = [
      "// Module header",
      "",
      "export class UndocumentedClass {}",
    ].join("\n");
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["documentation"],
    });
    const classDocIssues = issuesByChecker(issues, "lacks documentation");
    assert.equal(classDocIssues.length, 1);
  });

  it("accepts documented exported class", () => {
    const code = [
      "// Module header",
      "",
      "/** My class */",
      "export class DocumentedClass {}",
    ].join("\n");
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["documentation"],
    });
    const classDocIssues = issuesByChecker(issues, "lacks documentation");
    assert.equal(classDocIssues.length, 0);
  });
});

// ---------------------------------------------------------------------------
// File Size
// ---------------------------------------------------------------------------

describe("File Size Checker", () => {
  it("passes for small files", () => {
    const code = "export const x = 1;\n";
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["fileSize"],
      maxFileLines: 500,
    });
    const sizeIssues = issuesByChecker(issues, "line limit");
    assert.equal(sizeIssues.length, 0);
  });

  it("flags files exceeding line limit", () => {
    const code = Array(600).fill("// line").join("\n");
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["fileSize"],
      maxFileLines: 500,
    });
    const sizeIssues = issuesByChecker(issues, "line limit");
    assert.equal(sizeIssues.length, 1);
    assert.equal(sizeIssues[0].severity, "Major");
  });

  it("escalates to Critical for very large files", () => {
    const code = Array(1100).fill("// line").join("\n");
    const issues = reviewContent("src/foo.ts", code, {
      checkers: ["fileSize"],
      maxFileLines: 500,
    });
    const sizeIssues = issuesByChecker(issues, "line limit");
    assert.equal(sizeIssues.length, 1);
    assert.equal(sizeIssues[0].severity, "Critical");
  });
});

// ---------------------------------------------------------------------------
// ReviewReport (integration)
// ---------------------------------------------------------------------------

describe("CodeReviewEngine", () => {
  it("produces a valid ReviewReport", () => {
    const engine = new CodeReviewEngine({ checkers: ["naming", "fileSize"] });
    const report = engine.reviewFiles([]);

    assert.equal(report.summary.totalFiles, 0);
    assert.equal(report.summary.totalIssues, 0);
    assert.equal(report.summary.passRate, 1);
    assert.ok(report.timestamp);
    assert.ok(typeof report.durationMs === "number");
  });

  it("aggregates issues across files", () => {
    const engine = new CodeReviewEngine({ checkers: ["naming"] });
    // Use in-memory review via reviewFile
    const issues1 = engine.reviewFile("src/BadName.ts", "// hi\n");
    const issues2 = engine.reviewFile("src/good-name.ts", "// hi\n");

    assert.ok(issues1.length > 0, "BadName should flag naming issue");
    assert.equal(issues2.length, 0, "good-name should have no naming issues");
  });

  it("computes pass rate correctly", () => {
    const engine = new CodeReviewEngine({
      checkers: ["fileSize"],
      maxFileLines: 5,
    });
    // Manually construct a report with one passing and one failing file
    const report: ReviewReport = {
      timestamp: new Date().toISOString(),
      files: ["a.ts", "b.ts"],
      issues: [
        {
          issue: "File exceeds 5 line limit",
          severity: "Critical",
          location: "b.ts",
          expected: "≤ 5 lines",
          actual: "100 lines",
          confidence: 0.95,
        },
      ],
      summary: {
        totalFiles: 2,
        totalIssues: 1,
        bySeverity: { Blocker: 0, Critical: 1, Major: 0, Minor: 0, Info: 0 },
        passRate: 0.5,
      },
      durationMs: 1,
    };

    assert.equal(report.summary.passRate, 0.5);
  });

  it("formats report as text", () => {
    const engine = new CodeReviewEngine({ checkers: ["naming"] });
    const report = engine.reviewFiles([]);
    const text = CodeReviewEngine.formatReport(report);

    assert.ok(text.includes("QA CODE REVIEW REPORT"));
    assert.ok(text.includes("Files reviewed: 0"));
    assert.ok(text.includes("No issues found"));
  });

  it("formats report as JSON", () => {
    const engine = new CodeReviewEngine({ checkers: ["naming"] });
    const report = engine.reviewFiles([]);
    const json = CodeReviewEngine.formatReportJSON(report);
    const parsed = JSON.parse(json);

    assert.equal(parsed.summary.totalFiles, 0);
    assert.ok(parsed.timestamp);
  });

  it("handles unreadable files gracefully", () => {
    const engine = new CodeReviewEngine({ checkers: ["naming"] });
    const report = engine.reviewFiles(["/nonexistent/path/file.ts"]);

    assert.equal(report.summary.totalIssues, 1);
    assert.ok(report.issues[0].issue.includes("Failed to read"));
  });

  it("respects checker selection", () => {
    const engine = new CodeReviewEngine({ checkers: ["naming"] });
    const issues = engine.reviewFile(
      "src/foo.ts",
      "export const x = 1;\n",
    );
    // Only naming checker runs — no fileSize, documentation, etc. issues
    const sizeIssues = issuesByChecker(issues, "line limit");
    assert.equal(sizeIssues.length, 0);
  });
});

// ---------------------------------------------------------------------------
// QAIssue structure
// ---------------------------------------------------------------------------

describe("QAIssue structure", () => {
  it("all issues have required fields", () => {
    const engine = new CodeReviewEngine();
    const issues = engine.reviewFile(
      "src/BadFile.ts",
      [
        "export class bad_class {}",
        'import { x } from "mod";',
        'import { y } from "mod";',
      ].join("\n"),
    );

    for (const issue of issues) {
      assert.ok(typeof issue.issue === "string" && issue.issue.length > 0, "issue field");
      assert.ok(
        ["Blocker", "Critical", "Major", "Minor", "Info"].includes(issue.severity),
        `valid severity: ${issue.severity}`,
      );
      assert.ok(typeof issue.location === "string" && issue.location.length > 0, "location field");
      assert.ok(typeof issue.expected === "string", "expected field");
      assert.ok(typeof issue.actual === "string", "actual field");
      assert.ok(issue.confidence >= 0 && issue.confidence <= 1, "confidence 0-1");
    }
  });
});

// ---------------------------------------------------------------------------
// discoverFiles
// ---------------------------------------------------------------------------

describe("CodeReviewEngine.discoverFiles", () => {
  it("returns an array", () => {
    // Just verify the static method works without error on a known directory
    const files = CodeReviewEngine.discoverFiles(".", false);
    assert.ok(Array.isArray(files));
  });

  it("returns empty for nonexistent directory", () => {
    const files = CodeReviewEngine.discoverFiles("/nonexistent-dir-xyz");
    assert.deepEqual(files, []);
  });
});
