"""Watchlist configuration for the AI landscape monitor.

Edit this file to control what the monitor tracks. Three main sections:

1. WATCHED_REPOS   — Specific repos to track for releases and activity
2. SEARCH_QUERIES  — GitHub search queries to discover new repos
3. RSS_FEEDS       — Blog/news feeds to scan for announcements

The monitor runs these on a schedule and produces digests + seed candidates.
"""

from __future__ import annotations

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WATCHED REPOS — Track releases, stars, and major changes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Each entry: { "repo": "owner/name", "track": [...], "tags": [...] }
#   track options: "releases", "stars", "activity"
#   tags: used to categorize findings in digests and seeds

WATCHED_REPOS: list[dict] = [
    # ── Agent Frameworks ──
    {"repo": "langchain-ai/langchain", "track": ["releases", "stars"], "tags": ["framework", "langchain", "orchestration"]},
    {"repo": "langchain-ai/langgraph", "track": ["releases", "stars"], "tags": ["framework", "langgraph", "orchestration"]},
    {"repo": "crewAIInc/crewAI", "track": ["releases", "stars"], "tags": ["framework", "crewai", "orchestration"]},
    {"repo": "openai/openai-agents-python", "track": ["releases", "stars"], "tags": ["framework", "openai", "agents-sdk"]},
    {"repo": "microsoft/autogen", "track": ["releases", "stars"], "tags": ["framework", "autogen", "microsoft"]},
    {"repo": "google/adk-python", "track": ["releases", "stars"], "tags": ["framework", "google-adk", "google"]},
    {"repo": "pydantic/pydantic-ai", "track": ["releases", "stars"], "tags": ["framework", "pydantic-ai", "orchestration"]},
    {"repo": "huggingface/smolagents", "track": ["releases", "stars"], "tags": ["framework", "smolagents", "huggingface"]},
    {"repo": "All-Hands-AI/OpenHands", "track": ["releases", "stars"], "tags": ["coding-agent", "openhands", "swe-bench"]},
    {"repo": "SWE-agent/SWE-agent", "track": ["releases", "stars"], "tags": ["coding-agent", "swe-agent", "princeton"]},

    # ── Coding Agents & Tools ──
    {"repo": "anthropics/claude-code", "track": ["releases", "stars"], "tags": ["coding-agent", "claude-code", "anthropic"]},
    {"repo": "paul-gauthier/aider", "track": ["releases", "stars"], "tags": ["coding-agent", "aider"]},
    {"repo": "cline/cline", "track": ["releases", "stars"], "tags": ["coding-agent", "cline", "vscode"]},
    {"repo": "openai/codex", "track": ["releases", "stars"], "tags": ["coding-agent", "codex", "openai"]},

    # ── MCP Ecosystem ──
    {"repo": "modelcontextprotocol/specification", "track": ["releases", "activity"], "tags": ["mcp", "protocol", "specification"]},
    {"repo": "modelcontextprotocol/python-sdk", "track": ["releases"], "tags": ["mcp", "sdk", "python"]},
    {"repo": "modelcontextprotocol/typescript-sdk", "track": ["releases"], "tags": ["mcp", "sdk", "typescript"]},

    # ── Orchestration & Infrastructure ──
    {"repo": "ruvnet/claude-flow", "track": ["releases", "stars"], "tags": ["orchestration", "ruflo", "swarm"]},
    {"repo": "awslabs/multi-agent-orchestrator", "track": ["releases", "stars"], "tags": ["orchestration", "aws", "multi-agent"]},
    {"repo": "letta-ai/letta", "track": ["releases", "stars"], "tags": ["memory", "letta", "agents"]},

    # ── Claude Code Ecosystem ──
    {"repo": "anthropics/courses", "track": ["activity"], "tags": ["anthropic", "education", "courses"]},
    {"repo": "hesreallyhim/awesome-claude-code", "track": ["activity", "stars"], "tags": ["claude-code", "ecosystem", "awesome-list"]},
    {"repo": "anthropics/anthropic-cookbook", "track": ["activity"], "tags": ["anthropic", "cookbook", "examples"]},

    # ── Benchmarks & Research ──
    {"repo": "princeton-nlp/SWE-bench", "track": ["releases", "activity"], "tags": ["benchmark", "swe-bench", "evaluation"]},
    {"repo": "SakanaAI/AI-Scientist", "track": ["releases", "stars"], "tags": ["research", "ai-scientist", "autonomy"]},
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# SEARCH QUERIES — Discover new repos trending in the ecosystem
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Each entry: { "query": "...", "sort": "stars|updated", "tags": [...] }
#   query: GitHub search syntax (supports qualifiers like topic:, language:, stars:>N)
#   sort: how to rank results
#   min_stars: minimum star count to surface (filters noise)

SEARCH_QUERIES: list[dict] = [
    # Broad ecosystem scans — find newly popular repos
    {
        "query": "topic:ai-agents language:python",
        "sort": "stars", "min_stars": 500,
        "tags": ["ai-agents", "python", "discovery"],
    },
    {
        "query": "topic:mcp-server",
        "sort": "stars", "min_stars": 200,
        "tags": ["mcp", "server", "discovery"],
    },
    {
        "query": "topic:claude-code",
        "sort": "updated", "min_stars": 100,
        "tags": ["claude-code", "ecosystem", "discovery"],
    },
    {
        "query": "topic:llm-agents",
        "sort": "stars", "min_stars": 500,
        "tags": ["llm-agents", "discovery"],
    },
    {
        "query": "topic:agentic-ai",
        "sort": "stars", "min_stars": 300,
        "tags": ["agentic-ai", "discovery"],
    },
    # Keyword searches for emerging patterns
    {
        "query": "agent orchestration framework in:description language:python",
        "sort": "stars", "min_stars": 200,
        "tags": ["orchestration", "framework", "discovery"],
    },
    {
        "query": "ai coding agent in:description",
        "sort": "stars", "min_stars": 300,
        "tags": ["coding-agent", "discovery"],
    },
    {
        "query": "model context protocol in:description",
        "sort": "stars", "min_stars": 100,
        "tags": ["mcp", "protocol", "discovery"],
    },
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RSS FEEDS — Blogs, announcements, arxiv categories
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# Each entry: { "url": "...", "name": "...", "tags": [...] }
#   Keywords to filter on (empty = all entries from that feed)

RSS_FEEDS: list[dict] = [
    {
        "url": "https://www.anthropic.com/rss.xml",
        "name": "Anthropic Blog",
        "tags": ["anthropic", "official"],
        "keywords": ["claude", "agent", "mcp", "model", "release", "update"],
    },
    {
        "url": "https://openai.com/blog/rss.xml",
        "name": "OpenAI Blog",
        "tags": ["openai", "official"],
        "keywords": ["agent", "codex", "gpt", "model", "release", "api"],
    },
    {
        "url": "https://blog.google/technology/ai/rss/",
        "name": "Google AI Blog",
        "tags": ["google", "official"],
        "keywords": ["gemini", "agent", "model", "release", "adk"],
    },
    {
        "url": "https://github.blog/feed/",
        "name": "GitHub Blog",
        "tags": ["github", "official"],
        "keywords": ["copilot", "agent", "ai", "claude", "codex"],
    },
    {
        "url": "http://export.arxiv.org/rss/cs.AI",
        "name": "arXiv cs.AI",
        "tags": ["arxiv", "research"],
        "keywords": ["agent", "autonomous", "multi-agent", "agentic", "llm"],
    },
]

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MONITOR SETTINGS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SETTINGS = {
    # How many results to fetch per search query
    "search_results_per_query": 30,

    # How many days back to look for "recent" activity
    "lookback_days": 7,

    # Star velocity threshold — repos gaining this many stars/week get flagged
    "star_velocity_threshold": 500,

    # Minimum star count for a repo to appear in discovery results
    "discovery_min_stars": 100,

    # Where to write digest files
    "digest_dir": "aiStrat/monitor/digests",

    # Where to write state (tracks what we've already seen)
    "state_file": "aiStrat/monitor/state.json",

    # Project name for Brain seed entries
    "brain_project": "fleet-admiral",

    # Source session prefix for monitor-generated seeds
    "seed_session_prefix": "monitor",
}
