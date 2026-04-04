/**
 * Tests for Automated Rating Calculation (RT-02)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  collectBenchmarks,
  computeFullRating,
  formatFullReport,
  runCli,
  type CollectionContext,
} from "./calculate-rating";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The actual project root — tests run against the real codebase */
const PROJECT_ROOT = join(__dirname, "../..");

function makeCtx(overrides?: Partial<CollectionContext>): CollectionContext {
  return {
    rootDir: PROJECT_ROOT,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Benchmark Collection
// ---------------------------------------------------------------------------

describe("collectBenchmarks", () => {
  it("collects all 7 benchmarks", () => {
    const { benchmarks } = collectBenchmarks(makeCtx());
    assert.equal(benchmarks.length, 7);
    const ids = benchmarks.map((b) => b.benchmarkId);
    assert.ok(ids.includes("first-pass-quality"));
    assert.ok(ids.includes("recovery-success-rate"));
    assert.ok(ids.includes("enforcement-coverage"));
    assert.ok(ids.includes("context-efficiency"));
    assert.ok(ids.includes("governance-overhead"));
    assert.ok(ids.includes("coordination-overhead"));
    assert.ok(ids.includes("knowledge-reuse"));
  });

  it("produces diagnostics for each benchmark", () => {
    const { diagnostics } = collectBenchmarks(makeCtx());
    assert.ok(diagnostics.length >= 7, `expected >=7 diagnostics, got ${diagnostics.length}`);
  });

  it("benchmarks have measured status or insufficient-data", () => {
    const { benchmarks } = collectBenchmarks(makeCtx());
    for (const b of benchmarks) {
      assert.ok(
        b.status === "measured" || b.status === "insufficient-data",
        `unexpected status for ${b.benchmarkId}: ${b.status}`,
      );
    }
  });

  it("measured benchmarks have numeric values", () => {
    const { benchmarks } = collectBenchmarks(makeCtx());
    for (const b of benchmarks) {
      if (b.status === "measured") {
        assert.equal(typeof b.value, "number", `${b.benchmarkId} should have a number value`);
      }
    }
  });

  it("applies overrides", () => {
    const { benchmarks } = collectBenchmarks(
      makeCtx({ overrides: { "first-pass-quality": 99 } }),
    );
    const fpq = benchmarks.find((b) => b.benchmarkId === "first-pass-quality");
    assert.ok(fpq);
    assert.equal(fpq!.value, 99);
    assert.equal(fpq!.source, "override");
  });

  it("survives a nonexistent root directory", () => {
    const { benchmarks, diagnostics } = collectBenchmarks({
      rootDir: "/nonexistent/path/that/does/not/exist",
    });
    assert.equal(benchmarks.length, 7);
    // Most should be insufficient-data
    const insufficient = benchmarks.filter((b) => b.status === "insufficient-data");
    assert.ok(
      insufficient.length >= 3,
      `expected >=3 insufficient-data, got ${insufficient.length}`,
    );
  });
});

// ---------------------------------------------------------------------------
// First-Pass Quality
// ---------------------------------------------------------------------------

describe("first-pass-quality collection", () => {
  it("produces a score between 0 and 100", () => {
    const { benchmarks } = collectBenchmarks(makeCtx());
    const fpq = benchmarks.find((b) => b.benchmarkId === "first-pass-quality");
    assert.ok(fpq);
    if (fpq!.status === "measured") {
      assert.ok(fpq!.value! >= 0 && fpq!.value! <= 100);
    }
  });
});

// ---------------------------------------------------------------------------
// Recovery Success Rate
// ---------------------------------------------------------------------------

describe("recovery-success-rate collection", () => {
  it("produces a score based on error handling patterns", () => {
    const { benchmarks } = collectBenchmarks(makeCtx());
    const rsr = benchmarks.find((b) => b.benchmarkId === "recovery-success-rate");
    assert.ok(rsr);
    if (rsr!.status === "measured") {
      assert.ok(rsr!.value! >= 0 && rsr!.value! <= 100);
    }
  });
});

// ---------------------------------------------------------------------------
// Enforcement Coverage
// ---------------------------------------------------------------------------

describe("enforcement-coverage collection", () => {
  it("reads from enforcement map", () => {
    const { benchmarks, diagnostics } = collectBenchmarks(makeCtx());
    const ec = benchmarks.find((b) => b.benchmarkId === "enforcement-coverage");
    assert.ok(ec);
    const ecDiag = diagnostics.find((d) => d.startsWith("enforcement-coverage"));
    assert.ok(ecDiag, "should have enforcement-coverage diagnostic");
  });
});

// ---------------------------------------------------------------------------
// Context Efficiency
// ---------------------------------------------------------------------------

describe("context-efficiency collection", () => {
  it("produces a ratio value", () => {
    const { benchmarks } = collectBenchmarks(makeCtx());
    const ce = benchmarks.find((b) => b.benchmarkId === "context-efficiency");
    assert.ok(ce);
    if (ce!.status === "measured") {
      assert.ok(ce!.value! > 0 && ce!.value! < 1, `ratio should be 0-1: ${ce!.value}`);
    }
  });
});

// ---------------------------------------------------------------------------
// Governance Overhead
// ---------------------------------------------------------------------------

describe("governance-overhead collection", () => {
  it("produces a percentage", () => {
    const { benchmarks } = collectBenchmarks(makeCtx());
    const go = benchmarks.find((b) => b.benchmarkId === "governance-overhead");
    assert.ok(go);
    if (go!.status === "measured") {
      assert.ok(go!.value! >= 0 && go!.value! <= 100);
    }
  });
});

// ---------------------------------------------------------------------------
// Coordination Overhead
// ---------------------------------------------------------------------------

describe("coordination-overhead collection", () => {
  it("produces a percentage", () => {
    const { benchmarks } = collectBenchmarks(makeCtx());
    const co = benchmarks.find((b) => b.benchmarkId === "coordination-overhead");
    assert.ok(co);
    if (co!.status === "measured") {
      assert.ok(co!.value! >= 0 && co!.value! <= 100);
    }
  });
});

// ---------------------------------------------------------------------------
// Knowledge Reuse
// ---------------------------------------------------------------------------

describe("knowledge-reuse collection", () => {
  it("produces a score reflecting Brain integration", () => {
    const { benchmarks } = collectBenchmarks(makeCtx());
    const kr = benchmarks.find((b) => b.benchmarkId === "knowledge-reuse");
    assert.ok(kr);
    if (kr!.status === "measured") {
      assert.ok(kr!.value! >= 0 && kr!.value! <= 100);
    }
  });
});

// ---------------------------------------------------------------------------
// Full Rating Computation
// ---------------------------------------------------------------------------

describe("computeFullRating", () => {
  it("produces a valid rating report", () => {
    const { report } = computeFullRating(makeCtx());
    assert.ok(report.rating);
    assert.ok(report.displayRating);
    assert.ok(report.entity === "admiral-framework");
    assert.ok(report.category === "platform");
    assert.ok(report.timestamp);
    assert.ok(Array.isArray(report.benchmarks));
  });

  it("defaults to -SA certification", () => {
    const { report } = computeFullRating(makeCtx());
    assert.ok(report.displayRating.endsWith("-SA") || !report.displayRating.includes("-"));
    assert.equal(report.certificationSuffix, "-SA");
  });

  it("accepts custom gate verdicts", () => {
    const { report } = computeFullRating(
      makeCtx({
        gateVerdicts: [
          {
            gateId: "HJG-1",
            passed: true,
            evaluator: "test",
            evidence: "test",
            evaluatedAt: new Date().toISOString(),
          },
        ],
      }),
    );
    assert.equal(report.gateVerdicts.length, 1);
  });

  it("produces an honest result (likely ADM-4 or ADM-5)", () => {
    const { report } = computeFullRating(makeCtx());
    // Without HJG verdicts, the result should be modest
    assert.ok(
      ["ADM-3", "ADM-4", "ADM-5"].includes(report.rating),
      `Expected ADM-3-5 for self-assessment without gates, got ${report.rating}`,
    );
  });

  it("is reproducible", () => {
    const r1 = computeFullRating(makeCtx());
    const r2 = computeFullRating(makeCtx());
    assert.equal(r1.report.rating, r2.report.rating);
  });
});

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

describe("formatFullReport", () => {
  it("includes rating report and diagnostics", () => {
    const { report, diagnostics } = computeFullRating(makeCtx());
    const output = formatFullReport(report, diagnostics);
    assert.ok(output.includes("# Admiral Rating Report"));
    assert.ok(output.includes("## Collection Diagnostics"));
    assert.ok(output.includes("first-pass-quality"));
  });
});

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

describe("runCli", () => {
  it("produces text output by default", () => {
    const output = runCli([PROJECT_ROOT]);
    assert.ok(output.includes("Admiral Rating Report"));
  });

  it("produces JSON with --json flag", () => {
    const output = runCli([PROJECT_ROOT, "--json"]);
    const parsed = JSON.parse(output);
    assert.ok(parsed.report);
    assert.ok(parsed.diagnostics);
    assert.ok(parsed.report.rating);
  });
});
