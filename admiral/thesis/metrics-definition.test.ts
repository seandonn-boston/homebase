/**
 * Tests for Thesis Metrics Definition (TV-01)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  THESIS_CLAIMS,
  THESIS_METRICS,
  assessMetric,
  assessClaim,
  formatMetricsDefinition,
  type ThesisClaim,
} from "./metrics-definition";

// ---------------------------------------------------------------------------
// Thesis Claims
// ---------------------------------------------------------------------------

describe("Thesis Claims", () => {
  it("defines exactly 2 claims", () => {
    assert.equal(THESIS_CLAIMS.length, 2);
  });

  it("enforcement-beats-advisory claim has metrics", () => {
    const claim = THESIS_CLAIMS.find((c) => c.id === "enforcement-beats-advisory");
    assert.ok(claim);
    assert.ok(claim!.metrics.length >= 5);
    assert.ok(claim!.statement.includes("enforcement"));
    assert.ok(claim!.operationalDefinition.includes("advisory"));
  });

  it("agents-as-workforce claim has metrics", () => {
    const claim = THESIS_CLAIMS.find((c) => c.id === "agents-as-workforce");
    assert.ok(claim);
    assert.ok(claim!.metrics.length >= 5);
  });

  it("all referenced metric IDs exist in THESIS_METRICS", () => {
    const metricIds = new Set(THESIS_METRICS.map((m) => m.id));
    for (const claim of THESIS_CLAIMS) {
      for (const ref of claim.metrics) {
        assert.ok(metricIds.has(ref), `claim ${claim.id} references unknown metric ${ref}`);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Thesis Metrics
// ---------------------------------------------------------------------------

describe("Thesis Metrics", () => {
  it("defines 12 metrics across both claims", () => {
    assert.equal(THESIS_METRICS.length, 12);
  });

  it("each metric has required fields", () => {
    for (const m of THESIS_METRICS) {
      assert.ok(m.id, `missing id`);
      assert.ok(m.name, `missing name for ${m.id}`);
      assert.ok(m.description, `missing description for ${m.id}`);
      assert.ok(m.measurementMethod, `missing measurement method for ${m.id}`);
      assert.ok(m.unit, `missing unit for ${m.id}`);
      assert.ok(m.nullHypothesis, `missing null hypothesis for ${m.id}`);
      assert.equal(typeof m.evidenceForThreshold, "number");
      assert.equal(typeof m.evidenceAgainstThreshold, "number");
      assert.ok(m.minimumSampleSize > 0, `minimum sample size must be > 0 for ${m.id}`);
    }
  });

  it("metric IDs are unique", () => {
    const ids = THESIS_METRICS.map((m) => m.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("enforcement-beats-advisory has 6 metrics", () => {
    const count = THESIS_METRICS.filter((m) => m.claim === "enforcement-beats-advisory").length;
    assert.equal(count, 6);
  });

  it("agents-as-workforce has 6 metrics", () => {
    const count = THESIS_METRICS.filter((m) => m.claim === "agents-as-workforce").length;
    assert.equal(count, 6);
  });

  it("thresholds are logically ordered", () => {
    for (const m of THESIS_METRICS) {
      if (m.higherSupportsThesis) {
        assert.ok(
          m.evidenceForThreshold > m.evidenceAgainstThreshold,
          `${m.id}: for-threshold (${m.evidenceForThreshold}) should be > against-threshold (${m.evidenceAgainstThreshold})`,
        );
      } else {
        assert.ok(
          m.evidenceForThreshold < m.evidenceAgainstThreshold,
          `${m.id}: for-threshold (${m.evidenceForThreshold}) should be < against-threshold (${m.evidenceAgainstThreshold})`,
        );
      }
    }
  });
});

// ---------------------------------------------------------------------------
// assessMetric
// ---------------------------------------------------------------------------

describe("assessMetric", () => {
  const violationMetric = THESIS_METRICS.find((m) => m.id === "violation-rate-reduction")!;
  const overheadMetric = THESIS_METRICS.find((m) => m.id === "governance-overhead-ratio")!;

  it("returns supports when value exceeds for-threshold (higher-is-better)", () => {
    const result = assessMetric(violationMetric, 60, 20);
    assert.equal(result.verdict, "supports");
    assert.equal(result.metricId, "violation-rate-reduction");
  });

  it("returns contradicts when value below against-threshold (higher-is-better)", () => {
    const result = assessMetric(violationMetric, 5, 20);
    assert.equal(result.verdict, "contradicts");
  });

  it("returns inconclusive between thresholds", () => {
    const result = assessMetric(violationMetric, 30, 20);
    assert.equal(result.verdict, "inconclusive");
  });

  it("returns insufficient-data when no value", () => {
    const result = assessMetric(violationMetric, null, 0);
    assert.equal(result.verdict, "insufficient-data");
  });

  it("returns insufficient-data when sample too small", () => {
    const result = assessMetric(violationMetric, 60, 3);
    assert.equal(result.verdict, "insufficient-data");
  });

  it("handles lower-is-better metrics (overhead)", () => {
    const supports = assessMetric(overheadMetric, 15, 20);
    assert.equal(supports.verdict, "supports");

    const contradicts = assessMetric(overheadMetric, 50, 20);
    assert.equal(contradicts.verdict, "contradicts");
  });

  it("confidence scales with sample size", () => {
    const low = assessMetric(violationMetric, 60, 10);
    assert.equal(low.confidence, "medium");

    const high = assessMetric(violationMetric, 60, 50);
    assert.equal(high.confidence, "high");
  });
});

// ---------------------------------------------------------------------------
// assessClaim
// ---------------------------------------------------------------------------

describe("assessClaim", () => {
  it("returns insufficient-data when most metrics lack data", () => {
    const result = assessClaim("enforcement-beats-advisory", new Map());
    assert.equal(result.overallVerdict, "insufficient-data");
  });

  it("returns supports when majority of metrics support", () => {
    const measurements = new Map([
      ["violation-rate-reduction", { value: 60, sampleSize: 20 }],
      ["violation-severity-reduction", { value: 1.5, sampleSize: 20 }],
      ["first-pass-quality-improvement", { value: 15, sampleSize: 20 }],
      ["completion-time-impact", { value: 5, sampleSize: 20 }],
      ["escalation-rate-impact", { value: 1.5, sampleSize: 20 }],
      ["false-positive-rate", { value: 3, sampleSize: 60 }],
    ]);
    const result = assessClaim("enforcement-beats-advisory", measurements);
    assert.equal(result.overallVerdict, "supports");
    assert.ok(result.summary.includes("support"));
  });

  it("returns contradicts when majority contradict", () => {
    const measurements = new Map([
      ["violation-rate-reduction", { value: 5, sampleSize: 20 }],
      ["violation-severity-reduction", { value: 0.1, sampleSize: 20 }],
      ["first-pass-quality-improvement", { value: -10, sampleSize: 20 }],
      ["completion-time-impact", { value: 40, sampleSize: 20 }],
      ["escalation-rate-impact", { value: 6, sampleSize: 20 }],
      ["false-positive-rate", { value: 30, sampleSize: 60 }],
    ]);
    const result = assessClaim("enforcement-beats-advisory", measurements);
    assert.equal(result.overallVerdict, "contradicts");
  });

  it("returns inconclusive for mixed evidence", () => {
    const measurements = new Map([
      ["violation-rate-reduction", { value: 60, sampleSize: 20 }],
      ["violation-severity-reduction", { value: 0.1, sampleSize: 20 }],
      ["first-pass-quality-improvement", { value: 15, sampleSize: 20 }],
      ["completion-time-impact", { value: 40, sampleSize: 20 }],
      ["escalation-rate-impact", { value: 1.5, sampleSize: 20 }],
      ["false-positive-rate", { value: 30, sampleSize: 60 }],
    ]);
    const result = assessClaim("enforcement-beats-advisory", measurements);
    assert.ok(
      result.overallVerdict === "inconclusive" || result.overallVerdict === "contradicts",
      `Expected inconclusive or contradicts, got ${result.overallVerdict}`,
    );
  });
});

// ---------------------------------------------------------------------------
// formatMetricsDefinition
// ---------------------------------------------------------------------------

describe("formatMetricsDefinition", () => {
  it("produces markdown with claims and metrics", () => {
    const md = formatMetricsDefinition();
    assert.ok(md.includes("# Admiral Thesis Metrics Definition"));
    assert.ok(md.includes("Thesis Claims"));
    assert.ok(md.includes("Metric Definitions"));
    assert.ok(md.includes("enforcement"));
    assert.ok(md.includes("workforce"));
    assert.ok(md.includes("| Metric |"));
  });
});
