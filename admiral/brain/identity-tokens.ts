/**
 * Identity Token Lifecycle (B-14)
 *
 * Create, rotate, and revoke identity tokens for Brain access.
 * Configurable TTL with overlapping validity windows during rotation
 * and immediate revocation support.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Identity token */
export interface IdentityToken {
	id: string;
	agentId: string;
	token: string;
	createdAt: number;
	expiresAt: number;
	revokedAt?: number;
	rotatedTo?: string;
	status: "active" | "rotated" | "revoked" | "expired";
}

/** Token creation options */
export interface TokenCreateOptions {
	agentId: string;
	ttlMs?: number;
}

/** Token rotation result */
export interface RotationResult {
	oldToken: IdentityToken;
	newToken: IdentityToken;
	overlapWindowMs: number;
}

/** Token validation result */
export interface ValidationResult {
	valid: boolean;
	agentId?: string;
	reason: string;
	token?: IdentityToken;
}

// ---------------------------------------------------------------------------
// IdentityTokenManager
// ---------------------------------------------------------------------------

/** Default TTL: 24 hours */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** Default overlap window during rotation: 5 minutes */
const DEFAULT_OVERLAP_MS = 5 * 60 * 1000;

export class IdentityTokenManager {
	private tokens: Map<string, IdentityToken> = new Map();
	private tokensByAgent: Map<string, string[]> = new Map();
	private defaultTtlMs: number;
	private overlapMs: number;

	constructor(defaultTtlMs?: number, overlapMs?: number) {
		this.defaultTtlMs = defaultTtlMs ?? DEFAULT_TTL_MS;
		this.overlapMs = overlapMs ?? DEFAULT_OVERLAP_MS;
	}

	/** Create a new identity token for an agent */
	create(options: TokenCreateOptions): IdentityToken {
		const now = Date.now();
		const ttl = options.ttlMs ?? this.defaultTtlMs;

		const token: IdentityToken = {
			id: randomUUID(),
			agentId: options.agentId,
			token: `ait_${randomUUID().replace(/-/g, "")}`,
			createdAt: now,
			expiresAt: now + ttl,
			status: "active",
		};

		this.tokens.set(token.id, token);

		const agentTokens = this.tokensByAgent.get(options.agentId) ?? [];
		agentTokens.push(token.id);
		this.tokensByAgent.set(options.agentId, agentTokens);

		return token;
	}

	/** Rotate a token: create new one, mark old as rotated with overlap window */
	rotate(tokenId: string, newTtlMs?: number): RotationResult | null {
		const oldToken = this.tokens.get(tokenId);
		if (!oldToken || oldToken.status !== "active") return null;

		const now = Date.now();

		// Create new token
		const newToken = this.create({
			agentId: oldToken.agentId,
			ttlMs: newTtlMs,
		});

		// Mark old token as rotated — it remains valid during overlap window
		oldToken.status = "rotated";
		oldToken.rotatedTo = newToken.id;
		// Extend expiry to overlap window from now (not from original expiry)
		oldToken.expiresAt = now + this.overlapMs;

		return {
			oldToken,
			newToken,
			overlapWindowMs: this.overlapMs,
		};
	}

	/** Immediately revoke a token — no overlap window */
	revoke(tokenId: string): boolean {
		const token = this.tokens.get(tokenId);
		if (!token) return false;
		if (token.status === "revoked") return false;

		token.status = "revoked";
		token.revokedAt = Date.now();
		return true;
	}

	/** Revoke all tokens for an agent */
	revokeAllForAgent(agentId: string): number {
		const tokenIds = this.tokensByAgent.get(agentId) ?? [];
		let count = 0;
		for (const id of tokenIds) {
			if (this.revoke(id)) count++;
		}
		return count;
	}

	/** Validate a token string */
	validate(tokenString: string, now?: number): ValidationResult {
		const currentTime = now ?? Date.now();

		for (const token of this.tokens.values()) {
			if (token.token !== tokenString) continue;

			if (token.status === "revoked") {
				return { valid: false, reason: "Token has been revoked", token };
			}

			if (currentTime > token.expiresAt) {
				// Auto-expire
				if (token.status === "active" || token.status === "rotated") {
					token.status = "expired";
				}
				return { valid: false, reason: "Token has expired", token };
			}

			// Active or rotated (still in overlap window)
			if (token.status === "active" || token.status === "rotated") {
				return {
					valid: true,
					agentId: token.agentId,
					reason: token.status === "rotated"
						? "Token valid (in rotation overlap window)"
						: "Token valid",
					token,
				};
			}

			return { valid: false, reason: `Token status: ${token.status}`, token };
		}

		return { valid: false, reason: "Token not found" };
	}

	/** Get a token by ID */
	getToken(tokenId: string): IdentityToken | undefined {
		return this.tokens.get(tokenId);
	}

	/** Get all active tokens for an agent */
	getActiveTokens(agentId: string): IdentityToken[] {
		const tokenIds = this.tokensByAgent.get(agentId) ?? [];
		const now = Date.now();
		return tokenIds
			.map((id) => this.tokens.get(id)!)
			.filter((t) => t && (t.status === "active" || t.status === "rotated") && t.expiresAt > now);
	}

	/** Clean up expired tokens */
	pruneExpired(now?: number): number {
		const currentTime = now ?? Date.now();
		let pruned = 0;

		for (const token of this.tokens.values()) {
			if (
				(token.status === "active" || token.status === "rotated") &&
				currentTime > token.expiresAt
			) {
				token.status = "expired";
				pruned++;
			}
		}

		return pruned;
	}

	/** Get token count by status */
	getStats(): Record<string, number> {
		const stats: Record<string, number> = {
			active: 0,
			rotated: 0,
			revoked: 0,
			expired: 0,
		};
		for (const token of this.tokens.values()) {
			stats[token.status] = (stats[token.status] ?? 0) + 1;
		}
		return stats;
	}

	/** Reset (for testing) */
	reset(): void {
		this.tokens.clear();
		this.tokensByAgent.clear();
	}
}
