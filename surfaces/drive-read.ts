// ─────────────────────────────────────────────────────────────────────────────
// Surface: drive (read-only Google Drive).  Uses the Drive v3 REST API via fetch
// — no SDK dependency.  Auth is an OAuth2 access token supplied as
// GDRIVE_ACCESS_TOKEN (fallbacks: GOOGLE_ACCESS_TOKEN, GMAIL_ACCESS_TOKEN — SKMD
// mints Google tokens from G_CLIENT_ID/G_CLIENT_SECRET).  Absent → graceful
// { ok:false }.  Tools: drive_search, drive_read_file.
// ─────────────────────────────────────────────────────────────────────────────

import type { SurfaceTool, SurfaceToolResult } from "@/lib/surfaces";
import { asInt, asString, failed, firstEnv, noCreds } from "./util";

function accessToken(): string | undefined {
  return firstEnv("GDRIVE_ACCESS_TOKEN", "GOOGLE_ACCESS_TOKEN", "GMAIL_ACCESS_TOKEN");
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

const driveSearch: SurfaceTool = {
  name: "drive_search",
  surface: "drive",
  description:
    "Search Google Drive for files whose name contains the query. Returns id, name, mimeType, modifiedTime.",
  schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Substring to match in file names." },
      max_results: { type: "number", description: "Max files (cap 25)." },
    },
    required: ["query"],
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const token = accessToken();
    if (!token) return noCreds("drive");
    const query = asString(args.query);
    if (!query) return failed("missing 'query' argument");
    const max = asInt(args.max_results, 10, 25);
    try {
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      // Escape single quotes to keep the Drive query valid.
      const safe = query.replace(/'/g, "\\'");
      url.searchParams.set("q", `name contains '${safe}' and trashed = false`);
      url.searchParams.set("pageSize", String(max));
      url.searchParams.set("fields", "files(id,name,mimeType,modifiedTime,size)");
      const res = await fetch(url, { headers: authHeaders(token) });
      if (res.status === 401 || res.status === 403)
        return { ok: false, data: null, note: "unauthorized — drive token rejected/expired" };
      if (!res.ok) return failed(`drive search failed: HTTP ${res.status}`);
      const json = (await res.json()) as { files?: unknown[] };
      const files = json.files ?? [];
      if (files.length === 0)
        return { ok: false, data: { files: [] }, note: `empty result — no files match "${query}"` };
      return { ok: true, data: { query, count: files.length, files } };
    } catch (e) {
      return failed(`drive request error: ${(e as Error).message}`);
    }
  },
};

const driveReadFile: SurfaceTool = {
  name: "drive_read_file",
  surface: "drive",
  description:
    "Read the text content of a Drive file by id. Google Docs/Sheets/Slides are exported to text/plain; other files are downloaded raw (text only).",
  schema: {
    type: "object",
    properties: { file_id: { type: "string", description: "Drive file id." } },
    required: ["file_id"],
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const token = accessToken();
    if (!token) return noCreds("drive");
    const fileId = asString(args.file_id);
    if (!fileId) return failed("missing 'file_id' argument");
    try {
      // Determine mimeType first to pick download vs. export.
      const metaUrl = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
      metaUrl.searchParams.set("fields", "id,name,mimeType");
      const metaRes = await fetch(metaUrl, { headers: authHeaders(token) });
      if (metaRes.status === 401 || metaRes.status === 403)
        return { ok: false, data: null, note: "unauthorized — drive token rejected/expired" };
      if (metaRes.status === 404)
        return { ok: false, data: null, note: `drive file not found: ${fileId}` };
      if (!metaRes.ok) return failed(`drive metadata failed: HTTP ${metaRes.status}`);
      const meta = (await metaRes.json()) as { name?: string; mimeType?: string };
      const mime = meta.mimeType ?? "";

      let contentUrl: URL;
      if (mime.startsWith("application/vnd.google-apps")) {
        contentUrl = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}/export`);
        contentUrl.searchParams.set("mimeType", "text/plain");
      } else {
        contentUrl = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
        contentUrl.searchParams.set("alt", "media");
      }
      const cRes = await fetch(contentUrl, { headers: authHeaders(token) });
      if (!cRes.ok) return failed(`drive download failed: HTTP ${cRes.status}`);
      const text = await cRes.text();
      return { ok: true, data: { id: fileId, name: meta.name ?? "", mimeType: mime, text } };
    } catch (e) {
      return failed(`drive request error: ${(e as Error).message}`);
    }
  },
};

export const driveReadTools: SurfaceTool[] = [driveSearch, driveReadFile];

export function driveReadStatus(): "connected" | "unavailable" {
  return accessToken() ? "connected" : "unavailable";
}
