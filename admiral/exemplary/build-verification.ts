/**
 * Reproducible Build Verification (X-10) + Architecture Visualization (X-11) + Contract Testing (X-13)
 *
 * X-10: Verify TypeScript builds are deterministic
 * X-11: Auto-generate Mermaid diagrams from codebase structure
 * X-13: Contract schemas for hook-to-control-plane boundaries
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// ---------------------------------------------------------------------------
// X-10: Reproducible Build Verification
// ---------------------------------------------------------------------------

export interface BuildHash {
  file: string;
  hash: string;
}

export interface BuildComparison {
  identical: boolean;
  totalFiles: number;
  matchedFiles: number;
  divergedFiles: string[];
}

export function hashBuildOutput(dir: string): BuildHash[] {
  if (!existsSync(dir)) return [];
  const hashes: BuildHash[] = [];
  const walk = (d: string) => {
    let entries: string[];
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      const p = join(d, name);
      try {
        const st = statSync(p);
        if (st.isDirectory()) walk(p);
        else {
          const content = readFileSync(p);
          hashes.push({
            file: relative(dir, p),
            hash: createHash("sha256").update(content).digest("hex"),
          });
        }
      } catch { /* skip */ }
    }
  };
  walk(dir);
  return hashes.sort((a, b) => a.file.localeCompare(b.file));
}

export function compareBuilds(a: BuildHash[], b: BuildHash[]): BuildComparison {
  const mapA = new Map(a.map((h) => [h.file, h.hash]));
  const mapB = new Map(b.map((h) => [h.file, h.hash]));
  const allFiles = new Set([...mapA.keys(), ...mapB.keys()]);
  const diverged: string[] = [];

  for (const file of allFiles) {
    if (mapA.get(file) !== mapB.get(file)) {
      diverged.push(file);
    }
  }

  return {
    identical: diverged.length === 0,
    totalFiles: allFiles.size,
    matchedFiles: allFiles.size - diverged.length,
    divergedFiles: diverged,
  };
}

// ---------------------------------------------------------------------------
// X-11: Architecture Visualization
// ---------------------------------------------------------------------------

export interface MermaidDiagram {
  title: string;
  type: "flowchart" | "graph";
  content: string;
}

export function generateHookFlowDiagram(hooksDir: string): MermaidDiagram {
  const hooks: string[] = [];
  if (existsSync(hooksDir)) {
    for (const name of readdirSync(hooksDir)) {
      if (name.endsWith(".sh") && !name.includes("test") && !name.includes("adapter")) {
        hooks.push(name.replace(".sh", ""));
      }
    }
  }

  const lines = ["flowchart TD"];
  lines.push("  ToolCall[Tool Call] --> PreToolUse");
  for (const hook of hooks.filter((h) => h.includes("pre_") || h.includes("validator") || h.includes("guard"))) {
    lines.push(`  PreToolUse --> ${hook.replace(/-/g, "_")}[${hook}]`);
  }
  lines.push("  PreToolUse --> Execute[Execute Tool]");
  lines.push("  Execute --> PostToolUse");
  for (const hook of hooks.filter((h) => h.includes("post_"))) {
    lines.push(`  PostToolUse --> ${hook.replace(/-/g, "_")}[${hook}]`);
  }
  lines.push("  PostToolUse --> Result[Return Result]");

  return { title: "Hook Execution Flow", type: "flowchart", content: lines.join("\n") };
}

export function generateModuleDiagram(rootDir: string): MermaidDiagram {
  const modules = ["admiral/rating", "admiral/governance", "admiral/quality",
    "admiral/thesis", "admiral/fleet", "admiral/exemplary",
    "admiral/brain", "admiral/knowledge", "admiral/security",
    "admiral/context", "admiral/intent", "control-plane", "platform"];

  const lines = ["graph TD"];
  const existing = modules.filter((m) => existsSync(join(rootDir, m)));
  for (const mod of existing) {
    const name = mod.replace("/", "_");
    lines.push(`  ${name}[${mod}]`);
  }

  // Key dependencies
  lines.push("  admiral_rating --> admiral_quality");
  lines.push("  admiral_governance --> admiral_fleet");
  lines.push("  admiral_thesis --> admiral_rating");
  lines.push("  admiral_exemplary --> admiral_governance");
  lines.push("  platform --> admiral_governance");

  return { title: "Module Dependencies", type: "graph", content: lines.join("\n") };
}

// ---------------------------------------------------------------------------
// X-13: Contract Testing
// ---------------------------------------------------------------------------

export interface ContractSchema {
  name: string;
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  boundary: string;
}

export const HOOK_CONTRACTS: readonly ContractSchema[] = [
  {
    name: "PreToolUse",
    inputSchema: { tool_name: "string", tool_input: "object", session_id: "string" },
    outputSchema: { decision: "string", reason: "string" },
    boundary: "hook → control-plane",
  },
  {
    name: "PostToolUse",
    inputSchema: { tool_name: "string", tool_output: "string", tool_input: "object" },
    outputSchema: { acknowledged: "boolean", actions: "array" },
    boundary: "hook → control-plane",
  },
  {
    name: "BrainQuery",
    inputSchema: { query: "string", category: "string", limit: "number" },
    outputSchema: { entries: "array", count: "number" },
    boundary: "control-plane → brain",
  },
  {
    name: "FleetStatus",
    inputSchema: {},
    outputSchema: { agents: "array", health: "string", tasks: "number" },
    boundary: "control-plane → fleet",
  },
];

export function validatePayloadAgainstContract(
  payload: Record<string, unknown>,
  schema: Record<string, string>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const [field, expectedType] of Object.entries(schema)) {
    if (!(field in payload)) {
      errors.push(`missing field: ${field}`);
      continue;
    }
    const actual = payload[field];
    const actualType = Array.isArray(actual) ? "array" : typeof actual;
    if (actualType !== expectedType) {
      errors.push(`${field}: expected ${expectedType}, got ${actualType}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
