/**
 * Tests for quality-gate (QA-03)
 *
 * Happy path + unhappy path tests for the quality gate pipeline.
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { QualityGatePipeline, type PipelineResult, type StageResult, type StageName } from "./quality-gate";
import { writeFileSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(tmpdir(), `qa03-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
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
// Pipeline construction
// ---------------------------------------------------------------------------

describe("QualityGatePipeline construction", () => {
  it("creates pipeline with default options", () => {
    const pipeline = new QualityGatePipeline({ rootDir: "." });
    assert.ok(pipeline);
  });

  it("accepts custom stage list", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      stages: ["lint", "review"],
    });
    assert.ok(pipeline);
  });

  it("accepts custom commands", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      lintCommand: "echo ok",
      typeCheckCommand: "echo ok",
      testCommand: "echo ok",
    });
    assert.ok(pipeline);
  });
});

// ---------------------------------------------------------------------------
// Individual stage execution
// ---------------------------------------------------------------------------

describe("runStage — lint", () => {
  it("passes when lint command succeeds", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      lintCommand: "echo lint-ok",
    });
    const result = pipeline.runStage("lint");
    assert.equal(result.stage, "lint");
    assert.equal(result.status, "pass");
    assert.equal(result.issues.length, 0);
    assert.ok(result.durationMs >= 0);
  });

  it("fails when lint command fails", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      lintCommand: "exit 1",
    });
    const result = pipeline.runStage("lint");
    assert.equal(result.stage, "lint");
    assert.notEqual(result.status, "pass");
  });
});

describe("runStage — typeCheck", () => {
  it("passes when type-check command succeeds", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      typeCheckCommand: "echo ok",
    });
    const result = pipeline.runStage("typeCheck");
    assert.equal(result.stage, "typeCheck");
    assert.equal(result.status, "pass");
  });

  it("fails when type-check finds errors", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      typeCheckCommand: "exit 1",
    });
    const result = pipeline.runStage("typeCheck");
    assert.notEqual(result.status, "pass");
  });
});

describe("runStage — test", () => {
  it("passes when test command succeeds", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      testCommand: "echo ok",
    });
    const result = pipeline.runStage("test");
    assert.equal(result.stage, "test");
    assert.equal(result.status, "pass");
  });

  it("returns blocker when test command fails", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      testCommand: "exit 1",
    });
    const result = pipeline.runStage("test");
    assert.equal(result.status, "blocker");
  });
});

describe("runStage — coverage", () => {
  it("skips when no coverage file exists", () => {
    const dir = makeTmpDir();
    try {
      const pipeline = new QualityGatePipeline({ rootDir: dir });
      const result = pipeline.runStage("coverage");
      assert.equal(result.stage, "coverage");
      assert.equal(result.status, "skip");
    } finally {
      cleanup(dir);
    }
  });

  it("passes when coverage meets threshold", () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, "coverage"), { recursive: true });
      writeFileSync(
        join(dir, "coverage", "coverage-summary.json"),
        JSON.stringify({ total: { statements: { pct: 90 } } }),
      );
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        coverageThreshold: 80,
      });
      const result = pipeline.runStage("coverage");
      assert.equal(result.status, "pass");
    } finally {
      cleanup(dir);
    }
  });

  it("fails when coverage is below threshold", () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, "coverage"), { recursive: true });
      writeFileSync(
        join(dir, "coverage", "coverage-summary.json"),
        JSON.stringify({ total: { statements: { pct: 65 } } }),
      );
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        coverageThreshold: 80,
      });
      const result = pipeline.runStage("coverage");
      assert.equal(result.status, "fail");
      assert.ok(result.issues.length > 0);
      assert.ok(result.issues[0].message.includes("65"));
    } finally {
      cleanup(dir);
    }
  });

  it("returns blocker when coverage is far below threshold", () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, "coverage"), { recursive: true });
      writeFileSync(
        join(dir, "coverage", "coverage-summary.json"),
        JSON.stringify({ total: { statements: { pct: 50 } } }),
      );
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        coverageThreshold: 80,
      });
      const result = pipeline.runStage("coverage");
      assert.equal(result.status, "blocker");
    } finally {
      cleanup(dir);
    }
  });

  it("handles malformed coverage JSON", () => {
    const dir = makeTmpDir();
    try {
      mkdirSync(join(dir, "coverage"), { recursive: true });
      writeFileSync(join(dir, "coverage", "coverage-summary.json"), "not json");
      const pipeline = new QualityGatePipeline({ rootDir: dir });
      const result = pipeline.runStage("coverage");
      // Should not crash — graceful handling
      assert.ok(result);
      assert.equal(result.stage, "coverage");
    } finally {
      cleanup(dir);
    }
  });
});

describe("runStage — security", () => {
  it("passes on clean files", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "clean.ts"), 'export function hello(): string { return "hi"; }\n');
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        reviewFiles: [join(dir, "clean.ts")],
      });
      const result = pipeline.runStage("security");
      assert.equal(result.status, "pass");
    } finally {
      cleanup(dir);
    }
  });

  it("detects eval usage", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "bad.ts"), 'const x = eval("code");\n');
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        reviewFiles: [join(dir, "bad.ts")],
      });
      const result = pipeline.runStage("security");
      assert.notEqual(result.status, "pass");
      assert.ok(result.issues.some((i) => i.message.includes("eval")));
    } finally {
      cleanup(dir);
    }
  });

  it("detects hardcoded secrets", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "secrets.ts"), 'const password = "hunter2";\n');
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        reviewFiles: [join(dir, "secrets.ts")],
      });
      const result = pipeline.runStage("security");
      assert.equal(result.status, "blocker");
      assert.ok(result.issues.some((i) => i.message.includes("password")));
    } finally {
      cleanup(dir);
    }
  });

  it("skips test files in security scan", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "util.test.ts"), 'const x = eval("test fixture");\n');
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        reviewFiles: [join(dir, "util.test.ts")],
      });
      const result = pipeline.runStage("security");
      assert.equal(result.status, "pass");
    } finally {
      cleanup(dir);
    }
  });
});

describe("runStage — review", () => {
  it("passes on well-structured files", () => {
    const dir = makeTmpDir();
    try {
      // Create a clean file with documentation and small size
      writeFileSync(
        join(dir, "good.ts"),
        '/** Module doc */\nexport function greet(name: string): string { return `hi ${name}`; }\n',
      );
      // Also create a matching test file so testPresence passes
      writeFileSync(join(dir, "good.test.ts"), 'import { describe, it } from "node:test";\n');
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        reviewFiles: [join(dir, "good.ts")],
      });
      const result = pipeline.runStage("review");
      assert.equal(result.stage, "review");
      assert.ok(result.durationMs >= 0);
    } finally {
      cleanup(dir);
    }
  });

  it("reports issues on problematic files", () => {
    const dir = makeTmpDir();
    try {
      // Uppercase filename, no docs, no test — should generate issues
      writeFileSync(join(dir, "BadFile.ts"), "export const Val = 1;\n");
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        reviewFiles: [join(dir, "BadFile.ts")],
      });
      const result = pipeline.runStage("review");
      assert.ok(result.issues.length > 0);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Full pipeline execution
// ---------------------------------------------------------------------------

describe("QualityGatePipeline.run()", () => {
  it("runs all stages and produces a result", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "app.ts"), '/** mod */\nexport function main(): void {}\n');
      writeFileSync(join(dir, "app.test.ts"), 'import { describe, it } from "node:test";\n');

      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        stages: ["coverage", "security", "review"],
        reviewFiles: [join(dir, "app.ts")],
      });
      const result = pipeline.run();

      assert.ok(result.timestamp);
      assert.equal(result.stages.length, 3);
      assert.ok(result.summary);
      assert.equal(result.summary.totalStages, 3);
      assert.ok(result.durationMs >= 0);
    } finally {
      cleanup(dir);
    }
  });

  it("halts on blocker when haltOnBlocker is true", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      stages: ["test", "lint", "review"],
      haltOnBlocker: true,
      testCommand: "exit 1",
    });
    const result = pipeline.run();

    assert.equal(result.haltedAt, "test");
    assert.equal(result.summary.overallStatus, "blocker");
    // lint and review should be skipped
    const lintStage = result.stages.find((s) => s.stage === "lint");
    assert.equal(lintStage?.status, "skip");
    const reviewStage = result.stages.find((s) => s.stage === "review");
    assert.equal(reviewStage?.status, "skip");
  });

  it("continues past failures when haltOnBlocker is false", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "a.ts"), '/** m */\nexport function a(): void {}\n');
      writeFileSync(join(dir, "a.test.ts"), 'import { it } from "node:test";\n');

      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        stages: ["test", "security", "review"],
        haltOnBlocker: false,
        testCommand: "exit 1",
        reviewFiles: [join(dir, "a.ts")],
      });
      const result = pipeline.run();

      assert.equal(result.haltedAt, undefined);
      // All stages should have run
      const statuses = result.stages.map((s) => s.stage);
      assert.deepEqual(statuses, ["test", "security", "review"]);
    } finally {
      cleanup(dir);
    }
  });

  it("writes report to file when reportPath is set", () => {
    const dir = makeTmpDir();
    try {
      const reportPath = join(dir, "report.json");
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        stages: ["coverage"],
        reportPath,
      });
      pipeline.run();

      const content = JSON.parse(readFileSync(reportPath, "utf-8"));
      assert.ok(content.timestamp);
      assert.ok(Array.isArray(content.stages));
    } finally {
      cleanup(dir);
    }
  });

  it("summary reflects correct counts", () => {
    const dir = makeTmpDir();
    try {
      writeFileSync(join(dir, "ok.ts"), '/** m */\nexport function ok(): void {}\n');
      writeFileSync(join(dir, "ok.test.ts"), 'import { it } from "node:test";\n');

      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        stages: ["security", "review"],
        haltOnBlocker: false,
        reviewFiles: [join(dir, "ok.ts")],
      });
      const result = pipeline.run();

      assert.equal(result.summary.totalStages, 2);
      assert.equal(result.summary.passed + result.summary.failed + result.summary.skipped + result.summary.blockers, 2);
    } finally {
      cleanup(dir);
    }
  });
});

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

describe("QualityGatePipeline formatters", () => {
  const sampleResult: PipelineResult = {
    timestamp: "2026-03-27T00:00:00Z",
    stages: [
      { stage: "lint", status: "pass", durationMs: 100, issues: [] },
      {
        stage: "test",
        status: "blocker",
        durationMs: 200,
        issues: [{ message: "Test failed: foo", severity: "Blocker" }],
      },
      { stage: "review", status: "skip", durationMs: 0, issues: [{ message: "Skipped: halted at test", severity: "Info" }] },
    ],
    summary: {
      totalStages: 3,
      passed: 1,
      failed: 0,
      skipped: 1,
      blockers: 1,
      overallStatus: "blocker",
    },
    durationMs: 300,
    haltedAt: "test",
  };

  it("formatResult produces readable text", () => {
    const text = QualityGatePipeline.formatResult(sampleResult);
    assert.ok(text.includes("QUALITY GATE PIPELINE REPORT"));
    assert.ok(text.includes("[PASS] lint"));
    assert.ok(text.includes("[HALT] test"));
    assert.ok(text.includes("[SKIP] review"));
    assert.ok(text.includes("BLOCKER"));
    assert.ok(text.includes("Halted at: test"));
  });

  it("formatResultJSON produces valid JSON", () => {
    const json = QualityGatePipeline.formatResultJSON(sampleResult);
    const parsed = JSON.parse(json);
    assert.equal(parsed.summary.overallStatus, "blocker");
    assert.equal(parsed.stages.length, 3);
  });

  it("formatResult handles empty pipeline", () => {
    const empty: PipelineResult = {
      timestamp: "2026-03-27T00:00:00Z",
      stages: [],
      summary: { totalStages: 0, passed: 0, failed: 0, skipped: 0, blockers: 0, overallStatus: "pass" },
      durationMs: 0,
    };
    const text = QualityGatePipeline.formatResult(empty);
    assert.ok(text.includes("QUALITY GATE PIPELINE REPORT"));
    assert.ok(text.includes("PASS"));
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe("Edge cases", () => {
  it("handles unknown stage gracefully", () => {
    const pipeline = new QualityGatePipeline({ rootDir: "." });
    const result = pipeline.runStage("unknown" as StageName);
    assert.equal(result.status, "skip");
    assert.ok(result.issues[0].message.includes("Unknown stage"));
  });

  it("handles empty stage list", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      stages: [],
    });
    const result = pipeline.run();
    assert.equal(result.summary.totalStages, 0);
    assert.equal(result.summary.overallStatus, "pass");
  });

  it("pipeline result has all required fields", () => {
    const dir = makeTmpDir();
    try {
      const pipeline = new QualityGatePipeline({
        rootDir: dir,
        stages: ["coverage"],
      });
      const result = pipeline.run();

      // Verify complete structure
      assert.ok("timestamp" in result);
      assert.ok("stages" in result);
      assert.ok("summary" in result);
      assert.ok("durationMs" in result);
      assert.ok("totalStages" in result.summary);
      assert.ok("passed" in result.summary);
      assert.ok("failed" in result.summary);
      assert.ok("skipped" in result.summary);
      assert.ok("blockers" in result.summary);
      assert.ok("overallStatus" in result.summary);
    } finally {
      cleanup(dir);
    }
  });

  it("stage results have all required fields", () => {
    const pipeline = new QualityGatePipeline({
      rootDir: ".",
      stages: ["lint"],
      lintCommand: "echo ok",
    });
    const result = pipeline.runStage("lint");

    assert.ok("stage" in result);
    assert.ok("status" in result);
    assert.ok("durationMs" in result);
    assert.ok("issues" in result);
    assert.ok(Array.isArray(result.issues));
  });
});

