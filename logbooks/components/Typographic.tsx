"use client";

/*
 * Typographic — pure text experiment. Commit messages render as
 * lines of serif text flowing past as you scroll the page.
 * Each phase is a titled chapter break. Significant commits (those
 * with refs) are set larger than normal ones.
 */

import { useMemo } from "react";
import {
  GraphData,
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

  // Group commits by phase, ordered oldest first within phase
  const groupedByPhase = useMemo(() => {
    const out: Record<number, typeof layouts> = {};
    for (let p = 0; p < PHASE_COUNT; p++) {
      out[p] = layouts.filter((l) => l.phase === p).sort((a, b) => a.t - b.t);
    }
    return out;
  }, [layouts]);

  return (
    <div className="tgf-graph">
      <div className="tgf-scroll">
        {Array.from({ length: PHASE_COUNT }, (_, p) => {
          const meta = PHASE_META[p];
          const commits = groupedByPhase[p];
          if (!commits.length) return null;
          return (
            <section key={`ph-${p}`} className="tgf-phase" id={`phase-${p}`}>
              <header className="tgf-phase-header">
                <span className="tgf-phase-num">{meta.numeral}</span>
                <h2 className="tgf-phase-title">{meta.title}</h2>
                <p className="tgf-phase-sub">{meta.name}</p>
                <p className="tgf-phase-desc">{meta.desc}</p>
              </header>

              <ol className="tgf-list">
                {commits.map((l) => {
                  const hasRef = l.commit.refs.length > 0;
                  const isMain = Math.floor(l.visualLane) === 0;
                  const isPinned = pinnedIdxs.includes(l.idx);
                  return (
                    <li
                      key={l.idx}
                      className={`tgf-line${hasRef ? " tagged" : ""}${isMain ? " main" : ""}${isPinned ? " pinned" : ""}`}
                    >
                      <button
                        type="button"
                        className="tgf-line-btn"
                        onClick={() => handleClick(l.idx)}
                      >
                        <code className="tgf-line-sha">{l.commit.short}</code>
                        <span className="tgf-line-msg">{l.commit.message}</span>
                      </button>
                      {hasRef && (
                        <a
                          className="tgf-line-link"
                          href={`${REPO_URL}/commit/${l.commit.short}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          →
                        </a>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>

      <div className="tgf-hint">
        Commits as prose &middot; click a line to pin it
      </div>

      <CommitStack
        pinnedIdxs={pinnedIdxs}
        commits={data.commits}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
