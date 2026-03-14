// Reference implementation sketch for the Level 1-2 Fleet Control Plane.
// See aiStrat/admiral/fleet-control-plane.md for the full specification.

/** Structured event emitted by agents or the control plane itself. */
export interface FleetEvent {
  ts: string;
  event: string;
  agent: string;
  [key: string]: unknown;
}

/** Health status for an agent. */
export type AgentHealth = 'green' | 'yellow' | 'red';

/** Snapshot of a single agent's state. */
export interface AgentStatus {
  id: string;
  role: string;
  status: 'active' | 'idle' | 'paused' | 'failed';
  health: AgentHealth;
  currentTask: string | null;
  tokensUsed: number;
  tokenBudget: number;
  errors: number;
  lastEventTs: string | null;
}

/** Top-level fleet snapshot returned by the status API. */
export interface FleetSnapshot {
  agents: AgentStatus[];
  events: FleetEvent[];
  totalBudget: number;
  totalUsed: number;
}
