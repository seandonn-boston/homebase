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
        <header className="frontispiece" style={{ marginBottom: "1.5em" }}>
          <div className="eyebrow">The Helm Chronicle &middot; Companion</div>
          <h1>The Cube</h1>
          <p className="subtitle">
            The commit history as a 3D diorama &mdash; four visualizations of
            the same 1,242 commits arranged around a central index. Orbit to
            explore.
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
            active days &middot; four visualizations
          </div>
        </footer>
      </div>
    </article>
  );
}
