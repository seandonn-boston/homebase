# Admiral Control Plane HTTP API

The Admiral server exposes a lightweight HTTP API for events, alerts, traces, and agent control. Default port: `4510`.

## Endpoints

### Health

| Method | Path | Status | Response |
|--------|------|--------|----------|
| GET | `/health` | 200 / 503 | Health check JSON |

Returns `200` when healthy, `503` when events are stale (>5 minutes since last event).

```json
{
  "status": "healthy",
  "uptime_ms": 12345,
  "events": {
    "total": 42,
    "last_event_age_ms": 1200
  },
  "alerts": {
    "active": 0,
    "total": 3
  },
  "ingester": null
}
```

### Events

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/events` | `AgentEvent[]` |

Returns all events currently in the stream (oldest first, up to `maxEvents`).

### Alerts

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/alerts` | `Alert[]` — all alerts (resolved and unresolved) |
| GET | `/api/alerts/active` | `Alert[]` — unresolved alerts only |
| GET | `/api/alerts/:id/resolve` | `{ resolved: string }` — mark alert as resolved |

### Agents

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/agents/:id/resume` | `{ resumed: string }` — resume a paused agent |

### Configuration

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/config` | `DetectorConfig` — current detector configuration |

### Trace

| Method | Path | Content-Type | Response |
|--------|------|-------------|----------|
| GET | `/api/trace` | `application/json` | `TraceNode[]` — execution trace tree |
| GET | `/api/trace/ascii` | `text/plain` | ASCII rendering of the trace tree |

### Statistics

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/stats` | `{ trace: TraceStats, ingester?: IngesterStats }` |

### Session State

| Method | Path | Status | Response |
|--------|------|--------|----------|
| GET | `/api/session` | 200 / 404 | Current `.admiral/session_state.json` |

Returns `404` if no session state file exists.

### Dashboard

| Method | Path | Response |
|--------|------|----------|
| GET | `/` | HTML dashboard (or fallback page) |

### CORS

All responses include `Access-Control-Allow-Origin: *`. OPTIONS requests return `204` with CORS headers.

## Error Responses

All errors return JSON:

```json
{
  "error": "Not found",
  "status": 404
}
```

## Key Types

See source files for full type definitions:

- `AgentEvent` — `control-plane/src/events.ts`
- `Alert` — `control-plane/src/runaway-detector.ts`
- `DetectorConfig` — `control-plane/src/runaway-detector.ts`
- `TraceNode`, `TraceStats` — `control-plane/src/trace.ts`
- `IngesterStats` — `control-plane/src/ingest.ts`

## curl Examples

```bash
# Health check
curl http://localhost:4510/health

# Get all events
curl http://localhost:4510/api/events

# Get active alerts only
curl http://localhost:4510/api/alerts/active

# Resume a paused agent
curl http://localhost:4510/api/agents/agent-1/resume

# Resolve an alert
curl http://localhost:4510/api/alerts/alert-42/resolve

# ASCII execution trace
curl http://localhost:4510/api/trace/ascii

# JSON execution trace
curl http://localhost:4510/api/trace

# Stats (trace + ingester)
curl http://localhost:4510/api/stats

# Session state
curl http://localhost:4510/api/session

# Detector configuration
curl http://localhost:4510/api/config
```
