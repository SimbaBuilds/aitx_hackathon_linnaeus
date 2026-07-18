// ─────────────────────────────────────────────────────────────────────────────
// Surface: notion (read-only).  Uses the Notion REST API directly via fetch —
// no SDK dependency.  Creds: NOTION_API_KEY (+ NOTION_TASKS_DB_ID for the default
// tasks database).  Absent creds → graceful { ok:false }.
// Tools: notion_query_tasks, notion_get_page.
// ─────────────────────────────────────────────────────────────────────────────

import type { SurfaceTool, SurfaceToolResult } from "@/lib/surfaces";
import { asInt, asString, failed, firstEnv, hasAllEnv, noCreds } from "./util";

const NOTION_VERSION = "2022-06-28";

// Accept a raw 32-hex id, a dashed UUID, OR a Notion URL / name-slug (e.g.
// "Hightower-Investors-29ed0e53…") and reduce it to the id the API wants.
function normalizeNotionId(raw: string): string {
  const m = raw.match(/[0-9a-fA-F]{32}/);
  return m ? m[0] : raw.trim();
}

function notionHeaders(key: string): Record<string, string> {
  return {
    Authorization: `Bearer ${key}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

const notionQueryTasks: SurfaceTool = {
  name: "notion_query_tasks",
  surface: "notion",
  description:
    "Query the Notion tasks database (NOTION_TASKS_DB_ID). Returns page rows with their properties. Optional 'query' filters by title text.",
  schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Optional title substring filter." },
      page_size: { type: "number", description: "Max rows (cap 50)." },
    },
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const key = firstEnv("NOTION_API_KEY");
    const rawDbId = firstEnv("NOTION_TASKS_DB_ID");
    if (!key || !rawDbId) return noCreds("notion");
    const dbId = normalizeNotionId(rawDbId);
    const pageSize = asInt(args.page_size, 25, 50);
    const query = asString(args.query);
    const body: Record<string, unknown> = { page_size: pageSize };
    if (query) {
      body.filter = { property: "title", title: { contains: query } };
    }
    try {
      const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
        method: "POST",
        headers: notionHeaders(key),
        body: JSON.stringify(body),
      });
      if (res.status === 401 || res.status === 403)
        return { ok: false, data: null, note: "unauthorized — notion token rejected" };
      if (!res.ok) return failed(`notion query failed: HTTP ${res.status}`);
      const json = (await res.json()) as { results?: unknown[] };
      const rows = json.results ?? [];
      if (rows.length === 0)
        return { ok: false, data: { rows: [] }, note: "empty result — no matching tasks" };
      return { ok: true, data: { count: rows.length, rows } };
    } catch (e) {
      return failed(`notion request error: ${(e as Error).message}`);
    }
  },
};

const notionGetPage: SurfaceTool = {
  name: "notion_get_page",
  surface: "notion",
  description: "Fetch a single Notion page's properties by page id.",
  schema: {
    type: "object",
    properties: { page_id: { type: "string", description: "Notion page id." } },
    required: ["page_id"],
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const key = firstEnv("NOTION_API_KEY");
    if (!key) return noCreds("notion");
    const pageId = asString(args.page_id);
    if (!pageId) return failed("missing 'page_id' argument");
    try {
      const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
        headers: notionHeaders(key),
      });
      if (res.status === 401 || res.status === 403)
        return { ok: false, data: null, note: "unauthorized — notion token rejected" };
      if (res.status === 404)
        return { ok: false, data: null, note: `notion page not found: ${pageId}` };
      if (!res.ok) return failed(`notion get page failed: HTTP ${res.status}`);
      const json = await res.json();
      return { ok: true, data: json };
    } catch (e) {
      return failed(`notion request error: ${(e as Error).message}`);
    }
  },
};

export const notionReadTools: SurfaceTool[] = [notionQueryTasks, notionGetPage];

export function notionReadStatus(): "connected" | "unavailable" {
  return hasAllEnv("NOTION_API_KEY") ? "connected" : "unavailable";
}
