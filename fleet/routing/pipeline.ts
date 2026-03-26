/**
 * Multi-Agent Pipeline Orchestration (O-05b)
 *
 * Manages sequential multi-step pipelines where each step is assigned
 * to an agent. Supports failure policies (retry, skip, abort) and
 * creates handoffs between steps via the HandoffProtocol.
 * Zero external dependencies — Node.js built-ins only.
 */

import { randomUUID } from "node:crypto";
import type { HandoffProtocol } from "./handoff";

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface PipelineStep {
	id: string;
	agentId: string;
	taskType: string;
	acceptanceCriteria: string[];
	status: "pending" | "running" | "completed" | "failed" | "skipped";
	output?: Record<string, unknown>;
	error?: string;
	startedAt?: number;
	completedAt?: number;
	tokensBurned?: number;
}

export interface Pipeline {
	id: string;
	name: string;
	steps: PipelineStep[];
	status: "pending" | "running" | "completed" | "failed" | "aborted";
	createdAt: number;
	completedAt?: number;
	failurePolicy: "retry" | "skip" | "abort";
	maxRetries: number;
}

// ---------------------------------------------------------------------------
// PipelineOrchestrator
// ---------------------------------------------------------------------------

const MAX_PIPELINES = 100;

export class PipelineOrchestrator {
	private pipelines: Map<string, Pipeline> = new Map();
	private retryCounts: Map<string, number> = new Map(); // pipelineId -> retries used on current step

	constructor(private handoff: HandoffProtocol) {}

	/**
	 * Remove oldest completed/failed/aborted pipelines when the map exceeds MAX_PIPELINES.
	 */
	private pruneCompletedPipelines(): void {
		if (this.pipelines.size <= MAX_PIPELINES) return;

		const terminal: Pipeline[] = [];
		for (const p of this.pipelines.values()) {
			if (
				p.status === "completed" ||
				p.status === "failed" ||
				p.status === "aborted"
			) {
				terminal.push(p);
			}
		}

		// Sort oldest first by completedAt (or createdAt as fallback)
		terminal.sort(
			(a, b) => (a.completedAt ?? a.createdAt) - (b.completedAt ?? b.createdAt),
		);

		const toRemove = this.pipelines.size - MAX_PIPELINES;
		for (let i = 0; i < toRemove && i < terminal.length; i++) {
			this.pipelines.delete(terminal[i].id);
			this.retryCounts.delete(terminal[i].id);
		}
	}

	createPipeline(
		name: string,
		steps: Omit<PipelineStep, "id" | "status">[],
		failurePolicy: "retry" | "skip" | "abort" = "abort",
	): Pipeline {
		const pipeline: Pipeline = {
			id: `pipeline_${randomUUID()}`,
			name,
			steps: steps.map((s) => ({
				...s,
				id: `step_${randomUUID()}`,
				status: "pending" as const,
			})),
			status: "pending",
			createdAt: Date.now(),
			failurePolicy,
			maxRetries: 3,
		};

		// Mark the first step as running
		if (pipeline.steps.length > 0) {
			pipeline.steps[0].status = "running";
			pipeline.steps[0].startedAt = Date.now();
			pipeline.status = "running";
		}

		this.pipelines.set(pipeline.id, pipeline);
		return pipeline;
	}

	advanceStep(
		pipelineId: string,
		output: Record<string, unknown>,
		tokensBurned?: number,
	): PipelineStep {
		const pipeline = this.pipelines.get(pipelineId);
		if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);
		if (pipeline.status !== "running") {
			throw new Error(`Pipeline is not running: ${pipeline.status}`);
		}

		const currentIdx = pipeline.steps.findIndex((s) => s.status === "running");
		if (currentIdx === -1) throw new Error("No running step found");

		const current = pipeline.steps[currentIdx];
		current.status = "completed";
		current.output = output;
		current.completedAt = Date.now();
		if (tokensBurned !== undefined) current.tokensBurned = tokensBurned;

		// Reset retry count for next step
		this.retryCounts.delete(pipelineId);

		// Advance to next step
		const nextIdx = currentIdx + 1;
		if (nextIdx < pipeline.steps.length) {
			const next = pipeline.steps[nextIdx];
			next.status = "running";
			next.startedAt = Date.now();

			// Create handoff between agents
			this.handoff.createHandoff(
				current.agentId,
				next.agentId,
				pipelineId,
				{ stepOutput: output, pipelineName: pipeline.name },
				output,
			);

			return next;
		}

		// Pipeline complete
		pipeline.status = "completed";
		pipeline.completedAt = Date.now();
		this.pruneCompletedPipelines();
		return current;
	}

	failStep(
		pipelineId: string,
		error: string,
	): { pipeline: Pipeline; nextAction: "retry" | "skip" | "abort" } {
		const pipeline = this.pipelines.get(pipelineId);
		if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);

		const currentIdx = pipeline.steps.findIndex((s) => s.status === "running");
		if (currentIdx === -1) throw new Error("No running step found");

		const current = pipeline.steps[currentIdx];
		const policy = pipeline.failurePolicy;

		if (policy === "retry") {
			const retries = this.retryCounts.get(pipelineId) ?? 0;
			if (retries < pipeline.maxRetries) {
				this.retryCounts.set(pipelineId, retries + 1);
				current.error = error;
				// Step stays "running" for retry
				return { pipeline, nextAction: "retry" };
			}
			// Exhausted retries — fall through to abort
			current.status = "failed";
			current.error = error;
			current.completedAt = Date.now();
			pipeline.status = "failed";
			pipeline.completedAt = Date.now();
			this.pruneCompletedPipelines();
			return { pipeline, nextAction: "abort" };
		}

		if (policy === "skip") {
			current.status = "skipped";
			current.error = error;
			current.completedAt = Date.now();

			// Advance to next step
			const nextIdx = currentIdx + 1;
			if (nextIdx < pipeline.steps.length) {
				pipeline.steps[nextIdx].status = "running";
				pipeline.steps[nextIdx].startedAt = Date.now();
				return { pipeline, nextAction: "skip" };
			}

			// No more steps
			pipeline.status = "completed";
			pipeline.completedAt = Date.now();
			this.pruneCompletedPipelines();
			return { pipeline, nextAction: "skip" };
		}

		// abort
		current.status = "failed";
		current.error = error;
		current.completedAt = Date.now();
		pipeline.status = "failed";
		pipeline.completedAt = Date.now();
		this.pruneCompletedPipelines();
		return { pipeline, nextAction: "abort" };
	}

	abortPipeline(pipelineId: string, reason: string): Pipeline {
		const pipeline = this.pipelines.get(pipelineId);
		if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);

		for (const step of pipeline.steps) {
			if (step.status === "running") {
				step.status = "failed";
				step.error = reason;
				step.completedAt = Date.now();
			} else if (step.status === "pending") {
				step.status = "skipped";
			}
		}

		pipeline.status = "aborted";
		pipeline.completedAt = Date.now();
		this.pruneCompletedPipelines();
		return pipeline;
	}

	getPipeline(pipelineId: string): Pipeline | undefined {
		return this.pipelines.get(pipelineId);
	}

	getAllPipelines(): Pipeline[] {
		return Array.from(this.pipelines.values());
	}

	getActivePipelines(): Pipeline[] {
		return Array.from(this.pipelines.values()).filter(
			(p) => p.status === "running",
		);
	}

	getCurrentStep(pipelineId: string): PipelineStep | undefined {
		const pipeline = this.pipelines.get(pipelineId);
		if (!pipeline) return undefined;
		return pipeline.steps.find((s) => s.status === "running");
	}

	getTrace(pipelineId: string): {
		steps: PipelineStep[];
		totalTokens: number;
		duration: number;
	} {
		const pipeline = this.pipelines.get(pipelineId);
		if (!pipeline) throw new Error(`Pipeline not found: ${pipelineId}`);

		const totalTokens = pipeline.steps.reduce(
			(sum, s) => sum + (s.tokensBurned ?? 0),
			0,
		);

		const endTime = pipeline.completedAt ?? Date.now();
		const duration = endTime - pipeline.createdAt;

		return {
			steps: [...pipeline.steps],
			totalTokens,
			duration,
		};
	}
}
