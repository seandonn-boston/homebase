/**
 * Three-Layer Context Assembly (O-03a)
 *
 * Assembles agent context in three layers with token budgeting:
 *   Layer 1 (Fleet): Identity, authority, constraints, standing orders
 *   Layer 2 (Project): Project structure, conventions, Ground Truth
 *   Layer 3 (Task): Current task details, acceptance criteria, file context
 *
 * Ordering: Fleet first (primacy), Task last (recency).
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Enums & Interfaces
// ---------------------------------------------------------------------------

export enum ContextLayer {
	Fleet = 1,
	Project = 2,
	Task = 3,
}

export interface ContextBlock {
	layer: ContextLayer;
	source: string;
	content: string;
	tokenEstimate: number;
	priority: number; // 0-100
	required: boolean; // identity/constraints are always required
}

export interface ContextAssemblyResult {
	layers: Record<ContextLayer, ContextBlock[]>;
	totalTokens: number;
	budgetUsed: number; // percentage 0-100
	warnings: string[];
}

// ---------------------------------------------------------------------------
// ContextAssembler
// ---------------------------------------------------------------------------

export class ContextAssembler {
	private readonly budgetTokens: number;
	private blocks: ContextBlock[] = [];

	constructor(budgetTokens: number) {
		if (budgetTokens <= 0) {
			throw new Error("Budget must be a positive number");
		}
		this.budgetTokens = budgetTokens;
	}

	/**
	 * Rough token estimate: ~4 chars per token.
	 */
	estimateTokens(text: string): number {
		return Math.max(1, Math.ceil(text.length / 4));
	}

	/**
	 * Add a context block. Token estimate is computed automatically.
	 */
	addBlock(block: Omit<ContextBlock, "tokenEstimate">): void {
		const tokenEstimate = this.estimateTokens(block.content);
		this.blocks.push({ ...block, tokenEstimate });
	}

	/**
	 * Assemble all blocks into a layered result.
	 * Orders: Fleet first (primacy), Task last (recency).
	 */
	assemble(): ContextAssemblyResult {
		const layers: Record<ContextLayer, ContextBlock[]> = {
			[ContextLayer.Fleet]: [],
			[ContextLayer.Project]: [],
			[ContextLayer.Task]: [],
		};

		// Sort by layer (Fleet=1 first), then by priority descending within layer
		const sorted = [...this.blocks].sort((a, b) => {
			if (a.layer !== b.layer) return a.layer - b.layer;
			return b.priority - a.priority;
		});

		for (const block of sorted) {
			layers[block.layer].push(block);
		}

		const totalTokens = this.blocks.reduce(
			(sum, b) => sum + b.tokenEstimate,
			0,
		);
		const budgetUsed = (totalTokens / this.budgetTokens) * 100;

		const warnings: string[] = [];
		if (budgetUsed > 90) {
			warnings.push(
				`Context budget critically high: ${budgetUsed.toFixed(1)}%`,
			);
		} else if (budgetUsed > 75) {
			warnings.push(`Context budget warning: ${budgetUsed.toFixed(1)}%`);
		}

		return { layers, totalTokens, budgetUsed, warnings };
	}

	/**
	 * Remove lowest-priority non-required blocks until within budget.
	 */
	trimToFit(): ContextAssemblyResult {
		// Sort removable blocks by priority ascending (lowest first to evict)
		const removable = this.blocks
			.filter((b) => !b.required)
			.sort((a, b) => a.priority - b.priority);

		let totalTokens = this.blocks.reduce((sum, b) => sum + b.tokenEstimate, 0);

		const toRemove = new Set<ContextBlock>();
		for (const block of removable) {
			if (totalTokens <= this.budgetTokens) break;
			totalTokens -= block.tokenEstimate;
			toRemove.add(block);
		}

		if (toRemove.size > 0) {
			this.blocks = this.blocks.filter((b) => !toRemove.has(b));
		}

		return this.assemble();
	}

	/**
	 * Get the current block count.
	 */
	getBlockCount(): number {
		return this.blocks.length;
	}

	/**
	 * Get the current budget in tokens.
	 */
	getBudget(): number {
		return this.budgetTokens;
	}
}
