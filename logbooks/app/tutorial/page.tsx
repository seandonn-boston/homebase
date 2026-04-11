import type { Metadata } from "next";
import NavLink from "@/components/NavLink";

export const metadata: Metadata = {
  title: "Feature Tutorial",
  description:
    "Every Admiral feature with a worked example: Standing Orders, Decision Authority, hooks, the Brain, phases and tasks, EDD, the Fleet Registry, the Control Plane, the recovery ladder, pre-work validation.",
};

export default function TutorialPage() {
  return (
    <article className="page-wide">
      <header className="frontispiece">
        <div className="eyebrow">The Admiral Framework</div>
        <h1>Feature Tutorial</h1>
        <p className="subtitle">
          Every Admiral feature, in order, with a worked example. Read it
          straight through to see how the pieces compose, or jump to a
          section if you already know what you want.
        </p>
      </header>

      <div className="doc-toc">
        <span className="toc-label">Sections</span>
        <ol>
          <li><a href="#standing-orders">Standing Orders in action</a></li>
          <li><a href="#authority">The four decision authority tiers</a></li>
          <li><a href="#hooks">Hooks &mdash; anatomy and wiring</a></li>
          <li><a href="#brain">The Brain &mdash; record, query, retrieve</a></li>
          <li><a href="#phases">Phases, tasks, and subtasks</a></li>
          <li><a href="#edd">Evaluation-Driven Design</a></li>
          <li><a href="#fleet">The Fleet Registry</a></li>
          <li><a href="#control-plane">The Control Plane</a></li>
          <li><a href="#recovery">The Recovery Ladder</a></li>
          <li><a href="#prework">Pre-Work Validation</a></li>
        </ol>
      </div>

      {/* ============== 1. STANDING ORDERS ============== */}

      <section className="doc" id="standing-orders">
        <h2>
          <span className="doc-num">01</span>
          Standing Orders in action
        </h2>
        <p>
          Every Admiral session begins with the sixteen Standing Orders
          loading into agent context. They are the behavioral floor for
          every agent in the fleet. The most critical of them are also
          enforced by hooks, so an agent that &ldquo;forgets&rdquo; them
          gets blocked the moment it tries to violate one.
        </p>

        <h3>Where they live</h3>
        <p>
          Each Standing Order is a JSON file in{" "}
          <code>admiral/standing-orders/</code>. The file format is small
          and self-describing.
        </p>
        <pre className="code-block"><code>
{`$ cat admiral/standing-orders/so01-identity-discipline.json
{
  "id": "SO-01",
  "title": "Identity Discipline",
  "priority_category": "critical",
  "order": 1,
  "rules": [
    "You have one role. Perform that role. Do not drift into adjacent roles.",
    "If a task falls outside your scope, hand it back to the Orchestrator with a clear explanation of why it doesn't belong to you and which role it likely belongs to.",
    "Never say \\"I can also help with...\\" and expand into work outside your defined scope."
  ]
}`}
        </code></pre>

        <h3>How they reach the agent</h3>
        <p>
          The session-start adapter reads every <code>so*.json</code>{" "}
          file, sorts by the <code>order</code> field, and renders the
          rules into the agent&rsquo;s system context as a single
          formatted block. The agent sees the rules every session,
          regardless of context state, because they are loaded
          deterministically rather than carried over from a previous
          session.
        </p>

        <h3>What enforcement looks like</h3>
        <p>
          When the agent tries to do something that violates an
          enforced Standing Order &mdash; say, edit a file outside its
          assigned scope &mdash; the relevant hook fires and refuses
          the action. The violation is recorded to{" "}
          <code>.brain/helm/</code> as a structured failure record so
          future sessions can learn from it.
        </p>
        <pre className="code-block"><code>
{`$ ls .brain/helm/ | grep policy-violation | head -5
20260325-051806-failure-policy-violation-scopeviolation.json
20260325-051813-failure-policy-violation-hardblock.json
20260325-051821-failure-policy-violation-scopeviolation.json
20260325-052143-failure-policy-violation-scopeviolation.json
20260325-052152-failure-policy-violation-hardblock.json`}
        </code></pre>
        <p>
          Every violation that has ever happened in this repository is
          on disk and queryable. That is what &ldquo;deterministic
          enforcement beats advisory guidance&rdquo; looks like in
          practice.
        </p>
      </section>

      {/* ============== 2. DECISION AUTHORITY ============== */}

      <section className="doc" id="authority">
        <h2>
          <span className="doc-num">02</span>
          The four decision authority tiers
        </h2>
        <p>
          Every decision an agent makes lands in one of four tiers. The
          tier is per-decision-type, not per-agent. The same agent can
          be Autonomous on naming and Escalate on architecture in the
          same session.
        </p>

        <h3>Enforced &mdash; the hook decides</h3>
        <p>
          The agent does not deliberate. Example: file path validation
          for writes. The agent says &ldquo;write this file&rdquo; and
          the <code>scope_boundary_guard</code> hook either lets it
          through or refuses it. The agent never has the chance to
          argue.
        </p>

        <h3>Autonomous &mdash; the agent decides and logs</h3>
        <p>
          Reserved for low-risk reversible work. Example: renaming a
          local variable inside a function. The agent makes the call,
          records what it did, and continues.
        </p>
        <pre className="code-block"><code>
{`# Agent autonomous decision — internal refactor, no schema impact
brain_record \\
  --type decision \\
  --category refactor \\
  --content "Renamed parsePayload -> parseHookPayload for clarity (autonomous)" \\
  --tags "naming,autonomous"`}
        </code></pre>

        <h3>Propose &mdash; draft and wait</h3>
        <p>
          Anything with non-trivial blast radius. Example: adding a new
          dependency to <code>control-plane/package.json</code>. The
          agent drafts a proposal with rationale and alternatives, then
          waits for the operator to approve before acting.
        </p>
        <pre className="code-block"><code>
{`PROPOSAL: Add dependency 'fast-check' to control-plane/devDependencies

CONTEXT
  Property-based testing would let us cover edge cases that the unit
  suite is missing in the runaway-detector module.

ALTERNATIVES CONSIDERED
  1. Hand-written edge cases (rejected: combinatorial blow-up)
  2. fuzz target with libfuzzer (rejected: out of dependency budget)
  3. fast-check (recommended: zero runtime deps, used by similar projects)

RISK
  Adds 1 devDependency (~120 KB). No runtime impact.

APPROVAL REQUIRED FROM
  Admiral`}
        </code></pre>

        <h3>Escalate &mdash; stop and flag</h3>
        <p>
          When the decision exceeds the agent&rsquo;s authority entirely.
          Example: a request that would require modifying a frozen
          specification file under <code>aiStrat/</code>. The agent
          stops and emits an escalation report. The work blocks until a
          human resolves it.
        </p>
        <pre className="code-block"><code>
{`ESCALATION

WHAT IS BLOCKED
  Task task/phase-09/spec-debt-resolution requires modifying
  aiStrat/admiral/spec/part3-enforcement.md to address SD-12.

WHY I CANNOT PROCEED AUTONOMOUSLY
  Files under aiStrat/ are frozen by the project boundary policy.
  Standing Order SO-10 prohibits unauthorized modification of frozen
  specification files.

WHAT I HAVE TRIED
  Read the spec-debt entry. Confirmed the modification is in scope
  for the resolution but out of scope for autonomous editing.

WHAT I NEED
  Admiral approval for a one-line change to part3-enforcement.md
  matching the spec-debt resolution wording in SD-12.`}
        </code></pre>

        <p>
          The discipline of the model is consistency: choose the more
          conservative tier when uncertain. Over-escalation costs a
          notification; under-escalation costs an incident.
        </p>
      </section>

      {/* ============== 3. HOOKS ============== */}

      <section className="doc" id="hooks">
        <h2>
          <span className="doc-num">03</span>
          Hooks &mdash; anatomy and wiring
        </h2>
        <p>
          Hooks are bash scripts in <code>.hooks/</code> that fire
          deterministically at lifecycle events. They are the part of
          Admiral that cannot be argued with: they fire every time
          regardless of how persuasive the agent is.
        </p>

        <h3>Anatomy</h3>
        <p>
          Every hook has the same shape: a header, a payload read from
          stdin, a check, a JSON response on stdout, and a semantic
          exit code.
        </p>
        <pre className="code-block"><code>
{`#!/bin/bash
# Admiral Framework — File Size Guard (P3-S2)
# Refuses writes to files larger than 5 MB.
# Exit codes: 0=pass, 2=hard-block
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="\${CLAUDE_PROJECT_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
source "$PROJECT_DIR/admiral/lib/hook_utils.sh"
hook_init "file_size_guard"

PAYLOAD=$(cat)
TARGET=$(echo "$PAYLOAD" | jq -r '.tool_input.file_path // empty')

if [ -z "$TARGET" ] || [ ! -f "$TARGET" ]; then
  hook_pass "no existing file to size-check"
  exit 0
fi

SIZE=$(stat -c%s "$TARGET" 2>/dev/null || stat -f%z "$TARGET")
if [ "$SIZE" -gt 5242880 ]; then
  hook_fail_hard "file_size_guard: $TARGET exceeds 5 MB ($SIZE bytes)"
  exit 2
fi

hook_pass "file size ok ($SIZE bytes)"
exit 0`}
        </code></pre>

        <h3>Exit codes</h3>
        <ul>
          <li><strong>0 &mdash; pass or fail-open.</strong> Hook approved the action, or hit an internal error and decided to allow rather than block.</li>
          <li><strong>1 &mdash; soft fail.</strong> Hook recorded a problem but did not block. Useful for advisories.</li>
          <li><strong>2 &mdash; hard block.</strong> Hook refused the action. The runtime aborts the tool call.</li>
        </ul>

        <h3>Wiring it in</h3>
        <p>
          Individual hooks are called from adapters &mdash;{" "}
          <code>pre_tool_use_adapter.sh</code> and{" "}
          <code>post_tool_use_adapter.sh</code> &mdash; which run a
          sequence of hooks for every tool use event. To add the
          file-size guard above, you append it to the pre-tool-use
          adapter&rsquo;s sequence.
        </p>
        <pre className="code-block"><code>
{`# Inside .hooks/pre_tool_use_adapter.sh
echo "$PAYLOAD" | bash "$SCRIPT_DIR/scope_boundary_guard.sh"   || exit $?
echo "$PAYLOAD" | bash "$SCRIPT_DIR/prohibitions_enforcer.sh"  || exit $?
echo "$PAYLOAD" | bash "$SCRIPT_DIR/file_size_guard.sh"        || exit $?
echo "$PAYLOAD" | bash "$SCRIPT_DIR/zero_trust_validator.sh"   || exit $?`}
        </code></pre>

        <div className="callout tip">
          <span className="callout-label">Fail-open by default</span>
          <p>
            ADR-004 makes fail-open the default behavior: if a hook
            errors internally, it logs the error and exits 0. This
            prevents hook bugs from blocking all work. Fail-closed is
            reserved for security-critical hooks where the cost of
            allowing the action exceeds the cost of blocking it.
          </p>
        </div>
      </section>

      {/* ============== 4. BRAIN ============== */}

      <section className="doc" id="brain">
        <h2>
          <span className="doc-num">04</span>
          The Brain &mdash; record, query, retrieve
        </h2>
        <p>
          The Brain is how the fleet remembers things across sessions.
          It is structured around four entry types: decisions
          (architectural choices), patterns (reusable solutions),
          lessons (failures and what to avoid), and context (project
          state and environment facts). The B1 tier stores entries as
          JSON files in <code>.brain/</code>; query is keyword search
          via grep.
        </p>

        <h3>Recording</h3>
        <pre className="code-block"><code>
{`$ admiral/bin/brain_record \\
    --type decision \\
    --category architecture \\
    --content "Chose JSON over YAML for hook payloads because jq is the only dependency" \\
    --tags "hooks,json,adr-005"

[brain] recorded entry brain-1775923921-9c3f8a01
[brain] file: .brain/20260410-153841-decision-architecture.json`}
        </code></pre>

        <h3>Querying</h3>
        <pre className="code-block"><code>
{`$ admiral/bin/brain_query "hook payload"

[
  {
    "id": "brain-1775923921-9c3f8a01",
    "type": "decision",
    "category": "architecture",
    "content": "Chose JSON over YAML for hook payloads because jq is the only dependency",
    "tags": ["hooks", "json", "adr-005"],
    "created_at": "2026-04-10T15:38:41Z"
  }
]

$ admiral/bin/brain_query --tag adr-005
$ admiral/bin/brain_query --type decision --recent 10`}
        </code></pre>

        <h3>Retrieving by id</h3>
        <pre className="code-block"><code>
{`$ admiral/bin/brain_retrieve brain-1775923921-9c3f8a01

{
  "id": "brain-1775923921-9c3f8a01",
  "type": "decision",
  "category": "architecture",
  "content": "Chose JSON over YAML for hook payloads because jq is the only dependency",
  "tags": ["hooks", "json", "adr-005"],
  "created_at": "2026-04-10T15:38:41Z",
  "session_id": "sess-1775923800",
  "agent_role": "architect"
}`}
        </code></pre>

        <h3>The four entry types</h3>
        <ul>
          <li><strong>decision</strong> &mdash; architectural choices, trade-offs, rationale</li>
          <li><strong>pattern</strong> &mdash; reusable solutions, best practices</li>
          <li><strong>lesson</strong> &mdash; failures, mistakes, things that did not work</li>
          <li><strong>context</strong> &mdash; project state, environment facts</li>
        </ul>

        <p>
          The Brain is the backbone of cross-session memory in
          Admiral. SO-05 requires that any Propose-tier or
          Escalate-tier decision be preceded by a brain query for
          precedent &mdash; that is the mechanism that prevents the
          fleet from re-deciding the same questions every session.
        </p>
      </section>

      {/* ============== 5. PHASES / TASKS ============== */}

      <section className="doc" id="phases">
        <h2>
          <span className="doc-num">05</span>
          Phases, tasks, and subtasks
        </h2>
        <p>
          Admiral structures work as a three-level hierarchy. The
          hierarchy maps directly onto a branching model so the version
          control history reflects how the work was actually decomposed.
        </p>

        <h3>The hierarchy</h3>
        <ul>
          <li><strong>Phase</strong> &mdash; a large body of work spanning multiple sessions. One slush branch, one slush-to-main PR, requires Admiral approval to merge.</li>
          <li><strong>Task</strong> &mdash; a meaningful chunk within a phase. One task branch, one task-to-slush PR, self-merged (no human approval needed for slush).</li>
          <li><strong>Subtask</strong> &mdash; a single commit within a task. No branch, no PR.</li>
        </ul>

        <h3>The branch names</h3>
        <pre className="code-block"><code>
{`main
└── slush/phase-09-quality-rigor                # phase branch
    ├── task/phase-09/01-property-tests         # task branch (merged)
    ├── task/phase-09/02-edd-gate               # task branch (merged)
    └── task/phase-09/03-typed-errors           # task branch (in flight)`}
        </code></pre>

        <h3>The workflow</h3>
        <ol>
          <li>Pick a TODO item from <code>plan/todo/</code></li>
          <li>Create a task branch from the slush branch for its phase</li>
          <li>Implement the task as one or more subtask commits</li>
          <li>Open a task-to-slush PR and self-merge it once green</li>
          <li>When the entire phase is done, the slush branch goes through the closeout discipline (whole-set tests, lint, security audit) before the slush-to-main PR is opened for Admiral approval</li>
        </ol>

        <pre className="code-block"><code>
{`# Start a task within phase 09
$ git checkout slush/phase-09-quality-rigor
$ git pull
$ git checkout -b task/phase-09/03-typed-errors

# Implement, test, commit subtasks
$ git add control-plane/src/errors.ts
$ git commit -m "feat: introduce typed error hierarchy for control plane"

# Open the task PR (back into slush, not main)
$ gh pr create \\
    --base slush/phase-09-quality-rigor \\
    --title "feat: typed error hierarchy" \\
    --body "Closes plan/todo/03 item: typed-errors"`}
        </code></pre>
      </section>

      {/* ============== 6. EDD ============== */}

      <section className="doc" id="edd">
        <h2>
          <span className="doc-num">06</span>
          Evaluation-Driven Design
        </h2>
        <p>
          EDD is how Admiral verifies that a task is actually done.
          Each task can declare an evaluation spec &mdash; a JSON file
          listing deterministic checks (commands that must succeed) and
          probabilistic checks (review by another agent or human). The
          EDD gate runs the spec and emits a structured verdict.
        </p>

        <h3>An evaluation spec</h3>
        <pre className="code-block"><code>
{`# .admiral/edd-specs/task-09-03-typed-errors.json
{
  "schema": "evaluation-spec.v1",
  "task_id": "task/phase-09/03-typed-errors",
  "definition_of_done": [
    "Every error path in control-plane uses a typed error class",
    "No 'throw new Error(' calls remain in src/",
    "Test coverage on the new error module is at least 95%",
    "Existing tests still pass"
  ],
  "deterministic_checks": [
    {
      "id": "no-bare-throws",
      "command": "! grep -rn 'throw new Error(' control-plane/src/",
      "expect": "exit_zero"
    },
    {
      "id": "tests-pass",
      "command": "npm test --prefix control-plane",
      "expect": "exit_zero"
    },
    {
      "id": "errors-coverage",
      "command": "npm run coverage --prefix control-plane -- --include='src/errors.ts'",
      "expect": "coverage_at_least_95"
    }
  ],
  "probabilistic_checks": [
    {
      "id": "review",
      "agent": "code-reviewer",
      "prompt": "Are all error paths covered? Look for any thrown Errors that should be typed."
    }
  ]
}`}
        </code></pre>

        <h3>Running the gate</h3>
        <pre className="code-block"><code>
{`$ admiral/bin/edd_gate .admiral/edd-specs/task-09-03-typed-errors.json

[edd] no-bare-throws       PASS
[edd] tests-pass           PASS
[edd] errors-coverage      PASS  (97.4%)
[edd] review               PASS  (code-reviewer agent)
[edd] verdict: PASS — task task/phase-09/03-typed-errors meets definition of done
[edd] proof artifact: .admiral/proofs/task-09-03-typed-errors-pass.json`}
        </code></pre>

        <p>
          The proof artifact captures every check result with output
          hashes and timestamps. It is what you point at when someone
          asks &ldquo;how do you know this task is actually done?&rdquo;
        </p>
      </section>

      {/* ============== 7. FLEET ============== */}

      <section className="doc" id="fleet">
        <h2>
          <span className="doc-num">07</span>
          The Fleet Registry
        </h2>
        <p>
          The fleet registry defines who the agents are. Each entry
          declares an agent identity, its tier, the tools it is allowed
          to call, and the model class it should run on. Hooks read the
          registry to enforce identity and tool permissions.
        </p>

        <h3>An agent entry</h3>
        <pre className="code-block"><code>
{`# admiral/config/fleet_registry.json
{
  "agents": {
    "code-reviewer": {
      "tier": "team",
      "model_class": "haiku",
      "description": "Reviews diffs for correctness, security, and style.",
      "allowed_tools": [
        "Read",
        "Grep",
        "Glob",
        "Bash:git diff",
        "Bash:git log"
      ],
      "denied_tools": [
        "Edit",
        "Write",
        "Bash:git push",
        "Bash:git commit"
      ],
      "context_profile": [
        "ADMIRAL_STYLE.md",
        "CONTRIBUTING.md",
        "docs/adr/"
      ]
    }
  }
}`}
        </code></pre>

        <h3>How it gets enforced</h3>
        <p>
          When the agent tries to call a tool, the{" "}
          <code>tool_permission_guard</code> hook reads the active
          agent identity from the session state, looks up its
          allowed and denied tool lists in the registry, and either
          permits or refuses the call. The agent cannot escape its
          permission set by claiming to be a different agent &mdash;
          identity validation runs first and verifies the claim
          against the session token.
        </p>

        <h3>Tiers</h3>
        <ul>
          <li><strong>solo</strong> &mdash; one developer, one agent, minimal hooks</li>
          <li><strong>team</strong> &mdash; small team, full Standing Orders, basic observability</li>
          <li><strong>governed</strong> &mdash; production governance, full enforcement, brain enabled</li>
          <li><strong>production</strong> &mdash; multi-agent fleet, control plane, runaway detection</li>
          <li><strong>enterprise</strong> &mdash; everything plus mTLS, OAuth, audit logging, A2A</li>
        </ul>
      </section>

      {/* ============== 8. CONTROL PLANE ============== */}

      <section className="doc" id="control-plane">
        <h2>
          <span className="doc-num">08</span>
          The Control Plane
        </h2>
        <p>
          The control plane is the TypeScript application that watches
          everything. Hooks emit events; the control plane ingests
          them, runs runaway detection, captures execution traces, and
          makes the whole thing browsable from a dashboard.
        </p>

        <h3>Starting it</h3>
        <pre className="code-block"><code>
{`$ npm start --prefix control-plane

[control-plane] event ingester listening on :4000
[control-plane] dashboard listening on http://localhost:4001
[control-plane] runaway detector armed (SPC baseline loaded)
[control-plane] trace store: .admiral/traces/`}
        </code></pre>

        <h3>What it watches</h3>
        <ul>
          <li><strong>Event stream</strong> &mdash; every hook fire, every tool call, every standing-order check</li>
          <li><strong>Runaway detector</strong> &mdash; statistical process control on tool usage; alerts when an agent&rsquo;s call rate deviates from its baseline</li>
          <li><strong>Execution traces</strong> &mdash; full traces of agent sessions, browsable in the dashboard</li>
          <li><strong>Token budgets</strong> &mdash; live tally of tokens consumed against the configured ceiling</li>
        </ul>

        <h3>An emitted event</h3>
        <pre className="code-block"><code>
{`{
  "ts": "2026-04-10T15:42:18.421Z",
  "session_id": "sess-1775923800",
  "agent": "code-reviewer",
  "event": "tool_use",
  "tool": "Read",
  "tool_input": { "file_path": "src/errors.ts" },
  "duration_ms": 12,
  "outcome": "ok",
  "tokens_in": 4218,
  "tokens_out": 87
}`}
        </code></pre>

        <p>
          The control plane is the answer to &ldquo;what is the fleet
          actually doing right now?&rdquo; You do not run it in the
          starter profile, but you should run it the moment you have
          more than one agent active.
        </p>
      </section>

      {/* ============== 9. RECOVERY LADDER ============== */}

      <section className="doc" id="recovery">
        <h2>
          <span className="doc-num">09</span>
          The Recovery Ladder
        </h2>
        <p>
          When something fails, agents do not loop and they do not
          give up at the first error. SO-06 defines an escalating
          response &mdash; the recovery ladder &mdash; with five rungs.
          Each rung must be tried in order; you cannot skip rungs.
        </p>

        <table className="tier-table">
          <thead>
            <tr>
              <th>Rung</th>
              <th>What it means</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>Retry</td><td>Try the same approach with variation. Two or three attempts maximum, each one genuinely different.</td></tr>
            <tr><td>Fallback</td><td>Use a simpler, less optimal approach that still satisfies the requirement.</td></tr>
            <tr><td>Backtrack</td><td>Roll back to the last checkpoint and try a fundamentally different path.</td></tr>
            <tr><td>Isolate</td><td>Mark the task as blocked, document the blocker, move to the next task.</td></tr>
            <tr><td>Escalate</td><td>Produce a structured escalation report and stop. State what is blocked, what was tried, and what is needed.</td></tr>
          </tbody>
        </table>

        <h3>What an escalation looks like</h3>
        <pre className="code-block"><code>
{`ESCALATION

WHAT IS BLOCKED
  Task task/phase-09/04-mutation-tests cannot complete because
  Stryker mutation runner exits 137 (out of memory) on the runaway
  detector module.

LADDER ATTEMPTS
  1. Retry:    Reduced concurrency from 4 to 2. Same OOM.
  2. Retry:    Reduced concurrency to 1. Same OOM.
  3. Fallback: Excluded the runaway-detector tests from mutation.
               Other modules complete. Rejected — defeats the point.
  4. Backtrack: Rolled back to the prior runaway-detector
                refactor. Mutation runs but coverage drops.
  5. Isolate:  Marked task blocked. Brain entry recorded:
               brain-1775924188-c8e2.

WHAT I NEED
  An ADR-level decision: do we accept the lower coverage, or do we
  invest in raising the mutation runner's memory ceiling? Both have
  costs. I cannot make this call autonomously — it changes the
  quality bar for the phase.`}
        </code></pre>

        <p>
          The discipline of the ladder is that you do not loop at any
          step. If retries do not work, you move down. If fallback
          does not satisfy the requirement, you backtrack. The
          structure exists so that an agent in trouble produces a
          decision-grade artifact rather than thrashing.
        </p>
      </section>

      {/* ============== 10. PRE-WORK VALIDATION ============== */}

      <section className="doc" id="prework">
        <h2>
          <span className="doc-num">10</span>
          Pre-Work Validation
        </h2>
        <p>
          SO-15 requires that before beginning any task, the agent
          confirm four things. The <code>pre_work_validator</code>{" "}
          hook fires at the start of every task and refuses to let
          work begin until all four are answered.
        </p>

        <h3>The four questions</h3>
        <ol>
          <li><strong>Clear end goal.</strong> What specific outcome defines success? Defined precisely enough that completion is objectively measurable.</li>
          <li><strong>Defined budget.</strong> What is the token, time, or tool-call allocation for this task?</li>
          <li><strong>Explicit scope boundaries.</strong> What is in scope and what is out of scope?</li>
          <li><strong>Sufficient context.</strong> Do I have what I need, or am I context-starved?</li>
        </ol>

        <h3>The validator output</h3>
        <pre className="code-block"><code>
{`$ echo '{"task_id":"task/phase-09/03-typed-errors"}' | bash .hooks/pre_work_validator.sh

{
  "hook": "pre_work_validator",
  "task_id": "task/phase-09/03-typed-errors",
  "checks": {
    "end_goal":   { "ok": true,  "value": "All control-plane errors typed via TypedError hierarchy" },
    "budget":     { "ok": true,  "value": "60 minutes, 100k tokens, 50 tool calls" },
    "scope":      { "ok": true,  "in": ["control-plane/src/errors.ts","control-plane/src/**/*.ts"], "out": ["aiStrat/","admiral/"] },
    "context":    { "ok": true,  "loaded": ["ADMIRAL_STYLE.md","docs/adr/0007-error-handling.md"] }
  },
  "verdict": "PASS",
  "exit_code": 0
}`}
        </code></pre>

        <p>
          If any of the four checks fails, the verdict is{" "}
          <code>BLOCK</code> and the validator exits with code 2. The
          task does not begin until the missing piece is supplied.
          This is the discipline that prevents agents from charging
          into work without knowing what done looks like &mdash; the
          single most common cause of agent thrash.
        </p>

        <div className="callout tip">
          <span className="callout-label">Wrapping up</span>
          <p>
            You have now seen every feature in Admiral with at least
            one worked example. The ten sections above cover Standing
            Orders, decision authority, hooks, the Brain, work
            structure, EDD, the fleet, the control plane, the recovery
            ladder, and pre-work validation. Together they are the
            governance system. Read the chronicle if you want the
            story of how it was built; read the phase impact page if
            you want the architecture in slices.
          </p>
        </div>
      </section>

      <footer className="end-border">
        <div className="nav-links">
          <NavLink href="/admiral">&larr; What Admiral Is</NavLink>
          <NavLink href="/getting-started">&larr; Getting Started</NavLink>
          <NavLink href="/chronicle">The Chronicle &rarr;</NavLink>
        </div>
        <div className="colophon">
          Ten features &middot; one worked example each
        </div>
      </footer>
    </article>
  );
}
