# Extended Agent Catalog

These agent specifications are stashed here for reference. They are available for deployment when specific project needs arise but are not part of the core fleet catalog. Each is a fully specified agent definition — move it back to the main `agents/` directory when your project needs it.

## Contents

| File | Agents | When to Deploy |
|---|---|---|
| `domain.md` | 7 domain specialists (Auth, Search, Payments, Real-time, Media, Notifications, i18n) | When the project touches these specific domains and the Backend Implementer lacks sufficient depth |
| `data.md` | 5 data & analytics agents (Data Engineer, Analytics, ML, Validation, Visualization) | When the project has dedicated data pipelines, ML models, or analytics requirements |
| `scale-extended.md` | 17 supplementary scale agents (planetary, temporal, cognitive, regulatory, migration) | When specific review cycles need analysis dimensions beyond the core 12 scale agents |

## How to Activate

1. Copy the agent definition from the extras file to the appropriate main catalog file (or create a new one in `agents/`).
2. Update `fleet/README.md` agent counts.
3. Add routing rules in `fleet/routing-rules.md`.
4. Assign model tier in `fleet/model-tiers.md`.
5. Register in the Orchestrator's agent roster.

These are not deprecated agents — they are specialized agents held in reserve until needed.
