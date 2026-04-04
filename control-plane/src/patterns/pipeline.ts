/**
 * Admiral Framework — Pipeline Collaboration Pattern (IF-11)
 *
 * Sequential processing: each agent in the chain receives the output
 * of the previous agent, transforms it, and passes it along.
 */

export interface PipelineStage<T = unknown> {
  agentId: string;
  name: string;
  process: (input: T) => T | Promise<T>;
}

export interface PipelineResult<T = unknown> {
  success: boolean;
  output: T;
  stagesCompleted: number;
  failedAt: string | null;
  durationMs: number;
  stageTimings: { agentId: string; durationMs: number }[];
}

/**
 * Runs a sequence of stages where each stage's output feeds the next.
 */
export class Pipeline<T = unknown> {
  private stages: PipelineStage<T>[] = [];

  addStage(stage: PipelineStage<T>): this {
    this.stages.push(stage);
    return this;
  }

  getStages(): PipelineStage<T>[] {
    return [...this.stages];
  }

  async execute(input: T): Promise<PipelineResult<T>> {
    const stageTimings: { agentId: string; durationMs: number }[] = [];
    let current = input;
    let stagesCompleted = 0;
    const startTime = Date.now();

    for (const stage of this.stages) {
      const stageStart = Date.now();
      try {
        current = await stage.process(current);
        stageTimings.push({ agentId: stage.agentId, durationMs: Date.now() - stageStart });
        stagesCompleted++;
      } catch {
        stageTimings.push({ agentId: stage.agentId, durationMs: Date.now() - stageStart });
        return {
          success: false,
          output: current,
          stagesCompleted,
          failedAt: stage.agentId,
          durationMs: Date.now() - startTime,
          stageTimings,
        };
      }
    }

    return {
      success: true,
      output: current,
      stagesCompleted,
      failedAt: null,
      durationMs: Date.now() - startTime,
      stageTimings,
    };
  }
}
