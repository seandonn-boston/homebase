/**
 * Admiral Framework — Enhanced Structured Logging (OB-01)
 *
 * Extends the base logger with trace correlation, in-memory queryable
 * log buffer, and span-level context propagation.
 */

export interface StructuredLogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error" | "fatal";
  component: string;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  message: string;
  context: Record<string, unknown>;
}

export type StructuredLogLevel = StructuredLogEntry["level"];

const LEVEL_ORDINALS: Record<StructuredLogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

export interface StructuredLogFilter {
  level?: StructuredLogLevel;
  component?: string;
  since?: number;
}

/**
 * Enhanced structured logger with in-memory queryable buffer,
 * correlation ID propagation, and trace context linking.
 */
export class EnhancedStructuredLogger {
  private component: string;
  private correlationId?: string;
  private traceId?: string;
  private spanId?: string;
  private minLevel: StructuredLogLevel;
  private entries: StructuredLogEntry[] = [];
  private maxEntries: number;

  constructor(component: string, opts?: { minLevel?: StructuredLogLevel; maxEntries?: number }) {
    this.component = component;
    this.minLevel = opts?.minLevel ?? "debug";
    this.maxEntries = opts?.maxEntries ?? 10_000;
  }

  log(
    level: StructuredLogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      correlationId: this.correlationId,
      traceId: this.traceId,
      spanId: this.spanId,
      message,
      context: context ?? {},
    };

    if (LEVEL_ORDINALS[level] >= LEVEL_ORDINALS[this.minLevel]) {
      this.entries.push(entry);
      if (this.entries.length > this.maxEntries) {
        this.entries.splice(0, this.entries.length - this.maxEntries);
      }
    }

    return entry;
  }

  debug(message: string, context?: Record<string, unknown>): StructuredLogEntry {
    return this.log("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): StructuredLogEntry {
    return this.log("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): StructuredLogEntry {
    return this.log("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): StructuredLogEntry {
    return this.log("error", message, context);
  }

  fatal(message: string, context?: Record<string, unknown>): StructuredLogEntry {
    return this.log("fatal", message, context);
  }

  /**
   * Return a new logger with the given correlation ID set.
   * The child gets its own entries array (independent of the parent).
   */
  withCorrelation(correlationId: string): EnhancedStructuredLogger {
    const child = new EnhancedStructuredLogger(this.component, {
      minLevel: this.minLevel,
      maxEntries: this.maxEntries,
    });
    child.correlationId = correlationId;
    child.traceId = this.traceId;
    child.spanId = this.spanId;
    return child;
  }

  /**
   * Return a new logger with trace context set.
   * The child gets its own entries array (independent of the parent).
   */
  withTrace(traceId: string, spanId: string): EnhancedStructuredLogger {
    const child = new EnhancedStructuredLogger(this.component, {
      minLevel: this.minLevel,
      maxEntries: this.maxEntries,
    });
    child.correlationId = this.correlationId;
    child.traceId = traceId;
    child.spanId = spanId;
    return child;
  }

  /**
   * Query the in-memory log buffer with optional filters.
   */
  getEntries(filter?: StructuredLogFilter): StructuredLogEntry[] {
    let result = this.entries;

    if (filter?.level) {
      const minOrd = LEVEL_ORDINALS[filter.level];
      result = result.filter((e) => LEVEL_ORDINALS[e.level] >= minOrd);
    }

    if (filter?.component) {
      const comp = filter.component;
      result = result.filter((e) => e.component === comp);
    }

    if (filter?.since) {
      const since = filter.since;
      result = result.filter((e) => new Date(e.timestamp).getTime() >= since);
    }

    return result;
  }

  /** Clear the in-memory buffer */
  clear(): void {
    this.entries.length = 0;
  }
}
