"use client";

/*
 * ParallaxGraph — horizontal 2D commit graph with parallax scroll.
 *
 * The graph scrolls left→right. Oldest commit is on the left, newest
 * is on the right. The trunk runs horizontally through the center of
 * the viewport. Side branches alternate above and below the trunk,
 * curving out and back.
 *
 * Five parallax layers, each translating horizontally at its own
 * speed relative to the container's scrollLeft:
 *
 *   0.35x  deep background — giant phase numerals drifting slowly
 *   0.55x  midground       — month labels
 *   0.82x  near-ground     — phase name + date strip
 *   1.00x  graph           — SVG trunk, branches, heatmap, commit dots
 *   1.20x  foreground      — hero cards and note cards
 *
 * The wheel handler accepts both deltaY and deltaX — so you can
 * scroll with a vertical mousewheel or a horizontal trackpad. Drag
 * on empty space to pan. Arrow keys pan by 200px (shift for 1×).
 * Click a commit to pin it. Click the minimap strip at the top to
 * jump. Esc clears the pinned stack.
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

/** Container CSS height. */
const CONTAINER_HEIGHT_PX = 720;
/** Horizontal padding inside the stage before commits start/end */
const PAD_X = 180;
/** Pixels per commit — stage width scales with commit count */
const PX_PER_COMMIT = 9;
/** Minimum total stage width even for small datasets */
const MIN_STAGE_WIDTH = 4000;
/** Y of the trunk (center of container) */
const TRUNK_Y = CONTAINER_HEIGHT_PX / 2;
/** Max branch reach above/below the trunk */
const MAX_REACH = 220;
/** Minimap strip height */
const MINIMAP_HEIGHT = 36;

// --- Parallax speeds --------------------------------------------------------

const SPEED_DEEP = 0.35;
const SPEED_MID = 0.55;
const SPEED_NEAR = 0.82;
const SPEED_FG = 1.2;

// --- Phase metadata ---------------------------------------------------------

const PHASE_COUNT = 5;
const PHASE_META = [
  {
    numeral: "0",
    name: "Prologue",
    title: "Before the Plan",
    desc:
      "Fourteen days of prose, two Python rewrites, a 4-out-of-10 self-review, and an admiral.md that grew to 1,161 lines overnight.",
  },
  {
    numeral: "I",
    name: "Act I",
    title: "The Great Restructuring",
    desc:
      "One day. The governance hooks firing on their own work; the overhaul deleting 13,642 lines; the decision to start over.",
  },
  {
    numeral: "II",
    name: "Act II",
    title: "The March Through Phases 0 to 8",
    desc:
      "Eight days. Phase 0 built the gatekeepers. Phases 1–8 built the framework. The trunk finally reached the canopy.",
  },
  {
    numeral: "III",
    name: "Act III",
    title: "The Mid-Plan Expansion",
    desc:
      "Two days. The roadmap rewrote itself mid-flight. Phases 9 through 14 appeared as the train was already moving.",
  },
  {
    numeral: "IV",
    name: "Act IV",
    title: "The Burn-Down",
    desc:
      "Five days. Phase 11 in sixty-four minutes. The last commit. The cleanup. The log closed. The chronicle begins.",
  },
];

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

// --- Data preparation -------------------------------------------------------

interface Layout {
  idx: number;
  commit: Commit;
  visualLane: number;
  branchId: number;
  t: number;
  significance: number;
  phase: number;
}

interface BranchInfo {
  lane: number;
  startT: number;
  endT: number;
  count: number;
  side: 1 | -1;
  reach: number;
}

function prepareLayout(data: GraphData): {
  layouts: Layout[];
  branches: Map<number, BranchInfo>;
  phaseInfo: Array<{
    index: number;
    startT: number;
    endT: number;
    centerT: number;
    count: number;
    firstDate: string;
    lastDate: string;
  }>;
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

  // Per-branch info
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
      // Alternate branches above/below; even → above (-1 in SVG y), odd → below
      const side: 1 | -1 = lane === 0 ? 1 : sideCounter++ % 2 === 0 ? -1 : 1;
      const reach =
        lane === 0
          ? 0
          : Math.min(MAX_REACH, 30 + Math.sqrt(count) * 24);
      branches.set(lane, { lane, startT, endT, count, side, reach });
    });

  // Phase info — compute once per phase
  const phaseInfo = Array.from({ length: PHASE_COUNT }, (_, p) => {
    const tLow = p / PHASE_COUNT;
    const tHigh = (p + 1) / PHASE_COUNT;
    const startT = tLow;
    const endT = tHigh;
    const centerT = (tLow + tHigh) / 2;
    const phaseCommits = layouts.filter((l) => l.phase === p);
    const count = phaseCommits.length;
    // Commits are newest-first, so first date is the latest and last is the earliest
    const dates = phaseCommits.map((l) => l.commit.date).sort();
    const firstDate = dates[0] ?? "";
    const lastDate = dates[dates.length - 1] ?? "";
    return { index: p, startT, endT, centerT, count, firstDate, lastDate };
  });

  return { layouts, branches, phaseInfo };
}

// --- Position helpers -------------------------------------------------------

function makeTToX(stageWidth: number) {
  return (t: number) => PAD_X + t * (stageWidth - 2 * PAD_X);
}

function ease(x: number): number {
  return 1 - Math.pow(1 - x, 2.3);
}

/** Position of a commit along its branch's bezier */
function positionCommit(
  l: Layout,
  branches: Map<number, BranchInfo>,
  tToX: (t: number) => number
): { x: number; y: number } {
  const key = Math.floor(l.visualLane);
  const x = tToX(l.t);
  if (key === 0) return { x, y: TRUNK_Y };
  const bi = branches.get(key);
  if (!bi) return { x, y: TRUNK_Y };
  const span = Math.max(0.001, bi.endT - bi.startT);
  const progress = Math.max(0, Math.min(1, (l.t - bi.startT) / span));
  const eased = ease(progress);
  const p0x = tToX(bi.startT);
  const p0y = TRUNK_Y;
  const p2x = tToX(bi.endT);
  const p2y = TRUNK_Y + bi.side * bi.reach;
  const p1x = (p0x + p2x) / 2;
  const p1y = TRUNK_Y + bi.side * bi.reach * 0.85;
  const mt = 1 - eased;
  const cx = mt * mt * p0x + 2 * mt * eased * p1x + eased * eased * p2x;
  const cy = mt * mt * p0y + 2 * mt * eased * p1y + eased * eased * p2y;
  return { x: cx, y: cy };
}

/** SVG path string for a branch limb */
function branchPath(
  bi: BranchInfo,
  tToX: (t: number) => number
): string {
  if (bi.lane === 0) return "";
  const p0x = tToX(bi.startT);
  const p0y = TRUNK_Y;
  const p2x = tToX(bi.endT);
  const p2y = TRUNK_Y + bi.side * bi.reach;
  const p1x = (p0x + p2x) / 2;
  const p1y = TRUNK_Y + bi.side * bi.reach * 0.85;
  return `M ${p0x} ${p0y} Q ${p1x} ${p1y} ${p2x} ${p2y}`;
}

// --- Activity heatmap computation ------------------------------------------

/** Compute a density profile across time for the heatmap area chart */
function computeHeatmap(
  layouts: Layout[],
  tToX: (t: number) => number
): {
  points: [number, number][];
  maxDensity: number;
} {
  const buckets = 140;
  const counts = new Array(buckets).fill(0);
  for (const l of layouts) {
    const b = Math.min(buckets - 1, Math.floor(l.t * buckets));
    counts[b]++;
  }
  const maxDensity = Math.max(...counts, 1);
  const points: [number, number][] = [];
  for (let i = 0; i <= buckets; i++) {
    const t = i / buckets;
    const c = counts[Math.min(buckets - 1, i)] ?? 0;
    const normalized = c / maxDensity;
    points.push([tToX(t), normalized]);
  }
  return { points, maxDensity };
}

// --- Month labels -----------------------------------------------------------

function extractMonthLabels(
  layouts: Layout[],
  tToX: (t: number) => number
): { x: number; label: string }[] {
  const seen = new Set<string>();
  const out: { x: number; label: string }[] = [];
  for (let i = layouts.length - 1; i >= 0; i--) {
    const key = layouts[i].commit.date.slice(0, 7);
    if (seen.has(key)) continue;
    seen.add(key);
    const d = new Date(layouts[i].commit.date);
    out.push({
      x: tToX(layouts[i].t),
      label: d.toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      }),
    });
  }
  return out;
}

// --- Note card commits (tagged) --------------------------------------------

function selectNoteCommits(layouts: Layout[]): Layout[] {
  // Pick commits with refs, cap at N to avoid clutter
  const tagged = layouts.filter((l) => l.commit.refs.length > 0);
  if (tagged.length <= 20) return tagged;
  // Downsample evenly
  const step = tagged.length / 20;
  const out: Layout[] = [];
  for (let i = 0; i < 20; i++) {
    out.push(tagged[Math.floor(i * step)]);
  }
  return out;
}

// --- Commit detail stack overlay -------------------------------------------

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
  const containerRef = useRef<HTMLDivElement>(null);
  const deepRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const nearRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const dragRef = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pinnedIdxs, setPinnedIdxs] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);

  const { layouts, branches, phaseInfo } = useMemo(
    () => prepareLayout(data),
    [data]
  );

  // Stage width scales with commit count, with a floor for tiny datasets.
  const STAGE_WIDTH = useMemo(
    () =>
      Math.max(
        MIN_STAGE_WIDTH,
        data.commits.length * PX_PER_COMMIT + PAD_X * 2
      ),
    [data.commits.length]
  );

  const tToX = useMemo(() => makeTToX(STAGE_WIDTH), [STAGE_WIDTH]);

  const monthLabels = useMemo(
    () => extractMonthLabels(layouts, tToX),
    [layouts, tToX]
  );
  const noteCommits = useMemo(() => selectNoteCommits(layouts), [layouts]);
  const heatmap = useMemo(
    () => computeHeatmap(layouts, tToX),
    [layouts, tToX]
  );

  // Branch paths
  const branchPaths = useMemo(() => {
    const out: { d: string; color: string; width: number; key: string }[] = [];
    branches.forEach((bi) => {
      if (bi.lane === 0) return;
      out.push({
        d: branchPath(bi, tToX),
        color: branchColor(bi.lane),
        width: Math.min(3, 1.1 + Math.sqrt(bi.count) * 0.22),
        key: `br-${bi.lane}`,
      });
    });
    return out;
  }, [branches, tToX]);

  // Heatmap path (area chart)
  const heatmapPath = useMemo(() => {
    const maxHeight = 140; // pixels of max area chart height above AND below trunk
    const top: string[] = [];
    const bottom: string[] = [];
    heatmap.points.forEach(([x, norm], i) => {
      const h = norm * maxHeight;
      top.push(`${i === 0 ? "M" : "L"} ${x} ${TRUNK_Y - h}`);
      bottom.unshift(`L ${x} ${TRUNK_Y + h}`);
    });
    return `${top.join(" ")} ${bottom.join(" ")} Z`;
  }, [heatmap]);

  // Phase midpoint X positions for hero cards and markers
  const phaseXs = useMemo(
    () =>
      phaseInfo.map((p) => ({
        ...p,
        centerX: tToX(p.centerT),
        startX: tToX(p.startT),
        endX: tToX(p.endT),
      })),
    [phaseInfo, tToX]
  );

  // --- Scroll + parallax -------------------------------------------------

  const update = useCallback(() => {
    rafRef.current = 0;
    const container = containerRef.current;
    if (!container) return;
    const sx = container.scrollLeft;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const prog = maxScroll > 0 ? sx / maxScroll : 0;
    setProgress(prog);

    const apply = (el: HTMLDivElement | null, speed: number) => {
      if (!el) return;
      const offset = sx * (1 - speed);
      el.style.transform = `translate3d(${offset}px, 0, 0)`;
    };

    apply(deepRef.current, SPEED_DEEP);
    apply(midRef.current, SPEED_MID);
    apply(nearRef.current, SPEED_NEAR);
    apply(fgRef.current, SPEED_FG);

    // Which phase is currently centered in the viewport?
    const centerX = sx + container.clientWidth / 2;
    const centerT = (centerX - PAD_X) / (STAGE_WIDTH - 2 * PAD_X);
    const phase = Math.max(
      0,
      Math.min(PHASE_COUNT - 1, Math.floor(centerT * PHASE_COUNT))
    );
    setCurrentPhase(phase);
  }, [STAGE_WIDTH]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(update);
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [update]);

  // --- Wheel → horizontal scroll ------------------------------------------

  const handleWheel = useCallback((e: WheelEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const deltaY = e.deltaY || 0;
    const deltaX = e.deltaX || 0;
    const total = deltaY + deltaX;
    if (total === 0) return;
    const maxScroll = container.scrollWidth - container.clientWidth;
    const currentScroll = container.scrollLeft;
    const canScroll =
      (total > 0 && currentScroll < maxScroll) ||
      (total < 0 && currentScroll > 0);
    if (canScroll) {
      e.preventDefault();
      container.scrollLeft = Math.max(0, Math.min(maxScroll, currentScroll + total));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // --- Drag to pan ---------------------------------------------------------

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Don't start a drag if clicking on an interactive element
    const target = e.target as HTMLElement;
    if (target.closest(".pg-commit, .pg-card, .pg-minimap, button, a"))
      return;
    const container = containerRef.current;
    if (!container) return;
    dragRef.current = {
      startX: e.clientX,
      startScroll: container.scrollLeft,
      moved: false,
    };
    container.style.cursor = "grabbing";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      if (Math.abs(dx) > 3) dragRef.current.moved = true;
      const container = containerRef.current;
      if (!container) return;
      container.scrollLeft = dragRef.current.startScroll - dx;
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      const container = containerRef.current;
      if (container) container.style.cursor = "grab";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  // --- Keyboard ------------------------------------------------------------

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
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;
      const container = containerRef.current;
      if (!container) return;
      const step = e.shiftKey ? 800 : 200;
      let delta = 0;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") delta = step;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") delta = -step;
      else if (e.key === "PageDown") delta = container.clientWidth * 0.8;
      else if (e.key === "PageUp") delta = -container.clientWidth * 0.8;
      else if (e.key === "Home") {
        container.scrollTo({ left: 0, behavior: "smooth" });
        e.preventDefault();
        return;
      } else if (e.key === "End") {
        container.scrollTo({
          left: container.scrollWidth - container.clientWidth,
          behavior: "smooth",
        });
        e.preventDefault();
        return;
      } else if (e.key === "Escape") {
        setPinnedIdxs([]);
        e.preventDefault();
        return;
      } else {
        return;
      }
      container.scrollBy({ left: delta, behavior: "smooth" });
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // --- Minimap interaction -------------------------------------------------

  const handleMinimapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width)
    );
    const maxScroll = container.scrollWidth - container.clientWidth;
    container.scrollTo({ left: maxScroll * frac, behavior: "smooth" });
  }, []);

  return (
    <div className="parallax-graph">
      {/* Minimap strip */}
      <div
        className="pg-minimap"
        onClick={handleMinimapClick}
        role="slider"
        aria-label="Timeline minimap"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div className="pg-minimap-bg">
          {phaseXs.map((p) => (
            <span
              key={`mm-${p.index}`}
              className="pg-minimap-phase"
              style={{
                left: `${(p.startX / STAGE_WIDTH) * 100}%`,
                width: `${((p.endX - p.startX) / STAGE_WIDTH) * 100}%`,
              }}
              data-phase={p.index}
            >
              <span className="pg-minimap-phase-label">{PHASE_META[p.index].numeral}</span>
            </span>
          ))}
        </div>
        <div
          className="pg-minimap-window"
          style={{
            left: `${progress * (100 - 10)}%`,
            width: "10%",
          }}
        />
      </div>

      {/* The horizontally-scrolling container */}
      <div
        className="pg-container"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{ cursor: "grab" }}
      >
        <div
          className="pg-stage"
          style={{
            width: `${STAGE_WIDTH}px`,
            height: `${CONTAINER_HEIGHT_PX}px`,
          }}
        >
          {/* Deep background — giant phase numerals */}
          <div className="pg-layer pg-deep" ref={deepRef}>
            {phaseXs.map((p) => (
              <div
                key={`deep-${p.index}`}
                className="pg-phase-numeral"
                style={{ left: `${p.centerX}px`, top: `50%` }}
              >
                {PHASE_META[p.index].numeral}
              </div>
            ))}
          </div>

          {/* Midground — month labels */}
          <div className="pg-layer pg-mid" ref={midRef}>
            {monthLabels.map((m) => (
              <div
                key={m.label}
                className="pg-month"
                style={{ left: `${m.x}px`, top: `22%` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          {/* Near ground — phase title strip below the trunk, centered
              on each phase's true center X so labels align with content */}
          <div className="pg-layer pg-near" ref={nearRef}>
            {phaseXs.map((p) => (
              <div
                key={`near-${p.index}`}
                className="pg-phase-strip"
                style={{
                  left: `${p.centerX}px`,
                  top: `${TRUNK_Y + MAX_REACH + 30}px`,
                }}
              >
                <span className="pg-phase-strip-num">
                  {PHASE_META[p.index].numeral}
                </span>
                <span className="pg-phase-strip-name">
                  {PHASE_META[p.index].name}
                </span>
              </div>
            ))}
          </div>

          {/* Main graph layer — SVG trunk, branches, heatmap, commit dots */}
          <div className="pg-layer pg-graph">
            <svg
              className="pg-svg"
              width={STAGE_WIDTH}
              height={CONTAINER_HEIGHT_PX}
              viewBox={`0 0 ${STAGE_WIDTH} ${CONTAINER_HEIGHT_PX}`}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient
                  id="pg-trunk-grad-h"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#7a2e14" />
                  <stop offset="50%" stopColor="#c4593a" />
                  <stop offset="100%" stopColor="#a04224" />
                </linearGradient>
                <linearGradient
                  id="pg-heat-grad"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="rgba(255, 180, 120, 0.0)" />
                  <stop offset="50%" stopColor="rgba(255, 180, 120, 0.18)" />
                  <stop offset="100%" stopColor="rgba(255, 180, 120, 0.0)" />
                </linearGradient>
              </defs>

              {/* Activity heatmap area */}
              <path
                d={heatmapPath}
                fill="url(#pg-heat-grad)"
                opacity={0.85}
              />

              {/* Phase boundary markers — vertical faint lines */}
              {phaseXs.map((p, i) => {
                if (i === 0) return null;
                return (
                  <line
                    key={`pb-${i}`}
                    x1={p.startX}
                    y1={TRUNK_Y - MAX_REACH - 20}
                    x2={p.startX}
                    y2={TRUNK_Y + MAX_REACH + 20}
                    stroke="#b58a3e"
                    strokeWidth={1}
                    strokeDasharray="3 5"
                    opacity={0.45}
                  />
                );
              })}

              {/* Trunk */}
              <line
                x1={PAD_X}
                y1={TRUNK_Y}
                x2={STAGE_WIDTH - PAD_X}
                y2={TRUNK_Y}
                stroke="url(#pg-trunk-grad-h)"
                strokeWidth={4}
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
                  opacity={0.6}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            {/* Commit dots as absolute-positioned buttons */}
            {layouts.map((l) => {
              const { x, y } = positionCommit(l, branches, tToX);
              const isMain = Math.floor(l.visualLane) === 0;
              const isHovered = hoveredIdx === l.idx;
              const isPinned = pinnedIdxs.includes(l.idx);
              return (
                <button
                  key={l.idx}
                  type="button"
                  className={`pg-commit${isMain ? " main" : ""}${isHovered ? " hovered" : ""}${isPinned ? " pinned" : ""}`}
                  style={{
                    left: `${x}px`,
                    top: `${y}px`,
                    background: branchColor(Math.floor(l.visualLane)),
                  }}
                  onMouseEnter={() => setHoveredIdx(l.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={(e) => {
                    // Don't pin if the mouse moved during drag
                    if (dragRef.current?.moved) return;
                    e.stopPropagation();
                    handleClick(l.idx);
                  }}
                  aria-label={`${l.commit.short}: ${l.commit.message}`}
                />
              );
            })}
          </div>

          {/* Foreground — hero cards per phase + note cards for tagged commits */}
          <div className="pg-layer pg-fg" ref={fgRef}>
            {/* Hero cards: one per phase, alternating above/below trunk */}
            {phaseXs.map((p, i) => {
              const above = i % 2 === 0;
              const cardY = above
                ? TRUNK_Y - MAX_REACH - 70
                : TRUNK_Y + MAX_REACH + 80;
              const meta = PHASE_META[p.index];
              return (
                <div
                  key={`hero-${p.index}`}
                  className={`pg-hero${above ? " above" : " below"}`}
                  style={{
                    left: `${p.centerX}px`,
                    top: `${cardY}px`,
                  }}
                >
                  <div className="pg-hero-line" />
                  <div className="pg-hero-card">
                    <div className="pg-hero-head">
                      <span className="pg-hero-num">{meta.numeral}</span>
                      <span className="pg-hero-name">{meta.name}</span>
                    </div>
                    <h2 className="pg-hero-title">{meta.title}</h2>
                    <p className="pg-hero-desc">{meta.desc}</p>
                    <div className="pg-hero-meta">
                      {p.count.toLocaleString()} commits
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Note cards: for commits with refs (tags, named branches) */}
            {noteCommits.map((l) => {
              const { x, y } = positionCommit(l, branches, tToX);
              const above = y < TRUNK_Y;
              const cardY = above ? y - 40 : y + 50;
              const cleanRefs = Array.from(
                new Set(
                  l.commit.refs.map((r) =>
                    r.replace("HEAD -> ", "").replace("origin/", "").trim()
                  )
                )
              ).filter(Boolean);
              return (
                <div
                  key={`note-${l.idx}`}
                  className={`pg-note${above ? " above" : " below"}`}
                  style={{ left: `${x}px`, top: `${cardY}px` }}
                >
                  <div className="pg-note-line" />
                  <div className="pg-note-card">
                    <div className="pg-note-sha">{l.commit.short}</div>
                    <div className="pg-note-msg">{l.commit.message}</div>
                    {cleanRefs.length > 0 && (
                      <div className="pg-note-refs">
                        {cleanRefs.slice(0, 2).map((r) => (
                          <span key={r} className="pg-note-ref">
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
        </div>
      </div>

      {/* Floating HUD */}
      <div className="pg-hud">
        <div className="pg-hud-phase">
          <span className="pg-hud-label">Viewing</span>
          <span className="pg-hud-value">
            {PHASE_META[currentPhase].numeral} &middot;{" "}
            {PHASE_META[currentPhase].name}
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

      {/* Hover tooltip */}
      {hoveredIdx !== null && layouts[hoveredIdx] && (
        <div className="pg-tooltip" aria-hidden="true">
          <code>{layouts[hoveredIdx].commit.short}</code>
          <span className="pg-tooltip-msg">
            {layouts[hoveredIdx].commit.message}
          </span>
        </div>
      )}

      {/* Pinned commit stack */}
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
