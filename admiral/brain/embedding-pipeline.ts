/**
 * Embedding Generation Pipeline (B-10)
 *
 * Pluggable backends (API or pre-computed), model version tracking,
 * and re-embedding on model change. Generates vector embeddings for
 * Brain entries to enable semantic search (B-11).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Embedding vector */
export type EmbeddingVector = number[];

/** Embedding backend interface — implement for each provider */
export interface EmbeddingBackend {
	readonly name: string;
	readonly modelVersion: string;
	readonly dimensions: number;
	embed(text: string): Promise<EmbeddingVector>;
	embedBatch(texts: string[]): Promise<EmbeddingVector[]>;
}

/** Stored embedding with metadata */
export interface StoredEmbedding {
	entryId: string;
	vector: EmbeddingVector;
	modelName: string;
	modelVersion: string;
	generatedAt: number;
	textHash: string;
}

/** Embedding generation result */
export interface EmbeddingResult {
	entryId: string;
	success: boolean;
	dimensions?: number;
	error?: string;
}

/** Pipeline statistics */
export interface PipelineStats {
	totalEmbeddings: number;
	staleEmbeddings: number;
	pendingEntries: number;
	currentModel: string;
	currentVersion: string;
}

/** Re-embedding report */
export interface ReembeddingReport {
	reembedded: number;
	skipped: number;
	failed: number;
	previousModel: string;
	newModel: string;
	startedAt: number;
	completedAt: number;
}

// ---------------------------------------------------------------------------
// Built-in backends
// ---------------------------------------------------------------------------

/** Simple hash-based embedding for testing (not for production) */
export class HashEmbeddingBackend implements EmbeddingBackend {
	readonly name = "hash-embedding";
	readonly modelVersion: string;
	readonly dimensions: number;

	constructor(dimensions = 128, version = "1.0.0") {
		this.dimensions = dimensions;
		this.modelVersion = version;
	}

	async embed(text: string): Promise<EmbeddingVector> {
		return this.hashToVector(text);
	}

	async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
		return texts.map((t) => this.hashToVector(t));
	}

	private hashToVector(text: string): EmbeddingVector {
		const vector: number[] = new Array(this.dimensions).fill(0);
		for (let i = 0; i < text.length; i++) {
			const idx = i % this.dimensions;
			vector[idx] += text.charCodeAt(i) / 1000;
		}
		// Normalize
		const magnitude = Math.sqrt(vector.reduce((s, v) => s + v * v, 0)) || 1;
		return vector.map((v) => v / magnitude);
	}
}

// ---------------------------------------------------------------------------
// EmbeddingPipeline
// ---------------------------------------------------------------------------

/** Simple hash of text for change detection */
function textHash(text: string): string {
	let hash = 0;
	for (let i = 0; i < text.length; i++) {
		const char = text.charCodeAt(i);
		hash = ((hash << 5) - hash + char) | 0;
	}
	return hash.toString(36);
}

export class EmbeddingPipeline {
	private backend: EmbeddingBackend;
	private embeddings: Map<string, StoredEmbedding> = new Map();
	private modelHistory: Array<{ name: string; version: string; switchedAt: number }> = [];

	constructor(backend: EmbeddingBackend) {
		this.backend = backend;
		this.modelHistory.push({
			name: backend.name,
			version: backend.modelVersion,
			switchedAt: Date.now(),
		});
	}

	/** Generate embedding for a single entry */
	async generateEmbedding(entryId: string, text: string): Promise<EmbeddingResult> {
		try {
			const vector = await this.backend.embed(text);
			const stored: StoredEmbedding = {
				entryId,
				vector,
				modelName: this.backend.name,
				modelVersion: this.backend.modelVersion,
				generatedAt: Date.now(),
				textHash: textHash(text),
			};
			this.embeddings.set(entryId, stored);
			return { entryId, success: true, dimensions: vector.length };
		} catch (err) {
			return {
				entryId,
				success: false,
				error: err instanceof Error ? err.message : String(err),
			};
		}
	}

	/** Generate embeddings for multiple entries */
	async generateBatch(
		entries: Array<{ id: string; text: string }>,
	): Promise<EmbeddingResult[]> {
		const results: EmbeddingResult[] = [];
		try {
			const vectors = await this.backend.embedBatch(entries.map((e) => e.text));
			for (let i = 0; i < entries.length; i++) {
				const stored: StoredEmbedding = {
					entryId: entries[i].id,
					vector: vectors[i],
					modelName: this.backend.name,
					modelVersion: this.backend.modelVersion,
					generatedAt: Date.now(),
					textHash: textHash(entries[i].text),
				};
				this.embeddings.set(entries[i].id, stored);
				results.push({ entryId: entries[i].id, success: true, dimensions: vectors[i].length });
			}
		} catch (err) {
			for (const entry of entries) {
				results.push({
					entryId: entry.id,
					success: false,
					error: err instanceof Error ? err.message : String(err),
				});
			}
		}
		return results;
	}

	/** Get stored embedding for an entry */
	getEmbedding(entryId: string): StoredEmbedding | undefined {
		return this.embeddings.get(entryId);
	}

	/** Check if an entry needs re-embedding (model changed or text changed) */
	needsReembedding(entryId: string, currentText: string): boolean {
		const existing = this.embeddings.get(entryId);
		if (!existing) return true;
		if (existing.modelVersion !== this.backend.modelVersion) return true;
		if (existing.modelName !== this.backend.name) return true;
		if (existing.textHash !== textHash(currentText)) return true;
		return false;
	}

	/** Switch to a new embedding backend */
	switchBackend(newBackend: EmbeddingBackend): void {
		this.backend = newBackend;
		this.modelHistory.push({
			name: newBackend.name,
			version: newBackend.modelVersion,
			switchedAt: Date.now(),
		});
	}

	/** Re-embed all entries that are stale (wrong model/version) */
	async reembedAll(
		entries: Array<{ id: string; text: string }>,
	): Promise<ReembeddingReport> {
		const report: ReembeddingReport = {
			reembedded: 0,
			skipped: 0,
			failed: 0,
			previousModel: this.modelHistory.length > 1
				? `${this.modelHistory[this.modelHistory.length - 2].name}@${this.modelHistory[this.modelHistory.length - 2].version}`
				: "none",
			newModel: `${this.backend.name}@${this.backend.modelVersion}`,
			startedAt: Date.now(),
			completedAt: 0,
		};

		for (const entry of entries) {
			if (!this.needsReembedding(entry.id, entry.text)) {
				report.skipped++;
				continue;
			}
			const result = await this.generateEmbedding(entry.id, entry.text);
			if (result.success) {
				report.reembedded++;
			} else {
				report.failed++;
			}
		}

		report.completedAt = Date.now();
		return report;
	}

	/** Get pipeline statistics */
	getStats(knownEntryIds?: string[]): PipelineStats {
		const stale = knownEntryIds
			? knownEntryIds.filter((id) => {
					const e = this.embeddings.get(id);
					return e && (e.modelVersion !== this.backend.modelVersion || e.modelName !== this.backend.name);
				}).length
			: 0;

		const pending = knownEntryIds
			? knownEntryIds.filter((id) => !this.embeddings.has(id)).length
			: 0;

		return {
			totalEmbeddings: this.embeddings.size,
			staleEmbeddings: stale,
			pendingEntries: pending,
			currentModel: this.backend.name,
			currentVersion: this.backend.modelVersion,
		};
	}

	/** Get model history */
	getModelHistory(): Array<{ name: string; version: string; switchedAt: number }> {
		return [...this.modelHistory];
	}

	/** Get current backend info */
	getBackendInfo(): { name: string; version: string; dimensions: number } {
		return {
			name: this.backend.name,
			version: this.backend.modelVersion,
			dimensions: this.backend.dimensions,
		};
	}

	/** Reset (for testing) */
	reset(): void {
		this.embeddings.clear();
	}
}
