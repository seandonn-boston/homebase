/**
 * Admiral Framework — Task Decomposition Interface (EX-06)
 *
 * Accepts high-level tasks and produces a validated DAG of subtasks.
 * Validates the graph (no cycles, valid agents), calculates the
 * critical path, and identifies parallel execution opportunities.
 * Consumable by the TaskQueue for scheduling.
 */

// ── Types ──────────────────────────────────────────────────────

export interface SubtaskNode {
  id: string;
  description: string;
  agentId: string;
  estimatedDuration?: number;
  budgetTokens: number;
  dependencies: string[];
  metadata: Record<string, unknown>;
}

export interface TaskDAG {
  taskId: string;
  description: string;
  nodes: SubtaskNode[];
  edges: DAGEdge[];
  criticalPath: string[];
  parallelGroups: string[][];
  totalEstimatedDuration: number;
  totalBudgetTokens: number;
  isValid: boolean;
  validationErrors: string[];
}

export interface DAGEdge {
  from: string;
  to: string;
}

export interface DecompositionInput {
  taskId: string;
  description: string;
  subtasks: SubtaskInput[];
}

export interface SubtaskInput {
  id: string;
  description: string;
  agentId: string;
  estimatedDuration?: number;
  budgetTokens?: number;
  dependencies?: string[];
  metadata?: Record<string, unknown>;
}

// ── TaskDAGBuilder ─────────────────────────────────────────────

export class TaskDAGBuilder {
  private knownAgents: Set<string>;

  constructor(knownAgentIds?: string[]) {
    this.knownAgents = new Set(knownAgentIds ?? []);
  }

  /**
   * Build and validate a DAG from decomposition input.
   */
  build(input: DecompositionInput): TaskDAG {
    const nodes: SubtaskNode[] = input.subtasks.map((s) => ({
      id: s.id,
      description: s.description,
      agentId: s.agentId,
      estimatedDuration: s.estimatedDuration,
      budgetTokens: s.budgetTokens ?? 0,
      dependencies: s.dependencies ?? [],
      metadata: s.metadata ?? {},
    }));

    const edges: DAGEdge[] = [];
    for (const node of nodes) {
      for (const dep of node.dependencies) {
        edges.push({ from: dep, to: node.id });
      }
    }

    const validationErrors = this.validate(nodes, edges);
    const isValid = validationErrors.length === 0;

    let criticalPath: string[] = [];
    let parallelGroups: string[][] = [];
    let totalEstimatedDuration = 0;

    if (isValid) {
      criticalPath = this.computeCriticalPath(nodes);
      parallelGroups = this.computeParallelGroups(nodes);
      totalEstimatedDuration = this.computeTotalDuration(nodes, criticalPath);
    }

    const totalBudgetTokens = nodes.reduce((sum, n) => sum + n.budgetTokens, 0);

    return {
      taskId: input.taskId,
      description: input.description,
      nodes,
      edges,
      criticalPath,
      parallelGroups,
      totalEstimatedDuration,
      totalBudgetTokens,
      isValid,
      validationErrors,
    };
  }

  // ── Validation ─────────────────────────────────────────────

  private validate(nodes: SubtaskNode[], edges: DAGEdge[]): string[] {
    const errors: string[] = [];
    const nodeIds = new Set(nodes.map((n) => n.id));

    // Check for duplicate IDs
    if (nodeIds.size !== nodes.length) {
      errors.push("Duplicate subtask IDs detected");
    }

    // Check for references to non-existent nodes
    for (const edge of edges) {
      if (!nodeIds.has(edge.from)) {
        errors.push(`Dependency "${edge.from}" referenced by "${edge.to}" does not exist`);
      }
      if (!nodeIds.has(edge.to)) {
        errors.push(`Subtask "${edge.to}" does not exist`);
      }
    }

    // Check for self-dependencies
    for (const node of nodes) {
      if (node.dependencies.includes(node.id)) {
        errors.push(`Subtask "${node.id}" depends on itself`);
      }
    }

    // Check for cycles using topological sort
    if (this.hasCycle(nodes)) {
      errors.push("Dependency cycle detected in subtask graph");
    }

    // Check for invalid agent references (if known agents are provided)
    if (this.knownAgents.size > 0) {
      for (const node of nodes) {
        if (!this.knownAgents.has(node.agentId)) {
          errors.push(`Agent "${node.agentId}" referenced by "${node.id}" is not a known agent`);
        }
      }
    }

    return errors;
  }

  private hasCycle(nodes: SubtaskNode[]): boolean {
    const visited = new Set<string>();
    const inStack = new Set<string>();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const dfs = (id: string): boolean => {
      if (inStack.has(id)) return true;
      if (visited.has(id)) return false;

      visited.add(id);
      inStack.add(id);

      const node = nodeMap.get(id);
      if (node) {
        for (const dep of node.dependencies) {
          if (dfs(dep)) return true;
        }
      }

      inStack.delete(id);
      return false;
    };

    for (const node of nodes) {
      if (dfs(node.id)) return true;
    }

    return false;
  }

  // ── Critical Path ──────────────────────────────────────────

  private computeCriticalPath(nodes: SubtaskNode[]): string[] {
    if (nodes.length === 0) return [];

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const sorted = this.topologicalSort(nodes);
    const longestPath = new Map<string, number>();
    const predecessor = new Map<string, string | null>();

    for (const id of sorted) {
      longestPath.set(id, 0);
      predecessor.set(id, null);
    }

    for (const id of sorted) {
      const node = nodeMap.get(id)!;
      const currentDist = longestPath.get(id)!;
      const duration = node.estimatedDuration ?? 1;

      // Find nodes that depend on this one
      for (const other of nodes) {
        if (other.dependencies.includes(id)) {
          const newDist = currentDist + duration;
          if (newDist > (longestPath.get(other.id) ?? 0)) {
            longestPath.set(other.id, newDist);
            predecessor.set(other.id, id);
          }
        }
      }
    }

    // Find the node with the longest path (end of critical path)
    let endId = sorted[0];
    let maxDist = 0;
    for (const [id, dist] of longestPath) {
      const node = nodeMap.get(id)!;
      const totalDist = dist + (node.estimatedDuration ?? 1);
      if (totalDist > maxDist) {
        maxDist = totalDist;
        endId = id;
      }
    }

    // Trace back the critical path
    const path: string[] = [endId];
    let current: string | null = predecessor.get(endId) ?? null;
    while (current !== null) {
      path.unshift(current);
      current = predecessor.get(current) ?? null;
    }

    return path;
  }

  // ── Parallel Groups ────────────────────────────────────────

  private computeParallelGroups(nodes: SubtaskNode[]): string[][] {
    if (nodes.length === 0) return [];

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const sorted = this.topologicalSort(nodes);

    // Compute the "level" of each node (longest path from a root)
    const levels = new Map<string, number>();

    for (const id of sorted) {
      const node = nodeMap.get(id)!;
      if (node.dependencies.length === 0) {
        levels.set(id, 0);
      } else {
        let maxDepLevel = -1;
        for (const dep of node.dependencies) {
          maxDepLevel = Math.max(maxDepLevel, levels.get(dep) ?? 0);
        }
        levels.set(id, maxDepLevel + 1);
      }
    }

    // Group nodes by level
    const groups = new Map<number, string[]>();
    for (const [id, level] of levels) {
      if (!groups.has(level)) groups.set(level, []);
      groups.get(level)!.push(id);
    }

    // Return groups in order, only including groups with multiple nodes
    const result: string[][] = [];
    const sortedLevels = Array.from(groups.keys()).sort((a, b) => a - b);
    for (const level of sortedLevels) {
      const group = groups.get(level)!;
      result.push(group);
    }

    return result;
  }

  // ── Helpers ────────────────────────────────────────────────

  private topologicalSort(nodes: SubtaskNode[]): string[] {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const visited = new Set<string>();
    const result: string[] = [];

    const dfs = (id: string): void => {
      if (visited.has(id)) return;
      visited.add(id);

      const node = nodeMap.get(id);
      if (node) {
        for (const dep of node.dependencies) {
          dfs(dep);
        }
      }

      result.push(id);
    };

    for (const node of nodes) {
      dfs(node.id);
    }

    return result;
  }

  private computeTotalDuration(nodes: SubtaskNode[], criticalPath: string[]): number {
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return criticalPath.reduce((sum, id) => {
      const node = nodeMap.get(id);
      return sum + (node?.estimatedDuration ?? 1);
    }, 0);
  }
}
