import type { Metadata } from "next";
import NavLink from "@/components/NavLink";

export const metadata: Metadata = {
  title: "Getting Started",
  description:
    "Set up Admiral end to end: prerequisites, clone, build, hooks, tests, your first governed Claude Code session.",
};

export default function GettingStartedPage() {
  return (
    <article className="page-wide">
      <header className="frontispiece">
        <div className="eyebrow">The Admiral Framework</div>
        <h1>Getting Started</h1>
        <p className="subtitle">
          From an empty terminal to a fully governed agent session in roughly
          fifteen minutes &mdash; with every command, every expected output,
          and every checkpoint along the way.
        </p>
      </header>

      <div className="doc-toc">
        <span className="toc-label">Steps</span>
        <ol>
          <li><a href="#prerequisites">Prerequisites</a></li>
          <li><a href="#clone">Clone the repository</a></li>
          <li><a href="#build">Build the control plane</a></li>
          <li><a href="#hooks">Enable the pre-commit hook</a></li>
          <li><a href="#tests">Run the test suites</a></li>
          <li><a href="#deps">Verify Admiral dependencies</a></li>
          <li><a href="#session">Start your first governed session</a></li>
          <li><a href="#brain">Record your first brain entry</a></li>
          <li><a href="#next">Where to go next</a></li>
        </ol>
      </div>

      <section className="doc" id="prerequisites">
        <h2>
          <span className="doc-num">01</span>
          Prerequisites
        </h2>
        <p>
          Admiral has a deliberately small dependency surface. The hook
          runtime is bash with <code>jq</code>; the control plane is
          TypeScript on Node. You should have the following installed
          before you begin.
        </p>
        <ul>
          <li><strong>Node.js 22 or later</strong> &mdash; <code>nvm install 22</code> or download from nodejs.org</li>
          <li><strong>jq 1.6 or later</strong> &mdash; <code>brew install jq</code>, <code>apt install jq</code>, or the windows installer</li>
          <li><strong>Git 2.30 or later</strong> &mdash; comes with most package managers</li>
          <li><strong>ShellCheck 0.8 or later</strong> &mdash; optional but strongly recommended; the pre-commit hook uses it</li>
          <li><strong>Claude Code</strong> &mdash; the agent runtime that Admiral hooks into</li>
        </ul>
        <p>Verify each tool is on your path:</p>
        <pre className="code-block"><code>
{`$ node --version
v22.4.0
$ jq --version
jq-1.7.1
$ git --version
git version 2.43.0
$ shellcheck --version
ShellCheck - shell script analysis tool
version: 0.10.0`}
        </code></pre>

        <div className="callout warn">
          <span className="callout-label">Watch out</span>
          <p>
            Older Node versions and older jq versions both fail in
            non-obvious ways. The control plane build will succeed under
            Node 18 but the test suite uses APIs that require Node 22. The
            jq feature requirement is the named argument syntax which
            stabilized in 1.6. If anything below seems strange, check the
            versions first.
          </p>
        </div>
      </section>

      <section className="doc" id="clone">
        <h2>
          <span className="doc-num">02</span>
          Clone the repository
        </h2>
        <p>
          Admiral lives in the <code>helm</code> monorepo. Clone it
          anywhere on your machine.
        </p>
        <pre className="code-block"><code>
{`$ git clone https://github.com/seandonn-boston/helm.git
$ cd helm`}
        </code></pre>
        <p>
          The directory you land in is the project root. Every path in this
          guide is relative to it.
        </p>
      </section>

      <section className="doc" id="build">
        <h2>
          <span className="doc-num">03</span>
          Build the control plane
        </h2>
        <p>
          The TypeScript control plane provides the observability layer:
          event ingestion, runaway detection, and the dashboard. It is the
          first thing to build because the hook tests depend on having
          a built control plane available.
        </p>
        <pre className="code-block"><code>
{`$ npm install --prefix control-plane
$ npm run build --prefix control-plane`}
        </code></pre>
        <p>
          Both commands should complete with no warnings. If the build
          fails, the most common cause is a Node version mismatch &mdash;
          the project pins Node 22 in <code>.nvmrc</code> for a reason.
        </p>
      </section>

      <section className="doc" id="hooks">
        <h2>
          <span className="doc-num">04</span>
          Enable the pre-commit hook
        </h2>
        <p>
          The repository ships its own pre-commit hooks under{" "}
          <code>.githooks/</code> instead of the default{" "}
          <code>.git/hooks/</code> location, so they can be version
          controlled. Tell git to use them:
        </p>
        <pre className="code-block"><code>
{`$ git config core.hooksPath .githooks`}
        </code></pre>
        <p>
          From this point on, every commit you make in this repository will
          run ShellCheck on staged <code>.sh</code> files and Biome on
          staged <code>.ts</code> files. Failures block the commit. This is
          intentional &mdash; it is the same enforcement discipline that
          Admiral uses on the agent side, applied to the human side.
        </p>
      </section>

      <section className="doc" id="tests">
        <h2>
          <span className="doc-num">05</span>
          Run the test suites
        </h2>
        <p>
          There are three test suites to run, in this order. They each
          verify a different layer.
        </p>

        <h3>The TypeScript suite</h3>
        <pre className="code-block"><code>
{`$ npm test --prefix control-plane`}
        </code></pre>
        <p>
          You should see roughly nine hundred tests pass with coverage
          above ninety percent. This verifies the control plane is wired
          end to end.
        </p>

        <h3>The bash hook suite</h3>
        <pre className="code-block"><code>
{`$ bash .hooks/tests/test_hooks.sh`}
        </code></pre>
        <p>
          This walks every hook in <code>.hooks/</code> through its
          documented contract: a representative payload on stdin, the
          expected output on stdout, the expected exit code. Hooks fail
          their tests far more loudly than they fail in production, so a
          green run here is meaningful.
        </p>

        <h3>The Admiral library suite</h3>
        <pre className="code-block"><code>
{`$ bash admiral/tests/test_state.sh
$ bash admiral/tests/test_jq_helpers.sh`}
        </code></pre>
        <p>
          These cover the shared bash libraries that the hooks themselves
          depend on. If any of these fail, the hooks above are running on
          a broken foundation.
        </p>
      </section>

      <section className="doc" id="deps">
        <h2>
          <span className="doc-num">06</span>
          Verify Admiral dependencies
        </h2>
        <p>
          Admiral ships a dependency checker at{" "}
          <code>admiral/bin/check_dependencies</code>. It is the
          authoritative answer to the question &ldquo;is my machine ready
          to run Admiral?&rdquo;
        </p>
        <pre className="code-block"><code>
{`$ admiral/bin/check_dependencies

$ admiral/bin/check_dependencies
[OK]    bash 5.2.21
[OK]    jq 1.7.1
[OK]    git 2.43.0
[OK]    node v22.4.0
[OK]    sha256sum (coreutils)
[OK]    uuidgen
[OK]    date (gnu)
All required tools present. Admiral is ready.`}
        </code></pre>
        <p>
          Anything reported as missing should be installed before you
          continue. The hook adapters fail-open on missing dependencies,
          which means they will not block your work &mdash; but they will
          also not protect you.
        </p>
      </section>

      <section className="doc" id="session">
        <h2>
          <span className="doc-num">07</span>
          Start your first governed session
        </h2>
        <p>
          Now start Claude Code from inside the helm directory. The repo
          ships a <code>.claude/settings.local.json</code> that wires the
          Admiral hooks into Claude Code&rsquo;s lifecycle events. When
          your session starts, you should see the session-start adapter
          fire and the sixteen Standing Orders load into context.
        </p>
        <pre className="code-block"><code>
{`$ claude

[admiral] session_start_adapter.sh — initializing
[admiral] loaded 16 standing orders
[admiral] loaded 5 brain entries (recent decisions)
[admiral] token budget: 200000 (configured per fleet profile)
[admiral] identity verified: agent=primary tier=team
[admiral] session ready`}
        </code></pre>
        <p>
          Each line above corresponds to a real check the session-start
          adapter performs. The hook reads the standing orders from{" "}
          <code>admiral/standing-orders/</code>, loads the most recent
          brain entries, validates the agent identity against{" "}
          <code>admiral/config/fleet_registry.json</code>, and emits the
          token budget configured for your fleet profile.
        </p>

        <div className="callout tip">
          <span className="callout-label">Confirming hooks are active</span>
          <p>
            The simplest way to confirm hooks are firing is to ask the
            agent to do something outside its scope. A hook in the
            pre-tool-use adapter should refuse the action and surface a
            scope-boundary violation. You can also tail{" "}
            <code>.admiral/session_state.json</code> to see the running
            tally of decisions and recoveries.
          </p>
        </div>
      </section>

      <section className="doc" id="brain">
        <h2>
          <span className="doc-num">08</span>
          Record your first brain entry
        </h2>
        <p>
          The Brain is how the fleet remembers things across sessions.
          Recording an entry is a single command. The entry lands in{" "}
          <code>.brain/</code> as a JSON file, git-tracked, durable.
        </p>
        <pre className="code-block"><code>
{`$ admiral/bin/brain_record \\
    --type decision \\
    --category onboarding \\
    --content "First successful Admiral session on this machine." \\
    --tags "setup,first-session"

[brain] recorded entry brain-1775923847-a4f1c92b
[brain] file: .brain/20260410-153247-decision-onboarding.json`}
        </code></pre>
        <p>And read it back to confirm:</p>
        <pre className="code-block"><code>
{`$ admiral/bin/brain_query "first session"

[
  {
    "id": "brain-1775923847-a4f1c92b",
    "type": "decision",
    "category": "onboarding",
    "content": "First successful Admiral session on this machine.",
    "tags": ["setup", "first-session"],
    "created_at": "2026-04-10T15:32:47Z"
  }
]`}
        </code></pre>
        <p>
          You have just round-tripped through the entire B1 brain tier:
          file storage, git tracking, keyword search. Any future Admiral
          session on this machine can find that entry.
        </p>
      </section>

      <section className="doc" id="next">
        <h2>
          <span className="doc-num">09</span>
          Where to go next
        </h2>
        <p>
          You now have a working Admiral installation, hooks loading at
          session start, and the Brain accepting entries. The next thing
          to do is read the tutorial, which walks through every Admiral
          feature with a worked example so you can see how the pieces fit
          together in practice.
        </p>
        <ul>
          <li><strong>Tutorial</strong> &mdash; one example per feature: standing orders, hooks, brain, EDD, fleet, control plane, recovery ladder</li>
          <li><strong>The Chronicle</strong> &mdash; the fifty-two-day narrative of how Admiral was built, with audio narration</li>
          <li><strong>Phase Impact</strong> &mdash; what each of the fifteen phases delivered and why it mattered</li>
        </ul>
      </section>

      <footer className="end-border">
        <div className="nav-links">
          <NavLink href="/admiral">&larr; What Admiral Is</NavLink>
          <NavLink href="/tutorial">Tutorial &rarr;</NavLink>
        </div>
        <div className="colophon">
          From terminal to governed session in fifteen minutes
        </div>
      </footer>
    </article>
  );
}
