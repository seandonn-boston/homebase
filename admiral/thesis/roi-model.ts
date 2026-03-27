/**
 * ROI Calculation Model (TV-08)
 *
 * Quantifies costs and benefits of Admiral governance.
 * Produces breakeven analysis with sensitivity analysis.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CostInputs {
  implementationHours: number;
  maintenanceHoursPerMonth: number;
  runtimeTokenCostPerMonth: number;
  falsePositiveHoursPerMonth: number;
  hourlyRate: number;
}

export interface BenefitInputs {
  bugsPrevented: number;
  avgBugCostHours: number;
  securityIncidentsPrevented: number;
  avgIncidentCostHours: number;
  reworkReductionPercent: number;
  baseReworkHoursPerMonth: number;
  knowledgePreservationHoursPerMonth: number;
  onboardingAccelerationHoursPerAgent: number;
  newAgentsPerMonth: number;
  hourlyRate: number;
}

export interface ROIResult {
  monthlyCost: number;
  monthlyBenefit: number;
  netMonthlyValue: number;
  annualROI: number;
  breakEvenMonths: number | null;
  costBreakdown: Record<string, number>;
  benefitBreakdown: Record<string, number>;
  assumptions: string[];
}

export interface SensitivityAnalysis {
  parameter: string;
  baseValue: number;
  variations: { multiplier: number; roi: number; breakEven: number | null }[];
  mostSensitive: boolean;
}

// ---------------------------------------------------------------------------
// ROI Calculation
// ---------------------------------------------------------------------------

export function calculateROI(costs: CostInputs, benefits: BenefitInputs): ROIResult {
  const maintenanceCost = costs.maintenanceHoursPerMonth * costs.hourlyRate;
  const runtimeCost = costs.runtimeTokenCostPerMonth;
  const frictionCost = costs.falsePositiveHoursPerMonth * costs.hourlyRate;
  const monthlyCost = maintenanceCost + runtimeCost + frictionCost;

  const bugSavings = benefits.bugsPrevented * benefits.avgBugCostHours * benefits.hourlyRate;
  const securitySavings = benefits.securityIncidentsPrevented * benefits.avgIncidentCostHours * benefits.hourlyRate;
  const reworkSavings = (benefits.reworkReductionPercent / 100) * benefits.baseReworkHoursPerMonth * benefits.hourlyRate;
  const knowledgeSavings = benefits.knowledgePreservationHoursPerMonth * benefits.hourlyRate;
  const onboardingSavings = benefits.onboardingAccelerationHoursPerAgent * benefits.newAgentsPerMonth * benefits.hourlyRate;
  const monthlyBenefit = bugSavings + securitySavings + reworkSavings + knowledgeSavings + onboardingSavings;

  const netMonthlyValue = monthlyBenefit - monthlyCost;
  const implementationCost = costs.implementationHours * costs.hourlyRate;
  const annualNet = netMonthlyValue * 12;
  const annualROI = implementationCost > 0
    ? Math.round(((annualNet - implementationCost) / implementationCost) * 100)
    : 0;

  const breakEvenMonths = netMonthlyValue > 0
    ? Math.ceil(implementationCost / netMonthlyValue)
    : null;

  return {
    monthlyCost: round(monthlyCost),
    monthlyBenefit: round(monthlyBenefit),
    netMonthlyValue: round(netMonthlyValue),
    annualROI,
    breakEvenMonths,
    costBreakdown: {
      maintenance: round(maintenanceCost),
      runtime: round(runtimeCost),
      friction: round(frictionCost),
      implementation: round(implementationCost),
    },
    benefitBreakdown: {
      bugsPrevented: round(bugSavings),
      securityIncidents: round(securitySavings),
      reworkReduction: round(reworkSavings),
      knowledgePreservation: round(knowledgeSavings),
      onboardingAcceleration: round(onboardingSavings),
    },
    assumptions: [
      `Hourly rate: $${costs.hourlyRate}`,
      `Implementation: ${costs.implementationHours} hours`,
      `Bugs prevented: ${benefits.bugsPrevented}/month at ${benefits.avgBugCostHours}h each`,
      `Rework reduction: ${benefits.reworkReductionPercent}% of ${benefits.baseReworkHoursPerMonth}h/month`,
    ],
  };
}

/**
 * Run sensitivity analysis varying one parameter at a time.
 */
export function runSensitivityAnalysis(
  baseCosts: CostInputs,
  baseBenefits: BenefitInputs,
): SensitivityAnalysis[] {
  const multipliers = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const baseResult = calculateROI(baseCosts, baseBenefits);
  const analyses: SensitivityAnalysis[] = [];

  const costParams: { name: string; key: keyof CostInputs }[] = [
    { name: "Implementation Hours", key: "implementationHours" },
    { name: "Maintenance Hours/Month", key: "maintenanceHoursPerMonth" },
    { name: "False Positive Hours/Month", key: "falsePositiveHoursPerMonth" },
  ];

  const benefitParams: { name: string; key: keyof BenefitInputs }[] = [
    { name: "Bugs Prevented/Month", key: "bugsPrevented" },
    { name: "Rework Reduction %", key: "reworkReductionPercent" },
    { name: "New Agents/Month", key: "newAgentsPerMonth" },
  ];

  for (const param of costParams) {
    const baseValue = baseCosts[param.key] as number;
    const variations = multipliers.map((m) => {
      const modified = { ...baseCosts, [param.key]: baseValue * m };
      const result = calculateROI(modified, baseBenefits);
      return { multiplier: m, roi: result.annualROI, breakEven: result.breakEvenMonths };
    });
    const roiRange = Math.max(...variations.map((v) => v.roi)) - Math.min(...variations.map((v) => v.roi));
    analyses.push({ parameter: param.name, baseValue, variations, mostSensitive: false });
  }

  for (const param of benefitParams) {
    const baseValue = baseBenefits[param.key] as number;
    const variations = multipliers.map((m) => {
      const modified = { ...baseBenefits, [param.key]: baseValue * m };
      const result = calculateROI(baseCosts, modified);
      return { multiplier: m, roi: result.annualROI, breakEven: result.breakEvenMonths };
    });
    analyses.push({ parameter: param.name, baseValue, variations, mostSensitive: false });
  }

  // Mark most sensitive parameter
  let maxRange = 0;
  let maxIdx = 0;
  for (let i = 0; i < analyses.length; i++) {
    const rois = analyses[i].variations.map((v) => v.roi);
    const range = Math.max(...rois) - Math.min(...rois);
    if (range > maxRange) {
      maxRange = range;
      maxIdx = i;
    }
  }
  if (analyses.length > 0) analyses[maxIdx].mostSensitive = true;

  return analyses;
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

export function formatROI(result: ROIResult): string {
  return [
    "# ROI Analysis",
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Monthly Cost | $${result.monthlyCost} |`,
    `| Monthly Benefit | $${result.monthlyBenefit} |`,
    `| Net Monthly Value | $${result.netMonthlyValue} |`,
    `| Annual ROI | ${result.annualROI}% |`,
    `| Break-Even | ${result.breakEvenMonths !== null ? `${result.breakEvenMonths} months` : "N/A (negative net value)"} |`,
    "",
    "## Assumptions",
    ...result.assumptions.map((a) => `- ${a}`),
  ].join("\n");
}
