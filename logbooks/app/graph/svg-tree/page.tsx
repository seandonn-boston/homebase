import type { Metadata } from "next";
import Link from "next/link";
import SvgTree from "@/components/SvgTree";
import NavLink from "@/components/NavLink";
import graphData from "../data.json";

export const metadata: Metadata = { title: "SVG Tree" };

export default function SvgTreePage() {
  return (
    <article className="page-bleed">
      <div className="page-wider">
        <header className="frontispiece" style={{ marginBottom: "1.5em" }}>
          <div className="eyebrow">The Helm Chronicle &middot; Companion</div>
          <h1>SVG Tree</h1>
          <p className="subtitle">
            The same growing tree rendered flat in 2D as scalable vector
            graphics. No WebGL, no three.js &mdash; just{" "}
            <code>&lt;svg&gt;</code> paths and circles.
          </p>
        </header>
      </div>

      <SvgTree data={graphData} />

      <div className="page-wider">
        <div className="graph-alternatives">
          <p className="alt-label">Other views</p>
          <Link href="/graph" className="alt-link">
            <span className="alt-name">Growing Tree (3D)</span>
            <span className="alt-desc">
              The three.js original with full orbit and depth
            </span>
          </Link>
          <Link href="/graph/timeline" className="alt-link">
            <span className="alt-name">Canvas Timeline</span>
            <span className="alt-desc">
              Horizontal scrolling timeline on HTML canvas
            </span>
          </Link>
        </div>

        <footer className="end-border">
          <div className="nav-links">
            <NavLink href="/chronicle">Chronicle</NavLink>
            <NavLink href="/phases">Phases</NavLink>
          </div>
          <div className="colophon">
            {graphData.totalCommits} commits &middot; flat SVG &middot; zero deps
          </div>
        </footer>
      </div>
    </article>
  );
}
