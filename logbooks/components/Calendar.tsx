"use client";

/*
 * Calendar — GitHub-style contribution heatmap.
 * Each cell is a day, colored by that day's commit count.
 * 7 rows (days of week), N columns (weeks), horizontally scrollable.
 */

import { useMemo, useRef, useCallback, useEffect } from "react";
import {
  GraphData,
prepareLayout,
PHASE_META,
} from "./graphShared";
import {
  useCommitStack,
CommitStack,
HoverTooltip,
} from "./graphSharedClient";

const CELL_SIZE = 22;
const CELL_GAP = 3;
const DAYS_IN_WEEK = 7;

interface DayCell {
  date: string; // YYYY-MM-DD
  day: number; // 0 = Sun, 6 = Sat
  week: number; // week index from start
  count: number;
  topCommitIdx: number | null; // first commit on this day
  phase: number;
}

export default function Calendar({ data }: { data: GraphData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { layouts } = useMemo(() => prepareLayout(data), [data]);
  const { pinnedIdxs, hoveredIdx, setHoveredIdx, handleClick, handleDismiss } =
    useCommitStack(data.commits.length, { initial: [0], stepMode: "stack" });

  // Group commits by date, compute week positions
  const cells: DayCell[] = useMemo(() => {
    const byDate = new Map<string, { count: number; firstIdx: number; phase: number }>();
    for (const l of layouts) {
      const key = l.commit.date.slice(0, 10);
      const existing = byDate.get(key);
      if (existing) {
        existing.count++;
      } else {
        byDate.set(key, { count: 1, firstIdx: l.idx, phase: l.phase });
      }
    }
    // Build date range from oldest to newest
    const dates = Array.from(byDate.keys()).sort();
    if (dates.length === 0) return [];
    const start = new Date(dates[0]);
    const end = new Date(dates[dates.length - 1]);
    // Round start to Sunday so the grid aligns
    const startDayOfWeek = start.getDay();
    start.setDate(start.getDate() - startDayOfWeek);
    const out: DayCell[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10);
      const entry = byDate.get(key);
      const weeksSinceStart = Math.floor(
        (cursor.getTime() - start.getTime()) / (7 * 86400 * 1000)
      );
      out.push({
        date: key,
        day: cursor.getDay(),
        week: weeksSinceStart,
        count: entry?.count ?? 0,
        topCommitIdx: entry?.firstIdx ?? null,
        phase: entry?.phase ?? 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return out;
  }, [layouts]);

  const maxCount = useMemo(
    () => cells.reduce((m, c) => Math.max(m, c.count), 1),
    [cells]
  );

  const weeks = useMemo(
    () => cells.reduce((m, c) => Math.max(m, c.week), 0) + 1,
    [cells]
  );

  // Color intensity helper — warm palette
  function cellColor(count: number): string {
    if (count === 0) return "rgba(181, 138, 62, 0.06)";
    const intensity = Math.log(count + 1) / Math.log(maxCount + 1);
    const opacity = 0.2 + intensity * 0.8;
    return `rgba(196, 80, 58, ${opacity})`;
  }

  // Month markers — for each week, check if it's the first week of a month
  const monthLabels = useMemo(() => {
    const out: { week: number; label: string }[] = [];
    let lastMonth = "";
    cells
      .filter((c) => c.day === 0)
      .forEach((c) => {
        const d = new Date(c.date);
        const month = d.toLocaleString("en-GB", { month: "short" });
        if (month !== lastMonth) {
          out.push({ week: c.week, label: month });
          lastMonth = month;
        }
      });
    return out;
  }, [cells]);

  // Wheel handler
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

  const cellX = (week: number) => week * (CELL_SIZE + CELL_GAP);
  const cellY = (day: number) => day * (CELL_SIZE + CELL_GAP);

  const stageWidth = weeks * (CELL_SIZE + CELL_GAP) + 80;
  const stageHeight = DAYS_IN_WEEK * (CELL_SIZE + CELL_GAP) + 100;

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const hovered = hoveredIdx !== null ? layouts[hoveredIdx].commit : null;

  return (
    <div className="cal-graph">
      <div className="cal-container" ref={containerRef}>
        <div
          className="cal-stage"
          style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}
        >
          {/* Day of week labels */}
          {dayLabels.map((d, i) => (
            <div
              key={d}
              className="cal-day-label"
              style={{
                top: `${cellY(i) + 32}px`,
              }}
            >
              {i % 2 === 1 ? d : ""}
            </div>
          ))}

          {/* Month labels */}
          {monthLabels.map((m) => (
            <div
              key={`${m.label}-${m.week}`}
              className="cal-month-label"
              style={{ left: `${cellX(m.week) + 44}px` }}
            >
              {m.label}
            </div>
          ))}

          {/* Cells */}
          {cells.map((cell) => {
            const isHovered =
              hoveredIdx !== null &&
              layouts[hoveredIdx].commit.date.startsWith(cell.date);
            const isPinned =
              cell.topCommitIdx !== null && pinnedIdxs.includes(cell.topCommitIdx);
            return (
              <button
                key={cell.date}
                type="button"
                className={`cal-cell${isHovered ? " hovered" : ""}${isPinned ? " pinned" : ""}${cell.count === 0 ? " empty" : ""}`}
                style={{
                  left: `${cellX(cell.week) + 44}px`,
                  top: `${cellY(cell.day) + 32}px`,
                  background: cellColor(cell.count),
                }}
                title={`${cell.date}: ${cell.count} commit${cell.count === 1 ? "" : "s"}`}
                onMouseEnter={() =>
                  cell.topCommitIdx !== null && setHoveredIdx(cell.topCommitIdx)
                }
                onMouseLeave={() => setHoveredIdx(null)}
                onClick={() => {
                  if (cell.topCommitIdx !== null) handleClick(cell.topCommitIdx);
                }}
                disabled={cell.topCommitIdx === null}
              />
            );
          })}
        </div>
      </div>

      <div className="cal-legend">
        <span className="cal-legend-label">Less</span>
        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v) => (
          <span
            key={v}
            className="cal-legend-swatch"
            style={{ background: `rgba(196, 80, 58, ${0.06 + v * 0.8})` }}
          />
        ))}
        <span className="cal-legend-label">More</span>
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
