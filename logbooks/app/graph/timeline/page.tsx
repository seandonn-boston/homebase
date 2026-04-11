import type { Metadata } from "next";
import Link from "next/link";
import CanvasTimeline from "@/components/CanvasTimeline";
import NavLink from "@/components/NavLink";
import graphData from "../data.json";

export const metadata: Metadata = { title: "Canvas Timeline" };

export default function CanvasTimelinePage() {
  return (
    <article className="page-bleed">
      <div className="page-wider">
        <header className="frontispiece" style={{ marginBottom: "1.5em" }}>
          <div className="eyebrow">The Helm Chronicle &middot; Companion</div>
          <h1>Canvas Timeline</h1>
          <p className="subtitle">
            The same data as a horizontal scrolling timeline. Rendered on a
            plain HTML canvas &mdash; no three.js, no SVG, no dependencies.
            One function, one canvas, one draw loop.
          </p>
        </header>
      </div>

      <CanvasTimeline data={graphData} />

      <div className="page-wider">
        <div className="graph-alternatives">
          <p className="alt-label">Other views</p>
          <Link href="/graph" className="alt-link">
            <span className="alt-name">Growing Tree (3D)</span>
            <span className="alt-desc">
              The three.js original with full orbit and depth
            </span>
          </Link>
          <Link href="/graph/svg-tree" className="alt-link">
            <span className="alt-name">SVG Tree</span>
            <span className="alt-desc">
              Flat 2D illustration as scalable vector graphics
            </span>
          </Link>
        </div>

        <footer className="end-border">
          <div className="nav-links">
            <NavLink href="/chronicle">Chronicle</NavLink>
            <NavLink href="/phases">Phases</NavLink>
          </div>
          <div className="colophon">
            {graphData.totalCommits} commits &middot; HTML Canvas 2D &middot; zero deps
          </div>
        </footer>
      </div>
    </article>
  );
}
