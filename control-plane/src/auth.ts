/**
 * Admiral Framework — Governance API Authentication (GP-01)
 *
 * Simple bearer-token authentication middleware for the governance API.
 * The valid token is configured via the ADMIRAL_API_TOKEN environment variable.
 * If the variable is not set, a default development token is used.
 */

import type * as http from "node:http";

const DEFAULT_DEV_TOKEN = "admiral-dev-token";

/**
 * Returns the configured API token.
 * Reads from ADMIRAL_API_TOKEN env var, falling back to the default dev token.
 */
function getConfiguredToken(): string {
  return process.env.ADMIRAL_API_TOKEN ?? DEFAULT_DEV_TOKEN;
}

/**
 * Validate a bearer token against the configured token.
 *
 * @param token - The raw token string (without "Bearer " prefix)
 * @returns true if valid, false otherwise
 */
export function validateToken(token: string): boolean {
  const configured = getConfiguredToken();
  // Constant-time comparison to reduce timing attacks
  if (token.length !== configured.length) {
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ configured.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Extract the bearer token from an HTTP request's Authorization header.
 *
 * Expects: `Authorization: Bearer <token>`
 *
 * @param req - The incoming HTTP request
 * @returns The token string, or null if not present / malformed
 */
export function extractToken(req: http.IncomingMessage): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }
  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }
  const token = parts[1].trim();
  return token.length > 0 ? token : null;
}

/**
 * Check whether the request carries a valid bearer token.
 *
 * @param req - The incoming HTTP request
 * @returns true if the request is authenticated, false otherwise
 */
export function isAuthenticated(req: http.IncomingMessage): boolean {
  const token = extractToken(req);
  if (token === null) {
    return false;
  }
  return validateToken(token);
}
