/**
 * Tests for quality-metrics (QA-04)
 *
 * Happy path + unhappy path tests for metrics collection.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MetricsCollector, type MetricsSnapshot, type ModuleMetrics } from "./quality-metrics";
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(tmpdir(), `qa04-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
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

function writeModule(dir: string, name: string, content: string, testContent?: string): void {
  writeFileSync(join(dir, `${name}.ts`), content);
  if (testContent) {
    writeFileSync(join(dir, `${name}.test.ts`), testContent);
  }
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

describe("MetricsCollector construction", () => {
  it("creates collector with default options", () => {
    const collector = new MetricsCollector({ rootDir: "." });
    assert.ok(collector);
  });

  it("accepts custom options", () => {
    const collector = new MetricsCollector({
      rootDir: ".",
      historyPath: "/tmp/history.json",
      maxHistorySnapshots: 50,
      complexityThreshold: 10,
    });
    assert.ok(collector);
  });
});

// ---------------------------------------------------------------------------
// Single module collection
// ---------------------------------------------------------------------------

describe("collectModule", () => {
  it("collects metrics for a module with a test file", () => {
    const dir = makeTmpDir();
    try {
      writeModule(
        dir,
        "utils",
        'export function add(a: number, b: number): number { return a + b; }\nexport function sub(a: number, b: number): number { return a - b; }\n',
        'import { describe, it } from "node:test";\nimport assert from "node:assert/strict";\nimport { add } from "./utils";\n\ndescribe("add", () => { it("adds", () => { assert.equal(add(1,2), 3); }); });\n',
      );

      const collector = new MetricsCollector({ rootDir: dir });
      const result = collector.collectModule(join(dir, "utils.ts"), join(dir, "utils.test.ts"));

      assert.ok(result.module);
      assert.ok(result.timestamp);
      assert.ok(result.complexity);
      assert.ok(result.testCoverage);
      assert.equal(result.testCoverage.hasTestFile, true);
      assert.ok(result.testToCodeRatio.ratio > 0);
    } finally {
      cleanup(dir);
    }
  });

  it("collects metrics for a module without a test file", () => {
    const dir = makeTmpDir();
    try {
      writeModule(dir, "no-test", 'export function foo(): void {}\n');

      const collector = new MetricsCollector({ rootDir: dir });
      const result = collector.collectModule(join(dir, "no-test.ts"));

      assert.equal(result.testCoverage.hasTestFile, false);
      assert.equal(result.testToCodeRatio.ratio, 0);
      assert.equal(result.testToCodeRatio.testLines, 0);
    } finally {
      cleanup(dir);
    }
  });

  it("counts defect markers", () => {
    const dir = makeTmpDir();
    try {
      writeModule(dir, "markers", '// TODO: fix this\n// FIXME: broken\n// HACK: temporary\nexport function ok(): void {}\n');

      const collector = new MetricsCollector({ rootDir: dir });
      const result = collector.collectModule(join(dir, "markers.ts"));

      assert.equal(result.defectDensity.todoCount, 1);
      assert.equal(result.defectDensity.fixmeCount, 1);
      assert.equal(result.defectDensity.hackCount, 1);
      assert.equal(result.defectDensity.totalMarkers, 3);
      assert.ok(result.defectDensity.markersPerHundredLines > 0);
    } finally {
      cleanup(dir);
    }
  });

  it("computes complexity metrics", () => {
    const dir = makeTmpDir();
    try {
      writeModule(
        dir,
        "complex",
        'export function complex(x: number): string {\n  if (x > 10) {\n    if (x > 20) {\n      return "big";\n    }\n    return "medium";\n  } else if (x > 5) {\n    return "small";\n  }\n  return "tiny";\n}\n',
      );

      const collector = new MetricsCollector({ rootDir: dir });
      const result = collector.collectModule(join(dir, "complex.ts"));

      assert.ok(result.complexity.functionCount >= 1);
      assert.ok(result.complexity.maxCyclomaticComplexity >= 1);
      assert.ok(result.complexity.avgCyclomaticComplexity >= 1);
    } finally {
      cleanup(dir);
    }
  });

  it("handles empty file gracefully", () => {
    const dir = makeTmpDir();
    try {
      writeModule(dir, "empty", "");

      const collector = new MetricsCollector({ rootDir: dir });
      const result = collector.collectModule(join(dir, "empty.ts"));

      assert.equal(result.complexity.functionCount, 0);
      assert.equal(result.defectDensity.totalMarkers, 0);
    } finally {
      cleanup(dir);
    }
  });

  it("handles nonexistent file gracefully", () => {
    const dir = makeTmpDir();
    try {
      const collector = new MetricsCollector({ rootDir: dir });
      const result = collector.collectModule(join(dir, "does-not-exist.ts"));

      assert.ok(result);
      assert.equal(result.complexity.functionCount, 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Collect all
// ---------------------------------------------------------------------------

describe("collectAll", () => {
  it("collects metrics for all modules in directory", () => {
    const dir = makeTmpDir();
    try {
      writeModule(dir, "alpha", 'export function a(): void {}\n', 'import { it } from "node:test";\n');
      writeModule(dir, "beta", 'export function b(): void {}\n');

      const collector = new MetricsCollector({ rootDir: dir });
      const snapshot = collector.collectAll();

      assert.ok(snapshot.timestamp);
      assert.equal(snapshot.modules.length, 2);
      assert.equal(snapshot.summary.totalModules, 2);
      assert.equal(snapshot.summary.modulesWithTests, 1);
      assert.equal(snapshot.summary.modulesWithoutTests, 1);
    } finally {
      cleanup(dir);
    }
  });

  it("handles empty directory", () => {
    const dir = makeTmpDir();
    try {
      const collector = new MetricsCollector({ rootDir: dir });
      const snapshot = collector.collectAll();

      assert.equal(snapshot.modules.length, 0);
      assert.equal(snapshot.summary.totalModules, 0);
      assert.equal(snapshot.summary.avgComplexity, 0);
    } finally {
      cleanup(dir);
    }
  });

  it("ignores node_modules", () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, "node_modules"), { recursive: true });
      writeFileSync(join(dir, "node_modules", "dep.ts"), 'export function dep(): void {}\n');
      writeModule(dir, "app", 'export function app(): void {}\n');

      const collector = new MetricsCollector({ rootDir: dir });
      const snapshot = collector.collectAll();

      assert.equal(snapshot.modules.length, 1);
      assert.ok(snapshot.modules[0].module.includes("app"));
    } finally {
      cleanup(dir);
    }
  });

  it("ignores test files as modules", () => {
    const dir = makeTmpDir();
    try {
      writeModule(dir, "mod", 'export function mod(): void {}\n', 'import { it } from "node:test";\nit("works", () => {});\n');

      const collector = new MetricsCollector({ rootDir: dir });
      const snapshot = collector.collectAll();

      // Should only have 1 module (mod.ts), not 2 (mod.ts + mod.test.ts)
      assert.equal(snapshot.modules.length, 1);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Summary computation
// ---------------------------------------------------------------------------

describe("Summary", () => {
  it("computes correct summary statistics", () => {
    const dir = makeTmpDir();
    try {
      writeModule(dir, "a", 'export function a(): void {}\n', 'import { it } from "node:test";\nit("a", () => {});\n');
      writeModule(dir, "b", '// TODO: implement\nexport function b(): void {}\n');

      const collector = new MetricsCollector({ rootDir: dir });
      const snapshot = collector.collectAll();

      assert.equal(snapshot.summary.totalModules, 2);
      assert.equal(snapshot.summary.modulesWithTests, 1);
      assert.equal(snapshot.summary.modulesWithoutTests, 1);
      assert.ok(snapshot.summary.totalDefectMarkers >= 1);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// History management
// ---------------------------------------------------------------------------

describe("History management", () => {
  it("saves snapshot to history file", () => {
    const dir = makeTmpDir();
    try {
      const historyPath = join(dir, "history.json");
      writeModule(dir, "mod", 'export function mod(): void {}\n');

      const collector = new MetricsCollector({ rootDir: dir, historyPath });
      collector.collectAndSave();

      assert.ok(existsSync(historyPath));
      const history = JSON.parse(readFileSync(historyPath, "utf-8"));
      assert.equal(history.snapshots.length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it("accumulates multiple snapshots", () => {
    const dir = makeTmpDir();
    try {
      const historyPath = join(dir, "history.json");
      writeModule(dir, "mod", 'export function mod(): void {}\n');

      const collector = new MetricsCollector({ rootDir: dir, historyPath });
      collector.collectAndSave();
      collector.collectAndSave();
      collector.collectAndSave();

      const history = JSON.parse(readFileSync(historyPath, "utf-8"));
      assert.equal(history.snapshots.length, 3);
    } finally {
      cleanup(dir);
    }
  });

  it("trims history to maxHistorySnapshots", () => {
    const dir = makeTmpDir();
    try {
      const historyPath = join(dir, "history.json");
      writeModule(dir, "mod", 'export function mod(): void {}\n');

      const collector = new MetricsCollector({
        rootDir: dir,
        historyPath,
        maxHistorySnapshots: 2,
      });
      collector.collectAndSave();
      collector.collectAndSave();
      collector.collectAndSave();

      const history = JSON.parse(readFileSync(historyPath, "utf-8"));
      assert.equal(history.snapshots.length, 2);
    } finally {
      cleanup(dir);
    }
  });

  it("loads empty history when file does not exist", () => {
    const collector = new MetricsCollector({
      rootDir: ".",
      historyPath: "/nonexistent/path/history.json",
    });
    const history = collector.loadHistory();
    assert.deepEqual(history, { snapshots: [] });
  });

  it("handles corrupted history file", () => {
    const dir = makeTmpDir();
    try {
      const historyPath = join(dir, "history.json");
      writeFileSync(historyPath, "not valid json");

      const collector = new MetricsCollector({ rootDir: dir, historyPath });
      const history = collector.loadHistory();
      assert.deepEqual(history, { snapshots: [] });
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("Formatters", () => {
  it("formatSnapshot produces readable text", () => {
    const snapshot: MetricsSnapshot = {
      timestamp: "2026-03-27T00:00:00Z",
      rootDir: "/test",
      modules: [
        {
          module: "utils.ts",
          timestamp: "2026-03-27T00:00:00Z",
          complexity: { avgCyclomaticComplexity: 3, maxCyclomaticComplexity: 5, functionCount: 2, highComplexityFunctions: 0 },
          testCoverage: { hasTestFile: true, testFileLines: 20, sourceFileLines: 30 },
          codeChurn: { recentCommits: 5, linesAdded: 100, linesDeleted: 20 },
          defectDensity: { todoCount: 1, fixmeCount: 0, hackCount: 0, totalMarkers: 1, markersPerHundredLines: 3.33 },
          lintViolations: { violations: 0 },
          testToCodeRatio: { ratio: 0.67, testLines: 20, sourceLines: 30 },
        },
      ],
      summary: {
        totalModules: 1,
        avgComplexity: 3,
        totalDefectMarkers: 1,
        modulesWithTests: 1,
        modulesWithoutTests: 0,
        avgTestToCodeRatio: 0.67,
      },
    };

    const text = MetricsCollector.formatSnapshot(snapshot);
    assert.ok(text.includes("QUALITY METRICS SNAPSHOT"));
    assert.ok(text.includes("utils.ts"));
    assert.ok(text.includes("Complexity:"));
    assert.ok(text.includes("Test:code:"));
  });

  it("formatSnapshotJSON produces valid JSON", () => {
    const snapshot: MetricsSnapshot = {
      timestamp: "2026-03-27T00:00:00Z",
      rootDir: "/test",
      modules: [],
      summary: {
        totalModules: 0,
        avgComplexity: 0,
        totalDefectMarkers: 0,
        modulesWithTests: 0,
        modulesWithoutTests: 0,
        avgTestToCodeRatio: 0,
      },
    };

    const json = MetricsCollector.formatSnapshotJSON(snapshot);
    const parsed = JSON.parse(json);
    assert.equal(parsed.summary.totalModules, 0);
  });
});

// ---------------------------------------------------------------------------
// Module metrics structure validation
// ---------------------------------------------------------------------------

describe("ModuleMetrics structure", () => {
  it("all fields are present and typed correctly", () => {
    const dir = makeTmpDir();
    try {
      writeModule(dir, "structured", 'export function s(): number { return 1; }\n');

      const collector = new MetricsCollector({ rootDir: dir });
      const result = collector.collectModule(join(dir, "structured.ts"));

      // Type-level checks via assertions
      assert.equal(typeof result.module, "string");
      assert.equal(typeof result.timestamp, "string");
      assert.equal(typeof result.complexity.avgCyclomaticComplexity, "number");
      assert.equal(typeof result.complexity.maxCyclomaticComplexity, "number");
      assert.equal(typeof result.complexity.functionCount, "number");
      assert.equal(typeof result.complexity.highComplexityFunctions, "number");
      assert.equal(typeof result.testCoverage.hasTestFile, "boolean");
      assert.equal(typeof result.testCoverage.testFileLines, "number");
      assert.equal(typeof result.testCoverage.sourceFileLines, "number");
      assert.equal(typeof result.codeChurn.recentCommits, "number");
      assert.equal(typeof result.codeChurn.linesAdded, "number");
      assert.equal(typeof result.codeChurn.linesDeleted, "number");
      assert.equal(typeof result.defectDensity.todoCount, "number");
      assert.equal(typeof result.defectDensity.fixmeCount, "number");
      assert.equal(typeof result.defectDensity.hackCount, "number");
      assert.equal(typeof result.defectDensity.totalMarkers, "number");
      assert.equal(typeof result.defectDensity.markersPerHundredLines, "number");
      assert.equal(typeof result.lintViolations.violations, "number");
      assert.equal(typeof result.testToCodeRatio.ratio, "number");
      assert.equal(typeof result.testToCodeRatio.testLines, "number");
      assert.equal(typeof result.testToCodeRatio.sourceLines, "number");
    } finally {
      cleanup(dir);
    }
  });
});
