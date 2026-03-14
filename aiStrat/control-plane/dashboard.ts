// Reference implementation sketch for the CP1-CP2 Fleet Control Plane.
// See aiStrat/admiral/fleet-control-plane.md for the full specification.

import type { FleetSnapshot, AgentStatus, FleetEvent } from './types';

/**
 * Render a self-contained HTML dashboard for the fleet.
 *
 * SECURITY NOTE — XSS prevention:
 *   All dynamic data is inserted via textContent (set by inline JS) rather
 *   than innerHTML.  The static HTML skeleton below contains only structural
 *   markup; agent-provided or user-provided strings are escaped through
 *   textContent assignment in the <script> block that hydrates the page.
 */
export function renderDashboardHTML(snapshot: FleetSnapshot): string {
  // Serialise snapshot as JSON for the client-side script.  Embedding it in
  // a <script> tag is safe because JSON.stringify escapes </script> sequences
  // (the only dangerous string in a script context) — but we add an explicit
  // replacement as defence-in-depth.
  const safeJSON = JSON.stringify(snapshot).replace(/<\//g, '<\\/');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Admiral Fleet Dashboard</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0d1117; color: #c9d1d9; margin: 0; padding: 1rem; }
  h1 { color: #58a6ff; margin-top: 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 1rem; }
  .card h3 { margin-top: 0; }
  .health-green  { color: #3fb950; }
  .health-yellow { color: #d29922; }
  .health-red    { color: #f85149; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.5rem; }
  td, th { text-align: left; padding: 4px 8px; border-bottom: 1px solid #21262d; }
  th { color: #8b949e; }
  #events { max-height: 300px; overflow-y: auto; font-size: 0.85rem; }
  .event-row { padding: 2px 0; border-bottom: 1px solid #21262d; font-family: monospace; }
  .summary { display: flex; gap: 2rem; margin-bottom: 1rem; }
  .summary .stat { font-size: 1.4rem; font-weight: 600; }
  .summary .label { font-size: 0.8rem; color: #8b949e; }
</style>
</head>
<body>

<h1>Admiral Fleet Dashboard</h1>

<!-- Summary bar — populated via textContent -->
<div class="summary">
  <div><span class="stat" id="s-agents">-</span><br/><span class="label">Agents</span></div>
  <div><span class="stat" id="s-budget">-</span><br/><span class="label">Budget used</span></div>
  <div><span class="stat" id="s-events">-</span><br/><span class="label">Recent events</span></div>
</div>

<!-- Agent cards -->
<div class="grid" id="agent-grid"></div>

<!-- Recent events table -->
<h2>Recent Events</h2>
<div id="events"></div>

<script>
// Data injected server-side (escaped, not user-controlled HTML).
var DATA = ${safeJSON};

// --- Populate summary (textContent only) ---
document.getElementById('s-agents').textContent = DATA.agents.length;
document.getElementById('s-budget').textContent =
  DATA.totalBudget > 0
    ? Math.round((DATA.totalUsed / DATA.totalBudget) * 100) + '%'
    : '0%';
document.getElementById('s-events').textContent = DATA.events.length;

// --- Build agent cards using DOM methods (no innerHTML) ---
var grid = document.getElementById('agent-grid');
DATA.agents.forEach(function(agent) {
  var card = document.createElement('div');
  card.className = 'card';

  var heading = document.createElement('h3');
  heading.className = 'health-' + agent.health;
  heading.textContent = agent.id + ' (' + agent.role + ')';
  card.appendChild(heading);

  var table = document.createElement('table');
  var fields = [
    ['Status', agent.status],
    ['Task', agent.currentTask || '(none)'],
    ['Tokens', agent.tokensUsed + ' / ' + agent.tokenBudget],
    ['Errors', String(agent.errors)],
  ];
  fields.forEach(function(pair) {
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    th.textContent = pair[0];
    var td = document.createElement('td');
    td.textContent = pair[1];
    tr.appendChild(th);
    tr.appendChild(td);
    table.appendChild(tr);
  });
  card.appendChild(table);
  grid.appendChild(card);
});

// --- Build event list using DOM methods (no innerHTML) ---
var eventsDiv = document.getElementById('events');
DATA.events.slice().reverse().forEach(function(evt) {
  var row = document.createElement('div');
  row.className = 'event-row';
  row.textContent = evt.ts + '  ' + evt.event + '  ' + evt.agent +
    (evt.tool ? '  tool=' + evt.tool : '');
  eventsDiv.appendChild(row);
});
</script>

</body>
</html>`;
}
