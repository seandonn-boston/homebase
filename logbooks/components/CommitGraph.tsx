"use client";

/*
 * CommitGraph — Growing Tree
 *
 * A 3D tree rooted at the oldest commit. The trunk runs straight up
 * the Y axis and IS the main branch: every commit where lane === 0
 * sits on the trunk, oldest at the bottom, newest at the top. Each
 * side branch peels off from the trunk at its actual first-commit
 * time, curves outward in a stable radial direction, and extends to
 * its last-commit time. Commits render as nodes on trunk or limb.
 *
 * Horizontal phase rings around the trunk mark the five project
 * phases (derived from time bins). They turn the trunk into a
 * measurable time axis.
 */

import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  Suspense,
} from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Instances, Instance, Line } from "@react-three/drei";
import * as THREE from "three";

// --- Types -------------------------------------------------------------------

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

// --- Constants ---------------------------------------------------------------

const REPO_URL = "https://github.com/seandonn-boston/helm";

/** Total vertical extent of the tree in world units */
const TREE_HEIGHT = 30;
/** Maximum radial extent that any branch can reach */
const TREE_RADIUS = 14;
/** Number of phase rings around the trunk */
const PHASE_COUNT = 5;

const ACCENT = "#c4503a";
const TRUNK_COLOR = "#8b3e22";
const TRUNK_LIT = "#c4593a";
const GOLD = "#b58a3e";
const GOLD_LIGHT = "#e8c288";
const CREAM = "#fffaf2";
const LEAF_COLOR = "#f6c06a";

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

// --- Data preparation --------------------------------------------------------

interface CommitLayout {
  idx: number;
  commit: Commit;
  /** 1 if main branch, else descending */
  significance: number;
  /** compacted visual lane (0 = main) */
  visualLane: number;
  /** original git lane */
  branchId: number;
  /** normalized time: oldest = 0, newest = 1 */
  t: number;
}

interface BranchInfo {
  lane: number;
  /** earliest t among this branch's commits */
  startT: number;
  /** latest t */
  endT: number;
  /** total commit count on this branch */
  count: number;
  /** stable radial direction (radians) */
  angle: number;
  /** radius reached by the branch tip */
  reachR: number;
}

function prepareLayout(data: GraphData): {
  layouts: CommitLayout[];
  branches: Map<number, BranchInfo>;
} {
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

  const maxSig = significantLanes.length;
  let ephNext = maxSig;

  const layouts: CommitLayout[] = commits.map((c, i) => {
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
      significance,
      visualLane,
      branchId: c.lane,
      t,
    };
  });

  // Compute per-branch info
  const byLane = new Map<number, CommitLayout[]>();
  layouts.forEach((l) => {
    const key = Math.floor(l.visualLane);
    if (!byLane.has(key)) byLane.set(key, []);
    byLane.get(key)!.push(l);
  });

  const branches = new Map<number, BranchInfo>();
  // Deterministic golden-angle spread for branch angles
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  let angleCounter = 0;
  [...byLane.keys()].sort((a, b) => a - b).forEach((lane) => {
    const arr = byLane.get(lane)!;
    const startT = Math.min(...arr.map((l) => l.t));
    const endT = Math.max(...arr.map((l) => l.t));
    const count = arr.length;
    // Branch angle: main = 0 (trunk), others spread by golden angle
    const angle = lane === 0 ? 0 : angleCounter++ * goldenAngle;
    // Reach: proportional to branch count, capped
    const reachR = lane === 0 ? 0 : Math.min(TREE_RADIUS, 2.2 + Math.sqrt(count) * 1.1);
    branches.set(lane, { lane, startT, endT, count, angle, reachR });
  });

  return { layouts, branches };
}

// --- Position functions ------------------------------------------------------

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function yForT(t: number): number {
  return (t - 0.5) * TREE_HEIGHT;
}

/**
 * Position of a commit along its branch.
 * Main branch: strictly on the trunk (0, y, 0).
 * Side branch: curves outward from the trunk at its start-time,
 * following a smooth eased radius, at a stable branch-specific angle.
 */
function positionCommit(l: CommitLayout, branches: Map<number, BranchInfo>): [number, number, number] {
  const key = Math.floor(l.visualLane);
  if (key === 0) {
    // Trunk
    return [0, yForT(l.t), 0];
  }
  const bi = branches.get(key);
  if (!bi) return [0, yForT(l.t), 0];

  const span = Math.max(0.001, bi.endT - bi.startT);
  const rawProgress = (l.t - bi.startT) / span;
  const progress = Math.max(0, Math.min(1, rawProgress));

  // Eased radius — branch starts tangent to the trunk and spreads
  // outward quickly at first, then settles near the tip.
  const r = bi.reachR * easeOutCubic(progress);

  // Subtle upward arc — branches rise slightly as they extend
  const lift = progress * 0.8;

  return [
    Math.cos(bi.angle) * r,
    yForT(l.t) + lift,
    Math.sin(bi.angle) * r,
  ];
}

/** Point at the trunk at a specific time — used as branch start anchor */
function trunkAt(t: number): [number, number, number] {
  return [0, yForT(t), 0];
}

// --- Branch line generators --------------------------------------------------

/**
 * Build a smooth bezier polyline from the trunk at the branch's
 * start time to the branch's tip, with intermediate points eased
 * along the same function positionCommit uses. Used to draw the
 * branch's visible "limb" line.
 */
function buildBranchLine(
  bi: BranchInfo,
  samples = 18
): [number, number, number][] {
  if (bi.lane === 0) return [];
  const pts: [number, number, number][] = [];
  for (let i = 0; i <= samples; i++) {
    const progress = i / samples;
    const r = bi.reachR * easeOutCubic(progress);
    const t = bi.startT + progress * (bi.endT - bi.startT);
    const lift = progress * 0.8;
    pts.push([
      Math.cos(bi.angle) * r,
      yForT(t) + lift,
      Math.sin(bi.angle) * r,
    ]);
  }
  return pts;
}

/** Trunk polyline from oldest commit (bottom) to newest (top) */
function buildTrunkLine(layouts: CommitLayout[]): [number, number, number][] {
  return layouts
    .filter((l) => Math.floor(l.visualLane) === 0)
    .sort((a, b) => a.t - b.t)
    .map((l) => trunkAt(l.t));
}

// --- Phase rings -------------------------------------------------------------

function PhaseRings() {
  // Draw PHASE_COUNT rings at evenly-spaced time positions
  const rings: { y: number; r: number; key: string; label: number }[] = [];
  for (let p = 0; p < PHASE_COUNT; p++) {
    const t = p / Math.max(1, PHASE_COUNT - 1);
    rings.push({
      y: yForT(t),
      r: 1.2 + p * 0.05,
      key: `ring-${p}`,
      label: p,
    });
  }
  return (
    <group>
      {rings.map((ring) => {
        const pts: [number, number, number][] = [];
        const segs = 64;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push([Math.cos(a) * ring.r, ring.y, Math.sin(a) * ring.r]);
        }
        return (
          <Line
            key={ring.key}
            points={pts}
            color={GOLD}
            lineWidth={1}
            transparent
            opacity={0.4}
          />
        );
      })}
    </group>
  );
}

// --- Growing Tree ------------------------------------------------------------

interface TreeProps {
  layouts: CommitLayout[];
  branches: Map<number, BranchInfo>;
  pinnedIdxs: number[];
  hoveredIdx: number | null;
  onClick: (idx: number) => void;
  onHover: (idx: number | null) => void;
}

function GrowingTree({
  layouts,
  branches,
  pinnedIdxs,
  hoveredIdx,
  onClick,
  onHover,
}: TreeProps) {
  // Trunk as a thick mesh tube
  const trunkPoints = useMemo(() => buildTrunkLine(layouts), [layouts]);
  const trunkCurve = useMemo(() => {
    if (trunkPoints.length < 2) return null;
    return new THREE.CatmullRomCurve3(
      trunkPoints.map((p) => new THREE.Vector3(...p)),
      false,
      "catmullrom",
      0.1
    );
  }, [trunkPoints]);

  // Branch limb lines
  const branchLines = useMemo(() => {
    const out: { points: [number, number, number][]; color: string; thickness: number; key: string }[] = [];
    branches.forEach((bi) => {
      if (bi.lane === 0) return;
      const start = trunkAt(bi.startT);
      const tip = buildBranchLine(bi);
      const points = [start, ...tip];
      out.push({
        points,
        color: BRANCH_COLORS[bi.lane % BRANCH_COLORS.length],
        thickness: Math.min(2.4, 0.9 + Math.sqrt(bi.count) * 0.2),
        key: `limb-${bi.lane}`,
      });
    });
    return out;
  }, [branches]);

  return (
    <group>
      {/* Trunk — thick swept tube along the curve */}
      {trunkCurve && (
        <mesh>
          <tubeGeometry args={[trunkCurve, 64, 0.32, 14, false]} />
          <meshStandardMaterial
            color={TRUNK_COLOR}
            emissive={TRUNK_LIT}
            emissiveIntensity={0.15}
            roughness={0.72}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* Phase rings around trunk */}
      <PhaseRings />

      {/* Branch limb lines */}
      {branchLines.map((br) => (
        <Line
          key={br.key}
          points={br.points}
          color={br.color}
          lineWidth={br.thickness}
          transparent
          opacity={0.65}
        />
      ))}

      {/* Commit instances */}
      <Instances limit={layouts.length} range={layouts.length}>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color={CREAM}
          emissive={LEAF_COLOR}
          emissiveIntensity={0.55}
          roughness={0.45}
          metalness={0.15}
        />
        {layouts.map((l) => {
          const isPinned = pinnedIdxs.includes(l.idx);
          const isHovered = hoveredIdx === l.idx;
          const [x, y, z] = positionCommit(l, branches);
          const isMain = Math.floor(l.visualLane) === 0;
          const base = isMain ? 1.25 : 0.85 + l.significance * 0.4;
          const scale = isHovered ? base * 2.6 : isPinned ? base * 2 : base;
          let color: string;
          if (isMain) {
            color = ACCENT;
          } else {
            color = BRANCH_COLORS[Math.floor(l.visualLane) % BRANCH_COLORS.length];
          }
          return (
            <Instance
              key={l.idx}
              position={[x, y, z]}
              scale={scale}
              color={color}
              onClick={(e: ThreeEvent<MouseEvent>) => {
                e.stopPropagation();
                onClick(l.idx);
              }}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                e.stopPropagation();
                onHover(l.idx);
              }}
              onPointerOut={() => onHover(null)}
            />
          );
        })}
      </Instances>
    </group>
  );
}

// --- Scene wrapper -----------------------------------------------------------

function Scene({
  layouts,
  branches,
  pinnedIdxs,
  hoveredIdx,
  onClick,
  onHover,
}: TreeProps) {
  return (
    <>
      <ambientLight intensity={0.55} color={"#fff0d8"} />
      <directionalLight position={[20, 30, 25]} intensity={0.9} color={CREAM} castShadow />
      <directionalLight position={[-20, -10, -20]} intensity={0.3} color={"#e07b5f"} />
      <pointLight position={[0, 0, 0]} intensity={1.4} color={GOLD_LIGHT} distance={32} decay={1.3} />
      <GrowingTree
        layouts={layouts}
        branches={branches}
        pinnedIdxs={pinnedIdxs}
        hoveredIdx={hoveredIdx}
        onClick={onClick}
        onHover={onHover}
      />
    </>
  );
}

// --- Commit detail stack overlay --------------------------------------------

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

// --- Top-level CommitGraph ---------------------------------------------------

export default function CommitGraph({ data }: { data: GraphData }) {
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
      else if (e.key === "Home") {
        setPinnedIdxs((curr) => (curr[0] === 0 ? curr : [0, ...curr.filter((i) => i !== 0)]));
        e.preventDefault();
        return;
      } else if (e.key === "End") {
        setPinnedIdxs((curr) =>
          curr[0] === max ? curr : [max, ...curr.filter((i) => i !== max)]
        );
        e.preventDefault();
        return;
      } else if (e.key === "Escape") {
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
    <div className="cube-graph">
      <div className="cube-canvas-wrap">
        <Canvas
          camera={{ position: [26, 10, 30], fov: 48 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <Scene
              layouts={layouts}
              branches={branches}
              pinnedIdxs={pinnedIdxs}
              hoveredIdx={hoveredIdx}
              onClick={handleClick}
              onHover={setHoveredIdx}
            />
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={10}
            maxDistance={90}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>

      <div className="cube-hint">
        Drag to orbit · scroll to zoom · click any commit to pin it · esc clears
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
