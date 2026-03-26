/**
 * Admiral Framework — Session Thermal Model (OB-15)
 *
 * Tracks token consumption per session as a "thermal" metaphor.
 * Budget is descriptive, not prescriptive — sessions can run "hot"
 * without being blocked.
 */

export interface ThermalState {
  sessionId: string;
  budget: number; // 0 = unlimited
  consumed: number;
  temperature: "cold" | "warm" | "hot" | "critical";
  advisoryCheckpoints: number[];
  warnings: { at: number; message: string }[];
}

/**
 * Temperature thresholds as percentage of budget consumed.
 * When budget is 0 (unlimited), temperature is based on absolute consumption.
 */
const TEMPERATURE_THRESHOLDS = {
  warm: 0.5, // 50% of budget
  hot: 0.8, // 80% of budget
  critical: 0.95, // 95% of budget
};

const ABSOLUTE_THRESHOLDS = {
  warm: 50_000,
  hot: 150_000,
  critical: 300_000,
};

/**
 * Monitors session token consumption and provides thermal state advisories.
 * Budget is descriptive — sessions can run "hot" without being blocked.
 */
export class SessionThermalModel {
  private sessions: Map<string, ThermalState> = new Map();

  /**
   * Create a new session with an optional token budget.
   * Budget of 0 means unlimited.
   */
  createSession(sessionId: string, budget = 0): ThermalState {
    const checkpoints =
      budget > 0
        ? [
            Math.floor(budget * TEMPERATURE_THRESHOLDS.warm),
            Math.floor(budget * TEMPERATURE_THRESHOLDS.hot),
            Math.floor(budget * TEMPERATURE_THRESHOLDS.critical),
          ]
        : [
            ABSOLUTE_THRESHOLDS.warm,
            ABSOLUTE_THRESHOLDS.hot,
            ABSOLUTE_THRESHOLDS.critical,
          ];

    const state: ThermalState = {
      sessionId,
      budget,
      consumed: 0,
      temperature: "cold",
      advisoryCheckpoints: checkpoints,
      warnings: [],
    };

    this.sessions.set(sessionId, state);
    return state;
  }

  /**
   * Record token consumption and update thermal state.
   * Returns the updated state including any new warnings.
   */
  recordConsumption(sessionId: string, tokens: number): ThermalState {
    const state = this.sessions.get(sessionId);
    if (!state) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const prevConsumed = state.consumed;
    state.consumed += tokens;

    // Check advisory checkpoints
    for (const checkpoint of state.advisoryCheckpoints) {
      if (prevConsumed < checkpoint && state.consumed >= checkpoint) {
        state.warnings.push({
          at: state.consumed,
          message: `Token consumption reached ${checkpoint} tokens`,
        });
      }
    }

    // Update temperature
    state.temperature = this.computeTemperature(state);

    return state;
  }

  /**
   * Get the current temperature for a session.
   */
  getTemperature(sessionId: string): "cold" | "warm" | "hot" | "critical" {
    const state = this.sessions.get(sessionId);
    if (!state) return "cold";
    return state.temperature;
  }

  /**
   * Get all warnings for a session.
   */
  getWarnings(sessionId: string): string[] {
    const state = this.sessions.get(sessionId);
    if (!state) return [];
    return state.warnings.map((w) => w.message);
  }

  /**
   * Check if a session is over budget.
   * Informational only — does not block execution.
   */
  isOverBudget(sessionId: string): boolean {
    const state = this.sessions.get(sessionId);
    if (!state) return false;
    if (state.budget === 0) return false; // unlimited
    return state.consumed > state.budget;
  }

  /**
   * Get the full thermal state for a session.
   */
  getState(sessionId: string): ThermalState | undefined {
    return this.sessions.get(sessionId);
  }

  private computeTemperature(
    state: ThermalState,
  ): "cold" | "warm" | "hot" | "critical" {
    if (state.budget > 0) {
      const ratio = state.consumed / state.budget;
      if (ratio >= TEMPERATURE_THRESHOLDS.critical) return "critical";
      if (ratio >= TEMPERATURE_THRESHOLDS.hot) return "hot";
      if (ratio >= TEMPERATURE_THRESHOLDS.warm) return "warm";
      return "cold";
    }

    // Unlimited budget — use absolute thresholds
    if (state.consumed >= ABSOLUTE_THRESHOLDS.critical) return "critical";
    if (state.consumed >= ABSOLUTE_THRESHOLDS.hot) return "hot";
    if (state.consumed >= ABSOLUTE_THRESHOLDS.warm) return "warm";
    return "cold";
  }
}
