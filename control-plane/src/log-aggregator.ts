/**
 * Admiral Framework — Log Aggregation (OB-06)
 *
 * Centralizes logs from hooks, control plane, and brain into
 * a single queryable store with rotation.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { LogEntry, LogLevel } from "./logger";

export interface LogQuery {
  startTime?: string;
  endTime?: string;
  component?: string;
  level?: LogLevel;
  correlationId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface LogQueryResult {
  entries: LogEntry[];
  total: number;
  query: LogQuery;
}

export class LogAggregator {
  private logDir: string;
  private maxFileSizeBytes: number;
  private maxRetainedFiles: number;

  constructor(opts: {
    logDir: string;
    maxFileSizeBytes?: number;
    maxRetainedFiles?: number;
  }) {
    this.logDir = opts.logDir;
    this.maxFileSizeBytes = opts.maxFileSizeBytes ?? 10_485_760; // 10MB
    this.maxRetainedFiles = opts.maxRetainedFiles ?? 5;
  }

  /** Ingest a log entry into the aggregated store */
  ingest(entry: LogEntry): void {
    const logFile = path.join(this.logDir, "admiral.jsonl");
    try {
      fs.mkdirSync(this.logDir, { recursive: true });

      // Check rotation
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size >= this.maxFileSizeBytes) {
          this.rotate(logFile);
        }
      }

      fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
    } catch {
      // Log aggregation should never crash
    }
  }

  /** Query logs with filters */
  query(q: LogQuery): LogQueryResult {
    const entries = this.loadEntries();
    let filtered = entries;

    if (q.startTime) {
      filtered = filtered.filter((e) => e.timestamp >= q.startTime!);
    }
    if (q.endTime) {
      filtered = filtered.filter((e) => e.timestamp <= q.endTime!);
    }
    if (q.component) {
      filtered = filtered.filter((e) => e.component === q.component);
    }
    if (q.level) {
      filtered = filtered.filter((e) => e.level === q.level);
    }
    if (q.correlationId) {
      filtered = filtered.filter(
        (e) => e.correlation_id === q.correlationId,
      );
    }
    if (q.search) {
      const term = q.search.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.message.toLowerCase().includes(term) ||
          JSON.stringify(e.context).toLowerCase().includes(term),
      );
    }

    const total = filtered.length;
    const offset = q.offset ?? 0;
    const limit = q.limit ?? 100;
    filtered = filtered.slice(offset, offset + limit);

    return { entries: filtered, total, query: q };
  }

  /** Get distinct components in logs */
  getComponents(): string[] {
    const entries = this.loadEntries();
    return [...new Set(entries.map((e) => e.component))].sort();
  }

  /** Get log statistics */
  getStats(): {
    totalEntries: number;
    byLevel: Record<string, number>;
    byComponent: Record<string, number>;
    oldestEntry: string | null;
    newestEntry: string | null;
  } {
    const entries = this.loadEntries();
    const byLevel: Record<string, number> = {};
    const byComponent: Record<string, number> = {};

    for (const e of entries) {
      byLevel[e.level] = (byLevel[e.level] ?? 0) + 1;
      byComponent[e.component] = (byComponent[e.component] ?? 0) + 1;
    }

    return {
      totalEntries: entries.length,
      byLevel,
      byComponent,
      oldestEntry: entries.length > 0 ? entries[0].timestamp : null,
      newestEntry:
        entries.length > 0 ? entries[entries.length - 1].timestamp : null,
    };
  }

  private loadEntries(): LogEntry[] {
    const logFile = path.join(this.logDir, "admiral.jsonl");
    if (!fs.existsSync(logFile)) return [];

    try {
      const content = fs.readFileSync(logFile, "utf-8").trim();
      if (!content) return [];
      return content
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => JSON.parse(line) as LogEntry);
    } catch {
      return [];
    }
  }

  private rotate(logFile: string): void {
    // Shift existing rotated files
    for (let i = this.maxRetainedFiles - 1; i >= 1; i--) {
      const from = `${logFile}.${i}`;
      const to = `${logFile}.${i + 1}`;
      if (fs.existsSync(from)) {
        if (i + 1 >= this.maxRetainedFiles) {
          fs.unlinkSync(from);
        } else {
          fs.renameSync(from, to);
        }
      }
    }

    // Rotate current to .1
    fs.renameSync(logFile, `${logFile}.1`);
  }
}
