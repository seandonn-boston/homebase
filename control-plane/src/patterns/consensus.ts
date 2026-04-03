/**
 * Admiral Framework — Consensus Collaboration Pattern (IF-11)
 *
 * Multi-agent voting with configurable quorum. Each voter casts
 * a vote; the proposal passes only if the quorum is met.
 */

export interface Vote<_P = unknown> {
  agentId: string;
  approve: boolean;
  reason: string;
  weight: number;
}

export interface Voter<P = unknown> {
  agentId: string;
  weight?: number;
  evaluate: (
    proposal: P,
  ) => { approve: boolean; reason: string } | Promise<{ approve: boolean; reason: string }>;
}

export interface ConsensusResult<P = unknown> {
  proposal: P;
  passed: boolean;
  totalWeight: number;
  approveWeight: number;
  rejectWeight: number;
  quorumRequired: number;
  votes: Vote<P>[];
}

export interface ConsensusConfig {
  /** Fraction of total weight needed to pass (0-1). Default 0.5. */
  quorum: number;
  /** If true, all voters must participate or the vote fails. */
  requireFullParticipation: boolean;
}

const DEFAULT_CONFIG: ConsensusConfig = {
  quorum: 0.5,
  requireFullParticipation: false,
};

/**
 * Collects votes from multiple agents and determines consensus.
 */
export class ConsensusVoting<P = unknown> {
  private voters: Voter<P>[] = [];
  private config: ConsensusConfig;

  constructor(config?: Partial<ConsensusConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  addVoter(voter: Voter<P>): this {
    this.voters.push(voter);
    return this;
  }

  getVoters(): Voter<P>[] {
    return [...this.voters];
  }

  /**
   * Run a vote on a proposal.
   */
  async vote(proposal: P): Promise<ConsensusResult<P>> {
    const votes: Vote<P>[] = [];
    let participationCount = 0;

    for (const voter of this.voters) {
      const weight = voter.weight ?? 1;
      try {
        const result = await voter.evaluate(proposal);
        votes.push({
          agentId: voter.agentId,
          approve: result.approve,
          reason: result.reason,
          weight,
        });
        participationCount++;
      } catch {
        // Non-participation — only matters if requireFullParticipation
        votes.push({ agentId: voter.agentId, approve: false, reason: "Failed to vote", weight: 0 });
      }
    }

    const totalWeight = votes.reduce((s, v) => s + v.weight, 0);
    const approveWeight = votes.filter((v) => v.approve).reduce((s, v) => s + v.weight, 0);
    const rejectWeight = totalWeight - approveWeight;

    let passed = totalWeight > 0 && approveWeight / totalWeight >= this.config.quorum;

    if (this.config.requireFullParticipation && participationCount < this.voters.length) {
      passed = false;
    }

    return {
      proposal,
      passed,
      totalWeight,
      approveWeight,
      rejectWeight,
      quorumRequired: this.config.quorum,
      votes,
    };
  }
}
