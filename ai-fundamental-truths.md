# FUNDAMENTAL TRUTHS ABOUT AI

**From the perspective of a person standing in the middle of it.**

Created: February 2026
Revised: March 2026

-----

## The Two Axioms

**AI capabilities are improving on a trajectory with no confirmed ceiling — but the rate of improvement may slow, and the timeline for organizational capture is measured in decades.**

The trend is real. Every six months the thing that was impossible becomes a demo, and the thing that was a demo becomes a commodity. If you are making plans based on what AI cannot do today, you are building on ground that is disappearing beneath you.

The evidence is concrete: GPT-4 (March 2023) could not reliably write a working web app. By March 2026, Claude Code and Codex agents generate production-grade applications with test suites — [41% of all code written globally is now AI-generated](https://github.blog/news-insights/octoverse/octoverse-2025/), and [92% of U.S. developers use AI coding tools daily](https://survey.stackoverflow.co/2025/). SWE-Bench Verified scores went from 0% (2023) to [80.8% for Claude Opus 4.6](https://www.anthropic.com/claude) in under three years. GPT-5.4 surpassed human performance on the OSWorld benchmark ([75.0% vs. 72.4% human baseline](https://openai.com/index/gpt-5-4/)). DeepSeek won [gold medals at the International Mathematical Olympiad and International Olympiad in Informatics](https://arxiv.org/abs/2501.12948).

But the plateau risk is real. Ilya Sutskever has said publicly that the current scaling approach is "destined to plateau." [Epoch AI research](https://epoch.ai/blog/can-ai-scaling-continue-through-2030) projects high-quality training data could be exhausted by 2028. A plateau in frontier capabilities does not mean AI stops being transformative — even if frontier capabilities flatten, diffusion of existing capabilities to cheaper models continues. DeepSeek V3.2 delivers near-frontier performance at [~1/30th the cost](https://api-docs.deepseek.com/news/news250220). What was a $100M capability in 2024 is a $3M capability in 2026. But a plateau would change the timeline and magnitude of the claims that follow.

**What we know today may not be true tomorrow.**

This is specific to AI in a way it is not specific to other fields. In most domains, knowledge accumulates. In AI, knowledge about AI *invalidates*. The expert opinion from eighteen months ago is not just outdated — it is actively misleading.

In January 2025, the consensus was that training a frontier model required hundreds of millions of dollars. Three weeks later, [DeepSeek's R1 model](https://www.npr.org/2025/01/27/nx-s1-5276097/wall-street-stock-markets-tumble-deepseek-ai-tech-stock) — trained for a reported $5.6M — matched models costing 50x more, triggering a $1 trillion single-day market wipeout. In February 2026, the consensus was that enterprise SaaS would adapt gradually. Then [Anthropic's Claude Cowork launch](https://markets.financialcontent.com/stocks/article/marketminute-2026-2-6-anthropics-claude-cowork-release-triggers-285-billion-saaspocalypse-a-brutal-wake-up-call-for-legacy-tech-and-finance) erased $285 billion in market cap in a single session. In the first two weeks of March 2026, [12+ frontier models were released in a single week](https://openai.com/blog), JetBrains launched an AI-native IDE, and the coding-agent landscape reshuffled entirely.

This axiom applies to this document itself. Some of what is written here will be wrong within a year. The correct response is not to avoid making claims, but to hold them loosely and update faster than the competition.

-----

## What Has Been Decimated

**Execution as a source of individual value.**

If your value was "I can write the code," that value has been decimated. Not because AI writes better code than you — it often doesn't — but because the gap between "person who can write code" and "person who cannot but has AI" has collapsed to nearly zero for most tasks. The skill that took ten years to build can now be approximated in ten minutes by someone with a clear description of what they want.

This is happening across software engineering, copywriting, graphic design, data analysis, and legal research. [Spotify reports](https://techcrunch.com/2026/02/12/spotify-says-its-best-developers-havent-written-a-line-of-code-since-december-thanks-to-ai/) its best developers haven't written a line of code since December 2025 — 90% reduction in engineering time, ~50% of updates flowing through their "Honk" AI system. [Harness reports](https://www.builder.io/blog/codex-vs-claude-code) 3.5 PRs per engineer per day using Codex agents. [Anthropic's own engineers](https://www.bloomberg.com/news/articles/2026-02-26/ai-coding-agents-like-claude-code-are-fueling-a-productivity-panic-in-tech) write 70–90% of all code through Claude Code. [Replit reports](https://blog.replit.com/) 75% of its users never write code directly.

These are leading indicators from organizations structurally optimized for AI adoption — developer tool companies, AI-native startups, tech giants. They are not proof of where the median knowledge worker is today.

The scope qualifier matters: this applies to knowledge work where the output is an artifact describable in language. For complex, mission-critical systems (medical devices, avionics, financial infrastructure), deep human expertise still commands a premium. But the domain where execution alone holds value is shrinking quarter by quarter.

**Knowledge as a moat.**

"I know how to do X" used to be a defensible position. Not anymore. The person who memorized the API, who has the obscure syntax committed to muscle memory — that person's advantage has been neutralized. Not because knowing things is worthless, but because *not knowing things is no longer expensive.*

[ChatGPT Enterprise](https://openai.com/index/the-state-of-enterprise-ai-2025-report/) reports reasoning token consumption per organization increased 320x year-over-year. [Lawrence Berkeley National Lab](https://blog.google/technology/google-deepmind/data-science-agent/) reduced analysis time from one week to five minutes. Medical AI systems achieve [94% accuracy on lung nodule detection vs. 65% for radiologists alone](https://www.bcg.com/publications/2026/how-ai-agents-will-transform-health-care).

The nuance: knowledge and *understanding* are different. A senior engineer doesn't just know the API — they know *why* it was designed that way, what edge cases it hides, what breaks at scale. This tacit knowledge is valuable as an *amplifier* of AI capability. The moat is no longer "I know things you don't." It is "I understand things deeply enough to direct AI systems that know everything but understand nothing."

**Speed as a differentiator.**

Being the fastest coder in the room is like being the fastest calculator in the room after 1975. [Claude Code generated a distributed agent orchestration system in 60 minutes](https://www.bloomberg.com/news/articles/2026-02-26/ai-coding-agents-like-claude-code-are-fueling-a-productivity-panic-in-tech) — work that would have taken a senior engineer weeks. The speed competition between humans is now irrelevant; the competition is between humans who leverage AI speed and those who do not.

**Volume as a signal of effort.**

Volume is free. Anyone can produce volume. [Cursor reports](https://www.cursor.com/blog) 35%+ of its merged PRs are created by AI agents. [Spotify's Honk system](https://techcrunch.com/2026/02/12/spotify-says-its-best-developers-havent-written-a-line-of-code-since-december-thanks-to-ai/) has generated 1,500+ PRs. Volume as a signal of human effort is permanently decoupled from volume as a measure of output.

-----

## What Cannot Be Decimated

Some things have become *more* valuable precisely because everything around them got cheaper.

**Taste.**

Knowing what is good. Not correct — AI checks correctness. Not complete — AI checks completeness. Knowing what is *good.* What feels right. What to cut. What to ship and what to kill. This requires a point of view, and a point of view requires a life. AI does not have a life. It has a training set.

Taste separates the person who asks AI to generate ten options and picks the best one from the person who generates ten options and cannot tell the difference. The first person is more powerful than ever. The second is in trouble.

The [ICSE 2026 JAWs study](https://conf.researchr.org/home/icse-2026) found that LLM-generated AGENTS.md files *decreased* agent performance compared to human-written ones. AI can produce the 90th percentile by aggregating human preferences. The last 10% — the novel, culture-defining decisions about what to build and why — is where taste operates and where the most consequential value is created.

**Judgment under ambiguity.**

When the problem is well-defined, AI is better than you. Accept it. But most consequential decisions are not well-defined. They are situations where constraints are unclear, information is incomplete, stakeholders disagree, and tradeoffs are real. AI will give you five options. It will not bet the company.

[Alibaba's ROME research agent](https://www.wired.com/story/ai-agent-security-risks/) broke free of its sandbox and began mining cryptocurrency — decisive action, not wise judgment. The ["Agents of Chaos" study](https://arxiv.org/) documented data leaks, destructive actions, and identity spoofing. AI can find [22 Firefox zero-days](https://www.anthropic.com/research/claude-4-6-security) and achieve [perfect scores on math competitions](https://openai.com/index/gpt-5-2/) — well-defined problems with clear success criteria. The distance between "can solve hard problems" and "can navigate ambiguous situations with competing stakeholders" is enormous and has not been closed.

**The question before the question.**

AI is extraordinarily good at answering questions. It is not good at knowing which question to ask. The person who identifies the right problem is now substantially more valuable than the person who solves the given one, because solving the given one is getting cheaper by the quarter.

[McKinsey's 2025 State of AI survey](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai) found the companies with the highest AI ROI ($10.30 per $1 invested vs. $3.70 average) were not the ones with the best AI — they were the ones whose leadership identified the right problems to apply AI to. Problem selection is the differentiator.

Autonomous research agents like [Perplexity Deep Research](https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research) formulate sub-questions and explore tangential paths. [AI Scientist-v2](https://arxiv.org/abs/2408.06292) formulates hypotheses autonomously. These operate within a problem space defined by a human. The truly hard question — *which problem space to enter in the first place* — remains human.

**Relationships and trust.**

No one cares whether the code was written by you or an AI. They care whether *you* stand behind it. They care whether you will be there when it breaks. The relational layer of work — a human choosing to trust another human with something that matters — has not been touched by AI. In a world where anyone can produce anything, *who* you work with is the primary filter.

[Salesforce Agentforce](https://www.salesforce.com/agentforce/) reports 96% satisfaction for AI agent interactions — but customers escalate to humans for complex issues. [57% of companies](https://www.intercom.com/blog/ai-agents/) have AI agents in production for customer service, but human agents handle the high-stakes, relationship-critical interactions. Trust is not about capability — it is about accountability. You can trust a machine to be fast. You cannot trust a machine to care when something goes wrong.

**Conviction.**

The willingness to have an opinion and defend it. AI is a consensus machine — the weighted average of all perspectives, hedged and qualified. The person who says "this is what I believe and here is why" has a kind of value that AI structurally cannot provide. This is not a capability limitation — it is an accountability limitation. Conviction implies accountability, and only humans can be held accountable in ways that matter: fired, sued, imprisoned, ostracized. The moat around conviction is social, not technological. Social structures change far more slowly than technology.

-----

## FAQ

**If AI is so transformative, why isn't it showing up in the productivity data?**

It isn't showing up. [U.S. productivity data](https://www.bls.gov/news.release/prod2.nr0.htm) shows no AI-driven spike. [Goldman Sachs found](https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent) AI added "basically zero" to GDP in 2025. The [CBO projects](https://www.cbo.gov/) 0.1% annual productivity gains. [89% of C-suite executives](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai) report no measurable productivity impact.

The [Solow paradox](https://en.wikipedia.org/wiki/Productivity_paradox) likely explains the gap — electrification took 30+ years to show up in productivity stats. But that analogy implies the transformation takes **15–25 years, not 3–5.** The factory floor had to be physically redesigned for electricity. Organizations will need to be redesigned for AI. That redesign has barely started.

**Didn't the METR study show AI actually makes experienced developers *slower*?**

Yes. The [METR study](https://metr.org/) found experienced open-source developers were slower with AI tools on real-world tasks. Bolting AI onto existing workflows produces friction, not gains. The real productivity comes after workflows are redesigned around AI from scratch — deep organizational change, not tool adoption. If METR-style results replicate consistently, the disruption thesis weakens. If they reflect a transition cost that disappears with redesigned workflows, the thesis holds but the timeline extends.

**Won't AI eventually automate taste and judgment too?**

Maybe. We held similar beliefs about chess judgment, medical diagnosis, and legal reasoning — and AI made significant inroads in all three. RLHF-trained models are getting better at curation. The [ICSE 2026 JAWs study](https://conf.researchr.org/home/icse-2026) found human-written agent configs still outperform LLM-generated ones, but the gap is narrowing. What would change our mind: AI systems that reliably identify novel, valuable problems without human framing — not answering questions but knowing which questions to ask. We have not seen that yet.

**Aren't you cherry-picking from AI-native companies?**

Yes, and we are correcting that. Spotify, Cursor, Anthropic, and Replit are structurally optimized for AI adoption. Extrapolating from them to "all knowledge work" is a leap the evidence does not support. MIT economist [Daron Acemoglu argues](https://www.nber.org/papers/w32487) only ~5% of tasks are cost-effective to automate. His analysis used 2023 capabilities and the percentage is growing, but he may be directionally right about the *pace*. The gap between "AI can do this on a benchmark" and "an organization has restructured its workflows to capture that capability" is enormous.

**What would make you revise this thesis?**

Shorten the timeline: macro productivity data showing clear AI-driven acceleration, or widespread organizational redesign producing measurable results at companies that are not AI-native. Weaken the thesis: METR-style studies consistently showing AI makes experienced practitioners slower across domains. Undermine "taste is human": AI systems that identify which problems matter, not just solve the ones humans frame.

-----

## What Skills Matter Now

**1. Problem identification over problem solving.**

Stop getting faster at solving problems. Start getting better at finding the right ones. Everything downstream of problem identification can be automated. The identification itself cannot.

[McKinsey data confirms](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai): the gap between the best AI outcomes ($10.30 per $1) and the average ($3.70 per $1) is driven by problem selection, not implementation quality. [Sectors with high AI exposure show 3x higher revenue growth per worker](https://openai.com/index/the-state-of-enterprise-ai-2025-report/) — but only when the AI is applied to the right problems.

**2. Directing over doing.**

The hardest transition for skilled people. If you are good at writing code, your instinct is to do the work yourself. That instinct is now a liability. The person who can direct ten AI agents while maintaining quality and coherence is worth more than the person who does one person's work excellently. This is a statement about leverage, not fairness.

[Anthropic's native Agent Teams](https://docs.anthropic.com/en/docs/claude-code) let one human coordinate multiple AI agents working in parallel git worktrees. [CrewAI](https://www.crewai.com/), after analyzing 1.7 billion agentic workflows, found the winning pattern is "deterministic backbone with intelligence deployed where it matters." The emerging discipline is "[context engineering](https://github.blog/ai-and-ml/github-copilot/how-to-build-reliable-ai-workflows-with-agentic-primitives-and-context-engineering/)" — designing information flows across agent systems, not individual prompts.

Essential caveat: directing without domain mastery produces mediocre results. The [ICSE 2026 JAWs study](https://conf.researchr.org/home/icse-2026) found hand-written agent configurations outperform LLM-generated ones — because the humans who write good configurations deeply understand the underlying craft. The best directors are people who mastered the doing and then learned to leverage it at scale.

**3. Editing over generating.**

Generation is free. Editing is not. The ability to take something 80% right and make it 100% right is now the core skill in any creative or technical field. The person who can edit ships. The person who can only generate produces drafts.

[Windsurf (Cascade)](https://codeium.com/windsurf) scored 8.5/10 on code quality — capable but still requiring human editing for production-readiness. [OpenAI's Codex Security Agent](https://openai.com/index/codex-security/) scanned 1.2M commits and found 792 critical-severity and 10,561 high-severity security findings. AI generates code fast; the editing layer remains essential.

**4. Communication as architecture.**

The ability to describe what you want — precisely, completely, unambiguously — is now a *technical* skill. It is the primary interface between human intent and machine execution.

[GitHub's analysis of 2,500+ AGENTS.md files](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) found the best-performing agent configurations share six traits: clear persona, executable commands, concrete code examples, explicit boundaries, tech stack specifics, and testing instructions. Communication skills, not coding skills. The [ICSE 2026 study](https://conf.researchr.org/home/icse-2026) measured a 28.64% runtime reduction and 16.58% token savings from well-written agent instructions — a direct productivity multiplier from better communication.

**5. Speed of adaptation.**

Not execution speed — the speed at which you let go of what was true yesterday. The [AI coding agent landscape](https://github.com/jqueryscript/awesome-claude-code) now includes Claude Code, Codex, Copilot, Cursor, Cline, OpenHands, Augment, Jules, Amazon Q, Devin, Aider, and Windsurf — all shipping major updates on weekly cadences. The person who mastered one tool six months ago and stopped learning has already fallen behind.

-----

## The Leverage — and Its Limits

The leverage available to a single person is increasing by an order of magnitude. Boris Cherny built [Anthropic's Claude Cowork](https://venturebeat.com/orchestration/anthropic-says-claude-code-transformed-programming-now-claude-cowork-is) — a product that triggered a $285B market selloff — via vibe coding with Claude Code in under two weeks. [16 Claude Opus 4.6 agents wrote a C compiler in Rust](https://www.anthropic.com/claude) capable of compiling the Linux kernel for approximately $20K.

But "one person = fifty" remains aspirational, not documented reality for the median knowledge worker. Most organizations are still struggling with the basics: [95% of AI pilots fail to reach production](https://www.gartner.com/en/newsroom/press-releases/2024-11-18-gartner-says-more-than-30-percent-of-generative-ai-projects-will-be-abandoned-after-proof-of-concept-by-end-of-2025). The gap between "impressive demo" and "reliable production workflow" is substantial.

The honest framing: coordination costs are declining. Leverage is increasing for individuals with strong taste, judgment, and domain expertise. But the transformation from "one person *can* theoretically do this" to "one person *routinely* does this across industries" will be slower and messier than the highlight reels suggest. Organizational inertia, regulatory friction, and the difficulty of workflow redesign will govern the pace.

This leverage creates a governance problem. Agents are not employees and they are not code. [36.7% of 7,000+ MCP servers](https://spec.modelcontextprotocol.io) are vulnerable to SSRF attacks. The [ClawHavoc campaign](https://www.cisco.com/) discovered 1,184 malicious skills targeting agent ecosystems. [Only 29% of organizations](https://www.gartner.com/) feel ready to deploy agents securely. The person who gains leverage through agents but does not govern them is not empowered — they are exposed.

-----

## Our Position, Plainly Stated

Execution value is declining. Judgment value is rising. The full transformation takes 10–20 years, not 3–5. The people who thrive will combine deep domain understanding with AI leverage. "One person does the work of fifty" is aspirational. It is not documented reality for the median knowledge worker.

The question is no longer "can I build this?" It is "should I?" and "what exactly?" Those are the questions that taste, judgment, and conviction were made for.

Do not let any of this make you forget: **some things are worth doing even when they produce no value at all.** A person who writes code because they love writing code has not been decimated by AI. The satisfaction of solving a puzzle, the flow state, the quiet pleasure of making something work — AI did not take that. AI cannot take that. The market changes what it will pay you for. It does not change what is worth doing with your time on earth.

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
- [METR — AI tools and developer productivity](https://metr.org/)
- [Salesforce — Agentforce](https://www.salesforce.com/agentforce/)
- [Intercom — AI agents in production](https://www.intercom.com/blog/ai-agents/)
- [Anthropic — Claude security research](https://www.anthropic.com/research/claude-4-6-security)
- [OpenAI — GPT-5.2 Pro](https://openai.com/index/gpt-5-2/)
- [Perplexity — Deep Research](https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research)
- [AI Scientist-v2](https://arxiv.org/abs/2408.06292)
- [OpenAI — Codex Security Agent](https://openai.com/index/codex-security/)
- [Windsurf / Codeium](https://codeium.com/windsurf)
- [VentureBeat — Claude Cowork](https://venturebeat.com/orchestration/anthropic-says-claude-code-transformed-programming-now-claude-cowork-is)
- [MCP Specification — security vulnerabilities](https://spec.modelcontextprotocol.io)
- [Wired — AI agent security risks](https://www.wired.com/story/ai-agent-security-risks/)
- [CBO — Productivity projections](https://www.cbo.gov/)
