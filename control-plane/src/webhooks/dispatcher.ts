/**
 * Admiral Framework — Webhook Dispatcher (GP-10)
 *
 * Manages webhook subscriptions, filtering, rate limiting, and retry-with-backoff.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import type { DeliveryOptions } from "./generic";
import { deliverWebhook, formatGenericPayload } from "./generic";
import { formatJiraPayload } from "./jira";
import { formatPagerDutyPayload } from "./pagerduty";
import { formatSlackPayload } from "./slack";
import type {
  CreateSubscriptionRequest,
  WebhookDeliveryResult,
  WebhookEvent,
  WebhookEventType,
  WebhookSubscription,
} from "./types";
import { meetsSeverityThreshold } from "./types";

// ---------------------------------------------------------------------------
// Rate limiter — per subscription, per minute window
// ---------------------------------------------------------------------------

interface RateLimitState {
  count: number;
  windowStart: number;
}

// ---------------------------------------------------------------------------
// Dispatcher config
// ---------------------------------------------------------------------------

export interface WebhookDispatcherConfig {
  /** Max retry attempts per delivery. Default: 3. */
  maxRetries?: number;
  /** Initial backoff delay in ms. Default: 500. */
  initialBackoffMs?: number;
  /** Request timeout in ms. Default: 10_000. */
  requestTimeoutMs?: number;
  /**
   * Jira project key injected when formatting Jira payloads.
   * Default: "ADM".
   */
  jiraProjectKey?: string;
  /**
   * PagerDuty routing key injected when formatting PagerDuty payloads.
   * Subscriptions may override via headers["X-Routing-Key"].
   */
  pagerDutyRoutingKey?: string;
}

const DEFAULT_CONFIG: Required<WebhookDispatcherConfig> = {
  maxRetries: 3,
  initialBackoffMs: 500,
  requestTimeoutMs: 10_000,
  jiraProjectKey: "ADM",
  pagerDutyRoutingKey: "",
};

// ---------------------------------------------------------------------------
// WebhookDispatcher
// ---------------------------------------------------------------------------

/** Max entries allowed in the rate limit map before forced cleanup. */
const RATE_LIMIT_MAX_ENTRIES = 10_000;
/** Run cleanup every N dispatches. */
const RATE_LIMIT_CLEANUP_INTERVAL = 100;

export class WebhookDispatcher {
  private subscriptions: Map<string, WebhookSubscription> = new Map();
  private rateLimitState: Map<string, RateLimitState> = new Map();
  private config: Required<WebhookDispatcherConfig>;
  private dispatchCount = 0;

  constructor(config: WebhookDispatcherConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // -------------------------------------------------------------------------
  // Subscription management
  // -------------------------------------------------------------------------

  addSubscription(req: CreateSubscriptionRequest): WebhookSubscription {
    if (!req.name || !req.name.trim()) {
      throw new Error("Subscription name is required");
    }
    if (!req.url || !req.url.trim()) {
      throw new Error("Subscription URL is required");
    }
    const VALID_FORMATS = ["slack", "pagerduty", "jira", "generic"];
    if (!VALID_FORMATS.includes(req.format)) {
      throw new Error(
        `Invalid format '${req.format}'. Must be one of: ${VALID_FORMATS.join(", ")}`,
      );
    }

    const subscription: WebhookSubscription = {
      id: `whsub_${randomUUID()}`,
      name: req.name.trim(),
      url: req.url.trim(),
      format: req.format,
      eventTypes: req.eventTypes ?? [],
      minSeverity: req.minSeverity,
      maxEventsPerMinute: req.maxEventsPerMinute ?? 0,
      enabled: true,
      headers: req.headers,
      secret: req.secret,
    };

    this.subscriptions.set(subscription.id, subscription);
    return subscription;
  }

  removeSubscription(id: string): boolean {
    const deleted = this.subscriptions.delete(id);
    this.rateLimitState.delete(id);
    return deleted;
  }

  getSubscription(id: string): WebhookSubscription | undefined {
    return this.subscriptions.get(id);
  }

  listSubscriptions(): WebhookSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  enableSubscription(id: string): boolean {
    const sub = this.subscriptions.get(id);
    if (!sub) return false;
    this.subscriptions.set(id, { ...sub, enabled: true });
    return true;
  }

  disableSubscription(id: string): boolean {
    const sub = this.subscriptions.get(id);
    if (!sub) return false;
    this.subscriptions.set(id, { ...sub, enabled: false });
    return true;
  }

  get subscriptionCount(): number {
    return this.subscriptions.size;
  }

  // -------------------------------------------------------------------------
  // Dispatch — fan-out event to all matching subscriptions
  // -------------------------------------------------------------------------

  async dispatch(event: WebhookEvent): Promise<WebhookDeliveryResult[]> {
    this.dispatchCount++;
    if (this.dispatchCount % RATE_LIMIT_CLEANUP_INTERVAL === 0) {
      this.cleanupRateLimitState();
    }

    const results: WebhookDeliveryResult[] = [];
    const candidates = Array.from(this.subscriptions.values()).filter((sub) =>
      this.matchesSubscription(event, sub),
    );

    await Promise.all(
      candidates.map(async (sub) => {
        const result = await this.deliverWithRetry(event, sub);
        results.push(result);
      }),
    );

    return results;
  }

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  private matchesSubscription(event: WebhookEvent, sub: WebhookSubscription): boolean {
    if (!sub.enabled) return false;

    // Event type filter — empty array means all types
    if (sub.eventTypes.length > 0 && !sub.eventTypes.includes(event.type as WebhookEventType)) {
      return false;
    }

    // Severity threshold filter
    if (sub.minSeverity && !meetsSeverityThreshold(event.severity, sub.minSeverity)) {
      return false;
    }

    // Rate limiting
    if (sub.maxEventsPerMinute > 0 && this.isRateLimited(sub.id, sub.maxEventsPerMinute)) {
      return false;
    }

    return true;
  }

  // -------------------------------------------------------------------------
  // Rate limiting
  // -------------------------------------------------------------------------

  private isRateLimited(subId: string, maxPerMinute: number): boolean {
    const now = Date.now();
    const windowMs = 60_000;

    // Cap max entries to prevent unbounded growth
    if (this.rateLimitState.size >= RATE_LIMIT_MAX_ENTRIES) {
      this.cleanupRateLimitState();
    }

    const state = this.rateLimitState.get(subId);
    if (!state || now - state.windowStart >= windowMs) {
      // Start new window
      this.rateLimitState.set(subId, { count: 1, windowStart: now });
      return false;
    }

    if (state.count >= maxPerMinute) {
      return true;
    }

    this.rateLimitState.set(subId, { count: state.count + 1, windowStart: state.windowStart });
    return false;
  }

  /** Remove rate limit entries whose window has expired. */
  private cleanupRateLimitState(): void {
    const now = Date.now();
    const windowMs = 60_000;
    for (const [key, state] of this.rateLimitState) {
      if (now - state.windowStart >= windowMs) {
        this.rateLimitState.delete(key);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Delivery with retry
  // -------------------------------------------------------------------------

  private async deliverWithRetry(
    event: WebhookEvent,
    sub: WebhookSubscription,
  ): Promise<WebhookDeliveryResult> {
    let lastError: string | undefined;
    let lastStatusCode: number | undefined;

    for (let attempt = 1; attempt <= this.config.maxRetries + 1; attempt++) {
      if (attempt > 1) {
        const delay = this.config.initialBackoffMs * 2 ** (attempt - 2);
        await new Promise<void>((resolve) => setTimeout(resolve, delay));
      }

      const deliveryOptions = this.buildDeliveryOptions(event, sub);
      const result = await deliverWebhook(deliveryOptions);

      lastStatusCode = result.statusCode;

      if (result.success) {
        return {
          subscriptionId: sub.id,
          eventId: event.id,
          success: true,
          statusCode: result.statusCode,
          attempt,
          timestamp: new Date().toISOString(),
        };
      }

      lastError = result.error;

      // Don't retry on client errors (4xx) — only transient failures
      if (result.statusCode !== undefined && result.statusCode >= 400 && result.statusCode < 500) {
        break;
      }
    }

    return {
      subscriptionId: sub.id,
      eventId: event.id,
      success: false,
      statusCode: lastStatusCode,
      attempt: this.config.maxRetries + 1,
      timestamp: new Date().toISOString(),
      error: lastError,
    };
  }

  private buildDeliveryOptions(event: WebhookEvent, sub: WebhookSubscription): DeliveryOptions {
    let payload: unknown;

    switch (sub.format) {
      case "slack":
        payload = formatSlackPayload(event);
        break;
      case "pagerduty": {
        const routingKey = sub.headers?.["X-Routing-Key"] ?? this.config.pagerDutyRoutingKey;
        payload = formatPagerDutyPayload(event, routingKey);
        break;
      }
      case "jira":
        payload = formatJiraPayload(event, { projectKey: this.config.jiraProjectKey });
        break;
      default:
        payload = formatGenericPayload(event, sub.id);
        break;
    }

    return {
      url: sub.url,
      payload,
      headers: sub.headers,
      secret: sub.secret,
      timeoutMs: this.config.requestTimeoutMs,
    };
  }
}
