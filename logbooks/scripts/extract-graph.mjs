#!/usr/bin/env node
/**
 * extract-graph.mjs
 *
 * Reads the git log and outputs a JSON file with commit data and
 * compacted lane assignments for the horizontal commit graph.
 *
 * Usage: node logbooks/scripts/extract-graph.mjs
 * Output: logbooks/app/graph/data.json
 */

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../..");
const OUTPUT = resolve(__dirname, "../app/graph/data.json");

// --- Extract raw git data ---------------------------------------------------

const SEP = "†††";
const FORMAT = ["%H", "%h", "%P", "%an", "%aI", "%s", "%D"].join(SEP);

const raw = execSync(`git log --all --topo-order --format="${FORMAT}"`, {
  cwd: REPO_ROOT,
  encoding: "utf-8",
  maxBuffer: 50 * 1024 * 1024,
});

const commits = raw
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    const parts = line.split(SEP);
    const [hash, short, parents, author, date] = parts;
    const refs = parts[parts.length - 1];
    const message = parts.slice(5, parts.length - 1).join(SEP);
    return {
      hash,
      short,
      parents: parents ? parents.split(" ") : [],
      author,
      date,
      message: message || "",
      refs: refs
        ? refs
            .split(",")
            .map((r) => r.trim())
            .filter(Boolean)
        : [],
    };
  });

// --- Assign lanes with reuse ------------------------------------------------
// Process commits in topo order. Lanes are reused as soon as they're freed.

const lanes = []; // lanes[i] = hash that lane i is waiting for, or null if free

function findLane(hash) {
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i] === hash) return i;
  }
  return -1;
}

function freeLaneSlot() {
  for (let i = 0; i < lanes.length; i++) {
    if (lanes[i] === null) return i;
  }
  return lanes.length;
}

for (const c of commits) {
  let lane = findLane(c.hash);

  if (lane === -1) {
    lane = freeLaneSlot();
    if (lane === lanes.length) lanes.push(null);
  }

  c.lane = lane;

  // First parent continues in same lane
  if (c.parents.length > 0) {
    lanes[lane] = c.parents[0];
  } else {
    lanes[lane] = null;
  }

  // Additional parents get their own lanes if not already tracked
  for (let p = 1; p < c.parents.length; p++) {
    const parentHash = c.parents[p];
    if (findLane(parentHash) === -1) {
      const slot = freeLaneSlot();
      if (slot === lanes.length) lanes.push(null);
      lanes[slot] = parentHash;
    }
  }
}

// --- Compact lanes ----------------------------------------------------------
// Remap sparse lane numbers to a compact 0..N range.

const usedLanes = [...new Set(commits.map((c) => c.lane))].sort(
  (a, b) => a - b
);
const laneMap = new Map();
usedLanes.forEach((l, i) => laneMap.set(l, i));

for (const c of commits) {
  c.lane = laneMap.get(c.lane);
}

const maxLane = usedLanes.length - 1;

// --- Build connections -------------------------------------------------------

const hashToIdx = new Map();
commits.forEach((c, i) => hashToIdx.set(c.hash, i));

const connections = [];
for (let i = 0; i < commits.length; i++) {
  const c = commits[i];
  for (const parentHash of c.parents) {
    const parentIdx = hashToIdx.get(parentHash);
    if (parentIdx === undefined) continue;
    connections.push({
      from: i,
      to: parentIdx,
      fromLane: c.lane,
      toLane: commits[parentIdx].lane,
    });
  }
}

// --- Date ranges for axis labels --------------------------------------------

const dates = commits.map((c) => c.date.slice(0, 10));
const uniqueDates = [...new Set(dates)];

// --- Output ------------------------------------------------------------------

const output = {
  totalCommits: commits.length,
  maxLane,
  dates: uniqueDates,
  commits: commits.map((c) => ({
    short: c.short,
    author: c.author,
    date: c.date,
    message: c.message,
    refs: c.refs,
    lane: c.lane,
  })),
  connections,
};

writeFileSync(OUTPUT, JSON.stringify(output));
console.log(
  `Extracted ${output.totalCommits} commits, ${maxLane + 1} lanes, ${connections.length} connections → ${OUTPUT}`
);
