/**
 * Admiral Framework — Per-Module Ratings (RT-07)
 *
 * Rate individual modules/directories independently.
 * Critical module ratings cap the project rating.
 * Module classification: critical (hooks, governance), standard (control-plane), support (docs, config).
 *
 * Zero external dependencies — Node.js built-ins only.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import {
  compareTiers,
  type DimensionId,
  type DimensionScore,
  type ModuleClassification,
  type ModuleRating,
  type RatingTierCode,
  scoreToTier,
} from "./types";

// ---------------------------------------------------------------------------
// Module definition
// ---------------------------------------------------------------------------

export interface ModuleDefinition {
  /** Module path relative to project root (or absolute) */
  path: string;
  /** Human-readable module name */
  name: string;
  /** Classification determines how this module's rating affects project cap */
  classification: ModuleClassification;
  /** If true, this module's tier acts as a cap on the project rating */
  isCritical: boolean;
}

// ---------------------------------------------------------------------------
// Module cap rules
// ---------------------------------------------------------------------------

/**
 * How critical module tiers cap the project tier.
 * A critical module at ADM-4 caps the project at ADM-3 (cannot be ADM-2+).
 * A critical module at ADM-5 caps the project at ADM-4.
 */
const CRITICAL_MODULE_CAP: Record<RatingTierCode, RatingTierCode> = {
  "ADM-1": "ADM-1", // no cap
  "ADM-2": "ADM-2", // no cap
  "ADM-3": "ADM-3", // caps project at ADM-3
  "ADM-4": "ADM-3", // critical module at ADM-4 caps project at ADM-3
  "ADM-5": "ADM-4", // critical module at ADM-5 caps project at ADM-4
};

// ---------------------------------------------------------------------------
// Default module map (auto-discovered from known paths)
// ---------------------------------------------------------------------------

const DEFAULT_MODULE_PATTERNS: Array<{
  pathSegment: string;
  name: string;
  classification: ModuleClassification;
  isCritical: boolean;
}> = [
  { pathSegment: ".hooks", name: "Hooks", classification: "critical", isCritical: true },
  {
    pathSegment: "admiral/governance",
    name: "Governance",
    classification: "critical",
    isCritical: true,
  },
  {
    pathSegment: "admiral/standing-orders",
    name: "Standing Orders",
    classification: "critical",
    isCritical: true,
  },
  {
    pathSegment: "admiral/security",
    name: "Security",
    classification: "critical",
    isCritical: true,
  },
  {
    pathSegment: "control-plane/src",
    name: "Control Plane",
    classification: "standard",
    isCritical: false,
  },
  { pathSegment: "admiral/brain", name: "Brain", classification: "standard", isCritical: false },
  { pathSegment: ".brain", name: "Brain Store", classification: "standard", isCritical: false },
  {
    pathSegment: "admiral/quality",
    name: "Quality",
    classification: "standard",
    isCritical: false,
  },
  {
    pathSegment: "admiral/benchmarks",
    name: "Benchmarks",
    classification: "support",
    isCritical: false,
  },
  { pathSegment: "admiral/docs", name: "Docs", classification: "support", isCritical: false },
  { pathSegment: "admiral/config", name: "Config", classification: "support", isCritical: false },
  { pathSegment: "plan", name: "Plan", classification: "support", isCritical: false },
];

// ---------------------------------------------------------------------------
// ModuleRater
// ---------------------------------------------------------------------------

export class ModuleRater {
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /**
   * Discover and rate all modules in the project.
   */
  rateAll(): ModuleRating[] {
    const modules = this.discoverModules();
    return modules.map((m) => this.rateModule(m));
  }

  /**
   * Rate a specific module definition.
   */
  rateModule(mod: ModuleDefinition): ModuleRating {
    const dimScores = this.computeDimensionScores(mod);
    const overallScore = this.computeOverallScore(dimScores);
    const rawTier = scoreToTier(overallScore);

    return {
      module: mod.path,
      classification: mod.classification,
      tier: rawTier,
      dimensionScores: dimScores,
      overallScore,
      capsProjectRating: mod.isCritical,
    };
  }

  /**
   * Apply module-level caps to a project tier.
   * If a critical module is below ADM-2, it caps the project tier.
   */
  applyModuleCaps(
    projectTier: RatingTierCode,
    moduleRatings: ModuleRating[],
  ): { effectiveTier: RatingTierCode; cappedBy: ModuleRating[] } {
    const cappedBy: ModuleRating[] = [];
    let effectiveTier = projectTier;

    for (const mod of moduleRatings) {
      if (!mod.capsProjectRating) continue;
      const cap = CRITICAL_MODULE_CAP[mod.tier];
      if (compareTiers(cap, effectiveTier) < 0) {
        effectiveTier = cap;
        cappedBy.push(mod);
      }
    }

    return { effectiveTier, cappedBy };
  }

  /**
   * Get the overall project tier considering module caps.
   */
  getProjectTierWithModuleCaps(
    baseProjectTier: RatingTierCode,
    moduleRatings: ModuleRating[],
  ): RatingTierCode {
    const { effectiveTier } = this.applyModuleCaps(baseProjectTier, moduleRatings);
    return effectiveTier;
  }

  // -------------------------------------------------------------------------
  // Module discovery
  // -------------------------------------------------------------------------

  private discoverModules(): ModuleDefinition[] {
    const modules: ModuleDefinition[] = [];

    for (const pattern of DEFAULT_MODULE_PATTERNS) {
      const fullPath = join(this.projectRoot, pattern.pathSegment);
      if (existsSync(fullPath)) {
        modules.push({
          path: fullPath,
          name: pattern.name,
          classification: pattern.classification,
          isCritical: pattern.isCritical,
        });
      }
    }

    return modules;
  }

  // -------------------------------------------------------------------------
  // Dimension scoring for modules
  // -------------------------------------------------------------------------

  private computeDimensionScores(mod: ModuleDefinition): DimensionScore[] {
    const dimensions: DimensionId[] = [
      "enforcement_coverage",
      "hook_quality",
      "standing_orders_compliance",
      "brain_utilization",
      "fleet_governance",
      "security_posture",
      "observability_maturity",
    ];

    return dimensions.map((dimId) => {
      const score = this.scoreModuleDimension(mod, dimId);
      return {
        dimensionId: dimId,
        score,
        weightedContribution: score, // equal weight within module
        evidence: `Module ${mod.name} — ${dimId}`,
        capTriggered: false,
      };
    });
  }

  private computeOverallScore(dimScores: DimensionScore[]): number {
    if (dimScores.length === 0) return 0;
    const sum = dimScores.reduce((s, d) => s + d.score, 0);
    return Math.round((sum / dimScores.length) * 10) / 10;
  }

  private scoreModuleDimension(mod: ModuleDefinition, dim: DimensionId): number {
    if (!existsSync(mod.path)) return 0;

    const classification = mod.classification;

    switch (dim) {
      case "enforcement_coverage":
        return this.scoreEnforcement(mod, classification);
      case "hook_quality":
        return this.scoreHookQuality(mod, classification);
      case "standing_orders_compliance":
        return this.scoreStandingOrders(mod, classification);
      case "brain_utilization":
        return this.scoreBrainUtilization(mod, classification);
      case "fleet_governance":
        return this.scoreFleetGovernance(mod, classification);
      case "security_posture":
        return this.scoreSecurityPosture(mod, classification);
      case "observability_maturity":
        return this.scoreObservability(mod, classification);
    }
  }

  private scoreEnforcement(mod: ModuleDefinition, classification: ModuleClassification): number {
    if (classification === "support") return 70; // support modules not enforcement-heavy

    const files = this.collectFilesShallow(mod.path);
    const hasHooks = files.some((f) => f.endsWith(".sh") && basename(f).startsWith("hook"));
    const hasConfig = files.some((f) => f.includes("config"));

    let score = 40;
    if (files.length > 0) score += 20;
    if (hasHooks) score += 20;
    if (hasConfig) score += 10;
    if (files.length >= 5) score += 10;

    return clamp(score, 0, 100);
  }

  private scoreHookQuality(mod: ModuleDefinition, classification: ModuleClassification): number {
    if (classification === "support") return 65;

    const files = this.collectFilesShallow(mod.path).filter((f) => f.endsWith(".sh"));
    if (files.length === 0) return 30;

    let withErrorHandling = 0;
    for (const f of files) {
      const content = safeRead(f);
      if (content.includes("set -e") || content.includes("set -euo")) {
        withErrorHandling++;
      }
    }

    const pct = withErrorHandling / files.length;
    return clamp(Math.round(30 + pct * 70), 0, 100);
  }

  private scoreStandingOrders(mod: ModuleDefinition, classification: ModuleClassification): number {
    if (classification === "support") return 60;
    const files = this.collectFilesShallow(mod.path);
    if (files.length === 0) return 20;

    // Check if any file references standing orders
    const refs = files.filter((f) => {
      const c = safeRead(f);
      return c.toLowerCase().includes("standing") || c.toLowerCase().includes("admiral");
    });
    const refPct = refs.length / files.length;
    return clamp(Math.round(40 + refPct * 60), 0, 100);
  }

  private scoreBrainUtilization(
    mod: ModuleDefinition,
    classification: ModuleClassification,
  ): number {
    if (classification === "critical") return 70;
    if (mod.path.includes("brain") || mod.path.includes(".brain")) return 90;
    return 50;
  }

  private scoreFleetGovernance(
    mod: ModuleDefinition,
    classification: ModuleClassification,
  ): number {
    if (classification === "critical") {
      const files = this.collectFilesShallow(mod.path);
      return files.length >= 3 ? 75 : files.length >= 1 ? 55 : 30;
    }
    if (classification === "standard") {
      const files = this.collectFilesShallow(mod.path);
      return files.length >= 10 ? 80 : files.length >= 5 ? 65 : 45;
    }
    return 55;
  }

  private scoreSecurityPosture(
    mod: ModuleDefinition,
    classification: ModuleClassification,
  ): number {
    const files = this.collectFilesShallow(mod.path);
    const hasAuth = files.some((f) => f.includes("auth"));
    const hasValidation = files.some((f) => f.includes("validation") || f.includes("validate"));
    const hasSecurity = files.some((f) => f.includes("security"));

    let score = classification === "critical" ? 50 : 40;
    if (hasAuth) score += 20;
    if (hasValidation) score += 20;
    if (hasSecurity) score += 10;

    return clamp(score, 0, 100);
  }

  private scoreObservability(mod: ModuleDefinition, classification: ModuleClassification): number {
    const files = this.collectFilesShallow(mod.path);
    const hasLogging = files.some(
      (f) => f.includes("log") || f.includes("trace") || f.includes("metric"),
    );

    let score = classification === "support" ? 50 : 35;
    if (files.length > 0) score += 15;
    if (hasLogging) score += 30;
    if (files.length >= 10) score += 20;

    return clamp(score, 0, 100);
  }

  // -------------------------------------------------------------------------
  // File system helpers
  // -------------------------------------------------------------------------

  private collectFilesShallow(dir: string): string[] {
    try {
      const entries = readdirSync(dir);
      return entries
        .map((e) => join(dir, e))
        .filter((f) => {
          try {
            return statSync(f).isFile();
          } catch {
            return false;
          }
        });
    } catch {
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function safeRead(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
