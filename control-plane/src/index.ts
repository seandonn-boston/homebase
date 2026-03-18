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

export { AgentEvent, EventListener, EventStream, EventStreamConfig, EventType } from "./events";
export { JournalIngester } from "./ingest";
export { AgentInstrumentation, InstrumentationConfig } from "./instrumentation";
export {
  Alert,
  ControlChart,
  DetectorConfig,
  RunawayDetector,
  SPCMonitor,
  SPCViolation,
} from "./runaway-detector";
export { AdmiralServer } from "./server";
export { ExecutionTrace, TraceNode, TraceStats } from "./trace";

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
