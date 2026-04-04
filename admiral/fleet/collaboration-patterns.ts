/**
 * Agent Collaboration Patterns (IF-11)
 *
 * Reusable multi-agent coordination primitives:
 * Pipeline, Broadcast, Consensus, Delegation.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatternType = "pipeline" | "broadcast" | "consensus" | "delegation";

export interface AgentTask {
  id: string;
  agentId: string;
  input: unknown;
  output: unknown;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string | null;
  completedAt: string | null;
}

export interface PatternResult {
  pattern: PatternType;
  tasks: AgentTask[];
  success: boolean;
  output: unknown;
  durationMs: number;
}

export type TaskExecutor = (agentId: string, input: unknown) => Promise<unknown>;

// ---------------------------------------------------------------------------
// Pattern Implementations
// ---------------------------------------------------------------------------

/**
 * Pipeline: Sequential execution, each agent's output feeds the next.
 */
export async function pipeline(
  agents: string[],
  initialInput: unknown,
  executor: TaskExecutor,
): Promise<PatternResult> {
  const start = Date.now();
  const tasks: AgentTask[] = [];
  let currentInput = initialInput;

  for (const agentId of agents) {
    const task: AgentTask = {
      id: `pipe-${tasks.length}`, agentId, input: currentInput, output: null,
      status: "running", startedAt: new Date().toISOString(), completedAt: null,
    };
    tasks.push(task);

    try {
      task.output = await executor(agentId, currentInput);
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      currentInput = task.output;
    } catch {
      task.status = "failed";
      task.completedAt = new Date().toISOString();
      return { pattern: "pipeline", tasks, success: false, output: null, durationMs: Date.now() - start };
    }
  }

  return { pattern: "pipeline", tasks, success: true, output: currentInput, durationMs: Date.now() - start };
}

/**
 * Broadcast: One-to-many, all agents receive same input in parallel.
 */
export async function broadcast(
  agents: string[],
  input: unknown,
  executor: TaskExecutor,
): Promise<PatternResult> {
  const start = Date.now();
  const tasks: AgentTask[] = agents.map((agentId, i) => ({
    id: `bcast-${i}`, agentId, input, output: null,
    status: "running" as const, startedAt: new Date().toISOString(), completedAt: null,
  }));

  const results = await Promise.allSettled(
    agents.map((agentId) => executor(agentId, input)),
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      tasks[i].output = r.value;
      tasks[i].status = "completed";
    } else {
      tasks[i].status = "failed";
    }
    tasks[i].completedAt = new Date().toISOString();
  }

  const outputs = tasks.filter((t) => t.status === "completed").map((t) => t.output);
  return { pattern: "broadcast", tasks, success: outputs.length > 0, output: outputs, durationMs: Date.now() - start };
}

/**
 * Consensus: Voting with quorum — majority of agents must agree.
 */
export async function consensus(
  agents: string[],
  input: unknown,
  executor: TaskExecutor,
  quorum?: number,
): Promise<PatternResult> {
  const start = Date.now();
  const result = await broadcast(agents, input, executor);
  const outputs = result.tasks.filter((t) => t.status === "completed").map((t) => JSON.stringify(t.output));
  const requiredQuorum = quorum ?? Math.ceil(agents.length / 2);

  // Count votes
  const votes = new Map<string, number>();
  for (const output of outputs) {
    votes.set(output, (votes.get(output) ?? 0) + 1);
  }

  let winner: unknown = null;
  let maxVotes = 0;
  for (const [output, count] of votes) {
    if (count > maxVotes) {
      maxVotes = count;
      try { winner = JSON.parse(output); } catch { winner = output; }
    }
  }

  const success = maxVotes >= requiredQuorum;
  return { pattern: "consensus", tasks: result.tasks, success, output: winner, durationMs: Date.now() - start };
}

/**
 * Delegation: Orchestrator assigns subtasks to specific agents.
 */
export async function delegation(
  assignments: { agentId: string; input: unknown }[],
  executor: TaskExecutor,
): Promise<PatternResult> {
  const start = Date.now();
  const tasks: AgentTask[] = assignments.map((a, i) => ({
    id: `deleg-${i}`, agentId: a.agentId, input: a.input, output: null,
    status: "running" as const, startedAt: new Date().toISOString(), completedAt: null,
  }));

  const results = await Promise.allSettled(
    assignments.map((a) => executor(a.agentId, a.input)),
  );

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "fulfilled") {
      tasks[i].output = r.value;
      tasks[i].status = "completed";
    } else {
      tasks[i].status = "failed";
    }
    tasks[i].completedAt = new Date().toISOString();
  }

  const allCompleted = tasks.every((t) => t.status === "completed");
  const outputs = tasks.map((t) => ({ agentId: t.agentId, output: t.output }));
  return { pattern: "delegation", tasks, success: allCompleted, output: outputs, durationMs: Date.now() - start };
}
