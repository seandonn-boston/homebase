/**
 * Multi-Signal Retrieval Pipeline (B-16)
 *
 * Blends 4 retrieval signals: keyword (FTS), semantic (pgvector/embeddings),
 * temporal (recency), and link-based (graph proximity). Configurable weights
 * with query-time signal selection.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Available retrieval signals */
export type SignalType = "keyword" | "semantic" | "temporal" | "link";

/** Per-signal weight configuration */
export interface SignalWeights {
	keyword: number;
	semantic: number;
	temporal: number;
	link: number;
}

/** Signal provider interface */
export interface SignalProvider {
	type: SignalType;
	score(entryId: string, query: string, context: SignalContext): number;
}

/** Context passed to signal providers */
export interface SignalContext {
	now: number;
	entryCreatedAt?: Map<string, number>;
	entryAccessCount?: Map<string, number>;
	linkScores?: Map<string, number>;
	semanticScores?: Map<string, number>;
	keywordScores?: Map<string, number>;
}

/** Individual signal score for an entry */
export interface EntrySignalScore {
	entryId: string;
	keyword: number;
	semantic: number;
	temporal: number;
	link: number;
	blended: number;
}

/** Retrieval query options */
export interface RetrievalOptions {
	weights?: Partial<SignalWeights>;
	signals?: SignalType[];
	limit?: number;
	minScore?: number;
}

/** Retrieval result */
export interface RetrievalResult {
	results: EntrySignalScore[];
	weightsUsed: SignalWeights;
	signalsUsed: SignalType[];
	totalCandidates: number;
}

// ---------------------------------------------------------------------------
// Default weights
// ---------------------------------------------------------------------------

const DEFAULT_WEIGHTS: SignalWeights = {
	keyword: 0.3,
	semantic: 0.4,
	temporal: 0.15,
	link: 0.15,
};

// ---------------------------------------------------------------------------
// Built-in signal providers
// ---------------------------------------------------------------------------

/** Keyword signal: uses pre-computed FTS scores */
export class KeywordSignalProvider implements SignalProvider {
	readonly type: SignalType = "keyword";

	score(_entryId: string, _query: string, context: SignalContext): number {
		return context.keywordScores?.get(_entryId) ?? 0;
	}
}

/** Semantic signal: uses pre-computed embedding similarity scores */
export class SemanticSignalProvider implements SignalProvider {
	readonly type: SignalType = "semantic";

	score(_entryId: string, _query: string, context: SignalContext): number {
		return context.semanticScores?.get(_entryId) ?? 0;
	}
}

/** Temporal signal: recency-biased scoring */
export class TemporalSignalProvider implements SignalProvider {
	readonly type: SignalType = "temporal";
	private decayHalfLifeMs: number;

	constructor(decayHalfLifeMs = 30 * 24 * 60 * 60 * 1000) {
		this.decayHalfLifeMs = decayHalfLifeMs;
	}

	score(entryId: string, _query: string, context: SignalContext): number {
		const createdAt = context.entryCreatedAt?.get(entryId);
		if (createdAt === undefined) return 0;

		const ageMs = context.now - createdAt;
		if (ageMs <= 0) return 1;

		// Exponential decay: score = 2^(-age/halfLife)
		return Math.pow(2, -ageMs / this.decayHalfLifeMs);
	}
}

/** Link signal: graph proximity scoring */
export class LinkSignalProvider implements SignalProvider {
	readonly type: SignalType = "link";

	score(entryId: string, _query: string, context: SignalContext): number {
		return context.linkScores?.get(entryId) ?? 0;
	}
}

// ---------------------------------------------------------------------------
// MultiSignalRetrieval
// ---------------------------------------------------------------------------

export class MultiSignalRetrieval {
	private providers: Map<SignalType, SignalProvider> = new Map();
	private defaultWeights: SignalWeights;

	constructor(weights?: Partial<SignalWeights>) {
		this.defaultWeights = { ...DEFAULT_WEIGHTS, ...weights };

		// Register built-in providers
		this.registerProvider(new KeywordSignalProvider());
		this.registerProvider(new SemanticSignalProvider());
		this.registerProvider(new TemporalSignalProvider());
		this.registerProvider(new LinkSignalProvider());
	}

	/** Register a custom signal provider */
	registerProvider(provider: SignalProvider): void {
		this.providers.set(provider.type, provider);
	}

	/** Execute a multi-signal retrieval query */
	retrieve(
		candidateIds: string[],
		query: string,
		context: SignalContext,
		options?: RetrievalOptions,
	): RetrievalResult {
		const weights = { ...this.defaultWeights, ...options?.weights };
		const activeSignals = options?.signals ?? (["keyword", "semantic", "temporal", "link"] as SignalType[]);
		const limit = options?.limit ?? 10;
		const minScore = options?.minScore ?? 0;

		// Normalize weights for active signals only
		const totalWeight = activeSignals.reduce((sum, s) => sum + weights[s], 0);
		const normalizedWeights: SignalWeights = { ...weights };
		if (totalWeight > 0) {
			for (const signal of activeSignals) {
				normalizedWeights[signal] = weights[signal] / totalWeight;
			}
		}

		// Score each candidate across all active signals
		const scores: EntrySignalScore[] = [];
		for (const entryId of candidateIds) {
			const entry: EntrySignalScore = {
				entryId,
				keyword: 0,
				semantic: 0,
				temporal: 0,
				link: 0,
				blended: 0,
			};

			for (const signal of activeSignals) {
				const provider = this.providers.get(signal);
				if (provider) {
					const score = provider.score(entryId, query, context);
					entry[signal] = score;
					entry.blended += score * normalizedWeights[signal];
				}
			}

			if (entry.blended >= minScore) {
				scores.push(entry);
			}
		}

		scores.sort((a, b) => b.blended - a.blended);

		return {
			results: scores.slice(0, limit),
			weightsUsed: normalizedWeights,
			signalsUsed: activeSignals,
			totalCandidates: candidateIds.length,
		};
	}

	/** Get current default weights */
	getWeights(): SignalWeights {
		return { ...this.defaultWeights };
	}

	/** Update default weights */
	setWeights(weights: Partial<SignalWeights>): void {
		Object.assign(this.defaultWeights, weights);
	}
}
