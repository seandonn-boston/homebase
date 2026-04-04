/**
 * Developer Experience Survey Framework (TV-05)
 *
 * Lightweight governance DX survey with NPS-style scoring.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SurveyQuestion {
  id: string;
  text: string;
  type: "scale" | "multiple-choice" | "open-ended";
  scaleRange?: [number, number];
  choices?: string[];
  category: "friction" | "trust" | "productivity" | "value";
}

export interface SurveyResponse {
  id: string;
  timestamp: string;
  respondentId: string;
  answers: Record<string, number | string>;
}

export interface SurveyResults {
  responseCount: number;
  nps: number;
  categoryScores: Record<string, number>;
  summary: string;
}

// ---------------------------------------------------------------------------
// Survey Definition
// ---------------------------------------------------------------------------

export const GOVERNANCE_SURVEY: readonly SurveyQuestion[] = [
  { id: "nps", text: "How likely are you to recommend this governance approach to another team? (0-10)", type: "scale", scaleRange: [0, 10], category: "value" },
  { id: "friction", text: "How often does governance slow you down unnecessarily? (1=never, 5=constantly)", type: "scale", scaleRange: [1, 5], category: "friction" },
  { id: "trust-hooks", text: "How much do you trust the hook enforcement to catch real issues? (1=none, 5=complete)", type: "scale", scaleRange: [1, 5], category: "trust" },
  { id: "productivity", text: "Has governance made you more or less productive overall? (1=much less, 5=much more)", type: "scale", scaleRange: [1, 5], category: "productivity" },
  { id: "false-positives", text: "How often do hooks block legitimate work? (1=never, 5=constantly)", type: "scale", scaleRange: [1, 5], category: "friction" },
  { id: "value-brain", text: "How useful is the Brain knowledge system? (1=useless, 5=essential)", type: "scale", scaleRange: [1, 5], category: "value" },
  { id: "helps", text: "What governance feature helps you most?", type: "open-ended", category: "value" },
  { id: "hinders", text: "What governance feature hinders you most?", type: "open-ended", category: "friction" },
  { id: "missing", text: "What governance feature is missing?", type: "open-ended", category: "value" },
];

// ---------------------------------------------------------------------------
// Survey Processing
// ---------------------------------------------------------------------------

export class SurveyProcessor {
  private responses: SurveyResponse[] = [];

  addResponse(answers: Record<string, number | string>, respondentId?: string): SurveyResponse {
    const response: SurveyResponse = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      respondentId: respondentId ?? `anon-${randomUUID().slice(0, 8)}`,
      answers,
    };
    this.responses.push(response);
    return response;
  }

  computeResults(): SurveyResults {
    if (this.responses.length === 0) {
      return { responseCount: 0, nps: 0, categoryScores: {}, summary: "No responses." };
    }

    // NPS calculation
    const npsScores = this.responses
      .map((r) => r.answers.nps)
      .filter((v): v is number => typeof v === "number");

    const promoters = npsScores.filter((s) => s >= 9).length;
    const detractors = npsScores.filter((s) => s <= 6).length;
    const nps = npsScores.length > 0
      ? Math.round(((promoters - detractors) / npsScores.length) * 100)
      : 0;

    // Category averages
    const categoryScores: Record<string, number[]> = {};
    for (const q of GOVERNANCE_SURVEY) {
      if (q.type !== "scale") continue;
      const values = this.responses
        .map((r) => r.answers[q.id])
        .filter((v): v is number => typeof v === "number");
      if (values.length === 0) continue;
      if (!categoryScores[q.category]) categoryScores[q.category] = [];
      categoryScores[q.category].push(values.reduce((a, b) => a + b, 0) / values.length);
    }

    const avgScores: Record<string, number> = {};
    for (const [cat, vals] of Object.entries(categoryScores)) {
      avgScores[cat] = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    }

    return {
      responseCount: this.responses.length,
      nps,
      categoryScores: avgScores,
      summary: `${this.responses.length} responses. NPS: ${nps}. ` +
        Object.entries(avgScores).map(([k, v]) => `${k}: ${v}/5`).join(", ") + ".",
    };
  }

  getResponseCount(): number {
    return this.responses.length;
  }
}
