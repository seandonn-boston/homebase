/**
 * Task-type routing engine for the Admiral fleet system.
 * Resolves which agent handles which task using three strategies:
 *   1. Task-type matching (exact then normalized)
 *   2. File-ownership matching (glob patterns with priority)
 *   3. Capability matching (rank by overlap count)
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import type { RoutingRule } from "./default-rules";
export type { RoutingRule };

// ─── Interfaces ──────────────────────────────────────────────────────

export interface FileOwnershipRule {
  pattern: string;
  owner: string;
  priority: number;
}

export interface RoutingResult {
  agent: string;
  strategy: "task-type" | "file-ownership" | "capability-match" | "escalation";
  confidence: number;
  fallback: string | null;
  reasoning: string;
}

export interface RoutingRequest {
  taskType?: string;
  filePaths?: string[];
  requiredCapabilities?: string[];
  requestingAgent?: string;
  acceptanceCriteria?: string[];
}

export interface RoutingContext {
  requestingAgent?: string;
  acceptanceCriteria?: string[];
}

export interface AgentCapability {
  agentId: string;
  role: string;
  modelTier: string;
  capabilities: string[];
}

export interface RoutingEngineConfig {
  rules: RoutingRule[];
  fileOwnership: FileOwnershipRule[];
  capabilities: AgentCapability[];
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Normalize a task type string for fuzzy matching. */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Minimalist glob matching — supports `*` (any segment chars) and `**`
 * (any depth).  No external deps.
 */
function globMatch(pattern: string, filePath: string): boolean {
  // Normalize separators
  const p = pattern.replace(/\\/g, "/");
  const f = filePath.replace(/\\/g, "/");

  // Build regex from glob
  let regex = "^";
  let i = 0;
  while (i < p.length) {
    if (p[i] === "*" && p[i + 1] === "*") {
      // ** matches zero or more path segments
      regex += ".*";
      i += 2;
      if (p[i] === "/") i++; // skip trailing slash after **
    } else if (p[i] === "*") {
      regex += "[^/]*";
      i++;
    } else if (p[i] === "?") {
      regex += "[^/]";
      i++;
    } else if (".+^${}()|[]\\".includes(p[i])) {
      regex += "\\" + p[i];
      i++;
    } else {
      regex += p[i];
      i++;
    }
  }
  regex += "$";

  return new RegExp(regex).test(f);
}

// ─── RoutingEngine ───────────────────────────────────────────────────

export class RoutingEngine {
  private readonly rules: RoutingRule[];
  private readonly fileOwnership: FileOwnershipRule[];
  private readonly capabilities: AgentCapability[];

  /** Lookup by normalized task type for fast fuzzy matching. */
  private readonly normalizedIndex: Map<string, RoutingRule>;

  constructor(config: RoutingEngineConfig) {
    this.rules = config.rules;
    this.fileOwnership = config.fileOwnership;
    this.capabilities = config.capabilities;

    this.normalizedIndex = new Map();
    for (const rule of this.rules) {
      this.normalizedIndex.set(normalize(rule.taskType), rule);
    }
  }

  // ── Strategy 1: Task-type routing ──────────────────────────────────

  routeByTaskType(taskType: string): RoutingResult | null {
    // Exact match
    const exact = this.rules.find((r) => r.taskType === taskType);
    if (exact) {
      return {
        agent: exact.primaryAgent,
        strategy: "task-type",
        confidence: 1.0,
        fallback: exact.fallbackAgent,
        reasoning: `Exact task-type match: "${taskType}"`,
      };
    }

    // Normalized / fuzzy match
    const key = normalize(taskType);
    const fuzzy = this.normalizedIndex.get(key);
    if (fuzzy) {
      return {
        agent: fuzzy.primaryAgent,
        strategy: "task-type",
        confidence: 0.85,
        fallback: fuzzy.fallbackAgent,
        reasoning: `Normalized task-type match: "${taskType}" → "${fuzzy.taskType}"`,
      };
    }

    return null;
  }

  // ── Strategy 2: File-ownership routing ─────────────────────────────

  routeByFileOwnership(filePaths: string[]): RoutingResult | null {
    if (filePaths.length === 0) return null;

    // For each file, find the highest-priority matching rule
    const ownerScores = new Map<string, { score: number; maxPriority: number; pattern: string }>();

    for (const fp of filePaths) {
      let bestMatch: FileOwnershipRule | null = null;
      for (const rule of this.fileOwnership) {
        if (globMatch(rule.pattern, fp)) {
          if (!bestMatch || rule.priority > bestMatch.priority) {
            bestMatch = rule;
          }
        }
      }
      if (bestMatch) {
        const existing = ownerScores.get(bestMatch.owner);
        if (existing) {
          existing.score++;
          if (bestMatch.priority > existing.maxPriority) {
            existing.maxPriority = bestMatch.priority;
            existing.pattern = bestMatch.pattern;
          }
        } else {
          ownerScores.set(bestMatch.owner, {
            score: 1,
            maxPriority: bestMatch.priority,
            pattern: bestMatch.pattern,
          });
        }
      }
    }

    if (ownerScores.size === 0) return null;

    // Pick owner with highest (score, then maxPriority) tie-break
    let bestOwner = "";
    let bestScore = -1;
    let bestPriority = -1;
    let bestPattern = "";

    for (const [owner, info] of ownerScores) {
      if (
        info.score > bestScore ||
        (info.score === bestScore && info.maxPriority > bestPriority)
      ) {
        bestOwner = owner;
        bestScore = info.score;
        bestPriority = info.maxPriority;
        bestPattern = info.pattern;
      }
    }

    const confidence = filePaths.length > 0 ? bestScore / filePaths.length : 0;

    return {
      agent: bestOwner,
      strategy: "file-ownership",
      confidence: Math.min(confidence, 1.0),
      fallback: null,
      reasoning: `File ownership: ${bestScore}/${filePaths.length} files matched pattern "${bestPattern}" (owner: ${bestOwner}, priority: ${bestPriority})`,
    };
  }

  // ── Strategy 3: Capability matching ────────────────────────────────

  routeByCapability(requiredCapabilities: string[]): RoutingResult | null {
    if (requiredCapabilities.length === 0) return null;

    const normalized = requiredCapabilities.map(normalize);
    let bestAgent: AgentCapability | null = null;
    let bestCount = 0;

    for (const agent of this.capabilities) {
      const agentNormalized = agent.capabilities.map(normalize);
      let matchCount = 0;
      for (const req of normalized) {
        if (agentNormalized.some((c) => c === req || c.includes(req) || req.includes(c))) {
          matchCount++;
        }
      }
      if (matchCount > bestCount) {
        bestCount = matchCount;
        bestAgent = agent;
      }
    }

    if (!bestAgent || bestCount === 0) return null;

    return {
      agent: bestAgent.agentId,
      strategy: "capability-match",
      confidence: bestCount / requiredCapabilities.length,
      fallback: null,
      reasoning: `Capability match: ${bestAgent.agentId} matched ${bestCount}/${requiredCapabilities.length} required capabilities`,
    };
  }

  // ── Orchestrator: tries strategies in priority order ───────────────

  route(task: RoutingRequest): RoutingResult {
    // 1. Task-type routing (highest priority)
    if (task.taskType) {
      const result = this.routeByTaskType(task.taskType);
      if (result) return result;
    }

    // 2. File-ownership routing
    if (task.filePaths && task.filePaths.length > 0) {
      const result = this.routeByFileOwnership(task.filePaths);
      if (result) return result;
    }

    // 3. Capability matching
    if (task.requiredCapabilities && task.requiredCapabilities.length > 0) {
      const result = this.routeByCapability(task.requiredCapabilities);
      if (result) return result;
    }

    // 4. Escalation fallback
    return {
      agent: "admiral",
      strategy: "escalation",
      confidence: 0,
      fallback: null,
      reasoning: "No routing strategy matched; escalating to admiral",
    };
  }

  // ── Validation ─────────────────────────────────────────────────────

  validateRoute(result: RoutingResult, context: RoutingContext): string[] {
    const violations: string[] = [];

    // Check no-self-review constraint
    if (context.requestingAgent && context.requestingAgent === result.agent) {
      // Find the rule for this agent to check constraints
      const rule = this.rules.find((r) => r.primaryAgent === result.agent);
      if (rule && rule.constraints.includes("no-self-review")) {
        violations.push(
          `Self-review violation: agent "${result.agent}" cannot review its own work`
        );
      }
    }

    // Check missing acceptance criteria
    if (!context.acceptanceCriteria || context.acceptanceCriteria.length === 0) {
      violations.push("Missing acceptance criteria: task has no defined acceptance criteria");
    }

    return violations;
  }
}
