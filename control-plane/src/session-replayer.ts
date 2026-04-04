/**
 * Admiral Framework — Session Replay (IF-08)
 *
 * Replays recorded sessions with comparison against a new execution,
 * detecting regressions and behavioral drift.
 */

import type { RecordedEvent, SessionRecording } from "./session-recorder";

export interface ReplayDiff {
  seq: number;
  field: string;
  recorded: unknown;
  replayed: unknown;
}

export interface ReplayResult {
  sessionId: string;
  totalEvents: number;
  replayedEvents: number;
  diffs: ReplayDiff[];
  durationDriftPct: number;
  successRateDrift: number;
  summary: "identical" | "minor-drift" | "significant-drift" | "regression";
}

export type ReplayEventHandler = (event: RecordedEvent) => {
  success: boolean;
  durationMs: number;
  detail: Record<string, unknown>;
};

/**
 * Replays a recorded session and compares results.
 */
export class SessionReplayer {
  /**
   * Replay a recording by running each event through the handler
   * and comparing results.
   */
  replay(recording: SessionRecording, handler: ReplayEventHandler): ReplayResult {
    const diffs: ReplayDiff[] = [];
    let totalDurationRecorded = 0;
    let totalDurationReplayed = 0;
    let recordedSuccesses = 0;
    let replayedSuccesses = 0;

    for (const event of recording.events) {
      const result = handler(event);

      totalDurationRecorded += event.durationMs;
      totalDurationReplayed += result.durationMs;
      if (event.success) recordedSuccesses++;
      if (result.success) replayedSuccesses++;

      if (event.success !== result.success) {
        diffs.push({
          seq: event.seq,
          field: "success",
          recorded: event.success,
          replayed: result.success,
        });
      }

      // Compare detail keys for structural changes
      const recordedKeys = Object.keys(event.detail).sort();
      const replayedKeys = Object.keys(result.detail).sort();
      if (JSON.stringify(recordedKeys) !== JSON.stringify(replayedKeys)) {
        diffs.push({
          seq: event.seq,
          field: "detail-keys",
          recorded: recordedKeys,
          replayed: replayedKeys,
        });
      }
    }

    const n = recording.events.length;
    const durationDriftPct =
      totalDurationRecorded > 0
        ? Number(
            (
              ((totalDurationReplayed - totalDurationRecorded) / totalDurationRecorded) *
              100
            ).toFixed(1),
          )
        : 0;

    const recordedRate = n > 0 ? recordedSuccesses / n : 1;
    const replayedRate = n > 0 ? replayedSuccesses / n : 1;
    const successRateDrift = Number((replayedRate - recordedRate).toFixed(3));

    let summary: ReplayResult["summary"];
    if (diffs.length === 0) {
      summary = "identical";
    } else if (diffs.length <= n * 0.05) {
      summary = "minor-drift";
    } else if (successRateDrift < -0.1) {
      summary = "regression";
    } else {
      summary = "significant-drift";
    }

    return {
      sessionId: recording.sessionId,
      totalEvents: n,
      replayedEvents: n,
      diffs,
      durationDriftPct,
      successRateDrift,
      summary,
    };
  }

  /**
   * Compare two recordings event-by-event (e.g., before/after a change).
   */
  compareRecordings(a: SessionRecording, b: SessionRecording): ReplayDiff[] {
    const diffs: ReplayDiff[] = [];
    const maxLen = Math.max(a.events.length, b.events.length);

    for (let i = 0; i < maxLen; i++) {
      const ea = a.events[i];
      const eb = b.events[i];

      if (!ea || !eb) {
        diffs.push({
          seq: i + 1,
          field: "presence",
          recorded: ea ? ea.kind : null,
          replayed: eb ? eb.kind : null,
        });
        continue;
      }

      if (ea.kind !== eb.kind) {
        diffs.push({ seq: ea.seq, field: "kind", recorded: ea.kind, replayed: eb.kind });
      }
      if (ea.success !== eb.success) {
        diffs.push({ seq: ea.seq, field: "success", recorded: ea.success, replayed: eb.success });
      }
    }

    return diffs;
  }
}
