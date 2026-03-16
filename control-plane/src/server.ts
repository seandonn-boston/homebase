/**
 * Admiral Dashboard Server
 *
 * Lightweight HTTP server that serves the control dashboard
 * and exposes a JSON API for events, alerts, and traces.
 */

import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import { EventStream } from "./events";
import { RunawayDetector } from "./runaway-detector";
import { ExecutionTrace } from "./trace";

export class AdmiralServer {
  private server: http.Server | null = null;
  private stream: EventStream;
  private detector: RunawayDetector;
  private trace: ExecutionTrace;
  private projectDir: string;

  constructor(
    stream: EventStream,
    detector: RunawayDetector,
    trace: ExecutionTrace,
    projectDir?: string
  ) {
    this.stream = stream;
    this.detector = detector;
    this.trace = trace;
    this.projectDir = projectDir || process.cwd();
  }

  start(port: number = 4510): Promise<void> {
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
    if (url === "/api/events") {
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
      this.json(res, this.trace.getStats());
    } else if (url.startsWith("/api/agents/") && url.endsWith("/resume")) {
      const agentId = url.split("/")[3];
      this.detector.resumeAgent(agentId);
      this.json(res, { resumed: agentId });
    } else if (url.startsWith("/api/alerts/") && url.endsWith("/resolve")) {
      const alertId = url.split("/")[3];
      this.detector.resolveAlert(alertId);
      this.json(res, { resolved: alertId });
    } else if (url === "/" || url === "/index.html") {
      this.serveDashboard(res);
    } else {
      res.writeHead(404);
      res.end("Not found");
    }
  }

  private serveSessionState(res: http.ServerResponse): void {
    const statePath = path.join(this.projectDir, ".admiral", "session_state.json");
    try {
      if (fs.existsSync(statePath)) {
        const content = fs.readFileSync(statePath, "utf-8");
        const data = JSON.parse(content);
        this.json(res, data);
      } else {
        this.json(res, { error: "No session state file found" });
      }
    } catch {
      this.json(res, { error: "Failed to read session state" });
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
<li><a href="/api/events">Events</a></li>
<li><a href="/api/alerts">Alerts</a></li>
<li><a href="/api/trace/ascii">Trace (ASCII)</a></li>
<li><a href="/api/stats">Stats</a></li>
</ul></body></html>`;
  }
}
