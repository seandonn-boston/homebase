"use client";

/*
 * Slideshow — five full-viewport slides, one per phase. Scroll-snap
 * horizontal gives you a magazine-style paginated experience. Each
 * slide has big Baskerville typography, phase statistics, and a
 * compact commit list for that phase.
 */

import { useMemo } from "react";
import {
  GraphData,
prepareLayout,
PHASE_META,
PHASE_COUNT,
} from "./graphShared";
import {
  useCommitStack,
CommitStack,
} from "./graphSharedClient";

export default function Slideshow({ data }: { data: GraphData }) {
  const { layouts, phases } = useMemo(() => prepareLayout(data), [data]);
  const { pinnedIdxs, handleClick, handleDismiss } = useCommitStack(
    data.commits.length
  );

  // Commits by phase (sorted oldest first within each phase)
  const commitsByPhase = useMemo(() => {
    const out: Record<number, typeof layouts> = {};
    for (let p = 0; p < PHASE_COUNT; p++) {
      out[p] = layouts
        .filter((l) => l.phase === p)
        .sort((a, b) => a.t - b.t);
    }
    return out;
  }, [layouts]);

  const firstCommitDate = (p: number) => {
    const arr = commitsByPhase[p];
    if (!arr.length) return "";
    return new Date(arr[0].commit.date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
    });
  };

  const lastCommitDate = (p: number) => {
    const arr = commitsByPhase[p];
    if (!arr.length) return "";
    return new Date(arr[arr.length - 1].commit.date).toLocaleDateString(
      "en-GB",
      { day: "numeric", month: "long" }
    );
  };

  return (
    <div className="sls-graph">
      <div className="sls-container">
        {phases.map((p) => {
          const meta = PHASE_META[p.index];
          const phaseCommits = commitsByPhase[p.index];
          const taggedCommits = phaseCommits
            .filter((c) => c.commit.refs.length > 0)
            .slice(0, 6);
          return (
            <section
              key={`slide-${p.index}`}
              className="sls-slide"
              id={`phase-${p.index}`}
            >
              <div className="sls-num">{meta.numeral}</div>
              <div className="sls-body">
                <div className="sls-eyebrow">{meta.name}</div>
                <h2 className="sls-title">{meta.title}</h2>
                <p className="sls-desc">{meta.desc}</p>
                <div className="sls-stats">
                  <div className="sls-stat">
                    <span className="sls-stat-label">Commits</span>
                    <span className="sls-stat-value">
                      {p.count.toLocaleString()}
                    </span>
                  </div>
                  <div className="sls-stat">
                    <span className="sls-stat-label">From</span>
                    <span className="sls-stat-value">
                      {firstCommitDate(p.index)}
                    </span>
                  </div>
                  <div className="sls-stat">
                    <span className="sls-stat-label">To</span>
                    <span className="sls-stat-value">
                      {lastCommitDate(p.index)}
                    </span>
                  </div>
                </div>
                {taggedCommits.length > 0 && (
                  <>
                    <div className="sls-tagged-label">Highlights</div>
                    <ul className="sls-tagged">
                      {taggedCommits.map((t) => (
                        <li key={t.idx}>
                          <button
                            type="button"
                            className="sls-tagged-btn"
                            onClick={() => handleClick(t.idx)}
                          >
                            <code className="sls-tagged-sha">
                              {t.commit.short}
                            </code>
                            <span className="sls-tagged-msg">
                              {t.commit.message}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className="sls-pagination">
                {phases.map((pp) => (
                  <a
                    key={`pg-${pp.index}`}
                    href={`#phase-${pp.index}`}
                    className={`sls-dot${pp.index === p.index ? " active" : ""}`}
                    aria-label={`Jump to ${PHASE_META[pp.index].name}`}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <div className="sls-hint">
        Scroll-snap horizontal &middot; each slide is a phase
      </div>

      <CommitStack
        pinnedIdxs={pinnedIdxs}
        commits={data.commits}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
