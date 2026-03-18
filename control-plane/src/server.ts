/**
 * Admiral Dashboard Server
 *
 * Lightweight HTTP server that serves the control dashboard
 * and exposes a JSON API for events, alerts, and traces.
 */

import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import type { EventStream } from "./events";
import type { JournalIngester } from "./ingest";
import type { RunawayDetector } from "./runaway-detector";
import type { ExecutionTrace } from "./trace";

export class AdmiralServer {
  private server: http.Server | null = null;
  private stream: EventStream;
  private detector: RunawayDetector;
  private trace: ExecutionTrace;
  private projectDir: string;
  private ingester: JournalIngester | null = null;
  private startedAt: number = Date.now();

  constructor(
    stream: EventStream,
    detector: RunawayDetector,
    trace: ExecutionTrace,
    projectDir?: string,
  ) {
    this.stream = stream;
    this.detector = detector;
    this.trace = trace;
    this.projectDir = projectDir || process.cwd();
  }

  /** Set the ingester reference for health reporting */
  setIngester(ingester: JournalIngester): void {
    this.ingester = ingester;
  }

  start(port = 4510): Promise<void> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(port, () => {
        console.log(`Admiral Control Dashboard: http://localhost:${port}`);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = req.url || "/";

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // API routes
    if (url === "/health") {
      this.serveHealth(res);
    } else if (url === "/api/config") {
      this.json(res, this.detector.getConfig());
    } else if (url === "/api/events") {
      this.json(res, this.stream.getEvents());
    } else if (url === "/api/alerts") {
      this.json(res, this.detector.getAlerts());
    } else if (url === "/api/alerts/active") {
      this.json(res, this.detector.getActiveAlerts());
    } else if (url === "/api/trace") {
      this.json(res, this.trace.buildTrace());
    } else if (url === "/api/trace/ascii") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(this.trace.renderAscii());
    } else if (url === "/api/session") {
      this.serveSessionState(res);
    } else if (url === "/api/stats") {
      const stats: Record<string, unknown> = { trace: this.trace.getStats() };
      if (this.ingester) {
        stats.ingester = this.ingester.getStats();
      }
      this.json(res, stats);
    } else if (url.startsWith("/api/agents/") && url.endsWith("/resume")) {
      const parts = url.split("/").filter(Boolean);
      const agentId = parts[2];
      if (agentId && agentId !== "resume") {
        this.detector.resumeAgent(agentId);
        this.json(res, { resumed: agentId });
      } else {
        res.writeHead(400);
        res.end("Missing agent ID");
      }
    } else if (url.startsWith("/api/alerts/") && url.endsWith("/resolve")) {
      const parts = url.split("/").filter(Boolean);
      const alertId = parts[2];
      if (alertId && alertId !== "resolve") {
        this.detector.resolveAlert(alertId);
        this.json(res, { resolved: alertId });
      } else {
        res.writeHead(400);
        res.end("Missing alert ID");
      }
    } else if (url === "/" || url === "/index.html") {
      this.serveDashboard(res);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  }

  private serveHealth(res: http.ServerResponse): void {
    const events = this.stream.getEvents();
    const lastEventTs = events.length > 0 ? events[events.length - 1].timestamp : 0;
    const staleThresholdMs = 5 * 60 * 1000; // 5 minutes
    const isStale = events.length > 0 && Date.now() - lastEventTs > staleThresholdMs;
    const activeAlerts = this.detector.getActiveAlerts();

    const health = {
      status: isStale ? "degraded" : "healthy",
      uptime_ms: Date.now() - this.startedAt,
      events: {
        total: events.length,
        last_event_age_ms: lastEventTs > 0 ? Date.now() - lastEventTs : null,
      },
      alerts: {
        active: activeAlerts.length,
        total: this.detector.getAlerts().length,
      },
      ingester: this.ingester ? this.ingester.getStats() : null,
    };

    const statusCode = isStale ? 503 : 200;
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(health, null, 2));
  }

  private serveSessionState(res: http.ServerResponse): void {
    const statePath = path.join(this.projectDir, ".admiral", "session_state.json");
    try {
      if (fs.existsSync(statePath)) {
        const content = fs.readFileSync(statePath, "utf-8");
        const data = JSON.parse(content);
        this.json(res, data);
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No session state file found" }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[admiral-server] Failed to read session state: ${message}`);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Failed to read session state", detail: message }));
    }
  }

  private json(res: http.ServerResponse, data: unknown): void {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
  }

  private serveDashboard(res: http.ServerResponse): void {
    const dashboardPath = path.join(__dirname, "dashboard", "index.html");

    // Try compiled location first, then source location
    const sourcePath = path.join(__dirname, "..", "src", "dashboard", "index.html");
    const filePath = fs.existsSync(dashboardPath) ? dashboardPath : sourcePath;

    if (fs.existsSync(filePath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(fs.readFileSync(filePath, "utf-8"));
    } else {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(this.fallbackDashboard());
    }
  }

  private fallbackDashboard(): string {
    return `<!DOCTYPE html>
<html><head><title>Admiral Control Plane</title></head>
<body><h1>Admiral Control Plane</h1><p>Dashboard file not found. API is running.</p>
<ul>
<li><a href="/health">Health</a></li>
<li><a href="/api/events">Events</a></li>
<li><a href="/api/alerts">Alerts</a></li>
<li><a href="/api/config">Config</a></li>
<li><a href="/api/trace/ascii">Trace (ASCII)</a></li>
<li><a href="/api/stats">Stats</a></li>
</ul></body></html>`;
  }
}
