"use client";

/*
 * CommitGraph — 3D cube diorama
 *
 * The graph is now a cubic space containing a central index pedestal and
 * four independent 3D visualizations of the same commit history:
 *
 *   I.   Constellation     — commits as floating stars, branches as
 *                            hairline constellation lines
 *   II.  Growing Tree      — literal branching tree with trunk + limbs
 *   III. Lantern Procession — glowing lantern spheres along branch columns
 *   IV.  Nebular Cloud     — dense particle cloud, branches as filaments
 *
 * The user orbits the cube with the mouse; the central index lets them
 * focus on any one of the four. Commit interaction (click to pin, etc)
 * works in every visualization and feeds the same floating stack overlay.
 */

import {
  useRef,
  useState,
  useMemo,
  useCallback,
  useEffect,
  Suspense,
} from "react";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Instances,
  Instance,
  Line,
  Html,
} from "@react-three/drei";
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
const CUBE_SIZE = 60;
const QUADRANT_OFFSET = CUBE_SIZE * 0.32;
const VIZ_HEIGHT = 28;

const ACCENT = "#c4503a";
const GOLD = "#b58a3e";
const GOLD_LIGHT = "#e8c288";
const CREAM = "#fffaf2";

type VizKey = "constellation" | "tree" | "lanterns" | "nebula" | null;

// --- Data preparation --------------------------------------------------------

interface CommitLayout {
  idx: number;
  commit: Commit;
  /** significance: 0 = ephemeral, 1 = main branch, values in between */
  significance: number;
  /** visual lane 0..N after compaction */
  visualLane: number;
  /** branch id (compacted) */
  branchId: number;
  /** time position 0..1, newest = 1 */
  t: number;
  /** radial angle in [0, 2π] for visualizations that distribute branches
   *  around a central spine */
  theta: number;
}

function prepareLayout(data: GraphData): {
  layouts: CommitLayout[];
  laneCount: number;
  branchIdForLane: Map<number, number>;
} {
  const commits = data.commits;
  const n = commits.length;

  // Count commits per raw lane
  const laneCounts = new Map<number, number>();
  commits.forEach((c) => {
    laneCounts.set(c.lane, (laneCounts.get(c.lane) || 0) + 1);
  });

  // Significant lanes get their own visual lane, sorted with main (lane 0) first
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

  // Build a connection map so ephemeral lanes can inherit a parent
  const firstParent = new Map<number, number>();
  for (const conn of data.connections) {
    if (!firstParent.has(conn.from)) firstParent.set(conn.from, conn.toLane);
  }

  // Assign a branch id to every commit, based on compacted lanes
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
      if (parentVisual !== undefined) {
        visualLane = parentVisual + 0.5;
      } else {
        visualLane = ephNext++;
      }
    }

    // Time: data is newest-first, so i=0 → t=1
    const t = 1 - i / Math.max(1, n - 1);

    // Significance: main branch highest, then by count
    const laneCount = laneCounts.get(c.lane) ?? 1;
    const significance = c.lane === 0 ? 1 : Math.min(0.85, laneCount / 50);

    return {
      idx: i,
      commit: c,
      significance,
      visualLane,
      branchId: c.lane,
      t,
      theta: 0, // filled in below
    };
  });

  // Assign a stable angular position per branch (used by tree + lanterns + nebula)
  const uniqueLanes = Array.from(new Set(layouts.map((l) => l.visualLane)))
    .sort((a, b) => a - b);
  const laneCount = uniqueLanes.length;
  const branchIdForLane = new Map<number, number>();
  uniqueLanes.forEach((lane, i) => branchIdForLane.set(lane, i));

  layouts.forEach((l) => {
    const bid = branchIdForLane.get(l.visualLane) ?? 0;
    // Main branch (lane 0) always at theta=0; others spread around a spiral
    if (l.branchId === 0 || l.visualLane === 0) {
      l.theta = 0;
    } else {
      // Use golden-angle distribution for visual spread
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      l.theta = bid * goldenAngle;
    }
  });

  return { layouts, laneCount, branchIdForLane };
}

// --- Commit position mappers (one per visualization) -------------------------

function posConstellation(l: CommitLayout): [number, number, number] {
  // Y axis = time (newest at top). X/Z = lane-driven angular position.
  const y = (l.t - 0.5) * VIZ_HEIGHT;
  const r = l.visualLane === 0 ? 0.2 : 3 + l.visualLane * 0.6;
  const x = Math.cos(l.theta * 1.7 + l.t * 0.8) * r;
  const z = Math.sin(l.theta * 1.7 + l.t * 0.8) * r;
  return [x, y, z];
}

function posTree(l: CommitLayout): [number, number, number] {
  // Literal tree: trunk runs up y axis, branches fan out radially.
  // Branches curve outward as they progress in time.
  const trunkR = 0.3;
  const branchMaxR = 4.5;
  const y = (l.t - 0.5) * VIZ_HEIGHT;
  if (l.visualLane === 0) {
    return [0, y, 0];
  }
  // Radial distance grows with time within the branch
  const r =
    trunkR +
    (branchMaxR - trunkR) *
      (0.45 + 0.55 * Math.sin(l.t * Math.PI * 2 + l.visualLane));
  const theta = l.theta + l.t * 0.4;
  return [Math.cos(theta) * r, y, Math.sin(theta) * r];
}

function posLantern(l: CommitLayout): [number, number, number] {
  // Vertical columns of lanterns, one per branch. Main branch at center.
  const y = (l.t - 0.5) * VIZ_HEIGHT;
  if (l.visualLane === 0) return [0, y, 0];
  const r = 2 + l.visualLane * 0.75;
  return [Math.cos(l.theta) * r, y, Math.sin(l.theta) * r];
}

function posNebula(l: CommitLayout): [number, number, number] {
  // Particle cloud with a bright central filament.
  const y = (l.t - 0.5) * VIZ_HEIGHT;
  if (l.visualLane === 0) {
    // Main branch filament with small organic wobble
    return [
      Math.sin(l.t * 12) * 0.45,
      y,
      Math.cos(l.t * 11) * 0.45,
    ];
  }
  // Side branches as scattered filaments
  const radius = 2 + l.visualLane * 0.55;
  const scatter = 0.6;
  return [
    Math.cos(l.theta + l.t * 2) * radius + (Math.sin(l.t * 18) * scatter),
    y + (Math.sin(l.idx * 0.07) * 0.4),
    Math.sin(l.theta + l.t * 2) * radius + (Math.cos(l.t * 17) * scatter),
  ];
}

// --- Central index pedestal --------------------------------------------------

interface IndexPedestalProps {
  focused: VizKey;
  onFocus: (key: VizKey) => void;
}

function CentralIndex({ focused, onFocus }: IndexPedestalProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Glowing core */}
      <mesh>
        <icosahedronGeometry args={[0.9, 1]} />
        <meshStandardMaterial
          color={GOLD}
          emissive={GOLD_LIGHT}
          emissiveIntensity={0.8}
          roughness={0.35}
          metalness={0.6}
        />
      </mesh>

      {/* Outer wireframe ring */}
      <mesh>
        <torusGeometry args={[1.6, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={GOLD_LIGHT}
          emissive={GOLD_LIGHT}
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={GOLD_LIGHT}
          emissive={GOLD_LIGHT}
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.6, 0.04, 16, 64]} />
        <meshStandardMaterial
          color={GOLD_LIGHT}
          emissive={GOLD_LIGHT}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* HTML labels — always face the camera, clickable */}
      <Html
        position={[0, 0, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "auto" }}
      >
        <div className="cube-index">
          <button
            type="button"
            className={focused === null ? "cube-index-center focused" : "cube-index-center"}
            onClick={() => onFocus(null)}
            title="Overview"
          >
            Helm
          </button>
        </div>
      </Html>
    </group>
  );
}

// --- Visualization wrapper ---------------------------------------------------

interface VizProps {
  layouts: CommitLayout[];
  pinnedIdxs: number[];
  hoveredIdx: number | null;
  onClick: (idx: number) => void;
  onHover: (idx: number | null) => void;
}

// Branch colors — warm palette
const BRANCH_COLORS = [
  "#c4503a", // accent coral (main)
  "#b58a3e", // gold
  "#7a4e2a", // umber
  "#9e4a66", // plum
  "#4a6e45", // sage
  "#2e5a6e", // teal
  "#8a5a1e", // sienna
  "#5a4a82", // amethyst
];

function branchColor(l: CommitLayout): string {
  if (l.branchId === 0 || l.visualLane === 0) return BRANCH_COLORS[0];
  return BRANCH_COLORS[Math.floor(l.visualLane) % BRANCH_COLORS.length];
}

// --- I. Constellation --------------------------------------------------------

function Constellation({ layouts, pinnedIdxs, hoveredIdx, onClick, onHover }: VizProps) {
  // Build per-branch line segments connecting consecutive commits of the same branch
  const lines = useMemo(() => {
    const byLane = new Map<number, CommitLayout[]>();
    layouts.forEach((l) => {
      const key = Math.floor(l.visualLane);
      if (!byLane.has(key)) byLane.set(key, []);
      byLane.get(key)!.push(l);
    });
    const result: { points: [number, number, number][]; color: string; key: string }[] = [];
    byLane.forEach((arr, lane) => {
      if (arr.length < 2) return;
      const sorted = arr.slice().sort((a, b) => a.t - b.t);
      const points = sorted.map(posConstellation);
      result.push({
        points,
        color: lane === 0 ? ACCENT : BRANCH_COLORS[lane % BRANCH_COLORS.length],
        key: `lane-${lane}`,
      });
    });
    return result;
  }, [layouts]);

  return (
    <group>
      {/* Constellation lines */}
      {lines.map((ln) => (
        <Line
          key={ln.key}
          points={ln.points}
          color={ln.color}
          lineWidth={ln.key === "lane-0" ? 1.8 : 0.8}
          transparent
          opacity={ln.key === "lane-0" ? 0.75 : 0.35}
        />
      ))}

      {/* Star instances */}
      <Instances limit={layouts.length} range={layouts.length}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial
          emissive={CREAM}
          emissiveIntensity={1.8}
          color={CREAM}
          toneMapped={false}
        />
        {layouts.map((l) => {
          const isPinned = pinnedIdxs.includes(l.idx);
          const isHovered = hoveredIdx === l.idx;
          const scale = isHovered ? 2.8 : isPinned ? 2.2 : 1 + l.significance * 0.6;
          const [x, y, z] = posConstellation(l);
          return (
            <Instance
              key={l.idx}
              position={[x, y, z]}
              scale={scale}
              color={branchColor(l)}
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

// --- II. Growing Tree --------------------------------------------------------

function GrowingTree({ layouts, pinnedIdxs, hoveredIdx, onClick, onHover }: VizProps) {
  // Draw the trunk as a continuous line of main branch commits
  const trunkPoints = useMemo(() => {
    return layouts
      .filter((l) => l.branchId === 0 || l.visualLane === 0)
      .sort((a, b) => a.t - b.t)
      .map(posTree);
  }, [layouts]);

  // Draw each side branch as a curving line from where it split from main
  const branchLines = useMemo(() => {
    const byLane = new Map<number, CommitLayout[]>();
    layouts.forEach((l) => {
      if (l.branchId === 0 || l.visualLane === 0) return;
      const key = Math.floor(l.visualLane);
      if (!byLane.has(key)) byLane.set(key, []);
      byLane.get(key)!.push(l);
    });
    const result: { points: [number, number, number][]; color: string; key: string }[] = [];
    byLane.forEach((arr, lane) => {
      if (arr.length < 1) return;
      const sorted = arr.slice().sort((a, b) => a.t - b.t);
      // Start the branch at the trunk at the earliest branch commit's time
      const startT = sorted[0].t;
      const trunkStart: [number, number, number] = [0, (startT - 0.5) * VIZ_HEIGHT, 0];
      const points: [number, number, number][] = [trunkStart, ...sorted.map(posTree)];
      result.push({
        points,
        color: BRANCH_COLORS[lane % BRANCH_COLORS.length],
        key: `br-${lane}`,
      });
    });
    return result;
  }, [layouts]);

  return (
    <group>
      {/* Trunk */}
      {trunkPoints.length >= 2 && (
        <Line
          points={trunkPoints}
          color={ACCENT}
          lineWidth={2.6}
          transparent
          opacity={0.9}
        />
      )}

      {/* Side branches */}
      {branchLines.map((br) => (
        <Line
          key={br.key}
          points={br.points}
          color={br.color}
          lineWidth={1.2}
          transparent
          opacity={0.5}
        />
      ))}

      {/* Commit nodes */}
      <Instances limit={layouts.length} range={layouts.length}>
        <sphereGeometry args={[0.18, 10, 10]} />
        <meshStandardMaterial roughness={0.45} metalness={0.25} />
        {layouts.map((l) => {
          const isPinned = pinnedIdxs.includes(l.idx);
          const isHovered = hoveredIdx === l.idx;
          const [x, y, z] = posTree(l);
          const baseScale = l.visualLane === 0 ? 1.15 : 0.85;
          const scale = isHovered ? baseScale * 2.6 : isPinned ? baseScale * 2 : baseScale;
          return (
            <Instance
              key={l.idx}
              position={[x, y, z]}
              scale={scale}
              color={branchColor(l)}
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

// --- III. Lantern Procession -------------------------------------------------

function LanternProcession({ layouts, pinnedIdxs, hoveredIdx, onClick, onHover }: VizProps) {
  // Thin vertical threads per branch
  const threads = useMemo(() => {
    const byLane = new Map<number, CommitLayout[]>();
    layouts.forEach((l) => {
      const key = Math.floor(l.visualLane);
      if (!byLane.has(key)) byLane.set(key, []);
      byLane.get(key)!.push(l);
    });
    const result: { points: [number, number, number][]; color: string; key: string }[] = [];
    byLane.forEach((arr, lane) => {
      if (arr.length < 2) return;
      const sorted = arr.slice().sort((a, b) => a.t - b.t);
      const points = sorted.map(posLantern);
      result.push({
        points,
        color: lane === 0 ? GOLD : GOLD_LIGHT,
        key: `thread-${lane}`,
      });
    });
    return result;
  }, [layouts]);

  return (
    <group>
      {/* Threads */}
      {threads.map((t) => (
        <Line
          key={t.key}
          points={t.points}
          color={t.color}
          lineWidth={0.7}
          transparent
          opacity={0.42}
        />
      ))}

      {/* Lanterns — emissive warm spheres */}
      <Instances limit={layouts.length} range={layouts.length}>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial
          color={CREAM}
          emissive={"#ffd89a"}
          emissiveIntensity={1.4}
          roughness={0.6}
        />
        {layouts.map((l) => {
          const isPinned = pinnedIdxs.includes(l.idx);
          const isHovered = hoveredIdx === l.idx;
          const [x, y, z] = posLantern(l);
          const scale = isHovered ? 2.4 : isPinned ? 1.9 : 0.75 + l.significance * 0.6;
          return (
            <Instance
              key={l.idx}
              position={[x, y, z]}
              scale={scale}
              color={l.visualLane === 0 ? "#ffe0a8" : "#ffd89a"}
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

// --- IV. Nebular Cloud -------------------------------------------------------

function NebulaCloud({ layouts, pinnedIdxs, hoveredIdx, onClick, onHover }: VizProps) {
  return (
    <group>
      {/* Main-branch filament highlighted */}
      <Instances limit={layouts.length} range={layouts.length}>
        <sphereGeometry args={[0.12, 6, 6]} />
        <meshBasicMaterial transparent opacity={0.85} />
        {layouts.map((l) => {
          const isPinned = pinnedIdxs.includes(l.idx);
          const isHovered = hoveredIdx === l.idx;
          const [x, y, z] = posNebula(l);
          const baseScale = l.visualLane === 0 ? 1.6 : 0.7 + l.significance * 0.5;
          const scale = isHovered ? baseScale * 3 : isPinned ? baseScale * 2 : baseScale;
          const color = l.visualLane === 0 ? "#ffe4b8" : branchColor(l);
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

// --- Viz label (HTML floating over each visualization) ----------------------

function VizLabel({
  position,
  label,
  numeral,
  active,
  onClick,
}: {
  position: [number, number, number];
  label: string;
  numeral: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Html
      position={position}
      center
      distanceFactor={14}
      style={{ pointerEvents: "auto" }}
    >
      <button
        type="button"
        className={`viz-label${active ? " active" : ""}`}
        onClick={onClick}
      >
        <span className="viz-label-num">{numeral}</span>
        <span className="viz-label-name">{label}</span>
      </button>
    </Html>
  );
}

// --- Camera focus controller -------------------------------------------------

interface FocusTarget {
  position: [number, number, number];
  lookAt: [number, number, number];
}

const FOCUS_TARGETS: Record<Exclude<VizKey, null>, FocusTarget> = {
  constellation: {
    position: [-QUADRANT_OFFSET, 8, QUADRANT_OFFSET + 24],
    lookAt: [-QUADRANT_OFFSET, 0, QUADRANT_OFFSET],
  },
  tree: {
    position: [QUADRANT_OFFSET, 8, QUADRANT_OFFSET + 24],
    lookAt: [QUADRANT_OFFSET, 0, QUADRANT_OFFSET],
  },
  lanterns: {
    position: [QUADRANT_OFFSET, 8, -QUADRANT_OFFSET + 24],
    lookAt: [QUADRANT_OFFSET, 0, -QUADRANT_OFFSET],
  },
  nebula: {
    position: [-QUADRANT_OFFSET, 8, -QUADRANT_OFFSET + 24],
    lookAt: [-QUADRANT_OFFSET, 0, -QUADRANT_OFFSET],
  },
};

const OVERVIEW_TARGET: FocusTarget = {
  position: [0, 18, 85],
  lookAt: [0, 0, 0],
};

function CameraFocus({ focused }: { focused: VizKey }) {
  const { camera, controls } = useThree() as unknown as {
    camera: THREE.PerspectiveCamera;
    controls: { target: THREE.Vector3; update: () => void } | null;
  };
  const targetPos = useRef(new THREE.Vector3(...OVERVIEW_TARGET.position));
  const targetLook = useRef(new THREE.Vector3(...OVERVIEW_TARGET.lookAt));

  useEffect(() => {
    const target = focused === null ? OVERVIEW_TARGET : FOCUS_TARGETS[focused];
    targetPos.current.set(...target.position);
    targetLook.current.set(...target.lookAt);
  }, [focused]);

  useFrame(() => {
    camera.position.lerp(targetPos.current, 0.05);
    if (controls?.target) {
      controls.target.lerp(targetLook.current, 0.05);
      controls.update();
    }
  });

  return null;
}

// --- Cube world content ------------------------------------------------------

interface CubeWorldProps {
  layouts: CommitLayout[];
  pinnedIdxs: number[];
  hoveredIdx: number | null;
  focused: VizKey;
  onClick: (idx: number) => void;
  onHover: (idx: number | null) => void;
  onFocus: (key: VizKey) => void;
}

function CubeWorld(props: CubeWorldProps) {
  const {
    layouts,
    pinnedIdxs,
    hoveredIdx,
    focused,
    onClick,
    onHover,
    onFocus,
  } = props;

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} color={"#fff0d8"} />
      <pointLight
        position={[0, 0, 0]}
        intensity={1.2}
        color={GOLD_LIGHT}
        distance={40}
      />
      <directionalLight position={[10, 30, 20]} intensity={0.9} color={CREAM} />
      <directionalLight position={[-20, -10, -20]} intensity={0.35} color={"#e07b5f"} />

      {/* Central index pedestal at origin */}
      <CentralIndex focused={focused} onFocus={onFocus} />

      {/* Four visualizations at corners of a square in the XZ plane */}
      <group position={[-QUADRANT_OFFSET, 0, QUADRANT_OFFSET]}>
        <Constellation
          layouts={layouts}
          pinnedIdxs={pinnedIdxs}
          hoveredIdx={hoveredIdx}
          onClick={onClick}
          onHover={onHover}
        />
        <VizLabel
          position={[0, VIZ_HEIGHT / 2 + 3, 0]}
          label="Constellation"
          numeral="I"
          active={focused === "constellation"}
          onClick={() => onFocus(focused === "constellation" ? null : "constellation")}
        />
      </group>

      <group position={[QUADRANT_OFFSET, 0, QUADRANT_OFFSET]}>
        <GrowingTree
          layouts={layouts}
          pinnedIdxs={pinnedIdxs}
          hoveredIdx={hoveredIdx}
          onClick={onClick}
          onHover={onHover}
        />
        <VizLabel
          position={[0, VIZ_HEIGHT / 2 + 3, 0]}
          label="Growing Tree"
          numeral="II"
          active={focused === "tree"}
          onClick={() => onFocus(focused === "tree" ? null : "tree")}
        />
      </group>

      <group position={[QUADRANT_OFFSET, 0, -QUADRANT_OFFSET]}>
        <LanternProcession
          layouts={layouts}
          pinnedIdxs={pinnedIdxs}
          hoveredIdx={hoveredIdx}
          onClick={onClick}
          onHover={onHover}
        />
        <VizLabel
          position={[0, VIZ_HEIGHT / 2 + 3, 0]}
          label="Lantern Procession"
          numeral="III"
          active={focused === "lanterns"}
          onClick={() => onFocus(focused === "lanterns" ? null : "lanterns")}
        />
      </group>

      <group position={[-QUADRANT_OFFSET, 0, -QUADRANT_OFFSET]}>
        <NebulaCloud
          layouts={layouts}
          pinnedIdxs={pinnedIdxs}
          hoveredIdx={hoveredIdx}
          onClick={onClick}
          onHover={onHover}
        />
        <VizLabel
          position={[0, VIZ_HEIGHT / 2 + 3, 0]}
          label="Nebular Cloud"
          numeral="IV"
          active={focused === "nebula"}
          onClick={() => onFocus(focused === "nebula" ? null : "nebula")}
        />
      </group>

      <CameraFocus focused={focused} />
    </>
  );
}

// --- Commit detail stack overlay (HTML, outside the Canvas) ------------------

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
  const [focused, setFocused] = useState<VizKey>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pinnedIdxs, setPinnedIdxs] = useState<number[]>([0]);

  const { layouts } = useMemo(() => prepareLayout(data), [data]);

  const handleClick = useCallback((idx: number) => {
    setPinnedIdxs((curr) => {
      if (curr[0] === idx) return curr.slice(1);
      return [idx, ...curr.filter((i) => i !== idx)];
    });
  }, []);

  const handleDismiss = useCallback((idx: number) => {
    setPinnedIdxs((curr) => curr.filter((i) => i !== idx));
  }, []);

  // Keyboard navigation — arrow keys step through commits on the top pin
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
        setPinnedIdxs((curr) =>
          curr[0] === 0 ? curr : [0, ...curr.filter((i) => i !== 0)]
        );
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
        setFocused(null);
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
          camera={{ position: OVERVIEW_TARGET.position, fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <CubeWorld
              layouts={layouts}
              pinnedIdxs={pinnedIdxs}
              hoveredIdx={hoveredIdx}
              focused={focused}
              onClick={handleClick}
              onHover={setHoveredIdx}
              onFocus={setFocused}
            />
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={14}
            maxDistance={140}
            target={[0, 0, 0]}
          />
        </Canvas>
      </div>

      <div className="cube-hint">
        Drag to orbit · scroll to zoom · click a visualization label to focus · click any commit to pin
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
