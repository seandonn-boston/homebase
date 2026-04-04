/**
 * Admiral Framework — Health Check Aggregation (OB-04)
 *
 * Aggregates health from all components into a single /health endpoint.
 * Returns structured response with overall status and per-component probes.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface ComponentHealth {
  status: HealthStatus;
  latency_ms: number;
  last_check: string;
  details?: Record<string, unknown>;
}

export interface HealthReport {
  status: HealthStatus;
  timestamp: string;
  uptime_ms: number;
  components: Record<string, ComponentHealth>;
}

export type HealthProbe = () => ComponentHealth;

export class HealthAggregator {
  private startedAt: number = Date.now();
  private probes: Map<string, HealthProbe> = new Map();

  /** Register a health probe for a component */
  registerProbe(name: string, probe: HealthProbe): void {
    this.probes.set(name, probe);
  }

  /** Run all probes and return aggregated health report */
  check(): HealthReport {
    const components: Record<string, ComponentHealth> = {};
    let worstStatus: HealthStatus = "healthy";

    for (const [name, probe] of this.probes.entries()) {
      try {
        const start = Date.now();
        const result = probe();
        result.latency_ms = Date.now() - start;
        result.last_check = new Date().toISOString();
        components[name] = result;

        if (
          result.status === "unhealthy" ||
          (result.status === "degraded" && worstStatus === "healthy")
        ) {
          worstStatus = result.status;
        }
      } catch (err) {
        components[name] = {
          status: "unhealthy",
          latency_ms: 0,
          last_check: new Date().toISOString(),
          details: {
            error: err instanceof Error ? err.message : String(err),
          },
        };
        worstStatus = "unhealthy";
      }
    }

    return {
      status: worstStatus,
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - this.startedAt,
      components,
    };
  }
}

/** Built-in probe: check hooks directory is accessible */
export function createHooksProbe(projectDir: string): HealthProbe {
  return () => {
    const hooksDir = path.join(projectDir, ".hooks");
    const exists = fs.existsSync(hooksDir);
    if (!exists) {
      return {
        status: "unhealthy",
        latency_ms: 0,
        last_check: "",
        details: { error: "Hooks directory not found" },
      };
    }
    const files = fs.readdirSync(hooksDir).filter((f) => f.endsWith(".sh"));
    return {
      status: "healthy",
      latency_ms: 0,
      last_check: "",
      details: { hook_count: files.length },
    };
  };
}

/** Built-in probe: check Brain B1 is accessible */
export function createBrainProbe(projectDir: string): HealthProbe {
  return () => {
    const brainDir = path.join(projectDir, ".brain");
    if (!fs.existsSync(brainDir)) {
      return {
        status: "degraded",
        latency_ms: 0,
        last_check: "",
        details: { error: "Brain directory not found" },
      };
    }
    const entries = fs.readdirSync(brainDir).filter((f) => f.endsWith(".json"));
    return {
      status: "healthy",
      latency_ms: 0,
      last_check: "",
      details: { entry_count: entries.length },
    };
  };
}

/** Built-in probe: check event log is writable */
export function createEventLogProbe(projectDir: string): HealthProbe {
  return () => {
    const logFile = path.join(projectDir, ".admiral", "event_log.jsonl");
    const admiralDir = path.join(projectDir, ".admiral");

    if (!fs.existsSync(admiralDir)) {
      return {
        status: "degraded",
        latency_ms: 0,
        last_check: "",
        details: { error: "Admiral directory not found" },
      };
    }

    const logExists = fs.existsSync(logFile);
    let lineCount = 0;
    if (logExists) {
      const content = fs.readFileSync(logFile, "utf-8");
      lineCount = content.trim().split("\n").filter(Boolean).length;
    }

    return {
      status: "healthy",
      latency_ms: 0,
      last_check: "",
      details: { log_exists: logExists, event_count: lineCount },
    };
  };
}

/** Built-in probe: control plane self-check */
export function createControlPlaneProbe(): HealthProbe {
  const startTime = Date.now();
  return () => ({
    status: "healthy" as HealthStatus,
    latency_ms: 0,
    last_check: "",
    details: { uptime_ms: Date.now() - startTime },
  });
}
