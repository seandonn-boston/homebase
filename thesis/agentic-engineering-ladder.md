# THE AGENTIC ENGINEERING LADDER

**A maturity model for how humans work with AI systems.**

Created: March 2026

-----

## The Premise

Every new technology creates a progression of disciplines around it. Electricity gave us wiring, then circuit design, then power grid engineering, then regulatory frameworks. The internet gave us HTML, then web development, then distributed systems, then platform governance.

AI is doing the same thing, but the disciplines are emerging faster than people can name them. "Prompt engineering" showed up in 2023 and was already insufficient by 2024. "Context engineering" emerged in 2025 as the real bottleneck became clear. The ladder keeps extending upward, and most people are still on the first two rungs.

This document names all nine rungs. Not because they're all mature — most aren't. But because seeing the full progression changes how you invest your time, how you build your team, and what you optimize for. If you're solving problems at rung 2 when the constraint is at rung 6, you're working hard in the wrong place.

-----

## The Ladder

The nine rungs fall into three phases. The phases matter as much as the individual rungs, because each phase represents a fundamentally different relationship between human and system.

### Phase I: Specification

*How you define what you want.*

Rungs 1 through 5 are about the human-to-AI interface. Each rung represents a higher level of abstraction in how you communicate with the system. The progression moves from telling the system *what to say* to telling it *what to achieve*.

**Rung 1: Prompt Engineering**

Crafting individual prompts. The atomic unit of human-AI interaction. You write a message, you get a response, you iterate on the message until the response improves.

This is where most people are. It works for single-turn interactions with well-defined outputs. It breaks the moment you need consistency across tasks, reliability at scale, or behavior that holds up without a human watching.

The skill here is linguistic precision. The limitation is that you're optimizing one transaction at a time.

**Rung 2: Context Engineering**

Managing what information the system sees. Not just what you say, but what the system knows when you say it.

This is where the real leverage started showing up. The difference between a mediocre AI interaction and a great one is almost never the prompt — it's the context. What files has the system read? What prior decisions does it know about? What domain knowledge has been loaded? What tools does it have access to?

GitHub found that the best-performing AGENTS.md files share six traits: clear persona, executable commands, concrete code examples, explicit boundaries, tech stack specifics, and testing instructions. Those are all context decisions, not prompt decisions. CrewAI analyzed 1.7 billion agentic workflows and found the winning pattern is "deterministic backbone with intelligence deployed where it matters." That backbone is context architecture.

The skill here is information architecture. The limitation is that you're still specifying process, not goals.

**Rung 3: Intent Engineering**

Specifying what you actually want, not what you think the system needs to hear.

The gap between what someone says and what they mean is where most AI failures live. A prompt says "write me a function that validates email addresses." The intent is "make sure bad data doesn't get into my system and give users clear feedback when they type something wrong." Those produce very different outputs.

Intent engineering is the discipline of closing that gap systematically. It means defining success in terms the system can internalize, not in terms of the specific steps you'd take yourself. It's harder than it sounds because most people don't know their own intent precisely until they see the wrong output.

The skill here is goal decomposition — breaking fuzzy human wants into precise, verifiable objectives. The limitation is that specifying what you want isn't the same as specifying what you *don't* want.

**Rung 4: Constraint Engineering**

Defining boundaries. What the system must not do matters as much as what it should do.

Intent tells the system where to go. Constraints tell it where not to go. In practice, constraint engineering is where safety, compliance, brand, ethics, and resource limits get encoded into system behavior. It's also where most production failures originate — not because the system pursued the wrong goal, but because it pursued the right goal through an unacceptable path.

This is the rung where "move fast and break things" collides with reality. An agent tasked with reducing customer churn might start offering unauthorized discounts. An agent tasked with writing secure code might refuse to ship anything. The constraints are what turn a capable system into a trustworthy one.

The skill here is boundary definition under ambiguity. The limitation is that constraints are defensive — they prevent bad outcomes but don't define good ones.

**Rung 5: Outcome Engineering**

Defining success criteria, not process. Letting the system find its own path to the goal.

This is the rung where the human stops being a supervisor and starts being a principal. You define what "done" looks like. You define how to measure it. You let the system figure out how to get there.

The shift is real and uncomfortable. Most people who are good at their jobs are good because they know the right *process*. Outcome engineering asks you to let go of process and trust the system to find one — possibly a better one than you'd have chosen. The ICSE 2026 JAWs study found that human-written agent configs outperform LLM-generated ones, which suggests we're not ready to fully let go yet. But the direction is clear: the human's job is increasingly to define the destination, not drive the car.

The skill here is success criteria design. The limitation is that you can define outcomes all day, but without measurement, you're guessing whether you achieved them.

-----

### Phase II: Verification

*How you know it's working.*

Rungs 6 and 7 close the loop. Specification without verification is wishful thinking. These rungs are where most organizations are weakest, and it's where the most leverage sits right now.

**Rung 6: Evaluation Engineering**

Measuring whether outcomes match intent. Not once — continuously.

You can't improve what you can't measure. But measuring AI system behavior is harder than measuring traditional software. Traditional software either works or it doesn't. AI systems work on a spectrum: mostly right, occasionally wrong, sometimes wrong in ways that look right. Evaluation engineering is the discipline of building measurement systems that catch the subtle failures, not just the obvious ones.

This means defining metrics that actually correlate with the outcomes you care about. It means building evaluation datasets that represent your real-world distribution, not your test suite. It means running evaluations continuously, not once at deployment. And it means being honest when your metrics tell you something you don't want to hear.

The skill here is measurement design. The hard part isn't building the evaluation — it's choosing what to evaluate and admitting when the results are bad.

**Rung 7: Simulation Engineering**

Testing agent behavior in simulated environments before it touches the real world.

Evaluation tells you how the system performed. Simulation tells you how it *would* perform under conditions you haven't seen yet. This is where you explore edge cases, stress-test constraint boundaries, and discover failure modes before your users do.

The discipline barely exists yet. Most teams test AI systems the same way they test traditional software: unit tests, integration tests, maybe some load testing. That misses the point. AI system failures are behavioral, not mechanical. The system doesn't crash — it does something reasonable-looking but wrong. Simulation engineering means building environments where those behavioral failures surface safely.

This rung gets more important as systems get more autonomous. A system that waits for human approval on every action can be evaluated in production. A system that acts independently needs to be simulated first. The gap between "works in the lab" and "works in the world" is where simulation lives.

The skill here is environment design — building worlds realistic enough to surface real failures but controlled enough to learn from them.

-----

### Phase III: Governance

*Who's in charge when the system is in charge of itself.*

Rungs 8 and 9 are where the ladder gets existential. The first seven rungs assume a human is doing the engineering. These two address what happens when the system starts engineering itself, and how human institutions adapt.

**Rung 8: Autonomy Engineering**

Designing systems that improve themselves through their own evaluation and simulation loops.

This is the rung where the human moves from operator to architect. The system doesn't just execute — it evaluates its own performance, identifies its own weaknesses, simulates improvements, and implements them. The human designs the improvement loop, sets the boundaries, and monitors the trajectory. But the system is doing the climbing.

We're in the earliest stages of this. Today's self-improving systems are narrow: hyperparameter tuning, automated prompt optimization, reinforcement learning from human feedback. Tomorrow's will be broader. The question isn't whether systems will improve themselves — they already do. The question is how much latitude they get, and who decides.

The engineering discipline here is loop design. What does the system measure about itself? What is it allowed to change? What requires human approval? How do you detect when the improvement loop is optimizing for the wrong thing? These are design decisions, not technical ones. They require judgment about values, risk tolerance, and acceptable failure modes — judgment that, for now, only humans can provide.

The skill here is designing feedback loops with the right degrees of freedom. Too constrained and the system can't improve. Too unconstrained and the system drifts from your intent in ways you won't catch until the damage is done.

**Rung 9: Institutional Engineering**

Designing the human structures — organizations, norms, incentive systems, oversight mechanisms — that govern autonomous systems and the people who build them.

This is the top of the ladder and the least developed rung. The technology is moving faster than institutions can adapt. We have AI systems that can find 22 zero-day vulnerabilities, scan millions of commits, and generate production-grade applications. We have governance frameworks designed for software that ships quarterly and gets reviewed by humans before deployment. The gap is obvious.

Institutional engineering is the discipline of closing that gap. Not by slowing the technology down — that's been tried and it doesn't work. By designing institutions that can govern at the speed the technology operates.

This means rethinking how organizations make decisions about AI deployment. It means designing accountability structures for systems where no single human made the decision. It means creating oversight mechanisms that work when the system acts faster than a human can review. It means building norms around AI behavior that are precise enough to be enforceable but flexible enough to accommodate a technology that changes quarterly.

The critical boundary: institutional engineering governs *AI systems and the organizations that deploy them*. It does not govern humans through AI. The moment an institution uses AI-driven optimization to control human behavior — nudging, scoring, sorting people algorithmically in ways they can't see or contest — it has crossed a line. The purpose of this rung is to ensure that AI systems remain accountable to human institutions, not the other way around.

The skill here is organizational design under radical uncertainty. The limitation is that we have almost no established practice to draw on. This rung is being built in real time.

-----

## What This Means in Practice

**Most people are stuck on rungs 1-2.** They're writing better prompts and providing better context. That's necessary but insufficient. The real constraint in their system is almost certainly somewhere in rungs 3-6.

**The highest-leverage rung right now is 6.** Evaluation engineering is dramatically underinvested relative to its importance. Teams will spend weeks on prompt engineering and context architecture, then deploy with no systematic evaluation of whether the system actually achieves the intended outcomes. The reason is simple: evaluation is unglamorous and difficult. It requires admitting that you don't know if your system works. But without it, everything above rung 5 is guesswork.

**The rungs are not sequential in practice.** You don't master prompt engineering before moving to context engineering. In any real system, you're working on multiple rungs simultaneously. But the ladder describes a dependency chain: you can't do outcome engineering well without intent engineering, you can't do simulation engineering well without evaluation engineering, and you can't do autonomy engineering at all without simulation.

**The ladder is a diagnostic tool, not a curriculum.** If your AI system is underperforming, find the rung where the failure lives. It's usually not the rung you think. The team blaming the prompt (rung 1) usually has a context problem (rung 2). The team blaming the context (rung 2) usually has an intent problem (rung 3). The team that thinks everything is working (no rung) usually has an evaluation problem (rung 6).

-----

## Where the Ladder Breaks Down

This framework has limits. We should say so.

**The rungs assume a progression from human control to system autonomy.** That progression may not be smooth. It may not be monotonic. There may be domains where rung 5 (outcome engineering) is the right ceiling — where giving systems more autonomy produces worse results, not better ones. Healthcare, criminal justice, military applications. The ladder doesn't tell you *how high to climb*. It tells you what the rungs are if you choose to.

**Rungs 8 and 9 are speculative.** We have early examples of autonomy engineering and almost no examples of institutional engineering done well for AI. These rungs describe where the discipline needs to go, not where it is. If you're building a team today, invest in rungs 3-7. Rungs 8-9 are for the architects who are thinking about 2028.

**The ladder doesn't address multi-agent coordination directly.** Orchestrating multiple agents working together — which is already a real engineering challenge — cuts across several rungs rather than sitting on one. This is a deliberate choice. Orchestration is a *mode of operation* that applies at every rung, not a rung of its own. But reasonable people could disagree.

-----

## The Stakes

Every organization building with AI is, whether they know it or not, climbing this ladder. Most are doing it unconsciously — solving rung-2 problems with rung-1 tools, or ignoring rung-6 problems entirely because they haven't built the measurement systems to see them.

The organizations that win will be the ones that see the full ladder, invest in the right rungs for their stage, and resist the temptation to skip verification (Phase II) on their way to autonomy (Phase III). The history of technology is littered with systems that were deployed before they were understood. AI systems that improve themselves without rigorous evaluation and simulation aren't autonomous. They're unmonitored.

The agentic engineering ladder is not a prediction about what will happen. It's a framework for deciding what to build next and where to focus. The disciplines are real. The progression is logical. The upper rungs are uncertain. That uncertainty is not a reason to ignore them. It's a reason to start climbing carefully.
