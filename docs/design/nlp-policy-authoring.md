# Natural Language Policy Authoring (IF-09)

> Compile human-readable policy statements into executable hooks and Standing Order entries

---

## Concept

Operators write policies in natural language:
```
"Agents must not write to the .env file"
"Block any tool call that modifies files in the production/ directory"  
"Warn when token usage exceeds 80% of budget"
```

The NLP policy compiler translates these into:
1. Hook enforcement rules (scope_boundary_guard patterns)
2. Standing Order entries
3. Alert rule configurations

## Modes

- **Suggest mode**: Generates hook/SO entries for human review before applying
- **Apply mode**: After human approval, directly updates configuration

## Architecture

```
Natural Language Input
  → LLM Classification (policy type, scope, action)
  → Template Matching (map to existing hook patterns)
  → Code Generation (hook snippet or config entry)
  → Validation (syntax check, conflict detection)
  → Output (suggest or apply)
```

## Conflict Detection

New policies are checked against existing Standing Orders and hook rules for conflicts. Conflicting policies require explicit resolution (priority assignment or scope narrowing).
