// Reference implementation sketch for the Level 1-2 Fleet Control Plane.
// See aiStrat/admiral/fleet-control-plane.md for the full specification.

import * as http from 'node:http';
import type { FleetEvent, AgentStatus, FleetSnapshot } from './types';
import { renderDashboardHTML } from './dashboard';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PORT = Number(process.env.ADMIRAL_PORT) || 7070;

/** Maximum number of events kept in memory (oldest dropped first). */
const MAX_EVENTS = Number(process.env.ADMIRAL_MAX_EVENTS) || 10_000;

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

const events: FleetEvent[] = [];
const agents: Map<string, AgentStatus> = new Map();

// ---------------------------------------------------------------------------
// JSON-lines structured output
// ---------------------------------------------------------------------------

/**
 * Emit a FleetEvent to stdout as newline-delimited JSON when the
 * ADMIRAL_JSONL environment variable is set to '1'.
 */
function emitEvent(event: FleetEvent): void {
  if (process.env.ADMIRAL_JSONL === '1') {
    process.stdout.write(JSON.stringify(event) + '\n');
  }
}

// ---------------------------------------------------------------------------
// Event ingestion with retention limit
// ---------------------------------------------------------------------------

function pushEvent(event: FleetEvent): void {
  events.push(event);
  // Enforce retention limit — drop oldest events when the cap is reached.
  while (events.length > MAX_EVENTS) {
    events.shift();
  }
  emitEvent(event);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSnapshot(): FleetSnapshot {
  let totalBudget = 0;
  let totalUsed = 0;
  for (const a of agents.values()) {
    totalBudget += a.tokenBudget;
    totalUsed += a.tokensUsed;
  }
  return {
    agents: Array.from(agents.values()),
    events: events.slice(-50), // last 50 for the dashboard
    totalBudget,
    totalUsed,
  };
}

function jsonResponse(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  // Use the URL constructor for proper parsing instead of string splitting.
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method = req.method ?? 'GET';

  // --- Dashboard (HTML) ---------------------------------------------------
  if (method === 'GET' && pathname === '/') {
    const snapshot = buildSnapshot();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(renderDashboardHTML(snapshot));
    return;
  }

  // --- Fleet status (JSON) ------------------------------------------------
  if (method === 'GET' && pathname === '/api/status') {
    jsonResponse(res, 200, buildSnapshot());
    return;
  }

  // --- Ingest event -------------------------------------------------------
  if (method === 'POST' && pathname === '/api/events') {
    try {
      const body = await readBody(req);
      const event: FleetEvent = JSON.parse(body);
      if (!event.ts) event.ts = new Date().toISOString();
      pushEvent(event);

      // Side-effect: update agent status if the event references one.
      if (event.agent && !agents.has(event.agent)) {
        agents.set(event.agent, {
          id: event.agent,
          role: String(event.role ?? 'unknown'),
          status: 'active',
          health: 'green',
          currentTask: null,
          tokensUsed: 0,
          tokenBudget: 100_000,
          errors: 0,
          lastEventTs: event.ts,
        });
      }
      const agent = agents.get(event.agent);
      if (agent) {
        agent.lastEventTs = event.ts;
        if (typeof event.tokens_used === 'number') {
          agent.tokensUsed += event.tokens_used as number;
        }
      }

      jsonResponse(res, 201, { ok: true });
    } catch {
      jsonResponse(res, 400, { error: 'Invalid JSON body' });
    }
    return;
  }

  // --- Pause / resume agent -----------------------------------------------
  if (method === 'POST' && pathname.startsWith('/api/agents/')) {
    const segments = pathname.split('/');
    const agentId = decodeURIComponent(segments[3] ?? '');
    const action = segments[4]; // "pause" | "resume"
    const agent = agents.get(agentId);
    if (!agent) {
      jsonResponse(res, 404, { error: 'Agent not found' });
      return;
    }
    if (action === 'pause') {
      agent.status = 'paused';
      pushEvent({ ts: new Date().toISOString(), event: 'agent_paused', agent: agentId });
    } else if (action === 'resume') {
      agent.status = 'active';
      pushEvent({ ts: new Date().toISOString(), event: 'agent_resumed', agent: agentId });
    } else {
      jsonResponse(res, 400, { error: 'Unknown action' });
      return;
    }
    jsonResponse(res, 200, { ok: true, agent });
    return;
  }

  // --- Fallback -----------------------------------------------------------
  jsonResponse(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  const bootEvent: FleetEvent = {
    ts: new Date().toISOString(),
    event: 'control_plane_start',
    agent: 'control-plane',
    port: PORT,
  };
  pushEvent(bootEvent);
  console.log(`Admiral Control Plane listening on http://localhost:${PORT}`);
});
