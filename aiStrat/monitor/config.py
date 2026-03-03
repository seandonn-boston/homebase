"""Configuration for the AI Landscape Monitor.

PURPOSE: Feed the Brain with intelligence the Admiral needs to deploy and
maintain best-in-class fleets. Every entry here exists to answer a specific
question the Admiral faces when configuring agents for a codebase.

The Admiral needs to know:
  1. MODEL CAPABILITIES — What can each model do? What changed? Which tier
     (Flagship/Workhorse/Utility/Economy) should each agent role use?
  2. AGENT PATTERNS — How do the best tools configure their agents? What
     prompt anatomy, instruction design, and tool use patterns work?
  3. SDLC WORKFLOWS — What working examples exist of LLM-assisted code
     review, test generation, refactoring, deployment? What MCP servers
     exist for dev workflows?
  4. GOVERNANCE — How do others detect drift, hallucination, loops, context
     degradation? What enforcement patterns exist beyond instructions?

The monitor continuously scans for this intelligence and produces seed
candidates (CONTEXT, PATTERN, LESSON entries) for Brain ingestion.
"""

from __future__ import annotations

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. MODEL INTELLIGENCE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Admiral question: "Which model should this agent use?"
#
# Track every major provider's SDK/model repo. When a release happens,
# fetch official docs so the Brain knows: capabilities, context window,
# pricing, tool use support, speed — the data needed for model tier
# assignment (Flagship, Workhorse, Utility, Economy).

MODEL_PROVIDERS: list[dict] = [
    # ── Anthropic / Claude (our primary fleet model) ──
    {
        "repo": "anthropics/anthropic-sdk-python",
        "track": ["releases"],
        "tags": ["anthropic", "claude", "model-intelligence"],
        "content_urls": [
            "https://docs.anthropic.com/en/docs/about-claude/models",
        ],
        "admiral_question": "What Claude models are available and what are their capabilities?",
    },

    # ── OpenAI / GPT (competitor intelligence + Copilot models) ──
    {
        "repo": "openai/openai-python",
        "track": ["releases"],
        "tags": ["openai", "gpt", "model-intelligence"],
        "content_urls": [
            "https://platform.openai.com/docs/models",
        ],
        "admiral_question": "What OpenAI models exist and how do they compare for agent roles?",
    },

    # ── Google / Gemini ──
    {
        "repo": "google/generative-ai-python",
        "track": ["releases"],
        "tags": ["google", "gemini", "model-intelligence"],
        "content_urls": [
            "https://ai.google.dev/gemini-api/docs/models",
        ],
        "admiral_question": "What Gemini models are available for fleet agent roles?",
    },

    # ── Meta / Llama (open-weight alternative for Economy tier) ──
    {
        "repo": "meta-llama/llama-models",
        "track": ["releases"],
        "tags": ["meta", "llama", "model-intelligence", "open-weight"],
        "content_urls": [],
        "admiral_question": "What open-weight models could serve as Economy tier agents?",
    },

    # ── Mistral (open-weight + commercial) ──
    {
        "repo": "mistralai/mistral-common",
        "track": ["releases"],
        "tags": ["mistral", "model-intelligence", "open-weight"],
        "content_urls": [
            "https://docs.mistral.ai/getting-started/models/models_overview/",
        ],
        "admiral_question": "What Mistral models are available for Workhorse/Utility roles?",
    },

    # ── DeepSeek (cost-effective coding models) ──
    {
        "repo": "deepseek-ai/DeepSeek-V3",
        "track": ["releases", "activity"],
        "tags": ["deepseek", "model-intelligence", "coding"],
        "content_urls": [],
        "admiral_question": "Is DeepSeek viable for coding-focused Utility/Economy agents?",
    },

    # ── Hugging Face (model ecosystem, new releases) ──
    {
        "repo": "huggingface/transformers",
        "track": ["releases"],
        "tags": ["huggingface", "model-intelligence", "ecosystem"],
        "content_urls": [
            "https://huggingface.co/blog",
        ],
        "admiral_question": "What new models are available on the Hub for fleet use?",
    },
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. AGENT PATTERN EXEMPLARS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Admiral question: "How should I configure this agent's prompt,
# instructions, tool use, and authority boundaries?"
#
# These repos define state-of-the-art agent design. We watch them
# for changes to their agent configurations, prompt patterns, and
# instruction designs. When they update, we extract the patterns.

AGENT_EXEMPLARS: list[dict] = [
    # ── Claude Code (primary reference — our agents are built on this) ──
    {
        "repo": "anthropics/claude-code",
        "track": ["releases", "stars"],
        "tags": ["claude-code", "agent-design", "prompt-anatomy", "primary"],
        "watch_for": ["system prompt changes", "tool definitions", "agent loop design",
                      "context management", "permission model"],
    },
    {
        "repo": "anthropics/anthropic-cookbook",
        "track": ["activity"],
        "tags": ["claude", "patterns", "tool-use", "cookbook"],
        "watch_for": ["tool use patterns", "agent examples", "prompt engineering"],
    },
    {
        "repo": "hesreallyhim/awesome-claude-code",
        "track": ["activity", "stars"],
        "tags": ["claude-code", "ecosystem", "community-patterns"],
        "watch_for": ["community CLAUDE.md examples", "workflow patterns", "MCP integrations"],
    },

    # ── Copilot (competitor — how does GitHub/Microsoft design agent instructions?) ──
    {
        "repo": "github/copilot-docs",
        "track": ["activity"],
        "tags": ["copilot", "agent-design", "instructions", "competitor"],
        "watch_for": ["instruction format", "agent behavior config", "context handling"],
    },

    # ── Coding agents (each has a different agent architecture) ──
    {
        "repo": "paul-gauthier/aider",
        "track": ["releases", "stars"],
        "tags": ["aider", "agent-design", "prompt-anatomy"],
        "watch_for": ["edit format prompts", "model selection logic", "context windowing"],
    },
    {
        "repo": "cline/cline",
        "track": ["releases", "stars"],
        "tags": ["cline", "agent-design", "tool-use"],
        "watch_for": ["system prompt", "tool definitions", "approval flow"],
    },
    {
        "repo": "openai/codex",
        "track": ["releases", "stars"],
        "tags": ["codex", "agent-design", "sandbox"],
        "watch_for": ["agent loop", "sandboxing", "tool use patterns"],
    },
    {
        "repo": "All-Hands-AI/OpenHands",
        "track": ["releases", "stars"],
        "tags": ["openhands", "agent-design", "multi-agent"],
        "watch_for": ["agent delegation", "workspace management", "recovery patterns"],
    },
    {
        "repo": "SWE-agent/SWE-agent",
        "track": ["releases", "stars"],
        "tags": ["swe-agent", "agent-design", "benchmark-leading"],
        "watch_for": ["agent-computer interface", "prompt design", "search/edit patterns"],
    },
    {
        "repo": "CodiumAI/pr-agent",
        "track": ["releases", "stars"],
        "tags": ["pr-agent", "code-review", "sdlc-workflow"],
        "watch_for": ["review prompt design", "diff analysis patterns", "suggestion format"],
    },

    # ── Agent frameworks (orchestration patterns relevant to our Orchestrator) ──
    {
        "repo": "langchain-ai/langgraph",
        "track": ["releases"],
        "tags": ["langgraph", "orchestration", "graph-based"],
        "watch_for": ["agent state machines", "routing patterns", "checkpointing"],
    },
    {
        "repo": "openai/openai-agents-python",
        "track": ["releases"],
        "tags": ["openai-agents", "handoff", "orchestration"],
        "watch_for": ["handoff protocol", "agent composition", "guardrails"],
    },
    {
        "repo": "crewAIInc/crewAI",
        "track": ["releases"],
        "tags": ["crewai", "multi-agent", "orchestration"],
        "watch_for": ["role-based agents", "task delegation", "crew composition"],
    },
    {
        "repo": "pydantic/pydantic-ai",
        "track": ["releases"],
        "tags": ["pydantic-ai", "structured-output", "agent-framework"],
        "watch_for": ["structured agent output", "dependency injection", "tool definitions"],
    },

    # ── MCP (the protocol our fleet uses for tool access) ──
    {
        "repo": "modelcontextprotocol/specification",
        "track": ["releases", "activity"],
        "tags": ["mcp", "protocol", "tool-use", "critical"],
        "watch_for": ["protocol changes", "new capabilities", "security model"],
    },
    {
        "repo": "modelcontextprotocol/python-sdk",
        "track": ["releases"],
        "tags": ["mcp", "sdk", "implementation"],
        "watch_for": ["API changes", "new patterns", "server examples"],
    },

    # ── Prompt engineering (the science behind our prompt anatomy) ──
    {
        "repo": "dair-ai/Prompt-Engineering-Guide",
        "track": ["activity", "stars"],
        "tags": ["prompts", "research", "patterns"],
        "watch_for": ["new techniques", "benchmark results", "system prompt patterns"],
    },
    {
        "repo": "brexhq/prompt-engineering",
        "track": ["activity"],
        "tags": ["prompts", "enterprise", "production-patterns"],
        "watch_for": ["production prompt patterns", "instruction design", "few-shot examples"],
    },

    # ── Benchmarks (how do we know what "best" means?) ──
    {
        "repo": "princeton-nlp/SWE-bench",
        "track": ["releases"],
        "tags": ["benchmark", "evaluation", "quality-bar"],
        "watch_for": ["new evaluation criteria", "leaderboard changes", "agent comparison data"],
    },
]

# Combined list for backward compat
WATCHED_REPOS: list[dict] = MODEL_PROVIDERS + AGENT_EXEMPLARS


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SEARCH QUERIES — Find patterns the Admiral can use
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Each query maps to a specific Admiral need. Not "find interesting
# repos" but "find repos that demonstrate a pattern our fleet should
# learn from."

SEARCH_QUERIES: list[dict] = [
    # ── Agent instruction design (how others write CLAUDE.md / system prompts) ──
    {
        "query": "CLAUDE.md in:path language:markdown",
        "sort": "updated", "min_stars": 200,
        "tags": ["claude-code", "instructions", "agent-config"],
        "admiral_need": "How do production repos structure their CLAUDE.md for Claude Code?",
    },
    {
        "query": "copilot-instructions.md in:path",
        "sort": "updated", "min_stars": 200,
        "tags": ["copilot", "instructions", "agent-config"],
        "admiral_need": "How do production repos configure Copilot agent instructions?",
    },
    {
        "query": ".cursorrules in:path",
        "sort": "updated", "min_stars": 200,
        "tags": ["cursor", "instructions", "agent-config"],
        "admiral_need": "What instruction patterns work in Cursor's agent configuration?",
    },

    # ── Agent architectures for SDLC tasks ──
    {
        "query": "topic:ai-coding-agent language:python",
        "sort": "stars", "min_stars": 500,
        "tags": ["coding-agent", "architecture", "agent-design"],
        "admiral_need": "What agent architectures produce the best coding results?",
    },
    {
        "query": "ai code review agent in:description",
        "sort": "stars", "min_stars": 300,
        "tags": ["code-review", "agent-design", "sdlc-workflow"],
        "admiral_need": "How should we design the fleet's code review agents?",
    },
    {
        "query": "ai test generation agent in:description",
        "sort": "stars", "min_stars": 200,
        "tags": ["testing", "agent-design", "sdlc-workflow"],
        "admiral_need": "How should we design the fleet's test writing agents?",
    },

    # ── MCP servers for developer tools ──
    {
        "query": "topic:mcp-server topic:developer-tools",
        "sort": "stars", "min_stars": 100,
        "tags": ["mcp", "dev-tools", "tool-use"],
        "admiral_need": "What MCP servers should the fleet have access to?",
    },
    {
        "query": "mcp server database in:description",
        "sort": "stars", "min_stars": 100,
        "tags": ["mcp", "database", "tool-use"],
        "admiral_need": "What MCP servers give fleet agents database access?",
    },

    # ── Governance and safety patterns ──
    {
        "query": "llm guardrails agent safety in:description",
        "sort": "stars", "min_stars": 200,
        "tags": ["governance", "guardrails", "safety"],
        "admiral_need": "What guardrail patterns should our governance agents use?",
    },

    # ── Multi-agent orchestration ──
    {
        "query": "multi-agent orchestration framework in:description language:python",
        "sort": "stars", "min_stars": 300,
        "tags": ["orchestration", "multi-agent", "routing"],
        "admiral_need": "What routing and orchestration patterns work for multi-agent fleets?",
    },
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RSS FEEDS — Official provider announcements
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RSS_FEEDS: list[dict] = [
    {
        "url": "https://www.anthropic.com/rss.xml",
        "name": "Anthropic Blog",
        "tags": ["anthropic", "official", "model-intelligence"],
        "keywords": ["claude", "model", "release", "sonnet", "opus", "haiku", "api", "agent"],
    },
    {
        "url": "https://openai.com/blog/rss.xml",
        "name": "OpenAI Blog",
        "tags": ["openai", "official", "model-intelligence"],
        "keywords": ["gpt", "model", "release", "o1", "o3", "codex", "agent", "api"],
    },
    {
        "url": "https://blog.google/technology/ai/rss/",
        "name": "Google AI Blog",
        "tags": ["google", "official", "model-intelligence"],
        "keywords": ["gemini", "model", "release", "agent", "adk", "api"],
    },
    {
        "url": "https://github.blog/feed/",
        "name": "GitHub Blog",
        "tags": ["github", "official", "copilot"],
        "keywords": ["copilot", "agent", "claude", "ai", "coding"],
    },
    {
        "url": "https://mistral.ai/feed/",
        "name": "Mistral Blog",
        "tags": ["mistral", "official", "model-intelligence"],
        "keywords": ["model", "release", "mistral", "agent", "api"],
    },
    {
        "url": "https://ai.meta.com/blog/rss/",
        "name": "Meta AI Blog",
        "tags": ["meta", "official", "model-intelligence"],
        "keywords": ["llama", "model", "release", "open-source", "agent"],
    },
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUALITY SIGNALS — What makes something "best in class"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# The Admiral doesn't want noise. A finding should only reach the
# Brain if it would change how the Admiral configures a fleet.

QUALITY_SIGNALS = {
    # Minimum star count to even consider
    "min_stars": 200,

    # Star velocity — rapid adoption signals community validation
    "star_velocity_threshold": 300,

    # Repos above this are battle-tested, community-validated
    "elite_star_threshold": 5000,

    # Files that signal a repo has real agent configuration patterns
    # (if a repo has these, it's worth deeper inspection)
    "practice_indicators": [
        "CLAUDE.md",                          # Claude Code instructions
        ".github/copilot-instructions.md",    # Copilot agent config
        ".cursorrules",                       # Cursor agent config
        "system_prompt",                      # Custom system prompts
        "agent_config",                       # Agent configuration
        "prompts/",                           # Prompt library
        ".aider.conf.yml",                    # Aider configuration
    ],

    # Keywords that indicate the repo is relevant to fleet design
    # (not just any AI repo — specifically about building/configuring agents)
    "fleet_relevance_keywords": [
        # Agent design
        "agent", "multi-agent", "orchestration", "routing",
        "system prompt", "instruction", "tool use", "function calling",
        # SDLC tasks
        "code review", "test generation", "refactor", "pull request",
        "code generation", "debugging", "deployment",
        # Governance
        "guardrail", "safety", "drift detection", "hallucination",
        # Protocol
        "MCP", "model context protocol",
        # Quality
        "SWE-bench", "evaluation", "benchmark",
    ],
}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MONITOR SETTINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SETTINGS = {
    # How many results to fetch per search query
    "search_results_per_query": 30,

    # How many days back to look for "recent" activity
    "lookback_days": 7,

    # Star velocity threshold
    "star_velocity_threshold": QUALITY_SIGNALS["star_velocity_threshold"],

    # Minimum star count for discovery
    "discovery_min_stars": QUALITY_SIGNALS["min_stars"],

    # Where to write digest files
    "digest_dir": "aiStrat/monitor/digests",

    # Where to write state
    "state_file": "aiStrat/monitor/state.json",

    # Project name for Brain seed entries
    "brain_project": "fleet-admiral",

    # Source session prefix
    "seed_session_prefix": "monitor",
}
