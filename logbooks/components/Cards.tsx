"use client";

/*
 * Cards — horizontal rolodex of physical-looking porcelain cards,
 * one per tagged commit. Snap-scroll between cards.
 */

import { useMemo, useRef, useCallback, useEffect } from "react";
import {
  GraphData,
prepareLayout,
PHASE_META,
REPO_URL,
} from "./graphShared";
import {
  useCommitStack,
CommitStack,
} from "./graphSharedClient";

const CARD_WIDTH_PX = 420;
const CARD_GAP = 48;

export default function Cards({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { layouts } = useMemo(() => prepareLayout(data), [data]);
  const { pinnedIdxs, handleClick, handleDismiss } = useCommitStack(
    data.commits.length
  );

  // Select cards: all tagged commits + phase firsts
  const cardCommits = useMemo(() => {
    const selected = new Map<number, typeof layouts[number]>();
    // All tagged commits
    layouts.forEach((l) => {
      if (l.commit.refs.length > 0) selected.set(l.idx, l);
    });
    // One per phase (oldest commit in phase)
    for (let p = 0; p < 5; p++) {
      const phaseCommits = layouts
        .filter((l) => l.phase === p)
        .sort((a, b) => a.t - b.t);
      if (phaseCommits[0]) selected.set(phaseCommits[0].idx, phaseCommits[0]);
    }
    return Array.from(selected.values()).sort((a, b) => a.t - b.t);
  }, [layouts]);

  const handleWheel = useCallback((e: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const total = (e.deltaY || 0) + (e.deltaX || 0);
    if (total === 0) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const currentScroll = container.scrollLeft;
    const canScroll =
      (total > 0 && currentScroll < maxScroll) ||
      (total < 0 && currentScroll > 0);
    if (canScroll) {
      e.preventDefault();
      container.scrollLeft = Math.max(
        0,
        Math.min(maxScroll, currentScroll + total * 1.5)
      );
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div className="cg-graph">
      <div className="cg-container" ref={containerRef}>
        <div className="cg-stage">
          {cardCommits.map((l, i) => {
            const date = new Date(l.commit.date);
            const dateStr = date.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            const cleanRefs = Array.from(
              new Set(
                l.commit.refs.map((r) =>
                  r.replace("HEAD -> ", "").replace("origin/", "").trim()
                )
              )
            ).filter(Boolean);
            const meta = PHASE_META[l.phase];
            return (
              <article
                key={l.idx}
                className={`cg-card${l.visualLane === 0 ? " main" : ""}`}
                style={{
                  width: `${CARD_WIDTH_PX}px`,
                  transform: `rotate(${(i % 2 === 0 ? -0.5 : 0.5).toFixed(2)}deg)`,
                }}
              >
                <div className="cg-card-header">
                  <span className="cg-card-idx">
                    {String(i + 1).padStart(2, "0")} / {cardCommits.length}
                  </span>
                  <span className="cg-card-phase">
                    {meta.numeral} &middot; {meta.name}
                  </span>
                </div>
                <div className="cg-card-sha">{l.commit.short}</div>
                <h2 className="cg-card-msg">{l.commit.message}</h2>
                <div className="cg-card-meta">
                  <span className="cg-card-author">{l.commit.author}</span>
                  <span className="cg-card-date">{dateStr}</span>
                </div>
                {cleanRefs.length > 0 && (
                  <div className="cg-card-refs">
                    {cleanRefs.slice(0, 3).map((r) => (
                      <span key={r} className="cg-card-ref">
                        {r}
                      </span>
                    ))}
                  </div>
                )}
                <div className="cg-card-footer">
                  <button
                    type="button"
                    className="cg-card-pin"
                    onClick={() => handleClick(l.idx)}
                  >
                    Pin
                  </button>
                  <a
                    className="cg-card-link"
                    href={`${REPO_URL}/commit/${l.commit.short}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on GitHub →
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="cg-hint">
        {cardCommits.length} cards &middot; scroll horizontally &middot; click Pin to add to stack
      </div>

      <CommitStack
        pinnedIdxs={pinnedIdxs}
        commits={data.commits}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
