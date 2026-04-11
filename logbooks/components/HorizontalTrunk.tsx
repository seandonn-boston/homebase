"use client";

/*
 * HorizontalTrunk — clean rebuild.
 *
 * A horizontal 2D commit graph with time running left (oldest) to
 * right (newest). Trunk is a single horizontal line through the
 * middle of the stage; side branches curve above and below the trunk
 * as quadratic beziers from their first-commit anchor to their last.
 *
 * The stage width is always dynamic — computed from the number of
 * commits — so every commit has the same horizontal spacing and
 * phase boundaries line up with the actual commit distribution.
 *
 * Interaction:
 *   - wheel (any axis) → horizontal scroll
 *   - drag empty space → pan
 *   - click a commit → pin to stack
 *   - arrow keys → pan (shift for faster), Home/End, Esc clears
 *   - shared phase-progress rail on the right
 */

import {
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import {
  GraphData,
  Layout,
  BranchInfo,
  prepareLayout,
  branchColor,
  ease,
  PHASE_META,
  PHASE_COUNT,
} from "./graphShared";
import {
  useCommitStack,
  CommitStack,
  HoverTooltip,
  GraphPhaseProgress,
} from "./graphSharedClient";

// --- Stage geometry ---------------------------------------------------------

const CONTAINER_HEIGHT = 720;
const TRUNK_Y = CONTAINER_HEIGHT / 2;
/** Horizontal padding at the ends so first/last commits don't touch edges */
const PAD_X = 200;
/** Pixels allotted per commit — stage width scales linearly */
const PX_PER_COMMIT = 9;
/** Minimum stage width even for very small data sets */
const MIN_STAGE_WIDTH = 3200;
/** Maximum vertical reach of a branch above or below the trunk */
const MAX_REACH = 210;

// --- Position helpers (pure, take stageWidth + branches) --------------------

function makeTToX(stageWidth: number) {
  return (t: number) => PAD_X + t * (stageWidth - 2 * PAD_X);
}

function commitPosition(
  l: Layout,
  branches: Map<number, BranchInfo>,
  tToX: (t: number) => number
): { x: number; y: number } {
  const lane = Math.floor(l.visualLane);
  const x = tToX(l.t);
  if (lane === 0) return { x, y: TRUNK_Y };
  const bi = branches.get(lane);
  if (!bi) return { x, y: TRUNK_Y };
  const span = Math.max(0.001, bi.endT - bi.startT);
  const progress = Math.max(0, Math.min(1, (l.t - bi.startT) / span));
  const eased = ease(progress);
  // Quadratic bezier: P0 on trunk at startT, P2 at branch tip at endT
  const p0x = tToX(bi.startT);
  const p0y = TRUNK_Y;
  const p2x = tToX(bi.endT);
  const p2y = TRUNK_Y + bi.side * bi.reach;
  const p1x = (p0x + p2x) / 2;
  const p1y = TRUNK_Y + bi.side * bi.reach * 0.85;
  const mt = 1 - eased;
  return {
    x: mt * mt * p0x + 2 * mt * eased * p1x + eased * eased * p2x,
    y: mt * mt * p0y + 2 * mt * eased * p1y + eased * eased * p2y,
  };
}

function branchPathD(
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

/** Commit-density heatmap path, symmetric above/below the trunk */
function heatmapPathD(
  layouts: Layout[],
  tToX: (t: number) => number
): string {
  const buckets = 160;
  const counts = new Array(buckets).fill(0);
  for (const l of layouts) {
    const b = Math.min(buckets - 1, Math.floor(l.t * buckets));
    counts[b]++;
  }
  const max = Math.max(...counts, 1);
  const maxH = 130;
  const top: string[] = [];
  const bot: string[] = [];
  for (let i = 0; i <= buckets; i++) {
    const t = i / buckets;
    const x = tToX(t);
    const h = (counts[Math.min(buckets - 1, i)] / max) * maxH;
    top.push(`${i === 0 ? "M" : "L"} ${x} ${TRUNK_Y - h}`);
    bot.unshift(`L ${x} ${TRUNK_Y + h}`);
  }
  return `${top.join(" ")} ${bot.join(" ")} Z`;
}

/** Month labels along the timeline */
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

/** Select which tagged commits get note cards — cap to avoid clutter */
function selectNoteCommits(layouts: Layout[]): Layout[] {
  const tagged = layouts.filter((l) => l.commit.refs.length > 0);
  if (tagged.length <= 16) return tagged;
  const step = tagged.length / 16;
  const out: Layout[] = [];
  for (let i = 0; i < 16; i++) out.push(tagged[Math.floor(i * step)]);
  return out;
}

// --- Main component ---------------------------------------------------------

export default function HorizontalTrunk({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startScroll: number; moved: boolean } | null>(null);
  const rafRef = useRef<number>(0);

  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);

  const { layouts, branches, phases } = useMemo(
    () => prepareLayout(data),
    [data]
  );

  const { pinnedIdxs, hoveredIdx, setHoveredIdx, handleClick, handleDismiss } =
    useCommitStack(data.commits.length, { initial: [0] });

  // Stage width scales linearly with commit count
  const stageWidth = useMemo(
    () =>
      Math.max(
        MIN_STAGE_WIDTH,
        data.commits.length * PX_PER_COMMIT + PAD_X * 2
      ),
    [data.commits.length]
  );

  const tToX = useMemo(() => makeTToX(stageWidth), [stageWidth]);

  // Precomputed paths and positions
  const trunkX1 = tToX(0);
  const trunkX2 = tToX(1);

  const branchLines = useMemo(() => {
    const out: { d: string; color: string; width: number; key: string }[] = [];
    branches.forEach((bi) => {
      if (bi.lane === 0) return;
      out.push({
        d: branchPathD(bi, tToX),
        color: branchColor(bi.lane),
        width: Math.min(3, 1.1 + Math.sqrt(bi.count) * 0.22),
        key: `br-${bi.lane}`,
      });
    });
    return out;
  }, [branches, tToX]);

  const heatmap = useMemo(() => heatmapPathD(layouts, tToX), [layouts, tToX]);
  const monthLabels = useMemo(() => extractMonthLabels(layouts, tToX), [layouts, tToX]);
  const noteCommits = useMemo(() => selectNoteCommits(layouts), [layouts]);

  // Phase positions with true center X based on actual t ranges
  const phaseXs = useMemo(
    () =>
      phases.map((p) => ({
        ...p,
        centerX: tToX(p.centerT),
        startX: tToX(p.startT),
        endX: tToX(p.endT),
      })),
    [phases, tToX]
  );

  // --- Scroll tracking ---------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      rafRef.current = 0;
      const sx = container.scrollLeft;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const prog = maxScroll > 0 ? sx / maxScroll : 0;
      setProgress(prog);
      // Determine which phase is centered in the viewport
      const centerX = sx + container.clientWidth / 2;
      const centerT = (centerX - PAD_X) / (stageWidth - 2 * PAD_X);
      const phase = Math.max(
        0,
        Math.min(PHASE_COUNT - 1, Math.floor(centerT * PHASE_COUNT))
      );
      setCurrentPhase(phase);
    };

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
  }, [stageWidth]);

  // --- Dual-wheel input --------------------------------------------------

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (e: WheelEvent) => {
      const total = (e.deltaY || 0) + (e.deltaX || 0);
      if (total === 0) return;
      const maxScroll = container.scrollWidth - container.clientWidth;
      const cur = container.scrollLeft;
      const can = (total > 0 && cur < maxScroll) || (total < 0 && cur > 0);
      if (can) {
        e.preventDefault();
        container.scrollLeft = Math.max(0, Math.min(maxScroll, cur + total));
      }
    };
    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  // --- Drag-to-pan --------------------------------------------------------

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".ht-commit, .ht-hero, .ht-note, button, a")) return;
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

  // --- Keyboard -----------------------------------------------------------

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
      const step = e.shiftKey ? 800 : 220;
      let delta = 0;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") delta = step;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") delta = -step;
      else if (e.key === "PageDown") delta = container.clientWidth * 0.85;
      else if (e.key === "PageUp") delta = -container.clientWidth * 0.85;
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
      } else {
        return;
      }
      container.scrollBy({ left: delta, behavior: "smooth" });
      e.preventDefault();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hovered = hoveredIdx !== null ? layouts[hoveredIdx].commit : null;

  return (
    <div className="ht-graph">
      <GraphPhaseProgress
        phases={PHASE_META.map((m) => ({ numeral: m.numeral, name: m.name }))}
        current={currentPhase}
        progress={progress}
        onJump={(i) => {
          const container = containerRef.current;
          if (!container) return;
          const maxScroll = container.scrollWidth - container.clientWidth;
          const targetCenterX = phaseXs[i].centerX;
          // scroll so targetCenterX is at viewport center
          const target = targetCenterX - container.clientWidth / 2;
          container.scrollTo({
            left: Math.max(0, Math.min(maxScroll, target)),
            behavior: "smooth",
          });
        }}
      />

      <div
        className="ht-container"
        ref={containerRef}
        onMouseDown={onMouseDown}
        style={{ cursor: "grab" }}
      >
        <div
          className="ht-stage"
          style={{
            width: `${stageWidth}px`,
            height: `${CONTAINER_HEIGHT}px`,
          }}
        >
          <svg
            className="ht-svg"
            width={stageWidth}
            height={CONTAINER_HEIGHT}
            viewBox={`0 0 ${stageWidth} ${CONTAINER_HEIGHT}`}
          >
            <defs>
              <linearGradient id="ht-trunk" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7a2e14" />
                <stop offset="50%" stopColor="#c4593a" />
                <stop offset="100%" stopColor="#a04224" />
              </linearGradient>
              <linearGradient id="ht-heat" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255, 180, 120, 0)" />
                <stop offset="50%" stopColor="rgba(255, 180, 120, 0.18)" />
                <stop offset="100%" stopColor="rgba(255, 180, 120, 0)" />
              </linearGradient>
            </defs>

            {/* Activity heatmap */}
            <path d={heatmap} fill="url(#ht-heat)" opacity={0.85} />

            {/* Phase boundary markers */}
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
              x1={trunkX1}
              y1={TRUNK_Y}
              x2={trunkX2}
              y2={TRUNK_Y}
              stroke="url(#ht-trunk)"
              strokeWidth={4}
              strokeLinecap="round"
            />

            {/* Branch limbs */}
            {branchLines.map((br) => (
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

          {/* Month labels along the top edge */}
          {monthLabels.map((m) => (
            <div
              key={m.label}
              className="ht-month"
              style={{ left: `${m.x}px`, top: "46px" }}
            >
              {m.label}
            </div>
          ))}

          {/* Phase labels centered on each phase's true center X */}
          {phaseXs.map((p) => (
            <div
              key={`pn-${p.index}`}
              className="ht-phase-label"
              style={{
                left: `${p.centerX}px`,
                top: `${TRUNK_Y + MAX_REACH + 50}px`,
              }}
            >
              <span className="ht-phase-num">
                {PHASE_META[p.index].numeral}
              </span>
              <span className="ht-phase-name">
                {PHASE_META[p.index].name}
              </span>
            </div>
          ))}

          {/* Hero cards per phase, alternating above/below */}
          {phaseXs.map((p, i) => {
            const above = i % 2 === 0;
            const meta = PHASE_META[p.index];
            const cardY = above
              ? TRUNK_Y - MAX_REACH - 260
              : TRUNK_Y + MAX_REACH + 130;
            return (
              <div
                key={`hero-${p.index}`}
                className={`ht-hero${above ? " above" : " below"}`}
                style={{
                  left: `${p.centerX}px`,
                  top: `${cardY}px`,
                }}
              >
                <div className="ht-hero-line" />
                <div className="ht-hero-card">
                  <div className="ht-hero-head">
                    <span className="ht-hero-num">{meta.numeral}</span>
                    <span className="ht-hero-name">{meta.name}</span>
                  </div>
                  <h2 className="ht-hero-title">{meta.title}</h2>
                  <p className="ht-hero-desc">{meta.desc}</p>
                  <div className="ht-hero-meta">
                    {p.count.toLocaleString()} commits
                  </div>
                </div>
              </div>
            );
          })}

          {/* Note cards for selected tagged commits */}
          {noteCommits.map((l) => {
            const { x, y } = commitPosition(l, branches, tToX);
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
                className={`ht-note${above ? " above" : " below"}`}
                style={{ left: `${x}px`, top: `${cardY}px` }}
              >
                <div className="ht-note-line" />
                <div className="ht-note-card">
                  <div className="ht-note-sha">{l.commit.short}</div>
                  <div className="ht-note-msg">{l.commit.message}</div>
                  {cleanRefs.length > 0 && (
                    <div className="ht-note-refs">
                      {cleanRefs.slice(0, 2).map((r) => (
                        <span key={r} className="ht-note-ref">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Commit dots */}
          {layouts.map((l) => {
            const { x, y } = commitPosition(l, branches, tToX);
            const isMain = Math.floor(l.visualLane) === 0;
            const isHovered = hoveredIdx === l.idx;
            const isPinned = pinnedIdxs.includes(l.idx);
            return (
              <button
                key={l.idx}
                type="button"
                className={`ht-commit${isMain ? " main" : ""}${isHovered ? " hovered" : ""}${isPinned ? " pinned" : ""}`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  background: branchColor(Math.floor(l.visualLane)),
                }}
                onMouseEnter={() => setHoveredIdx(l.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={(e) => {
                  if (dragRef.current?.moved) return;
                  e.stopPropagation();
                  handleClick(l.idx);
                }}
                aria-label={`${l.commit.short}: ${l.commit.message}`}
              />
            );
          })}
        </div>
      </div>

      <HoverTooltip commit={hovered} />
      <CommitStack
        pinnedIdxs={pinnedIdxs}
        commits={data.commits}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
