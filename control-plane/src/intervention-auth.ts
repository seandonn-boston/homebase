/**
 * Admiral Framework — Intervention Authorization (OB-16)
 *
 * Defines authorization levels for operator interventions.
 * Maps each intervention type to a required authority level.
 */

export type InterventionType =
  | "pause_agent"
  | "emergency_halt"
  | "kill_task"
  | "adjust_budget"
  | "override_propose"
  | "reroute_task"
  | "promote_tier"
  | "demote_tier"
  | "modify_policies"
  | "resume_agent";

export type AuthLevel = "any" | "operator" | "owner";

export interface InterventionAuthConfig {
  interventionType: InterventionType;
  requiredLevel: AuthLevel;
}

const AUTH_LEVEL_ORDINALS: Record<AuthLevel, number> = {
  any: 0,
  operator: 1,
  owner: 2,
};

const DEFAULT_AUTH_CONFIG: InterventionAuthConfig[] = [
  { interventionType: "pause_agent", requiredLevel: "any" },
  { interventionType: "emergency_halt", requiredLevel: "any" },
  { interventionType: "kill_task", requiredLevel: "operator" },
  { interventionType: "adjust_budget", requiredLevel: "operator" },
  { interventionType: "override_propose", requiredLevel: "operator" },
  { interventionType: "reroute_task", requiredLevel: "operator" },
  { interventionType: "promote_tier", requiredLevel: "operator" },
  { interventionType: "demote_tier", requiredLevel: "operator" },
  { interventionType: "modify_policies", requiredLevel: "owner" },
  { interventionType: "resume_agent", requiredLevel: "owner" },
];

/**
 * Authorizes operator interventions based on configured authority levels.
 *
 * Key rule: resume_agent always requires owner regardless of the
 * intervention type that caused the pause.
 */
export class InterventionAuthorizer {
  private config: InterventionAuthConfig[];

  constructor(config?: InterventionAuthConfig[]) {
    this.config = config ?? [...DEFAULT_AUTH_CONFIG];
  }

  /**
   * Check whether the given operator level is authorized
   * to perform the given intervention.
   */
  authorize(
    interventionType: InterventionType,
    operatorLevel: AuthLevel,
  ): { authorized: boolean; reason?: string } {
    const required = this.getRequiredLevel(interventionType);

    const operatorOrd = AUTH_LEVEL_ORDINALS[operatorLevel];
    const requiredOrd = AUTH_LEVEL_ORDINALS[required];

    if (operatorOrd >= requiredOrd) {
      return { authorized: true };
    }

    return {
      authorized: false,
      reason: `Intervention "${interventionType}" requires "${required}" level, but operator has "${operatorLevel}"`,
    };
  }

  /**
   * Get the minimum required auth level for an intervention type.
   */
  getRequiredLevel(interventionType: InterventionType): AuthLevel {
    const entry = this.config.find(
      (c) => c.interventionType === interventionType,
    );
    return entry?.requiredLevel ?? "owner"; // default to highest if unknown
  }
}
