/**
 * Admiral Error Hierarchy
 *
 * Typed errors for the control plane. Replaces generic Error catches
 * with structured error types that carry context.
 */

export class AdmiralError extends Error {
  constructor(
    message: string,
    public readonly code: string = "ADMIRAL_ERROR",
  ) {
    super(message);
    this.name = "AdmiralError";
  }
}

export class NotFoundError extends AdmiralError {
  constructor(
    resource: string,
    public readonly resourceId?: string,
  ) {
    super(
      resourceId ? `${resource} '${resourceId}' not found` : `${resource} not found`,
      "NOT_FOUND",
    );
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AdmiralError {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class StateCorruptionError extends AdmiralError {
  constructor(
    message: string,
    public readonly statePath?: string,
  ) {
    super(message, "STATE_CORRUPTION");
    this.name = "StateCorruptionError";
  }
}

export class IngestionError extends AdmiralError {
  constructor(
    message: string,
    public readonly line?: number,
  ) {
    super(message, "INGESTION_ERROR");
    this.name = "IngestionError";
  }
}

/** Extract error message from unknown catch value */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
