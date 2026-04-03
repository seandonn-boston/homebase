/**
 * Tests for Per-Module Ratings (RT-07)
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import type { ModuleDefinition } from "./module-ratings";
import { ModuleRater } from "./module-ratings";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), "module-ratings-test-"));
  mkdirSync(join(dir, ".hooks"), { recursive: true });
  mkdirSync(join(dir, "admiral", "governance"), { recursive: true });
  mkdirSync(join(dir, "admiral", "standing-orders"), { recursive: true });
  mkdirSync(join(dir, "admiral", "security"), { recursive: true });
  mkdirSync(join(dir, "control-plane", "src"), { recursive: true });
  mkdirSync(join(dir, ".brain"), { recursive: true });
  mkdirSync(join(dir, "admiral", "config"), { recursive: true });

  // Add some hook files
  writeFileSync(
    join(dir, ".hooks", "pre_tool_use.sh"),
    "#!/bin/bash\nset -euo pipefail\necho 'checking...'\n",
  );
  writeFileSync(
    join(dir, ".hooks", "post_tool_use.sh"),
    "#!/bin/bash\nset -euo pipefail\necho 'logging...'\n",
  );

  // Add standing orders
  writeFileSync(
    join(dir, "admiral", "standing-orders", "so_01.md"),
    "# Standing Order 1\nAdmiral framework standing order.\n",
  );

  // Add some control-plane files
  for (let i = 0; i < 5; i++) {
    writeFileSync(
      join(dir, "control-plane", "src", `module${i}.ts`),
      `export const mod${i} = ${i};\n`,
    );
  }

  return dir;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ModuleRater", () => {
  let tmpDir: string;

  before(() => {
    tmpDir = makeTempProject();
  });

  after(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("rateAll returns array of ModuleRating", () => {
    const rater = new ModuleRater(tmpDir);
    const ratings = rater.rateAll();
    assert.ok(Array.isArray(ratings), "returns array");
    assert.ok(ratings.length > 0, "non-empty ratings");
  });

  it("each module rating has required fields", () => {
    const rater = new ModuleRater(tmpDir);
    const ratings = rater.rateAll();

    for (const r of ratings) {
      assert.ok(r.module, "has module path");
      assert.ok(["critical", "standard", "support"].includes(r.classification));
      assert.ok(
        ["ADM-1", "ADM-2", "ADM-3", "ADM-4", "ADM-5"].includes(r.tier),
        `valid tier: ${r.tier}`,
      );
      assert.ok(r.overallScore >= 0 && r.overallScore <= 100, "score in range");
      assert.equal(r.dimensionScores.length, 7, "7 dimension scores");
      assert.ok(typeof r.capsProjectRating === "boolean");
    }
  });

  it("critical modules have capsProjectRating=true", () => {
    const rater = new ModuleRater(tmpDir);
    const ratings = rater.rateAll();
    const critical = ratings.filter((r) => r.classification === "critical");
    for (const r of critical) {
      assert.ok(r.capsProjectRating, `critical module ${r.module} caps project rating`);
    }
  });

  it("support modules have capsProjectRating=false", () => {
    const rater = new ModuleRater(tmpDir);
    const ratings = rater.rateAll();
    const support = ratings.filter((r) => r.classification === "support");
    for (const r of support) {
      assert.ok(!r.capsProjectRating, `support module ${r.module} does not cap project`);
    }
  });

  it("rateModule rates a specific module", () => {
    const rater = new ModuleRater(tmpDir);
    const mod: ModuleDefinition = {
      path: join(tmpDir, ".hooks"),
      name: "Hooks",
      classification: "critical",
      isCritical: true,
    };
    const rating = rater.rateModule(mod);
    assert.equal(rating.classification, "critical");
    assert.ok(rating.overallScore >= 0);
    assert.ok(rating.capsProjectRating);
  });

  it("applyModuleCaps: critical module at ADM-4 caps project at ADM-3", () => {
    const rater = new ModuleRater(tmpDir);

    const moduleRatings = [
      {
        module: "/hooks",
        classification: "critical" as const,
        tier: "ADM-4" as const,
        dimensionScores: [],
        overallScore: 45,
        capsProjectRating: true,
      },
    ];

    const { effectiveTier, cappedBy } = rater.applyModuleCaps("ADM-2", moduleRatings);
    assert.equal(effectiveTier, "ADM-3", "ADM-4 critical module caps at ADM-3");
    assert.equal(cappedBy.length, 1, "one module caused the cap");
  });

  it("applyModuleCaps: critical module at ADM-2 does not cap ADM-2 project", () => {
    const rater = new ModuleRater(tmpDir);
    const moduleRatings = [
      {
        module: "/hooks",
        classification: "critical" as const,
        tier: "ADM-2" as const,
        dimensionScores: [],
        overallScore: 82,
        capsProjectRating: true,
      },
    ];
    const { effectiveTier, cappedBy } = rater.applyModuleCaps("ADM-2", moduleRatings);
    assert.equal(effectiveTier, "ADM-2", "ADM-2 module does not cap ADM-2 project");
    assert.equal(cappedBy.length, 0);
  });

  it("applyModuleCaps: critical module at ADM-5 caps project at ADM-4", () => {
    const rater = new ModuleRater(tmpDir);
    const moduleRatings = [
      {
        module: "/governance",
        classification: "critical" as const,
        tier: "ADM-5" as const,
        dimensionScores: [],
        overallScore: 20,
        capsProjectRating: true,
      },
    ];
    const { effectiveTier } = rater.applyModuleCaps("ADM-2", moduleRatings);
    assert.equal(effectiveTier, "ADM-4", "ADM-5 critical module caps at ADM-4");
  });

  it("applyModuleCaps: non-critical module does not cap project", () => {
    const rater = new ModuleRater(tmpDir);
    const moduleRatings = [
      {
        module: "/docs",
        classification: "support" as const,
        tier: "ADM-5" as const,
        dimensionScores: [],
        overallScore: 5,
        capsProjectRating: false,
      },
    ];
    const { effectiveTier, cappedBy } = rater.applyModuleCaps("ADM-2", moduleRatings);
    assert.equal(effectiveTier, "ADM-2", "support module does not cap project");
    assert.equal(cappedBy.length, 0);
  });

  it("getProjectTierWithModuleCaps applies caps", () => {
    const rater = new ModuleRater(tmpDir);
    const moduleRatings = [
      {
        module: "/hooks",
        classification: "critical" as const,
        tier: "ADM-4" as const,
        dimensionScores: [],
        overallScore: 45,
        capsProjectRating: true,
      },
    ];
    const tier = rater.getProjectTierWithModuleCaps("ADM-1", moduleRatings);
    assert.equal(tier, "ADM-3", "multiple caps applied correctly");
  });

  it("dimension scores are in valid range 0-100", () => {
    const rater = new ModuleRater(tmpDir);
    const ratings = rater.rateAll();
    for (const mod of ratings) {
      for (const ds of mod.dimensionScores) {
        assert.ok(
          ds.score >= 0 && ds.score <= 100,
          `${mod.module} dimension ${ds.dimensionId}: score ${ds.score} out of range`,
        );
      }
    }
  });
});
