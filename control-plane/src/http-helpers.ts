/**
 * Admiral Framework — Shared HTTP Helpers
 *
 * Common HTTP utility functions used across governance API modules:
 * readJsonBody, pathOnly, parseQuery, sendJson.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type * as http from "node:http";

// ---------------------------------------------------------------------------
// readJsonBody — read and parse JSON body from request
// ---------------------------------------------------------------------------

export function readJsonBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf-8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON in request body"));
      }
    });
    req.on("error", reject);
  });
}

// ---------------------------------------------------------------------------
// pathOnly — trim query string from a path segment string
// ---------------------------------------------------------------------------

export function pathOnly(url: string): string {
  const q = url.indexOf("?");
  return q === -1 ? url : url.slice(0, q);
}

// ---------------------------------------------------------------------------
// parseQuery — parse URL search params into a plain object
// ---------------------------------------------------------------------------

export function parseQuery(url: string): Record<string, string> {
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return {};
  const qs = url.slice(qIdx + 1);
  const result: Record<string, string> = {};
  for (const pair of qs.split("&")) {
    const eqIdx = pair.indexOf("=");
    if (eqIdx === -1) {
      result[decodeURIComponent(pair)] = "";
    } else {
      result[decodeURIComponent(pair.slice(0, eqIdx))] = decodeURIComponent(pair.slice(eqIdx + 1));
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// sendJson — write a JSON response with status code
// ---------------------------------------------------------------------------

export function sendJson(res: http.ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload, null, 2));
}
