/**
 * Graduation Metrics (B-21)
 *
 * Measures readiness for brain-tier graduation (B1→B2, B2→B3) using
 * configurable criteria with trend tracking over time.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GraduationCriteria {
	name: string;
	target: number;
	actual: number;
	passed: boolean;
}

export interface GraduationAssessment {
	fromTier: "B1" | "B2";
	toTier: "B2" | "B3";
	ready: boolean;
	criteria: GraduationCriteria[];
	assessedAt: number;
	recommendation: string;
}

export interface B1ToB2Stats {
	hitRate: number;
	precision: number;
	entryCount: number;
}

export interface B2ToB3Stats {
	reuseRate: number;
	semanticPrecision: number;
}

// ---------------------------------------------------------------------------
// GraduationMeasurement
// ---------------------------------------------------------------------------

export class GraduationMeasurement {
	private readonly history: GraduationAssessment[] = [];

	/**
	 * B1→B2 criteria:
	 *   hitRate      >= 85%
	 *   precision    >= 90%
	 *   entryCount   >= 50
	 */
	assessB1ToB2(stats: B1ToB2Stats): GraduationAssessment {
		const criteria: GraduationCriteria[] = [
			{
				name: "hitRate",
				target: 85,
				actual: stats.hitRate,
				passed: stats.hitRate >= 85,
			},
			{
				name: "precision",
				target: 90,
				actual: stats.precision,
				passed: stats.precision >= 90,
			},
			{
				name: "entryCount",
				target: 50,
				actual: stats.entryCount,
				passed: stats.entryCount >= 50,
			},
		];

		const ready = criteria.every((c) => c.passed);
		const failing = criteria.filter((c) => !c.passed).map((c) => c.name);

		const recommendation = ready
			? "Ready for B2 graduation"
			: `Not ready: ${failing.join(", ")} below threshold`;

		return {
			fromTier: "B1",
			toTier: "B2",
			ready,
			criteria,
			assessedAt: Date.now(),
			recommendation,
		};
	}

	/**
	 * B2→B3 criteria:
	 *   reuseRate         >= 30%
	 *   semanticPrecision >= 80%
	 */
	assessB2ToB3(stats: B2ToB3Stats): GraduationAssessment {
		const criteria: GraduationCriteria[] = [
			{
				name: "reuseRate",
				target: 30,
				actual: stats.reuseRate,
				passed: stats.reuseRate >= 30,
			},
			{
				name: "semanticPrecision",
				target: 80,
				actual: stats.semanticPrecision,
				passed: stats.semanticPrecision >= 80,
			},
		];

		const ready = criteria.every((c) => c.passed);
		const failing = criteria.filter((c) => !c.passed).map((c) => c.name);

		const recommendation = ready
			? "Ready for B3 graduation"
			: `Not ready: ${failing.join(", ")} below threshold`;

		return {
			fromTier: "B2",
			toTier: "B3",
			ready,
			criteria,
			assessedAt: Date.now(),
			recommendation,
		};
	}

	recordAssessment(assessment: GraduationAssessment): void {
		this.history.push(assessment);
	}

	getAssessmentHistory(tier?: string): GraduationAssessment[] {
		if (!tier) return [...this.history];
		return this.history.filter((a) => a.fromTier === tier || a.toTier === tier);
	}

	getTrend(
		days?: number,
	): { date: number; criteria: Record<string, number> }[] {
		const cutoff = days ? Date.now() - days * 24 * 60 * 60 * 1000 : 0;

		return this.history
			.filter((a) => a.assessedAt >= cutoff)
			.map((a) => ({
				date: a.assessedAt,
				criteria: Object.fromEntries(a.criteria.map((c) => [c.name, c.actual])),
			}));
	}
}
