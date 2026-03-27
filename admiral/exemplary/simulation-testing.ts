/**
 * Deterministic Simulation Testing (X-01)
 *
 * Replay recorded hook sequences and verify byte-identical outcomes.
 * Normalize non-determinism (timestamps, random values).
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HookEvent {
  hookName: string;
  payload: Record<string, unknown>;
  expectedOutput: string;
}

export interface SimulationResult {
  totalEvents: number;
  matched: number;
  diverged: number;
  divergences: Divergence[];
  deterministic: boolean;
}

export interface Divergence {
  eventIndex: number;
  hookName: string;
  expected: string;
  actual: string;
  diff: string;
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const TIMESTAMP_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[.\d]*Z?/g;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function normalize(output: string): string {
  return output
    .replace(TIMESTAMP_RE, "<TIMESTAMP>")
    .replace(UUID_RE, "<UUID>");
}

export function hashOutput(output: string): string {
  return createHash("sha256").update(normalize(output)).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Simulation Harness
// ---------------------------------------------------------------------------

export type HookExecutor = (hookName: string, payload: Record<string, unknown>) => string;

export function runSimulation(
  events: HookEvent[],
  executor: HookExecutor,
): SimulationResult {
  const divergences: Divergence[] = [];
  let matched = 0;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const actual = executor(event.hookName, event.payload);
    const normalizedActual = normalize(actual);
    const normalizedExpected = normalize(event.expectedOutput);

    if (normalizedActual === normalizedExpected) {
      matched++;
    } else {
      divergences.push({
        eventIndex: i,
        hookName: event.hookName,
        expected: normalizedExpected.slice(0, 200),
        actual: normalizedActual.slice(0, 200),
        diff: computeDiff(normalizedExpected, normalizedActual),
      });
    }
  }

  return {
    totalEvents: events.length,
    matched,
    diverged: divergences.length,
    divergences,
    deterministic: divergences.length === 0,
  };
}

function computeDiff(expected: string, actual: string): string {
  if (expected === actual) return "identical";
  const expLines = expected.split("\n");
  const actLines = actual.split("\n");
  const diffs: string[] = [];
  const maxLines = Math.max(expLines.length, actLines.length);
  for (let i = 0; i < Math.min(maxLines, 5); i++) {
    if ((expLines[i] ?? "") !== (actLines[i] ?? "")) {
      diffs.push(`line ${i + 1}: expected "${(expLines[i] ?? "").slice(0, 50)}" got "${(actLines[i] ?? "").slice(0, 50)}"`);
    }
  }
  return diffs.join("; ") || "content differs";
}
