# Top Uses of AI Agent Tools: Full Suites, Workflows, Configurations & Production Setups — February 2026

A comprehensive research dossier of the most impressive configurations, prompt libraries, workflow templates, CLAUDE.md files, .cursorrules, agent orchestration setups, hooks, skills, slash commands, and production pipelines across the AI coding ecosystem. Evaluated on **ingenuity, effectiveness, integrity, security, creativity, and impressiveness**.

---

## CATEGORY 1: Claude Code Full Configuration Suites

### 1. everything-claude-code (affaan-m)
- **What:** Complete Claude Code configuration collection — 13 agents, 48 skills, 32 commands, hooks, rules, MCPs
- **Why chosen:** Battle-tested at the Claude Code Hackathon (Cerebral Valley x Anthropic, Feb 2026). 1,282 tests, 98% coverage, 102 static analysis rules. Includes **AgentShield** — a security scanner that audits CLAUDE.md, settings.json, MCP configs, hooks, agent definitions, and skills for vulnerabilities, misconfigurations, and injection risks. The `--opus` flag runs three Claude Opus 4.6 agents in a red-team/blue-team/auditor pipeline.
- **What sets it apart:** The only config suite with built-in security scanning and adversarial red-team testing of your own agent setup.
- [github.com/affaan-m/everything-claude-code](https://github.com/affaan-m/everything-claude-code)

### 2. awesome-claude-code-toolkit (rohitg00)
- **What:** 135 agents, 35 curated skills (+15,000 via SkillKit), 42 commands, 120 plugins, 19 hooks, 15 rules, 7 templates, 6 MCP configs
- **Why chosen:** Sheer scale — the most comprehensive single toolkit for Claude Code. 19 hook scripts cover all 8 Claude Code lifecycle events. Includes an onboarding command that bootstraps new developers into any codebase.
- **What sets it apart:** Breadth. No other single repo packages this many production-ready components together.
- [github.com/rohitg00/awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit)

### 3. Trail of Bits claude-code-config
- **What:** Opinionated defaults, documentation, and workflows from an elite cybersecurity firm
- **Why chosen:** Written by security professionals who audit code for a living. Development philosophy: no speculative features, no premature abstraction, replace don't deprecate. Code quality hard limits on function length, complexity, line width. Critical insight: "An instruction in CLAUDE.md saying 'never use rm -rf' can be forgotten. A PreToolUse hook that blocks rm -rf fires every single time."
- **What sets it apart:** Security-first mindset from the world's top code auditing firm. Hooks over instructions philosophy.
- [github.com/trailofbits/claude-code-config](https://github.com/trailofbits/claude-code-config)

### 4. Claude-Command-Suite (qdhenry)
- **What:** 148+ slash commands, 54 AI agents, Claude Code Skills, and automated workflows
- **Why chosen:** Covers code review, testing, deployment, business scenario modeling, and GitHub-Linear synchronization through structured, repeatable workflows. Professional-grade structured workflows for security auditing and architectural analysis.
- **What sets it apart:** 148+ slash commands — the largest single command library. Business scenario modeling alongside technical workflows.
- [github.com/qdhenry/Claude-Command-Suite](https://github.com/qdhenry/Claude-Command-Suite)

### 5. Claude Code Showcase (ChrisWiles)
- **What:** Comprehensive project configuration example with hooks, skills, agents, commands, and GitHub Actions workflows
- **Why chosen:** Includes a code review agent following detailed checklists (TypeScript strict mode, error handling, loading states, mutation patterns). GitHub Action for automatic PR reviews. Scheduled agents: monthly docs sync, weekly code quality reviews, biweekly dependency audits. JIRA/Linear integration via MCP servers — Claude reads tickets, implements features, updates status.
- **What sets it apart:** The scheduled agent pattern — automated quality maintenance running on cron-like cycles.
- [github.com/ChrisWiles/claude-code-showcase](https://github.com/ChrisWiles/claude-code-showcase)

### 6. Claude Code Best Practice (shanraisshan)
- **What:** Concise best practice guide for CLAUDE.md, skills, agents, hooks, memory, rules, MCP servers, plugins
- **Why chosen:** Key insight: CLAUDE.md should not exceed 150 lines. Recommends feature-specific subagents with skills (progressive disclosure) instead of general QA or backend engineer agents.
- **What sets it apart:** Emphasis on constraint — knowing what NOT to put in CLAUDE.md is as important as what to include.
- [github.com/shanraisshan/claude-code-best-practice](https://github.com/shanraisshan/claude-code-best-practice)

### 7. Claude Code Team Collaboration Guide (jsnkle)
- **What:** Ready-to-use templates with full `.claude/` directory structures for team collaboration
- **Why chosen:** Complete templates including CLAUDE.md, settings.json, rules for code-style/git-workflow/testing, commands, agents, skills. Framework-specific templates (React). Designed for small team deployment — the gap most other resources miss.
- **What sets it apart:** Team-first design. Most configs are solo-developer focused; this addresses multi-developer coordination.
- [github.com/jsnkle/Claude-Code-Team-Collaboration-Guide](https://github.com/jsnkle/Claude-Code-Team-Collaboration-Guide)

### 8. Claude Code Skill Factory (alirezarezvani)
- **What:** Toolkit for building and deploying production-ready Claude Skills, Agents, Slash Commands, and Prompts at scale
- **Why chosen:** Interactive builders (`/build skill`, `/build agent`, `/build prompt`, `/build hook`). Hook factory supporting 7 event types. Meta-tooling — it builds the builders.
- **What sets it apart:** A factory, not a library. Instead of pre-built skills, it gives you tools to manufacture your own at scale.
- [github.com/alirezarezvani/claude-code-skill-factory](https://github.com/alirezarezvani/claude-code-skill-factory)

### 9. Claude-Code-Everything-You-Need-to-Know (wesammustafa)
- **What:** Ultimate all-in-one guide: setup, prompt engineering, commands, hooks, workflows, automation, MCP servers, BMAD method
- **Why chosen:** Documents 2026-specific features: interactive `/hooks` command, new `TaskCompleted` hook event, hooks returning `updatedInput` to modify tool parameters. Living documentation tracking bleeding-edge features.
- **What sets it apart:** Living documentation that tracks features as they ship — always current.
- [github.com/wesammustafa/Claude-Code-Everything-You-Need-to-Know](https://github.com/wesammustafa/Claude-Code-Everything-You-Need-to-Know)

### 10. Claude Code Hooks Mastery (disler)
- **What:** Deterministic and non-deterministic control over Claude Code via hooks, sub-agents, and the meta-agent
- **Why chosen:** Introduces the "meta-agent" — a specialized sub-agent that generates new sub-agents from descriptions. The "agent that builds agents." UV single-file scripts keep hook logic cleanly separated.
- **What sets it apart:** The meta-agent pattern — self-generating agent infrastructure.
- [github.com/disler/claude-code-hooks-mastery](https://github.com/disler/claude-code-hooks-mastery)

---

## CATEGORY 2: Multi-Agent Orchestration Systems

### 11. Ruflo (formerly Claude Flow) (ruvnet)
- **What:** Enterprise AI agent orchestration — 60+ specialized agents, distributed swarm intelligence, 215 MCP tools
- **Why chosen:** 5,800+ commits, 55 alpha iterations, now production-ready v3.5.0. Agents organize into swarms led by "queens" that coordinate work, prevent drift, reach consensus even when agents fail. Self-learning neural capabilities — learns from every execution, prevents catastrophic forgetting.
- **What sets it apart:** Swarm intelligence with queen-worker topology and self-learning — the most ambitious open-source orchestration system.
- [github.com/ruvnet/ruflo](https://github.com/ruvnet/ruflo)

### 12. Continuous-Claude-v2 (2.2K stars)
- **What:** Context management for Claude Code with hooks maintaining state via ledgers and handoffs
- **Why chosen:** Solves the critical problem of context loss across sessions. MCP execution without context pollution. Agent orchestration with isolated context windows. Predecessor pioneered running Claude Code in a continuous loop — autonomously creating PRs, waiting for checks, merging.
- **What sets it apart:** Stateful orchestration surviving context window boundaries — the "long-running agent" problem solved.
- [github.com/jqueryscript/awesome-claude-code](https://github.com/jqueryscript/awesome-claude-code)

### 13. crystal (2.7K stars)
- **What:** Run multiple Claude Code sessions in parallel git worktrees
- **Why chosen:** Parallel execution across isolated worktrees — multiple agents work on different features simultaneously without merge conflicts. Each agent gets a clean copy of the repo.
- **What sets it apart:** Git worktree isolation for true parallel multi-agent development — simple concept, powerful execution.
- [github.com/jqueryscript/awesome-claude-code](https://github.com/jqueryscript/awesome-claude-code)

### 14. Claude Code Swarm Orchestration Skill (kieranklaassen)
- **What:** Complete guide to multi-agent coordination with TeammateTool, Task system, and all patterns
- **Why chosen:** Tested/verified 2026-01-25. Reveals Claude Flow V3's swarm system and Claude Code's TeammateTool share striking architectural similarities. Demonstrates 5-terminal-pane setup with specialized agents for each layer.
- **What sets it apart:** The Rosetta Stone between orchestration approaches — shows they're all converging on the same patterns.
- [gist.github.com/kieranklaassen](https://gist.github.com/kieranklaassen/4f2aba89594a4aea4ad64d753984b2ea)

### 15. myclaude (stellarlinkco)
- **What:** Multi-agent orchestration supporting Claude Code, Codex, Gemini, OpenCode
- **Why chosen:** 7 specialized modules (do, omo, bmad, requirements, essentials, sparv, course). Two-tier architecture: Claude Code as orchestrator, codeagent-wrapper as executor. The bmad module brings 6 specialized agents for large-scale projects.
- **What sets it apart:** Cross-tool orchestration — works across Claude Code, Codex, Gemini, and OpenCode simultaneously.
- [github.com/stellarlinkco/myclaude](https://github.com/cexll/myclaude)

### 16. cc-sessions (GWUDCAP) (1.5K stars)
- **What:** Opinionated extension set — hooks, subagents, commands, task/git management infrastructure
- **Why chosen:** Solves key pain points: tasks don't survive restarts, no confidence work continues across context windows, git workflow friction. Structured session management that persists.
- **What sets it apart:** Solves the session persistence problem — the single biggest UX pain point in agentic coding.
- [github.com/GWUDCAP/cc-sessions](https://github.com/GWUDCAP/cc-sessions)

### 17. Claude Code Workflows (shinpr)
- **What:** Production-ready development workflows with specialized AI agents
- **Why chosen:** Enforced best practices, automated quality checks (tests, types, linting run automatically and get fixed if they fail). Complete lifecycle: requirements → implementation → review. Self-healing quality — if linting fails, the agent fixes it.
- **What sets it apart:** Self-healing quality checks — the agent is its own QA department.
- [github.com/shinpr/claude-code-workflows](https://github.com/shinpr/claude-code-workflows)

### 18. wshobson/commands (1.7K stars)
- **What:** Production-ready slash commands with multi-agent orchestration patterns
- **Why chosen:** Workflows analyze requirements, delegate to specialized agents, coordinate execution. Clean, well-documented.
- **What sets it apart:** Production-tested orchestration distilled into reusable slash commands.
- [github.com/wshobson/commands](https://github.com/wshobson/commands)

### 19. wshobson/agents
- **What:** Intelligent automation and multi-agent orchestration for Claude Code
- **Why chosen:** Companion to the commands repo — agent definitions that commands invoke. Together they form a complete orchestration system.
- **What sets it apart:** Clean separation of concerns between agent definitions and command interfaces.
- [github.com/wshobson/agents](https://github.com/wshobson/agents)

---

## CATEGORY 3: BMAD Method & Agile AI Workflows

### 20. BMAD-AT-CLAUDE (24601)
- **What:** Breakthrough Method for Agile AI-Driven Development ported to Claude Code
- **Why chosen:** 26 specialized persona agents (Analyst, PM, Architect, Scrum Master, PO, Developer, QA). Each phase runs in a fresh chat to avoid context limitations. Handoffs between personas create versioned artifacts in git. Documentation as source of truth, not just code.
- **What sets it apart:** The most structured approach to AI-assisted development — documentation as first-class artifacts.
- [github.com/24601/BMAD-AT-CLAUDE](https://github.com/24601/BMAD-AT-CLAUDE)

### 21. BMAD v6 + Langfuse + Claude Code Agent Teams (vadim.blog)
- **What:** Production case study integrating BMAD v6 planning, Langfuse observability, Claude Code agent teams
- **Why chosen:** Real production system (nomadically.work). Three pillars: planning/quality gates, observability, orchestration. Key warnings: Skip BMAD → agents produce code not matching requirements. Skip Langfuse → flying blind. Skip Agent Teams → merge conflicts.
- **What sets it apart:** The only resource documenting a complete three-pillar production deployment with honest failure analysis.
- [vadim.blog/bmad-langfuse-claude-code-agent-teams](https://vadim.blog/bmad-langfuse-claude-code-agent-teams)

### 22. BMAD + Claude Flow + Gas Town Comparison (re:cinq)
- **What:** Comparative analysis of three major orchestration frameworks
- **Why chosen:** BMAD's planning runs ~3 hours before any code is written — significant upfront investment that pays off with predictable execution. Honest cost/benefit analysis.
- **What sets it apart:** Real cost/time data on orchestration approaches (3 hours planning acknowledged).
- [re-cinq.com/blog/multi-agent-orchestration-bmad-claude-flow-gastown](https://re-cinq.com/blog/multi-agent-orchestration-bmad-claude-flow-gastown)

---

## CATEGORY 4: Prompt Libraries & System Prompt Collections

### 23. system-prompts-and-models-of-ai-tools (x1xhlol)
- **What:** 30,000+ lines of system prompts from 30+ AI tools — Claude Code, Cursor, Devin, Lovable, Manus, Perplexity, Replit, Windsurf, and more
- **Why chosen:** The definitive collection of how production AI tools instruct their models. Includes internal tools and model configurations. Essential for understanding how the best products engineer their prompts.
- **What sets it apart:** Transparency into proprietary system prompts normally hidden. The most comprehensive reverse-engineering collection.
- [github.com/x1xhlol/system-prompts-and-models-of-ai-tools](https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools)

### 24. awesome-ai-system-prompts (dontriskit)
- **What:** Curated collection with deep analysis of prompt engineering patterns
- **Why chosen:** Highlights Manus's standout feature: explicitly defined operational loop (Analyze → Select Tool → Wait → Iterate → Submit → Standby). Analyzes patterns across ChatGPT, Claude, Perplexity, Grok, Notion, MetaAI.
- **What sets it apart:** Not just collection but analysis — explains what makes each system prompt effective.
- [github.com/dontriskit/awesome-ai-system-prompts](https://github.com/dontriskit/awesome-ai-system-prompts)

### 25. awesome-system-prompts (EliFuzz)
- **What:** System prompts and tool definitions from Augment Code, Claude Code, Cursor, Devin, Kiro, Perplexity, VSCode Agent, Gemini, Codex, OpenAI
- **Why chosen:** Focuses on tool definitions alongside system prompts — shows not just what the AI is told, but what tools it's given.
- **What sets it apart:** Tool definitions alongside prompts — the complete picture of agent capability design.
- [github.com/EliFuzz/awesome-system-prompts](https://github.com/EliFuzz/awesome-system-prompts)

### 26. agentic-system-prompts (tallesborges)
- **What:** System prompts and tool definitions from production AI coding agents
- **Why chosen:** Production-focused — actual prompts running in shipped products, not toy examples.
- **What sets it apart:** Production provenance — every prompt from a real deployed system.
- [github.com/tallesborges/agentic-system-prompts](https://github.com/tallesborges/agentic-system-prompts)

### 27. agentic-prompts (jwadow)
- **What:** Ready-to-use templates for prompt engineering, custom agent personas, AI-driven workflows
- **Why chosen:** Expert project orchestrator persona that decomposes complex tasks and delegates to specialist agents. Optimized for Roo Code but adaptable.
- **What sets it apart:** Persona-driven design — agents given identities and decision-making frameworks, not just tasks.
- [github.com/jwadow/agentic-prompts](https://github.com/jwadow/agentic-prompts)

---

## CATEGORY 5: Cursor Rules & IDE Configurations

### 28. awesome-cursorrules (PatrickJS)
- **What:** Configuration files enhancing Cursor AI editor with custom rules and behaviors
- **Why chosen:** The most popular .cursorrules collection. Covers Next.js, Unity/C#, web optimization, code pair interviews, Gherkin testing, documentation. Context awareness about project methods and architectural decisions.
- **What sets it apart:** The OG cursorrules collection — largest community, most diverse framework coverage.
- [github.com/PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules)

### 29. awesome-ai-prompts (convertscout)
- **What:** 206+ prompts, 500+ Cursor rules for React, Next.js, Python, Django
- **Why chosen:** Includes a free prompt generator tool. Framework-specific rules for popular stacks.
- **What sets it apart:** The prompt generator — a tool for creating new prompts, not just a static library.
- [github.com/convertscout/awesome-ai-prompts](https://github.com/convertscout/awesome-ai-prompts)

### 30. ai-prompts (instructa)
- **What:** Curated prompts for Cursor Rules, Cline, Windsurf, and GitHub Copilot
- **Why chosen:** Cross-platform rules that work across multiple AI IDEs. MIT licensed.
- **What sets it apart:** Cross-tool compatibility — same rules across Cursor, Cline, Windsurf, Copilot.
- [github.com/instructa/ai-prompts](https://github.com/instructa/ai-prompts)

### 31. Cursor AI Prompting Rules (aashari gist)
- **What:** Evidence-first prompting framework elevating AI to "Autonomous Principal Engineer"
- **Why chosen:** Enforces rigorous workflow: reconnaissance, planning, safe execution, self-improvement. Not just rules but a complete engineering methodology.
- **What sets it apart:** The "Principal Engineer" elevation — treats AI as a senior engineer with accountability.
- [gist.github.com/aashari](https://gist.github.com/aashari/07cc9c1b6c0debbeb4f4d94a3a81339e)

---

## CATEGORY 6: GitHub Copilot Configurations & Agents

### 32. awesome-copilot (github/awesome-copilot)
- **What:** Official community-contributed instructions, prompts, and configurations for GitHub Copilot
- **Why chosen:** Official GitHub repository. Includes Awesome Agents, Instructions, Hooks, Agentic Workflows, Skills. Works in CCA, VS Code, and Copilot CLI.
- **What sets it apart:** Official GitHub backing — the canonical community resource.
- [github.com/github/awesome-copilot](https://github.com/github/awesome-copilot)

### 33. GitHub AGENTS.md Standard
- **What:** Project instruction file shareable across Copilot, Claude Code, Cursor, Gemini CLI
- **Why chosen:** Analysis of 2,500+ agents.md files shows best agents have: clear persona, executable commands, concrete code examples, explicit boundaries, tech stack specifics across 6 areas (commands, testing, project structure, code style, git workflow, boundaries).
- **What sets it apart:** The emerging universal standard — works across all major AI tools.
- [github.blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)

### 34. GitHub Copilot Custom Instructions Hierarchy
- **What:** Repository-wide and path-specific instruction files with agent scoping
- **Why chosen:** Hierarchical system: Personal → Organization → Repository → Path-specific → Skills → AGENTS.md. New `excludeAgent` property controls which agents see which instructions. `applyTo` scopes rules to file patterns.
- **What sets it apart:** Fine-grained scoping — different rules for different codebase areas and different agents.
- [github.blog](https://github.blog/changelog/2025-11-12-copilot-code-review-and-coding-agent-now-support-agent-specific-instructions/)

### 35. GitHub Agentic Workflows (Feb 13, 2026)
- **What:** Automate repository tasks using AI agents in GitHub Actions, written in Markdown instead of YAML
- **Why chosen:** Natural language workflows. AI handles issue triage, PR reviews, CI failure analysis. GitHub MCP Server integration + browser automation + web search. Open source MIT.
- **What sets it apart:** Markdown-as-workflow — the most natural-language CI/CD automation approach.
- [github.blog](https://github.blog/changelog/2026-02-13-github-agentic-workflows-are-now-in-technical-preview/)

### 36. Copilot CLI (GA Feb 25, 2026)
- **What:** Terminal agentic development environment with custom agents via .agent.md files
- **Why chosen:** Plans, builds, reviews, remembers across sessions. Custom agents via interactive wizard or `.agent.md` files. Skills auto-load when relevant.
- **What sets it apart:** Session memory — remembers across sessions, unlike most CLI tools.
- [github.blog](https://github.blog/changelog/2026-02-25-github-copilot-cli-is-now-generally-available/)

---

## CATEGORY 7: Production Pipeline & Infrastructure Tools

### 37. claude-code-router (25.3K stars)
- **What:** Uses Claude Code as foundation for coding infrastructure — routes tasks to appropriate agents
- **Why chosen:** Most-starred Claude Code ecosystem project. The router pattern applied to AI coding agents.
- **What sets it apart:** Pure infrastructure — routing layer for agent task delegation.
- [scriptbyai.com/claude-code-resource-list](https://www.scriptbyai.com/claude-code-resource-list/)

### 38. claude-code-action (5.0K stars)
- **What:** General-purpose Claude Code action for GitHub PRs and issues
- **Why chosen:** Answers questions and implements code changes directly in GitHub. Bridges terminal power with GitHub collaboration.
- **What sets it apart:** Native GitHub integration — Claude Code embedded in PR/issue workflows.
- [scriptbyai.com/claude-code-resource-list](https://www.scriptbyai.com/claude-code-resource-list/)

### 39. claude-code-spec-workflow (3.3K stars)
- **What:** Automated Kiro-style Spec workflow: Requirements → Design → Tasks → Implementation
- **Why chosen:** Transforms feature ideas into complete implementations through structured spec-driven process. Eliminates "just start coding" drift.
- **What sets it apart:** Spec-first development automated end-to-end.
- [scriptbyai.com/claude-code-resource-list](https://www.scriptbyai.com/claude-code-resource-list/)

### 40. tdd-guard (1.7K stars)
- **What:** Automated TDD enforcement for Claude Code
- **Why chosen:** Prevents agents from writing code without tests. Makes test-driven development a hard constraint via hooks.
- **What sets it apart:** TDD as infrastructure — physically impossible for agents to skip tests.
- [github.com/jqueryscript/awesome-claude-code](https://github.com/jqueryscript/awesome-claude-code)

### 41. CCPlugins (2.6K stars)
- **What:** Claude Code Plugins focused on practical time savings
- **Why chosen:** Community-validated, high star count. Explicit filter: "plugins that actually save time."
- **What sets it apart:** Pragmatism as design principle.
- [github.com/jqueryscript/awesome-claude-code](https://github.com/jqueryscript/awesome-claude-code)

---

## CATEGORY 8: Curated Awesome Lists & Meta-Resources

### 42. awesome-claude-code (hesreallyhim)
- **What:** Skills, hooks, slash-commands, agent orchestrators, applications, plugins
- **Why chosen:** Agentic workflow patterns with Mermaid diagrams: Subagent Orchestration, Progressive Skills, Parallel Tool Calling, Master-Clone Architecture, Wizard Workflows. Highlights TÂCHES (meta-skills), Claude Code Infrastructure Showcase, Claude Code PM.
- **What sets it apart:** Quality curation with architectural workflow documentation.
- [github.com/hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)

### 43. awesome-claude-code (jqueryscript)
- **What:** Curated list with star counts and categorization
- **Why chosen:** Objective metrics. Easy scanning for popular and actively maintained projects.
- **What sets it apart:** Quantitative curation — star counts for quick community validation.
- [github.com/jqueryscript/awesome-claude-code](https://github.com/jqueryscript/awesome-claude-code)

### 44. awesome-slash (avifenesh)
- **What:** 11 plugins, 40 agents, 26 skills for Claude Code, OpenCode, Codex
- **Why chosen:** "If static analysis, regex, or a shell command can do it, don't ask an LLM." Includes **agnix** — CLI + LSP linter with 155 rules catching config errors before they fail silently.
- **What sets it apart:** "LLM-last" philosophy — deterministic tools first, LLM only when judgment is needed.
- [github.com/avifenesh/awesome-slash](https://github.com/avifenesh/awesome-slash)

### 45. awesome-agent-skills (heilcheng)
- **What:** Skills, tools, tutorials for AI coding agents (Claude, Codex, Copilot, VS Code)
- **Why chosen:** Cross-tool skills catalog with tutorials alongside definitions.
- **What sets it apart:** Cross-platform skill portability documentation.
- [github.com/heilcheng/awesome-agent-skills](https://github.com/heilcheng/awesome-agent-skills)

### 46. The Ultimate Claude Code Resource List (scriptbyai.com)
- **What:** Comprehensive web-based catalog of the Claude Code ecosystem
- **Why chosen:** Star counts and links for every major project. Updated ~Feb 2026.
- **What sets it apart:** Web-first presentation — easier to browse than GitHub READMEs.
- [scriptbyai.com/claude-code-resource-list](https://www.scriptbyai.com/claude-code-resource-list/)

### 47. 500-AI-Agents-Projects (ashishpatel26)
- **What:** 500 AI agent use cases across healthcare, finance, education, retail
- **Why chosen:** Largest single collection with implementation links. Organized by industry.
- **What sets it apart:** Breadth across industries — business domain agents, not just coding.
- [github.com/ashishpatel26/500-AI-Agents-Projects](https://github.com/ashishpatel26/500-AI-Agents-Projects)

### 48. awesome-agentic-patterns (nibzard)
- **What:** Agentic AI patterns — workflows, mini-architectures for production
- **Why chosen:** Real-world patterns above individual tools, below full architectures. Framework-agnostic.
- **What sets it apart:** Pattern-level thinking — transferable across any agent system.
- [github.com/nibzard/awesome-agentic-patterns](https://github.com/nibzard/awesome-agentic-patterns)

---

## CATEGORY 9: Enterprise Production Workflows

### 49. Spotify "Honk" System
- **What:** Internal AI deployment tool interfacing with Claude Code
- **Why chosen:** 650+ AI-generated code changes shipped/month. ~50% of all updates flow through the system. Engineers deploy fixes via Slack from phones. 90% reduction in engineering time. Best developers haven't written code since Dec 2025.
- **What sets it apart:** Scale — 50% of all updates at a major tech company flowing through AI agents.
- [TechCrunch](https://techcrunch.com/2026/02/12/spotify-says-its-best-developers-havent-written-a-line-of-code-since-december-thanks-to-ai/)

### 50. Shopify Sidekick Full-Stack Operator
- **What:** AI-native commerce OS with agent write access to critical infrastructure
- **Why chosen:** AI agents handle full commerce workflows. Sidekick gained write access — autonomous changes to production stores.
- **What sets it apart:** Write access to production — agents modifying live infrastructure.
- [shopify.com/news/winter-26-edition-dev](https://www.shopify.com/news/winter-26-edition-dev)

---

## CATEGORY 10: Official Best Practices & Methodology

### 51. Anthropic Official Best Practices
- **What:** Official CLAUDE.md, skills, hooks, and configuration guidance
- **Why chosen:** Key principles: Keep CLAUDE.md short. For each line ask "Would removing this cause mistakes?" Bloated files cause Claude to ignore instructions. Use hooks for zero-exception requirements. Skills for on-demand knowledge. Treat CLAUDE.md like code.
- **What sets it apart:** The authoritative source — everything else is interpretation.
- [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices)

### 52. Builder.io CLAUDE.md Guide
- **What:** Practical guide to CLAUDE.md authoring
- **Why chosen:** Step-by-step from a team shipping production code with Claude Code daily. Example-driven.
- **What sets it apart:** Production team's practical examples over abstract principles.
- [builder.io/blog/claude-md-guide](https://www.builder.io/blog/claude-md-guide)

### 53. GitHub "5 Tips for Better Custom Instructions"
- **What:** Official Copilot instruction authoring guide
- **Why chosen:** "Don't overthink it." Max 2 pages. Include app summary, tech stack, guidelines, structure. Use Copilot to bootstrap the file itself.
- **What sets it apart:** The "don't overthink it" philosophy — refreshing simplicity.
- [github.blog](https://github.blog/ai-and-ml/github-copilot/5-tips-for-writing-better-custom-instructions-for-copilot/)

### 54. GitHub "How to Write a Great agents.md" (Feb 2026)
- **What:** Data-driven lessons from 2,500+ repositories
- **Why chosen:** Empirical. Best agents cover 6 areas: commands, testing, project structure, code style, git workflow, boundaries. Need executable commands and concrete examples.
- **What sets it apart:** Recommendations backed by analysis of 2,500 real-world examples.
- [github.blog](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)

### 55. GitHub "Build Reliable AI Workflows with Agentic Primitives" (Feb 2026)
- **What:** Methodology for reliable agentic workflows and context engineering
- **Why chosen:** Introduces "agentic primitives" as building blocks and "context engineering" as a discipline. System-level design of agent information flows.
- **What sets it apart:** Context engineering as a named discipline — the evolution beyond prompt engineering.
- [github.blog](https://github.blog/ai-and-ml/github-copilot/how-to-build-reliable-ai-workflows-with-agentic-primitives-and-context-engineering/)

---

## CATEGORY 11: Advanced Patterns & Workflows

### 56. Aircraft MRO System (100K+ lines via Claude Code)
- **What:** 55 entities, 78 API endpoints, 114 UI components, generated in 20 hours
- **Why chosen:** Most ambitious documented vibe coding project. ~50-60% AI-generated. Honest post-mortem: "Here's Why Vibe Coding Couldn't."
- **What sets it apart:** Documents both successes and failures of vibe coding at scale.
- [Medium](https://anil789.medium.com/we-built-a-100k-line-enterprise-app-using-ai-heres-why-vibe-coding-couldn-t-4f1220d08203)

### 57. Adversarial Multi-Model Workflow
- **What:** Same prompt across Claude, OpenAI, DeepSeek — agents critique each other's outputs
- **Why chosen:** "Adversarial prompting" surfaces the best answers through competition. Used in production.
- **What sets it apart:** Competition between models as a quality mechanism — AI peer review.
- [InfoWorld](https://www.infoworld.com/article/4035926/multi-agent-ai-workflows-the-next-evolution-of-ai-coding.html)

### 58. MetaGPT Team Simulation
- **What:** LLM tools orchestrated into roles — PM, Architect, Engineer — with defined I/O per role
- **Why chosen:** Addresses cascading errors through structured handoffs. Most complete team simulation.
- **What sets it apart:** Full organizational structure, not just agents.
- [pragmaticcoders.com](https://www.pragmaticcoders.com/resources/ai-developer-tools)

### 59. Hooks Over Instructions (Trail of Bits philosophy)
- **What:** Instructions are advisory; hooks are deterministic. Hooks for anything that must happen with zero exceptions.
- **Why chosen:** Fundamental architectural insight separating robust setups from fragile ones.
- **What sets it apart:** The foundational principle of reliable agent configuration.

### 60. LLM-Last Design (awesome-slash philosophy)
- **What:** Static analysis, regex, shell commands first. LLM only when judgment is needed.
- **Why chosen:** Counter-intuitive but effective. Reduces cost, increases speed, improves reliability.
- **What sets it apart:** Cost and reliability optimization through deterministic-first architecture.

### 61. Progressive Disclosure via Skills
- **What:** On-demand skill loading when context matches instead of bloating CLAUDE.md
- **Why chosen:** Bloated CLAUDE.md causes instruction-ignoring. Skills provide knowledge only when relevant.
- **What sets it apart:** "Less is more" applied to agent configuration.

### 62. Session Persistence Patterns
- **What:** Ledger files, handoff documents, git-based state tracking, checkpoint systems
- **Why chosen:** Solves the biggest practical challenge: maintaining state across context windows and restarts.
- **What sets it apart:** Addressing the fundamental limitation of context-window-bound agents.

### 63. Spec-First Workflow
- **What:** Requirements → Design → Tasks → Implementation as automated pipeline
- **Why chosen:** Auditable artifacts at each stage. Each output feeds the next input.
- **What sets it apart:** Structure where it helps, AI where it accelerates.

### 64. Self-Healing Quality Checks
- **What:** Tests/types/linting run automatically after changes — if they fail, the agent fixes them
- **Why chosen:** Closes the loop between generation and validation. No human intervention for common issues.
- **What sets it apart:** Autonomous quality — the agent is its own QA.

---

## Key Takeaways

1. **Configuration is the new code.** CLAUDE.md, .cursorrules, agents.md are as important as source code itself.
2. **Hooks > Instructions.** Deterministic hooks for hard requirements; instructions only for soft guidance.
3. **Less CLAUDE.md is more.** Official recommendation: under 150 lines. Bloat causes instruction-ignoring.
4. **Skills for progressive disclosure.** Context-matched on-demand loading beats front-loading everything.
5. **Session persistence is the hard problem.** Most valuable tools solve state persistence across context windows.
6. **Multi-agent orchestration is maturing.** Ruflo, BMAD, Claude Flow, myclaude converging on similar patterns.
7. **Cross-tool standards are emerging.** AGENTS.md works across Copilot, Claude Code, Cursor, Gemini CLI.
8. **Security scanning of configs is essential.** Agent configurations themselves are attack surfaces.
9. **The "boring agents" win.** Narrow, specialized, deeply integrated > ambitious generalists.
10. **Context engineering > prompt engineering.** Designing information flows across systems, not just individual prompts.
