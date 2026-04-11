"use client";

/*
 * VerticalTrunk — trunk runs top-to-bottom. Native page scroll.
 * Branches peel off to the left and right. No wheel hijacking.
 */

import { useMemo } from "react";
import {
  GraphData,
Layout,
BranchInfo,
prepareLayout,
branchColor,
ease,
PHASE_META,
} from "./graphShared";
import {
  useCommitStack,
CommitStack,
HoverTooltip,
} from "./graphSharedClient";

const STAGE_HEIGHT_PX = 5000;
const STAGE_HEIGHT_VH = 0;
const CENTER_X_PCT = 50;
const MAX_REACH = 280;

function yForT(t: number): number {
  // t=0 oldest at bottom, t=1 newest at top
  return (1 - t) * STAGE_HEIGHT_PX;
}

function positionCommit(
  l: Layout,
  branches: Map<number, BranchInfo>,
  stageWidth: number
) {
  const key = Math.floor(l.visualLane);
  const y = yForT(l.t);
  const centerX = stageWidth / 2;
  if (key === 0) return { x: centerX, y };
  const bi = branches.get(key);
  if (!bi) return { x: centerX, y };
  const span = Math.max(0.001, bi.endT - bi.startT);
  const progress = Math.max(0, Math.min(1, (l.t - bi.startT) / span));
  const eased = ease(progress);
  const p0x = centerX;
  const p0y = yForT(bi.startT);
  const p2x = centerX + bi.side * bi.reach;
  const p2y = yForT(bi.endT);
  const p1x = centerX + bi.side * bi.reach * 0.85;
  const p1y = (p0y + p2y) / 2;
  const mt = 1 - eased;
  return {
    x: mt * mt * p0x + 2 * mt * eased * p1x + eased * eased * p2x,
    y: mt * mt * p0y + 2 * mt * eased * p1y + eased * eased * p2y,
  };
}

function branchPath(bi: BranchInfo, stageWidth: number): string {
  if (bi.lane === 0) return "";
  const centerX = stageWidth / 2;
  const p0x = centerX;
  const p0y = yForT(bi.startT);
  const p2x = centerX + bi.side * bi.reach;
  const p2y = yForT(bi.endT);
  const p1x = centerX + bi.side * bi.reach * 0.85;
  const p1y = (p0y + p2y) / 2;
  return `M ${p0x} ${p0y} Q ${p1x} ${p1y} ${p2x} ${p2y}`;
}

export default function VerticalTrunk({ data }: { data: GraphData }) {
  const { layouts, branches, phases } = useMemo(() => prepareLayout(data), [data]);
  const { pinnedIdxs, hoveredIdx, setHoveredIdx, handleClick, handleDismiss } =
    useCommitStack(data.commits.length, { initial: [0], stepMode: "stack" });

  // Build SVG at a fixed internal coordinate system
  const STAGE_WIDTH_PX = 1200;

  const branchPaths = useMemo(() => {
    const out: { d: string; color: string; width: number; key: string }[] = [];
    branches.forEach((bi) => {
      if (bi.lane === 0) return;
      out.push({
        d: branchPath(bi, STAGE_WIDTH_PX),
        color: branchColor(bi.lane),
        width: Math.min(2.4, 1 + Math.sqrt(bi.count) * 0.22),
        key: `br-${bi.lane}`,
      });
    });
    return out;
  }, [branches]);

  const hovered = hoveredIdx !== null ? layouts[hoveredIdx].commit : null;

  return (
    <div className="vt-graph">
      <div className="vt-stage" style={{ height: `${STAGE_HEIGHT_PX}px` }}>
        {/* Deep background phase numerals */}
        {phases.map((p) => {
          const y = yForT(p.centerT);
          return (
            <div
              key={`num-${p.index}`}
              className="vt-phase-num"
              style={{ top: `${y}px` }}
            >
              {PHASE_META[p.index].numeral}
            </div>
          );
        })}

        {/* Phase name labels on the sides */}
        {phases.map((p) => {
          const y = yForT(p.centerT);
          return (
            <div
              key={`name-${p.index}`}
              className="vt-phase-label"
              style={{ top: `${y}px` }}
            >
              <span className="vt-phase-label-name">
                {PHASE_META[p.index].name}
              </span>
              <span className="vt-phase-label-title">
                {PHASE_META[p.index].title}
              </span>
            </div>
          );
        })}

        {/* Trunk + branches SVG */}
        <svg
          className="vt-svg"
          viewBox={`0 0 ${STAGE_WIDTH_PX} ${STAGE_HEIGHT_PX}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="vt-trunk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c4593a" />
              <stop offset="50%" stopColor="#a04224" />
              <stop offset="100%" stopColor="#7a2e14" />
            </linearGradient>
          </defs>
          {/* Trunk */}
          <line
            x1={STAGE_WIDTH_PX / 2}
            y1={0}
            x2={STAGE_WIDTH_PX / 2}
            y2={STAGE_HEIGHT_PX}
            stroke="url(#vt-trunk)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          {/* Phase markers */}
          {phases.map((p, i) => {
            if (i === 0) return null;
            const y = yForT(p.startT);
            return (
              <line
                key={`pm-${i}`}
                x1={STAGE_WIDTH_PX / 2 - 30}
                y1={y}
                x2={STAGE_WIDTH_PX / 2 + 30}
                y2={y}
                stroke="#b58a3e"
                strokeWidth={1.2}
                strokeDasharray="4 5"
                opacity={0.55}
              />
            );
          })}
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

        {/* Commit dots */}
        {layouts.map((l) => {
          const { x, y } = positionCommit(l, branches, STAGE_WIDTH_PX);
          const xPct = (x / STAGE_WIDTH_PX) * 100;
          const isMain = Math.floor(l.visualLane) === 0;
          const isHovered = hoveredIdx === l.idx;
          const isPinned = pinnedIdxs.includes(l.idx);
          return (
            <button
              key={l.idx}
              type="button"
              className={`vt-commit${isMain ? " main" : ""}${isHovered ? " hovered" : ""}${isPinned ? " pinned" : ""}`}
              style={{
                left: `${xPct}%`,
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

        {/* Hero card per phase, alternating sides */}
        {phases.map((p, i) => {
          const y = yForT(p.centerT);
          const side = i % 2 === 0 ? "right" : "left";
          const meta = PHASE_META[p.index];
          return (
            <div
              key={`hero-${p.index}`}
              className={`vt-hero vt-hero-${side}`}
              style={{ top: `${y}px` }}
            >
              <div className="vt-hero-line" />
              <div className="vt-hero-card">
                <div className="vt-hero-head">
                  <span className="vt-hero-num">{meta.numeral}</span>
                  <span className="vt-hero-name">{meta.name}</span>
                </div>
                <h2 className="vt-hero-title">{meta.title}</h2>
                <p className="vt-hero-desc">{meta.desc}</p>
                <div className="vt-hero-meta">
                  {p.count.toLocaleString()} commits
                </div>
              </div>
            </div>
          );
        })}
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
