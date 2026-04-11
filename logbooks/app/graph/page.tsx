import type { Metadata } from "next";
import CommitGraph from "@/components/CommitGraph";
import NavLink from "@/components/NavLink";
import graphData from "./data.json";

export const metadata: Metadata = {
  title: "Commit Graph",
};

export default function GraphPage() {
  return (
    <article className="page-bleed">
      <div className="page-wider">
        <header className="frontispiece" style={{ marginBottom: "2em" }}>
          <div className="eyebrow">The Helm Chronicle &middot; Companion</div>
          <h1>Commit Graph</h1>
          <p className="subtitle">
            1,242 commits across 354 pull requests &mdash; an edge-to-edge
            timeline of the entire history.
          </p>
        </header>
      </div>

      <CommitGraph data={graphData} />

      <div className="page-wider">
        <footer className="end-border">
          <div className="nav-links">
            <NavLink href="/chronicle">Chronicle</NavLink>
            <NavLink href="/phases">Phases</NavLink>
          </div>
          <div className="colophon">
            {graphData.totalCommits} commits &middot; {graphData.dates.length}{" "}
            active days &middot; 9 April 2026
          </div>
        </footer>
      </div>
    </article>
  );
}
