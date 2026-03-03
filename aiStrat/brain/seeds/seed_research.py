"""Seed the Brain with knowledge extracted from the initial research documents.

Sources:
  - research-llm-agents-feb-2026.md
  - research-top-agent-toolkits-feb-2026.md

Run from the aiStrat/ directory:
  python -m brain.seeds.seed_research
"""

from __future__ import annotations

import sys
import os

# Add aiStrat to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from brain.services.bootstrap import bootstrap

PROJECT = "fleet-admiral"
SOURCE = "initial-research"
SESSION = "seed-feb-2026"


_SEED_TOKEN = "__seed__"  # Internal token for seeding — requires NoAuthProvider or api_keys config


def seed(brain, token: str = _SEED_TOKEN) -> int:
    """Populate the Brain with research findings. Returns entry count."""
    entries = []

    def record(**kwargs):
        return brain.server.brain_record(**kwargs, token=token, provenance="seed")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # PATTERNS — Reusable approaches observed across the ecosystem
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Hooks over instructions for hard constraints",
        content="An instruction in CLAUDE.md saying 'never use rm -rf' can be forgotten under context pressure. A PreToolUse hook that blocks rm -rf fires every single time. Any constraint that must hold with zero exceptions must be a hook, not an instruction. Trail of Bits (elite cybersecurity firm) considers this the foundational principle of reliable agent configuration. The enforcement spectrum: soft guidance (comments, READMEs) → firm guidance (CLAUDE.md, system prompts) → hard enforcement (hooks, CI gates, linters). Source: Trail of Bits claude-code-config, awesome-slash.",
        metadata={"tags": ["enforcement", "hooks", "reliability", "trail-of-bits"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="LLM-Last design principle",
        content="If static analysis, regex, or a shell command can do it, don't ask an LLM. Counter-intuitive but effective: reduces cost, increases speed, improves reliability. The agnix tool (155 rules) catches config errors before they fail silently using pure static analysis. Deterministic tools first, LLM only when judgment is needed. This is the single highest-impact cost and reliability lever. Source: awesome-slash (avifenesh), admiral Section 02.",
        metadata={"tags": ["cost", "reliability", "deterministic", "llm-last"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Progressive disclosure via skills",
        content="Bloated CLAUDE.md causes instruction-ignoring. Official Anthropic recommendation: CLAUDE.md should not exceed 150 lines. Instead of front-loading everything into standing context, use skills (.claude/skills/*.md) that load on-demand when file patterns, keywords, or domain context matches. For each line in CLAUDE.md, ask 'Would removing this cause mistakes?' — if not, it belongs in a skill instead. Source: Anthropic best practices, shanraisshan claude-code-best-practice.",
        metadata={"tags": ["context-engineering", "skills", "claude-md", "progressive-disclosure"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="The boring agents win in production",
        content="Narrow, specialized, deeply integrated agents outperform ambitious generalists in production. The hybrid workflow paradigm: tool specialization > tool consolidation. Many teams now use Claude Code to generate features, then Codex to review before merge. 'The agents that work are the boring ones: narrow, specialized, deeply integrated.' 'AI becomes invisible scaffolding inside the tools people already use.' Source: research-llm-agents key takeaways, CrewAI analysis of 1.7B workflows.",
        metadata={"tags": ["production", "specialization", "architecture", "fleet-composition"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Deterministic backbone with intelligence deployed where it matters",
        content="CrewAI analyzed 1.7 billion agentic workflows and found the winning pattern: 'deterministic backbone with intelligence deployed where it matters.' Most workflow steps should be deterministic (data transformation, routing, validation). LLM intelligence should only be applied at decision points where judgment is genuinely needed. This aligns with LLM-Last and hooks-over-instructions principles. Source: CrewAI (44K+ stars, 5.2M monthly downloads).",
        metadata={"tags": ["architecture", "crewai", "deterministic", "orchestration"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Spec-first workflow for structured development",
        content="Requirements → Design Spec → Task Decomposition → Implementation as automated pipeline. Each phase produces auditable artifacts that feed the next. claude-code-spec-workflow (3.3K stars) automates Kiro-style spec workflow. BMAD method uses 26 specialized persona agents (Analyst, PM, Architect, Scrum Master, PO, Developer, QA) where each phase runs in fresh context. BMAD planning runs ~3 hours before any code — significant investment that pays off with predictable execution. Source: claude-code-spec-workflow, BMAD-AT-CLAUDE, re:cinq comparison.",
        metadata={"tags": ["workflow", "spec-first", "bmad", "structured-development"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Self-healing quality checks close the generation-validation loop",
        content="Tests, type checker, and linting run automatically after agent changes. If they fail, the agent fixes them autonomously — no human intervention for common issues. This closes the loop between generation and validation. The agent is its own QA department. Implementation: PostToolUse hooks detect failures, feed output back to agent, agent fixes, hook re-checks. Source: claude-code-workflows (shinpr), admiral Section 08 self-healing quality loop.",
        metadata={"tags": ["quality", "hooks", "self-healing", "testing"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Session persistence via ledgers, handoffs, and checkpoints",
        content="The biggest practical challenge in agentic coding: maintaining state across context windows and restarts. Solutions observed: ledger files (append-only logs), handoff documents (narrative briefings for next session), git-based state tracking, checkpoint systems. Continuous-Claude-v2 (2.2K stars) pioneered running Claude Code in continuous loops — autonomously creating PRs, waiting for checks, merging. cc-sessions (1.5K stars) solves session persistence — the single biggest UX pain point. Source: Continuous-Claude-v2, cc-sessions.",
        metadata={"tags": ["persistence", "context", "sessions", "handoffs"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Git worktree isolation for parallel multi-agent development",
        content="crystal (2.7K stars) runs multiple Claude Code sessions in parallel git worktrees. Each agent gets a clean copy of the repo and works on different features simultaneously without merge conflicts. Simple concept, powerful execution. This maps directly to the fleet's parallel execution strategy (Section 19) — contract-first parallelism with isolation at the worktree level. Source: crystal.",
        metadata={"tags": ["parallelism", "git", "worktrees", "isolation"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Swarm intelligence with queen-worker topology",
        content="Ruflo (formerly Claude Flow, 5,800+ commits) implements distributed swarm intelligence: agents organize into swarms led by 'queens' that coordinate work, prevent drift, reach consensus even when agents fail. Self-learning neural capabilities — learns from every execution, prevents catastrophic forgetting. 215 MCP tools, 60+ specialized agents. This is the most ambitious open-source orchestration system. Source: Ruflo v3.5.0.",
        metadata={"tags": ["swarm", "orchestration", "ruflo", "queen-worker"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Configuration is the new code — agent configs are first-class artifacts",
        content="CLAUDE.md, .cursorrules, agents.md are as important as source code itself. Should be version-controlled, reviewed, tested, and treated with the same rigor. Analysis of 2,500+ agents.md files shows the best ones cover 6 areas: commands, testing, project structure, code style, git workflow, boundaries. AGENTS.md is becoming a universal standard that works across Copilot, Claude Code, Cursor, Gemini CLI. Source: GitHub blog analysis of 2,500 repos, multiple research findings.",
        metadata={"tags": ["configuration", "claude-md", "agents-md", "standards"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Adversarial multi-model workflow for quality",
        content="Same prompt sent to Claude, OpenAI, DeepSeek — agents critique each other's outputs. 'Adversarial prompting' surfaces the best answers through competition between models. Used in production. This is AI peer review — competition as a quality mechanism. Related: admiral Section 21 (verification levels include adversarial review). Source: InfoWorld multi-agent AI workflows article.",
        metadata={"tags": ["adversarial", "quality", "multi-model", "peer-review"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Meta-agent pattern: agents that build agents",
        content="claude-code-hooks-mastery (disler) introduces the 'meta-agent' — a specialized sub-agent that generates new sub-agents from descriptions. The 'agent that builds agents.' Claude Code Skill Factory (alirezarezvani) is a factory for manufacturing skills, agents, and hooks at scale, with interactive builders (/build skill, /build agent, /build prompt, /build hook). Source: disler, alirezarezvani.",
        metadata={"tags": ["meta-agent", "self-generating", "factory", "automation"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="pattern",
        title="Scheduled agents for automated quality maintenance",
        content="Claude Code Showcase (ChrisWiles) implements scheduled agents running on cron-like cycles: monthly docs sync, weekly code quality reviews, biweekly dependency audits. Combined with GitHub Actions for automatic PR reviews. This maps to event-driven agent patterns in admiral Section 31. Source: ChrisWiles claude-code-showcase.",
        metadata={"tags": ["scheduled", "automation", "ci-cd", "maintenance"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # CONTEXT — Landscape snapshots, market data, model rankings
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    entries.append(record(
        project=PROJECT, category="context",
        title="AI coding agent landscape as of February 2026",
        content="Major autonomous coding agents: Claude Code (Anthropic, 70-90% of Anthropic code), OpenHands (72% SWE-Bench, 65K stars), Devin (Cognition, $500/mo), Cline (58.2K stars, 5M+ installs, native subagents v3.58), Cursor (360K+ paying users, 8.5/10 code quality), Aider (36K stars, repo mapping), GitHub Copilot (15M+ users, Claude+Codex now available), OpenAI Codex App (rewritten in Rust), Google Jules (140K code improvements, Gemini 3), SWE-agent (Princeton). Source: research-llm-agents-feb-2026.md.",
        metadata={"tags": ["landscape", "tools", "coding-agents", "feb-2026"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="context",
        title="MCP and A2A protocols becoming the TCP/IP of agents",
        content="MCP (Model Context Protocol): Open standard by Anthropic (Nov 2024) for AI-to-tool integration — 'USB-C for AI'. Adopted by OpenAI, Google DeepMind. SDKs in Python, TypeScript, C#, Java, Go. Hosted by Linux Foundation. A2A (Agent2Agent Protocol): Open standard by Google (Apr 2025) for agent-to-agent communication. Now at Linux Foundation. Supports API Key, OAuth 2.0, OpenID Connect, mTLS auth. MCP v2.1 security spec covers OAuth, mTLS, Zero Trust. These two protocols are complementary: MCP for tool access, A2A for agent-to-agent. Source: research-llm-agents-feb-2026.md.",
        metadata={"tags": ["mcp", "a2a", "protocols", "standards", "interoperability"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="context",
        title="LLM model rankings for agent work — February 2026",
        content="[UNVERIFIED BENCHMARKS — treat as approximate, not authoritative] Claude Opus 4.6: 1M token context, leads SWE-Bench Verified at ~72.5% (claimed), strongest coder, powers Perplexity Computer orchestration. GPT-5.2 Pro: highest reasoning (~93.2% GPQA Diamond, claimed), perfect AIME 2025. DeepSeek V3.2-Speciale: near-frontier at ~1/30th cost of GPT-5.2 Pro — reshaping cost structure. Gemini 3 Pro: surpasses 2.5 Pro at coding (claimed), stronger agentic workflows. Qwen 3.5: top-10 coding, growing open-source. Source: research-llm-agents-feb-2026.md. NOTE: Model names and benchmark scores sourced from a single research document; verify against official provider announcements before making deployment decisions.",
        metadata={"tags": ["models", "rankings", "performance", "feb-2026"], "speculative": True, "confidence": "unverified-benchmarks", "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="context",
        title="Agentic AI market size and adoption metrics — February 2026",
        content="[PROJECTED/UNVERIFIED STATISTICS — extraordinary claims requiring independent verification] Market: $7.84B in 2025 → projected $52.62B by 2030 (CAGR 46.3%, analyst projection). 40% of enterprise apps will feature AI agents by end of 2026 (Gartner forecast, not observed). 92% of US developers use AI coding tools daily (survey-based). 41% of all code written globally is now AI-generated (extraordinary claim, methodology unclear). 30% of code at Google and Microsoft written by AI (company claims). Anthropic: $1B ARR (Dec 2024) → $14B ARR (Feb 2026, unaudited claim). $30B funding round at $380B valuation (press reports). Enterprise contracts = 80% of revenue (company claim). Source: research-llm-agents-feb-2026.md. NOTE: Market statistics and revenue figures are sourced from press reports and company claims, not audited financials. Use for directional understanding only.",
        metadata={"tags": ["market", "adoption", "statistics", "growth"], "speculative": True, "confidence": "projections-and-claims", "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="context",
        title="Enterprise AI agent deployments at scale — February 2026",
        content="[COMPANY CLAIMS — not independently verified] Spotify 'Honk': best devs haven't written code since Dec 2025, 650+ AI changes/month, ~50% of all updates through AI, 90% engineering time reduction (extraordinary claim from company presentation). Shopify Sidekick: AI-native commerce OS, write access to critical infrastructure. Salesforce + Claude: 96% satisfaction, saving 97 min/week (vendor case study). Sedgwick (insurance): 30%+ claims efficiency (vendor case study). Suzano (manufacturing): 95% query time reduction (vendor case study). Danfoss: 80% order automation (vendor case study). Elanco (pharma): $1.3M avoided impact per site (vendor case study). Source: research-llm-agents-feb-2026.md. NOTE: All metrics sourced from company presentations or vendor case studies, which have inherent selection and publication bias.",
        metadata={"tags": ["enterprise", "production", "deployment", "case-studies"], "speculative": True, "confidence": "vendor-claims", "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="context",
        title="Agent framework landscape — February 2026",
        content="LangChain/LangGraph: 99.6K stars, 27M monthly downloads, industry standard. CrewAI: 44K stars, 5.2M downloads, 'deterministic backbone' finding. OpenAI Agents SDK: 19K stars, 10.3M downloads, multi-agent in ~30 lines. AutoGen/AG2: merged with Semantic Kernel (Microsoft). Google ADK: OpenAPI spec support, GCP integration. Pydantic AI: 25+ providers, MCP+A2A, OpenTelemetry. Smolagents (HuggingFace): code execution bypassing JSON. Dify: visual LLM app platform. n8n: 400+ integrations, now MCP server. Source: research-llm-agents-feb-2026.md.",
        metadata={"tags": ["frameworks", "orchestration", "landscape", "feb-2026"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="context",
        title="Claude Code configuration ecosystem — February 2026",
        content="Major config suites: everything-claude-code (affaan-m, hackathon-tested, AgentShield security scanner), awesome-claude-code-toolkit (rohitg00, 135 agents, 35 skills, 15K via SkillKit), Trail of Bits (security-first, hooks-over-instructions), Claude-Command-Suite (148+ slash commands), Claude Code Showcase (scheduled agents, GitHub Actions). Meta-resources: awesome-claude-code (hesreallyhim — workflow patterns), scriptbyai.com resource list. Cross-tool: AGENTS.md standard works across Copilot, Claude Code, Cursor, Gemini CLI. Source: research-top-agent-toolkits-feb-2026.md.",
        metadata={"tags": ["configuration", "ecosystem", "claude-code", "toolkits"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="context",
        title="MCP server ecosystem — production implementations",
        content="Key MCP servers: GitHub (repo management), Supabase (natural language DB ops), Zapier (7,000+ app actions), Chroma (vector search/contextual memory), n8n (low-code automation bridge), Sequential Thinking (Anthropic official — deliberative reasoning). Perplexity 'Computer': most ambitious multi-model system, coordinating 19 models — Opus 4.6 for orchestration, Gemini for research, GPT-5.2 for long-context, specialized models for image/video. Source: research-llm-agents-feb-2026.md.",
        metadata={"tags": ["mcp", "servers", "ecosystem", "tools"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # LESSONS — Reusable insights extracted from research
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    entries.append(record(
        project=PROJECT, category="lesson",
        title="Context engineering supersedes prompt engineering",
        content="Context engineering is the discipline of designing information flows across an entire agent system — what information exists where, when, and why. It subsumes prompt engineering (which focuses on individual prompts). GitHub's official guidance (Feb 2026) introduces 'agentic primitives' as building blocks and names context engineering as a discipline. The quality of a fleet's output is determined by the quality of its context design, not individual prompt wordsmithing. Source: GitHub blog, admiral Section 04.",
        metadata={"tags": ["context-engineering", "prompt-engineering", "information-flow"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="lesson",
        title="Security is the blind spot of the agent ecosystem",
        content="Memory poisoning: adversaries implant false info into agent long-term storage that persists across all future sessions — unlike prompt injection that ends with the chat. OpenClaw (236K stars): Cisco found third-party skills performing data exfiltration and prompt injection without user awareness. Cline npm publish incident: real-world supply chain attack in agent ecosystem. BodySnatcher & ZombieAgent: agent hijacking vulnerabilities, the 'superuser problem' — autonomous agents with broad permissions creating security blind spots. Agent configs themselves are attack surfaces requiring security scanning (AgentShield). Source: research-llm-agents-feb-2026.md.",
        metadata={"tags": ["security", "memory-poisoning", "supply-chain", "vulnerabilities"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="lesson",
        title="Three-pillar production deployment: planning + observability + orchestration",
        content="BMAD v6 + Langfuse + Claude Code agent teams production case study (nomadically.work). Three pillars: (1) Planning and quality gates (BMAD), (2) Observability (Langfuse), (3) Orchestration (agent teams). Key warnings: Skip BMAD → agents produce code not matching requirements. Skip Langfuse → flying blind on agent behavior. Skip Agent Teams → merge conflicts and coordination failures. All three are needed. Source: vadim.blog production case study.",
        metadata={"tags": ["production", "deployment", "observability", "bmad"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="lesson",
        title="Multi-agent orchestration systems are converging on similar patterns",
        content="Analysis shows Ruflo (Claude Flow V3), Claude Code's TeammateTool, BMAD, and myclaude all share striking architectural similarities. Key convergence: hierarchical orchestration with specialist agents, structured handoffs, deterministic quality gates, session persistence. The swarm pattern (queen-worker topology) is an advanced variant. All systems converge on: central orchestrator, specialist agents with hard scope boundaries, structured handoff formats, and quality verification between steps. Source: kieranklaassen analysis, multiple frameworks.",
        metadata={"tags": ["convergence", "orchestration", "multi-agent", "patterns"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="lesson",
        title="Vibe coding hits a ceiling at enterprise scale",
        content="Aircraft MRO System: 55 entities, 78 API endpoints, 114 UI components, 100K+ lines generated by Claude Code in 20 hours. AI generated ~50-60% of final production code. Honest post-mortem: 'Here's Why Vibe Coding Couldn't' — pure vibe coding breaks down at enterprise complexity. The remaining 40-50% requires human architectural judgment, domain expertise, and integration testing. Lesson: AI accelerates execution but cannot replace architectural planning at scale. Source: anil789 Medium article.",
        metadata={"tags": ["vibe-coding", "enterprise", "limitations", "scale"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="lesson",
        title="AI agents are accelerating scientific discovery at unprecedented rates",
        content="Gene editing: Red Queen Bio + GPT-5 achieved 79x efficiency gain in actual lab experiments. Black hole physics: GPT-5 Pro independently discovered the same new symmetries physicist Alex Lupsasca found — and found an easier path. Math: UCLA mathematician proved convergence theorem with 12 hours of AI collaboration. Climate: Lawrence Berkeley lab reduced wetland methane analysis from 1 week to 5 minutes. AI Scientist-v2: autonomously writes peer-reviewed papers. Science transformation is happening faster than software transformation. Source: research-llm-agents-feb-2026.md.",
        metadata={"tags": ["science", "discovery", "research", "acceleration"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="lesson",
        title="CTF competitions are a solved game for well-engineered AI agents",
        content="Cybersecurity AI (CAI) achieved Rank #1 at multiple prestigious hacking competitions. Captured 41/45 flags at Neurogrid ($50K prize). Sprinted 37% faster than elite human teams at Dragos OT CTF. Authors argue 'Jeopardy-style CTFs have become a solved game for well-engineered AI agents.' Wiz research: agents highly proficient at directed vulnerability exploitation at $1-$10 per success. Implications: AI agents are already superhuman at certain security tasks, both offensive and defensive. Source: CAI arXiv paper, Wiz research.",
        metadata={"tags": ["security", "ctf", "cybersecurity", "capabilities"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="lesson",
        title="Copilot hierarchy enables fine-grained agent scoping",
        content="GitHub Copilot supports hierarchical custom instructions: Personal → Organization → Repository → Path-specific → Skills → AGENTS.md. New 'excludeAgent' property controls which agents see which instructions. 'applyTo' scopes rules to file patterns. This enables different rules for different codebase areas and different agents — relevant to fleet composition where different specialists need different context. Source: GitHub blog, GitHub Copilot changelog.",
        metadata={"tags": ["copilot", "hierarchy", "scoping", "context-engineering"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # DECISIONS — Technology choices and strategic directions
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    entries.append(record(
        project=PROJECT, category="decision",
        title="MCP chosen as universal agent-to-tool protocol",
        content="MCP (Model Context Protocol) selected as the standard for Brain access and all agent-to-tool integration. Rationale: open standard (Anthropic, now Linux Foundation), adopted by OpenAI and Google DeepMind, SDKs in 5+ languages, any agent framework can speak MCP, discovery is built in (agents introspect capabilities), auth is standard (OAuth 2.0, API key). The Brain MCP server makes the database a first-class tool in any agent's toolkit. Alternative considered: custom REST API — rejected because it would require per-framework integration. Source: admiral Sections 14 and 16.",
        metadata={"tags": ["mcp", "protocol", "architecture", "brain"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="decision",
        title="Postgres + pgvector chosen for Brain architecture",
        content="[TARGET ARCHITECTURE — not yet implemented; current implementation is in-memory Python dict] Postgres + pgvector selected as the Brain's TARGET storage layer over alternatives. Rationale: (1) Structured + unstructured in one system (relational tables + JSONB + vector columns), (2) pgvector is the most widely adopted vector extension, (3) ACID guarantees for atomic writes, (4) handles thousands to millions of records without architectural changes, (5) standard SQL for humans + standard drivers for machines + MCP for agents. Alternatives considered: dedicated vector DB (Pinecone/Weaviate) — rejected because it requires a second system for structured data; file-based persistence — insufficient for concurrent multi-agent access. CURRENT STATE: The Brain uses BrainStore (in-memory dict with threading locks). The interface is designed so a Postgres adapter can be swapped in without changing callers. Source: admiral Section 15.",
        metadata={"tags": ["postgres", "pgvector", "database", "brain", "architecture"], "speculative": True, "confidence": "aspirational-not-implemented", "source_doc": "admiral/part5-brain.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="decision",
        title="Four-tier model selection strategy for fleet economics",
        content="[SOME MODEL NAMES MAY BE SPECULATIVE] Fleet uses four model tiers to optimize cost vs. capability: Tier 1 (Flagship): Claude Opus 4.6, GPT-5.2 Pro — for orchestration, architecture, complex reasoning. Tier 2 (Workhorse): Claude Sonnet 4.6 — for implementation, code generation, routine analysis. Tier 3 (Utility): Claude Haiku 4.5, GPT-5.2 Mini — for embedding generation, simple classification, formatting. Tier 4 (Economy): DeepSeek V3.2 — near-frontier at 1/30th cost, suitable for high-volume low-stakes tasks. Key insight from research: DeepSeek V3.2-Speciale is 'reshaping the industry's cost structure.' Source: admiral Section 13, research-llm-agents. NOTE: Some model names (GPT-5.2 Pro, DeepSeek V3.2-Speciale, GPT-5.2 Mini) and pricing ratios sourced from a single research document. Verify model availability and pricing against official provider pages before deployment.",
        metadata={"tags": ["models", "tiers", "cost", "economics"], "speculative": True, "confidence": "some-model-names-unverified", "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # FAILURES — Documented failure modes from the research
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    entries.append(record(
        project=PROJECT, category="failure",
        title="Memory poisoning persists across all future sessions",
        content="Unlike prompt injection that ends with the chat, poisoned memory persists indefinitely. Adversaries implant false information into agent long-term storage (Brain, persistent files, checkpoint systems) that corrupts all future agent behavior. This is a novel attack vector specific to agents with long-term memory. Defense: write access control (only validated agents write), Admiral review of cross-project entries, supersession chains for correcting false entries. Source: research-llm-agents-feb-2026.md, admiral Section 10.",
        metadata={"tags": ["security", "memory-poisoning", "attack-vector", "brain"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="failure",
        title="Agent supply chain attacks via third-party skills and plugins",
        content="OpenClaw (236K stars): Cisco discovered third-party skills performing data exfiltration and prompt injection without user awareness. Cline npm publish incident (Feb 2026): real-world supply chain attack in agent ecosystem — cited as strong example of agentic threat landscape. Agent configurations, skills, and MCP servers are attack surfaces. Defense: AgentShield-style security scanning of all configs, auditing MCP server permissions, version-pinning dependencies. Source: research-llm-agents-feb-2026.md.",
        metadata={"tags": ["security", "supply-chain", "skills", "plugins", "attack"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="failure",
        title="Bloated CLAUDE.md causes instruction-ignoring under context pressure",
        content="Official Anthropic finding: bloated instruction files cause agents to ignore instructions, especially under context pressure in long sessions. CLAUDE.md should not exceed 150 lines. For each line, ask 'Would removing this cause mistakes?' Common failure: configuration accretion — instruction files grow line-by-line after each incident until agents ignore the bloated rules entirely. Defense: progressive disclosure via skills, aggressive pruning, treating CLAUDE.md like production code with review process. Source: Anthropic best practices, admiral Section 23.",
        metadata={"tags": ["claude-md", "context-pressure", "instruction-decay", "configuration"], "source_doc": "research-top-agent-toolkits-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="failure",
        title="Superuser problem: autonomous agents with broad permissions create security blind spots",
        content="BodySnatcher & ZombieAgent vulnerabilities in ServiceNow demonstrate the 'superuser problem': autonomous agents given broad permissions to accomplish tasks create security blind spots that traditional access controls don't address. Agent hijacking allows attackers to use the agent's legitimate permissions for malicious purposes. The agent appears to behave normally from the outside. Defense: principle of least privilege, negative tool lists (explicit 'does NOT have access to'), decision authority tiers, and configuration security auditing. Source: research-llm-agents-feb-2026.md.",
        metadata={"tags": ["security", "permissions", "superuser", "hijacking"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    entries.append(record(
        project=PROJECT, category="failure",
        title="'Agents of Chaos' — documented real agent failures in production",
        content="arXiv study (Feb 2026) documents real agent failures: data leaks, destructive actions, identity spoofing. Critical safety research. Essential reading for anyone deploying agents in production. Key finding: agents fail in systematic, predictable ways that can be cataloged and defended against (maps to admiral Section 23 — Known Agent Failure Modes with 20 cataloged failure modes). The MIT EnCompass framework (Feb 2026) addresses this with automatic backtracking on LLM mistakes and searching over different possible agent paths. Source: 'Agents of Chaos' arXiv paper, MIT EnCompass.",
        metadata={"tags": ["failures", "safety", "production", "research"], "source_doc": "research-llm-agents-feb-2026.md"},
        source_agent="seed", source_session=SESSION,
    ))

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Print summary
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    return len(entries)


def main() -> None:
    from brain.mcp.auth import Scope

    seed_token = "seed-admin-key"
    brain = bootstrap(
        api_keys={seed_token: ("seed-loader", Scope.ADMIN)},
        strict_mode=False,
    )
    count = seed(brain, token=seed_token)

    # Print status
    status = brain.server.brain_status()
    print(f"Brain seeded with {count} entries from initial research.")
    print(f"  By category: {status['by_category']}")
    print(f"  Total entries: {status['total_entries']}")

    # Verify retrieval works
    results = brain.server.brain_query(
        query="What patterns work best for production agent deployments?",
        token=seed_token,
        min_score=0.0,
        limit=3,
    )
    print(f"\nSample query: 'What patterns work best for production agent deployments?'")
    for r in results:
        print(f"  [{r['category']}] {r['title']} (score: {r['score']})")


if __name__ == "__main__":
    main()
