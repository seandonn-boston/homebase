import type { Metadata } from "next";
import Link from "next/link";
import NavLink from "@/components/NavLink";
import { VARIANTS } from "@/components/graphShared";
import graphData from "./data.json";

export const metadata: Metadata = {
  title: "The Gallery",
};

export default function GraphGalleryPage() {
  return (
    <article className="page-wider">
      <header className="frontispiece">
        <div className="eyebrow">The Helm Chronicle &middot; Companion</div>
        <h1>The Gallery</h1>
        <p className="subtitle">
          Ten ways of seeing the same 1,242 commits. Horizontal scroll.
          Vertical scroll. Spirals, ribbons, cards, calendars, mountains,
          constellations, slideshows, prose. Pick one.
        </p>
      </header>

      <div className="graph-gallery">
        {VARIANTS.map((v) => (
          <Link key={v.slug} href={`/graph/${v.slug}`} className="gallery-card">
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
          {graphData.totalCommits} commits &middot; ten visualizations
        </div>
      </footer>
    </article>
  );
}
