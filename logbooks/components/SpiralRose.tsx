"use client";

/*
 * SpiralRose — commits arranged on an Archimedean spiral.
 * Oldest commit is at the center. As time progresses, commits
 * spiral outward. Branches cluster radially.
 *
 * This variant doesn't scroll horizontally — it fits in a single
 * viewport and you interact by clicking commits to pin them.
 * You can rotate the rose by dragging.
 */

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  GraphData,
prepareLayout,
branchColor,
PHASE_META,
} from "./graphShared";
import {
  useCommitStack,
CommitStack,
HoverTooltip,
} from "./graphSharedClient";

const VIEW = 900;
const CENTER = VIEW / 2;
const SPIRAL_TURNS = 5;
const MIN_RADIUS = 30;
const MAX_RADIUS = VIEW * 0.44;

function spiralPosition(t: number, visualLane: number): { x: number; y: number } {
  // t: 0 = oldest (center), 1 = newest (outer)
  // Each commit is at the next position along the spiral.
  const theta = t * Math.PI * 2 * SPIRAL_TURNS;
  const r = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * t;
  // Lane perturbation: off-main commits offset slightly perpendicular
  const perp = visualLane === 0 ? 0 : (visualLane * 6) * Math.sin(theta * 3);
  return {
    x: CENTER + Math.cos(theta) * r + Math.cos(theta + Math.PI / 2) * perp,
    y: CENTER + Math.sin(theta) * r + Math.sin(theta + Math.PI / 2) * perp,
  };
}

export default function SpiralRose({ data }: { data: GraphData }) {
  const { layouts, phases } = useMemo(() => prepareLayout(data), [data]);
  const [rotation, setRotation] = useState(0);
  const dragRef = useRef<{ startX: number; startRot: number } | null>(null);
  const { pinnedIdxs, hoveredIdx, setHoveredIdx, handleClick, handleDismiss } =
    useCommitStack(data.commits.length, { initial: [0], stepMode: "stack" });

  // Build the spiral path as a polyline for the main branch backbone
  const spinePath = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      const { x, y } = spiralPosition(t, 0);
      pts.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    }
    return pts.join(" ");
  }, []);

  // Ring paths for phase boundaries (circles at each phase end radius)
  const phaseRings = useMemo(
    () =>
      phases.map((p, i) => {
        const t = p.endT;
        const r = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * t;
        return { i, r };
      }),
    [phases]
  );

  // Drag rotates the rose
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".sr-commit")) return;
    dragRef.current = { startX: e.clientX, startRot: rotation };
  }, [rotation]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      setRotation(dragRef.current.startRot + dx * 0.4);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const hovered = hoveredIdx !== null ? layouts[hoveredIdx].commit : null;

  return (
    <div className="sr-graph" onMouseDown={handleMouseDown}>
      <svg
        className="sr-svg"
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <defs>
          <radialGradient id="sr-atm" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="rgba(255, 220, 160, 0.18)" />
            <stop offset="100%" stopColor="rgba(255, 220, 160, 0)" />
          </radialGradient>
        </defs>

        {/* Atmospheric glow */}
        <circle cx={CENTER} cy={CENTER} r={MAX_RADIUS + 40} fill="url(#sr-atm)" />

        {/* Phase rings */}
        {phaseRings.map((ring) => (
          <circle
            key={`ring-${ring.i}`}
            cx={CENTER}
            cy={CENTER}
            r={ring.r}
            fill="none"
            stroke="#b58a3e"
            strokeWidth={0.8}
            strokeDasharray="4 6"
            opacity={0.32}
          />
        ))}

        {/* Spiral spine */}
        <path
          d={spinePath}
          fill="none"
          stroke="#c4503a"
          strokeWidth={1.6}
          opacity={0.75}
        />

        {/* Commits */}
        {layouts.map((l) => {
          const { x, y } = spiralPosition(l.t, Math.floor(l.visualLane));
          const isMain = Math.floor(l.visualLane) === 0;
          const isHovered = hoveredIdx === l.idx;
          const isPinned = pinnedIdxs.includes(l.idx);
          const baseR = isMain ? 4 : 2.6;
          const r = isHovered ? baseR * 2 : isPinned ? baseR * 1.6 : baseR;
          return (
            <circle
              key={l.idx}
              cx={x}
              cy={y}
              r={r}
              fill={branchColor(Math.floor(l.visualLane))}
              stroke="#fffaf2"
              strokeWidth={isMain ? 0.8 : 0.4}
              className="sr-commit"
              style={{ cursor: "pointer", transition: "r 150ms ease" }}
              onMouseEnter={() => setHoveredIdx(l.idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={(e) => {
                e.stopPropagation();
                handleClick(l.idx);
              }}
            />
          );
        })}

        {/* Phase numerals along the spiral arcs */}
        {phases.map((p) => {
          const theta = p.centerT * Math.PI * 2 * SPIRAL_TURNS;
          const r = MIN_RADIUS + (MAX_RADIUS - MIN_RADIUS) * p.centerT;
          const x = CENTER + Math.cos(theta) * (r + 28);
          const y = CENTER + Math.sin(theta) * (r + 28);
          return (
            <text
              key={`num-${p.index}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontFamily="Baskerville, Georgia, serif"
              fontSize={28}
              fontWeight={300}
              fill="#b58a3e"
              opacity={0.6}
              className="sr-phase-numeral"
            >
              {PHASE_META[p.index].numeral}
            </text>
          );
        })}
      </svg>

      <div className="sr-hint">Drag to rotate · click any commit to pin</div>

      <HoverTooltip commit={hovered} />
      <CommitStack
        pinnedIdxs={pinnedIdxs}
        commits={data.commits}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
