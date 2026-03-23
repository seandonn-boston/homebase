/**
 * Admiral Dashboard Server
 *
 * Lightweight HTTP server that serves the control dashboard
 * and exposes a JSON API for events, alerts, and traces.
 */

import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { errorMessage } from "./errors";
import type { EventStream } from "./events";
import type { JournalIngester } from "./ingest";
import type { RunawayDetector } from "./runaway-detector";
import type { ExecutionTrace } from "./trace";

type RouteHandler = (res: http.ServerResponse, params: Record<string, string>) => void;

interface Route {
  /** Exact path or regex pattern */
  pattern: string | RegExp;
  handler: RouteHandler;
}

export class AdmiralServer {
  private server: http.Server | null = null;
  private stream: EventStream;
  private detector: RunawayDetector;
  private trace: ExecutionTrace;
  private projectDir: string;
  private ingester: JournalIngester | null = null;
  private startedAt: number = Date.now();
  private routes: Route[];

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
    this.routes = this.buildRoutes();
  }

  /** Set the ingester reference for health reporting */
  setIngester(ingester: JournalIngester): void {
    this.ingester = ingester;
  }

  start(port = 4510): Promise<number> {
    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => this.handleRequest(req, res));
      this.server.listen(port, () => {
        const addr = this.server!.address() as { port: number };
        console.log(`Admiral Control Dashboard: http://localhost:${addr.port}`);
        resolve(addr.port);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.server?.close(() => resolve());
    });
  }

  private buildRoutes(): Route[] {
    return [
      { pattern: "/health", handler: (res) => this.serveHealth(res) },
      { pattern: "/api/config", handler: (res) => this.json(res, this.detector.getConfig()) },
      { pattern: "/api/events", handler: (res) => this.json(res, this.stream.getEvents()) },
      { pattern: "/api/alerts", handler: (res) => this.json(res, this.detector.getAlerts()) },
      {
        pattern: "/api/alerts/active",
        handler: (res) => this.json(res, this.detector.getActiveAlerts()),
      },
      { pattern: "/api/trace", handler: (res) => this.json(res, this.trace.buildTrace()) },
      {
        pattern: "/api/trace/ascii",
        handler: (res) => this.text(res, this.trace.renderAscii()),
      },
      { pattern: "/api/session", handler: (res) => this.serveSessionState(res) },
      {
        pattern: "/api/stats",
        handler: (res) => {
          const stats: Record<string, unknown> = { trace: this.trace.getStats() };
          if (this.ingester) {
            stats.ingester = this.ingester.getStats();
          }
          this.json(res, stats);
        },
      },
      {
        pattern: /^\/api\/agents\/([a-zA-Z0-9_-]+)\/resume$/,
        handler: (res, params) => {
          this.detector.resumeAgent(params.id);
          this.json(res, { resumed: params.id });
        },
      },
      {
        pattern: /^\/api\/alerts\/([a-zA-Z0-9_-]+)\/resolve$/,
        handler: (res, params) => {
          this.detector.resolveAlert(params.id);
          this.json(res, { resolved: params.id });
        },
      },
      { pattern: "/", handler: (res) => this.serveDashboard(res) },
      { pattern: "/index.html", handler: (res) => this.serveDashboard(res) },
    ];
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    try {
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

      for (const route of this.routes) {
        if (typeof route.pattern === "string") {
          if (url === route.pattern) {
            route.handler(res, {});
            return;
          }
        } else {
          const match = url.match(route.pattern);
          if (match) {
            route.handler(res, { id: match[1] });
            return;
          }
        }
      }

      this.errorJson(res, 404, "Not found");
    } catch (err) {
      const message = errorMessage(err);
      console.error(`[admiral-server] Unhandled error: ${message}`);
      this.errorJson(res, 500, "Internal server error");
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

    this.jsonWithStatus(res, isStale ? 503 : 200, health);
  }

  private serveSessionState(res: http.ServerResponse): void {
    const statePath = path.join(this.projectDir, ".admiral", "session_state.json");
    try {
      if (fs.existsSync(statePath)) {
        const content = fs.readFileSync(statePath, "utf-8");
        const data = JSON.parse(content);
        this.json(res, data);
      } else {
        this.errorJson(res, 404, "No session state file found");
      }
    } catch (err) {
      const message = errorMessage(err);
      console.error(`[admiral-server] Failed to read session state: ${message}`);
      this.errorJson(res, 500, "Failed to read session state");
    }
  }

  private json(res: http.ServerResponse, data: unknown): void {
    this.jsonWithStatus(res, 200, data);
  }

  private jsonWithStatus(res: http.ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data, null, 2));
  }

  private text(res: http.ServerResponse, content: string): void {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end(content);
  }

  private errorJson(res: http.ServerResponse, status: number, message: string): void {
    this.jsonWithStatus(res, status, { error: message, status });
  }

  private serveDashboard(res: http.ServerResponse): void {
    const dashboardPath = path.join(__dirname, "dashboard", "index.html");
    const sourcePath = path.join(__dirname, "..", "src", "dashboard", "index.html");
    const filePath = fs.existsSync(dashboardPath) ? dashboardPath : sourcePath;

    const html = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf-8")
      : this.fallbackDashboard();

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(html);
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
