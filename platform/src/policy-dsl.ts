/**
 * Governance Policy Language DSL (GP-04)
 *
 * Declarative governance rules: threshold, pattern, and temporal rules
 * with scope selectors, actions, AND/OR/NOT composition.
 * Expressible as JSON/YAML with human-readable rendering.
 */

export type RuleType = "threshold" | "pattern" | "temporal";
export type Operator = "gt" | "lt" | "eq" | "gte" | "lte" | "contains" | "matches";
export type Combinator = "and" | "or" | "not";
export type ActionType = "block" | "warn" | "log" | "escalate" | "notify";

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  type: RuleType;
  scope: ScopeSelector;
  condition: Condition;
  actions: Action[];
  enabled: boolean;
  priority: number;
}

export interface ScopeSelector {
  agents?: string[];
  tools?: string[];
  paths?: string[];
  tiers?: string[];
}

export interface Condition {
  field?: string;
  operator?: Operator;
  value?: unknown;
  combinator?: Combinator;
  conditions?: Condition[];
}

export interface Action {
  type: ActionType;
  message?: string;
  target?: string;
}

export class PolicyEngine {
  private rules: PolicyRule[] = [];

  addRule(rule: PolicyRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  removeRule(id: string): boolean {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx === -1) return false;
    this.rules.splice(idx, 1);
    return true;
  }

  evaluate(context: Record<string, unknown>): Action[] {
    const triggered: Action[] = [];
    for (const rule of this.rules) {
      if (!rule.enabled) continue;
      if (this.matchesScope(rule.scope, context) && this.evaluateCondition(rule.condition, context)) {
        triggered.push(...rule.actions);
      }
    }
    return triggered;
  }

  getRules(): PolicyRule[] {
    return [...this.rules];
  }

  toHumanReadable(rule: PolicyRule): string {
    const scope = rule.scope.agents?.join(", ") ?? "all agents";
    const cond = this.conditionToString(rule.condition);
    const acts = rule.actions.map((a) => `${a.type}${a.message ? `: "${a.message}"` : ""}`).join(", ");
    return `WHEN ${cond} FOR ${scope} THEN ${acts}`;
  }

  private matchesScope(scope: ScopeSelector, context: Record<string, unknown>): boolean {
    if (scope.agents && context.agentId) {
      if (!scope.agents.includes(context.agentId as string)) return false;
    }
    if (scope.tools && context.toolName) {
      if (!scope.tools.includes(context.toolName as string)) return false;
    }
    return true;
  }

  private evaluateCondition(condition: Condition, context: Record<string, unknown>): boolean {
    if (condition.combinator === "and" && condition.conditions) {
      return condition.conditions.every((c) => this.evaluateCondition(c, context));
    }
    if (condition.combinator === "or" && condition.conditions) {
      return condition.conditions.some((c) => this.evaluateCondition(c, context));
    }
    if (condition.combinator === "not" && condition.conditions?.[0]) {
      return !this.evaluateCondition(condition.conditions[0], context);
    }
    if (!condition.field || !condition.operator) return true;

    const actual = context[condition.field];
    const expected = condition.value;

    switch (condition.operator) {
      case "gt": return (actual as number) > (expected as number);
      case "lt": return (actual as number) < (expected as number);
      case "eq": return actual === expected;
      case "gte": return (actual as number) >= (expected as number);
      case "lte": return (actual as number) <= (expected as number);
      case "contains": return String(actual).includes(String(expected));
      case "matches": return new RegExp(String(expected)).test(String(actual));
    }
  }

  private conditionToString(c: Condition): string {
    if (c.combinator && c.conditions) {
      const parts = c.conditions.map((cc) => this.conditionToString(cc));
      if (c.combinator === "not") return `NOT (${parts[0]})`;
      return parts.join(` ${c.combinator.toUpperCase()} `);
    }
    return `${c.field} ${c.operator} ${JSON.stringify(c.value)}`;
  }
}
