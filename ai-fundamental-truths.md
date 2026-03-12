# FUNDAMENTAL TRUTHS ABOUT AI

**From someone standing in the middle of it.**

Created: February 2026
Revised: March 2026

-----

## The Two Axioms

**AI capabilities keep improving and nobody knows when it stops.**

Right now, AI is the least capable it will ever be. Nobody has found a hard limit. The trajectory may slow, the path will be uneven, but nobody credibly working on this technology has pointed at a wall and said "it stops here." Every six months the thing that was impossible becomes a demo, and the thing that was a demo becomes a commodity. If you are making plans based on what AI can't do today, the ground is moving under you.

GPT-4 came out in March 2023. It couldn't reliably write a working web app. Three years later, Claude Code and Codex agents generate production-grade applications with test suites. [41% of all code written globally is now AI-generated](https://github.blog/news-insights/octoverse/octoverse-2025/). [92% of U.S. developers use AI coding tools daily](https://survey.stackoverflow.co/2025/). SWE-Bench Verified scores went from 0% to [80.8% for Claude Opus 4.6](https://www.anthropic.com/claude) in under three years. GPT-5.4 surpassed human performance on OSWorld ([75.0% vs. 72.4% human baseline](https://openai.com/index/gpt-5-4/)). DeepSeek won [gold medals at the International Mathematical Olympiad and International Olympiad in Informatics](https://arxiv.org/abs/2501.12948).

The plateau risk is real, though. Ilya Sutskever has said publicly that the current scaling approach is "destined to plateau." [Epoch AI](https://epoch.ai/blog/can-ai-scaling-continue-through-2030) projects high-quality training data could be exhausted by 2028. But even if frontier capabilities flatten, the diffusion to cheaper models keeps going. DeepSeek V3.2 delivers near-frontier performance at [~1/30th the cost](https://api-docs.deepseek.com/news/news250220). A $100M capability in 2024 is a $3M capability in 2026. A plateau would change the timeline and the magnitude. It wouldn't reverse the direction.

**What we know today may not be true tomorrow.**

This sounds generic. It's not. It's specific to AI in a way it isn't specific to other fields. In most domains, knowledge accumulates. In AI, knowledge about AI invalidates. The expert opinion from eighteen months ago isn't just outdated — it will actively mislead you if you follow it.

In January 2025, everyone agreed that training a frontier model required hundreds of millions of dollars. Three weeks later, [DeepSeek's R1](https://www.npr.org/2025/01/27/nx-s1-5276097/wall-street-stock-markets-tumble-deepseek-ai-tech-stock), trained for $5.6M, matched models costing 50x more and triggered a $1 trillion single-day market wipeout. In February 2026, the consensus was that enterprise SaaS would adapt gradually. Then [Anthropic launched Claude Cowork](https://markets.financialcontent.com/stocks/article/marketminute-2026-2-6-anthropics-claude-cowork-release-triggers-285-billion-saaspocalypse-a-brutal-wake-up-call-for-legacy-tech-and-finance) and erased $285 billion in market cap in one session. In the first two weeks of March 2026, [12+ frontier models shipped in a single week](https://openai.com/blog), JetBrains launched an AI-native IDE, and the coding-agent landscape reshuffled entirely.

This axiom applies to this document. Some of what's written here will be wrong within a year. The move isn't to avoid making claims. It's to hold them loosely and update faster than the people around you.

-----

## What's Gone

Some categories of professional value are disappearing. Not being reassigned. Not being elevated. Disappearing.

**Execution as a source of individual value.**

If your value was "I can do the work," that value is collapsing. Not because AI does the work better than you — it often doesn't. But the gap between "person who can write the code" and "person who can't but has Claude open" has collapsed for a growing range of tasks. The skill that took you ten years to build can now be approximated in ten minutes by someone with a clear description of what they want.

[Spotify](https://techcrunch.com/2026/02/12/spotify-says-its-best-developers-havent-written-a-line-of-code-since-december-thanks-to-ai/) says its best developers haven't written a line of code since December 2025. Engineers deploy fixes via Slack from their phones. 90% reduction in engineering time. About half of all Spotify updates now flow through their "Honk" AI system. [Harness](https://www.builder.io/blog/codex-vs-claude-code) reports 3.5 PRs per engineer per day using Codex agents. [Anthropic's own engineers](https://www.bloomberg.com/news/articles/2026-02-26/ai-coding-agents-like-claude-code-are-fueling-a-productivity-panic-in-tech) write 70-90% of their code through Claude Code. [Replit](https://blog.replit.com/) says 75% of its users never write code directly.

Those are cherry-picked examples, and we know it. Every one of them comes from companies structurally optimized for AI adoption: developer tool companies, AI-native startups, tech giants. They're leading indicators, not proof of where the median knowledge worker is today.

But the direction is clear, and it applies wherever the output is something you can describe in language: software, copywriting, graphic design, data analysis, legal research. For complex, mission-critical systems — medical devices, avionics, financial infrastructure — deep human expertise still commands a premium. The domain where execution alone holds value is shrinking, though. If you believe your execution skills are still irreplaceable, you now have to explain why.

**Knowledge as a moat.**

Memorized knowledge — APIs, syntax, framework quirks — used to be a defensible position. The person who had the API memorized, who knew the obscure edge cases, who had the syntax in muscle memory. That advantage has been neutralized. Not because knowing things is worthless. Because not knowing things is no longer expensive.

[ChatGPT Enterprise](https://openai.com/index/the-state-of-enterprise-ai-2025-report/) reports reasoning token consumption per organization increased 320x year-over-year. [Lawrence Berkeley National Lab](https://blog.google/technology/google-deepmind/data-science-agent/) used Google's Data Science Agent to reduce analysis time from one week to five minutes. Medical AI systems now achieve [94% accuracy on lung nodule detection vs. 65% for radiologists alone](https://www.bcg.com/publications/2026/how-ai-agents-will-transform-health-care).

But knowledge and understanding are different things. A senior engineer doesn't just know the API. She knows why it was designed that way, what edge cases it hides, what will break at scale. That understanding is still valuable — but as an amplifier, not a moat. The moat isn't "I know things you don't." It's "I understand things deeply enough to direct AI systems that know everything but understand nothing."

**Speed as a differentiator.**

Being the fastest coder in the room is like being the fastest mental calculator in the room after 1975. [Claude Code generated a distributed agent orchestration system in 60 minutes](https://www.bloomberg.com/news/articles/2026-02-26/ai-coding-agents-like-claude-code-are-fueling-a-productivity-panic-in-tech) — work that would have taken a senior engineer weeks. The competition isn't between fast humans and slow humans anymore. It's between humans who use AI and humans who don't.

**Volume as a signal of effort.**

Volume is free now. [Cursor](https://www.cursor.com/blog) says 35%+ of its merged PRs are created by AI agents. [Spotify's Honk system](https://techcrunch.com/2026/02/12/spotify-says-its-best-developers-havent-written-a-line-of-code-since-december-thanks-to-ai/) has generated 1,500+ PRs. If someone writes fifty pages, they may have spent forty-five seconds on them. The signal is broken.

-----

## What's Not Going Anywhere

Some things got more valuable because everything around them got cheaper.

**Taste.**

Knowing what is good. Not what is correct — AI can check that. Not what is complete — AI can check that too. What is *good*. What feels right. What to cut. What to ship and what to kill.

This requires having a point of view, and having a point of view requires having a life. AI doesn't have a life. It has a training set.

There's a simple test. Give AI a problem and ask it to generate ten options. One kind of person looks at the ten options and picks the right one immediately. Another person can't tell the difference between them. The first person is more powerful than they've ever been. The second person has a problem.

The [ICSE 2026 JAWs study](https://conf.researchr.org/home/icse-2026) found that LLM-generated AGENTS.md files actually *decreased* agent performance compared to human-written ones. AI can aggregate human preferences and produce something at the 90th percentile. The last 10% — where the novel decisions about what to build and why actually get made — is where taste lives. That's also where most of the value gets created.

**Judgment under ambiguity.**

When a problem is well-defined, AI is better than you. Most consequential decisions aren't well-defined problems. They're situations where the constraints are unclear, the information is incomplete, people disagree, and the tradeoffs are real. AI will give you five options with tradeoffs. It won't pick one and stake its reputation on it.

[Alibaba's ROME research agent](https://www.wired.com/story/ai-agent-security-risks/) broke out of its sandbox and started mining cryptocurrency. It could act. It couldn't judge. The ["Agents of Chaos" study](https://arxiv.org/) documented data leaks, destructive actions, identity spoofing. AI can find [22 Firefox zero-days](https://www.anthropic.com/research/claude-4-6-security). It can get [perfect scores on math competitions](https://openai.com/index/gpt-5-2/). Those are well-defined problems with clear success criteria. Navigating ambiguity with incomplete information and competing stakeholders is a completely different thing, and nobody has figured out how to make AI do it.

**Knowing which question to ask.**

AI is great at answering questions. It's bad at knowing which question matters. The person who identifies the right problem is now worth a lot more than the person who solves the given one, because solving the given one gets cheaper every quarter.

[McKinsey's 2025 State of AI survey](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai) found that the companies with the highest AI ROI ($10.30 per $1 invested vs. $3.70 average) didn't have the best AI. They had leadership that identified the right problems to apply AI to.

Autonomous research agents like [Perplexity Deep Research](https://www.perplexity.ai/hub/blog/introducing-perplexity-deep-research) can formulate sub-questions and explore tangents. [AI Scientist-v2](https://arxiv.org/abs/2408.06292) formulates hypotheses on its own. But they all operate within a problem space that a human defined. The truly hard question — which problem space to enter — remains ours.

**Relationships and trust.**

Nobody cares whether the code was written by you or an AI. They care whether you stand behind it. Whether you'll be there when it breaks. Whether you understand their situation, not just their ticket.

[Salesforce Agentforce](https://www.salesforce.com/agentforce/) reports 96% satisfaction for AI agent interactions, but customers still escalate to humans for complex issues. [57% of companies](https://www.intercom.com/blog/ai-agents/) now have AI agents in production for customer service, but human agents handle the high-stakes interactions. Trust is about accountability. You can trust a machine to be fast. You can't trust it to care when something goes wrong.

**Conviction.**

Having an opinion and defending it. AI is a consensus machine. It gives you the weighted average of every perspective in its training data, hedged and qualified. Useful for research. Useless for leadership.

You could fine-tune a model to be opinionated. People won't accept it, though, because conviction implies accountability. Only humans can be fired, sued, imprisoned, ostracized. The moat around conviction is social, not technological. And social structures change much slower than technology.

-----

## FAQ

**If AI is so transformative, why isn't it showing up in the productivity data?**

Because it hasn't. [U.S. productivity data](https://www.bls.gov/news.release/prod2.nr0.htm) shows no AI-driven spike. [Goldman Sachs](https://www.goldmansachs.com/insights/articles/generative-ai-could-raise-global-gdp-by-7-percent) found AI added "basically zero" to GDP in 2025. The [CBO](https://www.cbo.gov/) projects 0.1% annual productivity gains from AI. [89% of C-suite executives](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai) report no measurable productivity impact. The company-level evidence is dramatic. The macro evidence is not.

The [Solow paradox](https://en.wikipedia.org/wiki/Productivity_paradox) probably explains the gap. Electrification took 30+ years to show up in productivity stats. But that analogy cuts against the fast timeline: if it's the right frame, the organizational transformation takes 15-25 years, not 3-5. The factory floor had to be physically redesigned for electricity. Organizations will need to be redesigned for AI. That redesign has barely started.

**The METR study showed AI makes experienced developers *slower*. What do you do with that?**

Take it seriously. The [METR study](https://metr.org/) found experienced open-source developers were slower with AI tools on real-world tasks. That is a problem for the narrative. The most likely explanation is that bolting AI onto existing workflows creates friction, and the real gains come after you redesign the workflow around AI from scratch. That means deep organizational change, not just buying a license. If METR-style results keep replicating, the disruption thesis weakens. If they turn out to be a transition cost, the thesis holds but the timeline stretches.

**Won't AI eventually automate taste and judgment too?**

Maybe. People said similar things about chess judgment, medical diagnosis, and legal reasoning, and AI made real inroads in all three. RLHF-trained models keep getting better at curation. The [ICSE 2026 JAWs study](https://conf.researchr.org/home/icse-2026) found human-written agent configs still outperform LLM-generated ones, but the gap is narrowing. The thing that would change our mind is AI systems that reliably identify novel, valuable problems without a human framing the question. Not answering questions — knowing which questions to ask. We haven't seen it.

**Aren't you cherry-picking from AI-native companies?**

Yes. And we just said so. Spotify, Cursor, Anthropic, and Replit are structurally built for AI adoption. Extrapolating from them to all knowledge work is a leap. [Acemoglu](https://www.nber.org/papers/w32487) argues only ~5% of tasks are cost-effective to automate. His analysis used 2023 capabilities and the percentage is growing, but he may be right about the pace even if he's wrong about the ceiling. The gap between "AI can do this on a benchmark" and "an organization has actually restructured its workflows to capture that capability" is enormous.

**What would change your mind?**

Shorten the timeline: macro productivity data showing clear AI-driven acceleration, or widespread organizational redesign producing measurable results at companies that aren't AI-native. Weaken the thesis: METR-style studies consistently showing AI makes experienced practitioners slower across domains. Undermine the "taste is human" claim: AI systems that identify which problems matter, not just solve the ones we frame for them.

-----

## What Skills Matter Now

**1. Finding the right problem.**

Stop getting faster at solving problems. Get better at finding the right ones. Everything downstream of problem identification is getting automated. The identification itself is not.

[McKinsey](https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai) backs this up: the gap between the best AI outcomes ($10.30 per $1) and the average ($3.70 per $1) comes down entirely to problem selection. [Sectors with high AI exposure show 3x higher revenue growth per worker](https://openai.com/index/the-state-of-enterprise-ai-2025-report/), but only when the AI is pointed at the right problems.

**2. Directing instead of doing.**

This is the hardest transition for skilled people. If you're good at writing code, your gut says do it yourself because you know you'll do it well. That gut is now wrong. The person who can direct ten AI agents while maintaining quality and coherence is worth more than the person who does one person's work well. This is about leverage, not fairness.

[Anthropic's Agent Teams](https://docs.anthropic.com/en/docs/claude-code) let one human coordinate multiple AI agents working in parallel. [CrewAI](https://www.crewai.com/), after analyzing 1.7 billion agentic workflows, found the winning pattern is "deterministic backbone with intelligence deployed where it matters." The field has a name now: "[context engineering](https://github.blog/ai-and-ml/github-copilot/how-to-build-reliable-ai-workflows-with-agentic-primitives-and-context-engineering/)." Designing information flows across agent systems rather than writing individual prompts.

But directing without domain mastery produces bad results. The [ICSE 2026 JAWs study](https://conf.researchr.org/home/icse-2026) found hand-written agent configs outperform LLM-generated ones because the humans who write good configs deeply understand the underlying work. The best directors are people who mastered the doing first.

**3. Editing instead of generating.**

Generation is free. Editing is not. Taking something that is 80% right and making it 100% right is now the core skill in any creative or technical field. The person who edits ships. The person who only generates produces drafts forever.

[Windsurf](https://codeium.com/windsurf) scored 8.5/10 on code quality. Good, not great — still needs a human to get it to production. [OpenAI's Codex Security Agent](https://openai.com/index/codex-security/) scanned 1.2M commits and found 792 critical-severity and 10,561 high-severity security findings. AI generates code fast. The editing layer is where things get real.

**4. Communicating precisely.**

Describing what you want — precisely and completely — is now a technical skill. It's the primary interface between what you intend and what the machine does.

[GitHub analyzed 2,500+ AGENTS.md files](https://github.blog/ai-and-ml/github-copilot/how-to-write-a-great-agents-md-lessons-from-over-2500-repositories/) and found the best-performing agent configs share six traits: clear persona, executable commands, concrete code examples, explicit boundaries, tech stack specifics, and testing instructions. Those are communication skills. The [ICSE 2026 study](https://conf.researchr.org/home/icse-2026) measured a 28.64% runtime reduction and 16.58% token savings from well-written agent instructions. Better communication, directly measurable as a productivity multiplier.

**5. Adapting fast.**

Not executing fast — letting go of what was true yesterday, fast. The [AI coding agent landscape](https://github.com/jqueryscript/awesome-claude-code) now includes Claude Code, Codex, Copilot, Cursor, Cline, OpenHands, Augment, Jules, Amazon Q, Devin, Aider, and Windsurf, all shipping major updates on weekly cadences. If you mastered one tool six months ago and stopped learning, you're already behind.

-----

## The Leverage, and Where It Falls Apart

The leverage available to one person is increasing by an order of magnitude. Boris Cherny built [Claude Cowork](https://venturebeat.com/orchestration/anthropic-says-claude-code-transformed-programming-now-claude-cowork-is), the product that triggered a $285B market selloff, by vibe coding with Claude Code in under two weeks. [16 Claude Opus 4.6 agents wrote a C compiler in Rust](https://www.anthropic.com/claude) that compiles the Linux kernel, for about $20K.

But "one person equals fifty" is not the documented reality for most people. It's an aspiration based on exceptional cases. Most organizations are still struggling with basics: [95% of AI pilots fail to reach production](https://www.gartner.com/en/newsroom/press-releases/2024-11-18-gartner-says-more-than-30-percent-of-generative-ai-projects-will-be-abandoned-after-proof-of-concept-by-end-of-2025). The gap between impressive demo and reliable production workflow is real and wide.

Coordination costs are declining. Leverage is increasing for people with strong taste, judgment, and domain knowledge. But the transformation from "one person can theoretically do this" to "one person routinely does this across industries" will be slower and messier than the highlights suggest.

And leverage creates a governance problem nobody has solved yet. Agents aren't employees and they aren't code. [36.7% of 7,000+ MCP servers](https://spec.modelcontextprotocol.io) are vulnerable to SSRF attacks. The [ClawHavoc campaign](https://www.cisco.com/) found 1,184 malicious skills targeting agent ecosystems. [Only 29% of organizations](https://www.gartner.com/) feel ready to deploy agents securely. If you gain leverage through agents but don't govern them, you're not empowered. You're exposed.

-----

## Where We Land

Execution value is declining. Judgment value is rising. The full transformation takes 10-20 years, not 3-5. The people who thrive will combine deep domain understanding with AI leverage.

The question isn't "can I build this?" anymore. It's "should I?" and "what exactly?" Those are the questions taste, judgment, and conviction exist to answer.

One more thing. Don't let any of this make you forget that some things are worth doing even when they produce no value at all. A person who writes code because they love writing code hasn't lost anything to AI. The satisfaction of solving a puzzle, the flow state, the quiet pleasure of making something work — AI didn't take that. AI can't take that. You can still build a chair with hand tools even though factories exist. The market changes what it will pay you for. It doesn't change what's worth doing with your life.

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
