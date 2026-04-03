/**
 * Admiral Framework — Rating History (RT-05)
 *
 * RatingHistory class with append-only storage.
 * Track per-dimension scores over time with commit attribution.
 * append(report), getHistory(since?), getTrend(dimension, window), getLatest()
 * Persist to JSON file.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { DimensionId, RatingReport, RatingTierCode } from "./types";

// ---------------------------------------------------------------------------
// History entry
// ---------------------------------------------------------------------------

export interface HistoryEntry {
  /** Report ID */
  reportId: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Entity rated */
  entity: string;
  /** Tier at time of rating */
  tier: RatingTierCode;
  /** Full rating label (e.g. ADM-2-SA) */
  ratingLabel: string;
  /** Overall score */
  overallScore: number;
  /** Per-dimension scores at this point in time */
  dimensionScores: Record<DimensionId, number>;
  /** Commit SHA at time of rating */
  commitSha?: string;
  /** Number of active caps */
  activeCapsCount: number;
}

// ---------------------------------------------------------------------------
// Trend data
// ---------------------------------------------------------------------------

export interface TrendPoint {
  timestamp: string;
  score: number;
  commitSha?: string;
}

export interface TrendResult {
  dimension: DimensionId | "overall";
  window: number;
  points: TrendPoint[];
  /** Average score over window */
  average: number;
  /** Score change from first to last point */
  delta: number;
  /** "improving" | "declining" | "stable" */
  direction: "improving" | "declining" | "stable";
}

// ---------------------------------------------------------------------------
// Persisted file format
// ---------------------------------------------------------------------------

interface HistoryFile {
  version: 1;
  entries: HistoryEntry[];
}

// ---------------------------------------------------------------------------
// RatingHistory
// ---------------------------------------------------------------------------

export class RatingHistory {
  private filePath: string;
  private entries: HistoryEntry[];

  constructor(filePath: string) {
    this.filePath = filePath;
    this.entries = this.load();
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Append a new rating report to history (append-only).
   * Entries are stored in chronological order; cannot be modified or deleted.
   */
  append(report: RatingReport): HistoryEntry {
    const entry: HistoryEntry = {
      reportId: report.id,
      timestamp: report.generatedAt,
      entity: report.entity,
      tier: report.tier,
      ratingLabel: report.ratingLabel,
      overallScore: report.overallScore,
      dimensionScores: Object.fromEntries(
        report.dimensionScores.map((ds) => [ds.dimensionId, ds.score]),
      ) as Record<DimensionId, number>,
      commitSha: report.commitSha,
      activeCapsCount: report.activeCaps.length,
    };

    this.entries.push(entry);
    this.persist();
    return entry;
  }

  /**
   * Get all history entries, optionally filtered by a start date.
   * @param since ISO 8601 date string — only return entries at or after this date
   */
  getHistory(since?: string): HistoryEntry[] {
    if (!since) return [...this.entries];
    const sinceMs = new Date(since).getTime();
    return this.entries.filter(
      (e) => new Date(e.timestamp).getTime() >= sinceMs,
    );
  }

  /**
   * Get the most recent rating entry.
   * Returns null if no entries exist.
   */
  getLatest(): HistoryEntry | null {
    if (this.entries.length === 0) return null;
    return this.entries[this.entries.length - 1];
  }

  /**
   * Get trend data for a specific dimension (or "overall") over a window of N entries.
   * @param dimension The dimension ID or "overall"
   * @param window Number of most recent entries to include
   */
  getTrend(
    dimension: DimensionId | "overall",
    window: number,
  ): TrendResult {
    const recent = this.entries.slice(-Math.max(1, window));

    const points: TrendPoint[] = recent.map((e) => ({
      timestamp: e.timestamp,
      score:
        dimension === "overall"
          ? e.overallScore
          : (e.dimensionScores[dimension as DimensionId] ?? 0),
      commitSha: e.commitSha,
    }));

    const average =
      points.length > 0
        ? points.reduce((sum, p) => sum + p.score, 0) / points.length
        : 0;

    const delta =
      points.length >= 2
        ? points[points.length - 1].score - points[0].score
        : 0;

    let direction: "improving" | "declining" | "stable";
    if (delta > 2) direction = "improving";
    else if (delta < -2) direction = "declining";
    else direction = "stable";

    return {
      dimension,
      window,
      points,
      average: Math.round(average * 10) / 10,
      delta: Math.round(delta * 10) / 10,
      direction,
    };
  }

  /**
   * Get the number of history entries.
   */
  get size(): number {
    return this.entries.length;
  }

  /**
   * Check if the rating has regressed between two entries.
   * Returns true if tier dropped or overall score declined by more than threshold.
   */
  hasRegressed(
    previous: HistoryEntry,
    current: HistoryEntry,
    scoreThreshold = 5,
  ): boolean {
    if (tierRank(current.tier) < tierRank(previous.tier)) return true;
    if (previous.overallScore - current.overallScore > scoreThreshold)
      return true;
    return false;
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  private load(): HistoryEntry[] {
    if (!existsSync(this.filePath)) return [];
    try {
      const raw = readFileSync(this.filePath, "utf8");
      const data = JSON.parse(raw) as HistoryFile;
      if (data.version !== 1 || !Array.isArray(data.entries)) return [];
      return data.entries;
    } catch {
      return [];
    }
  }

  private persist(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const data: HistoryFile = { version: 1, entries: this.entries };
    writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tierRank(tier: RatingTierCode): number {
  const ranks: Record<RatingTierCode, number> = {
    "ADM-1": 5,
    "ADM-2": 4,
    "ADM-3": 3,
    "ADM-4": 2,
    "ADM-5": 1,
  };
  return ranks[tier];
}
