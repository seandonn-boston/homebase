/**
 * Admiral JSONL Event Ingester
 *
 * Tails .admiral/event_log.jsonl and feeds events into the control plane's
 * EventStream. Decoupled from hooks — works whether or not the server was
 * running when events were emitted.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { EventStream } from "./events";
import { IngestionError, errorMessage } from "./errors.js";

/** Raw event shape as emitted by hooks */
interface HookEvent {
  event: string;
  timestamp: string;
  trace_id: string;
  session_id?: string;
  agent_id?: string;
  agent_name?: string;
  tool?: string;
  tool_call_count?: number;
  tokens_used?: number;
  token_count?: number;
  token_total?: number;
  detail?: string;
  model?: string;
  standing_orders_loaded?: number;
  [key: string]: unknown;
}

/** Maps hook event types to control plane EventType */
function mapEventType(hookEvent: string): string {
  const mapping: Record<string, string> = {
    session_start: "agent_started",
    tool_called: "tool_called",
    token_spent: "token_spent",
    policy_violation: "policy_violation",
    post_tool_use: "tool_called", // legacy format
  };
  return mapping[hookEvent] || "tool_called";
}

/** Extracts the data payload from a hook event based on its type */
function extractData(raw: HookEvent): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  switch (raw.event) {
    case "session_start":
      data.model = raw.model;
      data.standing_orders_loaded = raw.standing_orders_loaded;
      break;
    case "tool_called":
    case "post_tool_use":
      data.tool = raw.tool;
      data.tool_call_count = raw.tool_call_count;
      data.tokens_used = raw.tokens_used;
      break;
    case "token_spent":
      data.count = raw.token_count;
      data.total = raw.token_total;
      break;
    case "policy_violation":
      data.rule = "hook_alert";
      data.details = raw.detail;
      break;
  }

  data.trace_id = raw.trace_id;
  return data;
}

export interface IngesterStats {
  ingested: number;
  malformedLines: number;
  readErrors: number;
  offset: number;
}

export class JournalIngester {
  private eventLogPath: string;
  private stream: EventStream;
  private offset = 0;
  private isWatching = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private totalIngested = 0;
  private malformedLines = 0;
  private readErrors = 0;

  constructor(projectDir: string, stream: EventStream) {
    this.eventLogPath = path.join(projectDir, ".admiral", "event_log.jsonl");
    this.stream = stream;
  }

  /**
   * Start watching the event log file.
   * Ingests any existing events first, then watches for new ones.
   */
  start(pollMs = 1000): void {
    // Ingest existing events
    this.ingestNewLines();

    // Watch for changes using fs.watchFile (no external deps)
    try {
      fs.watchFile(this.eventLogPath, { interval: pollMs }, () => {
        this.ingestNewLines();
      });
      this.isWatching = true;
    } catch {
      // Fallback to polling if watchFile fails
      this.pollInterval = setInterval(() => {
        this.ingestNewLines();
      }, pollMs);
    }
  }

  /** Stop watching */
  stop(): void {
    if (this.isWatching) {
      fs.unwatchFile(this.eventLogPath);
      this.isWatching = false;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /** Read new lines from the event log since last offset */
  ingestNewLines(): number {
    if (!fs.existsSync(this.eventLogPath)) {
      return 0;
    }

    let ingested = 0;
    try {
      const stat = fs.statSync(this.eventLogPath);
      if (stat.size <= this.offset) {
        return 0;
      }

      const fd = fs.openSync(this.eventLogPath, "r");
      const buffer = Buffer.alloc(stat.size - this.offset);
      fs.readSync(fd, buffer, 0, buffer.length, this.offset);
      fs.closeSync(fd);

      this.offset = stat.size;

      const chunk = buffer.toString("utf-8");
      const lines = chunk.split("\n").filter((l) => l.trim().length > 0);

      for (const line of lines) {
        try {
          const raw: HookEvent = JSON.parse(line);
          const type = mapEventType(raw.event);
          const data = extractData(raw);

          this.stream.emit(
            raw.agent_id || "claude-code",
            raw.agent_name || "Claude Code Agent",
            type as Parameters<EventStream["emit"]>[2],
            data,
          );
          ingested++;
        } catch {
          this.malformedLines++;
          if (this.malformedLines === 1) {
            console.error(
              `[admiral-ingester] First malformed line at offset ${this.offset}: ${line.slice(0, 120)}`,
            );
          }
        }
      }
    } catch (err) {
      this.readErrors++;
      if (this.readErrors === 1) {
        console.error(
          `[admiral-ingester] First read error: ${errorMessage(err)}`,
        );
      }
    }

    this.totalIngested += ingested;
    return ingested;
  }

  /** Get current file offset (for diagnostics) */
  getOffset(): number {
    return this.offset;
  }

  /** Get ingester health stats */
  getStats(): IngesterStats {
    return {
      ingested: this.totalIngested,
      malformedLines: this.malformedLines,
      readErrors: this.readErrors,
      offset: this.offset,
    };
  }
}
