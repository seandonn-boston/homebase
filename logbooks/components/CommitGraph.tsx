"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";

// --- Types -------------------------------------------------------------------

interface Commit {
  short: string;
  author: string;
  date: string;
  message: string;
  refs: string[];
  lane: number;
}

interface Connection {
  from: number;
  to: number;
  fromLane: number;
  toLane: number;
}

interface GraphData {
  totalCommits: number;
  maxLane: number;
  dates: string[];
  commits: Commit[];
  connections: Connection[];
}

// --- Constants ---------------------------------------------------------------

const COL_W = 38;
const ROW_H = 18;
const NODE_R = 4;
const HIT_R = 12;
const PAD_TOP = 38;
const PAD_LEFT = 32;
const PAD_BOTTOM = 24;
const PAD_RIGHT = 48;
const MAX_VISUAL_LANES = 14;
const REPO_URL = "https://github.com/seandonn-boston/helm";

const LANE_COLORS = [
  "#c4503a",
  "#2d5f2d",
  "#1e4a7a",
  "#7a4a1e",
  "#4a1e7a",
  "#1e6a6a",
  "#7a1e5a",
  "#5a6a1e",
  "#3a3a6a",
  "#6a3a1e",
  "#1e5a3a",
  "#5a1e3a",
];

function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}

// --- Visual lane compaction --------------------------------------------------

function computeVisualLanes(
  commits: Commit[],
  connections: Connection[]
): { visualLane: number[]; maxVisualLane: number } {
  const laneCounts = new Map<number, number>();
  commits.forEach((c) => laneCounts.set(c.lane, (laneCounts.get(c.lane) || 0) + 1));

  const significantLanes = [...laneCounts.entries()]
    .filter(([, count]) => count >= 3)
    .sort((a, b) => {
      if (a[0] === 0) return -1;
      if (b[0] === 0) return 1;
      return b[1] - a[1];
    })
    .map(([lane]) => lane);

  const laneToVisual = new Map<number, number>();
  significantLanes.forEach((lane, i) => laneToVisual.set(lane, i));

  const maxSignificant = significantLanes.length;

  const connectionMap = new Map<number, number>();
  for (const conn of connections) {
    if (!connectionMap.has(conn.from)) {
      connectionMap.set(conn.from, conn.toLane);
    }
  }

  const visualLane: number[] = [];
  let ephemeralNext = maxSignificant;

  for (let i = 0; i < commits.length; i++) {
    const c = commits[i];
    const vl = laneToVisual.get(c.lane);
    if (vl !== undefined) {
      visualLane.push(vl);
    } else {
      const parentLane = connectionMap.get(i);
      if (parentLane !== undefined && laneToVisual.has(parentLane)) {
        visualLane.push(laneToVisual.get(parentLane)! + 0.5);
      } else {
        visualLane.push(ephemeralNext);
        ephemeralNext++;
      }
    }
  }

  const uniqueVLs = [...new Set(visualLane)].sort((a, b) => a - b);
  const vlMap = new Map<number, number>();
  uniqueVLs.forEach((v, i) => vlMap.set(v, i));

  const compacted = visualLane.map((v) => vlMap.get(v)!);
  const maxVL = uniqueVLs.length - 1;

  return { visualLane: compacted, maxVisualLane: maxVL };
}

// --- Stack card --------------------------------------------------------------

function StackCard({
  commit,
  activeIdx,
  total,
  isTop,
  onDismiss,
}: {
  commit: Commit;
  activeIdx: number;
  total: number;
  isTop: boolean;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [commit.short]);

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

  const positionFromOldest = total - activeIdx;

  function copySha(e: React.MouseEvent) {
    e.stopPropagation();
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    navigator.clipboard.writeText(commit.short).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }

  function handleDismiss(e: React.MouseEvent) {
    e.stopPropagation();
    onDismiss();
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
          onClick={handleDismiss}
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

// --- Main component ----------------------------------------------------------

export default function CommitGraph({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  // Pre-pin the newest commit so first paint isn't empty.
  const [pinnedIdxs, setPinnedIdxs] = useState<number[]>([0]);

  const { visualLane, maxVisualLane } = useMemo(
    () => computeVisualLanes(data.commits, data.connections),
    [data.commits, data.connections]
  );

  const cappedMaxLane = Math.min(maxVisualLane, MAX_VISUAL_LANES);

  const totalW = PAD_LEFT + data.commits.length * COL_W + PAD_RIGHT;
  const totalH = PAD_TOP + (cappedMaxLane + 1) * ROW_H + PAD_BOTTOM;

  const cx = useCallback(
    (idx: number) => PAD_LEFT + idx * COL_W + COL_W / 2,
    []
  );
  const cy = useCallback(
    (idx: number) => {
      const vl = Math.min(visualLane[idx], cappedMaxLane);
      return PAD_TOP + vl * ROW_H + ROW_H / 2;
    },
    [visualLane, cappedMaxLane]
  );

  // Stack lookups
  const pinnedSet = useMemo(() => new Set(pinnedIdxs), [pinnedIdxs]);
  const topPinned = pinnedIdxs[0] ?? null;

  // --- Click handler: promote / deselect ----

  const handleDotClick = useCallback((idx: number) => {
    setPinnedIdxs((curr) => {
      // Click on the top-most pinned commit dismisses it.
      if (curr[0] === idx) return curr.slice(1);
      // Otherwise: add or promote to top, removing any existing copy.
      return [idx, ...curr.filter((i) => i !== idx)];
    });
  }, []);

  const handleDismiss = useCallback((idx: number) => {
    setPinnedIdxs((curr) => curr.filter((i) => i !== idx));
  }, []);

  // --- Auto-scroll to newest on mount ----

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollLeft = 0;
  }, []);

  // --- Keyboard navigation (when graph has focus) ----

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const max = data.commits.length - 1;

    const stepTopBy = (delta: number) => {
      setPinnedIdxs((curr) => {
        if (curr.length === 0) {
          const start = Math.max(0, Math.min(delta, max));
          return [start];
        }
        const top = curr[0];
        const next = Math.max(0, Math.min(top + delta, max));
        if (next === top) return curr;
        return [next, ...curr.slice(1).filter((i) => i !== next)];
      });
    };

    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        stepTopBy(1);
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        stepTopBy(-1);
        e.preventDefault();
      } else if (e.key === "PageDown") {
        stepTopBy(20);
        e.preventDefault();
      } else if (e.key === "PageUp") {
        stepTopBy(-20);
        e.preventDefault();
      } else if (e.key === "Home") {
        setPinnedIdxs((curr) =>
          curr[0] === 0 ? curr : [0, ...curr.filter((i) => i !== 0)]
        );
        e.preventDefault();
      } else if (e.key === "End") {
        setPinnedIdxs((curr) =>
          curr[0] === max ? curr : [max, ...curr.filter((i) => i !== max)]
        );
        e.preventDefault();
      } else if (e.key === "Escape") {
        // Esc clears the entire stack
        setPinnedIdxs([]);
        e.preventDefault();
      }
    };
    el.addEventListener("keydown", handler);
    return () => el.removeEventListener("keydown", handler);
  }, [data.commits.length]);

  // --- Scroll the top-pinned commit into view smoothly ----

  useEffect(() => {
    const el = containerRef.current;
    if (!el || topPinned === null) return;
    const targetX = cx(topPinned);
    const w = el.clientWidth;
    const left = el.scrollLeft;
    const margin = 120;
    if (targetX < left + margin || targetX > left + w - margin) {
      el.scrollTo({ left: targetX - w / 2, behavior: "smooth" });
    }
  }, [topPinned, cx]);

  // --- Date axis labels ----

  const filteredLabels = useMemo(() => {
    const monthLabels: { x: number; label: string }[] = [];
    let lastMonth = "";
    for (let i = data.commits.length - 1; i >= 0; i--) {
      const d = data.commits[i].date.slice(0, 7);
      if (d !== lastMonth) {
        lastMonth = d;
        const date = new Date(data.commits[i].date);
        monthLabels.push({
          x: cx(i),
          label: date.toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          }),
        });
      }
    }
    const result: typeof monthLabels = [];
    let lastX = -200;
    for (const ml of monthLabels) {
      if (ml.x - lastX > 150) {
        result.push(ml);
        lastX = ml.x;
      }
    }
    return result;
  }, [data.commits, cx]);

  // --- Render ----

  return (
    <div className="graph-bleed">
      <div
        ref={containerRef}
        className="graph-scroll"
        tabIndex={0}
        role="application"
        aria-label="Commit graph — click any commit to pin, click again to dismiss, arrow keys to navigate"
      >
        <svg
          width={totalW}
          height={totalH}
          viewBox={`0 0 ${totalW} ${totalH}`}
          className="graph-svg"
        >
          {/* Subtle alternating lane backgrounds */}
          {Array.from({ length: cappedMaxLane + 1 }, (_, i) => (
            <rect
              key={`lane-${i}`}
              x={0}
              y={PAD_TOP + i * ROW_H}
              width={totalW}
              height={ROW_H}
              fill={i % 2 === 0 ? "rgba(196, 80, 58, 0.025)" : "transparent"}
            />
          ))}

          {/* Date axis labels */}
          {filteredLabels.map((ml, i) => (
            <text
              key={i}
              x={ml.x}
              y={20}
              textAnchor="middle"
              className="graph-date-label"
            >
              {ml.label}
            </text>
          ))}

          {/* Connection lines */}
          {data.connections.map((conn, i) => {
            const x1 = cx(conn.from);
            const y1 = cy(conn.from);
            const x2 = cx(conn.to);
            const y2 = cy(conn.to);

            if (y1 === y2) {
              return (
                <line
                  key={`c${i}`}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={laneColor(
                    Math.min(visualLane[conn.from], cappedMaxLane)
                  )}
                  strokeWidth={1.4}
                  opacity={0.55}
                />
              );
            }

            const midX = (x1 + x2) / 2;
            return (
              <path
                key={`c${i}`}
                d={`M${x1},${y1} C${midX},${y1} ${midX},${y2} ${x2},${y2}`}
                stroke={laneColor(
                  Math.min(visualLane[conn.to], cappedMaxLane)
                )}
                strokeWidth={1.4}
                fill="none"
                opacity={0.4}
              />
            );
          })}

          {/* Commit nodes */}
          {data.commits.map((c, i) => {
            const x = cx(i);
            const y = cy(i);
            const vl = Math.min(visualLane[i], cappedMaxLane);
            const isHovered = hoveredIdx === i;
            const isPinned = pinnedSet.has(i);
            const isTopPin = topPinned === i;
            const hasRefs = c.refs.length > 0;
            const isMerge = c.message.startsWith("Merge ");
            const baseR = hasRefs ? NODE_R * 1.3 : NODE_R;
            const r = isHovered || isTopPin ? NODE_R * 1.9 : isPinned ? baseR * 1.2 : baseR;
            const color = laneColor(vl);

            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleDotClick(i)}
                style={{ cursor: "pointer" }}
              >
                {/* Generous invisible hit area */}
                <circle cx={x} cy={y} r={HIT_R} fill="transparent" />

                {/* Pinned ring — brightest on the top pin, dimmer on others */}
                {isPinned && (
                  <circle
                    cx={x}
                    cy={y}
                    r={NODE_R * (isTopPin ? 2.6 : 2.1)}
                    fill="none"
                    stroke={color}
                    strokeWidth={isTopPin ? 1.6 : 1}
                    opacity={isTopPin ? 0.7 : 0.42}
                  />
                )}

                {/* Visible dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={isHovered || isTopPin ? "#fdf7ee" : color}
                  stroke={color}
                  strokeWidth={isHovered || isTopPin ? 2.2 : isMerge ? 1 : 1.4}
                  style={{
                    transition: "r 0.18s ease, stroke-width 0.18s ease",
                  }}
                />

                {/* Ref labels (branch/tag) */}
                {hasRefs && !isHovered && (
                  <text
                    x={x}
                    y={y - NODE_R * 1.3 - 5}
                    textAnchor="middle"
                    className="graph-ref-label"
                  >
                    {c.refs[0]
                      .replace("HEAD -> ", "")
                      .replace("origin/", "")
                      .slice(0, 18)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Floating commit stack — overlays the graph on desktop, falls back
          to a single card below the graph on mobile via CSS. */}
      {pinnedIdxs.length > 0 && (
        <div
          className="commit-stack"
          aria-live="polite"
          aria-label={`${pinnedIdxs.length} pinned commit${pinnedIdxs.length === 1 ? "" : "s"}`}
        >
          {pinnedIdxs.map((idx, stackPos) => (
            <StackCard
              key={idx}
              commit={data.commits[idx]}
              activeIdx={idx}
              total={data.commits.length}
              isTop={stackPos === 0}
              onDismiss={() => handleDismiss(idx)}
            />
          ))}
        </div>
      )}

      <div className="graph-hint">
        Click any commit to pin · click again to dismiss · ← → keys navigate · esc clears
      </div>
    </div>
  );
}
