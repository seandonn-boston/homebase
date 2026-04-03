/**
 * Tests for Session Recording & Replay (IF-08)
 */

import { beforeEach, describe, expect, it } from "vitest";
import { SessionRecorder } from "./session-recorder";
import { SessionReplayer } from "./session-replayer";

describe("SessionRecorder", () => {
  let recorder: SessionRecorder;

  beforeEach(() => {
    recorder = new SessionRecorder({ maxRecordings: 100 });
  });

  it("starts and ends a session", () => {
    const rec = recorder.startSession("s1", "agent-a");
    expect(rec.sessionId).toBe("s1");
    expect(rec.endedAt).toBeNull();
    const ended = recorder.endSession("s1");
    expect(ended!.endedAt).not.toBeNull();
  });

  it("records events with sequential numbering", () => {
    recorder.startSession("s1", "agent-a");
    const e1 = recorder.recordEvent("s1", "tool", "agent-a", { tool: "grep" }, 50, true);
    const e2 = recorder.recordEvent("s1", "hook", "agent-a", { hook: "lint" }, 120, true);
    expect(e1.seq).toBe(1);
    expect(e2.seq).toBe(2);
  });

  it("rejects events on ended sessions", () => {
    recorder.startSession("s1", "agent-a");
    recorder.endSession("s1");
    expect(() => recorder.recordEvent("s1", "tool", "agent-a", {}, 0, true)).toThrow(
      /already ended/,
    );
  });

  it("rejects duplicate session IDs", () => {
    recorder.startSession("s1", "agent-a");
    expect(() => recorder.startSession("s1", "agent-b")).toThrow(/already being recorded/);
  });

  it("anonymizes sensitive fields", () => {
    recorder.startSession("s1", "agent-a", { api_token: "abc123" });
    recorder.recordEvent(
      "s1",
      "tool",
      "agent-a",
      { password: "secret", file: "test.ts" },
      10,
      true,
    );
    recorder.anonymize("s1");
    const rec = recorder.getRecording("s1")!;
    expect(rec.metadata.api_token).toBe("[REDACTED]");
    expect(rec.events[0].detail.password).toBe("[REDACTED]");
    expect(rec.events[0].detail.file).toBe("test.ts");
    expect(rec.anonymized).toBe(true);
  });

  it("exports and imports recordings", () => {
    recorder.startSession("s1", "agent-a");
    recorder.recordEvent("s1", "tool", "agent-a", { x: 1 }, 10, true);
    recorder.endSession("s1");
    const exported = recorder.exportRecording("s1")!;
    const recorder2 = new SessionRecorder();
    recorder2.importRecording(exported);
    expect(recorder2.getRecording("s1")!.events).toHaveLength(1);
  });

  it("lists sessions", () => {
    recorder.startSession("s1", "a");
    recorder.startSession("s2", "b");
    expect(recorder.listSessions()).toEqual(["s1", "s2"]);
  });
});

describe("SessionReplayer", () => {
  let recorder: SessionRecorder;
  let replayer: SessionReplayer;

  beforeEach(() => {
    recorder = new SessionRecorder();
    replayer = new SessionReplayer();
  });

  it("replays with identical results", () => {
    recorder.startSession("s1", "a");
    recorder.recordEvent("s1", "tool", "a", { x: 1 }, 100, true);
    recorder.recordEvent("s1", "hook", "a", { y: 2 }, 50, true);
    recorder.endSession("s1");

    const recording = recorder.getRecording("s1")!;
    const result = replayer.replay(recording, (event) => ({
      success: event.success,
      durationMs: event.durationMs,
      detail: { ...event.detail },
    }));

    expect(result.summary).toBe("identical");
    expect(result.diffs).toHaveLength(0);
  });

  it("detects regression when replay fails", () => {
    recorder.startSession("s1", "a");
    for (let i = 0; i < 10; i++) {
      recorder.recordEvent("s1", "tool", "a", {}, 100, true);
    }
    recorder.endSession("s1");

    const recording = recorder.getRecording("s1")!;
    const result = replayer.replay(recording, (event) => ({
      success: !(event.seq > 5), // half fail
      durationMs: event.durationMs,
      detail: {},
    }));

    expect(result.summary).toBe("regression");
    expect(result.successRateDrift).toBeLessThan(0);
  });

  it("compares two recordings", () => {
    recorder.startSession("s1", "a");
    recorder.recordEvent("s1", "tool", "a", {}, 10, true);
    recorder.endSession("s1");

    const r2 = new SessionRecorder();
    r2.startSession("s2", "a");
    r2.recordEvent("s2", "hook", "a", {}, 10, false);
    r2.endSession("s2");

    const diffs = replayer.compareRecordings(recorder.getRecording("s1")!, r2.getRecording("s2")!);
    expect(diffs.length).toBeGreaterThan(0);
  });
});
