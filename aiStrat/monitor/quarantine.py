"""Brain Immune System — quarantine, validate, and defend against adversarial input.

Every piece of external content destined for the Brain passes through this
module before ingestion. It acts as a multi-layered immune system:

Layer 1: STRUCTURAL VALIDATION
    Rejects malformed entries, enforces schema, checks field constraints.

Layer 2: INJECTION DETECTION
    Scans for prompt injection, XSS, SQL injection, command injection,
    and other attack vectors that could poison the Brain or manipulate
    agents that later consume Brain entries.

Layer 3: SEMANTIC ANALYSIS
    Detects content that attempts to override agent behavior, plant false
    authority, or impersonate system instructions.

Layer 4: THREAT PRESERVATION (the "disassembly" layer)
    When an attack is detected, the system does NOT silently discard it.
    Instead, it captures the attack's structure, intent, and technique
    as a FAILURE entry in the Brain — turning the attack itself into
    defensive knowledge. Like an immune system creating antibodies.

Design principles:
    - NEVER trust external input. All monitor-sourced content is untrusted.
    - Defense in depth. Multiple independent detection layers.
    - Fail closed. If validation fails, the entry is quarantined, not admitted.
    - Learn from attacks. Detected threats become Brain entries that help
      future detection (the antibody pattern).
    - Preserve attack logic. The structure of detected attacks is recorded
      for analysis, not just the fact that an attack occurred.

Reference: admiral/part3-enforcement.md (hooks over instructions),
           admiral/part5-brain.md (write access control),
           seed_research.py entries on memory poisoning and supply chain attacks.
"""

from __future__ import annotations

import hashlib
import logging
import re
import threading
import time
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class ThreatLevel(Enum):
    """Severity of detected threats."""
    CLEAN = "clean"
    SUSPICIOUS = "suspicious"    # Flagged but may be benign
    HOSTILE = "hostile"          # Clear attack pattern detected
    CRITICAL = "critical"        # Active exploitation attempt


class ThreatCategory(Enum):
    """Classification of attack types."""
    PROMPT_INJECTION = "prompt_injection"
    XSS = "xss"
    SQL_INJECTION = "sql_injection"
    COMMAND_INJECTION = "command_injection"
    AUTHORITY_SPOOFING = "authority_spoofing"
    DATA_POISONING = "data_poisoning"
    ENCODING_ATTACK = "encoding_attack"
    STRUCTURAL_VIOLATION = "structural_violation"
    PII_EXPOSURE = "pii_exposure"
    SECRET_EXPOSURE = "secret_exposure"


@dataclass
class ThreatSignal:
    """A single detected threat indicator."""
    category: ThreatCategory
    level: ThreatLevel
    pattern_matched: str         # The regex or rule that fired
    matched_text: str            # The actual text that triggered it
    field: str                   # Which entry field contained the threat
    description: str             # Human-readable explanation


@dataclass
class QuarantineResult:
    """Result of passing content through the immune system."""
    entry_hash: str              # SHA-256 of the original content
    is_clean: bool               # True only if all layers pass
    threat_level: ThreatLevel
    signals: list[ThreatSignal] = field(default_factory=list)
    sanitized_entry: Optional[dict] = None   # Cleaned version (if recoverable)
    antibody: Optional[dict] = None          # Brain FAILURE entry (if threat detected)
    timestamp: float = field(default_factory=time.time)

    @property
    def should_admit(self) -> bool:
        """Whether this entry is safe to write to the Brain."""
        return self.is_clean and self.threat_level == ThreatLevel.CLEAN

    @property
    def threat_summary(self) -> str:
        if not self.signals:
            return "No threats detected."
        categories = set(s.category.value for s in self.signals)
        return f"{len(self.signals)} signal(s) across {', '.join(categories)}"


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LAYER 1: STRUCTURAL VALIDATION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VALID_CATEGORIES = {"decision", "outcome", "lesson", "context", "failure", "pattern"}
MAX_TITLE_LEN = 300
MAX_CONTENT_LEN = 10_000
MAX_TAG_LEN = 50
MAX_TAGS = 20
MAX_METADATA_KEYS = 30


def _validate_structure(entry: dict) -> list[ThreatSignal]:
    """Enforce schema constraints on entry fields."""
    signals = []

    # Required fields
    for field_name in ("title", "content", "category"):
        if field_name not in entry or not entry[field_name]:
            signals.append(ThreatSignal(
                category=ThreatCategory.STRUCTURAL_VIOLATION,
                level=ThreatLevel.HOSTILE,
                pattern_matched=f"missing_required_field:{field_name}",
                matched_text="",
                field=field_name,
                description=f"Required field '{field_name}' is missing or empty.",
            ))

    # Category must be valid
    cat = entry.get("category", "")
    if cat and cat not in VALID_CATEGORIES:
        signals.append(ThreatSignal(
            category=ThreatCategory.STRUCTURAL_VIOLATION,
            level=ThreatLevel.HOSTILE,
            pattern_matched="invalid_category",
            matched_text=cat,
            field="category",
            description=f"Category '{cat}' is not in the valid set: {VALID_CATEGORIES}.",
        ))

    # Length constraints
    title = entry.get("title", "")
    if len(title) > MAX_TITLE_LEN:
        signals.append(ThreatSignal(
            category=ThreatCategory.STRUCTURAL_VIOLATION,
            level=ThreatLevel.SUSPICIOUS,
            pattern_matched=f"title_too_long:{len(title)}",
            matched_text=title[:100] + "...",
            field="title",
            description=f"Title exceeds {MAX_TITLE_LEN} chars ({len(title)}).",
        ))

    content = entry.get("content", "")
    if len(content) > MAX_CONTENT_LEN:
        signals.append(ThreatSignal(
            category=ThreatCategory.STRUCTURAL_VIOLATION,
            level=ThreatLevel.SUSPICIOUS,
            pattern_matched=f"content_too_long:{len(content)}",
            matched_text=content[:100] + "...",
            field="content",
            description=f"Content exceeds {MAX_CONTENT_LEN} chars ({len(content)}).",
        ))

    # Tag validation
    metadata = entry.get("metadata", {})
    tags = metadata.get("tags", [])
    if len(tags) > MAX_TAGS:
        signals.append(ThreatSignal(
            category=ThreatCategory.STRUCTURAL_VIOLATION,
            level=ThreatLevel.SUSPICIOUS,
            pattern_matched=f"too_many_tags:{len(tags)}",
            matched_text=str(tags[:5]),
            field="metadata.tags",
            description=f"Tag count {len(tags)} exceeds limit of {MAX_TAGS}.",
        ))

    for tag in tags:
        if len(tag) > MAX_TAG_LEN or not re.match(r"^[a-zA-Z0-9\-]+$", tag):
            signals.append(ThreatSignal(
                category=ThreatCategory.STRUCTURAL_VIOLATION,
                level=ThreatLevel.SUSPICIOUS,
                pattern_matched="invalid_tag_format",
                matched_text=tag[:50],
                field="metadata.tags",
                description=f"Tag '{tag[:50]}' contains invalid characters or is too long.",
            ))

    # Metadata size
    if len(metadata) > MAX_METADATA_KEYS:
        signals.append(ThreatSignal(
            category=ThreatCategory.DATA_POISONING,
            level=ThreatLevel.SUSPICIOUS,
            pattern_matched=f"metadata_bloat:{len(metadata)}",
            matched_text=str(list(metadata.keys())[:10]),
            field="metadata",
            description=f"Metadata has {len(metadata)} keys (limit: {MAX_METADATA_KEYS}).",
        ))

    return signals


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LAYER 2: INJECTION DETECTION
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Each pattern: (compiled_regex, ThreatCategory, ThreatLevel, description)
# Patterns are ordered by severity — critical first.

_INJECTION_PATTERNS: list[tuple[re.Pattern, ThreatCategory, ThreatLevel, str]] = []


def _build_patterns() -> None:
    """Build compiled regex patterns for injection detection."""
    global _INJECTION_PATTERNS

    rules = [
        # ── PROMPT INJECTION (attacks on agents that read Brain entries) ──
        (r"(?i)ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|context)",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.CRITICAL,
         "Direct instruction override: attempts to nullify agent instructions"),

        (r"(?i)disregard\s+(all\s+)?(previous|prior|your)\s+(instructions?|prompts?|rules?|programming)",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.CRITICAL,
         "Instruction disregard: attempts to override agent programming"),

        (r"(?i)you\s+are\s+now\s+(a|an|the)\s+\w+",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.CRITICAL,
         "Identity reassignment: attempts to redefine agent role"),

        (r"(?i)new\s+(instructions?|role|persona|identity)\s*[:=]",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.CRITICAL,
         "Instruction injection: attempts to inject new directives"),

        (r"(?i)(system|admin|root)\s*(prompt|mode|access|override)\s*[:=]",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.CRITICAL,
         "Privilege escalation: attempts to gain elevated access"),

        (r"(?i)jailbreak|do\s+anything\s+now|DAN\s+mode|developer\s+mode",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.CRITICAL,
         "Known jailbreak pattern: recognized LLM exploitation technique"),

        (r"(?i)\[INST\]|\[/INST\]|<\|im_start\|>|<\|im_end\|>|<\|system\|>",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.CRITICAL,
         "Chat template injection: attempts to inject model-specific control tokens"),

        (r"(?i)<<\s*SYS\s*>>|<</SYS>>",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.CRITICAL,
         "Llama system prompt injection: model-specific control sequence"),

        (r"(?i)pretend\s+(you|that|to\s+be)|act\s+as\s+(if|though|a\s+)",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.HOSTILE,
         "Role manipulation: attempts to alter agent behavior through roleplay"),

        (r"(?i)forget\s+(everything|all|what)\s+(you|about)",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.HOSTILE,
         "Memory manipulation: attempts to clear agent context"),

        (r"(?i)output\s+(the|your)\s+(system\s+prompt|instructions|rules|hidden)",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.HOSTILE,
         "Prompt extraction: attempts to exfiltrate system instructions"),

        (r"(?i)repeat\s+(the|your)\s+(instructions|system|prompt|rules)\s+(back|verbatim|exactly)",
         ThreatCategory.PROMPT_INJECTION, ThreatLevel.HOSTILE,
         "Prompt exfiltration via repetition request"),

        # ── XSS (if Brain content ever surfaces in web UIs) ──
        (r"<script[\s>]",
         ThreatCategory.XSS, ThreatLevel.CRITICAL,
         "Script tag: classic XSS vector"),

        (r"(?i)javascript\s*:",
         ThreatCategory.XSS, ThreatLevel.CRITICAL,
         "JavaScript protocol handler: XSS via URL scheme"),

        (r"(?i)on(error|load|click|mouseover|focus|blur|submit|change|input)\s*=",
         ThreatCategory.XSS, ThreatLevel.CRITICAL,
         "HTML event handler: inline XSS vector"),

        (r"(?i)<\s*(iframe|object|embed|applet|form|base|link|meta|svg\s+onload)",
         ThreatCategory.XSS, ThreatLevel.HOSTILE,
         "Dangerous HTML element: potential XSS or content injection"),

        (r"(?i)data\s*:\s*text/html",
         ThreatCategory.XSS, ThreatLevel.HOSTILE,
         "Data URI with HTML: potential XSS bypass"),

        (r"(?i)expression\s*\(",
         ThreatCategory.XSS, ThreatLevel.HOSTILE,
         "CSS expression: legacy IE XSS vector"),

        # ── SQL INJECTION (if Brain queries are ever constructed from content) ──
        (r"(?i)(;\s*DROP\s+TABLE|;\s*DELETE\s+FROM|;\s*UPDATE\s+\w+\s+SET|;\s*INSERT\s+INTO)",
         ThreatCategory.SQL_INJECTION, ThreatLevel.CRITICAL,
         "SQL statement injection: destructive SQL command"),

        (r"(?i)(UNION\s+SELECT|UNION\s+ALL\s+SELECT)",
         ThreatCategory.SQL_INJECTION, ThreatLevel.HOSTILE,
         "SQL UNION injection: data exfiltration attempt"),

        (r"(?i)(--\s*$|/\*.*\*/|;\s*--)",
         ThreatCategory.SQL_INJECTION, ThreatLevel.SUSPICIOUS,
         "SQL comment pattern: potential injection component"),

        (r"(?i)(EXEC\s*\(|EXECUTE\s*\(|xp_cmdshell|sp_executesql)",
         ThreatCategory.SQL_INJECTION, ThreatLevel.CRITICAL,
         "SQL procedure execution: command injection via SQL"),

        # ── COMMAND INJECTION ──
        (r"(?i)(`[^`]*`|\$\([^)]*\))",
         ThreatCategory.COMMAND_INJECTION, ThreatLevel.SUSPICIOUS,
         "Shell command substitution: backtick or $() execution"),

        (r"(?i)(;\s*rm\s+-rf|;\s*curl\s+|;\s*wget\s+|;\s*nc\s+-|;\s*bash\s+-c)",
         ThreatCategory.COMMAND_INJECTION, ThreatLevel.CRITICAL,
         "Shell command chain: destructive or network command"),

        (r"\|\s*(bash|sh|zsh|cmd|powershell)",
         ThreatCategory.COMMAND_INJECTION, ThreatLevel.CRITICAL,
         "Pipe to shell: command execution via piping"),

        # ── ENCODING ATTACKS (obfuscation to bypass detection) ──
        (r"&#x?[0-9a-fA-F]+;",
         ThreatCategory.ENCODING_ATTACK, ThreatLevel.SUSPICIOUS,
         "HTML entity encoding: potential obfuscation of injection"),

        (r"\\u[0-9a-fA-F]{4}",
         ThreatCategory.ENCODING_ATTACK, ThreatLevel.SUSPICIOUS,
         "Unicode escape: potential obfuscation of injection"),

        (r"%[0-9a-fA-F]{2}%[0-9a-fA-F]{2}%[0-9a-fA-F]{2}",
         ThreatCategory.ENCODING_ATTACK, ThreatLevel.SUSPICIOUS,
         "URL encoding chain: potential double-encoding attack"),

        # ── SECRETS & CREDENTIALS (must never be stored in the Brain) ──
        (r"(?i)(sk|pk|ak|rk)-[a-zA-Z0-9\-_]{20,}",
         ThreatCategory.SECRET_EXPOSURE, ThreatLevel.CRITICAL,
         "API key pattern: looks like an API key (sk-/pk-/ak-/rk- prefix)"),

        (r"(?i)(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}",
         ThreatCategory.SECRET_EXPOSURE, ThreatLevel.CRITICAL,
         "GitHub token: matches GitHub personal/OAuth/app token pattern"),

        (r"(?i)AKIA[0-9A-Z]{16}",
         ThreatCategory.SECRET_EXPOSURE, ThreatLevel.CRITICAL,
         "AWS access key: matches AWS access key ID pattern"),

        (r"(?i)(password|passwd|pwd)\s*[:=]\s*\S{4,}",
         ThreatCategory.SECRET_EXPOSURE, ThreatLevel.CRITICAL,
         "Password assignment: appears to contain a plaintext password"),

        (r"(?i)(secret|token|apikey|api_key|auth_token|access_token)\s*[:=]\s*['\"]?\S{8,}",
         ThreatCategory.SECRET_EXPOSURE, ThreatLevel.CRITICAL,
         "Secret assignment: appears to contain an authentication secret"),

        (r"(?i)-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----",
         ThreatCategory.SECRET_EXPOSURE, ThreatLevel.CRITICAL,
         "Private key: PEM-encoded private key material"),

        (r"(?i)(mongodb|postgres|mysql|redis)://\S+:\S+@",
         ThreatCategory.SECRET_EXPOSURE, ThreatLevel.CRITICAL,
         "Database connection string: contains credentials in URI"),

        # ── PII (personally identifiable information — must never be stored) ──
        (r"\b\d{3}-\d{2}-\d{4}\b",
         ThreatCategory.PII_EXPOSURE, ThreatLevel.CRITICAL,
         "SSN pattern: matches US Social Security Number format"),

        # Email: anchored with @ to prevent backtracking; limited local part length
        (r"\b[A-Za-z0-9][A-Za-z0-9._%+-]{0,63}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z]{2,6})+\b",
         ThreatCategory.PII_EXPOSURE, ThreatLevel.HOSTILE,
         "Email address: contains a personal email address"),

        # Phone: fixed-width digit groups to eliminate backtracking
        (r"\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b",
         ThreatCategory.PII_EXPOSURE, ThreatLevel.SUSPICIOUS,
         "Phone number: matches US phone number format"),

        (r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",
         ThreatCategory.PII_EXPOSURE, ThreatLevel.CRITICAL,
         "Credit card number: matches 16-digit card number pattern"),

        (r"(?i)(date\s+of\s+birth|DOB|born\s+on)\s*[:=]?\s*\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}",
         ThreatCategory.PII_EXPOSURE, ThreatLevel.HOSTILE,
         "Date of birth: contains personal birth date"),

        (r"(?i)(home\s+address|street\s+address|mailing\s+address)\s*[:=]",
         ThreatCategory.PII_EXPOSURE, ThreatLevel.HOSTILE,
         "Home address: contains what appears to be a personal address"),
    ]

    _INJECTION_PATTERNS.clear()
    for pattern_str, category, level, desc in rules:
        _INJECTION_PATTERNS.append((re.compile(pattern_str), category, level, desc))


_build_patterns()


_MAX_SCAN_LEN = 50_000  # Cap text length to prevent ReDoS on adversarial input
_MAX_METADATA_VALUE_LEN = 5_000  # Cap individual metadata string values
_MAX_METADATA_LIST_ITEMS = 50    # Cap list items in metadata values


def _scan_injections(entry: dict) -> list[ThreatSignal]:
    """Scan all text fields for injection patterns."""
    signals = []

    # Fields to scan (with their names for reporting)
    # Text is truncated to _MAX_SCAN_LEN to bound regex processing time.
    text_fields = [
        ("title", entry.get("title", "")[:_MAX_SCAN_LEN]),
        ("content", entry.get("content", "")[:_MAX_SCAN_LEN]),
    ]

    # Also scan metadata values (capped to prevent DoS via oversized metadata)
    metadata = entry.get("metadata", {})
    for key, value in metadata.items():
        if isinstance(value, str):
            text_fields.append((f"metadata.{key}", value[:_MAX_METADATA_VALUE_LEN]))
        elif isinstance(value, list):
            for i, item in enumerate(value[:_MAX_METADATA_LIST_ITEMS]):
                if isinstance(item, str):
                    text_fields.append((f"metadata.{key}[{i}]", item[:_MAX_METADATA_VALUE_LEN]))

    for field_name, text in text_fields:
        if not text:
            continue

        for pattern, category, level, description in _INJECTION_PATTERNS:
            match = pattern.search(text)
            if match:
                signals.append(ThreatSignal(
                    category=category,
                    level=level,
                    pattern_matched=pattern.pattern,
                    matched_text=match.group()[:200],
                    field=field_name,
                    description=description,
                ))

    return signals


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LAYER 3: SEMANTIC ANALYSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _analyze_semantics(entry: dict) -> list[ThreatSignal]:
    """Detect semantic-level threats: authority spoofing, false credentials, etc.

    v4: Now also invokes the pluggable SemanticValidator (from semantic_validator.py)
    to detect dangerous technical advice that regex cannot catch. The validator
    is configurable — default is RuleBasedValidator, future: LLM-based.
    """
    signals = []
    content = (entry.get("content", "") + " " + entry.get("title", "")).lower()

    # Authority spoofing: content that claims to be authoritative/enforced
    # when it comes from an external/untrusted source
    authority_claims = [
        (r"(?i)this\s+(is|entry\s+is)\s+(enforced|mandatory|required)",
         "Claims enforced authority status"),
        (r"(?i)admiral\s+(has\s+)?approv(ed|es|al)",
         "Claims Admiral approval without verification"),
        (r"(?i)override\s+(the\s+)?(existing|current|previous)\s+(entries?|knowledge|data)",
         "Claims authority to override existing knowledge"),
        (r"(?i)all\s+(agents?|fleet)\s+(must|shall|should)\s+(now|immediately)",
         "Issues fleet-wide directives from untrusted source"),
        (r"(?i)supersedes?\s+all\s+(previous|prior|existing)",
         "Claims blanket supersession of existing entries"),
    ]

    for pattern_str, description in authority_claims:
        pattern = re.compile(pattern_str)
        match = pattern.search(content)
        if match:
            signals.append(ThreatSignal(
                category=ThreatCategory.AUTHORITY_SPOOFING,
                level=ThreatLevel.HOSTILE,
                pattern_matched=pattern_str,
                matched_text=match.group()[:200],
                field="content",
                description=f"Authority spoofing: {description}",
            ))

    # Data poisoning: content that seems designed to corrupt future reasoning
    poisoning_signals = [
        (r"(?i)(always|never)\s+(use|avoid|ignore|skip|disable)\s+.{0,50}(security|validation|auth|check|verify)",
         "Attempts to alter security-related behaviors"),
        (r"(?i)the\s+correct\s+(\w+\s+)?(password|key|token|secret|credential)\s+(is|=|:)",
         "Attempts to inject fake credentials"),
        (r"(?i)(api\s+key|secret|token|password)\s*[:=]\s*\S+",
         "Contains what appears to be a credential (potential phishing or leak)"),
        (r"(?i)use\s+(this|the\s+following)\s+(key|token|password|secret|credential)",
         "Directs agents to use specific credentials"),
    ]

    for pattern_str, description in poisoning_signals:
        pattern = re.compile(pattern_str)
        match = pattern.search(content)
        if match:
            signals.append(ThreatSignal(
                category=ThreatCategory.DATA_POISONING,
                level=ThreatLevel.HOSTILE,
                pattern_matched=pattern_str,
                matched_text=match.group()[:200],
                field="content",
                description=f"Data poisoning: {description}",
            ))

    # ── Pluggable semantic validator (Rec 5 extension point) ──
    try:
        from .semantic_validator import get_validator, SemanticRisk
        validator = get_validator()
        result = validator.validate(entry)
        for finding in result.findings:
            # Map semantic risk to threat level
            if finding.risk == SemanticRisk.DANGEROUS:
                level = ThreatLevel.HOSTILE
            elif finding.risk == SemanticRisk.REVIEW:
                level = ThreatLevel.SUSPICIOUS
            else:
                continue

            signals.append(ThreatSignal(
                category=ThreatCategory.DATA_POISONING,
                level=level,
                pattern_matched=f"semantic:{finding.category}",
                matched_text=finding.matched_text[:200],
                field=finding.field,
                description=f"Semantic: {finding.description} (via {result.validator_name})",
            ))
    except ImportError:
        logger.debug("Semantic validator not available, skipping")

    return signals


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LAYER 4: THREAT PRESERVATION (ANTIBODY GENERATION)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_MAX_ANTIBODIES_PER_HOUR = 50
_ANTIBODY_WINDOW_SECONDS = 3600


class _AntibodyTracker:
    """Rate limiter and deduplicator for antibody generation.

    Prevents write amplification attacks where an adversary floods
    quarantine to generate unbounded antibody entries.

    v4: Added to address Vuln 4.4 — antibody write amplifier.
    """

    # Cap fingerprint set size to prevent unbounded memory growth
    _MAX_FINGERPRINTS = 10_000

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._fingerprints: deque[str] = deque(maxlen=self._MAX_FINGERPRINTS)
        self._fingerprint_set: set[str] = set()
        self._timestamps: deque[float] = deque()

    def _fingerprint(self, entry: dict) -> str:
        """Generate a dedup fingerprint from entry content."""
        raw = (entry.get("title", "") + "|" + entry.get("content", "")[:500]).encode()
        return hashlib.sha256(raw).hexdigest()[:32]

    def should_generate(self, entry: dict) -> bool:
        """Check if an antibody should be generated for this entry.

        Returns False if:
        - An identical antibody was already generated (dedup)
        - The rate limit has been exceeded (max per hour)
        """
        now = time.time()
        fp = self._fingerprint(entry)

        with self._lock:
            # Dedup check
            if fp in self._fingerprint_set:
                logger.info("Antibody dedup: skipping duplicate fingerprint %s", fp[:8])
                return False

            # Prune old timestamps
            cutoff = now - _ANTIBODY_WINDOW_SECONDS
            while self._timestamps and self._timestamps[0] < cutoff:
                self._timestamps.popleft()

            # Rate limit check
            if len(self._timestamps) >= _MAX_ANTIBODIES_PER_HOUR:
                logger.warning(
                    "Antibody rate limit reached: %d in last hour (max %d)",
                    len(self._timestamps), _MAX_ANTIBODIES_PER_HOUR,
                )
                return False

            # Admit — evict oldest fingerprint if at capacity
            if len(self._fingerprints) >= self._MAX_FINGERPRINTS:
                evicted = self._fingerprints.popleft()
                self._fingerprint_set.discard(evicted)
            self._fingerprints.append(fp)
            self._fingerprint_set.add(fp)
            self._timestamps.append(now)
            return True

    def reset(self) -> None:
        """Reset tracker state (for testing)."""
        with self._lock:
            self._fingerprints.clear()
            self._fingerprint_set.clear()
            self._timestamps.clear()


# Module-level singleton
_antibody_tracker = _AntibodyTracker()


def _generate_antibody(entry: dict, signals: list[ThreatSignal]) -> dict:
    """Convert a detected attack into a Brain FAILURE entry.

    This is the immune system's "memory" — by recording the attack's
    structure and technique, future scans can be informed by past attacks
    and agents can learn what adversarial patterns look like.

    The original malicious content is preserved in a neutralized form
    for analysis, with injection payloads defanged but structure intact.
    """
    threat_categories = sorted(set(s.category.value for s in signals))
    max_level = max((s.level for s in signals), key=lambda l: list(ThreatLevel).index(l))

    # Build the analysis content
    analysis_lines = [
        f"DETECTED THREAT in monitored content destined for Brain ingestion.",
        f"Threat level: {max_level.value}",
        f"Categories: {', '.join(threat_categories)}",
        f"Signals detected: {len(signals)}",
        f"",
        f"Original entry title: {_defang(entry.get('title', ''))[:200]}",
        f"Original entry category: {entry.get('category', 'unknown')}",
        f"",
        f"Attack analysis:",
    ]

    for i, signal in enumerate(signals, 1):
        analysis_lines.extend([
            f"",
            f"  Signal {i}: [{signal.category.value}] {signal.level.value}",
            f"  Rule: {signal.description}",
            f"  Field: {signal.field}",
            f"  Matched: {_defang(signal.matched_text)[:150]}",
            f"  Pattern: {signal.pattern_matched[:100]}",
        ])

    # Include defanged content for analysis (so we can study the technique)
    analysis_lines.extend([
        f"",
        f"Defanged original content (first 1000 chars):",
        f"  {_defang(entry.get('content', ''))[:1000]}",
    ])

    content_hash = hashlib.sha256(
        entry.get("content", "").encode()
    ).hexdigest()[:16]

    return {
        "project": "fleet-admiral",
        "category": "failure",
        "title": f"Threat intercepted: {', '.join(threat_categories)} [{content_hash}]",
        "content": "\n".join(analysis_lines),
        "metadata": {
            "tags": ["security", "threat-detected", "antibody"] + threat_categories,
            "source": "immune-system",
            "threat_level": max_level.value,
            "signal_count": len(signals),
            "content_hash": content_hash,
        },
        "source_agent": "quarantine",
        "source_session": f"immune-{int(time.time())}",
    }


def _defang(text: str) -> str:
    """Neutralize malicious content while preserving structure for analysis.

    Replaces executable elements with inert equivalents so the text
    can be safely stored and read without triggering the very attacks
    it describes.
    """
    if not text:
        return ""

    # Defang script tags
    text = re.sub(r"<script", "<scr[DEFANGED]ipt", text, flags=re.IGNORECASE)
    text = re.sub(r"</script", "</scr[DEFANGED]ipt", text, flags=re.IGNORECASE)

    # Defang event handlers
    text = re.sub(r"(on\w+)\s*=", r"\1[DEFANGED]=", text, flags=re.IGNORECASE)

    # Defang protocol handlers
    text = re.sub(r"javascript\s*:", "javascript[DEFANGED]:", text, flags=re.IGNORECASE)

    # Defang shell commands
    text = re.sub(r";\s*rm\s+-rf", "; rm[DEFANGED] -rf", text)

    # Defang SQL injections
    text = re.sub(r";\s*DROP\s+TABLE", "; DROP[DEFANGED] TABLE", text, flags=re.IGNORECASE)

    # Defang prompt injection tokens
    text = re.sub(r"\[INST\]", "[INS[DEFANGED]T]", text)
    text = re.sub(r"<\|im_start\|>", "<|im[DEFANGED]_start|>", text)
    text = re.sub(r"<\|im_end\|>", "<|im[DEFANGED]_end|>", text)

    # Defang secrets and PII so antibodies don't leak sensitive data
    text = re.sub(r"(?i)(sk|pk|ak|rk)-[a-zA-Z0-9\-_]{20,}", r"\1-[REDACTED]", text)
    text = re.sub(r"(?i)(ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}", r"\1_[REDACTED]", text)
    text = re.sub(r"(?i)AKIA[0-9A-Z]{16}", "AKIA[REDACTED]", text)
    text = re.sub(r"(?i)(password|passwd|pwd)\s*[:=]\s*\S{4,}", r"\1=[REDACTED]", text)
    text = re.sub(r"\b\d{3}-\d{2}-\d{4}\b", "[SSN-REDACTED]", text)
    text = re.sub(r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b", "[CARD-REDACTED]", text)
    text = re.sub(r"-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----", "[PRIVATE-KEY-REDACTED]", text, flags=re.IGNORECASE)

    return text


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PUBLIC API
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def quarantine(entry: dict) -> QuarantineResult:
    """Pass an entry through the full immune system.

    This is the single entry point for all content validation.
    Every external entry must pass through here before Brain ingestion.

    Args:
        entry: A dict with at least 'title', 'content', 'category',
               and optionally 'metadata', 'source_agent', 'source_session'.

    Returns:
        QuarantineResult with clean/reject decision, signals, and
        antibody entry if threats were detected.
    """
    content_hash = hashlib.sha256(
        (entry.get("title", "") + entry.get("content", "")).encode()
    ).hexdigest()

    all_signals: list[ThreatSignal] = []

    # Layer 1: Structure
    all_signals.extend(_validate_structure(entry))

    # Layer 2: Injection patterns
    all_signals.extend(_scan_injections(entry))

    # Layer 3: Semantic analysis
    all_signals.extend(_analyze_semantics(entry))

    # Determine overall threat level
    if not all_signals:
        threat_level = ThreatLevel.CLEAN
    else:
        threat_level = max(
            (s.level for s in all_signals),
            key=lambda l: list(ThreatLevel).index(l),
        )

    is_clean = threat_level == ThreatLevel.CLEAN

    # Layer 4: Generate antibody if threats detected (rate-limited + deduped)
    antibody = None
    if not is_clean and threat_level in (ThreatLevel.HOSTILE, ThreatLevel.CRITICAL):
        if _antibody_tracker.should_generate(entry):
            antibody = _generate_antibody(entry, all_signals)
        else:
            logger.info(
                "Antibody generation skipped (rate limit or dedup) for '%s'",
                entry.get("title", "")[:80],
            )

    # Build sanitized entry if only suspicious (not hostile/critical)
    # Re-validate after sanitization to catch payloads that survive cleanup
    sanitized_entry = None
    if threat_level == ThreatLevel.SUSPICIOUS:
        candidate = _sanitize_entry(entry, all_signals)
        # Re-scan the sanitized entry for any remaining injection patterns
        rescan_signals = _scan_injections(candidate) + _analyze_semantics(candidate)
        hostile_rescan = [
            s for s in rescan_signals
            if s.level in (ThreatLevel.HOSTILE, ThreatLevel.CRITICAL)
        ]
        if hostile_rescan:
            logger.warning(
                "Sanitized entry still contains %d hostile signal(s) — rejecting",
                len(hostile_rescan),
            )
            all_signals.extend(hostile_rescan)
            threat_level = ThreatLevel.HOSTILE
            is_clean = False
            # Generate antibody for the escalated threat
            if _antibody_tracker.should_generate(entry):
                antibody = _generate_antibody(entry, all_signals)
        else:
            sanitized_entry = candidate

    return QuarantineResult(
        entry_hash=content_hash,
        is_clean=is_clean,
        threat_level=threat_level,
        signals=all_signals,
        sanitized_entry=sanitized_entry,
        antibody=antibody,
    )


def _sanitize_entry(entry: dict, signals: list[ThreatSignal]) -> dict:
    """Attempt to sanitize a suspicious-but-not-hostile entry.

    Only called for SUSPICIOUS level — entries with minor structural
    issues that can be fixed automatically.
    """
    sanitized = dict(entry)

    # Truncate overlength fields
    if len(sanitized.get("title", "")) > MAX_TITLE_LEN:
        sanitized["title"] = sanitized["title"][:MAX_TITLE_LEN]

    if len(sanitized.get("content", "")) > MAX_CONTENT_LEN:
        sanitized["content"] = sanitized["content"][:MAX_CONTENT_LEN]

    # Clean tags
    metadata = dict(sanitized.get("metadata", {}))
    tags = metadata.get("tags", [])
    if len(tags) > MAX_TAGS:
        tags = tags[:MAX_TAGS]
    tags = [re.sub(r"[^a-zA-Z0-9\-]", "", t)[:MAX_TAG_LEN] for t in tags]
    metadata["tags"] = [t for t in tags if t]
    sanitized["metadata"] = metadata

    # Strip control characters from text fields
    for field_name in ("title", "content"):
        if field_name in sanitized:
            sanitized[field_name] = re.sub(
                r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "",
                sanitized[field_name],
            )

    # Mark as sanitized
    metadata["sanitized"] = True
    metadata["original_signals"] = len(signals)

    return sanitized


def batch_quarantine(entries: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    """Process a batch of entries through quarantine.

    Antibody generation is rate-limited across the entire batch to prevent
    write amplification attacks (v4: Vuln 4.4).

    Returns:
        Tuple of (clean_entries, sanitized_entries, antibodies)
        - clean_entries: Safe to write to Brain as-is
        - sanitized_entries: Were suspicious but have been cleaned
        - antibodies: FAILURE entries generated from detected attacks
    """
    clean = []
    sanitized = []
    antibodies = []

    for entry in entries:
        result = quarantine(entry)

        if result.should_admit:
            clean.append(entry)
        elif result.sanitized_entry:
            sanitized.append(result.sanitized_entry)
        if result.antibody:
            antibodies.append(result.antibody)

    return clean, sanitized, antibodies
