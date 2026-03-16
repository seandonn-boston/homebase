#!/bin/bash
# Admiral Framework — Traced Multi-Agent Session Runner
# Demonstrates the full loop: hooks → event log → control plane → brain
# Usage: ./traced-session-runner.sh [--with-server]
#
# With --with-server: starts control plane, runs session, captures trace, shuts down
# Without: runs session hooks and brain only (no control plane needed)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
export CLAUDE_PROJECT_DIR="$PROJECT_DIR"

OUTPUT_DIR="$SCRIPT_DIR/traced-session-output"
HOOKS_DIR="$PROJECT_DIR/.hooks"
BRAIN_BIN="$PROJECT_DIR/admiral/bin"
EVENT_LOG="$PROJECT_DIR/.admiral/event_log.jsonl"

WITH_SERVER=false
if [ "${1:-}" = "--with-server" ]; then
  WITH_SERVER=true
fi

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
DIM='\033[2m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Admiral Framework — Traced Session Runner     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# --- Setup ---
mkdir -p "$OUTPUT_DIR"
mkdir -p "$PROJECT_DIR/.admiral"

# Clear previous event log for clean trace
> "$EVENT_LOG"

echo -e "${YELLOW}[Setup]${NC} Initializing session..."

# --- Step 1: Session Start ---
echo -e "${GREEN}[Step 1]${NC} Firing session_start hook..."
SESSION_PAYLOAD='{"session_id":"traced-session-001","model":"claude-opus-4-6"}'
SESSION_OUT=$(echo "$SESSION_PAYLOAD" | "$HOOKS_DIR/session_start_adapter.sh" 2>/dev/null) || true
echo -e "  ${DIM}Standing Orders injected, session initialized${NC}"

# --- Step 2: Record brain entries (prior knowledge) ---
echo -e "${GREEN}[Step 2]${NC} Recording brain entries (simulating prior knowledge)..."
"$BRAIN_BIN/brain_record" "traced-demo" "decision" "Use advisory-only hooks" \
  "All post-tool-use hooks exit 0 to prevent deadlocks. Enforcement happens at pre-tool-use only." \
  "architect" > /dev/null
echo -e "  ${DIM}Recorded: decision — Use advisory-only hooks${NC}"

"$BRAIN_BIN/brain_record" "traced-demo" "pattern" "Event sourcing for observability" \
  "Every hook invocation emits a structured event to .admiral/event_log.jsonl for control plane ingestion." \
  "backend-implementer" > /dev/null
echo -e "  ${DIM}Recorded: pattern — Event sourcing for observability${NC}"

"$BRAIN_BIN/brain_record" "traced-demo" "lesson" "Zero-dependency control plane" \
  "The TypeScript control plane uses only Node.js built-ins. No npm runtime dependencies." \
  "qa-agent" > /dev/null
echo -e "  ${DIM}Recorded: lesson — Zero-dependency control plane${NC}"

# --- Step 3: Simulate tool calls (fire post_tool_use hooks) ---
echo -e "${GREEN}[Step 3]${NC} Simulating tool calls via post_tool_use hooks..."

TOOLS=("Read" "Edit" "Bash" "Grep" "Write" "Read" "Agent" "Edit" "Bash" "Read")
for i in "${!TOOLS[@]}"; do
  TOOL="${TOOLS[$i]}"
  TOOL_PAYLOAD=$(jq -n --arg tool "$TOOL" '{tool_name: $tool, tool_input: {}, tool_output: "success"}')
  echo "$TOOL_PAYLOAD" | "$HOOKS_DIR/post_tool_use_adapter.sh" > /dev/null 2>&1 || true
  echo -e "  ${DIM}[$((i+1))/10] Tool: $TOOL${NC}"
done
echo -e "  ${DIM}10 tool calls simulated${NC}"

# --- Step 4: Query brain mid-session ---
echo -e "${GREEN}[Step 4]${NC} Querying brain for prior decisions..."
QUERY_OUT=$("$BRAIN_BIN/brain_query" "hooks" --project "traced-demo" 2>/dev/null) || true
echo -e "  ${DIM}Query results:${NC}"
echo "$QUERY_OUT" | sed 's/^/    /'

# --- Step 5: Capture outputs ---
echo -e "${GREEN}[Step 5]${NC} Capturing session artifacts..."

# Copy event log
cp "$EVENT_LOG" "$OUTPUT_DIR/event_log.jsonl"
EVENT_COUNT=$(wc -l < "$OUTPUT_DIR/event_log.jsonl" | tr -d ' ')
echo -e "  ${DIM}Event log: $EVENT_COUNT events captured${NC}"

# Copy session state
if [ -f "$PROJECT_DIR/.admiral/session_state.json" ]; then
  cp "$PROJECT_DIR/.admiral/session_state.json" "$OUTPUT_DIR/session_state.json"
  echo -e "  ${DIM}Session state captured${NC}"
fi

# Save brain entries
BRAIN_ENTRIES=$("$BRAIN_BIN/brain_query" "" --project "traced-demo" 2>/dev/null) || BRAIN_ENTRIES="No entries"
echo "$BRAIN_ENTRIES" > "$OUTPUT_DIR/brain_entries.txt"
echo -e "  ${DIM}Brain entries captured${NC}"

# --- Step 6: Control plane trace (optional) ---
if [ "$WITH_SERVER" = true ]; then
  echo -e "${GREEN}[Step 6]${NC} Starting control plane for trace capture..."

  # Build control plane if needed
  if [ ! -f "$PROJECT_DIR/control-plane/dist/src/cli.js" ]; then
    echo -e "  ${DIM}Building control plane...${NC}"
    (cd "$PROJECT_DIR/control-plane" && npx tsc 2>/dev/null) || true
  fi

  # Start server in background
  node "$PROJECT_DIR/control-plane/dist/src/cli.js" --project-dir "$PROJECT_DIR" --port 4511 &
  SERVER_PID=$!
  sleep 2

  # Capture trace via API
  if curl -s "http://localhost:4511/api/events" > "$OUTPUT_DIR/control_plane_events.json" 2>/dev/null; then
    echo -e "  ${DIM}Control plane events captured${NC}"
  fi
  if curl -s "http://localhost:4511/api/trace/ascii" > "$OUTPUT_DIR/trace_ascii.txt" 2>/dev/null; then
    echo -e "  ${DIM}ASCII trace captured${NC}"
  fi
  if curl -s "http://localhost:4511/api/stats" > "$OUTPUT_DIR/stats.json" 2>/dev/null; then
    echo -e "  ${DIM}Stats captured${NC}"
  fi
  if curl -s "http://localhost:4511/api/session" > "$OUTPUT_DIR/session_api.json" 2>/dev/null; then
    echo -e "  ${DIM}Session API response captured${NC}"
  fi

  # Shutdown server
  kill "$SERVER_PID" 2>/dev/null || true
  wait "$SERVER_PID" 2>/dev/null || true
  echo -e "  ${DIM}Control plane shut down${NC}"
else
  echo -e "${GREEN}[Step 6]${NC} ${DIM}Skipped control plane (run with --with-server to enable)${NC}"
fi

# --- Summary ---
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Session Complete                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Events emitted:   $EVENT_COUNT"
echo -e "  Brain entries:    3 recorded, $(echo "$QUERY_OUT" | grep -c "^\\[" || echo "0") query hits"
echo -e "  Session state:    $OUTPUT_DIR/session_state.json"
echo -e "  Event log:        $OUTPUT_DIR/event_log.jsonl"
echo -e "  Brain dump:       $OUTPUT_DIR/brain_entries.txt"
echo ""
echo -e "  ${DIM}All artifacts saved to: $OUTPUT_DIR/${NC}"
