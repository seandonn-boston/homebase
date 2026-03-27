/**
 * Tests for Rating History Tracker (RT-05)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  createHistoryEntry,
  appendToHistory,
  readHistory,
  generateTrendSummary,
  formatTrendSummary,
  type HistoryEntry,
} from "./history-tracker";
import {
  type RatingReport,
  type RatingTier,
} from "./rating-model";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tmpLogPath(): string {
  const dir = join(tmpdir(), "admiral-rating-test-" + Date.now());
  mkdirSync(dir, { recursive: true });
  return join(dir, "rating_log.jsonl");
}

function makeReport(overrides: Partial<RatingReport> = {}): RatingReport {
  return {
    entity: "test",
    category: "platform",
    rating: "ADM-4" as RatingTier,
    certificationSuffix: "-SA",
    displayRating: "ADM-4-SA",
    timestamp: new Date().toISOString(),
    benchmarks: [
      { benchmarkId: "first-pass-quality", value: 65, status: "measured", source: "test" },
      { benchmarkId: "recovery-success-rate", value: 70, status: "measured", source: "test" },
      { benchmarkId: "enforcement-coverage", value: 56, status: "measured", source: "test" },
      { benchmarkId: "context-efficiency", value: 0.2, status: "measured", source: "test" },
      { benchmarkId: "governance-overhead", value: 12, status: "measured", source: "test" },
      { benchmarkId: "coordination-overhead", value: 8, status: "measured", source: "test" },
      { benchmarkId: "knowledge-reuse", value: 30, status: "measured", source: "test" },
    ],
    gateVerdicts: [],
    activeHardCaps: [],
    rationale: "test",
    conditions: [],
    recommendedImprovements: [],
    ...overrides,
  };
}

function makeEntry(rating: RatingTier, daysAgo: number, benchmarkOverrides: Record<string, number> = {}): HistoryEntry {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    timestamp: date.toISOString(),
    commitSha: "abc" + daysAgo,
    commitMessage: `test commit ${daysAgo}`,
    rating,
    displayRating: `${rating}-SA`,
    benchmarks: {
      "first-pass-quality": 65,
      "recovery-success-rate": 70,
      "enforcement-coverage": 56,
      "context-efficiency": 0.2,
      "governance-overhead": 12,
      "coordination-overhead": 8,
      "knowledge-reuse": 30,
      ...benchmarkOverrides,
    },
    activeHardCaps: 0,
    gatesEvaluated: 0,
    gatesPassed: 0,
  };
}

function writeEntries(logPath: string, entries: HistoryEntry[]): void {
  writeFileSync(logPath, entries.map((e) => JSON.stringify(e)).join("\n") + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// createHistoryEntry
// ---------------------------------------------------------------------------

describe("createHistoryEntry", () => {
  it("creates entry from rating report", () => {
    const report = makeReport();
    const entry = createHistoryEntry(report, process.cwd());
    assert.equal(entry.rating, "ADM-4");
    assert.equal(entry.displayRating, "ADM-4-SA");
    assert.ok(entry.timestamp);
    assert.ok(entry.commitSha);
    assert.equal(typeof entry.benchmarks["first-pass-quality"], "number");
  });

  it("captures benchmark values as record", () => {
    const report = makeReport();
    const entry = createHistoryEntry(report, process.cwd());
    assert.equal(entry.benchmarks["first-pass-quality"], 65);
    assert.equal(entry.benchmarks["enforcement-coverage"], 56);
  });

  it("handles insufficient-data benchmarks", () => {
    const report = makeReport({
      benchmarks: [
        { benchmarkId: "first-pass-quality", value: null, status: "insufficient-data", source: "test" },
      ],
    });
    const entry = createHistoryEntry(report, process.cwd());
    assert.equal(entry.benchmarks["first-pass-quality"], null);
  });
});

// ---------------------------------------------------------------------------
// appendToHistory / readHistory
// ---------------------------------------------------------------------------

describe("appendToHistory and readHistory", () => {
  it("round-trips entries through JSONL", () => {
    const logPath = tmpLogPath();
    const entry = makeEntry("ADM-4", 0);
    appendToHistory(entry, logPath);
    const entries = readHistory(logPath);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].rating, "ADM-4");
  });

  it("appends multiple entries", () => {
    const logPath = tmpLogPath();
    appendToHistory(makeEntry("ADM-5", 2), logPath);
    appendToHistory(makeEntry("ADM-4", 1), logPath);
    appendToHistory(makeEntry("ADM-4", 0), logPath);
    const entries = readHistory(logPath);
    assert.equal(entries.length, 3);
  });

  it("returns empty array for nonexistent file", () => {
    const entries = readHistory("/nonexistent/path/log.jsonl");
    assert.equal(entries.length, 0);
  });

  it("skips malformed lines", () => {
    const logPath = tmpLogPath();
    writeFileSync(logPath, '{"rating":"ADM-4"}\n{malformed\n{"rating":"ADM-3"}\n', "utf-8");
    const entries = readHistory(logPath);
    assert.equal(entries.length, 2);
  });

  it("creates directory if needed", () => {
    const deepPath = join(tmpdir(), "admiral-deep-" + Date.now(), "sub", "log.jsonl");
    appendToHistory(makeEntry("ADM-5", 0), deepPath);
    assert.ok(existsSync(deepPath));
  });
});

// ---------------------------------------------------------------------------
// generateTrendSummary
// ---------------------------------------------------------------------------

describe("generateTrendSummary", () => {
  it("returns empty summary for no history", () => {
    const summary = generateTrendSummary("/nonexistent/path.jsonl");
    assert.equal(summary.totalEntries, 0);
    assert.equal(summary.currentRating, null);
    assert.equal(summary.windows.length, 3);
  });

  it("generates 30/60/90-day windows", () => {
    const logPath = tmpLogPath();
    writeEntries(logPath, [
      makeEntry("ADM-5", 80),
      makeEntry("ADM-5", 50),
      makeEntry("ADM-4", 20),
      makeEntry("ADM-4", 5),
      makeEntry("ADM-4", 0),
    ]);
    const summary = generateTrendSummary(logPath);
    assert.equal(summary.windows.length, 3);
    assert.equal(summary.windows[0].label, "30-day");
    assert.equal(summary.windows[1].label, "60-day");
    assert.equal(summary.windows[2].label, "90-day");
  });

  it("detects rating transitions", () => {
    const logPath = tmpLogPath();
    writeEntries(logPath, [
      makeEntry("ADM-5", 30),
      makeEntry("ADM-4", 15),
      makeEntry("ADM-3", 0),
    ]);
    const summary = generateTrendSummary(logPath);
    assert.equal(summary.transitions.length, 2);
    assert.equal(summary.transitions[0].fromRating, "ADM-5");
    assert.equal(summary.transitions[0].toRating, "ADM-4");
    assert.equal(summary.transitions[0].direction, "upgrade");
    assert.equal(summary.transitions[1].toRating, "ADM-3");
    assert.equal(summary.transitions[1].direction, "upgrade");
  });

  it("tracks current rating", () => {
    const logPath = tmpLogPath();
    writeEntries(logPath, [
      makeEntry("ADM-5", 10),
      makeEntry("ADM-4", 0),
    ]);
    const summary = generateTrendSummary(logPath);
    assert.equal(summary.currentRating, "ADM-4");
  });

  it("detects benchmark trends", () => {
    const logPath = tmpLogPath();
    writeEntries(logPath, [
      makeEntry("ADM-4", 10, { "first-pass-quality": 50 }),
      makeEntry("ADM-4", 0, { "first-pass-quality": 70 }),
    ]);
    const summary = generateTrendSummary(logPath);
    const window30 = summary.windows[0];
    const fpqTrend = window30.benchmarkTrends.find((t) => t.benchmarkId === "first-pass-quality");
    assert.ok(fpqTrend);
    assert.equal(fpqTrend!.direction, "improving");
    assert.equal(fpqTrend!.change, 20);
  });
});

// ---------------------------------------------------------------------------
// Plateau Detection
// ---------------------------------------------------------------------------

describe("plateau detection", () => {
  it("detects plateau at 5+ consecutive same ratings", () => {
    const logPath = tmpLogPath();
    writeEntries(logPath, [
      makeEntry("ADM-4", 25),
      makeEntry("ADM-4", 20),
      makeEntry("ADM-4", 15),
      makeEntry("ADM-4", 10),
      makeEntry("ADM-4", 5),
      makeEntry("ADM-4", 0),
    ]);
    const summary = generateTrendSummary(logPath);
    assert.equal(summary.plateau.detected, true);
    assert.equal(summary.plateau.rating, "ADM-4");
    assert.equal(summary.plateau.consecutiveEntries, 6);
    assert.ok(summary.plateau.suggestions.length > 0);
  });

  it("does not detect plateau with recent change", () => {
    const logPath = tmpLogPath();
    writeEntries(logPath, [
      makeEntry("ADM-5", 15),
      makeEntry("ADM-5", 10),
      makeEntry("ADM-4", 5),
      makeEntry("ADM-4", 0),
    ]);
    const summary = generateTrendSummary(logPath);
    assert.equal(summary.plateau.detected, false);
  });

  it("provides tier-specific suggestions", () => {
    const logPath = tmpLogPath();
    writeEntries(logPath, [
      makeEntry("ADM-5", 25),
      makeEntry("ADM-5", 20),
      makeEntry("ADM-5", 15),
      makeEntry("ADM-5", 10),
      makeEntry("ADM-5", 5),
    ]);
    const summary = generateTrendSummary(logPath);
    assert.ok(summary.plateau.suggestions.some((s) => s.includes("governance hooks")));
  });
});

// ---------------------------------------------------------------------------
// formatTrendSummary
// ---------------------------------------------------------------------------

describe("formatTrendSummary", () => {
  it("produces markdown with key sections", () => {
    const logPath = tmpLogPath();
    writeEntries(logPath, [
      makeEntry("ADM-5", 30),
      makeEntry("ADM-4", 15),
      makeEntry("ADM-4", 0),
    ]);
    const summary = generateTrendSummary(logPath);
    const md = formatTrendSummary(summary);
    assert.ok(md.includes("# Rating Trend Summary"));
    assert.ok(md.includes("30-day Window"));
    assert.ok(md.includes("Rating Transitions"));
  });

  it("includes plateau alert when detected", () => {
    const logPath = tmpLogPath();
    const entries = Array.from({ length: 6 }, (_, i) => makeEntry("ADM-4", i * 5));
    writeEntries(logPath, entries);
    const summary = generateTrendSummary(logPath);
    const md = formatTrendSummary(summary);
    assert.ok(md.includes("Plateau Alert"));
  });

  it("handles empty history gracefully", () => {
    const summary = generateTrendSummary("/nonexistent.jsonl");
    const md = formatTrendSummary(summary);
    assert.ok(md.includes("Total Evaluations:** 0"));
    assert.ok(md.includes("N/A"));
  });
});
