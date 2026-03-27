/**
 * Rating History Tracker (RT-05)
 *
 * Stores every rating calculation result as append-only JSONL.
 * Tracks per-dimension scores over time. Links rating transitions
 * to specific commits. Generates trend summaries for 30/60/90-day
 * windows. Detects plateau patterns and suggests breakthrough actions.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { existsSync, readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import type { RatingTier, RatingReport, BenchmarkResult } from "./rating-model";
import { compareTiers, TIER_DEFINITIONS, CORE_BENCHMARKS } from "./rating-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  timestamp: string;
  commitSha: string;
  commitMessage: string;
  rating: RatingTier;
  displayRating: string;
  benchmarks: Record<string, number | null>;
  activeHardCaps: number;
  gatesEvaluated: number;
  gatesPassed: number;
}

export interface TrendWindow {
  label: string;
  days: number;
  entries: HistoryEntry[];
  startRating: RatingTier | null;
  endRating: RatingTier | null;
  ratingChanged: boolean;
  benchmarkTrends: BenchmarkTrend[];
}

export interface BenchmarkTrend {
  benchmarkId: string;
  name: string;
  startValue: number | null;
  endValue: number | null;
  change: number | null;
  direction: "improving" | "declining" | "stable" | "insufficient-data";
}

export interface PlateauDetection {
  detected: boolean;
  rating: RatingTier | null;
  durationDays: number;
  consecutiveEntries: number;
  suggestions: string[];
}

export interface TrendSummary {
  totalEntries: number;
  firstEntry: string | null;
  lastEntry: string | null;
  currentRating: RatingTier | null;
  windows: TrendWindow[];
  plateau: PlateauDetection;
  transitions: RatingTransition[];
}

export interface RatingTransition {
  timestamp: string;
  commitSha: string;
  fromRating: RatingTier;
  toRating: RatingTier;
  direction: "upgrade" | "downgrade";
}

// ---------------------------------------------------------------------------
// History File Operations
// ---------------------------------------------------------------------------

function safeExec(cmd: string, cwd: string): string {
  try {
    return execSync(cmd, { cwd, encoding: "utf-8", timeout: 10000, stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

/**
 * Create a history entry from a rating report.
 */
export function createHistoryEntry(
  report: RatingReport,
  rootDir: string,
): HistoryEntry {
  const commitSha = safeExec("git rev-parse --short HEAD", rootDir) || "unknown";
  const commitMessage = safeExec("git log -1 --format=%s", rootDir) || "unknown";

  const benchmarks: Record<string, number | null> = {};
  for (const b of report.benchmarks) {
    benchmarks[b.benchmarkId] = b.status === "measured" ? b.value : null;
  }

  return {
    timestamp: report.timestamp,
    commitSha,
    commitMessage: commitMessage.slice(0, 120),
    rating: report.rating,
    displayRating: report.displayRating,
    benchmarks,
    activeHardCaps: report.activeHardCaps.length,
    gatesEvaluated: report.gateVerdicts.length,
    gatesPassed: report.gateVerdicts.filter((v) => v.passed).length,
  };
}

/**
 * Append a history entry to the JSONL log file.
 */
export function appendToHistory(entry: HistoryEntry, logPath: string): void {
  const dir = dirname(logPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  appendFileSync(logPath, JSON.stringify(entry) + "\n", "utf-8");
}

/**
 * Read all history entries from the JSONL log.
 */
export function readHistory(logPath: string): HistoryEntry[] {
  if (!existsSync(logPath)) return [];

  const content = readFileSync(logPath, "utf-8");
  const entries: HistoryEntry[] = [];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as HistoryEntry);
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Trend Analysis
// ---------------------------------------------------------------------------

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
}

function filterByWindow(entries: HistoryEntry[], days: number): HistoryEntry[] {
  if (entries.length === 0) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString();
  return entries.filter((e) => e.timestamp >= cutoffStr);
}

function computeBenchmarkTrend(
  entries: HistoryEntry[],
  benchmarkId: string,
): BenchmarkTrend {
  const def = CORE_BENCHMARKS.find((b) => b.id === benchmarkId);
  const name = def?.name ?? benchmarkId;

  if (entries.length < 2) {
    return { benchmarkId, name, startValue: null, endValue: null, change: null, direction: "insufficient-data" };
  }

  const first = entries[0].benchmarks[benchmarkId] ?? null;
  const last = entries[entries.length - 1].benchmarks[benchmarkId] ?? null;

  if (first === null || last === null) {
    return { benchmarkId, name, startValue: first, endValue: last, change: null, direction: "insufficient-data" };
  }

  const change = last - first;
  const threshold = 2; // 2-point minimum change to be significant

  let direction: BenchmarkTrend["direction"];
  if (Math.abs(change) < threshold) {
    direction = "stable";
  } else if (def?.higherIsBetter) {
    direction = change > 0 ? "improving" : "declining";
  } else {
    direction = change < 0 ? "improving" : "declining";
  }

  return { benchmarkId, name, startValue: first, endValue: last, change: Math.round(change * 10) / 10, direction };
}

function computeTrendWindow(entries: HistoryEntry[], days: number, label: string): TrendWindow {
  const windowEntries = filterByWindow(entries, days);
  const benchmarkIds = CORE_BENCHMARKS.map((b) => b.id);

  return {
    label,
    days,
    entries: windowEntries,
    startRating: windowEntries.length > 0 ? windowEntries[0].rating : null,
    endRating: windowEntries.length > 0 ? windowEntries[windowEntries.length - 1].rating : null,
    ratingChanged: windowEntries.length >= 2 && windowEntries[0].rating !== windowEntries[windowEntries.length - 1].rating,
    benchmarkTrends: benchmarkIds.map((id) => computeBenchmarkTrend(windowEntries, id)),
  };
}

// ---------------------------------------------------------------------------
// Plateau Detection
// ---------------------------------------------------------------------------

function detectPlateau(entries: HistoryEntry[]): PlateauDetection {
  if (entries.length < 3) {
    return { detected: false, rating: null, durationDays: 0, consecutiveEntries: 0, suggestions: [] };
  }

  // Find the longest consecutive run of the same rating from the end
  const lastRating = entries[entries.length - 1].rating;
  let consecutiveCount = 0;

  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].rating === lastRating) {
      consecutiveCount++;
    } else {
      break;
    }
  }

  const firstSameIdx = entries.length - consecutiveCount;
  const durationDays =
    consecutiveCount >= 2
      ? daysBetween(entries[firstSameIdx].timestamp, entries[entries.length - 1].timestamp)
      : 0;

  // Plateau = same rating for 5+ entries or 14+ days
  const isPlateaued = consecutiveCount >= 5 || durationDays >= 14;

  const suggestions: string[] = [];
  if (isPlateaued) {
    const tierDef = TIER_DEFINITIONS.get(lastRating);
    suggestions.push(`Rating has been ${lastRating} (${tierDef?.grade}) for ${Math.round(durationDays)} days across ${consecutiveCount} evaluations.`);

    // Suggest based on current tier
    if (lastRating === "ADM-5") {
      suggestions.push("Start by implementing basic governance hooks and passing at least one Human Judgment Gate.");
    } else if (lastRating === "ADM-4") {
      suggestions.push("Address active hard caps first — they impose automatic ceilings.");
      suggestions.push("Pass additional Human Judgment Gates to unlock ADM-3.");
    } else if (lastRating === "ADM-3") {
      suggestions.push("Focus on enforcement coverage — ADM-2 requires >80%.");
      suggestions.push("Ensure first-pass quality exceeds 75%.");
    } else if (lastRating === "ADM-2") {
      suggestions.push("Complete attack corpus testing for ADM-1 eligibility.");
      suggestions.push("All 7 core benchmarks must meet ADM-1 thresholds.");
    }
  }

  return {
    detected: isPlateaued,
    rating: lastRating,
    durationDays: Math.round(durationDays),
    consecutiveEntries: consecutiveCount,
    suggestions,
  };
}

// ---------------------------------------------------------------------------
// Rating Transitions
// ---------------------------------------------------------------------------

function findTransitions(entries: HistoryEntry[]): RatingTransition[] {
  const transitions: RatingTransition[] = [];

  for (let i = 1; i < entries.length; i++) {
    if (entries[i].rating !== entries[i - 1].rating) {
      const direction = compareTiers(entries[i].rating, entries[i - 1].rating) < 0 ? "upgrade" : "downgrade";
      transitions.push({
        timestamp: entries[i].timestamp,
        commitSha: entries[i].commitSha,
        fromRating: entries[i - 1].rating,
        toRating: entries[i].rating,
        direction,
      });
    }
  }

  return transitions;
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Generate a complete trend summary from the history log.
 */
export function generateTrendSummary(logPath: string): TrendSummary {
  const entries = readHistory(logPath);

  return {
    totalEntries: entries.length,
    firstEntry: entries.length > 0 ? entries[0].timestamp : null,
    lastEntry: entries.length > 0 ? entries[entries.length - 1].timestamp : null,
    currentRating: entries.length > 0 ? entries[entries.length - 1].rating : null,
    windows: [
      computeTrendWindow(entries, 30, "30-day"),
      computeTrendWindow(entries, 60, "60-day"),
      computeTrendWindow(entries, 90, "90-day"),
    ],
    plateau: detectPlateau(entries),
    transitions: findTransitions(entries),
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatTrendSummary(summary: TrendSummary): string {
  const lines: string[] = [
    "# Rating Trend Summary",
    "",
    `**Total Evaluations:** ${summary.totalEntries}`,
    `**Current Rating:** ${summary.currentRating ?? "N/A"}`,
    `**First Evaluation:** ${summary.firstEntry ?? "N/A"}`,
    `**Last Evaluation:** ${summary.lastEntry ?? "N/A"}`,
  ];

  for (const window of summary.windows) {
    lines.push("", `## ${window.label} Window`);
    lines.push(`- Entries: ${window.entries.length}`);
    lines.push(`- Start: ${window.startRating ?? "N/A"} → End: ${window.endRating ?? "N/A"}`);
    if (window.ratingChanged) {
      lines.push("- **Rating changed during this window**");
    }

    const notable = window.benchmarkTrends.filter((t) => t.direction !== "stable" && t.direction !== "insufficient-data");
    if (notable.length > 0) {
      lines.push("", "| Benchmark | Direction | Change |");
      lines.push("|-----------|-----------|--------|");
      for (const t of notable) {
        lines.push(`| ${t.name} | ${t.direction} | ${t.change !== null ? (t.change > 0 ? "+" : "") + t.change : "N/A"} |`);
      }
    }
  }

  if (summary.transitions.length > 0) {
    lines.push("", "## Rating Transitions", "");
    lines.push("| Date | Commit | From | To | Direction |");
    lines.push("|------|--------|------|----|-----------|");
    for (const t of summary.transitions) {
      const date = t.timestamp.split("T")[0];
      lines.push(`| ${date} | ${t.commitSha} | ${t.fromRating} | ${t.toRating} | ${t.direction} |`);
    }
  }

  if (summary.plateau.detected) {
    lines.push("", "## Plateau Alert", "");
    for (const s of summary.plateau.suggestions) {
      lines.push(`- ${s}`);
    }
  }

  return lines.join("\n");
}
