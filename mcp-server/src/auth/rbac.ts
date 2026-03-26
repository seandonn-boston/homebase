/**
 * RBAC middleware — validates identity tokens and role requirements
 * before tool invocation.
 */

import { TokenManager, type IdentityToken } from "./tokens.js";
import type { ToolContext } from "../tool-registry.js";
import { INVALID_PARAMS, INTERNAL_ERROR } from "../protocol.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RbacMiddleware = (
  name: string,
  params: Record<string, unknown>,
  context: ToolContext,
) => Promise<void>;

// ---------------------------------------------------------------------------
// Role hierarchy (mirrors tool-registry.ts)
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: readonly string[] = [
  "observer",
  "agent",
  "lieutenant",
  "admiral",
] as const;

function roleIndex(role: string): number {
  const idx = ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? -1 : idx;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create RBAC middleware that validates identity tokens attached to the
 * context before allowing tool invocation.
 *
 * The middleware expects `context._token` to contain the IdentityToken
 * (attached by the transport layer).
 */
export function createRbacMiddleware(tokenManager: TokenManager): RbacMiddleware {
  return async (
    _name: string,
    _params: Record<string, unknown>,
    context: ToolContext,
  ): Promise<void> => {
    // Extract token from context (transport layer attaches it)
    const token = (context as ToolContext & { _token?: IdentityToken })._token;

    if (!token) {
      throw {
        code: INVALID_PARAMS,
        message: "Authentication required: no identity token provided",
      };
    }

    // Verify token signature and expiration
    const result = tokenManager.verifyToken(token);
    if (!result.valid) {
      throw {
        code: INVALID_PARAMS,
        message: `Authentication failed: ${result.reason}`,
      };
    }

    // Validate that the token's agentId matches context
    if (token.agentId !== context.agentId) {
      throw {
        code: INVALID_PARAMS,
        message: "Token agentId does not match request context",
      };
    }

    // Validate role is recognized
    if (roleIndex(token.role) === -1) {
      throw {
        code: INTERNAL_ERROR,
        message: `Unrecognized role in token: ${token.role}`,
      };
    }
  };
}
