import Link from "next/link";
import NavLink from "@/components/NavLink";
import CommitGraph from "@/components/CommitGraph";
import { VARIANTS, getVariantIndex } from "@/components/graphVariants";
import type { VizVariant } from "@/components/CommitGraph";
import graphData from "@/app/graph/data.json";

/**
 * Shared page template for each /graph/{variant} route.
 * Takes just the variant key and renders the header, canvas, and
 * prev/next navigation automatically.
 */
export default function GraphVariantPage({ variant }: { variant: VizVariant }) {
  const meta = VARIANTS.find((v) => v.key === variant)!;
  const idx = getVariantIndex(variant);
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

      <CommitGraph data={graphData} variant={variant} />

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
            {graphData.totalCommits} commits &middot; {meta.name.toLowerCase()} view
          </div>
        </footer>
      </div>
    </article>
  );
}
