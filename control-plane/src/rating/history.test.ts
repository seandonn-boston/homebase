/**
 * Tests for Rating History (RT-05)
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { RatingHistory } from "./history";
import type { RatingReport } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReport(overrides: Partial<RatingReport> = {}): RatingReport {
  const now = new Date().toISOString();
  const valid = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString();
  return {
    id: `rat_${Math.random().toString(36).slice(2, 10)}`,
    generatedAt: now,
    entity: "test-fleet",
    tier: "ADM-3",
    certificationSuffix: "-SA",
    ratingLabel: "ADM-3-SA",
    overallScore: 65,
    dimensionScores: [
      {
        dimensionId: "enforcement_coverage",
        score: 70,
        weightedContribution: 14,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "hook_quality",
        score: 60,
        weightedContribution: 9,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "standing_orders_compliance",
        score: 65,
        weightedContribution: 13,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "brain_utilization",
        score: 55,
        weightedContribution: 5.5,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "fleet_governance",
        score: 68,
        weightedContribution: 10.2,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "security_posture",
        score: 62,
        weightedContribution: 6.2,
        evidence: "e",
        capTriggered: false,
      },
      {
        dimensionId: "observability_maturity",
        score: 70,
        weightedContribution: 7,
        evidence: "e",
        capTriggered: false,
      },
    ],
    moduleRatings: [],
    activeCaps: [],
    recommendations: [],
    validUntil: valid,
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RatingHistory", () => {
  let tmpDir: string;
  let historyPath: string;

  before(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "rating-history-test-"));
    historyPath = join(tmpDir, "rating-history.json");
  });

  after(() => {
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("starts empty when file does not exist", () => {
    const history = new RatingHistory(join(tmpDir, "nonexistent.json"));
    assert.equal(history.size, 0);
    assert.equal(history.getLatest(), null);
  });

  it("append adds an entry and returns HistoryEntry", () => {
    const history = new RatingHistory(historyPath);
    const report = makeReport();
    const entry = history.append(report);

    assert.equal(entry.reportId, report.id);
    assert.equal(entry.tier, "ADM-3");
    assert.equal(entry.overallScore, 65);
    assert.equal(history.size, 1);
  });

  it("persists entries to disk", () => {
    const path = join(tmpDir, "persist-test.json");
    const h1 = new RatingHistory(path);
    h1.append(makeReport({ id: "rat_aaa", overallScore: 70, tier: "ADM-3" }));
    h1.append(makeReport({ id: "rat_bbb", overallScore: 75, tier: "ADM-3" }));

    const h2 = new RatingHistory(path);
    assert.equal(h2.size, 2, "reloaded history has 2 entries");
    assert.equal(h2.getLatest()?.reportId, "rat_bbb");
  });

  it("getLatest returns most recent entry", () => {
    const path = join(tmpDir, "latest-test.json");
    const history = new RatingHistory(path);
    history.append(makeReport({ id: "rat_x1", overallScore: 60 }));
    history.append(makeReport({ id: "rat_x2", overallScore: 75 }));
    history.append(makeReport({ id: "rat_x3", overallScore: 80 }));

    const latest = history.getLatest();
    assert.equal(latest?.reportId, "rat_x3");
    assert.equal(latest?.overallScore, 80);
  });

  it("getHistory returns all entries when no filter", () => {
    const path = join(tmpDir, "all-history-test.json");
    const history = new RatingHistory(path);
    history.append(makeReport());
    history.append(makeReport());
    history.append(makeReport());

    assert.equal(history.getHistory().length, 3);
  });

  it("getHistory filters by since date", () => {
    const path = join(tmpDir, "since-test.json");
    const history = new RatingHistory(path);

    // Add old entry (2024)
    history.append(makeReport({ generatedAt: "2024-01-15T10:00:00.000Z", id: "rat_old" }));
    // Add recent entry
    history.append(makeReport({ generatedAt: new Date().toISOString(), id: "rat_new" }));

    const recent = history.getHistory("2025-01-01T00:00:00.000Z");
    assert.equal(recent.length, 1, "only recent entry returned");
    assert.equal(recent[0].reportId, "rat_new");
  });

  it("getTrend for overall returns correct points", () => {
    const path = join(tmpDir, "trend-test.json");
    const history = new RatingHistory(path);
    history.append(makeReport({ overallScore: 60 }));
    history.append(makeReport({ overallScore: 65 }));
    history.append(makeReport({ overallScore: 70 }));
    history.append(makeReport({ overallScore: 75 }));

    const trend = history.getTrend("overall", 4);
    assert.equal(trend.points.length, 4);
    assert.equal(trend.direction, "improving");
    assert.ok(trend.delta > 0, "delta is positive");
  });

  it("getTrend direction: declining when scores drop", () => {
    const path = join(tmpDir, "trend-decline.json");
    const history = new RatingHistory(path);
    history.append(makeReport({ overallScore: 80 }));
    history.append(makeReport({ overallScore: 75 }));
    history.append(makeReport({ overallScore: 65 }));

    const trend = history.getTrend("overall", 3);
    assert.equal(trend.direction, "declining");
    assert.ok(trend.delta < 0);
  });

  it("getTrend direction: stable when change <= 2", () => {
    const path = join(tmpDir, "trend-stable.json");
    const history = new RatingHistory(path);
    history.append(makeReport({ overallScore: 70 }));
    history.append(makeReport({ overallScore: 71 }));
    history.append(makeReport({ overallScore: 70 }));

    const trend = history.getTrend("overall", 3);
    assert.equal(trend.direction, "stable");
  });

  it("getTrend for specific dimension", () => {
    const path = join(tmpDir, "trend-dim.json");
    const history = new RatingHistory(path);

    const makeWithHookQuality = (score: number) =>
      makeReport({
        dimensionScores: [
          {
            dimensionId: "enforcement_coverage",
            score: 70,
            weightedContribution: 14,
            evidence: "e",
            capTriggered: false,
          },
          {
            dimensionId: "hook_quality",
            score,
            weightedContribution: score * 0.15,
            evidence: "e",
            capTriggered: false,
          },
          {
            dimensionId: "standing_orders_compliance",
            score: 65,
            weightedContribution: 13,
            evidence: "e",
            capTriggered: false,
          },
          {
            dimensionId: "brain_utilization",
            score: 55,
            weightedContribution: 5.5,
            evidence: "e",
            capTriggered: false,
          },
          {
            dimensionId: "fleet_governance",
            score: 68,
            weightedContribution: 10.2,
            evidence: "e",
            capTriggered: false,
          },
          {
            dimensionId: "security_posture",
            score: 62,
            weightedContribution: 6.2,
            evidence: "e",
            capTriggered: false,
          },
          {
            dimensionId: "observability_maturity",
            score: 70,
            weightedContribution: 7,
            evidence: "e",
            capTriggered: false,
          },
        ],
      });

    history.append(makeWithHookQuality(50));
    history.append(makeWithHookQuality(65));
    history.append(makeWithHookQuality(80));

    const trend = history.getTrend("hook_quality", 3);
    assert.equal(trend.dimension, "hook_quality");
    assert.equal(trend.direction, "improving");
    assert.equal(trend.delta, 30);
  });

  it("getTrend window limits entries returned", () => {
    const path = join(tmpDir, "trend-window.json");
    const history = new RatingHistory(path);
    for (let i = 0; i < 10; i++) {
      history.append(makeReport({ overallScore: 60 + i }));
    }

    const trend = history.getTrend("overall", 3);
    assert.equal(trend.points.length, 3, "window of 3 returns 3 points");
    assert.equal(trend.points[0].score, 67, "window takes last 3 entries");
  });

  it("hasRegressed: tier drop is regression", () => {
    const path = join(tmpDir, "regress-tier.json");
    const history = new RatingHistory(path);
    const prev = history.append(
      makeReport({ tier: "ADM-2", ratingLabel: "ADM-2", overallScore: 82 }),
    );
    const curr = history.append(
      makeReport({ tier: "ADM-3", ratingLabel: "ADM-3", overallScore: 70 }),
    );

    assert.ok(history.hasRegressed(prev, curr), "tier drop is regression");
  });

  it("hasRegressed: score drop > threshold is regression", () => {
    const path = join(tmpDir, "regress-score.json");
    const history = new RatingHistory(path);
    const prev = history.append(makeReport({ tier: "ADM-3", overallScore: 75 }));
    const curr = history.append(makeReport({ tier: "ADM-3", overallScore: 68 }));

    assert.ok(history.hasRegressed(prev, curr, 5), "7 point drop is regression");
    assert.ok(!history.hasRegressed(prev, curr, 10), "7 point drop not regression at threshold=10");
  });

  it("stores dimensionScores as record in entry", () => {
    const path = join(tmpDir, "dim-record.json");
    const history = new RatingHistory(path);
    const entry = history.append(makeReport());

    assert.ok("enforcement_coverage" in entry.dimensionScores);
    assert.equal(entry.dimensionScores.enforcement_coverage, 70);
  });
});
