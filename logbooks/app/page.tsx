import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Helm Chronicle — Logbooks",
};

export default function Home() {
  return (
    <article className="page-wide">
      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <div className="eyebrow">Admiral &middot; Engineering Logbooks</div>
        <h1>The Helm Chronicle</h1>
        <p className="tagline">
          How a manuscript became a governed codebase
          <br />
          in fifty-two days.
        </p>
        <div className="colophon">
          1,242 commits &middot; 354 pull requests &middot; 9 April 2026
        </div>
      </section>

      <div className="landing-links">
        <Link href="/admiral" className="landing-card">
          <span className="label">I &middot; The Framework</span>
          <h2>What Admiral Is</h2>
          <p>
            The premise, the three pillars, the four decision authority tiers,
            and the sixteen Standing Orders that define how Admiral governs
            agent fleets.
          </p>
        </Link>

        <Link href="/getting-started" className="landing-card">
          <span className="label">II &middot; Setup</span>
          <h2>Getting Started</h2>
          <p>
            Prerequisites, clone, install, hooks, tests. Linear, command by
            command, from terminal to governed session.
          </p>
        </Link>

        <Link href="/tutorial" className="landing-card">
          <span className="label">III &middot; Walkthrough</span>
          <h2>Feature Tutorial</h2>
          <p>
            Every Admiral feature with a worked example: Standing Orders,
            hooks, the Brain, EDD, the Fleet Registry, the Control Plane, the
            recovery ladder.
          </p>
        </Link>

        <Link href="/chronicle" className="landing-card">
          <span className="label">IV &middot; The Narrative</span>
          <h2>The Chronicle</h2>
          <p>
            The full narrative &mdash; from the first commit on February 16
            through the final cleanup on April 8. Press play and let the
            chronicle read itself to you.
          </p>
        </Link>

        <Link href="/phases" className="landing-card">
          <span className="label">V &middot; The Architecture</span>
          <h2>Phase Impact</h2>
          <p>
            Fifteen phases, equally weighed &mdash; what each one built, what
            each one changed, and why the codebase is different because of it.
          </p>
        </Link>

        <Link href="/graph" className="landing-card">
          <span className="label">VI &middot; The Topology</span>
          <h2>Commit Graph</h2>
          <p>
            The full commit history as an edge-to-edge timeline &mdash; 1,242
            commits, 354 pull requests, every branch and merge visualized.
          </p>
        </Link>
      </div>

      <footer className="end">
        <div>Finis</div>
      </footer>
    </article>
  );
}
