/**
 * Admiral Control Plane
 *
 * The smallest version that proves the core thesis:
 * Running multiple AI agents safely requires a control layer
 * that sits outside the agents themselves.
 *
 * Three capabilities:
 * 1. Agent Event Stream — observability into every agent action
 * 2. Runaway Detection — real-time governance over failure patterns
 * 3. Execution Trace — visualization of agent reasoning trees
 */

export { DistributedTracer, TraceSpan } from "./distributed-tracing";
export {
  AdmiralError,
  errorCode,
  errorMessage,
  IngestionError,
  NotFoundError,
  StateCorruptionError,
  ValidationError,
} from "./errors";
export { AgentEvent, EventListener, EventStream, EventStreamConfig, EventType } from "./events";
export { FleetDashboard, FleetDashboardData } from "./fleet-dashboard";
export {
  GovernanceDashboard,
  GovernanceDashboardData,
} from "./governance-dashboard";
export { JournalIngester } from "./ingest";
export { AgentInstrumentation, InstrumentationConfig } from "./instrumentation";
export {
  AuthLevel,
  InterventionAuthConfig,
  InterventionAuthorizer,
  InterventionType,
} from "./intervention-auth";
export {
  getInterventionAction,
  getReversibleActions,
  INTERVENTION_CATALOG,
  InterventionAction,
  requiresConfirmation,
} from "./intervention-catalog";
export { EndpointTier, RateLimiter, RateLimitResult, RateLimitTier } from "./rate-limiter";
export {
  Alert,
  ControlChart,
  DetectorConfig,
  RunawayDetector,
  SPCMonitor,
  SPCViolation,
} from "./runaway-detector";
export { AdmiralServer } from "./server";
export { SessionThermalModel, ThermalState } from "./session-thermal";
// Observability enhancements
export {
  EnhancedStructuredLogger,
  StructuredLogEntry,
  StructuredLogFilter,
  StructuredLogLevel,
} from "./structured-logging";
export { ExecutionTrace, TraceNode, TraceStats } from "./trace";
export {
  CanonicalSpan,
  CanonicalTrace,
  CanonicalTraceBuilder,
  CausalLink,
} from "./trace-format";

import { EventStream } from "./events";
import { AgentInstrumentation } from "./instrumentation";
import { type DetectorConfig, RunawayDetector } from "./runaway-detector";
import { ExecutionTrace } from "./trace";

export interface AdmiralInstance {
  stream: EventStream;
  detector: RunawayDetector;
  trace: ExecutionTrace;
  instrument(agentId: string, agentName: string): AgentInstrumentation;
  shutdown(): void;
}

/**
 * Create a fully wired Admiral control plane instance.
 */
export function createAdmiral(detectorConfig?: Partial<DetectorConfig>): AdmiralInstance {
  const stream = new EventStream();
  const detector = new RunawayDetector(stream, detectorConfig);
  const trace = new ExecutionTrace(stream);

  detector.start();

  return {
    stream,
    detector,
    trace,

    /** Create an instrumentation hook for a specific agent */
    instrument(agentId: string, agentName: string): AgentInstrumentation {
      return new AgentInstrumentation(stream, { agentId, agentName });
    },

    /** Shut down the control plane */
    shutdown() {
      detector.stop();
    },
  };
}
