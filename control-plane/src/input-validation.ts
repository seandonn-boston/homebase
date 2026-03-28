/**
 * Admiral Framework — Input Validation Hardening (SEC-12)
 *
 * Boundary validation for control plane API endpoints.
 * Outermost defense ring: validates before any processing.
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/** Default size limits (bytes) */
export const LIMITS = {
  MAX_REQUEST_BODY: 1_048_576, // 1MB
  MAX_HOOK_PAYLOAD: 524_288, // 512KB
  MAX_BRAIN_ENTRY: 65_536, // 64KB
  MAX_PATH_LENGTH: 4_096,
  MAX_QUERY_STRING: 2_048,
} as const;

/** Check for null bytes in a string */
export function containsNullBytes(input: string): boolean {
  return input.includes("\0");
}

/** Check for invalid control characters (except \t, \n, \r) */
export function containsInvalidChars(input: string): boolean {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional security check for control chars
  return /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(input);
}

/** Validate input size in bytes */
export function validateSize(input: string, maxBytes: number): ValidationResult {
  const size = Buffer.byteLength(input, "utf-8");
  if (size > maxBytes) {
    return {
      valid: false,
      errors: [`Input too large: ${size} bytes (max ${maxBytes})`],
    };
  }
  return { valid: true, errors: [] };
}

/** Validate JSON is well-formed */
export function validateJson(input: string): ValidationResult {
  try {
    JSON.parse(input);
    return { valid: true, errors: [] };
  } catch {
    return { valid: false, errors: ["Input is not valid JSON"] };
  }
}

/** Validate a file path */
export function validatePath(filePath: string): ValidationResult {
  const errors: string[] = [];

  if (filePath.length > LIMITS.MAX_PATH_LENGTH) {
    errors.push(`Path too long: ${filePath.length} chars (max ${LIMITS.MAX_PATH_LENGTH})`);
  }

  if (containsNullBytes(filePath)) {
    errors.push("Path contains null bytes");
  }

  // Reject excessive path traversal
  const traversalCount = (filePath.match(/\.\.\//g) || []).length;
  if (traversalCount >= 3) {
    errors.push("Excessive path traversal detected");
  }

  return { valid: errors.length === 0, errors };
}

/** Full boundary validation for API request bodies */
export function validateRequestBody(
  body: string,
  maxSize: number = LIMITS.MAX_REQUEST_BODY,
): ValidationResult {
  const errors: string[] = [];

  // Size check
  const sizeResult = validateSize(body, maxSize);
  if (!sizeResult.valid) errors.push(...sizeResult.errors);

  // Null byte check
  if (containsNullBytes(body)) {
    errors.push("Request body contains null bytes");
  }

  // Control character check
  if (containsInvalidChars(body)) {
    errors.push("Request body contains invalid control characters");
  }

  return { valid: errors.length === 0, errors };
}

/** Full boundary validation for JSON API request bodies */
export function validateJsonRequestBody(
  body: string,
  maxSize: number = LIMITS.MAX_REQUEST_BODY,
): ValidationResult {
  const baseResult = validateRequestBody(body, maxSize);
  if (!baseResult.valid) return baseResult;

  const jsonResult = validateJson(body);
  if (!jsonResult.valid) {
    return {
      valid: false,
      errors: [...baseResult.errors, ...jsonResult.errors],
    };
  }

  return { valid: true, errors: [] };
}
