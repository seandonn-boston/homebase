/**
 * Admiral Typed Error Hierarchy
 *
 * Structured error classes for the control plane, each carrying
 * a machine-readable `code` for programmatic handling.
 */

export class AdmiralError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AdmiralError";
    this.code = code;
    // Restore prototype chain (required when extending builtins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AdmiralError {
  constructor(message: string) {
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AdmiralError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
    this.field = field;
  }
}

export class StateCorruptionError extends AdmiralError {
  constructor(message: string) {
    super(message, "STATE_CORRUPTION");
    this.name = "StateCorruptionError";
  }
}

export class IngestionError extends AdmiralError {
  constructor(message: string) {
    super(message, "INGESTION_ERROR");
    this.name = "IngestionError";
  }
}
