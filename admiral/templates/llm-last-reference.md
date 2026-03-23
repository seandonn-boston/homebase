# LLM-Last Reference Patterns

> Boundary enforcement template for the `boundaries.llm_last` section of Ground Truth documents.
> Per Admiral Spec Part 1: deterministic tools must be tried before LLM judgment is applied.

## How to Use

In your Ground Truth document, populate `boundaries.llm_last.deterministic` with tasks that
**must** use deterministic tooling first, and `boundaries.llm_last.llm_judgment` with tasks
where LLM reasoning is the appropriate first tool.

## Common Deterministic-First Patterns

These tasks should always attempt deterministic tooling before falling back to LLM judgment:

| Task | Deterministic Tool | LLM Fallback When |
|------|-------------------|-------------------|
| Code formatting | Prettier, Black, gofmt | Tool unavailable or unsupported language |
| Linting | ESLint, ShellCheck, pylint | Custom rule interpretation needed |
| Type checking | TypeScript compiler, mypy | Complex generic inference |
| Test execution | Test runner (jest, pytest) | Test generation or interpretation |
| Dependency resolution | Package manager (npm, pip) | Version conflict analysis |
| JSON/YAML validation | Schema validator (ajv, jq) | Schema design decisions |
| Secret detection | Pattern-based scanner | Context-dependent classification |
| File search | grep, ripgrep, glob | Semantic search across concepts |
| Sort/filter | jq, awk, sort | Relevance ranking |
| Version comparison | semver library | Compatibility assessment |

### Example `deterministic` Array

```json
"deterministic": [
  "Code formatting via prettier/black before suggesting style changes",
  "Linting via shellcheck/eslint before manual code review",
  "Schema validation via jq before interpreting JSON structure",
  "Test execution via test runner before analyzing test results",
  "File search via grep/glob before semantic code understanding",
  "Secret detection via pattern scanner before context classification"
]
```

## Common LLM-Judgment Patterns

These tasks are appropriate for LLM reasoning as the primary tool:

| Task | Why LLM-First |
|------|--------------|
| Architecture decisions | Requires weighing trade-offs with incomplete information |
| Code review (semantic) | Understanding intent, not just syntax |
| API design | Balancing usability, consistency, and convention |
| Error message writing | Requires empathy and context understanding |
| Documentation writing | Requires understanding audience and purpose |
| Refactoring strategy | Requires holistic codebase understanding |
| Bug diagnosis | Requires reasoning about causation chains |
| Task decomposition | Requires understanding dependencies and scope |

### Example `llm_judgment` Array

```json
"llm_judgment": [
  "Architecture and design decisions requiring trade-off analysis",
  "Code review for semantic correctness and intent alignment",
  "Documentation and error message authoring",
  "Refactoring strategy and approach selection",
  "Bug root cause analysis and diagnosis",
  "Task decomposition and dependency identification"
]
```

## Validation

The following validators enforce LLM-Last compliance:

- `validate_ground_truth` — checks that both `deterministic` and `llm_judgment` arrays are non-empty
- `validate_boundaries` — checks the full `llm_last` section structure and array population
- `readiness_assess` — integrates boundary validation into overall readiness assessment
