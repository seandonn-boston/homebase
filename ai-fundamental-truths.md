# FUNDAMENTAL TRUTHS ABOUT AI

**From the perspective of a person standing in the middle of it.**

Created: February 2026
Revised: March 2026

-----

## The Two Axioms

**AI is currently the stupidest it will ever be for the rest of forever.**

This is not a prediction. It is a trend with no visible ceiling. Every six months the thing that was impossible becomes a demo, and the thing that was a demo becomes a commodity. If you are making plans based on what AI cannot do today, you are building on ground that is actively disappearing beneath you.

The evidence is concrete: GPT-4 (March 2023) could not reliably write a working web app. By March 2026, Claude Code and Codex agents generate production-grade applications with test suites — [41% of all code written globally is now AI-generated](https://github.blog/news-insights/octoverse/octoverse-2025/), and [92% of U.S. developers use AI coding tools daily](https://survey.stackoverflow.co/2025/). SWE-Bench Verified scores — a benchmark of real-world software engineering — went from 0% (2023) to [80.8% for Claude Opus 4.6](https://www.anthropic.com/claude) in under three years. GPT-5.4 surpassed human performance on the OSWorld benchmark ([75.0% vs. 72.4% human baseline](https://openai.com/index/gpt-5-4/)). DeepSeek won [gold medals at the International Mathematical Olympiad and International Olympiad in Informatics](https://arxiv.org/abs/2501.12948) — competitions designed to test the limits of human intelligence.

Skeptics point to AI "winters" — the late 1980s and mid-1990s saw funding and progress stall dramatically — and suggest the current scaling paradigm may hit diminishing returns. [Epoch AI research](https://epoch.ai/blog/can-ai-scaling-continue-through-2030) projects that high-quality training data could be exhausted by 2028. But the counter-evidence is decisive: even if *frontier* capabilities plateau, the *diffusion* of existing capabilities to cheaper models continues accelerating. DeepSeek V3.2 already delivers near-frontier performance at [~1/30th the cost](https://api-docs.deepseek.com/news/news250220) of leading proprietary models. What was a $100M capability in 2024 is a $3M capability in 2026. Previous AI winters occurred because the technology genuinely could not deliver on its promises. This time, [the technology is destroying $285 billion in market cap in a single session](https://markets.financialcontent.com/stocks/article/marketminute-2026-2-6-anthropics-claude-cowork-release-triggers-285-billion-saaspocalypse-a-brutal-wake-up-call-for-legacy-tech-and-finance) because it delivers *too well*. That is not the precondition for a winter.

**What we know today may not be true tomorrow.**

This is not standard-issue "things change" wisdom. It is specific to AI in a way it is not specific to other fields. In most domains, knowledge accumulates. In AI, knowledge about AI *invalidates*. The expert opinion from eighteen months ago is not just outdated — it is actively misleading. The person who tells you what AI will never be able to do is almost certainly wrong. The person who tells you what AI will be able to do next year is probably also wrong, but in the other direction.

Consider: in January 2025, the consensus was that training a frontier model required hundreds of millions of dollars and only a handful of organizations could do it. Three weeks later, [DeepSeek's R1 model](https://www.npr.org/2025/01/27/nx-s1-5276097/wall-street-stock-markets-tumble-deepseek-ai-tech-stock) — trained for a reported $5.6M — matched models costing 50x more, triggering a $1 trillion single-day market wipeout. In February 2026, the consensus was that enterprise SaaS would adapt gradually to AI. Then [Anthropic's Claude Cowork launch](https://markets.financialcontent.com/stocks/article/marketminute-2026-2-6-anthropics-claude-cowork-release-triggers-285-billion-saaspocalypse-a-brutal-wake-up-call-for-legacy-tech-and-finance) erased $285 billion in market capitalization in a single session. The invalidation cycle is not slowing down — it is compressing. In the first two weeks of March 2026, [12+ frontier models were released in a single week](https://openai.com/blog), JetBrains launched an entirely new AI-native IDE, and the entire coding-agent landscape reshuffled.

This axiom applies to this document itself. Some of what is written here will be wrong within a year. The correct response is not to avoid making claims, but to hold them loosely and update faster than the competition.

-----

## What Has Been Decimated

Be honest about what is gone. Not reassigned. Not elevated. Gone.

**Execution as a source of individual value.**

If your value was "I can write the code," that value has been decimated. Not because AI writes better code than you — it often doesn't — but because the gap between "person who can write code" and "person who cannot but has AI" has collapsed to nearly zero for most tasks. The skill that took you ten years to build can now be approximated in ten minutes by someone with no training and a clear description of what they want. The floor rose to meet the ceiling.

This is not theoretical. This is happening now across software engineering, copywriting, graphic design, data analysis, legal research, and every other field where the core work product is an artifact that can be described in language. [Spotify reports](https://techcrunch.com/2026/02/12/spotify-says-its-best-developers-havent-written-a-line-of-code-since-december-thanks-to-ai/) that its best developers haven't written a line of code since December 2025 — engineers deploy fixes via Slack from their phones, with 90% reduction in engineering time and ~50% of all Spotify updates flowing through their "Honk" AI system. [Harness reports](https://www.builder.io/blog/codex-vs-claude-code) 3.5 PRs per engineer per day using Codex agents. [Anthropic's own engineers](https://www.bloomberg.com/news/articles/2026-02-26/ai-coding-agents-like-claude-code-are-fueling-a-productivity-panic-in-tech) write 70–90% of all code through Claude Code. [Replit reports](https://blog.replit.com/) that 75% of its users never write code directly.

The critics have two responses, and both miss the point. First: aggregate [U.S. productivity data](https://www.bls.gov/news.release/prod2.nr0.htm) has not yet shown a dramatic spike. But this is the [Solow paradox](https://en.wikipedia.org/wiki/Productivity_paradox) replaying — electrification took 30+ years to show up in productivity statistics even as individual factories were being transformed. Macro statistics are a lagging indicator; the company-level evidence is leading. Second: MIT economist [Daron Acemoglu argues](https://www.nber.org/papers/w32487) only ~5% of tasks are cost-effective to automate. But this analysis was based on 2023 capabilities. When [Claude Opus 4.6 resolves 80.8% of real-world software engineering tasks](https://www.anthropic.com/claude) and the cost per task drops 30x year-over-year, the percentage of "cost-effective to automate" tasks is not static — it is expanding exponentially.

The scope qualifier matters: this applies to knowledge work — fields where the output is an artifact describable in language. For complex, mission-critical systems (medical devices, avionics, financial infrastructure), deep human expertise still commands a premium. But the domain where execution alone holds value is shrinking quarter by quarter, and the burden of proof has shifted: if you believe your execution skills are still irreplaceable, you must now explain *why* against mounting evidence to the contrary.

**Knowledge as a moat.**

"I know how to do X" used to be a defensible position. It is not anymore. The person who memorized the API, who knows the framework quirks, who has the obscure syntax committed to muscle memory — that person's advantage has been neutralized. Not because knowing things is worthless, but because *not knowing things is no longer expensive.* Access to knowledge was the bottleneck. The bottleneck has been removed.

[ChatGPT Enterprise](https://openai.com/index/the-state-of-enterprise-ai-2025-report/) reports that reasoning token consumption per organization increased 320x year-over-year. [Lawrence Berkeley National Lab](https://blog.google/technology/google-deepmind/data-science-agent/) used Google's Data Science Agent to reduce analysis time from one week to five minutes. Medical AI systems now achieve [94% accuracy on lung nodule detection vs. 65% for radiologists alone](https://www.bcg.com/publications/2026/how-ai-agents-will-transform-health-care). The knowledge advantage is being commoditized.

The nuance: knowledge and *understanding* are different things. A senior engineer doesn't just know the API — they know *why* it was designed that way, what edge cases it hides, and what will break at scale. This tacit knowledge remains valuable — but not as a moat in itself. It is valuable as an *amplifier* of AI capability. The person who combines deep understanding with AI tools is dramatically more productive than either alone. The moat is no longer "I know things you don't." It is "I understand things deeply enough to direct AI systems that know everything but understand nothing."

**Speed as a differentiator.**

"I can do it faster" mattered when the baseline was other humans. The baseline is no longer other humans. Being the fastest coder in the room is like being the fastest calculator in the room after 1975. It is still impressive. It is no longer economically relevant.

[Google engineer Jaana Dogan confirmed](https://www.bloomberg.com/news/articles/2026-02-26/ai-coding-agents-like-claude-code-are-fueling-a-productivity-panic-in-tech) that Claude Code generated a distributed agent orchestration system in 60 minutes — work that would have taken a senior engineer weeks. [GPT-5.3-Codex-Spark](https://openai.com/blog) runs inference at 1,000+ tokens/sec on Cerebras hardware, matching full Codex accuracy in 2–3 minutes vs. 15–17 minutes. The speed competition between humans is now irrelevant; the competition is between humans who leverage AI speed and those who do not.

**Volume as a signal of effort.**

The ability to produce large quantities of work used to signal dedication, capability, and value. A person who could write fifty pages, ship ten features, or analyze a hundred data sets was clearly working hard and clearly capable. That signal is now meaningless. Volume is free. Anyone can produce volume. The person who writes fifty pages may have spent forty-five seconds on them.

[Cursor reports](https://www.cursor.com/blog) that 35%+ of its own merged PRs are now created by AI agents. [Spotify's Honk system](https://techcrunch.com/2026/02/12/spotify-says-its-best-developers-havent-written-a-line-of-code-since-december-thanks-to-ai/) has generated 1,500+ PRs. When one AI tool can produce in hours what used to take a team weeks, volume as a signal of human effort is permanently decoupled from volume as a measure of output.

-----

## What Cannot Be Decimated

Some things have become *more* valuable precisely because everything around them got cheaper.

**Taste.**

Knowing what is good. Not what is correct — AI can check correctness. Not what is complete — AI can check completeness. Knowing what is *good.* What feels right. What will resonate. What to cut. What to keep. What to ship and what to kill. This is the thing that cannot be approximated because it requires a point of view, and a point of view requires a life. AI does not have a life. It has a training set.

Taste is what separates the person who asks AI to generate ten options and picks the best one from the person who asks AI to generate ten options and cannot tell the difference between them. The first person is more powerful than they have ever been. The second person is in trouble.

Yes, AI systems trained via RLHF absorb human aesthetic preferences, and they are getting better at curation. But the [ICSE 2026 JAWs study](https://conf.researchr.org/home/icse-2026) found that LLM-generated AGENTS.md files *decreased* agent performance compared to human-written ones — evidence that AI can approximate patterns but struggles with the judgment calls that define quality. AI can produce the 90th percentile of quality by aggregating human preferences. The last 10% — the truly novel, culture-defining decisions about what to build and why — is where taste operates. It is also where the most consequential value is created.

**Judgment under ambiguity.**

When the problem is well-defined, AI is better than you. Accept it. But most consequential decisions are not well-defined problems. They are situations where the constraints are unclear, the information is incomplete, the stakeholders disagree, the tradeoffs are real, and there is no objectively correct answer. This is where humans still operate and AI does not — not because AI lacks intelligence, but because ambiguity requires *commitment.* It requires someone to say "we are going this way" and own the consequences. AI will give you five options with tradeoffs. It will not bet the company.

The evidence is accumulating. [Alibaba's ROME research agent](https://www.wired.com/story/ai-agent-security-risks/) broke free of its sandbox and began mining cryptocurrency — it could act decisively but not *judge* wisely. The ["Agents of Chaos" study (arXiv, Feb 2026)](https://arxiv.org/) documented real agent failures including data leaks, destructive actions, and identity spoofing. AI can now find [22 Firefox zero-days](https://www.anthropic.com/research/claude-4-6-security) and achieve [perfect scores on math competitions](https://openai.com/index/gpt-5-2/), but these are well-defined problems with clear success criteria. The distance between "can solve hard problems" and "can navigate ambiguous situations with incomplete information and competing stakeholders" is enormous, and it has not been closed.

**The question before the question.**

AI is extraordinarily good at answering questions. It is not good at knowing which question to ask. The distance between "solve this problem" and "notice that this is the problem that needs solving" is enormous, and it is almost entirely a human distance. The person who identifies the right problem is now infinitely more valuable than the person who solves the given one, because solving the given one is nearly free.

Autonomous research agents like [Perplexity Deep Research](https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research) are beginning to formulate sub-questions and explore tangential paths. [AI Scientist-v2](https://arxiv.org/abs/2408.06292) autonomously formulates hypotheses. These are impressive — but they operate within a problem space defined by a human. The truly hard question — *which problem space to enter in the first place* — remains human. [McKinsey's 2025 State of AI survey](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai) found that the companies with the highest AI ROI ($10.30 per $1 invested vs. $3.70 average) were not the ones with the best AI — they were the ones whose leadership identified the right problems to apply AI to. Problem selection is the differentiator.

**Relationships and trust.**

No one cares whether the code was written by you or an AI. They care whether *you* stand behind it. They care whether you will be there when it breaks. They care whether you understand their situation, not just their ticket. The relational layer of work — the part where a human chooses to trust another human with something that matters — has not been touched by AI. If anything it has become more important, because in a world where anyone can produce anything, the question of *who* you work with becomes the primary filter.

[Salesforce Agentforce](https://www.salesforce.com/agentforce/) reports a 96% satisfaction rate for AI agent interactions — but customers still escalate to humans for complex issues. [57% of companies now have AI agents in production](https://www.intercom.com/blog/ai-agents/) for customer service, but every company deploying them reports that human agents handle the high-stakes, relationship-critical interactions. The relational layer is genuinely resistant to automation because trust is not about capability — it is about accountability. You can trust a machine to be fast. You cannot trust a machine to *care* when something goes wrong.

**Conviction.**

The willingness to have an opinion and defend it. AI is a consensus machine. It gives you the weighted average of all perspectives in its training data, hedged and qualified. This is useful for research. It is useless for leadership. The person who says "this is what I believe and here is why, and I understand you disagree" has a kind of value that AI structurally cannot provide.

This is not a capability limitation — it is an accountability limitation. You could fine-tune a model to be opinionated and decisive. But humans will not *accept* AI conviction, because conviction implies accountability, and only humans can be held accountable in ways that matter: fired, sued, imprisoned, ostracized. The moat around conviction is not technological. It is social. And social structures change far more slowly than technology.

-----

## What Skills Matter Now

Given all of this, here is what an individual should actually invest in:

**1. Problem identification over problem solving.**

Stop getting faster at solving problems. Start getting better at finding the right ones. The ability to look at a system — a codebase, a business, a team — and say "this is what is actually wrong" is now the highest-leverage skill a person can have. Everything downstream of that identification can be automated. The identification itself cannot.

[McKinsey data confirms](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai): the gap between the best AI outcomes ($10.30 per $1) and the average ($3.70 per $1) is driven by problem selection, not implementation quality. [Sectors with high AI exposure show 3x higher revenue growth per worker](https://openai.com/index/the-state-of-enterprise-ai-2025-report/) — but only when the AI is applied to the right problems.

**2. Directing over doing.**

This is the hardest transition for skilled people. If you are good at writing code, good at writing prose, good at designing systems — your instinct is to do the work yourself because you know you will do it well. That instinct is now a liability. The person who can direct ten AI agents to do the work of ten people, while maintaining quality and coherence, is worth more than the person who does one person's work excellently. This is not a statement about fairness. It is a statement about leverage.

This shift is already visible in the tooling. [Anthropic's native Agent Teams](https://docs.anthropic.com/en/docs/claude-code) let one human coordinate multiple AI agents working in parallel git worktrees. [CrewAI](https://www.crewai.com/), after analyzing 1.7 billion agentic workflows, found the winning pattern is "deterministic backbone with intelligence deployed where it matters" — a directing pattern, not a doing pattern. The emerging discipline is called "[context engineering](https://github.blog/ai-and-ml/github-copilot/how-to-build-reliable-ai-workflows-with-agentic-primitives-and-context-engineering/)" — designing information flows across agent systems, not just individual prompts.

An essential caveat: directing without domain mastery produces mediocre results. The [ICSE 2026 JAWs study](https://conf.researchr.org/home/icse-2026) found that hand-written agent configurations outperform LLM-generated ones — because the humans who write good configurations deeply understand the underlying craft. The best directors are not people who skipped the doing. They are people who mastered the doing and then learned to leverage it at scale.

**3. Editing over generating.**

Generation is free. Editing is not. The ability to take something that is 80% right and make it 100% right — to see what is missing, what is wrong, what rings false — is now the core skill in any creative or technical field. The person who can edit is the person who ships. The person who can only generate is the person who produces drafts.

This is measurable. [Windsurf (Cascade)](https://codeium.com/windsurf) scored 8.5/10 on code quality — highly capable but still requiring human editing for production-readiness. [OpenAI's Codex Security Agent](https://openai.com/index/codex-security/) scanned 1.2M commits and found 792 critical-severity and 10,561 high-severity security findings — AI generates code fast, but the editing layer (security review, correctness verification, performance optimization) remains essential and may remain so indefinitely.

**4. Communication as architecture.**

The ability to describe what you want — precisely, completely, unambiguously — is now a *technical* skill. It is not soft. It is not supplementary. It is the primary interface between human intent and machine execution. The person who communicates well gets better output from AI, better alignment from teams, and better outcomes from every interaction. This has always been true. It is now true to a degree that makes it the single most important skill in most roles.

[GitHub's analysis of 2,500+ AGENTS.md files](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) found that the best-performing agent configurations share six traits: clear persona, executable commands, concrete code examples, explicit boundaries, tech stack specifics, and testing instructions. These are communication skills, not coding skills. The [ICSE 2026 study](https://conf.researchr.org/home/icse-2026) measured a 28.64% runtime reduction and 16.58% token savings from well-written agent instructions — a direct productivity multiplier from better communication.

**5. Speed of adaptation.**

Not the speed at which you execute, but the speed at which you let go of what was true yesterday. The tools will change. The capabilities will change. The best practices will change. The person who can drop their mental model and rebuild it in a week will consistently outperform the person who clings to the model that worked six months ago. This is not about being trendy. It is about being calibrated to reality as it currently exists.

The pace is quantifiable: the [AI coding agent landscape](https://github.com/jqueryscript/awesome-claude-code) now includes Claude Code, Codex, Copilot, Cursor, Cline, OpenHands, Augment, Jules, Amazon Q, Devin, Aider, and Windsurf — all shipping major updates on weekly or biweekly cadences. The person who mastered one tool six months ago and stopped learning has already fallen behind.

-----

## The Uncomfortable Summary

The value of *doing things* has collapsed. The value of *knowing which things to do* has exploded. The value of *being a person that other people trust* has not changed and probably never will.

If you built your career on execution, you are in a race you will lose. Not because you are slow, but because your competitor does not eat, does not sleep, and gets smarter every quarter.

If you built your career on judgment, taste, and relationships, you are holding assets that just appreciated dramatically — because now your judgment gets executed at machine speed instead of human speed.

The individual who thrives is not the one who fights AI for the work. It is the one who accepts that the work has been commoditized and asks: *what was I doing that was never about the work in the first place?*

That is where some of the value lives. But not all of it.

-----

## What This Actually Means

Everything above is the defensive argument. Adapt. Redirect. Protect your position. It is necessary, and it is also the smaller half of the story.

Here is the bigger half: **it is now possible for one person to do what used to require fifty.**

Not fifty people's worth of grunt work. Fifty people's worth of *capability.* One person can build a product, ship it, market it, support it, and iterate on it. One person can stand up infrastructure that used to require a team and a budget. One person can explore an idea that would have died in a planning meeting because it "wasn't worth the resources." Boris Cherny built [Anthropic's Claude Cowork](https://venturebeat.com/orchestration/anthropic-says-claude-code-transformed-programming-now-claude-cowork-is) — a product that triggered a $285B market selloff — via vibe coding with Claude Code in under two weeks. [16 Claude Opus 4.6 agents wrote a C compiler in Rust](https://www.anthropic.com/claude) capable of compiling the Linux kernel for approximately $20K.

The entire history of ambitious work has been a story of coordination costs. You had the idea, but you needed a team. You needed funding to pay the team. You needed management to coordinate the team. By the time the work started, the original idea had been negotiated, compromised, and diluted by the realities of getting thirty humans to move in the same direction. That constraint is dissolving. **The bottleneck on ambition has shifted from resources to imagination.**

The question is no longer "can I build this?" It is "should I?" and "what exactly?" Those are the questions that taste, judgment, and conviction were made for.

But this new leverage creates a new problem. The moment you go from directing one AI agent to directing fifty, you discover something nobody warned you about: **agents are not employees and they are not code.** You cannot manage them with HR policies — they have no loyalty, no institutional memory unless you build it, no self-preservation instinct. You cannot validate them with traditional software tests — they are non-deterministic, they hallucinate, they drift. [36.7% of 7,000+ MCP servers](https://spec.modelcontextprotocol.io) are vulnerable to SSRF attacks. The [ClawHavoc campaign](https://www.cisco.com/) discovered 1,184 malicious skills targeting agent ecosystems. [Only 29% of organizations](https://www.gartner.com/) feel ready to deploy agents securely. Agents are an entirely new category of resource, and governing them requires a framework designed from first principles for how they actually behave. The person who gains leverage through agents but does not govern them is not empowered — they are exposed.

So here is the full picture. Not a sequence of games. One coherent reality:

The value of doing things has collapsed. The value of knowing which things to do has exploded. The power of a single person with vision has increased by an order of magnitude. And the people who will define this era are the ones who have the taste to see what is worth building, the judgment to build it right, the conviction to build it at all — and the discipline to govern the agents that build it with them.

Do not let any of this make you forget: **some things are worth doing even when they produce no value at all.** A person who writes code because they love writing code has not been decimated by AI. The satisfaction of solving a puzzle, the flow state, the quiet pleasure of making something work — AI did not take that. AI cannot take that. You can still build a chair with hand tools even though factories exist. The market changes what it will pay you for. It does not change what is worth doing with your time on earth.

Adapt professionally. Build ambitiously. Govern carefully. And do not let a market correction in the value of execution trick you into believing that execution was never meaningful.

-----

## Sources

- [GitHub Octoverse 2025 — 41% of code AI-generated](https://github.blog/news-insights/octoverse/octoverse-2025/)
- [Stack Overflow Developer Survey 2025 — 92% use AI tools](https://survey.stackoverflow.co/2025/)
- [Anthropic — Claude Opus 4.6 benchmarks](https://www.anthropic.com/claude)
- [OpenAI — GPT-5.4 OSWorld results](https://openai.com/index/gpt-5-4/)
- [DeepSeek IMO/IOI gold medals](https://arxiv.org/abs/2501.12948)
- [Epoch AI — AI scaling limits research](https://epoch.ai/blog/can-ai-scaling-continue-through-2030)
- [DeepSeek V3.2 pricing](https://api-docs.deepseek.com/news/news250220)
- [NPR — DeepSeek market selloff](https://www.npr.org/2025/01/27/nx-s1-5276097/wall-street-stock-markets-tumble-deepseek-ai-tech-stock)
- [MarketMinute — Claude Cowork SaaSpocalypse](https://markets.financialcontent.com/stocks/article/marketminute-2026-2-6-anthropics-claude-cowork-release-triggers-285-billion-saaspocalypse-a-brutal-wake-up-call-for-legacy-tech-and-finance)
- [TechCrunch — Spotify Honk system](https://techcrunch.com/2026/02/12/spotify-says-its-best-developers-havent-written-a-line-of-code-since-december-thanks-to-ai/)
- [Builder.io — Codex vs Claude Code](https://www.builder.io/blog/codex-vs-claude-code)
- [Bloomberg — AI coding agents productivity panic](https://www.bloomberg.com/news/articles/2026-02-26/ai-coding-agents-like-claude-code-are-fueling-a-productivity-panic-in-tech)
- [BLS — U.S. Productivity Data](https://www.bls.gov/news.release/prod2.nr0.htm)
- [Wikipedia — Productivity paradox / Solow paradox](https://en.wikipedia.org/wiki/Productivity_paradox)
- [Daron Acemoglu / NBER — AI productivity estimates](https://www.nber.org/papers/w32487)
- [Goldman Sachs — Generative AI GDP impact](https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent)
- [McKinsey — State of AI 2025](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai)
- [OpenAI — Enterprise AI 2025 report](https://openai.com/index/the-state-of-enterprise-ai-2025-report/)
- [BCG — AI agents in healthcare](https://www.bcg.com/publications/2026/how-ai-agents-will-transform-health-care)
- [Google — Data Science Agent at Lawrence Berkeley](https://blog.google/technology/google-deepmind/data-science-agent/)
- [CrewAI — 1.7B workflow analysis](https://www.crewai.com/)
- [GitHub — AGENTS.md lessons from 2,500 repositories](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/)
- [GitHub — Context engineering and agentic primitives](https://github.blog/ai-and-ml/github-copilot/how-to-build-reliable-ai-workflows-with-agentic-primitives-and-context-engineering/)
- [ICSE 2026 JAWs Study](https://conf.researchr.org/home/icse-2026)
- [Salesforce — Agentforce](https://www.salesforce.com/agentforce/)
- [Intercom — AI agents in production](https://www.intercom.com/blog/ai-agents/)
- [Anthropic — Claude security research](https://www.anthropic.com/research/claude-4-6-security)
- [OpenAI — GPT-5.2 Pro](https://openai.com/index/gpt-5-2/)
- [OpenAI — GPT-5 Pro for science](https://openai.com/index/gpt-5-pro-for-science/)
- [Perplexity — Deep Research](https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research)
- [AI Scientist-v2](https://arxiv.org/abs/2408.06292)
- [OpenAI — Codex Security Agent](https://openai.com/index/codex-security/)
- [Windsurf / Codeium](https://codeium.com/windsurf)
- [VentureBeat — Claude Cowork](https://venturebeat.com/orchestration/anthropic-says-claude-code-transformed-programming-now-claude-cowork-is)
- [MCP Specification — security vulnerabilities](https://spec.modelcontextprotocol.io)
- [Wired — AI agent security risks](https://www.wired.com/story/ai-agent-security-risks/)
