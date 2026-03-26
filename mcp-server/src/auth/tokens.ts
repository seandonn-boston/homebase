/**
 * Identity token issuance, verification, and revocation.
 *
 * Uses HMAC-SHA256 (node:crypto) for signatures — zero external deps.
 */

import * as crypto from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IdentityToken {
  agentId: string;
  role: "observer" | "agent" | "lieutenant" | "admiral";
  projectId: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

// ---------------------------------------------------------------------------
// TokenManager
// ---------------------------------------------------------------------------

export class TokenManager {
  private secret: string;
  private revokedBefore: number = 0;

  constructor(secret: string) {
    if (!secret) throw new Error("TokenManager requires a non-empty secret");
    this.secret = secret;
  }

  /**
   * Issue a new identity token.
   */
  issueToken(
    agentId: string,
    role: IdentityToken["role"],
    projectId: string,
    sessionId: string,
    ttlMs: number = 3_600_000,
  ): IdentityToken {
    const now = Date.now();
    const token: IdentityToken = {
      agentId,
      role,
      projectId,
      sessionId,
      issuedAt: now,
      expiresAt: now + ttlMs,
      signature: "",
    };
    token.signature = this.sign(token);
    return token;
  }

  /**
   * Verify a token's signature, expiration, and revocation status.
   */
  verifyToken(token: IdentityToken): { valid: boolean; reason?: string } {
    // Check signature
    const expected = this.sign(token);
    if (token.signature !== expected) {
      return { valid: false, reason: "invalid signature" };
    }

    // Check expiration
    if (Date.now() > token.expiresAt) {
      return { valid: false, reason: "token expired" };
    }

    // Check fleet-wide revocation
    if (token.issuedAt < this.revokedBefore) {
      return { valid: false, reason: "token revoked (issued before revocation epoch)" };
    }

    return { valid: true };
  }

  /**
   * Revoke all tokens issued before the given epoch (ms).
   */
  revokeAllBefore(epoch: number): void {
    this.revokedBefore = epoch;
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private sign(token: IdentityToken): string {
    const payload = [
      token.agentId,
      token.role,
      token.projectId,
      token.sessionId,
      String(token.issuedAt),
      String(token.expiresAt),
    ].join("|");

    return crypto
      .createHmac("sha256", this.secret)
      .update(payload)
      .digest("hex");
  }
}
