/*
 * graphShared — types, layout preparation, constants.
 * Pure data module. Importable by both server and client components.
 * Client-side hooks and JSX components live in graphSharedClient.tsx.
 */

// --- Types -----------------------------------------------------------------

export interface Commit {
  short: string;
  author: string;
  date: string;
  message: string;
  refs: string[];
  lane: number;
}

export interface Connection {
  from: number;
  to: number;
  fromLane: number;
  toLane: number;
}

export interface GraphData {
  totalCommits: number;
  maxLane: number;
  dates: string[];
  commits: Commit[];
  connections: Connection[];
}

export interface Layout {
  idx: number;
  commit: Commit;
  visualLane: number;
  branchId: number;
  /** 0 = oldest, 1 = newest */
  t: number;
  /** 1 = main branch, lower = less significant */
  significance: number;
  /** 0..4 — which of the five phases the commit belongs to */
  phase: number;
}

export interface BranchInfo {
  lane: number;
  startT: number;
  endT: number;
  count: number;
  side: 1 | -1;
  reach: number;
}

export interface PhaseInfo {
  index: number;
  startT: number;
  endT: number;
  centerT: number;
  count: number;
  firstIdx: number;
  lastIdx: number;
}

// --- Phase + branch metadata -----------------------------------------------

export const PHASE_COUNT = 5;

export const PHASE_META = [
  {
    numeral: "0",
    name: "Prologue",
    title: "Before the Plan",
    desc:
      "Fourteen days of prose, two Python rewrites, a 4-out-of-10 self-review, and an admiral.md that grew to 1,161 lines overnight.",
  },
  {
    numeral: "I",
    name: "Act I",
    title: "The Great Restructuring",
    desc:
      "One day. The governance hooks firing on their own work; the overhaul deleting 13,642 lines; the decision to start over.",
  },
  {
    numeral: "II",
    name: "Act II",
    title: "The March Through Phases 0 to 8",
    desc:
      "Eight days. Phase 0 built the gatekeepers. Phases 1 through 8 built the framework. The trunk reached the canopy.",
  },
  {
    numeral: "III",
    name: "Act III",
    title: "The Mid-Plan Expansion",
    desc:
      "Two days. The roadmap rewrote itself mid-flight. Phases 9 through 14 appeared as the train was already moving.",
  },
  {
    numeral: "IV",
    name: "Act IV",
    title: "The Burn-Down",
    desc:
      "Five days. Phase 11 in sixty-four minutes. The last commit. The cleanup. The log closed.",
  },
];

export const BRANCH_COLORS = [
  "#c4503a",
  "#b58a3e",
  "#7a4e2a",
  "#9e4a66",
  "#4a6e45",
  "#2e5a6e",
  "#8a5a1e",
  "#5a4a82",
];

export function branchColor(lane: number): string {
  if (lane === 0) return "#c4503a";
  return BRANCH_COLORS[lane % BRANCH_COLORS.length];
}

export const REPO_URL = "https://github.com/seandonn-boston/helm";

// --- Data preparation ------------------------------------------------------

export function prepareLayout(data: GraphData): {
  layouts: Layout[];
  branches: Map<number, BranchInfo>;
  phases: PhaseInfo[];
} {
  const commits = data.commits;
  const n = commits.length;

  const laneCounts = new Map<number, number>();
  commits.forEach((c) =>
    laneCounts.set(c.lane, (laneCounts.get(c.lane) || 0) + 1)
  );

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

  let ephNext = significantLanes.length;
  const layouts: Layout[] = commits.map((c, i) => {
    let visualLane: number;
    const direct = laneToVisual.get(c.lane);
    if (direct !== undefined) {
      visualLane = direct;
    } else {
      const parentLane = firstParent.get(i);
      const parentVisual =
        parentLane !== undefined ? laneToVisual.get(parentLane) : undefined;
      visualLane =
        parentVisual !== undefined ? parentVisual + 0.5 : ephNext++;
    }
    const t = 1 - i / Math.max(1, n - 1);
    const laneCount = laneCounts.get(c.lane) ?? 1;
    const significance = c.lane === 0 ? 1 : Math.min(0.85, laneCount / 40);
    const phase = Math.max(
      0,
      Math.min(PHASE_COUNT - 1, Math.floor(t * (PHASE_COUNT - 0.001)))
    );
    return {
      idx: i,
      commit: c,
      visualLane,
      branchId: c.lane,
      t,
      significance,
      phase,
    };
  });

  // Branches
  const byLane = new Map<number, Layout[]>();
  layouts.forEach((l) => {
    const key = Math.floor(l.visualLane);
    if (!byLane.has(key)) byLane.set(key, []);
    byLane.get(key)!.push(l);
  });

  const branches = new Map<number, BranchInfo>();
  let sideCounter = 0;
  [...byLane.keys()]
    .sort((a, b) => a - b)
    .forEach((lane) => {
      const arr = byLane.get(lane)!;
      const startT = Math.min(...arr.map((l) => l.t));
      const endT = Math.max(...arr.map((l) => l.t));
      const count = arr.length;
      const side: 1 | -1 =
        lane === 0 ? 1 : sideCounter++ % 2 === 0 ? -1 : 1;
      const reach = lane === 0 ? 0 : Math.min(220, 30 + Math.sqrt(count) * 24);
      branches.set(lane, { lane, startT, endT, count, side, reach });
    });

  // Phases
  const phases: PhaseInfo[] = Array.from({ length: PHASE_COUNT }, (_, p) => {
    const startT = p / PHASE_COUNT;
    const endT = (p + 1) / PHASE_COUNT;
    const centerT = (startT + endT) / 2;
    const phaseCommits = layouts.filter((l) => l.phase === p);
    const count = phaseCommits.length;
    const firstIdx = phaseCommits.length
      ? phaseCommits[phaseCommits.length - 1].idx
      : 0;
    const lastIdx = phaseCommits.length ? phaseCommits[0].idx : 0;
    return { index: p, startT, endT, centerT, count, firstIdx, lastIdx };
  });

  return { layouts, branches, phases };
}

export function ease(x: number): number {
  return 1 - Math.pow(1 - x, 2.3);
}

// --- Variant metadata for the gallery index --------------------------------

export interface VariantMeta {
  slug: string;
  numeral: string;
  name: string;
  tagline: string;
  description: string;
}

export const VARIANTS: VariantMeta[] = [
  {
    slug: "horizontal",
    numeral: "I",
    name: "Horizontal Trunk",
    tagline: "The reference implementation",
    description:
      "Trunk runs left-to-right. Branches above and below. Hero cards per phase, note cards for tagged commits, minimap, activity heatmap, drag-to-pan, dual wheel input.",
  },
  {
    slug: "vertical",
    numeral: "II",
    name: "Vertical Trunk",
    tagline: "Scroll the page, move through time",
    description:
      "Trunk runs top-to-bottom. Branches left and right. Native page scroll drives everything. No wheel hijacking.",
  },
  {
    slug: "spiral",
    numeral: "III",
    name: "Spiral Rose",
    tagline: "The history as a golden spiral",
    description:
      "1,242 commits arranged on an Archimedean spiral. Oldest at center, newest at rim. Drag to rotate the rose.",
  },
  {
    slug: "ribbon",
    numeral: "IV",
    name: "Ribbon",
    tagline: "An S-curve weaving through time",
    description:
      "Commits flow along a single sinuous ribbon that weaves up and down across the viewport. Horizontal scroll moves along the ribbon.",
  },
  {
    slug: "slideshow",
    numeral: "V",
    name: "Slideshow",
    tagline: "One phase per full viewport",
    description:
      "Five full-viewport slides, one per phase. CSS scroll-snap carries you between them with big typography and phase statistics.",
  },
  {
    slug: "calendar",
    numeral: "VI",
    name: "Calendar Heatmap",
    tagline: "Every day as a cell",
    description:
      "Fifty-two days as a grid. Each cell is a day, colored by commit count. Horizontal scroll through weeks.",
  },
  {
    slug: "cards",
    numeral: "VII",
    name: "Card Gallery",
    tagline: "Every tagged commit as a physical card",
    description:
      "A horizontal rolodex of physical-looking porcelain cards, one per tagged commit. Snap-scroll from one card to the next.",
  },
  {
    slug: "terrain",
    numeral: "VIII",
    name: "Elevation",
    tagline: "The project as a mountain range",
    description:
      "Commit density rendered as a terrain profile. Busy days are peaks, quiet days are valleys. Scroll horizontally across the landscape.",
  },
  {
    slug: "constellation",
    numeral: "IX",
    name: "Constellation Map",
    tagline: "Commits as a star field in a dark room",
    description:
      "Dark warm background, commits as luminous points, branches as faint star-connecting lines. Pan both axes, zoom in to inspect.",
  },
  {
    slug: "typographic",
    numeral: "X",
    name: "Typographic Flow",
    tagline: "The log as prose",
    description:
      "Pure text experiment. Commit messages render as Baskerville lines flowing past as you scroll, each phase a chapter break.",
  },
];
