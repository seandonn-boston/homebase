"""Configuration for the AI Landscape Monitor.

Two scanning missions:

1. MODEL RELEASES — Track every major LLM provider. When a new model ships,
   capture the release notes, blog post, and docs so the Brain has full
   context on capabilities, API changes, and pricing shifts.

2. SDLC BEST PRACTICES — Daily scan for the best examples of LLMs used in
   software development. We want state-of-the-art agent configurations,
   prompt patterns, and instruction designs — especially from Claude Code
   and Copilot ecosystems — to distill into reusable patterns for the fleet.
"""

from __future__ import annotations

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. MODEL RELEASE TRACKING
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Every major LLM provider. Track their release repos for new model
# announcements. The "content_urls" field lists official blogs/docs
# that should be fetched when a new release is detected.

MODEL_PROVIDERS: list[dict] = [
    # ── Anthropic / Claude ──
    {
        "repo": "anthropics/anthropic-sdk-python",
        "track": ["releases"],
        "tags": ["anthropic", "claude", "sdk", "model-release"],
        "content_urls": [
            "https://docs.anthropic.com/en/docs/about-claude/models",
            "https://www.anthropic.com/news",
        ],
    },
    {
        "repo": "anthropics/courses",
        "track": ["activity"],
        "tags": ["anthropic", "claude", "education"],
        "content_urls": [],
    },

    # ── OpenAI / GPT ──
    {
        "repo": "openai/openai-python",
        "track": ["releases"],
        "tags": ["openai", "gpt", "sdk", "model-release"],
        "content_urls": [
            "https://platform.openai.com/docs/models",
        ],
    },

    # ── Google / Gemini ──
    {
        "repo": "google/generative-ai-python",
        "track": ["releases"],
        "tags": ["google", "gemini", "sdk", "model-release"],
        "content_urls": [
            "https://ai.google.dev/gemini-api/docs/models",
        ],
    },

    # ── Meta / Llama ──
    {
        "repo": "meta-llama/llama-models",
        "track": ["releases"],
        "tags": ["meta", "llama", "model-release"],
        "content_urls": [
            "https://ai.meta.com/blog/",
        ],
    },

    # ── Mistral ──
    {
        "repo": "mistralai/mistral-common",
        "track": ["releases"],
        "tags": ["mistral", "model-release"],
        "content_urls": [
            "https://docs.mistral.ai/getting-started/models/models_overview/",
        ],
    },
    {
        "repo": "mistralai/client-python",
        "track": ["releases"],
        "tags": ["mistral", "sdk", "model-release"],
        "content_urls": [],
    },

    # ── Cohere ──
    {
        "repo": "cohere-ai/cohere-python",
        "track": ["releases"],
        "tags": ["cohere", "command", "sdk", "model-release"],
        "content_urls": [],
    },

    # ── xAI / Grok ──
    {
        "repo": "xai-org/grok-1",
        "track": ["releases", "activity"],
        "tags": ["xai", "grok", "model-release"],
        "content_urls": [],
    },

    # ── DeepSeek ──
    {
        "repo": "deepseek-ai/DeepSeek-V3",
        "track": ["releases", "activity"],
        "tags": ["deepseek", "model-release"],
        "content_urls": [],
    },

    # ── Hugging Face (model hub releases) ──
    {
        "repo": "huggingface/transformers",
        "track": ["releases"],
        "tags": ["huggingface", "transformers", "model-release"],
        "content_urls": [
            "https://huggingface.co/blog",
        ],
    },
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. SDLC BEST PRACTICES — Exemplar repos to watch closely
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# These are the repos that define state-of-the-art LLM usage for
# software development. We watch for how they configure agents,
# structure prompts, handle tool use, and manage the SDLC.

SDLC_EXEMPLARS: list[dict] = [
    # ── Claude Code ecosystem (primary focus) ──
    {"repo": "anthropics/claude-code", "track": ["releases", "stars"], "tags": ["claude-code", "agent", "sdlc", "primary"]},
    {"repo": "anthropics/anthropic-cookbook", "track": ["activity"], "tags": ["claude", "patterns", "cookbook"]},
    {"repo": "hesreallyhim/awesome-claude-code", "track": ["activity", "stars"], "tags": ["claude-code", "ecosystem", "curated"]},

    # ── GitHub Copilot ecosystem ──
    {"repo": "github/copilot.vim", "track": ["releases"], "tags": ["copilot", "agent", "sdlc"]},
    {"repo": "github/copilot-docs", "track": ["activity"], "tags": ["copilot", "docs", "patterns"]},

    # ── Coding agents (competitors & inspirations) ──
    {"repo": "paul-gauthier/aider", "track": ["releases", "stars"], "tags": ["aider", "coding-agent", "sdlc"]},
    {"repo": "cline/cline", "track": ["releases", "stars"], "tags": ["cline", "coding-agent", "vscode"]},
    {"repo": "openai/codex", "track": ["releases", "stars"], "tags": ["codex", "coding-agent", "openai"]},
    {"repo": "All-Hands-AI/OpenHands", "track": ["releases", "stars"], "tags": ["openhands", "coding-agent", "sdlc"]},
    {"repo": "SWE-agent/SWE-agent", "track": ["releases", "stars"], "tags": ["swe-agent", "coding-agent", "sdlc"]},
    {"repo": "CodiumAI/pr-agent", "track": ["releases", "stars"], "tags": ["pr-agent", "code-review", "sdlc"]},
    {"repo": "Pythagora-io/gpt-pilot", "track": ["releases", "stars"], "tags": ["gpt-pilot", "coding-agent", "sdlc"]},
    {"repo": "stitionai/devika", "track": ["releases", "stars"], "tags": ["devika", "coding-agent", "sdlc"]},

    # ── Agent frameworks used for SDLC ──
    {"repo": "langchain-ai/langgraph", "track": ["releases"], "tags": ["langgraph", "orchestration", "agent-framework"]},
    {"repo": "openai/openai-agents-python", "track": ["releases"], "tags": ["openai-agents", "agent-framework"]},
    {"repo": "pydantic/pydantic-ai", "track": ["releases"], "tags": ["pydantic-ai", "agent-framework"]},
    {"repo": "crewAIInc/crewAI", "track": ["releases"], "tags": ["crewai", "agent-framework"]},

    # ── MCP (tool use protocol — critical for agent design) ──
    {"repo": "modelcontextprotocol/specification", "track": ["releases", "activity"], "tags": ["mcp", "protocol", "tool-use"]},
    {"repo": "modelcontextprotocol/python-sdk", "track": ["releases"], "tags": ["mcp", "sdk", "python"]},
    {"repo": "modelcontextprotocol/typescript-sdk", "track": ["releases"], "tags": ["mcp", "sdk", "typescript"]},

    # ── Prompt engineering & instruction design ──
    {"repo": "dair-ai/Prompt-Engineering-Guide", "track": ["activity", "stars"], "tags": ["prompts", "guide", "patterns"]},
    {"repo": "brexhq/prompt-engineering", "track": ["activity"], "tags": ["prompts", "enterprise", "patterns"]},

    # ── Benchmarks (to evaluate quality of practices) ──
    {"repo": "princeton-nlp/SWE-bench", "track": ["releases"], "tags": ["benchmark", "swe-bench", "evaluation"]},
]

# Combined list for backward-compat with scanner release checking
WATCHED_REPOS: list[dict] = MODEL_PROVIDERS + SDLC_EXEMPLARS


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SEARCH QUERIES — Find best-in-class SDLC practices daily
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Focused on: How do the best repos use LLMs in their development
# workflow? What agent configurations, prompts, and instructions
# produce the best results?

SEARCH_QUERIES: list[dict] = [
    # ── Claude Code usage patterns ──
    {
        "query": "CLAUDE.md in:path language:markdown",
        "sort": "updated", "min_stars": 200,
        "tags": ["claude-code", "instructions", "sdlc-practice"],
    },
    {
        "query": "claude-code agent in:readme stars:>500",
        "sort": "stars", "min_stars": 500,
        "tags": ["claude-code", "agent-config", "sdlc-practice"],
    },

    # ── Copilot usage patterns ──
    {
        "query": "copilot-instructions.md in:path",
        "sort": "updated", "min_stars": 200,
        "tags": ["copilot", "instructions", "sdlc-practice"],
    },
    {
        "query": "github copilot agent in:readme stars:>300",
        "sort": "stars", "min_stars": 300,
        "tags": ["copilot", "agent-config", "sdlc-practice"],
    },

    # ── General LLM-assisted SDLC ──
    {
        "query": "topic:ai-coding-agent language:python",
        "sort": "stars", "min_stars": 500,
        "tags": ["coding-agent", "python", "sdlc-practice"],
    },
    {
        "query": "agentic software development in:description",
        "sort": "stars", "min_stars": 300,
        "tags": ["agentic", "sdlc", "sdlc-practice"],
    },
    {
        "query": "llm software engineering workflow in:readme",
        "sort": "stars", "min_stars": 200,
        "tags": ["llm-sdlc", "workflow", "sdlc-practice"],
    },

    # ── Prompt & instruction patterns for dev tools ──
    {
        "query": "system prompt coding assistant in:readme",
        "sort": "stars", "min_stars": 300,
        "tags": ["prompts", "system-prompt", "sdlc-practice"],
    },
    {
        "query": "topic:prompt-engineering topic:software-development",
        "sort": "stars", "min_stars": 200,
        "tags": ["prompts", "sdlc", "sdlc-practice"],
    },

    # ── MCP servers for dev workflows ──
    {
        "query": "topic:mcp-server topic:developer-tools",
        "sort": "stars", "min_stars": 100,
        "tags": ["mcp", "dev-tools", "sdlc-practice"],
    },
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RSS FEEDS — Official provider announcements
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# When a model provider publishes a blog post about a new model,
# we want to capture the full content for Brain ingestion.

RSS_FEEDS: list[dict] = [
    {
        "url": "https://www.anthropic.com/rss.xml",
        "name": "Anthropic Blog",
        "tags": ["anthropic", "official", "model-release"],
        "keywords": ["claude", "model", "release", "sonnet", "opus", "haiku", "api"],
    },
    {
        "url": "https://openai.com/blog/rss.xml",
        "name": "OpenAI Blog",
        "tags": ["openai", "official", "model-release"],
        "keywords": ["gpt", "model", "release", "o1", "o3", "codex", "agent", "api"],
    },
    {
        "url": "https://blog.google/technology/ai/rss/",
        "name": "Google AI Blog",
        "tags": ["google", "official", "model-release"],
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
        "tags": ["mistral", "official", "model-release"],
        "keywords": ["model", "release", "mistral", "agent", "api"],
    },
    {
        "url": "https://ai.meta.com/blog/rss/",
        "name": "Meta AI Blog",
        "tags": ["meta", "official", "model-release"],
        "keywords": ["llama", "model", "release", "open-source", "agent"],
    },
]


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# QUALITY SIGNALS — How we distinguish "best in class"
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Not every repo with stars is worth learning from.
# These criteria filter for repos that demonstrate real,
# working, state-of-the-art practices.

QUALITY_SIGNALS = {
    # Minimum star count to even consider (filters toy projects)
    "min_stars": 200,

    # Star velocity — rapid adoption signals the community validates it
    "star_velocity_threshold": 300,

    # Repos above this are automatically high-priority
    "elite_star_threshold": 5000,

    # Files that signal a repo has real agent/prompt practices
    # (used to prioritize repos for deeper inspection)
    "practice_indicators": [
        "CLAUDE.md",
        ".github/copilot-instructions.md",
        "system_prompt",
        "agent_config",
        "prompts/",
        ".cursorrules",
        "aider.conf",
    ],

    # Keywords in README that signal SDLC-relevant content
    "sdlc_keywords": [
        "agent", "prompt", "instruction", "system prompt",
        "tool use", "function calling", "code review",
        "test generation", "code generation", "refactor",
        "pull request", "commit", "CI/CD", "workflow",
        "MCP", "model context protocol",
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

    # Star velocity threshold — repos gaining this many stars/week get flagged
    "star_velocity_threshold": QUALITY_SIGNALS["star_velocity_threshold"],

    # Minimum star count for a repo to appear in discovery results
    "discovery_min_stars": QUALITY_SIGNALS["min_stars"],

    # Where to write digest files
    "digest_dir": "aiStrat/monitor/digests",

    # Where to write state (tracks what we've already seen)
    "state_file": "aiStrat/monitor/state.json",

    # Project name for Brain seed entries
    "brain_project": "fleet-admiral",

    # Source session prefix for monitor-generated seeds
    "seed_session_prefix": "monitor",
}
