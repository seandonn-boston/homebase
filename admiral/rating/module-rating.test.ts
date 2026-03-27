/**
 * Tests for Per-Module Ratings (RT-07)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  calculateModuleRatings,
  formatModuleRatings,
} from "./module-rating";

const PROJECT_ROOT = join(__dirname, "../..");

// ---------------------------------------------------------------------------
// calculateModuleRatings
// ---------------------------------------------------------------------------

describe("calculateModuleRatings", () => {
  it("produces ratings for discovered modules", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    assert.ok(report.modules.length > 0, "should find at least one module");
  });

  it("identifies critical modules", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    const critical = report.modules.filter((m) => m.criticality === "critical");
    assert.ok(critical.length > 0, "should have at least one critical module");
  });

  it("computes project cap from critical modules", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    if (report.projectCap) {
      assert.ok(
        ["ADM-1", "ADM-2", "ADM-3", "ADM-4", "ADM-5"].includes(report.projectCap),
        "project cap should be a valid tier",
      );
    }
  });

  it("reports consistency gap", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    assert.equal(typeof report.consistencyGap, "number");
    assert.ok(report.consistencyGap >= 0);
  });

  it("reports best and worst modules", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    assert.ok(report.bestModule);
    assert.ok(report.worstModule);
  });

  it("each module has scores", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    for (const m of report.modules) {
      assert.ok(m.scores);
      assert.ok(m.module);
      assert.ok(["critical", "standard", "peripheral"].includes(m.criticality));
      assert.ok(["ADM-1", "ADM-2", "ADM-3", "ADM-4", "ADM-5"].includes(m.rating));
    }
  });

  it("accepts criticality overrides", () => {
    const report = calculateModuleRatings(PROJECT_ROOT, {
      "admiral/rating": "critical",
    });
    const ratingModule = report.modules.find((m) => m.module === "admiral/rating");
    if (ratingModule) {
      assert.equal(ratingModule.criticality, "critical");
    }
  });

  it("skips nonexistent modules", () => {
    const report = calculateModuleRatings(PROJECT_ROOT, {
      "nonexistent/path": "standard",
    });
    const missing = report.modules.find((m) => m.module === "nonexistent/path");
    assert.equal(missing, undefined);
  });
});

// ---------------------------------------------------------------------------
// formatModuleRatings
// ---------------------------------------------------------------------------

describe("formatModuleRatings", () => {
  it("produces markdown table", () => {
    const report = calculateModuleRatings(PROJECT_ROOT);
    const md = formatModuleRatings(report);
    assert.ok(md.includes("# Per-Module Rating Report"));
    assert.ok(md.includes("| Module |"));
    assert.ok(md.includes("Project Cap"));
    assert.ok(md.includes("Consistency Gap"));
  });
});
