# Development Walkthroughs

Step-by-step guides for the 6 most common development tasks in the Admiral Framework.

---

## 1. Adding a New Hook

Hooks enforce governance rules on tool calls. They run as bash scripts before or after tool use.

### Prerequisites
- Familiarity with bash scripting
- Understanding of the hook lifecycle (see `docs/guides/hook-development.md`)

### Steps

```bash
# 1. Scaffold the hook
bash admiral/bin/hook scaffold my_new_check

# 2. Edit the generated file
#    File: .hooks/my_new_check.sh
#    - Update the SO reference (SO-XX → actual SO number)
#    - Implement enforcement logic in the "Hook Logic" section
#    - Decide: hard-block (exit 2) or advisory (exit 0)

# 3. Validate the hook
bash admiral/bin/hook validate my_new_check

# 4. Test with sample payload
bash admiral/bin/hook test my_new_check

# 5. Register in Claude Code settings
#    Add to .claude/settings.local.json under the appropriate event:
#    "pre_tool_use": [{"command": "bash .hooks/my_new_check.sh"}]

# 6. Verify in a live session
#    The hook runs automatically on matching tool calls
```

### Expected output (validate)
```
Validating: .hooks/my_new_check.sh
  PASS bash shebang
  PASS strict mode
  PASS sources hook_utils.sh
  PASS calls hook_init
  PASS has hard-block path
  PASS executable
```

---

## 2. Adding an API Endpoint

The control plane server uses Node.js built-in HTTP (no Express).

### Prerequisites
- TypeScript familiarity
- Understanding of `control-plane/src/server.ts` route handling

### Steps

```bash
# 1. Open control-plane/src/server.ts
# 2. Add a route handler in the handleRequest method:

# Example: GET /api/sessions
# In the route matching section, add:
#   if (url.pathname === "/api/sessions" && req.method === "GET") {
#     const sessions = this.runtime?.getAllSessions() ?? [];
#     return respond(res, 200, sessions);
#   }

# 3. Add types if needed in a new or existing file
# 4. Write tests in a .test.ts file using node:test

# 5. Build and test
cd control-plane
npx tsc
node --test dist/src/your-file.test.js

# 6. Lint
npx @biomejs/biome check src/your-file.ts
```

---

## 3. Adding a Standing Order

Standing Orders are the governance rules that hooks enforce.

### Steps

```bash
# 1. Create the SO document
#    File: admiral/standing-orders/SO-XX-name.md
#    Follow the template in existing SOs (SO-01 through SO-16)

# 2. Update the enforcement map
#    File: admiral/docs/standing-orders-enforcement-map.md
#    Add an entry mapping the new SO to its enforcement mechanism

# 3. Implement enforcement
#    Option A: Create a new hook (see Walkthrough 1)
#    Option B: Add logic to an existing hook

# 4. Add to the SO index
#    File: admiral/standing-orders/index.md
```

---

## 4. Adding a Brain Entry Type

Brain entries store institutional memory (decisions, patterns, violations).

### Steps

```bash
# 1. For Brain B1 (JSON files):
#    Use the existing brain_write function in admiral/lib/brain_writer.sh
#    Categories: decision, failure, pattern, lesson

# Example from a hook:
source admiral/lib/brain_writer.sh
brain_write "decision" "My Decision Title" "Details here" "my_hook"

# 2. For Brain B2 (SQLite):
#    Use the B2 write queue (per ADR-010)

source admiral/lib/brain_writer.sh
brain_b2_queue_write "decision" "Title" "Content" "source_hook"

# 3. For reading from B2:
source admiral/lib/brain_query.sh
result=$(brain_query_precedent "search term")
result=$(brain_query_violations "agent-id" "3600")
result=$(brain_query_context "entry-title")
```

---

## 5. Modifying the Quarantine Pipeline

The quarantine pipeline validates external content before brain ingestion.

### Steps

```bash
# 1. Understand the pipeline layers
#    Layer 1: Format validation (JSON schema)
#    Layer 2: Content sanitization (injection detection)
#    Layer 3: Source verification
#    Layer 4: Semantic validation
#    Layer 5: Quarantine hold

# 2. Add a new validation layer or rule
#    File: admiral/lib/injection_detector.sh (for content rules)
#    File: admiral/quarantine/ (for pipeline stages)

# 3. Test with the attack corpus
#    Directory: admiral/attack-corpus/
#    Add test cases as .json files with expected outcomes

# 4. Run quarantine tests
bash admiral/tests/test_quarantine.sh
```

---

## 6. Adding an Attack Corpus Entry

Attack corpus entries test the security pipeline against known attack patterns.

### Steps

```bash
# 1. Create the attack file
#    Directory: admiral/attack-corpus/
#    Format: ATK-NNN-description.json

# Example: admiral/attack-corpus/ATK-031-new-injection.json
cat > admiral/attack-corpus/ATK-031-new-injection.json << 'EOF'
{
  "id": "ATK-031",
  "category": "injection",
  "description": "Description of the attack pattern",
  "payload": "The malicious input to test",
  "expected_result": "blocked",
  "severity": "high",
  "references": ["OWASP-XX"]
}
EOF

# 2. Run the security tests to verify detection
bash admiral/tests/test_injection_detection.sh

# 3. Update the attack corpus index if one exists
```

---

## Verification

After any change, run the local CI to verify nothing is broken:

```bash
make ci
```
