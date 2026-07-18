// ─────────────────────────────────────────────────────────────────────────────
// Surface: repo (read-only local filesystem checkout of the target repo).
// Rooted at process.env.REPO_PATH (default the local SKMD checkout).  Every path
// is resolved and asserted to stay inside the root — no traversal escapes.
// Tools: repo_read, repo_list, repo_grep.  Missing/absent → { ok:false }.
// ─────────────────────────────────────────────────────────────────────────────

import { promises as fs, existsSync, statSync } from "node:fs";
import * as path from "node:path";
import type { SurfaceTool, SurfaceToolResult } from "@/lib/surfaces";
import { asInt, asString, failed } from "./util";

const DEFAULT_REPO = "/Users/cameronhightower/Software_Projects/SKMD";

// Dirs we never descend into for listing/grep (noise + huge).
const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "build",
  ".playwright-mcp",
  ".turbo",
  "coverage",
]);

const MAX_FILE_BYTES = 512 * 1024; // 512KB read cap
const GREP_MAX_FILES = 4000; // files scanned per grep
const GREP_MAX_RESULTS = 100; // hits returned per grep
const GREP_MAX_FILE_BYTES = 256 * 1024; // skip files bigger than this in grep

function repoRoot(): string {
  return path.resolve(process.env.REPO_PATH || DEFAULT_REPO);
}

/**
 * Resolve a repo-relative path and assert it stays within root.
 * Returns the absolute path, or null if it escapes / is absolute-outside.
 */
function safeResolve(root: string, rel: string): string | null {
  // Reject absolute inputs outright; force everything to be root-relative.
  const cleaned = rel.replace(/^\/+/, "");
  const abs = path.resolve(root, cleaned);
  if (abs !== root && !abs.startsWith(root + path.sep)) return null;
  return abs;
}

const repoRead: SurfaceTool = {
  name: "repo_read",
  surface: "repo",
  description:
    "Read the full text of a single file in the target repo by repo-relative path (e.g. 'package.json' or 'src/app/page.tsx').",
  schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Repo-relative path to the file." },
    },
    required: ["path"],
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const rel = asString(args.path);
    if (!rel) return failed("missing 'path' argument");
    const root = repoRoot();
    const abs = safeResolve(root, rel);
    if (!abs) return failed(`path escapes repo root: ${rel}`);
    try {
      const stat = await fs.stat(abs);
      if (stat.isDirectory()) return failed(`'${rel}' is a directory — use repo_list`);
      if (stat.size > MAX_FILE_BYTES)
        return failed(`file too large (${stat.size} bytes, cap ${MAX_FILE_BYTES})`);
      const text = await fs.readFile(abs, "utf8");
      return { ok: true, data: { path: rel, bytes: stat.size, text } };
    } catch {
      return { ok: false, data: null, note: `file not found: ${rel}` };
    }
  },
};

const repoList: SurfaceTool = {
  name: "repo_list",
  surface: "repo",
  description:
    "List the entries (files and subdirectories) of a directory in the target repo. Pass '' or '.' for the repo root.",
  schema: {
    type: "object",
    properties: {
      path: { type: "string", description: "Repo-relative directory path. Default repo root." },
    },
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const rel = asString(args.path) ?? ".";
    const root = repoRoot();
    const abs = safeResolve(root, rel === "." ? "" : rel);
    if (!abs) return failed(`path escapes repo root: ${rel}`);
    try {
      const stat = await fs.stat(abs);
      if (!stat.isDirectory()) return failed(`'${rel}' is not a directory — use repo_read`);
      const entries = await fs.readdir(abs, { withFileTypes: true });
      const items = entries
        .map((e) => ({ name: e.name, type: e.isDirectory() ? "dir" : "file" }))
        .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
      return { ok: true, data: { path: rel, count: items.length, entries: items } };
    } catch {
      return { ok: false, data: null, note: `directory not found: ${rel}` };
    }
  },
};

async function* walk(dir: string): AsyncGenerator<string> {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      yield* walk(path.join(dir, e.name));
    } else if (e.isFile()) {
      yield path.join(dir, e.name);
    }
  }
}

const repoGrep: SurfaceTool = {
  name: "repo_grep",
  surface: "repo",
  description:
    "Search the target repo for a literal (case-insensitive) string across text files. Returns capped file:line matches.",
  schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Literal substring to search for." },
      max_results: { type: "number", description: `Max hits to return (cap ${GREP_MAX_RESULTS}).` },
    },
    required: ["query"],
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const query = asString(args.query);
    if (!query) return failed("missing 'query' argument");
    const cap = asInt(args.max_results, GREP_MAX_RESULTS, GREP_MAX_RESULTS);
    const root = repoRoot();
    const needle = query.toLowerCase();
    const hits: Array<{ path: string; line: number; text: string }> = [];
    let filesScanned = 0;
    let truncated = false;

    try {
      for await (const abs of walk(root)) {
        if (filesScanned >= GREP_MAX_FILES || hits.length >= cap) {
          truncated = true;
          break;
        }
        filesScanned += 1;
        let stat;
        try {
          stat = await fs.stat(abs);
        } catch {
          continue;
        }
        if (stat.size > GREP_MAX_FILE_BYTES) continue;
        let text;
        try {
          text = await fs.readFile(abs, "utf8");
        } catch {
          continue; // binary / unreadable → skip
        }
        if (text.includes(String.fromCharCode(0))) continue; // NUL byte -> likely binary
        const lines = text.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(needle)) {
            hits.push({
              path: path.relative(root, abs),
              line: i + 1,
              text: lines[i].slice(0, 300).trim(),
            });
            if (hits.length >= cap) {
              truncated = true;
              break;
            }
          }
        }
      }
    } catch (e) {
      return failed(`grep error: ${(e as Error).message}`);
    }

    if (hits.length === 0)
      return { ok: false, data: { query, hits: [] }, note: `no matches for "${query}"` };
    return {
      ok: true,
      data: { query, count: hits.length, files_scanned: filesScanned, truncated, hits },
    };
  },
};

export const repoReadTools: SurfaceTool[] = [repoRead, repoList, repoGrep];

/** repo surface is "connected" when its root resolves to an existing directory. */
export function repoReadStatus(): "connected" | "unavailable" {
  try {
    const root = repoRoot();
    return existsSync(root) && statSync(root).isDirectory() ? "connected" : "unavailable";
  } catch {
    return "unavailable";
  }
}
