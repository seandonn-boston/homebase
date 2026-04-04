/**
 * Rate Limiter (SEC-11)
 *
 * Sliding window rate limiter for the control plane API.
 * Configurable per-endpoint tier with environment variable overrides.
 */

/** Rate limit tier configuration */
export interface RateLimitTier {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window size in milliseconds */
  windowMs: number;
}

/** Rate limit check result */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/** Per-client request timestamps */
interface ClientWindow {
  timestamps: number[];
}

/** Endpoint tier assignment */
export type EndpointTier = "high" | "medium" | "admin";

/** Default tier limits */
const DEFAULT_TIERS: Record<EndpointTier, RateLimitTier> = {
  high: { maxRequests: 120, windowMs: 60_000 },
  medium: { maxRequests: 60, windowMs: 60_000 },
  admin: { maxRequests: 20, windowMs: 60_000 },
};

/** Endpoint-to-tier mapping */
const ENDPOINT_TIERS: Record<string, EndpointTier> = {
  "/health": "high",
  "/api/events": "high",
  "/api/stats": "high",
  "/api/trace": "medium",
  "/api/trace/ascii": "medium",
  "/api/alerts": "medium",
  "/api/alerts/active": "medium",
  "/api/config": "medium",
  "/api/session": "medium",
  "/": "medium",
  "/index.html": "medium",
};

/** Patterns for parameterized admin routes */
const ADMIN_PATTERNS = [/^\/api\/agents\/[^/]+\/resume$/, /^\/api\/alerts\/[^/]+\/resolve$/];

export class RateLimiter {
  private tiers: Record<EndpointTier, RateLimitTier>;
  private windows: Map<string, ClientWindow> = new Map();
  private violations: number = 0;

  constructor(tierOverrides?: Partial<Record<EndpointTier, Partial<RateLimitTier>>>) {
    this.tiers = { ...DEFAULT_TIERS };
    if (tierOverrides) {
      for (const [tier, override] of Object.entries(tierOverrides)) {
        const key = tier as EndpointTier;
        if (this.tiers[key] && override) {
          this.tiers[key] = { ...this.tiers[key], ...override };
        }
      }
    }
  }

  /** Load tier configuration from environment variables */
  static fromEnv(): RateLimiter {
    const overrides: Partial<Record<EndpointTier, Partial<RateLimitTier>>> = {};

    const highMax = process.env.RATE_LIMIT_HIGH_MAX;
    const highWindow = process.env.RATE_LIMIT_HIGH_WINDOW_MS;
    if (highMax || highWindow) {
      overrides.high = {};
      if (highMax) overrides.high.maxRequests = Number.parseInt(highMax, 10);
      if (highWindow) overrides.high.windowMs = Number.parseInt(highWindow, 10);
    }

    const medMax = process.env.RATE_LIMIT_MEDIUM_MAX;
    const medWindow = process.env.RATE_LIMIT_MEDIUM_WINDOW_MS;
    if (medMax || medWindow) {
      overrides.medium = {};
      if (medMax) overrides.medium.maxRequests = Number.parseInt(medMax, 10);
      if (medWindow) overrides.medium.windowMs = Number.parseInt(medWindow, 10);
    }

    const adminMax = process.env.RATE_LIMIT_ADMIN_MAX;
    const adminWindow = process.env.RATE_LIMIT_ADMIN_WINDOW_MS;
    if (adminMax || adminWindow) {
      overrides.admin = {};
      if (adminMax) overrides.admin.maxRequests = Number.parseInt(adminMax, 10);
      if (adminWindow) overrides.admin.windowMs = Number.parseInt(adminWindow, 10);
    }

    return new RateLimiter(overrides);
  }

  /** Determine the tier for an endpoint path */
  getTier(path: string): EndpointTier {
    const staticTier = ENDPOINT_TIERS[path];
    if (staticTier) return staticTier;

    for (const pattern of ADMIN_PATTERNS) {
      if (pattern.test(path)) return "admin";
    }

    return "medium";
  }

  /** Check if a request should be allowed */
  check(clientKey: string, path: string, now?: number): RateLimitResult {
    const tier = this.getTier(path);
    const config = this.tiers[tier];
    const currentTime = now ?? Date.now();

    const windowKey = `${clientKey}:${tier}`;
    let window = this.windows.get(windowKey);
    if (!window) {
      window = { timestamps: [] };
      this.windows.set(windowKey, window);
    }

    // Remove timestamps outside the window
    const windowStart = currentTime - config.windowMs;
    window.timestamps = window.timestamps.filter((t) => t > windowStart);

    if (window.timestamps.length >= config.maxRequests) {
      this.violations++;
      const oldestInWindow = window.timestamps[0];
      const retryAfterMs = oldestInWindow + config.windowMs - currentTime;
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(1, retryAfterMs),
      };
    }

    window.timestamps.push(currentTime);
    return {
      allowed: true,
      remaining: config.maxRequests - window.timestamps.length,
      retryAfterMs: 0,
    };
  }

  /** Get the total number of rate limit violations */
  getViolationCount(): number {
    return this.violations;
  }

  /** Get tier configuration (for health/debug endpoints) */
  getTierConfig(): Record<EndpointTier, RateLimitTier> {
    return { ...this.tiers };
  }

  /** Reset all windows (for testing) */
  reset(): void {
    this.windows.clear();
    this.violations = 0;
  }
}
