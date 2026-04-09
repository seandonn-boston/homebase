/**
 * Admiral Framework — Result Aggregator (EX-05)
 *
 * Collects results from completed agent sessions and aggregates them
 * into structured reports: per-task summaries, per-agent performance
 * metrics, and fleet-wide execution summaries.
 */

import type { Session, SessionState } from "./execution-runtime";

// ── Types ──────────────────────────────────────────────────────

export interface TaskSummary {
  taskId: string;
  sessions: SessionSummary[];
  totalDuration: number;
  totalTokens: number;
  totalFileWrites: number;
  finalStatus: "success" | "failure" | "partial" | "pending";
}

export interface SessionSummary {
  sessionId: string;
  agentId: string;
  agentName: string;
  state: SessionState;
  duration: number;
  tokensUsed: number;
  fileWriteCount: number;
  resultStatus?: string;
  error?: string;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  successRate: number;
  avgDuration: number;
  totalTokensUsed: number;
  avgTokensPerSession: number;
  totalFileWrites: number;
}

export interface FleetSummary {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  failedSessions: number;
  overallSuccessRate: number;
  totalTokensUsed: number;
  totalFileWrites: number;
  avgSessionDuration: number;
  uniqueAgents: number;
  uniqueTasks: number;
  generatedAt: number;
}

// ── ResultAggregator ───────────────────────────────────────────

export class ResultAggregator {
  /**
   * Generate a per-task summary from a set of sessions.
   */
  summarizeTask(taskId: string, sessions: Session[]): TaskSummary {
    const taskSessions = sessions.filter((s) => s.taskId === taskId);

    const summaries: SessionSummary[] = taskSessions.map((s) => ({
      sessionId: s.sessionId,
      agentId: s.agentId,
      agentName: s.agentName,
      state: s.state,
      duration: this.computeDuration(s),
      tokensUsed: s.tokensUsed,
      fileWriteCount: s.fileWriteCount,
      resultStatus: s.result?.status,
      error: s.result?.error,
    }));

    const totalDuration = summaries.reduce((sum, s) => sum + s.duration, 0);
    const totalTokens = summaries.reduce((sum, s) => sum + s.tokensUsed, 0);
    const totalFileWrites = summaries.reduce((sum, s) => sum + s.fileWriteCount, 0);

    return {
      taskId,
      sessions: summaries,
      totalDuration,
      totalTokens,
      totalFileWrites,
      finalStatus: this.computeTaskStatus(taskSessions),
    };
  }

  /**
   * Generate per-agent performance metrics.
   */
  computeAgentMetrics(agentId: string, sessions: Session[]): AgentMetrics {
    const agentSessions = sessions.filter((s) => s.agentId === agentId);

    if (agentSessions.length === 0) {
      return {
        agentId,
        agentName: "",
        totalSessions: 0,
        completedSessions: 0,
        failedSessions: 0,
        successRate: 0,
        avgDuration: 0,
        totalTokensUsed: 0,
        avgTokensPerSession: 0,
        totalFileWrites: 0,
      };
    }

    const completed = agentSessions.filter((s) => s.state === "complete");
    const failed = agentSessions.filter((s) => s.state === "failed");
    const finishedSessions = [...completed, ...failed];
    const durations = finishedSessions.map((s) => this.computeDuration(s));
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const totalTokens = agentSessions.reduce((sum, s) => sum + s.tokensUsed, 0);
    const totalWrites = agentSessions.reduce((sum, s) => sum + s.fileWriteCount, 0);

    return {
      agentId,
      agentName: agentSessions[0].agentName,
      totalSessions: agentSessions.length,
      completedSessions: completed.length,
      failedSessions: failed.length,
      successRate: finishedSessions.length > 0 ? completed.length / finishedSessions.length : 0,
      avgDuration: finishedSessions.length > 0 ? totalDuration / finishedSessions.length : 0,
      totalTokensUsed: totalTokens,
      avgTokensPerSession: agentSessions.length > 0 ? totalTokens / agentSessions.length : 0,
      totalFileWrites: totalWrites,
    };
  }

  /**
   * Generate fleet-wide execution summary.
   */
  computeFleetSummary(sessions: Session[]): FleetSummary {
    const active = sessions.filter((s) => s.state === "running" || s.state === "pending");
    const completed = sessions.filter((s) => s.state === "complete");
    const failed = sessions.filter((s) => s.state === "failed");
    const finished = [...completed, ...failed];
    const durations = finished.map((s) => this.computeDuration(s));
    const totalDuration = durations.reduce((sum, d) => sum + d, 0);
    const totalTokens = sessions.reduce((sum, s) => sum + s.tokensUsed, 0);
    const totalWrites = sessions.reduce((sum, s) => sum + s.fileWriteCount, 0);
    const uniqueAgents = new Set(sessions.map((s) => s.agentId));
    const uniqueTasks = new Set(sessions.map((s) => s.taskId));

    return {
      totalSessions: sessions.length,
      activeSessions: active.length,
      completedSessions: completed.length,
      failedSessions: failed.length,
      overallSuccessRate: finished.length > 0 ? completed.length / finished.length : 0,
      totalTokensUsed: totalTokens,
      totalFileWrites: totalWrites,
      avgSessionDuration: finished.length > 0 ? totalDuration / finished.length : 0,
      uniqueAgents: uniqueAgents.size,
      uniqueTasks: uniqueTasks.size,
      generatedAt: Date.now(),
    };
  }

  /**
   * Compute metrics for all agents in a set of sessions.
   */
  computeAllAgentMetrics(sessions: Session[]): AgentMetrics[] {
    const agentIds = new Set(sessions.map((s) => s.agentId));
    return Array.from(agentIds).map((id) => this.computeAgentMetrics(id, sessions));
  }

  // ── Private helpers ────────────────────────────────────────

  private computeDuration(session: Session): number {
    if (session.completedAt && session.startedAt) {
      return session.completedAt - session.startedAt;
    }
    if (session.completedAt) {
      return session.completedAt - session.createdAt;
    }
    return 0;
  }

  private computeTaskStatus(sessions: Session[]): "success" | "failure" | "partial" | "pending" {
    if (sessions.length === 0) return "pending";

    const hasComplete = sessions.some((s) => s.state === "complete");
    const hasFailed = sessions.some((s) => s.state === "failed");
    const hasActive = sessions.some((s) => s.state === "running" || s.state === "pending");

    if (hasActive) return "pending";
    if (hasComplete && !hasFailed) return "success";
    if (hasFailed && !hasComplete) return "failure";
    return "partial"; // some succeeded, some failed
  }
}
