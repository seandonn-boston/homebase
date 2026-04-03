/**
 * Admiral Framework — Structured Logger (OB-01)
 *
 * JSON-structured logging for the control plane.
 * Replaces console.log with structured output including
 * timestamp, level, component, correlation_id, message, and context.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  correlation_id: string;
  message: string;
  context: Record<string, unknown>;
}

const LEVEL_ORDINALS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export class StructuredLogger {
  private component: string;
  private minLevel: LogLevel;
  private correlationId: string;
  private logFile: string | null;
  private logDir: string | null;

  constructor(opts: {
    component: string;
    minLevel?: LogLevel;
    correlationId?: string;
    logDir?: string;
  }) {
    this.component = opts.component;
    this.minLevel = opts.minLevel ?? "info";
    this.correlationId = opts.correlationId ?? "";
    this.logDir = opts.logDir ?? null;
    this.logFile = this.logDir ? path.join(this.logDir, "admiral.jsonl") : null;
  }

  /** Update correlation ID (e.g., when a new session starts) */
  setCorrelationId(id: string): void {
    this.correlationId = id;
  }

  /** Create a child logger with a different component name */
  child(component: string): StructuredLogger {
    return new StructuredLogger({
      component,
      minLevel: this.minLevel,
      correlationId: this.correlationId,
      logDir: this.logDir ?? undefined,
    });
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.log("error", message, context);
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.log("fatal", message, context);
  }

  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    if (LEVEL_ORDINALS[level] < LEVEL_ORDINALS[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      correlation_id: this.correlationId,
      message,
      context: context ?? {},
    };

    const line = JSON.stringify(entry);

    // Write to stderr for real-time visibility
    process.stderr.write(`${line}\n`);

    // Append to log file if configured
    if (this.logFile && this.logDir) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
        fs.appendFileSync(this.logFile, `${line}\n`);
      } catch {
        // Logging should never crash the application
      }
    }
  }
}

/** Parse a JSONL log file into LogEntry array */
export function parseLogFile(filePath: string): LogEntry[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8").trim();
  if (!content) return [];
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as LogEntry);
}
