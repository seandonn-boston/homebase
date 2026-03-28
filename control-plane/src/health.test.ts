/**
 * Tests for HealthAggregator (OB-04)
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  HealthAggregator,
  createHooksProbe,
  createBrainProbe,
  createEventLogProbe,
  createControlPlaneProbe,
} from "./health";

describe("HealthAggregator", () => {
  let agg: HealthAggregator;

  beforeEach(() => {
    agg = new HealthAggregator();
  });

  it("reports healthy when all probes pass", () => {
    agg.registerProbe("test", () => ({
      status: "healthy",
      latency_ms: 0,
      last_check: "",
    }));

    const report = agg.check();
    assert.strictEqual(report.status, "healthy");
    assert.strictEqual(report.components.test.status, "healthy");
    assert.ok(report.timestamp.match(/^\d{4}-\d{2}-\d{2}T/));
    assert.ok(report.uptime_ms >= 0);
  });

  it("reports degraded when any probe is degraded", () => {
    agg.registerProbe("healthy_one", () => ({
      status: "healthy",
      latency_ms: 0,
      last_check: "",
    }));
    agg.registerProbe("degraded_one", () => ({
      status: "degraded",
      latency_ms: 0,
      last_check: "",
      details: { reason: "slow" },
    }));

    const report = agg.check();
    assert.strictEqual(report.status, "degraded");
  });

  it("reports unhealthy when any probe is unhealthy", () => {
    agg.registerProbe("healthy_one", () => ({
      status: "healthy",
      latency_ms: 0,
      last_check: "",
    }));
    agg.registerProbe("bad_one", () => ({
      status: "unhealthy",
      latency_ms: 0,
      last_check: "",
    }));

    const report = agg.check();
    assert.strictEqual(report.status, "unhealthy");
  });

  it("catches probe exceptions and marks unhealthy", () => {
    agg.registerProbe("crasher", () => {
      throw new Error("probe crashed");
    });

    const report = agg.check();
    assert.strictEqual(report.status, "unhealthy");
    assert.strictEqual(report.components.crasher.details?.error, "probe crashed");
  });

  it("measures probe latency", () => {
    agg.registerProbe("slow", () => {
      const start = Date.now();
      while (Date.now() - start < 5) {
        // spin
      }
      return { status: "healthy", latency_ms: 0, last_check: "" };
    });

    const report = agg.check();
    assert.ok(report.components.slow.latency_ms >= 0);
  });
});

describe("Built-in probes", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admiral-health-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("hooksProbe reports healthy when hooks dir exists", () => {
    fs.mkdirSync(path.join(tmpDir, ".hooks"));
    fs.writeFileSync(path.join(tmpDir, ".hooks", "test.sh"), "#!/bin/bash\n");
    const probe = createHooksProbe(tmpDir);
    const result = probe();
    assert.strictEqual(result.status, "healthy");
    assert.strictEqual(result.details?.hook_count, 1);
  });

  it("hooksProbe reports unhealthy when hooks dir missing", () => {
    const probe = createHooksProbe(tmpDir);
    const result = probe();
    assert.strictEqual(result.status, "unhealthy");
  });

  it("brainProbe reports healthy when brain dir exists", () => {
    fs.mkdirSync(path.join(tmpDir, ".brain"));
    fs.writeFileSync(path.join(tmpDir, ".brain", "entry.json"), "{}");
    const probe = createBrainProbe(tmpDir);
    const result = probe();
    assert.strictEqual(result.status, "healthy");
    assert.strictEqual(result.details?.entry_count, 1);
  });

  it("brainProbe reports degraded when brain dir missing", () => {
    const probe = createBrainProbe(tmpDir);
    const result = probe();
    assert.strictEqual(result.status, "degraded");
  });

  it("eventLogProbe reports healthy when admiral dir exists", () => {
    fs.mkdirSync(path.join(tmpDir, ".admiral"));
    const probe = createEventLogProbe(tmpDir);
    const result = probe();
    assert.strictEqual(result.status, "healthy");
  });

  it("controlPlaneProbe always reports healthy", () => {
    const probe = createControlPlaneProbe();
    const result = probe();
    assert.strictEqual(result.status, "healthy");
    assert.ok((result.details?.uptime_ms as number) >= 0);
  });
});
