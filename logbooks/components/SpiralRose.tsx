"use client";

/*
 * SpiralRose — a 3D tunnel with commits on its inner wall.
 *
 * You are looking down a circular tunnel. Commits sit on the wall at
 * varying angular positions and z-depths, forming a spiral pattern.
 * A tall outer scroll container drives the viewer's depth into the
 * tunnel — as you scroll, the whole spiral shifts toward you, so
 * deeper (older) commits come into view and shallower (newer)
 * commits scale up, pass the camera, and exit the frame.
 *
 * Pure CSS 3D perspective. No 3D library.
 */

import { useMemo, useRef, useState, useEffect } from "react";
import {
  GraphData,
  Layout,
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

// Tunnel geometry in 3D space (px units in the perspective system)
const TUNNEL_RADIUS = 260;
const COMMITS_PER_TURN = 24;
const DEPTH_PER_COMMIT = 44;
const PERSPECTIVE = 900;
// How many depth units the viewer can traverse as they scroll
// Calculated from commit count
function tunnelLength(n: number) {
  return n * DEPTH_PER_COMMIT;
}

interface Position3D {
  x: number;
  y: number;
  z: number;
  theta: number;
}

function commitPosition(l: Layout, viewerZ: number): Position3D {
  // Newest commit is closest to the viewer (z = 0 at start).
  // As idx grows, commits go deeper into the tunnel (more negative z).
  const theta = l.idx * ((2 * Math.PI) / COMMITS_PER_TURN);
  const x = TUNNEL_RADIUS * Math.cos(theta);
  const y = TUNNEL_RADIUS * Math.sin(theta);
  // Z: 0 = at the viewer, negative = deeper in the tunnel.
  // After scrolling, add viewerZ (positive) so commits come forward.
  const z = -l.idx * DEPTH_PER_COMMIT + viewerZ;
  return { x, y, z, theta };
}

export default function SpiralRose({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewerZ, setViewerZ] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const rafRef = useRef<number>(0);

  const { layouts, phases } = useMemo(() => prepareLayout(data), [data]);
  const { pinnedIdxs, hoveredIdx, setHoveredIdx, handleClick, handleDismiss } =
    useCommitStack(data.commits.length, { stepMode: "stack" });

  const totalDepth = tunnelLength(data.commits.length);

  // Scroll handler drives viewerZ
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      rafRef.current = 0;
      const sy = el.scrollTop;
      const maxScroll = el.scrollHeight - el.clientHeight;
      const prog = maxScroll > 0 ? sy / maxScroll : 0;
      setProgress(prog);
      // Viewer depth: 0 at top, totalDepth at bottom
      setViewerZ(prog * totalDepth);
      // Current phase: the phase containing the commit closest to the viewer
      // Newest (idx 0) is closest at prog=0; oldest (idx n-1) is closest at prog=1
      const approxIdx = Math.floor(prog * (data.commits.length - 1));
      const approxT = 1 - approxIdx / Math.max(1, data.commits.length - 1);
      const phase = Math.max(
        0,
        Math.min(PHASE_COUNT - 1, Math.floor(approxT * PHASE_COUNT))
      );
      setCurrentPhase(phase);
    };

    const onScroll = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(update);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [totalDepth, data.commits.length]);

  const hovered = hoveredIdx !== null ? layouts[hoveredIdx].commit : null;

  // Render: outer scroll container has a tall spacer that gives scroll distance.
  // Inside it, a position:sticky viewport holds the fixed 3D scene.
  const scrollDistancePx = totalDepth + 800; // add extra so you can fully exit

  return (
    <div className="spt-graph">
      <GraphPhaseProgress
        phases={PHASE_META.map((m) => ({ numeral: m.numeral, name: m.name }))}
        current={currentPhase}
        progress={progress}
        onJump={(i) => {
          const el = containerRef.current;
          if (!el) return;
          // Jump viewerZ to the center of that phase
          // Phase i's commits span centerT = (i + 0.5)/5 → idx at center
          const centerT = (i + 0.5) / PHASE_COUNT;
          const centerIdx = Math.round(
            (1 - centerT) * (data.commits.length - 1)
          );
          const targetProg = centerIdx / Math.max(1, data.commits.length - 1);
          el.scrollTo({
            top: targetProg * (el.scrollHeight - el.clientHeight),
            behavior: "smooth",
          });
        }}
      />

      <div className="spt-container" ref={containerRef}>
        {/* Sticky viewport holds the fixed 3D scene */}
        <div className="spt-viewport-sticky">
          <div className="spt-viewport">
            <div className="spt-scene">
              {/* Tunnel wall rings — faint ambient guides */}
              {Array.from({ length: 24 }, (_, i) => {
                const ringZ = -i * 240 + (viewerZ % 240);
                if (ringZ > PERSPECTIVE - 40 || ringZ < -5000) return null;
                return (
                  <div
                    key={`ring-${i}`}
                    className="spt-ring"
                    style={{
                      transform: `translate3d(0, 0, ${ringZ}px)`,
                    }}
                  />
                );
              })}

              {/* Commit dots */}
              {layouts.map((l) => {
                const { x, y, z } = commitPosition(l, viewerZ);
                // Cull commits behind the viewer or too deep
                if (z > PERSPECTIVE - 60) return null;
                if (z < -PERSPECTIVE * 4) return null;
                const isMain = Math.floor(l.visualLane) === 0;
                const isHovered = hoveredIdx === l.idx;
                const isPinned = pinnedIdxs.includes(l.idx);
                return (
                  <button
                    key={l.idx}
                    type="button"
                    className={`spt-commit${isMain ? " main" : ""}${isHovered ? " hovered" : ""}${isPinned ? " pinned" : ""}`}
                    style={{
                      transform: `translate3d(${x}px, ${y}px, ${z}px)`,
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

              {/* Phase entry markers — a bright ring at the start of each phase */}
              {phases.map((p) => {
                // The phase's first commit (newest in that phase)
                const phaseStartIdx = Math.round(
                  (1 - p.endT) * (data.commits.length - 1)
                );
                const z = -phaseStartIdx * DEPTH_PER_COMMIT + viewerZ;
                if (z > PERSPECTIVE - 60) return null;
                if (z < -PERSPECTIVE * 4) return null;
                return (
                  <div
                    key={`ph-${p.index}`}
                    className="spt-phase-ring"
                    style={{
                      transform: `translate3d(0, 0, ${z}px)`,
                    }}
                  >
                    <span className="spt-phase-ring-label">
                      {PHASE_META[p.index].numeral} &middot;{" "}
                      {PHASE_META[p.index].name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scroll spacer — provides vertical scroll distance */}
        <div
          className="spt-spacer"
          style={{ height: `${scrollDistancePx}px` }}
        />
      </div>

      <div className="spt-hint">
        Scroll the inner container to descend into the tunnel
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
