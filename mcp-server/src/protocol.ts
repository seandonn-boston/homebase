/**
 * JSON-RPC 2.0 protocol types and message handling for the Admiral MCP Server.
 *
 * Implements parsing, validation, and serialization of JSON-RPC 2.0 messages
 * per https://www.jsonrpc.org/specification.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: JsonRpcError;
}

export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// ---------------------------------------------------------------------------
// Standard JSON-RPC 2.0 error codes
// ---------------------------------------------------------------------------

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Parse a raw string into a validated JsonRpcRequest.
 * Throws a JsonRpcError-shaped object on failure so callers can
 * easily build an error response.
 */
export function parseRequest(raw: string): JsonRpcRequest {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw { code: PARSE_ERROR, message: "Parse error: invalid JSON" };
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw { code: INVALID_REQUEST, message: "Invalid request: not a JSON object" };
  }

  const obj = parsed as Record<string, unknown>;

  if (obj.jsonrpc !== "2.0") {
    throw { code: INVALID_REQUEST, message: 'Invalid request: missing or wrong "jsonrpc" field' };
  }

  if (typeof obj.id !== "string" && typeof obj.id !== "number") {
    throw { code: INVALID_REQUEST, message: 'Invalid request: "id" must be a string or number' };
  }

  if (typeof obj.method !== "string" || obj.method.length === 0) {
    throw { code: INVALID_REQUEST, message: 'Invalid request: "method" must be a non-empty string' };
  }

  if (obj.params !== undefined && (typeof obj.params !== "object" || obj.params === null || Array.isArray(obj.params))) {
    throw { code: INVALID_PARAMS, message: 'Invalid params: "params" must be an object if provided' };
  }

  return {
    jsonrpc: "2.0",
    id: obj.id as string | number,
    method: obj.method as string,
    params: obj.params as Record<string, unknown> | undefined,
  };
}

/**
 * Build a successful JSON-RPC 2.0 response.
 */
export function formatResponse(id: string | number | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

/**
 * Build a JSON-RPC 2.0 error response.
 */
export function formatError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  const error: JsonRpcError = { code, message };
  if (data !== undefined) {
    error.data = data;
  }
  return { jsonrpc: "2.0", id, error };
}
