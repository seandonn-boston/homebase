"use client";

/*
 * Typographic — the log as a long-form reading experience.
 *
 * Each phase is a chapter with an illuminated opening (giant Roman
 * numeral dropcap, small-caps phase name, Baskerville title, italic
 * description) and a prose-like list of commits beneath.
 *
 * Tagged commits are set as pull-quotes in larger Baskerville.
 * Main-branch commits carry more weight than side-branch commits.
 * Dates appear as marginalia on the left.
 * A floating phase progress indicator on the right shows where in
 * the chronicle you currently are.
 */

import { useMemo, useState, useEffect, useRef } from "react";
import {
  GraphData,
  Layout,
  prepareLayout,
  PHASE_META,
  PHASE_COUNT,
  REPO_URL,
} from "./graphShared";
import {
  useCommitStack,
  CommitStack,
} from "./graphSharedClient";

export default function Typographic({ data }: { data: GraphData }) {
  const { layouts } = useMemo(() => prepareLayout(data), [data]);
  const { pinnedIdxs, handleClick, handleDismiss } = useCommitStack(
    data.commits.length
  );
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const phaseRefs = useRef<(HTMLElement | null)[]>([]);
  const rafRef = useRef<number>(0);

  // Group commits by phase, ordered oldest first within phase
  const groupedByPhase = useMemo(() => {
    const out: Record<number, Layout[]> = {};
    for (let p = 0; p < PHASE_COUNT; p++) {
      out[p] = layouts.filter((l) => l.phase === p).sort((a, b) => a.t - b.t);
    }
    return out;
  }, [layouts]);

  // Track current phase based on scroll position via IntersectionObserver
  useEffect(() => {
    function onScroll() {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        // Figure out which phase section's top is closest to the top of viewport
        let best = 0;
        let bestDelta = Infinity;
        phaseRefs.current.forEach((el, i) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const delta = Math.abs(rect.top - 100);
          if (rect.top - 100 <= 0 && Math.abs(rect.top - 100) < bestDelta) {
            best = i;
            bestDelta = delta;
          }
        });
        setCurrentPhase(best);
        // Progress: 0 at top of page, 1 at bottom
        const doc = document.documentElement;
        const scroll = window.scrollY;
        const maxScroll = doc.scrollHeight - window.innerHeight;
        setProgress(maxScroll > 0 ? scroll / maxScroll : 0);
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });

  return (
    <div className="tgf-graph">
      {/* Floating phase progress on the right */}
      <aside className="tgf-progress" aria-hidden="true">
        <div className="tgf-progress-inner">
          {Array.from({ length: PHASE_COUNT }, (_, p) => {
            const meta = PHASE_META[p];
            const isCurrent = currentPhase === p;
            return (
              <a
                key={`pr-${p}`}
                href={`#phase-${p}`}
                className={`tgf-progress-item${isCurrent ? " current" : ""}`}
                aria-label={`Jump to ${meta.name}`}
              >
                <span className="tgf-progress-num">{meta.numeral}</span>
                <span className="tgf-progress-name">{meta.name}</span>
              </a>
            );
          })}
        </div>
        <div className="tgf-progress-bar">
          <div
            className="tgf-progress-fill"
            style={{ height: `${progress * 100}%` }}
          />
        </div>
      </aside>

      <div className="tgf-scroll">
        {Array.from({ length: PHASE_COUNT }, (_, p) => {
          const meta = PHASE_META[p];
          const commits = groupedByPhase[p];
          if (!commits.length) return null;

          return (
            <section
              key={`ph-${p}`}
              className="tgf-chapter"
              id={`phase-${p}`}
              ref={(el) => {
                phaseRefs.current[p] = el;
              }}
            >
              {/* Chapter header with illuminated initial */}
              <header className="tgf-chapter-header">
                <div className="tgf-chapter-initial" aria-hidden="true">
                  {meta.numeral}
                </div>
                <div className="tgf-chapter-meta">
                  <div className="tgf-chapter-name">{meta.name}</div>
                  <h2 className="tgf-chapter-title">{meta.title}</h2>
                  <p className="tgf-chapter-desc">{meta.desc}</p>
                  <div className="tgf-chapter-stats">
                    <span className="tgf-stat-count">
                      {p === currentPhase
                        ? `${commits.length} commits`
                        : `${commits.length} commits`}
                    </span>
                    <span className="tgf-stat-sep">·</span>
                    <span className="tgf-stat-range">
                      {formatDate(commits[0].commit.date)} —{" "}
                      {formatDate(commits[commits.length - 1].commit.date)}
                    </span>
                  </div>
                </div>
              </header>

              {/* Chapter body */}
              <div className="tgf-chapter-body">
                {commits.map((l, i) => {
                  const hasRef = l.commit.refs.length > 0;
                  const isMain = Math.floor(l.visualLane) === 0;
                  const isPinned = pinnedIdxs.includes(l.idx);
                  const isHovered = false; // reserved
                  const cleanRefs = Array.from(
                    new Set(
                      l.commit.refs.map((r) =>
                        r
                          .replace("HEAD -> ", "")
                          .replace("origin/", "")
                          .trim()
                      )
                    )
                  ).filter(Boolean);
                  const lineClass = [
                    "tgf-line",
                    hasRef && "tagged",
                    isMain && "main",
                    isPinned && "pinned",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <div key={l.idx} className={lineClass}>
                      <span className="tgf-date">
                        {formatDate(l.commit.date)}
                      </span>
                      <button
                        type="button"
                        className="tgf-line-btn"
                        onClick={() => handleClick(l.idx)}
                      >
                        <code className="tgf-line-sha">{l.commit.short}</code>
                        <span className="tgf-line-msg">
                          {l.commit.message}
                        </span>
                      </button>
                      {cleanRefs.length > 0 && (
                        <div className="tgf-line-refs">
                          {cleanRefs.slice(0, 2).map((r) => (
                            <span key={r} className="tgf-line-ref">
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                      {hasRef && (
                        <a
                          className="tgf-line-link"
                          href={`${REPO_URL}/commit/${l.commit.short}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="View commit on GitHub"
                        >
                          →
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ornamental end-of-chapter flourish */}
              <div className="tgf-chapter-end" aria-hidden="true">
                <span className="tgf-flourish">✦</span>
              </div>
            </section>
          );
        })}
      </div>

      <CommitStack
        pinnedIdxs={pinnedIdxs}
        commits={data.commits}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
