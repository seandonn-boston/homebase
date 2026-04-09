# Debugging Guide

How to debug hooks (bash), the control plane (TypeScript), and brain queries in the Admiral Framework.

---

## Debugging Hooks

### Hook not firing

```
Symptom: A tool call should trigger a hook but doesn't.
```

1. **Check registration**: Is the hook listed in `.claude/settings.local.json`?
   ```bash
   cat .claude/settings.local.json | jq '.hooks'
   ```

2. **Check event type**: Is the hook registered for the correct event (`pre_tool_use`, `post_tool_use`, `session_start`)?

3. **Check the adapter**: Hooks go through adapters. Verify the adapter is registered:
   ```bash
   ls .hooks/pre_tool_use_adapter.sh
   ls .hooks/post_tool_use_adapter.sh
   ```

4. **Check file permissions**: Hook must be executable:
   ```bash
   bash admiral/bin/hook validate <hook_name>
   ```

5. **Run manually**: Test with a sample payload:
   ```bash
   bash admiral/bin/hook test <hook_name>
   ```

### Hook blocking unexpectedly

```
Symptom: A hook is hard-blocking (exit 2) when it shouldn't.
```

1. **Enable trace mode**: Run the hook with `bash -x` to see each line:
   ```bash
   echo '{"tool_name":"Write","tool_input":{"file_path":"/tmp/test"}}' | bash -x .hooks/<hook_name>.sh
   ```

2. **Check environment variables**: Hooks depend on `CLAUDE_PROJECT_DIR`:
   ```bash
   export CLAUDE_PROJECT_DIR="$(pwd)"
   ```

3. **Check scope overrides**: Some hooks support `ADMIRAL_SCOPE_OVERRIDE`:
   ```bash
   export ADMIRAL_SCOPE_OVERRIDE="/path/to/allow"
   ```

4. **Check brain state**: If the hook queries Brain for precedent, the data may be stale:
   ```bash
   source admiral/lib/brain_query.sh
   brain_b2_health
   ```

### Hook timeout

```
Symptom: Hook takes too long and is killed (default: 5s for hooks, 10s for adapters).
```

1. **Profile the hook**: Time each section:
   ```bash
   time bash .hooks/<hook_name>.sh < test_payload.json
   ```

2. **Check B2 queries**: Brain queries have a 50ms timeout but sqlite3 startup adds overhead
3. **Check jq usage**: Complex jq expressions on large payloads are slow
4. **Check network calls**: Hooks should never make network calls

---

## Debugging the Control Plane

### Server crash

```
Symptom: `node dist/src/cli.js` crashes on startup or during operation.
```

1. **Check the error output**: Run without output suppression:
   ```bash
   cd control-plane
   node dist/src/cli.js 2>&1
   ```

2. **Check port availability**: Default port 4510:
   ```bash
   lsof -i :4510  # macOS/Linux
   netstat -ano | grep 4510  # Windows
   ```

3. **Check build output**: Ensure TypeScript compiled without errors:
   ```bash
   cd control-plane
   npx tsc --noEmit
   ```

4. **Check event log**: Ingestion errors often cause issues:
   ```bash
   tail -20 .admiral/event_log.jsonl | jq '.'
   ```

### Slow queries

```
Symptom: API endpoints respond slowly (> 100ms).
```

1. **Check event buffer size**: Large event streams slow down queries:
   ```bash
   curl -s http://localhost:4510/api/stats | jq '.events'
   ```

2. **Check runaway detector**: SPC monitoring adds overhead per event:
   ```bash
   curl -s http://localhost:4510/api/config | jq '.spc'
   ```

3. **Run benchmarks**:
   ```bash
   cd control-plane
   node dist/src/benchmarks/bench.js
   ```

### Missing events

```
Symptom: Events from hooks don't appear in the event stream.
```

1. **Check the event log**: Events flow through `.admiral/event_log.jsonl`:
   ```bash
   tail -5 .admiral/event_log.jsonl
   ```

2. **Check ingester status**:
   ```bash
   curl -s http://localhost:4510/health | jq '.ingester'
   ```

3. **Check ingester offset**: If the offset is behind, ingester is falling behind:
   ```bash
   wc -l .admiral/event_log.jsonl
   curl -s http://localhost:4510/api/stats | jq '.ingester.offset'
   ```

---

## Debugging Brain Queries

### Empty results from brain_query_precedent

```
Symptom: FTS5 search returns [] when entries should exist.
```

1. **Check B2 availability**:
   ```bash
   source admiral/lib/brain_query.sh
   brain_b2_health
   ```

2. **Check database has entries**: Query directly:
   ```bash
   sqlite3 .brain-b2/brain-b2.db "SELECT COUNT(*) FROM brain_entries;"
   ```

3. **Check FTS5 index**: Ensure the FTS virtual table is populated:
   ```bash
   sqlite3 .brain-b2/brain-b2.db "SELECT COUNT(*) FROM brain_fts;"
   ```

4. **Test the query directly**:
   ```bash
   sqlite3 -json .brain-b2/brain-b2.db \
     "SELECT id, title FROM brain_entries WHERE rowid IN (SELECT rowid FROM brain_fts WHERE brain_fts MATCH 'your search term');"
   ```

### Write queue not draining

```
Symptom: .admiral/brain_write_queue.jsonl keeps growing.
```

1. **Check queue size**:
   ```bash
   source admiral/lib/brain_writer.sh
   brain_b2_queue_size
   ```

2. **Attempt manual replay**:
   ```bash
   source admiral/lib/brain_writer.sh
   brain_b2_replay_queue
   ```

3. **Check B2 database is writable**:
   ```bash
   sqlite3 .brain-b2/brain-b2.db "PRAGMA journal_mode;"
   # Should return "wal"
   ```

---

## General Troubleshooting Decision Tree

```
Problem?
  ├── Hook-related?
  │   ├── Not firing → Check registration, adapter, permissions
  │   ├── Blocking → bash -x trace, check conditions
  │   └── Timeout → Profile, check B2 queries
  ├── Server-related?
  │   ├── Won't start → Check port, build errors
  │   ├── Slow → Check event buffer, SPC config
  │   └── Missing data → Check ingester, event log
  └── Brain-related?
      ├── Empty queries → Check B2 health, FTS index
      └── Queue growing → Check B2 writability, replay
```
