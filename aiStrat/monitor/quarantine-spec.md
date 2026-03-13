<!-- Admiral Framework v0.2.0-alpha -->
# Quarantine System — Detailed Layer Specification

> **Status:** Specification only. See `README.md` for architecture overview.

The quarantine is a five-layer validation pipeline that all external content must pass before entering the Brain. The critical design principle: **layers 1-3 are completely LLM-free**. Load-bearing security boundaries must not depend on the same technology they are protecting against.

-----

## Layer 1: Structural Validation

**Purpose:** Reject malformed input before any content analysis.
**LLM involvement:** None. Fully deterministic.

| Check | Action on Failure |
|---|---|
| Required fields present (id, title, content, source, category) | Reject |
| Field length within bounds (title ≤ 200 chars, content ≤ 50K chars) | Reject |
| Category matches allowed enum | Reject |
| Source URL is well-formed (if present) | Reject |
| Timestamp is valid ISO 8601 | Reject |
| No null bytes or control characters in text fields | Reject |

**Rationale:** Structural validation catches accidental corruption and basic injection attempts (oversized payloads, malformed data). It is the cheapest and fastest layer.

-----

## Layer 2: Injection Detection

**Purpose:** Detect and neutralize known injection patterns.
**LLM involvement:** None. Pattern matching only.

**Pre-processing:** Encoding normalization before pattern matching:
- Unicode normalization (NFC)
- HTML entity decoding
- URL decoding
- Homoglyph normalization

**Detection patterns (70+ regex patterns):**

| Category | Example Patterns | Action |
|---|---|---|
| Prompt injection | `ignore previous`, `system:`, `<|im_start|>` | Reject |
| Command injection | `$()`, `` ` ` ``, `; rm`, `| cat` | Reject |
| XSS | `<script>`, `javascript:`, `onerror=` | Reject |
| SQL injection | `' OR 1=1`, `; DROP TABLE`, `UNION SELECT` | Reject |
| Secrets/PII | Email patterns, SSN patterns, AWS key patterns | Reject |
| Path traversal | `../`, `..\\`, `/etc/passwd` | Reject |

**Rationale:** Pattern-based detection catches the vast majority of injection attempts. Encoding normalization prevents evasion via alternative representations.

-----

## Layer 3: Deterministic Semantic Analysis

**Purpose:** Detect semantically adversarial content without using an LLM.
**LLM involvement:** None. Pre-trained static models only.

**Techniques:**

| Technique | What It Detects | How It Works |
|---|---|---|
| **TF-IDF authority scoring** | Authority spoofing patterns | Compares input text against attack corpus TF-IDF vectors. High similarity to known authority spoofing patterns triggers rejection. |
| **Bayesian text classification** | Behavioral manipulation | Pre-trained Naive Bayes classifier (trained on attack corpus) scores probability of adversarial intent. |
| **Credential fabrication detection** | False provenance claims | Pattern matching for certification/qualification claims, source attribution without verifiable links. |
| **Behavior manipulation scoring** | Constraint relaxation attempts | Detects phrases that attempt to modify agent behavior, override instructions, or relax constraints. |

**Training data:** Attack corpus (see `attack-corpus/README.md`). The classifier is trained offline and deployed as a static model — no online learning, no LLM involvement in execution.

**Threshold:** Configurable per-deployment. Default: reject if any technique scores above 0.7 confidence.

**Rationale:** This layer catches sophisticated attacks that bypass pattern matching but can be detected through statistical analysis. By using pre-trained models rather than LLMs, it maintains the LLM-airgap principle.

-----

## Layer 4: LLM Advisory

**Purpose:** Catch subtle semantic attacks that evade deterministic detection.
**LLM involvement:** Yes — but **reject-only**. The LLM can never approve content.

**Constraints:**
- LLM can only output REJECT or PASS
- A PASS from Layer 4 does NOT mean approval — it means the LLM found nothing suspicious
- A REJECT from Layer 4 blocks the content
- Content that passes all 4 layers still requires Admiral approval (approved: false)
- The LLM prompt is hardened against manipulation — it receives sanitized content, not raw input

**Rationale:** Layer 4 exists as an additive safety net. It is inherently probabilistic and cannot guarantee detection of novel adversarial patterns. The system's security does NOT depend on this layer — Layers 1-3 provide the load-bearing boundary.

-----

## Layer 5: Antibody Generation

**Purpose:** Learn from rejected content to improve future detection.
**LLM involvement:** Indirect — antibody generation may use LLM for pattern extraction, but the antibodies themselves are deterministic patterns stored in the Brain.

**Process:**
1. Content rejected by any layer is logged with rejection metadata
2. Rejection patterns are analyzed (offline, batch process)
3. Novel attack patterns are extracted and converted to deterministic rules
4. New rules are added to Layer 2 (regex) or Layer 3 (classifier training data)
5. Antibodies are stored as Brain entries with category `failure` and tag `attack_corpus`

**Rate limit:** 50 antibodies per hour maximum to prevent write amplification.

**Rationale:** The quarantine learns from attacks, converting probabilistic detections (Layer 4) into deterministic defenses (Layers 2-3) over time.

-----

## Attack Corpus Integration

The attack corpus (`attack-corpus/`) feeds the quarantine in two ways:
1. **Training data** for Layer 3 classifiers (TF-IDF vectors, Bayesian priors)
2. **Test cases** for quarantine validation (each ATK scenario should be caught by at least one layer)

**Coverage matrix:** Each attack scenario should document which quarantine layer is expected to catch it.

| Attack Category | Primary Layer | Backup Layer |
|---|---|---|
| Authority spoofing (ATK-0001–0004) | Layer 3 (TF-IDF) | Layer 4 (LLM) |
| Credential fabrication (ATK-0005–0007) | Layer 3 (Bayesian) | Layer 2 (patterns) |
| Behavior manipulation (ATK-0008–0010) | Layer 3 (scoring) | Layer 4 (LLM) |
| Prompt injection (ATK-0011–0013) | Layer 2 (regex) | Layer 3 (TF-IDF) |
| Failure scenarios (ATK-0014–0016) | N/A (operational) | N/A |
| Chaos scenarios (ATK-0017–0018) | N/A (operational) | N/A |
