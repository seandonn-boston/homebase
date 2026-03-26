/**
 * Task Decomposition Engine (O-07)
 *
 * Decomposes high-level tasks into subtasks with agent assignment,
 * budget allocation, dependency ordering, and artificial-split detection.
 * Uses the RoutingEngine for agent selection.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import type { RoutingEngine } from "./engine";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface DecompositionResult {
  originalTask: string;
  subtasks: Subtask[];
  totalBudget: number;
  warnings: string[];
}

export interface Subtask {
  id: string;
  description: string;
  agentId: string;
  acceptanceCriteria: string[];
  budgetTokens: number;
  dependencies: string[];  // subtask IDs that must complete first
  order: number;
}

export interface DecompositionHint {
  aspect: string;
  suggestedAgent?: string;
  priority?: number;
}

// ---------------------------------------------------------------------------
// TaskDecomposer
// ---------------------------------------------------------------------------

export class TaskDecomposer {
  constructor(private routingEngine: RoutingEngine) {}

  decompose(
    task: string,
    taskType: string,
    budget: number,
    hints: DecompositionHint[] = [],
  ): DecompositionResult {
    const warnings: string[] = [];
    const subtasks: Subtask[] = [];

    if (hints.length === 0) {
      // No hints: create a single subtask routed by task type
      const route = this.routingEngine.route({ taskType });
      subtasks.push({
        id: `subtask_${randomUUID()}`,
        description: task,
        agentId: route.agent,
        acceptanceCriteria: [`Complete: ${task}`],
        budgetTokens: budget,
        dependencies: [],
        order: 0,
      });
    } else {
      // Create one subtask per hint
      const budgetPerHint = Math.floor(budget / hints.length);
      const sortedHints = [...hints].sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
      );

      for (let i = 0; i < sortedHints.length; i++) {
        const hint = sortedHints[i];
        const agentId =
          hint.suggestedAgent ??
          this.routingEngine.route({ taskType: hint.aspect }).agent;

        subtasks.push({
          id: `subtask_${randomUUID()}`,
          description: `${task} — ${hint.aspect}`,
          agentId,
          acceptanceCriteria: [`Complete ${hint.aspect} aspect of: ${task}`],
          budgetTokens: budgetPerHint,
          dependencies: i > 0 ? [subtasks[i - 1].id] : [],
          order: i,
        });
      }

      // Distribute remainder to first subtask
      const allocated = budgetPerHint * hints.length;
      if (allocated < budget && subtasks.length > 0) {
        subtasks[0].budgetTokens += budget - allocated;
      }
    }

    // Check for artificial split
    if (this.detectArtificialSplit(subtasks)) {
      warnings.push(
        "Artificial split detected: all subtasks route to the same agent",
      );
    }

    // Budget validation
    const totalAllocated = subtasks.reduce((s, t) => s + t.budgetTokens, 0);
    if (totalAllocated > budget) {
      warnings.push(
        `Budget overrun: allocated ${totalAllocated} tokens but budget is ${budget}`,
      );
    }

    return {
      originalTask: task,
      subtasks,
      totalBudget: budget,
      warnings,
    };
  }

  validateDecomposition(result: DecompositionResult): string[] {
    const errors: string[] = [];
    const ids = new Set(result.subtasks.map((s) => s.id));

    // Check all dependency references are valid
    for (const subtask of result.subtasks) {
      for (const dep of subtask.dependencies) {
        if (!ids.has(dep)) {
          errors.push(
            `Subtask "${subtask.id}" depends on unknown subtask "${dep}"`,
          );
        }
      }
    }

    // Check for circular dependencies
    if (this.hasCircularDeps(result.subtasks)) {
      errors.push("Circular dependency detected in subtask graph");
    }

    // Check budget
    const totalAllocated = result.subtasks.reduce(
      (s, t) => s + t.budgetTokens,
      0,
    );
    if (totalAllocated > result.totalBudget) {
      errors.push(
        `Total budget exceeded: ${totalAllocated} > ${result.totalBudget}`,
      );
    }

    // Check for artificial splits
    if (this.detectArtificialSplit(result.subtasks)) {
      errors.push("Artificial split: all subtasks assigned to the same agent");
    }

    return errors;
  }

  detectArtificialSplit(subtasks: Subtask[]): boolean {
    if (subtasks.length <= 1) return false;
    const agents = new Set(subtasks.map((s) => s.agentId));
    return agents.size === 1;
  }

  getExecutionOrder(subtasks: Subtask[]): Subtask[][] {
    const remaining = new Map(subtasks.map((s) => [s.id, s]));
    const completed = new Set<string>();
    const groups: Subtask[][] = [];

    while (remaining.size > 0) {
      const ready: Subtask[] = [];

      for (const [id, subtask] of remaining) {
        const allDepsMet = subtask.dependencies.every((d) => completed.has(d));
        if (allDepsMet) {
          ready.push(subtask);
        }
      }

      if (ready.length === 0) {
        // Remaining tasks have unresolvable deps (circular or missing)
        // Add them as a final group to avoid infinite loop
        groups.push(Array.from(remaining.values()));
        break;
      }

      for (const s of ready) {
        remaining.delete(s.id);
        completed.add(s.id);
      }

      groups.push(ready);
    }

    return groups;
  }

  // --- Internal helpers ----------------------------------------------------

  private hasCircularDeps(subtasks: Subtask[]): boolean {
    const graph = new Map<string, string[]>();
    for (const s of subtasks) {
      graph.set(s.id, s.dependencies);
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (id: string): boolean => {
      if (inStack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      inStack.add(id);

      for (const dep of graph.get(id) ?? []) {
        if (dfs(dep)) return true;
      }

      inStack.delete(id);
      return false;
    };

    for (const id of graph.keys()) {
      if (dfs(id)) return true;
    }

    return false;
  }
}
