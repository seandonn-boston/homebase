/**
 * Admiral Framework — Typed Error Hierarchy (Q-06)
 *
 * Base class and domain-specific errors for structured error handling.
 * Replaces `err instanceof Error ? err.message : String(err)` patterns
 * with typed catches that preserve error context.
 */

/** Base error for all Admiral Framework errors. */
export class AdmiralError extends Error {
  /** Machine-readable error code for programmatic handling. */
  readonly code: string;

  constructor(message: string, code = "ADMIRAL_ERROR") {
    super(message);
    this.name = "AdmiralError";
    this.code = code;
    // Fix prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Thrown when a requested resource (agent, event, trace) is not found. */
export class NotFoundError extends AdmiralError {
  /** The type of resource that was not found. */
  readonly resourceType: string;
  /** The identifier that was looked up. */
  readonly resourceId: string;

  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`, "NOT_FOUND");
    this.name = "NotFoundError";
    this.resourceType = resourceType;
    this.resourceId = resourceId;
  }
}

/** Thrown when input fails validation (schema mismatch, constraint violation). */
export class ValidationError extends AdmiralError {
  /** The field or parameter that failed validation. */
  readonly field: string;

  constructor(message: string, field = "") {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.field = field;
  }
}

/** Thrown when session state is corrupt or inconsistent. */
export class StateCorruptionError extends AdmiralError {
  /** Path to the corrupted state file, if applicable. */
  readonly statePath: string;

  constructor(message: string, statePath = "") {
    super(message, "STATE_CORRUPTION");
    this.name = "StateCorruptionError";
    this.statePath = statePath;
  }
}

/** Thrown when journal/event log ingestion fails (parse errors, I/O). */
export class IngestionError extends AdmiralError {
  /** The source file or stream that failed. */
  readonly source: string;
  /** The line number where ingestion failed, if applicable. */
  readonly line: number | undefined;

  constructor(message: string, source = "", line?: number) {
    super(message, "INGESTION_ERROR");
    this.name = "IngestionError";
    this.source = source;
    this.line = line;
  }
}

/**
 * Extract an error message from an unknown caught value.
 * Replaces `err instanceof Error ? err.message : String(err)`.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Extract an error code from an unknown caught value.
 * Returns the AdmiralError code if available, otherwise "UNKNOWN".
 */
export function errorCode(err: unknown): string {
  if (err instanceof AdmiralError) return err.code;
  return "UNKNOWN";
}
