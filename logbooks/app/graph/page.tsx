import type { Metadata } from "next";
import Link from "next/link";
import NavLink from "@/components/NavLink";
import { VARIANTS } from "@/components/graphVariants";
import graphData from "./data.json";

export const metadata: Metadata = {
  title: "Commit Graph",
};

export default function GraphIndexPage() {
  return (
    <article className="page-wide">
      <header className="frontispiece">
        <div className="eyebrow">The Helm Chronicle &middot; Companion</div>
        <h1>The Gallery</h1>
        <p className="subtitle">
          Eight ways of seeing the same 1,242 commits. Each visualization
          lives on its own page, on its own canvas, at its own scale.
          Pick one.
        </p>
      </header>

      <div className="graph-gallery">
        {VARIANTS.map((v) => (
          <Link key={v.key} href={`/graph/${v.slug}`} className="gallery-card">
            <span className="gallery-numeral">{v.numeral}</span>
            <h2>{v.name}</h2>
            <p className="gallery-tagline">{v.tagline}</p>
            <p className="gallery-desc">{v.description}</p>
          </Link>
        ))}
      </div>

      <footer className="end-border">
        <div className="nav-links">
          <NavLink href="/chronicle">Chronicle</NavLink>
          <NavLink href="/phases">Phases</NavLink>
        </div>
        <div className="colophon">
          {graphData.totalCommits} commits &middot; {graphData.dates.length}{" "}
          active days &middot; eight visualizations
        </div>
      </footer>
    </article>
  );
}
