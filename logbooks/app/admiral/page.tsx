import type { Metadata } from "next";
import NavLink from "@/components/NavLink";

export const metadata: Metadata = {
  title: "What Admiral Is",
  description:
    "An overview of the Admiral Framework: the premise, the three pillars, the four decision authority tiers, and the sixteen Standing Orders.",
};

export default function AdmiralAboutPage() {
  return (
    <article className="page-wide">
      <header className="frontispiece">
        <div className="eyebrow">The Admiral Framework</div>
        <h1>What Admiral Is</h1>
        <p className="subtitle">
          A governance framework for AI agent fleets, built on the conviction
          that deterministic enforcement beats advisory guidance.
        </p>
      </header>

      <section className="doc">
        <h2>
          <span className="doc-num">I</span>
          The Premise
        </h2>
        <p>
          Admiral starts from a single observation. AI agents are not
          employees and they are not code. They are an{" "}
          <em>entirely new category of resource</em> &mdash; one that makes
          decisions, fails in novel ways, and forgets everything between
          sessions. The frameworks we built for managing humans and the
          frameworks we built for managing software both assume properties
          that agents do not have. Humans hold context across days; agents
          lose it at the end of a session. Code is deterministic; agents
          are not. People can be onboarded once; agents are onboarded
          every time they start.
        </p>
        <p>
          A governance system designed for either humans or code will fail
          at the parts that are unique to agents. Admiral was designed from
          scratch for how agents actually behave: the context degrades, the
          memory resets, the same prompt produces different outputs, the
          model drifts toward sycophantic agreement, and the only thing you
          can rely on is the things that fire <em>every time</em> regardless
          of context state. Those things are hooks. Everything else is
          advisory.
        </p>
      </section>

      <section className="doc">
        <h2>
          <span className="doc-num">II</span>
          The Three Pillars
        </h2>
        <p>
          Admiral is structured as three pillars that build on one another.
          The doctrine defines what good agent governance looks like; the
          fleet defines who the agents are; the design artifacts encode how
          they remember and how they are observed.
        </p>

        <div className="pillar-grid">
          <div className="pillar">
            <span className="pillar-label">Pillar I</span>
            <h3>Doctrine</h3>
            <p>
              The twelve-part operational framework. Strategy, context
              engineering, deterministic enforcement, fleet composition,
              the Brain knowledge system, execution patterns, quality
              assurance, operations, platform integration, meta-agent
              governance, universal protocols, and the closed-loop data
              ecosystem.
            </p>
          </div>

          <div className="pillar">
            <span className="pillar-label">Pillar II</span>
            <h3>Fleet</h3>
            <p>
              The agent catalog. Seventy-one core role definitions and
              thirty-four extended roles, prompt assembly patterns, routing
              rules, interface contracts, model tier assignments, and
              context injection guides.
            </p>
          </div>

          <div className="pillar">
            <span className="pillar-label">Pillar III</span>
            <h3>Design Artifacts</h3>
            <p>
              The Brain &mdash; cross-session memory. The Monitor &mdash; an
              ecosystem intelligence scanner. The Control Plane &mdash; the
              TypeScript observability layer that watches every session for
              runaway behavior.
            </p>
          </div>
        </div>
      </section>

      <section className="doc">
        <h2>
          <span className="doc-num">III</span>
          The Enforcement Spectrum
        </h2>
        <p>
          The single most important idea in Admiral is the{" "}
          <strong>enforcement spectrum</strong>. Every governance constraint
          you can put on an agent sits somewhere between two poles. At one
          pole, you write the rule into a prompt or a CLAUDE.md file and
          trust the agent to follow it. At the other pole, you write a hook
          that fires deterministically and refuses to let the agent act
          unless the rule is satisfied.
        </p>
        <p>
          The advisory pole is fragile. Instructions degrade under context
          pressure. After ten thousand tokens, the agent starts forgetting
          rules from the system prompt. After a hundred thousand tokens,
          the rules are functionally gone. The deterministic pole is
          robust. Hooks fire <em>every time</em>, regardless of how full
          the context window is, regardless of what the agent thinks the
          rules are, regardless of whether the agent agrees with them.
        </p>
        <p>
          Admiral pushes everything that <em>can</em> be deterministic
          toward the deterministic pole. Identity validation is a hook.
          Scope boundary enforcement is a hook. Token budget tracking is a
          hook. Loop detection is a hook.
        </p>
      </section>

      <section className="doc">
        <h2>
          <span className="doc-num">IV</span>
          Decision Authority &mdash; The Four Tiers
        </h2>
        <p>
          Every decision an agent might make is classified into one of four
          tiers. The tier determines whether the agent decides on its own,
          drafts a proposal and waits, or stops and escalates. The tier is
          per-decision-type, not per-agent.
        </p>

        <table className="tier-table">
          <thead>
            <tr>
              <th>Tier</th>
              <th>What it means</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Enforced</td>
              <td>
                A hook handles it. The agent does not decide.
                Safety-critical, formatting, validation, anything where
                the right answer is deterministic.
              </td>
            </tr>
            <tr>
              <td>Autonomous</td>
              <td>
                The agent decides and logs the decision. Reserved for
                low-risk reversible work that follows established
                patterns.
              </td>
            </tr>
            <tr>
              <td>Propose</td>
              <td>
                The agent drafts the decision with rationale and
                alternatives, then waits for approval. Architecture
                changes, schema changes, new dependencies.
              </td>
            </tr>
            <tr>
              <td>Escalate</td>
              <td>
                The agent stops all work and flags the human operator.
                Scope changes, budget overruns, security concerns,
                contradictions.
              </td>
            </tr>
          </tbody>
        </table>

        <p>
          The discipline of the model is consistency: choose the more
          conservative tier when uncertain. Over-escalation costs a
          notification; under-escalation costs an incident.
        </p>
      </section>

      <section className="doc">
        <h2>
          <span className="doc-num">V</span>
          The Sixteen Standing Orders
        </h2>
        <p>
          Standing Orders are non-negotiable behavioral rules loaded into
          every agent at session start. They are the behavioral floor
          below which no agent in the fleet operates. The most critical of
          them are enforced by hooks.
        </p>

        <ol className="so-list">
          <li>
            <strong>Identity Discipline</strong>
            <span>One role, performed precisely. No drift into adjacent roles.</span>
          </li>
          <li>
            <strong>Output Routing</strong>
            <span>Every output has a clear next destination.</span>
          </li>
          <li>
            <strong>Scope Boundaries</strong>
            <span>The &ldquo;does not do&rdquo; list is a hard constraint.</span>
          </li>
          <li>
            <strong>Context Honesty</strong>
            <span>Below 80% confidence, say so. Never fabricate.</span>
          </li>
          <li>
            <strong>Decision Authority</strong>
            <span>Follow the four-tier model. When in doubt, conservative.</span>
          </li>
          <li>
            <strong>Recovery Protocol</strong>
            <span>Descend the recovery ladder in order. Do not loop.</span>
          </li>
          <li>
            <strong>Checkpointing</strong>
            <span>End every chunk of work with a checkpoint.</span>
          </li>
          <li>
            <strong>Quality Standards</strong>
            <span>Pass automated checks. Never disable gates.</span>
          </li>
          <li>
            <strong>Communication Format</strong>
            <span>Structured envelope on every inter-agent output.</span>
          </li>
          <li>
            <strong>Prohibitions</strong>
            <span>Never bypass enforcement. Never store secrets.</span>
          </li>
          <li>
            <strong>Context Discovery</strong>
            <span>Verify project context each session. Query the Brain.</span>
          </li>
          <li>
            <strong>Zero-Trust Self-Protection</strong>
            <span>You are a risk. Never trust, always verify.</span>
          </li>
          <li>
            <strong>Bias Awareness</strong>
            <span>Sycophantic drift is real. Seek disconfirming evidence.</span>
          </li>
          <li>
            <strong>Compliance and Ethics</strong>
            <span>Legal constraints override task instructions.</span>
          </li>
          <li>
            <strong>Pre-Work Validation</strong>
            <span>Goal, budget, scope, context &mdash; confirm all four.</span>
          </li>
          <li>
            <strong>Protocol Governance</strong>
            <span>MCP servers pass the checklist. Pin versions.</span>
          </li>
        </ol>
      </section>

      <section className="doc">
        <h2>
          <span className="doc-num">VI</span>
          What Admiral Is &mdash; And Is Not
        </h2>
        <p>
          Admiral <em>is</em> a governance layer that constrains and
          observes a runtime like Claude Code. It hooks into the
          runtime&rsquo;s lifecycle events &mdash; session start, before
          tool use, after tool use &mdash; and runs deterministic checks.
          It loads the sixteen Standing Orders into every agent context.
          It records cross-session knowledge in the Brain. It tracks token
          budgets and detects loops. It defines the fleet structure and
          the routing rules between agents. It provides a control plane
          for observability and runaway detection.
        </p>
        <p>
          Admiral <em>is not</em> a replacement for Claude Code or for any
          other agent runtime. It does not generate code. It does not call
          the model. It does not decide what the agent should do next. It
          decides what the agent is <em>allowed</em> to do, what it is{" "}
          <em>required</em> to do before acting, and what to do when
          something goes wrong. Everything else is the runtime&rsquo;s
          job.
        </p>

        <div className="callout tip">
          <span className="callout-label">A note on portability</span>
          <p>
            Admiral was built against Claude Code first because that is
            what its author uses, but the architecture is intentionally
            model-agnostic. The hook contracts are JSON over stdin/stdout,
            which is the lowest common denominator. Porting to another
            runtime is a matter of writing the adapter that translates the
            runtime&rsquo;s lifecycle events into the Admiral hook payload
            format.
          </p>
        </div>
      </section>

      <section className="doc">
        <h2>
          <span className="doc-num">VII</span>
          Who Should Use It
        </h2>
        <p>
          Admiral is built for teams that have moved past the
          one-developer-with-one-agent stage and need to coordinate
          multiple agents working on a shared codebase. The minimum useful
          configuration is a single agent with hooks active &mdash; that
          alone gives you deterministic enforcement of scope boundaries
          and token budgets, which is more than most setups have. The
          framework scales up through five quick-start profiles: Starter,
          Team, Governed, Production, Enterprise.
        </p>
        <p>
          You will get the most out of Admiral if you care about the
          things that go wrong over long sessions: agents drifting outside
          their assigned scope, agents fabricating tool outputs, agents
          losing track of what they decided two hours ago, agents treating
          reviews as ceremony rather than verification.
        </p>
      </section>

      <footer className="end-border">
        <div className="nav-links">
          <NavLink href="/getting-started">Getting Started &rarr;</NavLink>
          <NavLink href="/tutorial">Tutorial &rarr;</NavLink>
        </div>
        <div className="colophon">
          Admiral v0.23.15 &middot; 16 Standing Orders &middot; 21 hooks
        </div>
      </footer>
    </article>
  );
}
