"use client";

/*
 * ParallaxGraph — 2D vertical commit graph with scroll-driven parallax.
 *
 * The graph is a tall 2D stage rendered inside a fixed bounding box.
 * Newest commit at the top, oldest at the bottom. Time drives Y.
 *
 * Five parallax layers, each translating vertically at its own speed
 * relative to scroll:
 *
 *   0.35x  deep background — giant serif phase numerals drifting slowly
 *   0.55x  mid background  — month labels drifting at medium speed
 *   0.78x  rails           — faint branch lane labels
 *   1.00x  graph           — the actual SVG trunk + branches + commits
 *   1.22x  foreground      — callout cards for commits with refs,
 *                            floating slightly faster than the base
 *
 * Plus ambient drifting petals that loop continuously independent
 * of scroll.
 *
 * Interaction:
 *   - hover a commit: expand its tooltip
 *   - click a commit: pin it to the detail stack
 *   - floating HUD shows current phase + scroll progress
 *   - keyboard arrows step the top pin forward/backward
 */

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";

// --- Types -----------------------------------------------------------------

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

// --- Stage geometry ---------------------------------------------------------

/** Stage height in CSS units — how tall the scrolling graph is */
const STAGE_HEIGHT_VH = 520;
/** Horizontal bounds where the graph can extend (percentage of stage width) */
const TRUNK_X = 50; // percent
const MAX_REACH_PCT = 34; // percent of stage width

// --- Parallax speeds --------------------------------------------------------

const SPEED_DEEP = 0.35;
const SPEED_MID = 0.55;
const SPEED_RAIL = 0.78;
const SPEED_FG = 1.22;

// --- Data preparation -------------------------------------------------------

interface Layout {
  idx: number;
  commit: Commit;
  visualLane: number;
  branchId: number;
  t: number; // 0 = oldest, 1 = newest
  significance: number;
  phase: number; // 0..4
}

interface BranchInfo {
  lane: number;
  startT: number;
  endT: number;
  count: number;
  side: 1 | -1;
  reach: number;
}

const PHASE_COUNT = 5;
const PHASE_NAMES = ["Prologue", "Act I", "Act II", "Act III", "Act IV"];

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

function prepareLayout(data: GraphData): {
  layouts: Layout[];
  branches: Map<number, BranchInfo>;
} {
  const commits = data.commits;
  const n = commits.length;

  const laneCounts = new Map<number, number>();
  commits.forEach((c) =>
    laneCounts.set(c.lane, (laneCounts.get(c.lane) || 0) + 1)
  );

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
      visualLane =
        parentVisual !== undefined ? parentVisual + 0.5 : ephNext++;
    }
    const t = 1 - i / Math.max(1, n - 1);
    const laneCount = laneCounts.get(c.lane) ?? 1;
    const significance = c.lane === 0 ? 1 : Math.min(0.85, laneCount / 40);
    const phase = Math.max(
      0,
      Math.min(PHASE_COUNT - 1, Math.floor(t * (PHASE_COUNT - 0.001)))
    );
    return {
      idx: i,
      commit: c,
      visualLane,
      branchId: c.lane,
      t,
      significance,
      phase,
    };
  });

  // Per-branch info (start/end time, side, reach)
  const byLane = new Map<number, Layout[]>();
  layouts.forEach((l) => {
    const key = Math.floor(l.visualLane);
    if (!byLane.has(key)) byLane.set(key, []);
    byLane.get(key)!.push(l);
  });

  const branches = new Map<number, BranchInfo>();
  let sideCounter = 0;
  [...byLane.keys()]
    .sort((a, b) => a - b)
    .forEach((lane) => {
      const arr = byLane.get(lane)!;
      const startT = Math.min(...arr.map((l) => l.t));
      const endT = Math.max(...arr.map((l) => l.t));
      const count = arr.length;
      const side: 1 | -1 = lane === 0 ? 1 : sideCounter++ % 2 === 0 ? -1 : 1;
      const reach =
        lane === 0 ? 0 : Math.min(MAX_REACH_PCT, 4 + Math.sqrt(count) * 3.4);
      branches.set(lane, { lane, startT, endT, count, side, reach });
    });

  return { layouts, branches };
}

// --- Position helpers -------------------------------------------------------

/** Convert time (0..1) to percent down the stage (newest at 0%) */
function yPctForT(t: number): number {
  return (1 - t) * 100;
}

function ease(x: number): number {
  return 1 - Math.pow(1 - x, 2.2);
}

/** Commit position in percentage coords (x: 0-100, y: 0-100) */
function positionCommit(
  l: Layout,
  branches: Map<number, BranchInfo>
): { x: number; y: number } {
  const lane = Math.floor(l.visualLane);
  const y = yPctForT(l.t);
  if (lane === 0) return { x: TRUNK_X, y };
  const bi = branches.get(lane);
  if (!bi) return { x: TRUNK_X, y };
  const span = Math.max(0.001, bi.endT - bi.startT);
  const progress = Math.max(0, Math.min(1, (l.t - bi.startT) / span));
  const eased = ease(progress);
  // Simple curve: linear interpolation from trunk at startT to tip at endT
  const xOffset = bi.side * bi.reach * eased;
  return { x: TRUNK_X + xOffset, y };
}

/** Branch SVG path — quadratic bezier from trunk to tip */
function branchPath(bi: BranchInfo): string {
  if (bi.lane === 0) return "";
  const startY = yPctForT(bi.startT);
  const endY = yPctForT(bi.endT);
  const tipX = TRUNK_X + bi.side * bi.reach;
  const midX = TRUNK_X + bi.side * bi.reach * 0.45;
  const midY = (startY + endY) / 2 + 2 * bi.side * -0.3;
  return `M ${TRUNK_X} ${startY} Q ${midX} ${midY} ${tipX} ${endY}`;
}

// --- Month label extraction -------------------------------------------------

function extractMonthLabels(
  layouts: Layout[]
): { y: number; label: string }[] {
  const seen = new Set<string>();
  const out: { y: number; label: string }[] = [];
  for (let i = layouts.length - 1; i >= 0; i--) {
    const key = layouts[i].commit.date.slice(0, 7); // YYYY-MM
    if (seen.has(key)) continue;
    seen.add(key);
    const d = new Date(layouts[i].commit.date);
    out.push({
      y: yPctForT(layouts[i].t),
      label: d.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    });
  }
  return out;
}

// --- Stack card overlay -----------------------------------------------------

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

// --- Main component ---------------------------------------------------------

export default function ParallaxGraph({ data }: { data: GraphData }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const deepRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pinnedIdxs, setPinnedIdxs] = useState<number[]>([0]);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  const { layouts, branches } = useMemo(() => prepareLayout(data), [data]);
  const monthLabels = useMemo(() => extractMonthLabels(layouts), [layouts]);

  // Commits with refs — those become foreground callouts
  const calloutCommits = useMemo(() => {
    return layouts.filter((l) => l.commit.refs.length > 0);
  }, [layouts]);

  // Branch SVG paths
  const branchPaths = useMemo(() => {
    const out: { d: string; color: string; width: number; key: string }[] = [];
    branches.forEach((bi) => {
      if (bi.lane === 0) return;
      out.push({
        d: branchPath(bi),
        color: branchColor(bi.lane),
        width: Math.min(2, 0.6 + Math.sqrt(bi.count) * 0.2),
        key: `lim-${bi.lane}`,
      });
    });
    return out;
  }, [branches]);

  // Phase positions
  const phases = useMemo(() => {
    return Array.from({ length: PHASE_COUNT }, (_, p) => {
      const centerT = 1 - (p + 0.5) / PHASE_COUNT;
      const y = yPctForT(centerT);
      return {
        numeral:
          p === 0
            ? "0"
            : p === 1
            ? "I"
            : p === 2
            ? "II"
            : p === 3
            ? "III"
            : "IV",
        name: PHASE_NAMES[p],
        y,
      };
    });
  }, []);

  // --- Scroll handler ---

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const update = () => {
      rafRef.current = 0;
      const rect = stage.getBoundingClientRect();
      const stageHeight = rect.height;
      // localY is how far we've scrolled into the stage (px from top of stage
      // to top of viewport). 0 when stage top reaches viewport top, positive
      // as we scroll deeper into the stage.
      const localY = Math.max(0, -rect.top);
      const maxLocal = Math.max(1, stageHeight - window.innerHeight);
      const prog = Math.min(1, localY / maxLocal);
      setProgress(prog);

      // Each parallax layer offsets by scrollY * (1 - speed)
      // So speed < 1 → layer appears to move slower (offset same direction as scroll)
      //    speed > 1 → layer appears to move faster (offset opposite direction)
      const apply = (el: HTMLElement | null, speed: number) => {
        if (!el) return;
        const offset = localY * (1 - speed);
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      };

      apply(deepRef.current, SPEED_DEEP);
      apply(midRef.current, SPEED_MID);
      apply(railRef.current, SPEED_RAIL);
      apply(fgRef.current, SPEED_FG);

      // Determine current phase based on scroll progress
      // Time goes from 1 (top) to 0 (bottom)
      const t = 1 - prog;
      const phase = Math.max(
        0,
        Math.min(PHASE_COUNT - 1, Math.floor(t * (PHASE_COUNT - 0.001)))
      );
      setCurrentPhase(phase);
    };

    const handler = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", handler, { passive: true });
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler);
      window.removeEventListener("resize", handler);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // --- Commit interaction ---

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
  }, [data.commits.length]);

  return (
    <div className="parallax-graph">
      {/* Floating HUD — phase indicator and scroll progress */}
      <div className="pg-hud">
        <div className="pg-hud-phase">
          <span className="pg-hud-label">Now viewing</span>
          <span className="pg-hud-value">
            {phases[currentPhase]?.numeral} &middot; {phases[currentPhase]?.name}
          </span>
        </div>
        <div
          className="pg-hud-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <div
            className="pg-hud-progress-fill"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      {/* The tall scrolling stage */}
      <div
        className="pg-stage"
        ref={stageRef}
        style={{ height: `${STAGE_HEIGHT_VH}vh` }}
      >
        {/* Deep background — giant phase numerals */}
        <div className="pg-layer pg-deep" ref={deepRef}>
          {phases.map((p) => (
            <div
              key={p.numeral}
              className="pg-phase-numeral"
              style={{ top: `${p.y}%` }}
            >
              {p.numeral}
            </div>
          ))}
        </div>

        {/* Mid background — month labels */}
        <div className="pg-layer pg-mid" ref={midRef}>
          {monthLabels.map((m) => (
            <div
              key={m.label}
              className="pg-month"
              style={{ top: `${m.y}%` }}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Rail layer — phase names next to their positions */}
        <div className="pg-layer pg-rail" ref={railRef}>
          {phases.map((p) => (
            <div
              key={p.name}
              className="pg-phase-name"
              style={{ top: `${p.y}%` }}
            >
              {p.name}
            </div>
          ))}
        </div>

        {/* Main graph layer — SVG trunk, branches, commit dots */}
        <div className="pg-layer pg-graph">
          <svg
            className="pg-svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="pg-trunk-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4593a" />
                <stop offset="50%" stopColor="#a04224" />
                <stop offset="100%" stopColor="#7a2e14" />
              </linearGradient>
            </defs>

            {/* Trunk */}
            <line
              x1={TRUNK_X}
              y1={0}
              x2={TRUNK_X}
              y2={100}
              stroke="url(#pg-trunk-grad)"
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
            />

            {/* Branch limb lines */}
            {branchPaths.map((br) => (
              <path
                key={br.key}
                d={br.d}
                stroke={br.color}
                strokeWidth={br.width}
                fill="none"
                opacity={0.58}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* Phase horizontal markers — thin gold lines across the trunk */}
            {phases.map((p, i) => (
              <line
                key={`phm-${i}`}
                x1={TRUNK_X - 2}
                y1={p.y}
                x2={TRUNK_X + 2}
                y2={p.y}
                stroke="#b58a3e"
                strokeWidth={0.4}
                opacity={0.6}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* Commit dots rendered as divs so they can have hover/click + tooltip */}
          {layouts.map((l) => {
            const { x, y } = positionCommit(l, branches);
            const isMain = Math.floor(l.visualLane) === 0;
            const isHovered = hoveredIdx === l.idx;
            const isPinned = pinnedIdxs.includes(l.idx);
            return (
              <button
                key={l.idx}
                type="button"
                className={`pg-commit${isMain ? " main" : ""}${isHovered ? " hovered" : ""}${isPinned ? " pinned" : ""}`}
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  background: branchColor(Math.floor(l.visualLane)),
                }}
                onMouseEnter={() => setHoveredIdx(l.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => handleClick(l.idx)}
                aria-label={`Commit ${l.commit.short}: ${l.commit.message}`}
              />
            );
          })}
        </div>

        {/* Foreground — callout cards for tagged commits */}
        <div className="pg-layer pg-fg" ref={fgRef}>
          {calloutCommits.map((l) => {
            const { x, y } = positionCommit(l, branches);
            const side: "left" | "right" =
              x > TRUNK_X ? "right" : "left";
            const cleanRefs = Array.from(
              new Set(
                l.commit.refs.map((r) =>
                  r.replace("HEAD -> ", "").replace("origin/", "").trim()
                )
              )
            ).filter(Boolean);
            return (
              <div
                key={`cl-${l.idx}`}
                className={`pg-callout pg-callout-${side}`}
                style={{ top: `${y}%`, left: `${x}%` }}
              >
                <span className="pg-callout-line" />
                <div className="pg-callout-card">
                  <div className="pg-callout-sha">{l.commit.short}</div>
                  <div className="pg-callout-msg">{l.commit.message}</div>
                  {cleanRefs.length > 0 && (
                    <div className="pg-callout-refs">
                      {cleanRefs.slice(0, 2).map((r) => (
                        <span key={r} className="pg-callout-ref">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ambient petals — drift continuously regardless of scroll */}
        <div className="pg-ambient" aria-hidden="true">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="pg-petal"
              style={
                {
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 53) % 100}%`,
                  animationDelay: `${-(i * 0.7)}s`,
                  animationDuration: `${14 + (i % 6)}s`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>

      {/* Tooltip for hovered commit */}
      {hoveredIdx !== null && layouts[hoveredIdx] && (
        <div className="pg-tooltip" aria-hidden="true">
          <code>{layouts[hoveredIdx].commit.short}</code>
          <span className="pg-tooltip-msg">
            {layouts[hoveredIdx].commit.message}
          </span>
        </div>
      )}

      {/* Pinned commit stack overlay */}
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
