/**
 * Governance tools — standing orders, compliance checks, and escalation.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

import type { ToolRegistry } from "../tool-registry.js";
import type { ToolContext } from "../tool-registry.js";
import { TOOL_SCHEMAS } from "./tool-schemas.js";
import { INVALID_PARAMS } from "../protocol.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StandingOrder {
  id: string;
  name: string;
  description: string;
  enforcement: string;         // "hard-block" | "soft-warn" | "audit-only"
  rules: StandingOrderRule[];
  violationCount?: number;
  lastViolation?: number;
}

export interface StandingOrderRule {
  id: string;
  condition: string;           // human-readable condition
  action: string;              // what to enforce
  category?: string;           // optional category for filtering
}

export interface StandingOrderStatus {
  name: string;
  enforcement: string;
  violationCount: number;
  lastViolation: number | null;
}

export interface EscalationRecord {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  subject: string;
  description: string;
  agent: string;
  filedAt: number;
  routedTo: string;
  status: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadStandingOrders(dir: string): StandingOrder[] {
  try {
    if (!fs.existsSync(dir)) return [];
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    const orders: StandingOrder[] = [];
    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf-8");
        const data = JSON.parse(raw);
        if (data && data.name) {
          orders.push(data as StandingOrder);
        }
      } catch {
        // Skip malformed files
      }
    }
    return orders;
  } catch {
    return [];
  }
}

function routeEscalation(severity: string): string {
  switch (severity) {
    case "critical":
    case "high":
      return "admiral";
    case "medium":
      return "lieutenant";
    case "low":
      return "agent";
    default:
      return "admiral";
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerGovernanceTools(registry: ToolRegistry, standingOrdersDir: string): void {
  // -----------------------------------------------------------------------
  // standing_order_status — universal
  // -----------------------------------------------------------------------
  registry.register(
    {
      name: "standing_order_status",
      description: "Get status of all standing orders",
      inputSchema: TOOL_SCHEMAS.standing_order_status.input,
      outputSchema: TOOL_SCHEMAS.standing_order_status.output,
      category: "governance",
    },
    async (): Promise<unknown> => {
      const orders = loadStandingOrders(standingOrdersDir);
      const statuses: StandingOrderStatus[] = orders.map((order) => ({
        name: order.name,
        enforcement: order.enforcement,
        violationCount: order.violationCount ?? 0,
        lastViolation: order.lastViolation ?? null,
      }));

      return { orders: statuses };
    },
  );

  // -----------------------------------------------------------------------
  // compliance_check — agent+
  // -----------------------------------------------------------------------
  registry.register(
    {
      name: "compliance_check",
      description: "Check if an action complies with standing orders",
      inputSchema: TOOL_SCHEMAS.compliance_check.input,
      outputSchema: TOOL_SCHEMAS.compliance_check.output,
      requiredRole: "agent",
      category: "governance",
    },
    async (params: Record<string, unknown>): Promise<unknown> => {
      const action = params.action as string;
      const agent = params.agent as string;
      const category = params.category as string | undefined;

      if (!action || !agent) {
        throw { code: INVALID_PARAMS, message: "action and agent are required" };
      }

      const orders = loadStandingOrders(standingOrdersDir);
      const violations: Array<{ order: string; reason: string }> = [];

      for (const order of orders) {
        for (const rule of order.rules ?? []) {
          // Filter by category if provided
          if (category && rule.category && rule.category !== category) continue;

          // Check if the action description matches a rule condition (simple keyword match)
          const conditionWords = rule.condition.toLowerCase().split(/\s+/);
          const actionLower = action.toLowerCase();
          const matched = conditionWords.some((w) => w.length > 3 && actionLower.includes(w));

          if (matched) {
            violations.push({
              order: order.name,
              reason: `Action "${action}" may violate rule: ${rule.condition} (enforcement: ${order.enforcement})`,
            });
          }
        }
      }

      return {
        compliant: violations.length === 0,
        violations,
      };
    },
  );

  // -----------------------------------------------------------------------
  // escalation_file — agent+
  // -----------------------------------------------------------------------
  registry.register(
    {
      name: "escalation_file",
      description: "File an escalation report routed by severity",
      inputSchema: TOOL_SCHEMAS.escalation_file.input,
      outputSchema: TOOL_SCHEMAS.escalation_file.output,
      requiredRole: "agent",
      category: "governance",
    },
    async (params: Record<string, unknown>): Promise<unknown> => {
      const severity = params.severity as EscalationRecord["severity"];
      const subject = params.subject as string;
      const description = params.description as string;
      const agent = params.agent as string;

      if (!severity || !subject || !description || !agent) {
        throw { code: INVALID_PARAMS, message: "severity, subject, description, and agent are all required" };
      }

      const validSeverities = ["critical", "high", "medium", "low"];
      if (!validSeverities.includes(severity)) {
        throw { code: INVALID_PARAMS, message: `severity must be one of: ${validSeverities.join(", ")}` };
      }

      const id = `esc-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
      const routedTo = routeEscalation(severity);

      const record: EscalationRecord = {
        id,
        severity,
        subject,
        description,
        agent,
        filedAt: Date.now(),
        routedTo,
        status: "open",
      };

      // Write escalation record to standing-orders dir (escalations subdirectory)
      const escDir = path.join(standingOrdersDir, "escalations");
      if (!fs.existsSync(escDir)) {
        fs.mkdirSync(escDir, { recursive: true });
      }
      fs.writeFileSync(
        path.join(escDir, `${id}.json`),
        JSON.stringify(record, null, 2),
        "utf-8",
      );

      return { id, filed: true, routedTo };
    },
  );
}
