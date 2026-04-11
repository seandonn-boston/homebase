import type { Metadata } from "next";
import NavLink from "@/components/NavLink";
import ParallaxGraph from "@/components/ParallaxGraph";
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
          <h1>The Long Scroll</h1>
          <p className="subtitle">
            Fifty-two days of commits on a single tall page. Scroll the
            page to move through time. The phase numerals drift behind
            the graph, the month names drift through the middle, and the
            callouts float forward.
          </p>
        </header>
      </div>

      <ParallaxGraph data={graphData} />

      <div className="page-wider">
        <footer className="end-border">
          <div className="nav-links">
            <NavLink href="/chronicle">Chronicle</NavLink>
            <NavLink href="/phases">Phases</NavLink>
          </div>
          <div className="colophon">
            {graphData.totalCommits} commits &middot; {graphData.dates.length}{" "}
            active days &middot; one long scroll
          </div>
        </footer>
      </div>
    </article>
  );
}
