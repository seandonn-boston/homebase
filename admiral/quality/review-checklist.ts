/**
 * Review Checklist Automation (QA-08)
 *
 * Generates risk-appropriate review checklists based on changed files.
 * Classifies file risk (hooks/config = high, tests/docs = low).
 * Includes domain-specific items. Pre-fills automatically verifiable items.
 * Outputs as markdown for PR descriptions.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { basename, extname } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskLevel = "high" | "medium" | "low";

export interface ChecklistItem {
  text: string;
  checked: boolean;
  category: string;
}

export interface FileClassification {
  filePath: string;
  risk: RiskLevel;
  categories: string[];
}

export interface ReviewChecklist {
  title: string;
  files: FileClassification[];
  items: ChecklistItem[];
  overallRisk: RiskLevel;
  summary: string;
}

export interface ChecklistOptions {
  /** Additional custom checklist items */
  customItems?: Array<{ text: string; category: string }>;
  /** Override risk classification for specific paths */
  riskOverrides?: Map<string, RiskLevel>;
}

// ---------------------------------------------------------------------------
// Risk classification rules
// ---------------------------------------------------------------------------

interface ClassificationRule {
  test: (filePath: string) => boolean;
  risk: RiskLevel;
  categories: string[];
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  // High risk: hooks, security, config, core infrastructure
  { test: (p) => p.includes(".hooks/") || p.includes("/hooks/"), risk: "high", categories: ["hooks", "enforcement"] },
  { test: (p) => p.includes("security") || p.includes("Security"), risk: "high", categories: ["security"] },
  { test: (p) => p.includes("admiral/standing-orders"), risk: "high", categories: ["governance", "standing-orders"] },
  { test: (p) => p.includes("governance"), risk: "high", categories: ["governance"] },
  { test: (p) => basename(p) === "package.json" || basename(p) === "package-lock.json", risk: "high", categories: ["dependencies"] },
  { test: (p) => basename(p) === "tsconfig.json" || basename(p).endsWith(".config.ts") || basename(p).endsWith(".config.js"), risk: "high", categories: ["config"] },
  { test: (p) => p.includes(".github/workflows/"), risk: "high", categories: ["ci-cd"] },
  { test: (p) => basename(p) === "AGENTS.md" || basename(p) === "CLAUDE.md", risk: "high", categories: ["agent-config"] },
  { test: (p) => p.includes("auth") || p.includes("rbac") || p.includes("permission"), risk: "high", categories: ["security", "auth"] },

  // Medium risk: core logic, fleet, brain, platform
  { test: (p) => p.includes("admiral/") && !p.includes(".test."), risk: "medium", categories: ["core-logic"] },
  { test: (p) => p.includes("fleet/"), risk: "medium", categories: ["fleet"] },
  { test: (p) => p.includes("brain/"), risk: "medium", categories: ["brain", "knowledge"] },
  { test: (p) => p.includes("platform/"), risk: "medium", categories: ["platform"] },
  { test: (p) => p.includes("mcp-server/"), risk: "medium", categories: ["mcp"] },
  { test: (p) => p.includes("control-plane/"), risk: "medium", categories: ["control-plane"] },

  // Low risk: tests, docs, plans
  { test: (p) => p.includes(".test.") || p.includes(".spec."), risk: "low", categories: ["tests"] },
  { test: (p) => p.includes("plan/"), risk: "low", categories: ["planning"] },
  { test: (p) => p.includes("docs/"), risk: "low", categories: ["documentation"] },
  { test: (p) => extname(p) === ".md", risk: "low", categories: ["documentation"] },
  { test: (p) => p.includes("research/"), risk: "low", categories: ["research"] },
];

// ---------------------------------------------------------------------------
// Domain-specific checklist templates
// ---------------------------------------------------------------------------

interface ChecklistTemplate {
  category: string;
  items: Array<{ text: string; autoVerifiable: boolean }>;
}

const CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
  {
    category: "hooks",
    items: [
      { text: "Hook input/output contracts match spec", autoVerifiable: false },
      { text: "Hook has dedicated test file", autoVerifiable: true },
      { text: "Hook handles malformed input gracefully", autoVerifiable: false },
      { text: "Standing Orders enforcement not weakened", autoVerifiable: false },
    ],
  },
  {
    category: "security",
    items: [
      { text: "No hardcoded secrets or credentials", autoVerifiable: true },
      { text: "No eval() or dynamic code execution", autoVerifiable: true },
      { text: "Input validation present for external data", autoVerifiable: false },
      { text: "No new attack surfaces introduced", autoVerifiable: false },
      { text: "Audit trail captures enforcement events", autoVerifiable: false },
    ],
  },
  {
    category: "dependencies",
    items: [
      { text: "No unnecessary new dependencies added", autoVerifiable: false },
      { text: "Dependencies have acceptable licenses", autoVerifiable: false },
      { text: "Lock file updated consistently", autoVerifiable: true },
    ],
  },
  {
    category: "ci-cd",
    items: [
      { text: "CI pipeline still passes", autoVerifiable: true },
      { text: "No security checks removed or weakened", autoVerifiable: false },
      { text: "Coverage gates not lowered", autoVerifiable: false },
    ],
  },
  {
    category: "governance",
    items: [
      { text: "Standing Orders compliance maintained", autoVerifiable: false },
      { text: "Decision authority boundaries respected", autoVerifiable: false },
      { text: "Enforcement is deterministic, not advisory", autoVerifiable: false },
    ],
  },
  {
    category: "core-logic",
    items: [
      { text: "Happy path tests present", autoVerifiable: true },
      { text: "Unhappy path tests present", autoVerifiable: true },
      { text: "No regressions to existing behavior", autoVerifiable: false },
      { text: "Error handling covers edge cases", autoVerifiable: false },
    ],
  },
  {
    category: "tests",
    items: [
      { text: "Tests actually assert behavior (not just running)", autoVerifiable: false },
      { text: "Edge cases covered", autoVerifiable: false },
    ],
  },
  {
    category: "documentation",
    items: [
      { text: "Documentation reflects current behavior", autoVerifiable: false },
      { text: "No broken links or references", autoVerifiable: false },
    ],
  },
  {
    category: "brain",
    items: [
      { text: "Brain entries are schema-validated", autoVerifiable: false },
      { text: "No data loss paths introduced", autoVerifiable: false },
    ],
  },
  {
    category: "fleet",
    items: [
      { text: "Agent definitions follow schema", autoVerifiable: false },
      { text: "Routing rules tested", autoVerifiable: false },
    ],
  },
  {
    category: "mcp",
    items: [
      { text: "MCP tool inputs validated", autoVerifiable: false },
      { text: "RBAC enforced on tool access", autoVerifiable: false },
    ],
  },
  {
    category: "platform",
    items: [
      { text: "Adapter interface contract maintained", autoVerifiable: false },
      { text: "Cross-platform behavior consistent", autoVerifiable: false },
    ],
  },
  {
    category: "config",
    items: [
      { text: "Config changes are backwards-compatible", autoVerifiable: false },
      { text: "Schema validation updated if needed", autoVerifiable: false },
    ],
  },
  {
    category: "agent-config",
    items: [
      { text: "Agent identity/authority not weakened", autoVerifiable: false },
      { text: "Boundary changes are intentional", autoVerifiable: false },
    ],
  },
];

// Universal items always included
const UNIVERSAL_ITEMS: Array<{ text: string; autoVerifiable: boolean; category: string }> = [
  { text: "Changes are scoped to the task — no scope creep", autoVerifiable: false, category: "general" },
  { text: "Commit messages describe the why, not just the what", autoVerifiable: false, category: "general" },
];

// ---------------------------------------------------------------------------
// Checklist generator
// ---------------------------------------------------------------------------

export function classifyFile(filePath: string, overrides?: Map<string, RiskLevel>): FileClassification {
  if (overrides?.has(filePath)) {
    const risk = overrides.get(filePath)!;
    return { filePath, risk, categories: [] };
  }

  for (const rule of CLASSIFICATION_RULES) {
    if (rule.test(filePath)) {
      return { filePath, risk: rule.risk, categories: [...rule.categories] };
    }
  }

  // Default: medium risk for unclassified files
  return { filePath, risk: "medium", categories: ["unclassified"] };
}

export function generateChecklist(changedFiles: string[], options: ChecklistOptions = {}): ReviewChecklist {
  // Classify all files
  const classifications = changedFiles.map((f) => classifyFile(f, options.riskOverrides));

  // Determine overall risk (highest among all files)
  const riskOrder: RiskLevel[] = ["high", "medium", "low"];
  const overallRisk = riskOrder.find((r) => classifications.some((c) => c.risk === r)) ?? "low";

  // Collect unique categories
  const activeCategories = new Set<string>();
  for (const c of classifications) {
    for (const cat of c.categories) {
      activeCategories.add(cat);
    }
  }

  // Build checklist items from templates matching active categories
  const items: ChecklistItem[] = [];
  const seenTexts = new Set<string>();

  // Add universal items
  for (const item of UNIVERSAL_ITEMS) {
    items.push({ text: item.text, checked: false, category: item.category });
    seenTexts.add(item.text);
  }

  // Add category-specific items
  for (const template of CHECKLIST_TEMPLATES) {
    if (!activeCategories.has(template.category)) continue;

    for (const item of template.items) {
      if (seenTexts.has(item.text)) continue;
      seenTexts.add(item.text);
      items.push({
        text: item.text,
        checked: item.autoVerifiable, // Pre-fill auto-verifiable items
        category: template.category,
      });
    }
  }

  // Add custom items
  if (options.customItems) {
    for (const item of options.customItems) {
      if (!seenTexts.has(item.text)) {
        items.push({ text: item.text, checked: false, category: item.category });
        seenTexts.add(item.text);
      }
    }
  }

  // Build summary
  const highCount = classifications.filter((c) => c.risk === "high").length;
  const medCount = classifications.filter((c) => c.risk === "medium").length;
  const lowCount = classifications.filter((c) => c.risk === "low").length;
  const summary = `${changedFiles.length} files changed: ${highCount} high-risk, ${medCount} medium-risk, ${lowCount} low-risk`;

  return {
    title: `Review Checklist (${overallRisk} risk)`,
    files: classifications,
    items,
    overallRisk,
    summary,
  };
}

// ---------------------------------------------------------------------------
// Markdown formatter
// ---------------------------------------------------------------------------

export function formatChecklistMarkdown(checklist: ReviewChecklist): string {
  const lines: string[] = [];

  lines.push(`## ${checklist.title}`);
  lines.push("");
  lines.push(`> ${checklist.summary}`);
  lines.push("");

  // Group items by category
  const byCategory = new Map<string, ChecklistItem[]>();
  for (const item of checklist.items) {
    const list = byCategory.get(item.category) ?? [];
    list.push(item);
    byCategory.set(item.category, list);
  }

  for (const [category, categoryItems] of byCategory) {
    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    lines.push("");
    for (const item of categoryItems) {
      const check = item.checked ? "x" : " ";
      lines.push(`- [${check}] ${item.text}`);
    }
    lines.push("");
  }

  // File risk summary
  lines.push("### Changed Files");
  lines.push("");
  lines.push("| File | Risk |");
  lines.push("|------|------|");
  for (const file of checklist.files) {
    const icon = file.risk === "high" ? "HIGH" : file.risk === "medium" ? "MED" : "LOW";
    lines.push(`| \`${file.filePath}\` | ${icon} |`);
  }
  lines.push("");

  return lines.join("\n");
}
