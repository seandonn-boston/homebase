import Link from "next/link";
import NavLink from "@/components/NavLink";
import { VARIANTS, VariantMeta } from "@/components/graphShared";
import graphData from "@/app/graph/data.json";
import type { ReactNode } from "react";

interface Props {
  slug: string;
  children: ReactNode;
}

/**
 * Shared page shell for every /graph/{variant} route.
 * Provides the header (with variant name + description), the content
 * slot where the variant component renders, and the footer nav with
 * prev/next links plus a return-to-gallery link.
 */
export default function GraphPageShell({ slug, children }: Props) {
  const idx = VARIANTS.findIndex((v) => v.slug === slug);
  const meta: VariantMeta = VARIANTS[idx];
  const prev = VARIANTS[(idx - 1 + VARIANTS.length) % VARIANTS.length];
  const next = VARIANTS[(idx + 1) % VARIANTS.length];

  return (
    <article className="page-bleed">
      <div className="page-wider">
        <header className="frontispiece" style={{ marginBottom: "1.5em" }}>
          <div className="eyebrow">
            The Gallery &middot; {meta.numeral} of {VARIANTS.length}
          </div>
          <h1>{meta.name}</h1>
          <p className="subtitle">{meta.description}</p>
        </header>
      </div>

      {children}

      <div className="page-wider">
        <div className="graph-pager">
          <Link href={`/graph/${prev.slug}`} className="graph-pager-link prev">
            <span className="graph-pager-label">
              {prev.numeral} &middot; Previous
            </span>
            <span className="graph-pager-name">{prev.name}</span>
          </Link>
          <Link href="/graph" className="graph-pager-home">
            The Gallery
          </Link>
          <Link href={`/graph/${next.slug}`} className="graph-pager-link next">
            <span className="graph-pager-label">
              Next &middot; {next.numeral}
            </span>
            <span className="graph-pager-name">{next.name}</span>
          </Link>
        </div>

        <footer className="end-border">
          <div className="nav-links">
            <NavLink href="/chronicle">Chronicle</NavLink>
            <NavLink href="/phases">Phases</NavLink>
          </div>
          <div className="colophon">
            {graphData.totalCommits} commits &middot; {meta.name.toLowerCase()}
          </div>
        </footer>
      </div>
    </article>
  );
}
