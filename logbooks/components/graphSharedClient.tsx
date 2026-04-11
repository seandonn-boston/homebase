"use client";

/*
 * graphSharedClient — React hooks and JSX components shared by every
 * graph variant. Split out from graphShared.ts so the data-only
 * module stays server-safe.
 */

import { useState, useEffect, useCallback } from "react";
import { Commit } from "./graphShared";

// --- Pinned commit stack hook ----------------------------------------------

export function useCommitStack(
  totalCommits: number,
  options: { initial?: number[]; stepMode?: "pan" | "stack" } = {}
) {
  const [pinnedIdxs, setPinnedIdxs] = useState<number[]>(options.initial ?? []);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const handleClick = useCallback((idx: number) => {
    setPinnedIdxs((curr) => {
      if (curr[0] === idx) return curr.slice(1);
      return [idx, ...curr.filter((i) => i !== idx)];
    });
  }, []);

  const handleDismiss = useCallback((idx: number) => {
    setPinnedIdxs((curr) => curr.filter((i) => i !== idx));
  }, []);

  useEffect(() => {
    if (options.stepMode !== "stack") return;
    const max = totalCommits - 1;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;
      let delta = 0;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") delta = 1;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") delta = -1;
      else if (e.key === "PageDown") delta = 20;
      else if (e.key === "PageUp") delta = -20;
      else if (e.key === "Escape") {
        setPinnedIdxs([]);
        e.preventDefault();
        return;
      } else {
        return;
      }
      setPinnedIdxs((curr) => {
        if (curr.length === 0) return [Math.max(0, Math.min(delta, max))];
        const top = curr[0];
        const next = Math.max(0, Math.min(top + delta, max));
        if (next === top) return curr;
        return [next, ...curr.slice(1).filter((i) => i !== next)];
      });
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [totalCommits, options.stepMode]);

  return {
    pinnedIdxs,
    hoveredIdx,
    setHoveredIdx,
    handleClick,
    handleDismiss,
    clearStack: () => setPinnedIdxs([]),
  };
}

// --- StackCard -------------------------------------------------------------

const REPO_URL = "https://github.com/seandonn-boston/helm";

interface StackCardProps {
  commit: Commit;
  idx: number;
  total: number;
  isTop: boolean;
  onDismiss: () => void;
}

function StackCard({ commit, idx, total, isTop, onDismiss }: StackCardProps) {
  const [copied, setCopied] = useState(false);
  useEffect(() => setCopied(false), [commit.short]);

  const date = new Date(commit.date);
  const dateStr = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const cleanRefs = Array.from(
    new Set(
      commit.refs.map((r) =>
        r.replace("HEAD -> ", "").replace("origin/", "").trim()
      )
    )
  ).filter(Boolean);

  const positionFromOldest = total - idx;

  function copySha(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(commit.short).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  return (
    <div className={`stack-card${isTop ? " top" : ""}`}>
      <div className="sc-header">
        <span className="sc-position">
          #{positionFromOldest.toLocaleString()}
        </span>
        <button
          type="button"
          className="sc-close"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          aria-label={`Dismiss commit ${commit.short}`}
          title="Dismiss"
        >
          ×
        </button>
      </div>
      <h3 className="sc-message">{commit.message || "(no message)"}</h3>
      <div className="sc-meta">
        <span className="sc-author">{commit.author}</span>
        <span className="sc-sep">·</span>
        <span className="sc-date">{dateStr}</span>
      </div>
      {cleanRefs.length > 0 && (
        <div className="sc-refs">
          {cleanRefs.slice(0, 3).map((r) => (
            <span key={r} className="sc-ref">
              {r}
            </span>
          ))}
        </div>
      )}
      <div className="sc-actions">
        <button
          type="button"
          className="sc-sha"
          onClick={copySha}
          aria-label={`Copy commit SHA ${commit.short}`}
          title={copied ? "Copied" : "Copy SHA"}
        >
          <code>{commit.short}</code>
          <span className="sc-copy">{copied ? "✓" : "copy"}</span>
        </button>
        <a
          className="sc-link"
          href={`${REPO_URL}/commit/${commit.short}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
        >
          GitHub →
        </a>
      </div>
    </div>
  );
}

interface CommitStackProps {
  pinnedIdxs: number[];
  commits: Commit[];
  onDismiss: (idx: number) => void;
}

export function CommitStack({ pinnedIdxs, commits, onDismiss }: CommitStackProps) {
  if (pinnedIdxs.length === 0) return null;
  return (
    <div
      className="commit-stack"
      aria-live="polite"
      aria-label={`${pinnedIdxs.length} pinned commit${pinnedIdxs.length === 1 ? "" : "s"}`}
    >
      {pinnedIdxs.map((idx, stackPos) => (
        <StackCard
          key={idx}
          commit={commits[idx]}
          idx={idx}
          total={commits.length}
          isTop={stackPos === 0}
          onDismiss={() => onDismiss(idx)}
        />
      ))}
    </div>
  );
}

// --- Hover tooltip ---------------------------------------------------------

interface HoverTooltipProps {
  commit: Commit | null;
}

export function HoverTooltip({ commit }: HoverTooltipProps) {
  if (!commit) return null;
  return (
    <div className="pg-tooltip" aria-hidden="true">
      <code>{commit.short}</code>
      <span className="pg-tooltip-msg">{commit.message}</span>
    </div>
  );
}
