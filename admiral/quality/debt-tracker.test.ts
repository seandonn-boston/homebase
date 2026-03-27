/**
 * Tests for debt-tracker (QA-06)
 *
 * Happy path + unhappy path tests for technical debt scanning.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DebtTracker, type DebtReport, type DebtItem } from "./debt-tracker";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(tmpdir(), `qa06-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function cleanup(dir: string): void {
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("DebtTracker construction", () => {
  it("creates tracker with default options", () => {
    const tracker = new DebtTracker({ rootDir: "." });
    assert.ok(tracker);
  });

  it("accepts custom options", () => {
    const tracker = new DebtTracker({
      rootDir: ".",
      complexityThreshold: 10,
      exclude: ["node_modules", "vendor"],
    });
    assert.ok(tracker);
  });
});

// ---------------------------------------------------------------------------
// Comment markers scanning
// ---------------------------------------------------------------------------

describe("scan — comment markers", () => {
  it("detects TODO comments", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "app.ts"), '// TODO: implement this\nexport function app(): void {}\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const todoItems = report.items.filter((i) => i.source === "comment-markers" && i.description.includes("TODO"));
      assert.ok(todoItems.length > 0);
    } finally {
      cleanup(dir);
    }
  });

  it("detects FIXME comments", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "broken.ts"), '// FIXME: critical bug\nexport function broken(): void {}\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const fixmeItems = report.items.filter((i) => i.description.includes("FIXME"));
      assert.ok(fixmeItems.length > 0);
      assert.equal(fixmeItems[0].risk, "high");
    } finally {
      cleanup(dir);
    }
  });

  it("detects HACK comments", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "hack.ts"), '// HACK: workaround for issue\nexport function hack(): void {}\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const hackItems = report.items.filter((i) => i.description.includes("HACK"));
      assert.ok(hackItems.length > 0);
      assert.equal(hackItems[0].risk, "high");
    } finally {
      cleanup(dir);
    }
  });

  it("counts only one marker per line", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "multi.ts"), '// TODO: FIXME this HACK\nexport function x(): void {}\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const markerItems = report.items.filter((i) => i.source === "comment-markers");
      assert.equal(markerItems.length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it("handles file with no markers", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "clean.ts"), 'export function clean(): void { return; }\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const markerItems = report.items.filter((i) => i.source === "comment-markers");
      assert.equal(markerItems.length, 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// High complexity scanning
// ---------------------------------------------------------------------------

describe("scan — high complexity", () => {
  it("detects high-complexity functions", () => {
    const dir = makeTmpDir();
    try {
      // Generate a complex function
      const complexFn = `export function complexFn(x: number): string {
  if (x > 100) {
    if (x > 200) {
      if (x > 300) {
        if (x > 400) {
          for (let i = 0; i < x; i++) {
            if (i % 2 === 0) {
              while (i > 0) {
                switch (i) {
                  case 1: return "a";
                  case 2: return "b";
                  case 3: return "c";
                  case 4: return "d";
                  case 5: return "e";
                  default: return "f";
                }
              }
            }
          }
        }
      }
    }
  }
  return x > 50 ? "big" : x > 25 ? "med" : "small";
}\n`;
      writeFileSync(join(dir, "complex.ts"), complexFn);
      const tracker = new DebtTracker({ rootDir: dir, complexityThreshold: 5 });
      const report = tracker.scan();
      const complexItems = report.items.filter((i) => i.source === "high-complexity");
      assert.ok(complexItems.length > 0);
    } finally {
      cleanup(dir);
    }
  });

  it("ignores test files for complexity", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "comp.test.ts"), 'export function bigTest(x: number): string { if (x>1) { if (x>2) { if (x>3) { if (x>4) { if (x>5) { if (x>6) { if (x>7) { if (x>8) { if (x>9) { return "deep"; } } } } } } } } } return ""; }\n');
      const tracker = new DebtTracker({ rootDir: dir, complexityThreshold: 3 });
      const report = tracker.scan();
      const complexItems = report.items.filter((i) => i.source === "high-complexity");
      assert.equal(complexItems.length, 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Skipped tests scanning
// ---------------------------------------------------------------------------

describe("scan — skipped tests", () => {
  it("detects it.skip", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "app.test.ts"), 'import { it } from "node:test";\nit.skip("broken test", () => {});\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const skipItems = report.items.filter((i) => i.source === "skipped-tests");
      assert.ok(skipItems.length > 0);
    } finally {
      cleanup(dir);
    }
  });

  it("detects describe.skip", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "suite.test.ts"), 'import { describe } from "node:test";\ndescribe.skip("broken suite", () => {});\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const skipItems = report.items.filter((i) => i.source === "skipped-tests");
      assert.ok(skipItems.length > 0);
    } finally {
      cleanup(dir);
    }
  });

  it("detects it.todo", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "future.test.ts"), 'import { it } from "node:test";\nit.todo("implement later");\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const todoItems = report.items.filter((i) => i.source === "skipped-tests" && i.description.includes("Todo"));
      assert.ok(todoItems.length > 0);
      assert.equal(todoItems[0].risk, "low");
    } finally {
      cleanup(dir);
    }
  });

  it("ignores non-test files", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "app.ts"), 'const skip = it.skip; // not a real test skip\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const skipItems = report.items.filter((i) => i.source === "skipped-tests");
      assert.equal(skipItems.length, 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Code duplication scanning
// ---------------------------------------------------------------------------

describe("scan — code duplication", () => {
  it("detects duplicated blocks across files", () => {
    const dir = makeTmpDir();
    try {
      const duplicateBlock = 'const result = processData(input);\nconst filtered = result.filter(x => x.valid);\nconst sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));\nconst mapped = sorted.map(x => x.value);\nreturn mapped.join(", ");\n';
      writeFileSync(join(dir, "a.ts"), `export function a(input: any) {\n${duplicateBlock}}\n`);
      writeFileSync(join(dir, "b.ts"), `export function b(input: any) {\n${duplicateBlock}}\n`);

      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const dupItems = report.items.filter((i) => i.source === "code-duplication");
      assert.ok(dupItems.length > 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Summary and sorting
// ---------------------------------------------------------------------------

describe("scan — summary", () => {
  it("computes correct debt ratio", () => {
    const dir = makeTmpDir();
    try {
      // 10-line file with 2 TODOs
      writeFileSync(join(dir, "app.ts"), '// TODO: a\n// TODO: b\nline3\nline4\nline5\nline6\nline7\nline8\nline9\nline10\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();

      assert.ok(report.summary.debtRatio > 0);
      assert.ok(report.summary.totalSourceLines > 0);
    } finally {
      cleanup(dir);
    }
  });

  it("items are sorted by priority (highest first)", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "mixed.ts"), '// TODO: low priority\n// FIXME: high priority\nexport function x(): void {}\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();

      if (report.items.length >= 2) {
        assert.ok(report.items[0].priority >= report.items[1].priority);
      }
    } finally {
      cleanup(dir);
    }
  });

  it("summary counts by source correctly", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "markers.ts"), '// TODO: a\n// FIXME: b\nexport function x(): void {}\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();

      assert.equal(report.summary.bySource["comment-markers"], 2);
    } finally {
      cleanup(dir);
    }
  });

  it("summary counts by effort correctly", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "effort.ts"), '// TODO: small\n// HACK: medium\nexport function x(): void {}\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();

      assert.ok(report.summary.byEffort.S >= 1);
      assert.ok(report.summary.byEffort.M >= 1);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Empty directory
// ---------------------------------------------------------------------------

describe("scan — empty directory", () => {
  it("handles empty directory gracefully", () => {
    const dir = makeTmpDir();
    try {
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      assert.equal(report.items.length, 0);
      assert.equal(report.summary.totalItems, 0);
      assert.equal(report.summary.debtRatio, 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("Formatters", () => {
  it("formatReport produces readable text", () => {
    const report: DebtReport = {
      timestamp: "2026-03-27T00:00:00Z",
      rootDir: "/test",
      items: [
        { source: "comment-markers", location: "app.ts:5", description: "TODO: fix this", effort: "S", risk: "medium", priority: 50 },
      ],
      summary: {
        totalItems: 1,
        bySource: { "comment-markers": 1, "high-complexity": 0, "skipped-tests": 0, "outdated-deps": 0, "code-duplication": 0 },
        byEffort: { S: 1, M: 0, L: 0 },
        byRisk: { high: 0, medium: 1, low: 0 },
        debtRatio: 2.5,
        totalSourceLines: 400,
      },
    };

    const text = DebtTracker.formatReport(report);
    assert.ok(text.includes("TECHNICAL DEBT REPORT"));
    assert.ok(text.includes("TODO: fix this"));
    assert.ok(text.includes("2.5"));
  });

  it("formatReportJSON produces valid JSON", () => {
    const report: DebtReport = {
      timestamp: "2026-03-27T00:00:00Z",
      rootDir: "/test",
      items: [],
      summary: {
        totalItems: 0,
        bySource: { "comment-markers": 0, "high-complexity": 0, "skipped-tests": 0, "outdated-deps": 0, "code-duplication": 0 },
        byEffort: { S: 0, M: 0, L: 0 },
        byRisk: { high: 0, medium: 0, low: 0 },
        debtRatio: 0,
        totalSourceLines: 0,
      },
    };

    const json = DebtTracker.formatReportJSON(report);
    const parsed = JSON.parse(json);
    assert.equal(parsed.summary.totalItems, 0);
  });
});

// ---------------------------------------------------------------------------
// Exclude patterns
// ---------------------------------------------------------------------------

describe("Exclude patterns", () => {
  it("excludes node_modules by default", () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, "node_modules"), { recursive: true });
      writeFileSync(join(dir, "node_modules", "dep.ts"), '// TODO: in dep\n');
      writeFileSync(join(dir, "app.ts"), 'export function x(): void {}\n');
      const tracker = new DebtTracker({ rootDir: dir });
      const report = tracker.scan();
      const depItems = report.items.filter((i) => i.location.includes("node_modules"));
      assert.equal(depItems.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  it("respects custom exclude list", () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, "vendor"), { recursive: true });
      writeFileSync(join(dir, "vendor", "lib.ts"), '// TODO: vendor todo\n');
      const tracker = new DebtTracker({ rootDir: dir, exclude: ["vendor"] });
      const report = tracker.scan();
      const vendorItems = report.items.filter((i) => i.location.includes("vendor"));
      assert.equal(vendorItems.length, 0);
    } finally {
      cleanup(dir);
    }
  });
});
