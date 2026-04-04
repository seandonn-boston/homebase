/**
 * Tests for complexity-budget (QA-07)
 *
 * Happy path + unhappy path tests for complexity budget enforcement.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ComplexityBudgetEngine, type BudgetReport } from "./complexity-budget";
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(tmpdir(), `qa07-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
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

describe("ComplexityBudgetEngine construction", () => {
  it("creates engine with default options", () => {
    const engine = new ComplexityBudgetEngine({ rootDir: "." });
    assert.ok(engine);
  });

  it("accepts custom default max", () => {
    const engine = new ComplexityBudgetEngine({ rootDir: ".", defaultMax: 10 });
    const config = engine.getConfig();
    assert.equal(config.defaultMax, 10);
  });

  it("loads config from file", () => {
    const dir = makeTmpDir();
    try {
      const configPath = join(dir, "budget.json");
      writeFileSync(configPath, JSON.stringify({
        defaultMax: 12,
        overrides: { "special.ts": 20 },
        baselines: { "mod.ts": 8 },
      }));

      const engine = new ComplexityBudgetEngine({ rootDir: dir, configPath });
      const config = engine.getConfig();
      assert.equal(config.defaultMax, 12);
      assert.equal(config.overrides["special.ts"], 20);
      assert.equal(config.baselines["mod.ts"], 8);
    } finally {
      cleanup(dir);
    }
  });

  it("handles missing config file gracefully", () => {
    const engine = new ComplexityBudgetEngine({
      rootDir: ".",
      configPath: "/nonexistent/budget.json",
    });
    assert.ok(engine);
  });
});

// ---------------------------------------------------------------------------
// Single module check
// ---------------------------------------------------------------------------

describe("checkModule", () => {
  it("passes for simple function under budget", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "simple.ts"), 'export function add(a: number, b: number): number { return a + b; }\n');
      const engine = new ComplexityBudgetEngine({ rootDir: dir, defaultMax: 15 });
      const result = engine.checkModule(join(dir, "simple.ts"));

      assert.equal(result.verdict, "pass");
      assert.equal(result.overBudgetFunctions.length, 0);
      assert.equal(result.recommendations.length, 0);
    } finally {
      cleanup(dir);
    }
  });

  it("fails for complex function over budget", () => {
    const dir = makeTmpDir();
    try {
      const complex = `export function complex(x: number): string {
  if (x > 10) {
    if (x > 20) {
      if (x > 30) {
        for (let i = 0; i < x; i++) {
          if (i % 2 === 0) {
            while (i > 0) {
              switch (i) {
                case 1: return "a";
                case 2: return "b";
                case 3: return "c";
                case 4: return "d";
                case 5: return "e";
                case 6: return "f";
                default: return "g";
              }
            }
          }
        }
      }
    }
  }
  return x > 5 ? "big" : "small";
}\n`;
      writeFileSync(join(dir, "complex.ts"), complex);
      const engine = new ComplexityBudgetEngine({ rootDir: dir, defaultMax: 5 });
      const result = engine.checkModule(join(dir, "complex.ts"));

      assert.equal(result.verdict, "over-budget");
      assert.ok(result.overBudgetFunctions.length > 0);
      assert.ok(result.recommendations.length > 0);
      assert.ok(result.actual > 5);
    } finally {
      cleanup(dir);
    }
  });

  it("respects per-module overrides", () => {
    const dir = makeTmpDir();
    try {
      const configPath = join(dir, "budget.json");
      writeFileSync(configPath, JSON.stringify({
        defaultMax: 3,
        overrides: { "special.ts": 20 },
        baselines: {},
      }));

      // Function has complexity ~5, which exceeds default (3) but not override (20)
      writeFileSync(join(dir, "special.ts"), 'export function fn(x: number): string { if (x > 1) { if (x > 2) { return "a"; } return "b"; } return "c"; }\n');

      const engine = new ComplexityBudgetEngine({ rootDir: dir, configPath });
      const result = engine.checkModule(join(dir, "special.ts"));
      assert.equal(result.verdict, "pass");
    } finally {
      cleanup(dir);
    }
  });

  it("detects credit violation when complexity increases from baseline", () => {
    const dir = makeTmpDir();
    try {
      const configPath = join(dir, "budget.json");
      writeFileSync(configPath, JSON.stringify({
        defaultMax: 20,
        overrides: {},
        baselines: { "growing.ts": 3 }, // baseline was 3
      }));

      // Function now has higher complexity
      writeFileSync(join(dir, "growing.ts"), 'export function fn(x: number): string { if (x > 1) { if (x > 2) { if (x > 3) { return "deep"; } return "a"; } return "b"; } return "c"; }\n');

      const engine = new ComplexityBudgetEngine({ rootDir: dir, configPath });
      const result = engine.checkModule(join(dir, "growing.ts"));
      assert.equal(result.verdict, "credit-violation");
      assert.ok(result.netChange > 0);
    } finally {
      cleanup(dir);
    }
  });

  it("handles empty file", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "empty.ts"), "");
      const engine = new ComplexityBudgetEngine({ rootDir: dir });
      const result = engine.checkModule(join(dir, "empty.ts"));
      assert.equal(result.verdict, "pass");
      assert.equal(result.actual, 0);
    } finally {
      cleanup(dir);
    }
  });

  it("handles nonexistent file", () => {
    const dir = makeTmpDir();
    try {
      const engine = new ComplexityBudgetEngine({ rootDir: dir });
      const result = engine.checkModule(join(dir, "missing.ts"));
      assert.equal(result.verdict, "pass");
    } finally {
      cleanup(dir);
    }
  });

  it("accepts inline content", () => {
    const engine = new ComplexityBudgetEngine({ rootDir: "." });
    const result = engine.checkModule("test.ts", 'export function simple(): void {}');
    assert.equal(result.verdict, "pass");
  });
});

// ---------------------------------------------------------------------------
// Multi-module check
// ---------------------------------------------------------------------------

describe("checkModules", () => {
  it("checks multiple modules and produces report", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "a.ts"), 'export function a(): void {}\n');
      writeFileSync(join(dir, "b.ts"), 'export function b(): void {}\n');

      const engine = new ComplexityBudgetEngine({ rootDir: dir });
      const report = engine.checkModules([join(dir, "a.ts"), join(dir, "b.ts")]);

      assert.equal(report.results.length, 2);
      assert.equal(report.summary.totalModules, 2);
      assert.equal(report.summary.overallVerdict, "pass");
    } finally {
      cleanup(dir);
    }
  });

  it("skips test files", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "app.ts"), 'export function app(): void {}\n');
      writeFileSync(join(dir, "app.test.ts"), 'import { it } from "node:test";\n');

      const engine = new ComplexityBudgetEngine({ rootDir: dir });
      const report = engine.checkModules([join(dir, "app.ts"), join(dir, "app.test.ts")]);

      assert.equal(report.results.length, 1);
    } finally {
      cleanup(dir);
    }
  });

  it("overall verdict is fail when any module fails", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "ok.ts"), 'export function ok(): void {}\n');
      writeFileSync(join(dir, "bad.ts"), 'export function bad(x: number): string { if (x>1) { if (x>2) { if (x>3) { if (x>4) { if (x>5) { return "deep"; } } } } } return ""; }\n');

      const engine = new ComplexityBudgetEngine({ rootDir: dir, defaultMax: 3 });
      const report = engine.checkModules([join(dir, "ok.ts"), join(dir, "bad.ts")]);

      assert.equal(report.summary.overallVerdict, "fail");
      assert.ok(report.summary.overBudget > 0);
    } finally {
      cleanup(dir);
    }
  });

  it("computes total net change", () => {
    const dir = makeTmpDir();
    try {
      const configPath = join(dir, "budget.json");
      writeFileSync(configPath, JSON.stringify({
        defaultMax: 20,
        overrides: {},
        baselines: { "a.ts": 5, "b.ts": 3 },
      }));

      writeFileSync(join(dir, "a.ts"), 'export function a(): void {}\n'); // complexity ~1
      writeFileSync(join(dir, "b.ts"), 'export function b(): void {}\n'); // complexity ~1

      const engine = new ComplexityBudgetEngine({ rootDir: dir, configPath });
      const report = engine.checkModules([join(dir, "a.ts"), join(dir, "b.ts")]);

      // Both decreased from baseline, so net should be negative
      assert.ok(report.summary.totalNetChange < 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Ratchet
// ---------------------------------------------------------------------------

describe("ratchet", () => {
  it("updates baselines to current complexity", () => {
    const dir = makeTmpDir();
    try {
      const configPath = join(dir, "budget.json");
      writeFileSync(join(dir, "mod.ts"), 'export function mod(): void {}\n');

      const engine = new ComplexityBudgetEngine({ rootDir: dir, configPath });
      engine.ratchet([join(dir, "mod.ts")]);

      assert.ok(existsSync(configPath));
      const saved = JSON.parse(readFileSync(configPath, "utf-8"));
      assert.ok("mod.ts" in saved.baselines);
    } finally {
      cleanup(dir);
    }
  });

  it("skips test files during ratchet", () => {
    const dir = makeTmpDir();
    try {
      const configPath = join(dir, "budget.json");
      writeFileSync(join(dir, "app.test.ts"), 'export function test(): void {}\n');

      const engine = new ComplexityBudgetEngine({ rootDir: dir, configPath });
      engine.ratchet([join(dir, "app.test.ts")]);

      const saved = JSON.parse(readFileSync(configPath, "utf-8"));
      assert.ok(!("app.test.ts" in saved.baselines));
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Overrides
// ---------------------------------------------------------------------------

describe("setOverride", () => {
  it("sets and persists budget override", () => {
    const dir = makeTmpDir();
    try {
      const configPath = join(dir, "budget.json");
      const engine = new ComplexityBudgetEngine({ rootDir: dir, configPath });
      engine.setOverride("complex-module.ts", 25);

      const saved = JSON.parse(readFileSync(configPath, "utf-8"));
      assert.equal(saved.overrides["complex-module.ts"], 25);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

describe("recommendations", () => {
  it("generates split recommendation for very high complexity", () => {
    const dir = makeTmpDir();
    try {
      // Create a very complex function
      const lines = ['export function mega(x: number): string {'];
      for (let i = 0; i < 20; i++) {
        lines.push(`  if (x > ${i * 10}) { x += ${i}; }`);
      }
      lines.push('  return String(x);\n}\n');
      writeFileSync(join(dir, "mega.ts"), lines.join("\n"));

      const engine = new ComplexityBudgetEngine({ rootDir: dir, defaultMax: 3 });
      const result = engine.checkModule(join(dir, "mega.ts"));

      assert.ok(result.recommendations.length > 0);
      assert.ok(result.recommendations[0].includes("mega"));
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("Formatters", () => {
  const sampleReport: BudgetReport = {
    timestamp: "2026-03-27T00:00:00Z",
    results: [
      {
        module: "mod.ts",
        verdict: "over-budget",
        budget: 10,
        actual: 18,
        netChange: 5,
        overBudgetFunctions: [{ name: "processData", complexity: 18, line: 5 }],
        recommendations: ["'processData' (line 5): complexity 18 is 1.8x budget — extract conditional logic"],
      },
    ],
    summary: { totalModules: 1, passing: 0, overBudget: 1, creditViolations: 0, totalNetChange: 5, overallVerdict: "fail" },
  };

  it("formatReport produces readable text", () => {
    const text = ComplexityBudgetEngine.formatReport(sampleReport);
    assert.ok(text.includes("COMPLEXITY BUDGET REPORT"));
    assert.ok(text.includes("[OVER]"));
    assert.ok(text.includes("processData"));
    assert.ok(text.includes("FAIL"));
  });

  it("formatReport handles passing report", () => {
    const passing: BudgetReport = {
      timestamp: "2026-03-27T00:00:00Z",
      results: [{ module: "ok.ts", verdict: "pass", budget: 15, actual: 3, netChange: 0, overBudgetFunctions: [], recommendations: [] }],
      summary: { totalModules: 1, passing: 1, overBudget: 0, creditViolations: 0, totalNetChange: 0, overallVerdict: "pass" },
    };
    const text = ComplexityBudgetEngine.formatReport(passing);
    assert.ok(text.includes("PASS"));
  });

  it("formatReportJSON produces valid JSON", () => {
    const json = ComplexityBudgetEngine.formatReportJSON(sampleReport);
    const parsed = JSON.parse(json);
    assert.equal(parsed.summary.overallVerdict, "fail");
  });
});
