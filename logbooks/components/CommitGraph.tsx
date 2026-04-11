"use client";

/*
 * CommitGraph — single visualization, full canvas.
 *
 * Takes a `variant` prop selecting one of eight ways to render the
 * commit history in 3D:
 *
 *   constellation — stars + hairline branch lines
 *   tree          — trunk + radial limbs
 *   lanterns      — emissive spheres along vertical columns
 *   nebula        — scattered particles with a bright central filament
 *   helix         — spiral around a central axis
 *   orbital       — concentric horizontal rings per branch
 *   cathedral     — horizontal tiers, one per phase
 *   lattice       — commits on an orthogonal 3D grid
 *
 * The component renders just one of these at a time, centered at the
 * origin, with orbit controls, warm lighting, and the commit detail
 * stack overlaid on top. Each visualization lives at its own route
 * (/graph/constellation, /graph/tree, etc.) so they never share
 * a space.
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

// --- Types -------------------------------------------------------------------

export type VizVariant =
  | "constellation"
  | "tree"
  | "lanterns"
  | "nebula"
  | "helix"
  | "orbital"
  | "cathedral"
  | "lattice";

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
const VIZ_HALF = 14;
const VIZ_HEIGHT = VIZ_HALF * 1.9;

const ACCENT = "#c4503a";
const GOLD = "#b58a3e";
const GOLD_LIGHT = "#e8c288";
const CREAM = "#fffaf2";
const LANTERN_GLOW = "#ffd89a";

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
  significance: number;
  visualLane: number;
  branchId: number;
  t: number;
  theta: number;
  phase: number;
}

function prepareLayout(data: GraphData): CommitLayout[] {
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
    const significance = c.lane === 0 ? 1 : Math.min(0.85, laneCount / 50);
    const phase = Math.floor(t * 4.99);

    return {
      idx: i,
      commit: c,
      significance,
      visualLane,
      branchId: c.lane,
      t,
      theta: 0,
      phase,
    };
  });

  const uniqueLanes = Array.from(new Set(layouts.map((l) => l.visualLane))).sort(
    (a, b) => a - b
  );
  const laneToAngle = new Map<number, number>();
  uniqueLanes.forEach((lane, i) => {
    if (lane === 0) {
      laneToAngle.set(lane, 0);
    } else {
      laneToAngle.set(lane, i * Math.PI * (3 - Math.sqrt(5)));
    }
  });

  layouts.forEach((l) => {
    l.theta = laneToAngle.get(l.visualLane) ?? 0;
  });

  return layouts;
}

function branchColor(l: CommitLayout): string {
  if (l.branchId === 0 || l.visualLane === 0) return BRANCH_COLORS[0];
  return BRANCH_COLORS[Math.floor(l.visualLane) % BRANCH_COLORS.length];
}

// --- Position functions ------------------------------------------------------

function posConstellation(l: CommitLayout): [number, number, number] {
  const y = (l.t - 0.5) * VIZ_HEIGHT;
  const r = l.visualLane === 0 ? 0.25 : 2.2 + l.visualLane * 0.55;
  return [
    Math.cos(l.theta * 1.7 + l.t * 0.8) * r,
    y,
    Math.sin(l.theta * 1.7 + l.t * 0.8) * r,
  ];
}

function posTree(l: CommitLayout): [number, number, number] {
  const y = (l.t - 0.5) * VIZ_HEIGHT;
  if (l.visualLane === 0) return [0, y, 0];
  const r =
    0.45 + 4.5 * (0.45 + 0.55 * Math.sin(l.t * Math.PI * 2 + l.visualLane));
  const theta = l.theta + l.t * 0.4;
  return [Math.cos(theta) * r, y, Math.sin(theta) * r];
}

function posLantern(l: CommitLayout): [number, number, number] {
  const y = (l.t - 0.5) * VIZ_HEIGHT;
  if (l.visualLane === 0) return [0, y, 0];
  const r = 1.8 + l.visualLane * 0.68;
  return [Math.cos(l.theta) * r, y, Math.sin(l.theta) * r];
}

function posNebula(l: CommitLayout): [number, number, number] {
  const y = (l.t - 0.5) * VIZ_HEIGHT;
  if (l.visualLane === 0) {
    return [Math.sin(l.t * 12) * 0.5, y, Math.cos(l.t * 11) * 0.5];
  }
  const radius = 1.7 + l.visualLane * 0.5;
  const scatter = 0.55;
  return [
    Math.cos(l.theta + l.t * 2) * radius + Math.sin(l.t * 18) * scatter,
    y + Math.sin(l.idx * 0.07) * 0.5,
    Math.sin(l.theta + l.t * 2) * radius + Math.cos(l.t * 17) * scatter,
  ];
}

function posHelix(l: CommitLayout): [number, number, number] {
  const turns = 5;
  const y = (l.t - 0.5) * VIZ_HEIGHT;
  const baseR = 3.2;
  const laneOffset = l.visualLane === 0 ? 0 : 0.7 + l.visualLane * 0.22;
  const r = baseR + laneOffset;
  const phase = l.theta;
  const angle = l.t * Math.PI * 2 * turns + phase;
  return [Math.cos(angle) * r, y, Math.sin(angle) * r];
}

function posOrbital(l: CommitLayout): [number, number, number] {
  const laneIndex = Math.floor(l.visualLane);
  const levels = 10;
  const level = laneIndex % levels;
  const y = ((level / Math.max(1, levels - 1)) - 0.5) * VIZ_HEIGHT;
  const r =
    1.2 +
    Math.floor(laneIndex / levels) * 1.6 +
    (laneIndex % 3) * 0.6 +
    2;
  const angle = l.t * Math.PI * 2 * 3 + l.theta;
  return [Math.cos(angle) * r, y, Math.sin(angle) * r];
}

function posCathedral(l: CommitLayout): [number, number, number] {
  const floors = 5;
  const phase = Math.max(0, Math.min(floors - 1, l.phase));
  const y = ((phase / (floors - 1)) - 0.5) * VIZ_HEIGHT;
  const phaseFraction = phase === 0 ? l.t * 5 : (l.t * 5) - phase;
  const clamped = Math.max(0, Math.min(1, phaseFraction));
  const r = 0.5 + clamped * 4.4 + (l.visualLane % 4) * 0.5;
  const angle = l.theta + clamped * Math.PI * 6;
  return [Math.cos(angle) * r, y, Math.sin(angle) * r];
}

function posLattice(l: CommitLayout): [number, number, number] {
  const dim = 12;
  const cellSize = VIZ_HEIGHT / dim;
  const half = (dim - 1) / 2;
  const y = (Math.round(l.t * (dim - 1)) - half) * cellSize;
  const laneIndex = Math.floor(l.visualLane);
  const x = ((laneIndex % dim) - half) * cellSize;
  const z =
    ((Math.floor(laneIndex / dim) % dim) - half) * cellSize +
    ((l.idx % dim) - half) * cellSize * 0.35;
  return [x, y, z];
}

// --- Shared instance renderer ------------------------------------------------

interface VizProps {
  layouts: CommitLayout[];
  pinnedIdxs: number[];
  hoveredIdx: number | null;
  onClick: (idx: number) => void;
  onHover: (idx: number | null) => void;
}

interface CommitInstancesProps extends VizProps {
  position: (l: CommitLayout) => [number, number, number];
  geometry: React.ReactNode;
  material: React.ReactNode;
  baseScale?: (l: CommitLayout) => number;
  colorFor?: (l: CommitLayout) => string;
}

function CommitInstances({
  layouts,
  pinnedIdxs,
  hoveredIdx,
  onClick,
  onHover,
  position,
  geometry,
  material,
  baseScale,
  colorFor,
}: CommitInstancesProps) {
  return (
    <Instances limit={layouts.length} range={layouts.length}>
      {geometry}
      {material}
      {layouts.map((l) => {
        const isPinned = pinnedIdxs.includes(l.idx);
        const isHovered = hoveredIdx === l.idx;
        const base = baseScale ? baseScale(l) : 1;
        const scale = isHovered ? base * 2.6 : isPinned ? base * 2 : base;
        const [x, y, z] = position(l);
        return (
          <Instance
            key={l.idx}
            position={[x, y, z]}
            scale={scale}
            color={colorFor ? colorFor(l) : branchColor(l)}
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
  );
}

// --- Individual visualization components -------------------------------------

function Constellation(props: VizProps) {
  const lines = useMemo(() => {
    const byLane = new Map<number, CommitLayout[]>();
    props.layouts.forEach((l) => {
      const key = Math.floor(l.visualLane);
      if (!byLane.has(key)) byLane.set(key, []);
      byLane.get(key)!.push(l);
    });
    const result: { points: [number, number, number][]; color: string; key: string }[] = [];
    byLane.forEach((arr, lane) => {
      if (arr.length < 2) return;
      const sorted = arr.slice().sort((a, b) => a.t - b.t);
      result.push({
        points: sorted.map(posConstellation),
        color: lane === 0 ? ACCENT : BRANCH_COLORS[lane % BRANCH_COLORS.length],
        key: `l-${lane}`,
      });
    });
    return result;
  }, [props.layouts]);

  return (
    <group>
      {lines.map((ln) => (
        <Line
          key={ln.key}
          points={ln.points}
          color={ln.color}
          lineWidth={ln.key === "l-0" ? 2.2 : 0.9}
          transparent
          opacity={ln.key === "l-0" ? 0.8 : 0.35}
        />
      ))}
      <CommitInstances
        {...props}
        position={posConstellation}
        geometry={<sphereGeometry args={[0.13, 8, 8]} />}
        material={
          <meshStandardMaterial
            emissive={CREAM}
            emissiveIntensity={1.8}
            color={CREAM}
            toneMapped={false}
          />
        }
        baseScale={(l) => 0.9 + l.significance * 0.7}
      />
    </group>
  );
}

function GrowingTree(props: VizProps) {
  const trunkPoints = useMemo(
    () =>
      props.layouts
        .filter((l) => l.branchId === 0 || l.visualLane === 0)
        .sort((a, b) => a.t - b.t)
        .map(posTree),
    [props.layouts]
  );

  const branchLines = useMemo(() => {
    const byLane = new Map<number, CommitLayout[]>();
    props.layouts.forEach((l) => {
      if (l.branchId === 0 || l.visualLane === 0) return;
      const key = Math.floor(l.visualLane);
      if (!byLane.has(key)) byLane.set(key, []);
      byLane.get(key)!.push(l);
    });
    const result: { points: [number, number, number][]; color: string; key: string }[] = [];
    byLane.forEach((arr, lane) => {
      if (arr.length < 1) return;
      const sorted = arr.slice().sort((a, b) => a.t - b.t);
      const startT = sorted[0].t;
      const trunkStart: [number, number, number] = [0, (startT - 0.5) * VIZ_HEIGHT, 0];
      result.push({
        points: [trunkStart, ...sorted.map(posTree)],
        color: BRANCH_COLORS[lane % BRANCH_COLORS.length],
        key: `b-${lane}`,
      });
    });
    return result;
  }, [props.layouts]);

  return (
    <group>
      {trunkPoints.length >= 2 && (
        <Line points={trunkPoints} color={ACCENT} lineWidth={3} transparent opacity={0.9} />
      )}
      {branchLines.map((br) => (
        <Line
          key={br.key}
          points={br.points}
          color={br.color}
          lineWidth={1.3}
          transparent
          opacity={0.5}
        />
      ))}
      <CommitInstances
        {...props}
        position={posTree}
        geometry={<sphereGeometry args={[0.16, 10, 10]} />}
        material={<meshStandardMaterial roughness={0.45} metalness={0.25} />}
        baseScale={(l) => (l.visualLane === 0 ? 1.2 : 0.9)}
      />
    </group>
  );
}

function LanternProcession(props: VizProps) {
  const threads = useMemo(() => {
    const byLane = new Map<number, CommitLayout[]>();
    props.layouts.forEach((l) => {
      const key = Math.floor(l.visualLane);
      if (!byLane.has(key)) byLane.set(key, []);
      byLane.get(key)!.push(l);
    });
    const result: { points: [number, number, number][]; color: string; key: string }[] = [];
    byLane.forEach((arr, lane) => {
      if (arr.length < 2) return;
      const sorted = arr.slice().sort((a, b) => a.t - b.t);
      result.push({
        points: sorted.map(posLantern),
        color: lane === 0 ? GOLD : GOLD_LIGHT,
        key: `th-${lane}`,
      });
    });
    return result;
  }, [props.layouts]);

  return (
    <group>
      {threads.map((t) => (
        <Line
          key={t.key}
          points={t.points}
          color={t.color}
          lineWidth={0.8}
          transparent
          opacity={0.5}
        />
      ))}
      <CommitInstances
        {...props}
        position={posLantern}
        geometry={<sphereGeometry args={[0.18, 12, 12]} />}
        material={
          <meshStandardMaterial
            color={CREAM}
            emissive={LANTERN_GLOW}
            emissiveIntensity={1.4}
            roughness={0.6}
          />
        }
        baseScale={(l) => 0.8 + l.significance * 0.65}
        colorFor={(l) => (l.visualLane === 0 ? "#ffe0a8" : LANTERN_GLOW)}
      />
    </group>
  );
}

function NebulaCloud(props: VizProps) {
  return (
    <CommitInstances
      {...props}
      position={posNebula}
      geometry={<sphereGeometry args={[0.11, 6, 6]} />}
      material={<meshBasicMaterial transparent opacity={0.9} />}
      baseScale={(l) => (l.visualLane === 0 ? 1.7 : 0.75 + l.significance * 0.55)}
      colorFor={(l) => (l.visualLane === 0 ? "#ffe4b8" : branchColor(l))}
    />
  );
}

function Helix(props: VizProps) {
  const spinePoints = useMemo(
    () =>
      props.layouts
        .filter((l) => l.visualLane === 0 || l.branchId === 0)
        .sort((a, b) => a.t - b.t)
        .map(posHelix),
    [props.layouts]
  );

  return (
    <group>
      {spinePoints.length >= 2 && (
        <Line
          points={spinePoints}
          color={ACCENT}
          lineWidth={1.8}
          transparent
          opacity={0.75}
        />
      )}
      <CommitInstances
        {...props}
        position={posHelix}
        geometry={<sphereGeometry args={[0.13, 8, 8]} />}
        material={<meshStandardMaterial roughness={0.5} metalness={0.2} />}
        baseScale={(l) => (l.visualLane === 0 ? 1.15 : 0.85)}
      />
    </group>
  );
}

function OrbitalRings(props: VizProps) {
  const rings = useMemo(() => {
    const seen = new Set<number>();
    const out: { y: number; r: number; key: string }[] = [];
    props.layouts.forEach((l) => {
      const laneIndex = Math.floor(l.visualLane);
      if (seen.has(laneIndex)) return;
      seen.add(laneIndex);
      const levels = 10;
      const level = laneIndex % levels;
      const y = ((level / Math.max(1, levels - 1)) - 0.5) * VIZ_HEIGHT;
      const r =
        1.2 +
        Math.floor(laneIndex / levels) * 1.6 +
        (laneIndex % 3) * 0.6 +
        2;
      out.push({ y, r, key: `ring-${laneIndex}` });
    });
    return out;
  }, [props.layouts]);

  return (
    <group>
      {rings.map((ring) => {
        const pts: [number, number, number][] = [];
        const segs = 80;
        for (let i = 0; i <= segs; i++) {
          const a = (i / segs) * Math.PI * 2;
          pts.push([Math.cos(a) * ring.r, ring.y, Math.sin(a) * ring.r]);
        }
        return (
          <Line
            key={ring.key}
            points={pts}
            color={GOLD}
            lineWidth={0.6}
            transparent
            opacity={0.35}
          />
        );
      })}
      <CommitInstances
        {...props}
        position={posOrbital}
        geometry={<sphereGeometry args={[0.14, 8, 8]} />}
        material={
          <meshStandardMaterial
            emissive={GOLD_LIGHT}
            emissiveIntensity={0.45}
            roughness={0.5}
          />
        }
        baseScale={(l) => (l.visualLane === 0 ? 1.15 : 0.82)}
      />
    </group>
  );
}

function CathedralTiers(props: VizProps) {
  const tierBorders = useMemo(() => {
    const floors = 5;
    const out: [number, number, number][][] = [];
    const halfW = VIZ_HALF * 0.85;
    for (let p = 0; p < floors; p++) {
      const y = ((p / (floors - 1)) - 0.5) * VIZ_HEIGHT;
      out.push([
        [-halfW, y, -halfW],
        [halfW, y, -halfW],
        [halfW, y, halfW],
        [-halfW, y, halfW],
        [-halfW, y, -halfW],
      ]);
    }
    return out;
  }, []);

  return (
    <group>
      {tierBorders.map((pts, i) => (
        <Line
          key={`tier-${i}`}
          points={pts}
          color={GOLD}
          lineWidth={0.55}
          transparent
          opacity={0.3}
        />
      ))}
      <CommitInstances
        {...props}
        position={posCathedral}
        geometry={<sphereGeometry args={[0.14, 10, 10]} />}
        material={
          <meshStandardMaterial
            color={CREAM}
            emissive={LANTERN_GLOW}
            emissiveIntensity={0.9}
            roughness={0.55}
          />
        }
        baseScale={(l) => 0.85 + l.significance * 0.55}
      />
    </group>
  );
}

function CrystalLattice(props: VizProps) {
  const guideLines = useMemo(() => {
    const h = VIZ_HALF * 0.95;
    return [
      [[-h, 0, 0], [h, 0, 0]],
      [[0, -h, 0], [0, h, 0]],
      [[0, 0, -h], [0, 0, h]],
    ] as [number, number, number][][];
  }, []);

  return (
    <group>
      {guideLines.map((pts, i) => (
        <Line
          key={`axis-${i}`}
          points={pts}
          color={GOLD}
          lineWidth={0.55}
          transparent
          opacity={0.35}
        />
      ))}
      <CommitInstances
        {...props}
        position={posLattice}
        geometry={<boxGeometry args={[0.2, 0.2, 0.2]} />}
        material={<meshStandardMaterial roughness={0.3} metalness={0.45} />}
        baseScale={() => 1}
      />
    </group>
  );
}

// --- Variant dispatch --------------------------------------------------------

function Viz({ variant, ...props }: VizProps & { variant: VizVariant }) {
  switch (variant) {
    case "constellation":
      return <Constellation {...props} />;
    case "tree":
      return <GrowingTree {...props} />;
    case "lanterns":
      return <LanternProcession {...props} />;
    case "nebula":
      return <NebulaCloud {...props} />;
    case "helix":
      return <Helix {...props} />;
    case "orbital":
      return <OrbitalRings {...props} />;
    case "cathedral":
      return <CathedralTiers {...props} />;
    case "lattice":
      return <CrystalLattice {...props} />;
  }
}

// --- Scene wrapper with lighting + orbit controls ---------------------------

function Scene({
  variant,
  layouts,
  pinnedIdxs,
  hoveredIdx,
  onClick,
  onHover,
}: {
  variant: VizVariant;
  layouts: CommitLayout[];
  pinnedIdxs: number[];
  hoveredIdx: number | null;
  onClick: (idx: number) => void;
  onHover: (idx: number | null) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.55} color={"#fff0d8"} />
      <directionalLight position={[15, 25, 20]} intensity={0.8} color={CREAM} />
      <directionalLight position={[-15, -10, -15]} intensity={0.35} color={"#e07b5f"} />
      <pointLight position={[0, 0, 0]} intensity={0.8} color={GOLD_LIGHT} distance={30} decay={1.4} />
      <Viz
        variant={variant}
        layouts={layouts}
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

// --- Top-level -------------------------------------------------------------

export default function CommitGraph({
  data,
  variant,
}: {
  data: GraphData;
  variant: VizVariant;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pinnedIdxs, setPinnedIdxs] = useState<number[]>([0]);

  const layouts = useMemo(() => prepareLayout(data), [data]);

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
          camera={{ position: [22, 12, 28], fov: 52 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={null}>
            <Scene
              variant={variant}
              layouts={layouts}
              pinnedIdxs={pinnedIdxs}
              hoveredIdx={hoveredIdx}
              onClick={handleClick}
              onHover={setHoveredIdx}
            />
          </Suspense>
          <OrbitControls
            makeDefault
            enablePan={false}
            minDistance={8}
            maxDistance={80}
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
