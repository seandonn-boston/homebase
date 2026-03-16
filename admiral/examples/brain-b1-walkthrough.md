# Brain B1 Walkthrough

Brain B1 is the Admiral Framework's file-based JSON knowledge store. It lets agents record decisions, lessons, patterns, and other knowledge as structured JSON files, then query and retrieve them later. No database required -- entries are plain `.json` files stored under `.brain/{project}/`.

## Recording a Decision

```bash
admiral/bin/brain_record "my-project" "decision" "Use TypeScript for control plane" \
  "Chose TypeScript for type safety and zero-dep policy"
```

Output:

```
Recorded: /path/to/project/.brain/my-project/20260316-143022-decision-use-typescript-for-control-plane.json
```

The filename encodes the timestamp, category, and a slug derived from the title.

## Recording a Lesson

```bash
admiral/bin/brain_record "my-project" "lesson" "Hooks must fail open" \
  "Advisory-only hooks prevent deadlocks in enforcement layer"
```

Output:

```
Recorded: /path/to/project/.brain/my-project/20260316-143025-lesson-hooks-must-fail-open.json
```

## Querying by Keyword

Search across all entries for a keyword:

```bash
admiral/bin/brain_query "TypeScript"
```

Output:

```
[decision] Use TypeScript for control plane
  Project: my-project | Created: 2026-03-16T14:30:22Z
  File: /path/to/project/.brain/my-project/20260316-143022-decision-use-typescript-for-control-plane.json

Found: 1 entries
```

## Querying with Filters

Filter by project, category, or both:

```bash
# By category
admiral/bin/brain_query "hooks" --category lesson

# By project
admiral/bin/brain_query "TypeScript" --project my-project

# Both
admiral/bin/brain_query "hooks" --project my-project --category lesson
```

Output (category filter):

```
[lesson] Hooks must fail open
  Project: my-project | Created: 2026-03-16T14:30:25Z
  File: /path/to/project/.brain/my-project/20260316-143025-lesson-hooks-must-fail-open.json

Found: 1 entries
```

## Retrieving a Full Entry

Retrieve by file path, filename, or ID:

```bash
admiral/bin/brain_retrieve /path/to/project/.brain/my-project/20260316-143022-decision-use-typescript-for-control-plane.json
```

Output:

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "project": "my-project",
  "category": "decision",
  "title": "Use TypeScript for control plane",
  "content": "Chose TypeScript for type safety and zero-dep policy",
  "metadata": {
    "tags": []
  },
  "source_agent": "manual",
  "created_at": "2026-03-16T14:30:22Z"
}
```

## Entry JSON Schema

Each brain entry contains:

| Field          | Type     | Description                                    |
|----------------|----------|------------------------------------------------|
| `id`           | string   | UUID v4 identifier                             |
| `project`      | string   | Project name (alphanumeric, hyphens, underscores) |
| `category`     | string   | One of the six category types (see below)      |
| `title`        | string   | Short summary of the entry                     |
| `content`      | string   | Full description or detail                     |
| `metadata`     | object   | Contains `tags` array (extensible)             |
| `source_agent` | string   | Agent that created the entry (default: `manual`) |
| `created_at`   | string   | ISO 8601 UTC timestamp                         |

## Categories

| Category   | Use For                                                  |
|------------|----------------------------------------------------------|
| `decision` | Architectural or design choices made                     |
| `outcome`  | Results of decisions or experiments                      |
| `lesson`   | Things learned from experience                           |
| `context`  | Background information relevant to a project             |
| `failure`  | What went wrong and why                                  |
| `pattern`  | Reusable approaches or conventions                       |
