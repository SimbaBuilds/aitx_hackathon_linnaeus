/**
 * WS-F — Codebase pre-scan.
 *
 * Walks a target repo and computes CHEAP static per-module metrics that render
 * as the calibration-cameo heatmap. These metrics are PREDICTORS of where an
 * agent-probe is likely to stall — they are never summed into the headline
 * operability number; the probe (run later by the engine) confirms where they
 * actually light up.
 *
 * Output shape matches fixtures/heatmap.json exactly:
 *   { target, cells: [ { path, loc, cyclomatic, coupling,
 *                        dry_violations, heat, probe_stalled, root_cause_tag } ] }
 *
 * Zero heavy deps — hand-rolled with `fs` + regex. No AST tooling.
 *
 * CLI:  npx tsx prescan/scan.ts [root]   (writes JSON to stdout)
 */

import { promises as fs } from "fs";
import * as path from "path";

// ---- Output types (mirror fixtures/heatmap.json) --------------------------

export interface HeatmapCell {
  path: string;
  loc: number;
  cyclomatic: number;
  coupling: number;
  dry_violations: number;
  heat: number; // 0..1, color only
  probe_stalled: string | null; // filled post-probe by the engine
  root_cause_tag: string; // "none" at scan time
}

export interface HeatmapData {
  target: string;
  cells: HeatmapCell[];
}

// ---- Config ---------------------------------------------------------------

const DEFAULT_ROOT =
  process.env.REPO_PATH || "/Users/cameronhightower/Software_Projects/SKMD";

const SOURCE_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
]);

const SKIP_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  "dist",
  "build",
  "out",
  "venv",
  ".venv",
  "__pycache__",
  ".pytest_cache",
  "logs",
  "temp_docs",
  "coverage",
  "playwright-report",
  ".playwright-mcp",
  "test-results",
  ".turbo",
  "public",
]);

// Keep the board demo-sized: cap the number of cells and drop trivial ones.
const MAX_CELLS = 26;
const MIN_CELL_LOC = 40;

// ---- Per-file cheap metrics ----------------------------------------------

interface FileMetrics {
  loc: number;
  cyclomatic: number;
  coupling: number;
  lines: string[]; // normalized non-trivial lines, for DRY proxy
}

// Decision-point tokens for approximate cyclomatic complexity.
const DECISION_RE =
  /\b(if|for|while|case|elif|catch|and|or|except)\b|&&|\|\||\?\.|(?<![=!<>])\?(?!\.)/g;

// import / require / from-import statements → coupling.
const IMPORT_RE =
  /^\s*(?:import\b|from\s+\S+\s+import\b|(?:const|let|var)\s+.*=\s*require\s*\()/;

function analyzeSource(src: string): FileMetrics {
  const rawLines = src.split(/\r?\n/);
  let loc = 0;
  let cyclomatic = 1; // base path
  let coupling = 0;
  const normLines: string[] = [];

  for (const raw of rawLines) {
    const line = raw.trim();
    if (line === "") continue;
    // Skip pure comment lines from LOC + DRY (cheap, language-agnostic).
    if (
      line.startsWith("//") ||
      line.startsWith("#") ||
      line.startsWith("*") ||
      line.startsWith("/*")
    ) {
      continue;
    }
    loc++;

    if (IMPORT_RE.test(line)) coupling++;

    const matches = line.match(DECISION_RE);
    if (matches) cyclomatic += matches.length;

    // Normalize for DRY: collapse whitespace + strip string/number literals so
    // structurally-identical lines collide.
    const norm = line
      .replace(/["'`][^"'`]*["'`]/g, "S")
      .replace(/\b\d+(\.\d+)?\b/g, "N")
      .replace(/\s+/g, " ");
    if (norm.length >= 12) normLines.push(norm); // ignore trivial lines like "})"
  }

  return { loc, cyclomatic, coupling, lines: normLines };
}

// DRY proxy: number of "extra" occurrences of a normalized line within a cell
// (each duplicate beyond the first counts once). Cheap stand-in for copy-paste.
function dryViolations(lines: string[]): number {
  const counts = new Map<string, number>();
  for (const l of lines) counts.set(l, (counts.get(l) || 0) + 1);
  let dupes = 0;
  for (const n of counts.values()) if (n > 1) dupes += n - 1;
  return dupes;
}

// ---- Walk -----------------------------------------------------------------

async function walk(dir: string, files: string[]): Promise<void> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      // Skip hidden dirs (.git, .claude, .next, nested worktrees) and known noise.
      if (e.name.startsWith(".") || SKIP_DIRS.has(e.name)) continue;
      await walk(path.join(dir, e.name), files);
    } else if (e.isFile()) {
      if (SOURCE_EXT.has(path.extname(e.name))) {
        files.push(path.join(dir, e.name));
      }
    }
  }
}

// Aggregation granularity: bucket each file by its ancestor directory two
// levels below the repo root (e.g. skmd_fastapi/scripts), or one level if the
// file sits directly under a top-level module. Keeps cells module-sized.
function cellKeyFor(rel: string): string {
  const parts = rel.split(path.sep);
  if (parts.length <= 1) return ".";
  if (parts.length === 2) return parts[0];
  return parts.slice(0, 2).join("/");
}

// ---- Scan -----------------------------------------------------------------

export async function scanRepo(root: string = DEFAULT_ROOT): Promise<HeatmapData> {
  const absRoot = path.resolve(root);
  const files: string[] = [];
  await walk(absRoot, files);

  interface Agg {
    loc: number;
    cyclomatic: number;
    coupling: number;
    lines: string[];
    fileCount: number;
  }
  const buckets = new Map<string, Agg>();

  for (const abs of files) {
    let src: string;
    try {
      src = await fs.readFile(abs, "utf8");
    } catch {
      continue;
    }
    const m = analyzeSource(src);
    const rel = path.relative(absRoot, abs);
    const key = cellKeyFor(rel);
    let agg = buckets.get(key);
    if (!agg) {
      agg = { loc: 0, cyclomatic: 0, coupling: 0, lines: [], fileCount: 0 };
      buckets.set(key, agg);
    }
    agg.loc += m.loc;
    agg.cyclomatic += m.cyclomatic;
    agg.coupling += m.coupling;
    agg.fileCount++;
    // Cap retained lines per bucket so DRY stays cheap on huge modules.
    if (agg.lines.length < 20000) agg.lines.push(...m.lines);
  }

  // Materialize raw cells, drop trivial buckets, keep the largest MAX_CELLS.
  interface Raw {
    path: string;
    loc: number;
    cyclomatic: number;
    coupling: number;
    dry_violations: number;
  }
  let raw: Raw[] = [];
  for (const [key, agg] of buckets) {
    if (agg.loc < MIN_CELL_LOC) continue;
    raw.push({
      path: key,
      loc: agg.loc,
      cyclomatic: agg.cyclomatic,
      coupling: agg.coupling,
      dry_violations: dryViolations(agg.lines),
    });
  }
  raw.sort((a, b) => b.loc - a.loc);
  raw = raw.slice(0, MAX_CELLS);

  // ---- Heat formula ------------------------------------------------------
  // Metrics are PREDICTORS, blended ONLY for color (0..1). Never a headline.
  //
  //   density = cyclomatic / loc      (complexity per line — the real signal;
  //                                     big files aren't hot just for being big)
  //   coupling, dry                    (fan-in of dependencies, copy-paste)
  //
  // Each of {density, coupling, dry} is min-max normalized across the scanned
  // cells, then blended:  heat = 0.5*density + 0.3*coupling + 0.2*dry.
  // Complexity density dominates because tangled logic is the strongest
  // predictor of where a probe stalls; coupling and DRY are supporting hints.
  const densities = raw.map((c) => (c.loc > 0 ? c.cyclomatic / c.loc : 0));
  const coup = raw.map((c) => c.coupling);
  const dry = raw.map((c) => c.dry_violations);

  const norm = (v: number, arr: number[]): number => {
    const lo = Math.min(...arr);
    const hi = Math.max(...arr);
    if (hi - lo < 1e-9) return 0;
    return (v - lo) / (hi - lo);
  };

  const cells: HeatmapCell[] = raw.map((c, i) => {
    const heat =
      0.5 * norm(densities[i], densities) +
      0.3 * norm(coup[i], coup) +
      0.2 * norm(dry[i], dry);
    return {
      path: c.path,
      loc: c.loc,
      cyclomatic: c.cyclomatic,
      coupling: c.coupling,
      dry_violations: c.dry_violations,
      heat: Math.round(Math.min(1, Math.max(0, heat)) * 100) / 100,
      probe_stalled: null, // engine fills post-probe
      root_cause_tag: "none", // engine fills post-probe
    };
  });

  // Present hottest-first — nice for the board.
  cells.sort((a, b) => b.heat - a.heat);

  return { target: path.basename(absRoot), cells };
}

// ---- CLI ------------------------------------------------------------------

async function main(): Promise<void> {
  const root = process.argv[2] || DEFAULT_ROOT;
  const data = await scanRepo(root);
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

// Run when invoked directly (tsx / node), not when imported.
const invokedDirectly =
  typeof process.argv[1] === "string" &&
  /prescan[\\/]scan\.(ts|js|mjs|cjs)$/.test(process.argv[1]);
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
