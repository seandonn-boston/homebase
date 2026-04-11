"use client";

/*
 * Terrain — commit density as a 2D terrain profile. Peaks are busy
 * days, valleys are quiet days. Scroll horizontally across the
 * landscape. Commits float as flags above their position.
 */

import { useMemo, useRef, useCallback, useEffect } from "react";
import {
  GraphData,
prepareLayout,
PHASE_META,
branchColor,
} from "./graphShared";
import {
  useCommitStack,
CommitStack,
HoverTooltip,
} from "./graphSharedClient";

const STAGE_WIDTH = 10000;
const STAGE_HEIGHT = 700;
const BASELINE = STAGE_HEIGHT - 100;
const PEAK_HEIGHT = 380;
const PAD_X = 120;

export default function Terrain({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { layouts, phases } = useMemo(() => prepareLayout(data), [data]);
  const { pinnedIdxs, hoveredIdx, setHoveredIdx, handleClick, handleDismiss } =
    useCommitStack(data.commits.length, { initial: [0], stepMode: "stack" });

  // Density profile: count commits per time bucket, smoothed
  const profile = useMemo(() => {
    const buckets = 180;
    const counts = new Array(buckets).fill(0);
    for (const l of layouts) {
      const b = Math.min(buckets - 1, Math.floor(l.t * buckets));
      counts[b]++;
    }
    // 3-bucket smoothing
    const smooth = new Array(buckets).fill(0);
    for (let i = 0; i < buckets; i++) {
      const a = counts[Math.max(0, i - 1)];
      const b = counts[i];
      const c = counts[Math.min(buckets - 1, i + 1)];
      smooth[i] = (a + b + b + c) / 4;
    }
    const max = Math.max(...smooth, 1);
    return { smooth, max, buckets };
  }, [layouts]);

  // Build the mountain silhouette SVG path
  const terrainPath = useMemo(() => {
    const pts: string[] = [];
    pts.push(`M ${PAD_X} ${BASELINE}`);
    profile.smooth.forEach((v, i) => {
      const x = PAD_X + (i / (profile.buckets - 1)) * (STAGE_WIDTH - PAD_X * 2);
      const h = (v / profile.max) * PEAK_HEIGHT;
      pts.push(`L ${x} ${BASELINE - h}`);
    });
    pts.push(`L ${STAGE_WIDTH - PAD_X} ${BASELINE}`);
    pts.push("Z");
    return pts.join(" ");
  }, [profile]);

  // Far-range silhouette (parallax layer, lower amplitude)
  const farTerrainPath = useMemo(() => {
    const pts: string[] = [];
    pts.push(`M 0 ${BASELINE - 40}`);
    profile.smooth.forEach((v, i) => {
      const x = PAD_X + (i / (profile.buckets - 1)) * (STAGE_WIDTH - PAD_X * 2);
      const h = (v / profile.max) * (PEAK_HEIGHT * 0.55);
      pts.push(`L ${x} ${BASELINE - 40 - h}`);
    });
    pts.push(`L ${STAGE_WIDTH} ${BASELINE - 40}`);
    pts.push("Z");
    return pts.join(" ");
  }, [profile]);

  // Function to get Y at a given x (for commit positioning on the terrain)
  const terrainYAt = useCallback(
    (t: number): number => {
      const buckets = profile.buckets;
      const idx = Math.min(buckets - 1, Math.floor(t * buckets));
      const h = (profile.smooth[idx] / profile.max) * PEAK_HEIGHT;
      return BASELINE - h;
    },
    [profile]
  );

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
      container.scrollLeft = Math.max(0, Math.min(maxScroll, currentScroll + total));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const hovered = hoveredIdx !== null ? layouts[hoveredIdx].commit : null;

  return (
    <div className="trn-graph">
      <div className="trn-container" ref={containerRef}>
        <div
          className="trn-stage"
          style={{ width: `${STAGE_WIDTH}px`, height: `${STAGE_HEIGHT}px` }}
        >
          <svg
            className="trn-svg"
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
          >
            <defs>
              <linearGradient id="trn-sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fde5c6" />
                <stop offset="60%" stopColor="#fbd1a0" />
                <stop offset="100%" stopColor="#f6b382" />
              </linearGradient>
              <linearGradient id="trn-far" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(196, 130, 70, 0.45)" />
                <stop offset="100%" stopColor="rgba(160, 90, 50, 0.35)" />
              </linearGradient>
              <linearGradient id="trn-near" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a04224" />
                <stop offset="100%" stopColor="#642c14" />
              </linearGradient>
            </defs>

            {/* Sky */}
            <rect
              x={0}
              y={0}
              width={STAGE_WIDTH}
              height={BASELINE}
              fill="url(#trn-sky)"
              opacity={0.22}
            />

            {/* Far range (parallax background — drawn larger) */}
            <path d={farTerrainPath} fill="url(#trn-far)" />

            {/* Near range (main terrain) */}
            <path d={terrainPath} fill="url(#trn-near)" />

            {/* Baseline ground */}
            <line
              x1={0}
              y1={BASELINE}
              x2={STAGE_WIDTH}
              y2={BASELINE}
              stroke="#4a2412"
              strokeWidth={2}
            />

            {/* Phase markers */}
            {phases.map((p, i) => {
              if (i === 0) return null;
              const x = PAD_X + p.startT * (STAGE_WIDTH - PAD_X * 2);
              return (
                <line
                  key={`pm-${i}`}
                  x1={x}
                  y1={60}
                  x2={x}
                  y2={BASELINE}
                  stroke="#b58a3e"
                  strokeDasharray="4 6"
                  strokeWidth={1}
                  opacity={0.5}
                />
              );
            })}
          </svg>

          {/* Phase labels floating in the sky */}
          {phases.map((p) => {
            const x = PAD_X + p.centerT * (STAGE_WIDTH - PAD_X * 2);
            return (
              <div
                key={`pn-${p.index}`}
                className="trn-phase-label"
                style={{ left: `${x}px`, top: "40px" }}
              >
                <span className="trn-phase-num">
                  {PHASE_META[p.index].numeral}
                </span>
                <span className="trn-phase-name">
                  {PHASE_META[p.index].name}
                </span>
              </div>
            );
          })}

          {/* Commit flags above the terrain */}
          {layouts.map((l) => {
            const x = PAD_X + l.t * (STAGE_WIDTH - PAD_X * 2);
            const terrainY = terrainYAt(l.t);
            const isMain = Math.floor(l.visualLane) === 0;
            const offsetY = isMain ? -14 : -8 - (l.visualLane % 4) * 6;
            const y = terrainY + offsetY;
            const isHovered = hoveredIdx === l.idx;
            const isPinned = pinnedIdxs.includes(l.idx);
            return (
              <button
                key={l.idx}
                type="button"
                className={`trn-commit${isMain ? " main" : ""}${isHovered ? " hovered" : ""}${isPinned ? " pinned" : ""}`}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  background: branchColor(Math.floor(l.visualLane)),
                }}
                onMouseEnter={() => setHoveredIdx(l.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick(l.idx);
                }}
                aria-label={`${l.commit.short}: ${l.commit.message}`}
              />
            );
          })}
        </div>
      </div>

      <div className="trn-hint">
        The project as a mountain range &middot; scroll horizontally &middot; peaks are busy days
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
