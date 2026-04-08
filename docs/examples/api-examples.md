# API Examples

Copy-paste-executable examples for every control plane API endpoint and hook format.

## Control Plane API

Base URL: `http://localhost:4510`

### Health Check

```bash
curl -s http://localhost:4510/health | jq '.'
```

Expected output:
```json
{
  "status": "healthy",
  "events": { "retained": 42, "evicted": 0, "total": 42 },
  "alerts": { "total": 0, "active": 0 },
  "ingester": { "ingested": 42, "malformed": 0, "errors": 0 }
}
```

### Event Stream

```bash
# All events
curl -s http://localhost:4510/api/events | jq '.[0]'

# Events by agent
curl -s http://localhost:4510/api/events?agent=orchestrator | jq '.'

# Events since timestamp
curl -s "http://localhost:4510/api/events?since=$(date -d '5 minutes ago' +%s)000" | jq '.'
```

### Alerts

```bash
# All alerts
curl -s http://localhost:4510/api/alerts | jq '.'

# Active alerts only
curl -s http://localhost:4510/api/alerts/active | jq '.'

# Resolve an alert
curl -s http://localhost:4510/api/alerts/alert_abc123/resolve
```

### Execution Trace

```bash
# JSON trace tree
curl -s http://localhost:4510/api/trace | jq '.'

# ASCII visualization
curl -s http://localhost:4510/api/trace/ascii
```

### Session State

```bash
curl -s http://localhost:4510/api/session | jq '.'
```

### Stats

```bash
curl -s http://localhost:4510/api/stats | jq '.'
```

### Detector Configuration

```bash
curl -s http://localhost:4510/api/config | jq '.'
```

---

## Hook Input/Output Formats

### PreToolUse Input (stdin)

```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "content": "file contents..."
  },
  "agent_identity": {
    "agent_id": "backend-implementer",
    "role": "engineer"
  },
  "trace_id": "trace_abc123"
}
```

### PreToolUse Output (stdout)

```json
{
  "decision": "allow",
  "hook": "scope_boundary_guard",
  "message": "File path within permitted boundaries"
}
```

Or for a block:
```json
{
  "decision": "block",
  "hook": "scope_boundary_guard",
  "message": "Write to aiStrat/ is prohibited (read-only boundary)"
}
```

### PostToolUse Input (stdin)

```json
{
  "tool_name": "Write",
  "tool_result": {
    "success": true,
    "file_path": "/path/to/file.ts"
  },
  "agent_identity": {
    "agent_id": "backend-implementer"
  },
  "trace_id": "trace_abc123"
}
```

### SessionStart Input (stdin)

```json
{
  "session_id": "ses_abc123",
  "model": "claude-sonnet-4-20250514",
  "cwd": "/path/to/project",
  "agent_identity": {
    "agent_id": "orchestrator",
    "model_tier": "tier1_flagship"
  }
}
```

---

## Brain Query Examples

```bash
source admiral/lib/brain_query.sh

# Search for precedent
brain_query_precedent "injection detected"
# Returns: [{"id":"...","title":"...","content":"..."}]

# Count violations by agent
brain_query_violations "agent-1" "3600"
# Returns: {"count":2,"recent":[...]}

# Get specific context entry
brain_query_context "deployment-policy"
# Returns: {"title":"deployment-policy","content":"...","category":"decision"}

# Check if pattern was seen
brain_check_pattern "sha256abc"
# Returns: {"seen":true,"count":1,"last_seen":1700000000}

# Health check
brain_b2_health
# Returns: {"available":true,"db_path":"...","entry_count":42}
```

## Brain Write Examples

```bash
source admiral/lib/brain_writer.sh

# Record a decision (B1 - JSON files)
brain_record_decision "my_hook" "Allowed deployment" "Passed all checks"

# Record a violation (B1)
brain_record_violation "my_hook" "scope_violation" "Wrote to protected path" "Write"

# Queue a B2 write (async, non-blocking)
brain_b2_queue_write "decision" "Title" "Content" "source_hook"

# Record violation to B2
brain_b2_record_violation "my_hook" "agent-1" "scope_violation" "Details"

# Check queue size
brain_b2_queue_size
```

---

## Event Log Format

Events written to `.admiral/event_log.jsonl`:

```json
{"event":"session_start","timestamp":"2025-01-01T12:00:00Z","trace_id":"trace_abc","data":{"model":"claude-sonnet-4-20250514","standing_orders_loaded":16}}
{"event":"tool_called","timestamp":"2025-01-01T12:00:01Z","trace_id":"trace_abc","data":{"tool":"Write","tool_call_count":1}}
{"event":"policy_violation","timestamp":"2025-01-01T12:00:02Z","trace_id":"trace_abc","data":{"detail":"Scope boundary violation"}}
```
