/**
 * Chaos Testing for Hooks (X-02)
 *
 * Inject failure scenarios and verify hooks fail open.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FailureScenario =
  | "missing-jq"
  | "corrupted-state"
  | "huge-payload"
  | "slow-disk"
  | "concurrent-execution"
  | "readonly-fs"
  | "missing-env-vars"
  | "malformed-json"
  | "empty-payload"
  | "null-fields"
  | "unicode-payload"
  | "nested-deep"
  | "circular-ref"
  | "timeout"
  | "permission-denied"
  | "disk-full"
  | "pipe-broken"
  | "signal-term"
  | "signal-kill"
  | "partial-write"
  | "interrupted-lock"
  | "out-of-memory"
  | "stack-overflow"
  | "encoding-mismatch"
  | "symlink-loop"
  | "binary-payload";

export interface ChaosTestResult {
  scenario: FailureScenario;
  hookName: string;
  failedOpen: boolean;
  stateCorrupted: boolean;
  errorMessage: string | null;
  durationMs: number;
}

export interface ChaosTestSuite {
  totalScenarios: number;
  passed: number;
  failed: number;
  results: ChaosTestResult[];
  allFailOpen: boolean;
  noStateCorruption: boolean;
}

// ---------------------------------------------------------------------------
// Scenario Definitions
// ---------------------------------------------------------------------------

export const ALL_SCENARIOS: readonly FailureScenario[] = [
  "missing-jq", "corrupted-state", "huge-payload", "slow-disk",
  "concurrent-execution", "readonly-fs", "missing-env-vars", "malformed-json",
  "empty-payload", "null-fields", "unicode-payload", "nested-deep",
  "circular-ref", "timeout", "permission-denied", "disk-full",
  "pipe-broken", "signal-term", "signal-kill", "partial-write",
  "interrupted-lock", "out-of-memory", "stack-overflow", "encoding-mismatch",
  "symlink-loop", "binary-payload",
];

export function generatePayloadForScenario(scenario: FailureScenario): unknown {
  switch (scenario) {
    case "empty-payload": return {};
    case "null-fields": return { tool_name: null, tool_input: null };
    case "malformed-json": return "not-json{{{";
    case "huge-payload": return { data: "x".repeat(1_000_000) };
    case "unicode-payload": return { text: "\u{1F600}\u{1F4A9}\u{0000}\u{FFFF}" };
    case "nested-deep": {
      let obj: Record<string, unknown> = { value: "deep" };
      for (let i = 0; i < 100; i++) obj = { nested: obj };
      return obj;
    }
    case "binary-payload": return { data: Buffer.alloc(1024).toString("base64") };
    default: return { tool_name: "Read", tool_input: { file_path: "/test" } };
  }
}

// ---------------------------------------------------------------------------
// Chaos Test Runner
// ---------------------------------------------------------------------------

export type HookRunner = (hookName: string, payload: unknown, scenario: FailureScenario) => {
  failedOpen: boolean;
  stateCorrupted: boolean;
  error: string | null;
};

export function runChaosTests(
  hookName: string,
  runner: HookRunner,
  scenarios?: FailureScenario[],
): ChaosTestSuite {
  const scenarioList = scenarios ?? [...ALL_SCENARIOS];
  const results: ChaosTestResult[] = [];

  for (const scenario of scenarioList) {
    const payload = generatePayloadForScenario(scenario);
    const start = Date.now();
    const { failedOpen, stateCorrupted, error } = runner(hookName, payload, scenario);
    results.push({
      scenario,
      hookName,
      failedOpen,
      stateCorrupted,
      errorMessage: error,
      durationMs: Date.now() - start,
    });
  }

  return {
    totalScenarios: results.length,
    passed: results.filter((r) => r.failedOpen && !r.stateCorrupted).length,
    failed: results.filter((r) => !r.failedOpen || r.stateCorrupted).length,
    results,
    allFailOpen: results.every((r) => r.failedOpen),
    noStateCorruption: results.every((r) => !r.stateCorrupted),
  };
}
