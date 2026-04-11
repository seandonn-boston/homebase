"use client";

/*
 * Constellation — dark warm background, commits as luminous points.
 * Branches traced as faint constellation lines between consecutive
 * commits of the same branch. Pan by drag in both X and Y, zoom
 * with ctrl+scroll.
 */

import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import {
  GraphData,
  prepareLayout,
  branchColor,
  PHASE_META,
  PHASE_COUNT,
} from "./graphShared";
import {
  useCommitStack,
  CommitStack,
  HoverTooltip,
  GraphPhaseProgress,
} from "./graphSharedClient";

const STAGE_WIDTH = 2800;
const STAGE_HEIGHT = 1600;
const PAD = 120;

export default function Constellation({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startScrollX: number;
    startScrollY: number;
    moved: boolean;
  } | null>(null);
  const [zoom, setZoom] = useState(1);

  const { layouts, branches, phases } = useMemo(
    () => prepareLayout(data),
    [data]
  );
  const { pinnedIdxs, hoveredIdx, setHoveredIdx, handleClick, handleDismiss } =
    useCommitStack(data.commits.length, { initial: [0], stepMode: "stack" });
  const [currentPhase, setCurrentPhase] = useState(0);
  const [progress, setProgress] = useState(0);

  // Commits distributed across the full stage — time on X, lane on Y
  const positionCommit = useCallback(
    (
      l: (typeof layouts)[number]
    ): { x: number; y: number } => {
      const x = PAD + l.t * (STAGE_WIDTH - PAD * 2);
      // Lane on Y, spread around vertical center
      const laneOffset = (l.visualLane - 3) * 80;
      const yJitter = Math.sin(l.idx * 0.37) * 40;
      const y = STAGE_HEIGHT / 2 + laneOffset + yJitter;
      return { x, y };
    },
    []
  );

  // Branch lines for each significant branch
  const branchLines = useMemo(() => {
    const byLane = new Map<number, typeof layouts>();
    layouts.forEach((l) => {
      const key = Math.floor(l.visualLane);
      if (!byLane.has(key)) byLane.set(key, []);
      byLane.get(key)!.push(l);
    });
    const out: { points: string; color: string; key: string; isMain: boolean }[] = [];
    byLane.forEach((arr, lane) => {
      if (arr.length < 2) return;
      const sorted = arr.slice().sort((a, b) => a.t - b.t);
      const points = sorted
        .map((l, i) => {
          const { x, y } = positionCommit(l);
          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");
      out.push({
        points,
        color: lane === 0 ? "#ffcf8a" : branchColor(lane),
        key: `l-${lane}`,
        isMain: lane === 0,
      });
    });
    return out;
  }, [layouts, positionCommit]);

  // Drag pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".cst-commit")) return;
    const container = containerRef.current;
    if (!container) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startScrollX: container.scrollLeft,
      startScrollY: container.scrollTop,
      moved: false,
    };
    container.style.cursor = "grabbing";
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
      const container = containerRef.current;
      if (!container) return;
      container.scrollLeft = dragRef.current.startScrollX - dx;
      container.scrollTop = dragRef.current.startScrollY - dy;
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

  // Ctrl+scroll to zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setZoom((z) => Math.max(0.6, Math.min(2.2, z * (e.deltaY > 0 ? 0.92 : 1.08))));
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Track current phase from scrollLeft
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const maxScroll = container.scrollWidth - container.clientWidth;
        const prog = maxScroll > 0 ? container.scrollLeft / maxScroll : 0;
        setProgress(prog);
        const phase = Math.max(
          0,
          Math.min(PHASE_COUNT - 1, Math.floor(prog * PHASE_COUNT))
        );
        setCurrentPhase(phase);
      });
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const hovered = hoveredIdx !== null ? layouts[hoveredIdx].commit : null;

  return (
    <div className="cst-graph">
      <GraphPhaseProgress
        phases={PHASE_META.map((m) => ({ numeral: m.numeral, name: m.name }))}
        current={currentPhase}
        progress={progress}
        onJump={(i) => {
          const container = containerRef.current;
          if (!container) return;
          const maxScroll = container.scrollWidth - container.clientWidth;
          const targetProg = (i + 0.5) / PHASE_COUNT;
          container.scrollTo({
            left: targetProg * maxScroll,
            behavior: "smooth",
          });
        }}
      />

      <div
        className="cst-container"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        style={{ cursor: "grab" }}
      >
        <div
          className="cst-stage"
          style={{
            width: `${STAGE_WIDTH * zoom}px`,
            height: `${STAGE_HEIGHT * zoom}px`,
          }}
        >
          <svg
            className="cst-svg"
            width="100%"
            height="100%"
            viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Constellation lines */}
            {branchLines.map((ln) => (
              <path
                key={ln.key}
                d={ln.points}
                stroke={ln.color}
                strokeWidth={ln.isMain ? 1.6 : 0.7}
                opacity={ln.isMain ? 0.7 : 0.28}
                fill="none"
                strokeLinecap="round"
              />
            ))}

            {/* Phase numerals as faint labels near the middle */}
            {phases.map((p) => {
              const x = PAD + p.centerT * (STAGE_WIDTH - PAD * 2);
              return (
                <text
                  key={`num-${p.index}`}
                  x={x}
                  y={STAGE_HEIGHT / 2 - 400}
                  textAnchor="middle"
                  fontFamily="Baskerville, Georgia, serif"
                  fontSize={160}
                  fontWeight={200}
                  fill="#e8c288"
                  opacity={0.08}
                >
                  {PHASE_META[p.index].numeral}
                </text>
              );
            })}

            {/* Stars */}
            {layouts.map((l) => {
              const { x, y } = positionCommit(l);
              const isMain = Math.floor(l.visualLane) === 0;
              const isHovered = hoveredIdx === l.idx;
              const isPinned = pinnedIdxs.includes(l.idx);
              const baseR = isMain ? 4 : 2.4;
              const r = isHovered ? baseR * 2.4 : isPinned ? baseR * 1.8 : baseR;
              return (
                <g
                  key={l.idx}
                  className="cst-commit"
                  onMouseEnter={() => setHoveredIdx(l.idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={(e) => {
                    if (dragRef.current?.moved) return;
                    e.stopPropagation();
                    handleClick(l.idx);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer glow */}
                  <circle
                    cx={x}
                    cy={y}
                    r={r * 3}
                    fill={isMain ? "#ffd89a" : branchColor(Math.floor(l.visualLane))}
                    opacity={isMain ? 0.22 : 0.12}
                  />
                  {/* Core */}
                  <circle
                    cx={x}
                    cy={y}
                    r={r}
                    fill={isMain ? "#fffaf2" : "#fffaf2"}
                    stroke={branchColor(Math.floor(l.visualLane))}
                    strokeWidth={isMain ? 1.4 : 0.7}
                    style={{ transition: "r 150ms ease" }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="cst-hint">
        Drag to pan · ctrl+scroll to zoom · click any star to pin
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
