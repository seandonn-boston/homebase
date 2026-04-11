"use client";

/*
 * SvgTree — the Growing Tree rendered as flat 2D SVG.
 * No three.js, no WebGL. Just <svg> paths and circles.
 *
 * Coordinate system:
 *   X axis: horizontal spread (branches arc left and right from trunk)
 *   Y axis: time (newest at top, oldest at bottom — SVG Y is inverted
 *           relative to screen so we map time → SVG Y as (1 - t) * H)
 *
 * Branches alternate sides of the trunk (odd lanes on the right,
 * even lanes on the left) and use quadratic bezier curves starting
 * tangent to the trunk and pulling outward. Commits are placed along
 * the bezier using the same parameterization that drew the line.
 */

import { useMemo, useState, useEffect, useCallback } from "react";

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

const REPO_URL = "https://github.com/seandonn-boston/helm";

// --- SVG canvas geometry ----------------------------------------------------

const VB_WIDTH = 1000;
const VB_HEIGHT = 1400;
const TRUNK_X = VB_WIDTH / 2;
const TOP_Y = 80;
const BOTTOM_Y = VB_HEIGHT - 80;
const TRUNK_LENGTH = BOTTOM_Y - TOP_Y;
const MAX_REACH = 420;

// --- Data preparation --------------------------------------------------------

interface Layout {
  idx: number;
  commit: Commit;
  visualLane: number;
  branchId: number;
  t: number;
  significance: number;
}

interface BranchInfo {
  lane: number;
  startT: number;
  endT: number;
  count: number;
  /** which side: -1 (left) or +1 (right) */
  side: 1 | -1;
  /** outward slope of the branch tip */
  angle: number;
  reach: number;
}

function prepareLayout(data: GraphData): { layouts: Layout[]; branches: Map<number, BranchInfo> } {
  const commits = data.commits;
  const n = commits.length;

  const laneCounts = new Map<number, number>();
  commits.forEach((c) => laneCounts.set(c.lane, (laneCounts.get(c.lane) || 0) + 1));

  const significantLanes = [...laneCounts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => {
      if (a[0] === 0) return -1;
      if (b[0] === 0) return 1;
      return b[1] - a[1];
    })
    .map(([lane]) => lane);

  const laneToVisual = new Map<number, number>();
  significantLanes.forEach((lane, i) => laneToVisual.set(lane, i));

  const firstParent = new Map<number, number>();
  for (const conn of data.connections) {
    if (!firstParent.has(conn.from)) firstParent.set(conn.from, conn.toLane);
  }

  let ephNext = significantLanes.length;
  const layouts: Layout[] = commits.map((c, i) => {
    let visualLane: number;
    const direct = laneToVisual.get(c.lane);
    if (direct !== undefined) {
      visualLane = direct;
    } else {
      const parentLane = firstParent.get(i);
      const parentVisual =
        parentLane !== undefined ? laneToVisual.get(parentLane) : undefined;
      visualLane = parentVisual !== undefined ? parentVisual + 0.5 : ephNext++;
    }
    const t = 1 - i / Math.max(1, n - 1);
    const laneCount = laneCounts.get(c.lane) ?? 1;
    const significance = c.lane === 0 ? 1 : Math.min(0.85, laneCount / 40);
    return {
      idx: i,
      commit: c,
      visualLane,
      branchId: c.lane,
      t,
      significance,
    };
  });

  // Build per-branch info
  const byLane = new Map<number, Layout[]>();
  layouts.forEach((l) => {
    const key = Math.floor(l.visualLane);
    if (!byLane.has(key)) byLane.set(key, []);
    byLane.get(key)!.push(l);
  });

  const branches = new Map<number, BranchInfo>();
  let sideCounter = 0;
  [...byLane.keys()].sort((a, b) => a - b).forEach((lane) => {
    const arr = byLane.get(lane)!;
    const startT = Math.min(...arr.map((l) => l.t));
    const endT = Math.max(...arr.map((l) => l.t));
    const count = arr.length;
    const side: 1 | -1 = lane === 0 ? 1 : (sideCounter++ % 2 === 0 ? -1 : 1);
    // Angle: branches further out get steeper angles
    const depth = lane === 0 ? 0 : Math.floor(sideCounter / 2);
    const angle = lane === 0 ? 0 : 0.35 + depth * 0.04;
    const reach = lane === 0 ? 0 : Math.min(MAX_REACH, 60 + Math.sqrt(count) * 42);
    branches.set(lane, { lane, startT, endT, count, side, angle, reach });
  });

  return { layouts, branches };
}

// --- Bezier + position helpers ---------------------------------------------

function yForT(t: number): number {
  return BOTTOM_Y - t * TRUNK_LENGTH;
}

function ease(x: number): number {
  return 1 - Math.pow(1 - x, 2.2);
}

/** Quadratic bezier interpolation */
function qbezier(
  p0: [number, number],
  p1: [number, number],
  p2: [number, number],
  t: number
): [number, number] {
  const mt = 1 - t;
  return [
    mt * mt * p0[0] + 2 * mt * t * p1[0] + t * t * p2[0],
    mt * mt * p0[1] + 2 * mt * t * p1[1] + t * t * p2[1],
  ];
}

/**
 * A branch's control points. P0 sits on the trunk at the branch start
 * time, P2 sits at the branch tip, P1 is a midpoint pulled outward so
 * the curve swings outward smoothly.
 */
function branchControls(bi: BranchInfo): {
  p0: [number, number];
  p1: [number, number];
  p2: [number, number];
} {
  const startY = yForT(bi.startT);
  const endY = yForT(bi.endT);
  // Tip is offset horizontally by the reach, rising toward the top
  const tipX = TRUNK_X + bi.side * bi.reach;
  const tipY = endY - bi.reach * bi.angle * 0.5;
  const midX = TRUNK_X + bi.side * bi.reach * 0.55;
  const midY = (startY + tipY) * 0.5 + 30;
  return {
    p0: [TRUNK_X, startY],
    p1: [midX, midY],
    p2: [tipX, tipY],
  };
}

/** Position of a commit along its branch's bezier curve */
function positionCommit(l: Layout, branches: Map<number, BranchInfo>): [number, number] {
  const key = Math.floor(l.visualLane);
  if (key === 0) return [TRUNK_X, yForT(l.t)];
  const bi = branches.get(key);
  if (!bi) return [TRUNK_X, yForT(l.t)];
  const span = Math.max(0.001, bi.endT - bi.startT);
  const progress = Math.max(0, Math.min(1, (l.t - bi.startT) / span));
  const eased = ease(progress);
  const { p0, p1, p2 } = branchControls(bi);
  return qbezier(p0, p1, p2, eased);
}

const BRANCH_COLORS = [
  "#c4503a",
  "#b58a3e",
  "#7a4e2a",
  "#9e4a66",
  "#4a6e45",
  "#2e5a6e",
  "#8a5a1e",
  "#5a4a82",
];

function branchColor(lane: number): string {
  if (lane === 0) return "#c4503a";
  return BRANCH_COLORS[lane % BRANCH_COLORS.length];
}

// --- Stack card (same shape as the 3D version) ------------------------------

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
      commit.refs.map((r) => r.replace("HEAD -> ", "").replace("origin/", "").trim())
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
        <span className="sc-position">#{positionFromOldest.toLocaleString()}</span>
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

// --- SvgTree component ------------------------------------------------------

export default function SvgTree({ data }: { data: GraphData }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pinnedIdxs, setPinnedIdxs] = useState<number[]>([0]);

  const { layouts, branches } = useMemo(() => prepareLayout(data), [data]);

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
    const max = data.commits.length - 1;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
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
  }, [data.commits.length]);

  // Precompute branch limb paths as SVG path strings
  const branchPaths = useMemo(() => {
    const out: { d: string; color: string; width: number; key: string }[] = [];
    branches.forEach((bi) => {
      if (bi.lane === 0) return;
      const { p0, p1, p2 } = branchControls(bi);
      const d = `M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}`;
      out.push({
        d,
        color: branchColor(bi.lane),
        width: Math.min(7, 2 + Math.sqrt(bi.count) * 0.9),
        key: `limb-${bi.lane}`,
      });
    });
    return out;
  }, [branches]);

  // Phase rings as simple horizontal lines on the trunk
  const phaseMarkers = useMemo(() => {
    const markers: { y: number; label: string }[] = [];
    for (let p = 0; p < 5; p++) {
      const t = p / 4;
      markers.push({
        y: yForT(t),
        label: `Phase ${p}`,
      });
    }
    return markers;
  }, []);

  return (
    <div className="cube-graph">
      <div className="svg-tree-wrap">
        <svg
          viewBox={`0 0 ${VB_WIDTH} ${VB_HEIGHT}`}
          xmlns="http://www.w3.org/2000/svg"
          className="svg-tree"
        >
          <defs>
            <linearGradient id="trunk-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c4593a" />
              <stop offset="50%" stopColor="#8b3e22" />
              <stop offset="100%" stopColor="#6a2e16" />
            </linearGradient>
            <filter id="leaf-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Phase marker lines */}
          {phaseMarkers.map((m, i) => (
            <g key={`phase-${i}`}>
              <line
                x1={TRUNK_X - 30}
                y1={m.y}
                x2={TRUNK_X + 30}
                y2={m.y}
                stroke="#b58a3e"
                strokeWidth={1.5}
                opacity={0.6}
              />
              <text
                x={TRUNK_X + 42}
                y={m.y + 4}
                fill="#b58a3e"
                fontSize={14}
                fontFamily="Baskerville, Georgia, serif"
                opacity={0.8}
              >
                {m.label}
              </text>
            </g>
          ))}

          {/* Trunk */}
          <line
            x1={TRUNK_X}
            y1={BOTTOM_Y}
            x2={TRUNK_X}
            y2={TOP_Y}
            stroke="url(#trunk-grad)"
            strokeWidth={12}
            strokeLinecap="round"
          />

          {/* Branch limbs */}
          {branchPaths.map((br) => (
            <path
              key={br.key}
              d={br.d}
              stroke={br.color}
              strokeWidth={br.width}
              fill="none"
              strokeLinecap="round"
              opacity={0.72}
            />
          ))}

          {/* Commit nodes */}
          {layouts.map((l) => {
            const isPinned = pinnedIdxs.includes(l.idx);
            const isHovered = hoveredIdx === l.idx;
            const isMain = Math.floor(l.visualLane) === 0;
            const [cx, cy] = positionCommit(l, branches);
            const baseR = isMain ? 5 : 3.2;
            const r = isHovered ? baseR * 2 : isPinned ? baseR * 1.6 : baseR;
            const color = isMain ? "#c4503a" : branchColor(Math.floor(l.visualLane));
            return (
              <circle
                key={l.idx}
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                stroke="#fffaf2"
                strokeWidth={isMain ? 1 : 0.6}
                opacity={isHovered || isPinned ? 1 : 0.92}
                style={{ cursor: "pointer", transition: "r 120ms ease" }}
                onMouseEnter={() => setHoveredIdx(l.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleClick(l.idx)}
                filter={isMain || isHovered || isPinned ? "url(#leaf-glow)" : undefined}
              />
            );
          })}
        </svg>
      </div>

      <div className="cube-hint">
        Pure SVG &middot; click any commit to pin it &middot; arrow keys step through
      </div>

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
              idx={idx}
              total={data.commits.length}
              isTop={stackPos === 0}
              onDismiss={() => handleDismiss(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
