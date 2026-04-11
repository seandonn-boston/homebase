"use client";

/*
 * Ribbon — commits flow along a single sinuous ribbon that weaves
 * up and down across the viewport. Horizontal scroll moves along the
 * ribbon's length.
 */

import { useRef, useMemo, useCallback, useEffect } from "react";
import {
  GraphData,
Layout,
prepareLayout,
branchColor,
PHASE_META,
} from "./graphShared";
import {
  useCommitStack,
CommitStack,
HoverTooltip,
} from "./graphSharedClient";

const STAGE_WIDTH = 10000;
const STAGE_HEIGHT = 700;
const PAD_X = 160;
const CENTER_Y = STAGE_HEIGHT / 2;
const AMPLITUDE = 180;
const WAVELENGTH = 900; // horizontal pixels per wave

function ribbonY(x: number): number {
  // A sinusoidal wave across the stage width
  return CENTER_Y + Math.sin((x / WAVELENGTH) * Math.PI * 2) * AMPLITUDE;
}

function positionCommit(l: Layout): { x: number; y: number } {
  const x = PAD_X + l.t * (STAGE_WIDTH - PAD_X * 2);
  const mainY = ribbonY(x);
  const lane = Math.floor(l.visualLane);
  // Off-branches offset perpendicular to the ribbon
  if (lane === 0) return { x, y: mainY };
  // Compute local tangent to offset perpendicularly
  const dx = 0.01;
  const slope = (ribbonY(x + dx) - mainY) / dx;
  const norm = Math.sqrt(1 + slope * slope);
  const nx = -slope / norm;
  const ny = 1 / norm;
  const offset = Math.min(80, 20 + lane * 8);
  return { x: x + nx * offset * (lane % 2 === 0 ? 1 : -1), y: mainY + ny * offset * (lane % 2 === 0 ? 1 : -1) };
}

export default function Ribbon({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { layouts, phases } = useMemo(() => prepareLayout(data), [data]);
  const { pinnedIdxs, hoveredIdx, setHoveredIdx, handleClick, handleDismiss } =
    useCommitStack(data.commits.length, { initial: [0], stepMode: "stack" });

  const ribbonPath = useMemo(() => {
    const pts: string[] = [];
    const step = 20;
    for (let x = PAD_X; x <= STAGE_WIDTH - PAD_X; x += step) {
      pts.push(`${pts.length === 0 ? "M" : "L"} ${x} ${ribbonY(x)}`);
    }
    return pts.join(" ");
  }, []);

  const ribbonPathWide = useMemo(() => {
    const top: string[] = [];
    const bot: string[] = [];
    const step = 20;
    const thickness = 14;
    for (let x = PAD_X; x <= STAGE_WIDTH - PAD_X; x += step) {
      const y = ribbonY(x);
      top.push(`${top.length === 0 ? "M" : "L"} ${x} ${y - thickness}`);
      bot.unshift(`L ${x} ${y + thickness}`);
    }
    return `${top.join(" ")} ${bot.join(" ")} Z`;
  }, []);

  // Wheel handler for horizontal scrolling
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
    <div className="rbn-graph">
      <div className="rbn-container" ref={containerRef}>
        <div
          className="rbn-stage"
          style={{ width: `${STAGE_WIDTH}px`, height: `${STAGE_HEIGHT}px` }}
        >
          <svg
            className="rbn-svg"
            width={STAGE_WIDTH}
            height={STAGE_HEIGHT}
            viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
          >
            <defs>
              <linearGradient id="rbn-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7a2e14" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#c4593a" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#a04224" stopOpacity="0.5" />
              </linearGradient>
            </defs>
            {/* Ribbon body — a wide filled path */}
            <path d={ribbonPathWide} fill="url(#rbn-grad)" />
            {/* Ribbon centerline */}
            <path
              d={ribbonPath}
              fill="none"
              stroke="#c4503a"
              strokeWidth={1.4}
              opacity={0.8}
            />
            {/* Phase markers */}
            {phases.map((p, i) => {
              if (i === 0) return null;
              const x = PAD_X + p.startT * (STAGE_WIDTH - PAD_X * 2);
              return (
                <line
                  key={`pb-${i}`}
                  x1={x}
                  y1={80}
                  x2={x}
                  y2={STAGE_HEIGHT - 80}
                  stroke="#b58a3e"
                  strokeDasharray="3 5"
                  strokeWidth={1}
                  opacity={0.35}
                />
              );
            })}
          </svg>

          {/* Phase labels */}
          {phases.map((p) => {
            const x = PAD_X + p.centerT * (STAGE_WIDTH - PAD_X * 2);
            return (
              <div
                key={`pn-${p.index}`}
                className="rbn-phase-label"
                style={{ left: `${x}px` }}
              >
                <span className="rbn-phase-num">
                  {PHASE_META[p.index].numeral}
                </span>
                <span className="rbn-phase-name">
                  {PHASE_META[p.index].name}
                </span>
              </div>
            );
          })}

          {/* Commit dots */}
          {layouts.map((l) => {
            const { x, y } = positionCommit(l);
            const isMain = Math.floor(l.visualLane) === 0;
            const isHovered = hoveredIdx === l.idx;
            const isPinned = pinnedIdxs.includes(l.idx);
            return (
              <button
                key={l.idx}
                type="button"
                className={`rbn-commit${isMain ? " main" : ""}${isHovered ? " hovered" : ""}${isPinned ? " pinned" : ""}`}
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

      <div className="rbn-hint">
        Drag horizontally or scroll · click any commit to pin
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
