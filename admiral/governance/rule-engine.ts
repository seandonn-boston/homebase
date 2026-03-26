/**
 * Governance Rule Engine (MG-06)
 *
 * Declarative rule engine for governance policy evaluation.
 * Supports threshold, pattern, temporal, and composite conditions.
 * Rules are serializable for version control.
 * Zero external dependencies — Node.js built-ins only.
 */

import type { GovernanceEventBus, GovernanceEvent, GovernanceEventType } from "./framework";
import { InterventionLevel } from "./framework";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RuleConditionType = "threshold" | "pattern" | "temporal" | "composite";

export interface ThresholdCondition {
  metric: string;
  operator: ">" | ">=" | "<" | "<=" | "==";
  value: number;
}

export interface PatternCondition {
  eventTypes: GovernanceEventType[];
  minOccurrences: number;
  windowMs: number;
}

export interface TemporalCondition {
  metric: string;
  changePercent: number;
  windowMs: number;
  direction: "increase" | "decrease";
}

export interface CompositeCondition {
  operator: "AND" | "OR";
  conditions: (ThresholdCondition | PatternCondition | TemporalCondition)[];
}

export interface RuleAction {
  level: InterventionLevel;
  message: string;
  targetAgent?: string;
}

export interface GovernanceRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditionType: RuleConditionType;
  condition: ThresholdCondition | PatternCondition | TemporalCondition | CompositeCondition;
  action: RuleAction;
  version: number;
  lastModified: number;
}

export interface RuleEvaluation {
  ruleId: string;
  triggered: boolean;
  condition: string;
  action?: RuleAction;
  evidence: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// GovernanceRuleEngine
// ---------------------------------------------------------------------------

export class GovernanceRuleEngine {
  private rules: Map<string, GovernanceRule> = new Map();
  private bus: GovernanceEventBus;

  constructor(bus: GovernanceEventBus) {
    this.bus = bus;
  }

  // -----------------------------------------------------------------------
  // Rule management
  // -----------------------------------------------------------------------

  addRule(rule: GovernanceRule): void {
    this.rules.set(rule.id, { ...rule });
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      rule.lastModified = Date.now();
    }
  }

  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      rule.lastModified = Date.now();
    }
  }

  getRules(): GovernanceRule[] {
    return [...this.rules.values()];
  }

  getRule(ruleId: string): GovernanceRule | undefined {
    const rule = this.rules.get(ruleId);
    return rule ? { ...rule } : undefined;
  }

  // -----------------------------------------------------------------------
  // Evaluation
  // -----------------------------------------------------------------------

  evaluate(events: GovernanceEvent[], metrics?: Record<string, number>): RuleEvaluation[] {
    const results: RuleEvaluation[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      const evaluation = this.evaluateRule(rule, events, metrics ?? {});
      results.push(evaluation);

      if (evaluation.triggered) {
        this.bus.emit({
          type: "compliance_finding",
          severity: rule.action.level >= InterventionLevel.Suspend ? "critical" : "high",
          sourceAgent: "rule-engine",
          targetAgent: rule.action.targetAgent,
          data: {
            ruleId: rule.id,
            ruleName: rule.name,
            action: rule.action,
            evidence: evaluation.evidence,
          },
        });
      }
    }

    return results;
  }

  // -----------------------------------------------------------------------
  // Serialization
  // -----------------------------------------------------------------------

  exportRules(): string {
    return JSON.stringify([...this.rules.values()], null, 2);
  }

  importRules(json: string): void {
    const parsed = JSON.parse(json) as GovernanceRule[];
    for (const rule of parsed) {
      this.rules.set(rule.id, rule);
    }
  }

  // -----------------------------------------------------------------------
  // Private evaluation helpers
  // -----------------------------------------------------------------------

  private evaluateRule(
    rule: GovernanceRule,
    events: GovernanceEvent[],
    metrics: Record<string, number>,
  ): RuleEvaluation {
    switch (rule.conditionType) {
      case "threshold":
        return this.evaluateThreshold(rule, metrics);
      case "pattern":
        return this.evaluatePattern(rule, events);
      case "temporal":
        return this.evaluateTemporal(rule, metrics);
      case "composite":
        return this.evaluateComposite(rule, events, metrics);
      default:
        return {
          ruleId: rule.id,
          triggered: false,
          condition: `unknown condition type: ${rule.conditionType}`,
          evidence: {},
        };
    }
  }

  private evaluateThreshold(rule: GovernanceRule, metrics: Record<string, number>): RuleEvaluation {
    const cond = rule.condition as ThresholdCondition;
    const actual = metrics[cond.metric];
    if (actual == null) {
      return { ruleId: rule.id, triggered: false, condition: `${cond.metric} ${cond.operator} ${cond.value}`, evidence: { metricMissing: true } };
    }

    let triggered = false;
    switch (cond.operator) {
      case ">": triggered = actual > cond.value; break;
      case ">=": triggered = actual >= cond.value; break;
      case "<": triggered = actual < cond.value; break;
      case "<=": triggered = actual <= cond.value; break;
      case "==": triggered = actual === cond.value; break;
    }

    return {
      ruleId: rule.id,
      triggered,
      condition: `${cond.metric} ${cond.operator} ${cond.value}`,
      action: triggered ? rule.action : undefined,
      evidence: { metric: cond.metric, actual, threshold: cond.value },
    };
  }

  private evaluatePattern(rule: GovernanceRule, events: GovernanceEvent[]): RuleEvaluation {
    const cond = rule.condition as PatternCondition;
    const now = Date.now();
    const cutoff = now - cond.windowMs;

    const matching = events.filter(
      (e) => cond.eventTypes.includes(e.type) && e.timestamp >= cutoff,
    );

    const triggered = matching.length >= cond.minOccurrences;

    return {
      ruleId: rule.id,
      triggered,
      condition: `${cond.eventTypes.join(",")} >= ${cond.minOccurrences} in ${cond.windowMs}ms`,
      action: triggered ? rule.action : undefined,
      evidence: { matchCount: matching.length, required: cond.minOccurrences, windowMs: cond.windowMs },
    };
  }

  private evaluateTemporal(rule: GovernanceRule, metrics: Record<string, number>): RuleEvaluation {
    const cond = rule.condition as TemporalCondition;
    const current = metrics[cond.metric];
    const baseline = metrics[`${cond.metric}_baseline`];

    if (current == null || baseline == null || baseline === 0) {
      return {
        ruleId: rule.id,
        triggered: false,
        condition: `${cond.metric} ${cond.direction} ${cond.changePercent}%`,
        evidence: { metricMissing: true, current, baseline },
      };
    }

    const changePercent = ((current - baseline) / Math.abs(baseline)) * 100;
    let triggered = false;

    if (cond.direction === "increase") {
      triggered = changePercent >= cond.changePercent;
    } else {
      triggered = changePercent <= -cond.changePercent;
    }

    return {
      ruleId: rule.id,
      triggered,
      condition: `${cond.metric} ${cond.direction} ${cond.changePercent}%`,
      action: triggered ? rule.action : undefined,
      evidence: { metric: cond.metric, current, baseline, actualChangePercent: changePercent },
    };
  }

  private evaluateComposite(
    rule: GovernanceRule,
    events: GovernanceEvent[],
    metrics: Record<string, number>,
  ): RuleEvaluation {
    const cond = rule.condition as CompositeCondition;
    const subResults: boolean[] = [];
    const subEvidence: Record<string, unknown>[] = [];

    for (const sub of cond.conditions) {
      // Determine sub-condition type
      let subTriggered = false;
      let evidence: Record<string, unknown> = {};

      if ("metric" in sub && "operator" in sub) {
        const eval_ = this.evaluateThreshold({ ...rule, conditionType: "threshold", condition: sub }, metrics);
        subTriggered = eval_.triggered;
        evidence = eval_.evidence;
      } else if ("eventTypes" in sub) {
        const eval_ = this.evaluatePattern({ ...rule, conditionType: "pattern", condition: sub }, events);
        subTriggered = eval_.triggered;
        evidence = eval_.evidence;
      } else if ("metric" in sub && "changePercent" in sub) {
        const eval_ = this.evaluateTemporal({ ...rule, conditionType: "temporal", condition: sub }, metrics);
        subTriggered = eval_.triggered;
        evidence = eval_.evidence;
      }

      subResults.push(subTriggered);
      subEvidence.push(evidence);
    }

    const triggered = cond.operator === "AND"
      ? subResults.every(Boolean)
      : subResults.some(Boolean);

    return {
      ruleId: rule.id,
      triggered,
      condition: `${cond.operator}(${subResults.length} conditions)`,
      action: triggered ? rule.action : undefined,
      evidence: { operator: cond.operator, subResults, subEvidence },
    };
  }
}
