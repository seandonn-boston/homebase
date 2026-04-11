"use client";

/*
 * CanvasTimeline — horizontal scrolling timeline rendered on a plain
 * HTML Canvas 2D surface. No three.js, no WebGL, no libraries.
 *
 * Each branch gets its own horizontal lane. Commits are dots. Lane
 * rails are thin colored lines between sequential commits on the
 * same branch. Time runs left to right, newest on the right.
 *
 * Interaction: mouse drag pans, wheel zooms, click pins a commit to
 * the shared detail stack, esc clears.
 */

import {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

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

const REPO_URL = "https://github.com/seandonn-boston/helm";

// --- Layout --------------------------------------------------------------

interface Layout {
  idx: number;
  commit: Commit;
  visualLane: number;
  branchId: number;
  t: number;
}

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

function branchColor(lane: number): string {
  if (lane === 0) return "#c4503a";
  return BRANCH_COLORS[lane % BRANCH_COLORS.length];
}

function prepareLayout(data: GraphData): {
  layouts: Layout[];
  laneCount: number;
} {
  const laneCounts = new Map<number, number>();
  data.commits.forEach((c) => laneCounts.set(c.lane, (laneCounts.get(c.lane) || 0) + 1));

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
  const layouts: Layout[] = data.commits.map((c, i) => {
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
    const t = 1 - i / Math.max(1, data.commits.length - 1);
    return { idx: i, commit: c, visualLane, branchId: c.lane, t };
  });

  const uniqueLanes = Array.from(new Set(layouts.map((l) => Math.floor(l.visualLane))));
  return { layouts, laneCount: uniqueLanes.length };
}

// --- Canvas renderer -----------------------------------------------------

interface RenderState {
  commitW: number; // pixels per commit
  laneH: number; // pixels per lane
  padLeft: number;
  padTop: number;
  scrollX: number;
}

const DEFAULT_STATE: RenderState = {
  commitW: 8,
  laneH: 22,
  padLeft: 40,
  padTop: 40,
  scrollX: 0,
};

// --- Stack card (same shape) ---------------------------------------------

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

// --- Main component ------------------------------------------------------

export default function CanvasTimeline({ data }: { data: GraphData }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<RenderState>({ ...DEFAULT_STATE });
  const hoveredRef = useRef<number | null>(null);
  const pinnedRef = useRef<number[]>([0]);
  const dprRef = useRef(1);
  const dragRef = useRef<{ startX: number; startScroll: number } | null>(null);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pinnedIdxs, setPinnedIdxs] = useState<number[]>([0]);

  useEffect(() => {
    hoveredRef.current = hoveredIdx;
  }, [hoveredIdx]);
  useEffect(() => {
    pinnedRef.current = pinnedIdxs;
  }, [pinnedIdxs]);

  const { layouts, laneCount } = useMemo(() => prepareLayout(data), [data]);

  // Determine total content width
  const totalWidth = useMemo(() => {
    return DEFAULT_STATE.padLeft * 2 + data.commits.length * DEFAULT_STATE.commitW;
  }, [data.commits.length]);

  // --- Draw -------------------------------------------------------------

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { commitW, laneH, padLeft, padTop, scrollX } = stateRef.current;
    const dpr = dprRef.current;
    const widthCss = wrap.clientWidth;
    const heightCss = wrap.clientHeight;
    canvas.width = widthCss * dpr;
    canvas.height = heightCss * dpr;
    canvas.style.width = `${widthCss}px`;
    canvas.style.height = `${heightCss}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, widthCss, heightCss);

    // Time runs left (oldest) to right (newest).
    // commit idx 0 is newest, so we flip: x = padLeft + (n - 1 - idx) * commitW - scrollX
    const n = layouts.length;
    function xForIdx(i: number) {
      return padLeft + (n - 1 - i) * commitW - scrollX;
    }
    function yForLane(lane: number) {
      return padTop + Math.floor(lane) * laneH + laneH / 2;
    }

    // --- Phase shading (5 vertical bands) ---
    const bandsStart = 0;
    const bandsEnd = n - 1;
    const phases = 5;
    for (let p = 0; p < phases; p++) {
      const t0 = p / phases;
      const t1 = (p + 1) / phases;
      const i0 = Math.floor(bandsStart + (1 - t1) * (bandsEnd - bandsStart));
      const i1 = Math.floor(bandsStart + (1 - t0) * (bandsEnd - bandsStart));
      const x0 = xForIdx(i1);
      const x1 = xForIdx(i0);
      ctx.fillStyle =
        p % 2 === 0 ? "rgba(196, 80, 58, 0.04)" : "rgba(181, 138, 62, 0.04)";
      ctx.fillRect(x0, padTop - 8, x1 - x0, laneH * (laneCount + 1));
    }

    // --- Lane horizontal rails ---
    ctx.strokeStyle = "rgba(106, 87, 74, 0.12)";
    ctx.lineWidth = 1;
    for (let lane = 0; lane < laneCount; lane++) {
      const y = yForLane(lane);
      ctx.beginPath();
      ctx.moveTo(padLeft - 10, y);
      ctx.lineTo(widthCss - padLeft, y);
      ctx.stroke();
    }

    // --- Branch connecting lines ---
    const byLane = new Map<number, Layout[]>();
    layouts.forEach((l) => {
      const key = Math.floor(l.visualLane);
      if (!byLane.has(key)) byLane.set(key, []);
      byLane.get(key)!.push(l);
    });

    byLane.forEach((arr, lane) => {
      if (arr.length < 2) return;
      const sorted = arr.slice().sort((a, b) => a.t - b.t);
      ctx.strokeStyle = branchColor(lane);
      ctx.globalAlpha = lane === 0 ? 0.7 : 0.38;
      ctx.lineWidth = lane === 0 ? 2 : 1.2;
      ctx.beginPath();
      let started = false;
      sorted.forEach((l) => {
        const x = xForIdx(l.idx);
        const y = yForLane(lane);
        if (x < -40 || x > widthCss + 40) {
          started = false;
          return;
        }
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    // --- Commit dots ---
    const pinnedSet = new Set(pinnedRef.current);
    const hovered = hoveredRef.current;

    for (const l of layouts) {
      const x = xForIdx(l.idx);
      if (x < -20 || x > widthCss + 20) continue;
      const lane = Math.floor(l.visualLane);
      const y = yForLane(lane);
      const isPinned = pinnedSet.has(l.idx);
      const isHovered = hovered === l.idx;
      const isMain = lane === 0;
      const baseR = isMain ? 3.6 : 2.6;
      const r = isHovered ? baseR * 2 : isPinned ? baseR * 1.7 : baseR;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = branchColor(lane);
      ctx.fill();
      if (isMain || isPinned || isHovered) {
        ctx.strokeStyle = "#fffaf2";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // --- Axis labels (month marks) ---
    ctx.fillStyle = "#9c8674";
    ctx.font = "10px JetBrains Mono, Consolas, monospace";
    ctx.textAlign = "center";
    let lastMonth = "";
    for (let i = layouts.length - 1; i >= 0; i -= 1) {
      const d = layouts[i].commit.date.slice(0, 7);
      if (d !== lastMonth) {
        const x = xForIdx(i);
        if (x > 20 && x < widthCss - 20) {
          const label = new Date(layouts[i].commit.date).toLocaleDateString("en-GB", {
            month: "short",
            day: "numeric",
          });
          ctx.fillText(label, x, padTop - 14);
        }
        lastMonth = d;
      }
    }
  }, [layouts, laneCount]);

  // --- Hit testing ------------------------------------------------------

  const hitTest = useCallback(
    (clientX: number, clientY: number): number | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      const { commitW, laneH, padLeft, padTop, scrollX } = stateRef.current;
      const n = layouts.length;
      // Reverse x mapping
      const scrolled = mx + scrollX - padLeft;
      const idxFromLeft = Math.round(scrolled / commitW);
      const idx = n - 1 - idxFromLeft;
      if (idx < 0 || idx >= n) return null;
      const lane = Math.floor((my - padTop) / laneH);
      const l = layouts[idx];
      if (Math.floor(l.visualLane) !== lane) {
        // Try adjacent lanes for tolerance
        for (let d = -1; d <= 1; d++) {
          if (d === 0) continue;
          const alt = Math.floor(l.visualLane);
          if (alt === lane + d) return l.idx;
        }
        // Also check commit at idx ±1 for horizontal tolerance
        for (let dd = -1; dd <= 1; dd++) {
          if (dd === 0) continue;
          const altIdx = idx + dd;
          if (altIdx < 0 || altIdx >= n) continue;
          const alt = layouts[altIdx];
          if (Math.floor(alt.visualLane) === lane) {
            const altX =
              padLeft + (n - 1 - altIdx) * commitW - scrollX;
            const altY = padTop + Math.floor(alt.visualLane) * laneH + laneH / 2;
            const dx = altX - mx;
            const dy = altY - my;
            if (dx * dx + dy * dy < 36) return alt.idx;
          }
        }
        return null;
      }
      return l.idx;
    },
    [layouts]
  );

  // --- Event handlers ---------------------------------------------------

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (dragRef.current) {
        const dx = e.clientX - dragRef.current.startX;
        stateRef.current.scrollX = Math.max(
          0,
          Math.min(
            totalWidth - (wrapRef.current?.clientWidth ?? 0),
            dragRef.current.startScroll - dx
          )
        );
        draw();
        return;
      }
      const hit = hitTest(e.clientX, e.clientY);
      if (hit !== hoveredRef.current) {
        setHoveredIdx(hit);
      }
    },
    [draw, hitTest, totalWidth]
  );

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      startX: e.clientX,
      startScroll: stateRef.current.scrollX,
    };
    if (canvasRef.current) canvasRef.current.style.cursor = "grabbing";
  }, []);

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const wasDragging =
        dragRef.current &&
        Math.abs(e.clientX - dragRef.current.startX) > 4;
      dragRef.current = null;
      if (canvasRef.current) canvasRef.current.style.cursor = "grab";
      if (wasDragging) return;
      const hit = hitTest(e.clientX, e.clientY);
      if (hit !== null) {
        setPinnedIdxs((curr) => {
          if (curr[0] === hit) return curr.slice(1);
          return [hit, ...curr.filter((i) => i !== hit)];
        });
      }
    },
    [hitTest]
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // zoom
        const delta = e.deltaY > 0 ? 0.92 : 1.08;
        stateRef.current.commitW = Math.max(
          2,
          Math.min(24, stateRef.current.commitW * delta)
        );
      } else {
        // horizontal scroll
        stateRef.current.scrollX = Math.max(
          0,
          Math.min(
            totalWidth - (wrapRef.current?.clientWidth ?? 0),
            stateRef.current.scrollX + e.deltaY + e.deltaX
          )
        );
      }
      draw();
    },
    [draw, totalWidth]
  );

  const handleDismiss = useCallback((idx: number) => {
    setPinnedIdxs((curr) => curr.filter((i) => i !== idx));
  }, []);

  // Mount: size + initial draw + wheel listener
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    dprRef.current = window.devicePixelRatio || 1;
    draw();
    const onResize = () => draw();
    window.addEventListener("resize", onResize);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [draw, handleWheel]);

  // Redraw on interaction-state change
  useEffect(() => {
    draw();
  }, [draw, hoveredIdx, pinnedIdxs]);

  // Keyboard
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
      else if (e.key === "Escape") {
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
      <div className="canvas-timeline-wrap" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          className="canvas-timeline"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            dragRef.current = null;
            setHoveredIdx(null);
          }}
          style={{ cursor: "grab" }}
        />
      </div>

      <div className="cube-hint">
        Pure HTML Canvas &middot; drag to pan &middot; ctrl+scroll to zoom &middot; click a commit to pin
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
