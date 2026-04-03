/**
 * Admiral Framework — Generic HTTP Webhook (GP-10)
 *
 * Delivers events as JSON POST requests to any HTTP endpoint.
 * Supports optional HMAC-SHA256 signing via a shared secret.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import * as crypto from "node:crypto";
import * as http from "node:http";
import * as https from "node:https";
import type { GenericPayload, WebhookEvent } from "./types";

// ---------------------------------------------------------------------------
// Generic formatter
// ---------------------------------------------------------------------------

export function formatGenericPayload(event: WebhookEvent, webhookId: string): GenericPayload {
  return {
    event,
    timestamp: new Date().toISOString(),
    webhookId,
  };
}

// ---------------------------------------------------------------------------
// HMAC signing
// ---------------------------------------------------------------------------

export function signPayload(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

// ---------------------------------------------------------------------------
// HTTP delivery
// ---------------------------------------------------------------------------

export interface DeliveryOptions {
  url: string;
  payload: unknown;
  headers?: Record<string, string>;
  secret?: string;
  timeoutMs?: number;
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  error?: string;
}

export function deliverWebhook(options: DeliveryOptions): Promise<DeliveryResult> {
  return new Promise((resolve) => {
    const bodyStr = JSON.stringify(options.payload);
    const timeoutMs = options.timeoutMs ?? 10_000;

    let url: URL;
    try {
      url = new URL(options.url);
    } catch {
      resolve({ success: false, error: `Invalid URL: ${options.url}` });
      return;
    }

    const isHttps = url.protocol === "https:";
    const transport = isHttps ? https : http;

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Content-Length": String(Buffer.byteLength(bodyStr)),
      "User-Agent": "Admiral-Webhook/1.0",
      ...options.headers,
    };

    // HMAC signature
    if (options.secret) {
      const signature = signPayload(bodyStr, options.secret);
      requestHeaders["X-Admiral-Signature"] = `sha256=${signature}`;
    }

    const requestOptions: http.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (isHttps ? "443" : "80"),
      path: url.pathname + url.search,
      method: "POST",
      headers: requestHeaders,
    };

    let settled = false;

    const req = transport.request(requestOptions, (res) => {
      // Drain the response body
      res.resume();
      res.on("end", () => {
        if (!settled) {
          settled = true;
          const statusCode = res.statusCode ?? 0;
          resolve({
            success: statusCode >= 200 && statusCode < 300,
            statusCode,
          });
        }
      });
    });

    req.setTimeout(timeoutMs, () => {
      if (!settled) {
        settled = true;
        req.destroy();
        resolve({ success: false, error: "Request timed out" });
      }
    });

    req.on("error", (err: Error) => {
      if (!settled) {
        settled = true;
        resolve({ success: false, error: err.message });
      }
    });

    req.write(bodyStr);
    req.end();
  });
}
