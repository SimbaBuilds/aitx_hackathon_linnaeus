// ─────────────────────────────────────────────────────────────────────────────
// Surface: gmail (read-only).  Uses the Gmail REST API directly via fetch — no
// SDK dependency.  Auth is an OAuth2 access token; SKMD uses Google OAuth
// (G_CLIENT_ID / G_CLIENT_SECRET) so a token may be minted out-of-band and
// supplied as GMAIL_ACCESS_TOKEN (fallbacks: GOOGLE_ACCESS_TOKEN).  Absent →
// graceful { ok:false }.  Tools: gmail_search, gmail_get_message.
// ─────────────────────────────────────────────────────────────────────────────

import type { SurfaceTool, SurfaceToolResult } from "@/lib/surfaces";
import { asInt, asString, failed, firstEnv, noCreds } from "./util";

function accessToken(): string | undefined {
  return firstEnv("GMAIL_ACCESS_TOKEN", "GOOGLE_ACCESS_TOKEN");
}

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function decodeHeader(headers: Array<{ name: string; value: string }>, name: string): string {
  return headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}

const gmailSearch: SurfaceTool = {
  name: "gmail_search",
  surface: "gmail",
  description:
    "Search the connected Gmail mailbox with a Gmail query string (e.g. 'billing subject:invoice'). Returns matching message ids with subject/from/snippet.",
  schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Gmail search query." },
      max_results: { type: "number", description: "Max messages (cap 25)." },
    },
    required: ["query"],
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const token = accessToken();
    if (!token) return noCreds("gmail");
    const query = asString(args.query);
    if (!query) return failed("missing 'query' argument");
    const max = asInt(args.max_results, 10, 25);
    try {
      const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      listUrl.searchParams.set("q", query);
      listUrl.searchParams.set("maxResults", String(max));
      const listRes = await fetch(listUrl, { headers: authHeaders(token) });
      if (listRes.status === 401 || listRes.status === 403)
        return { ok: false, data: null, note: "unauthorized — gmail token rejected/expired" };
      if (!listRes.ok) return failed(`gmail search failed: HTTP ${listRes.status}`);
      const list = (await listRes.json()) as { messages?: Array<{ id: string }> };
      const ids = (list.messages ?? []).map((m) => m.id);
      if (ids.length === 0)
        return { ok: false, data: { messages: [] }, note: `empty result — no mail matches "${query}"` };

      const messages = await Promise.all(
        ids.map(async (id) => {
          const mUrl = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
          mUrl.searchParams.set("format", "metadata");
          for (const h of ["Subject", "From", "Date"]) mUrl.searchParams.append("metadataHeaders", h);
          const mRes = await fetch(mUrl, { headers: authHeaders(token) });
          if (!mRes.ok) return { id, subject: "", from: "", date: "", snippet: "" };
          const m = (await mRes.json()) as {
            snippet?: string;
            payload?: { headers?: Array<{ name: string; value: string }> };
          };
          const hs = m.payload?.headers ?? [];
          return {
            id,
            subject: decodeHeader(hs, "Subject"),
            from: decodeHeader(hs, "From"),
            date: decodeHeader(hs, "Date"),
            snippet: m.snippet ?? "",
          };
        }),
      );
      return { ok: true, data: { query, count: messages.length, messages } };
    } catch (e) {
      return failed(`gmail request error: ${(e as Error).message}`);
    }
  },
};

const gmailGetMessage: SurfaceTool = {
  name: "gmail_get_message",
  surface: "gmail",
  description: "Fetch a single Gmail message's full metadata and snippet by message id.",
  schema: {
    type: "object",
    properties: { id: { type: "string", description: "Gmail message id." } },
    required: ["id"],
  },
  async invoke(args): Promise<SurfaceToolResult> {
    const token = accessToken();
    if (!token) return noCreds("gmail");
    const id = asString(args.id);
    if (!id) return failed("missing 'id' argument");
    try {
      const url = new URL(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}`);
      url.searchParams.set("format", "full");
      const res = await fetch(url, { headers: authHeaders(token) });
      if (res.status === 401 || res.status === 403)
        return { ok: false, data: null, note: "unauthorized — gmail token rejected/expired" };
      if (res.status === 404)
        return { ok: false, data: null, note: `gmail message not found: ${id}` };
      if (!res.ok) return failed(`gmail get message failed: HTTP ${res.status}`);
      const json = await res.json();
      return { ok: true, data: json };
    } catch (e) {
      return failed(`gmail request error: ${(e as Error).message}`);
    }
  },
};

export const gmailSearchTools: SurfaceTool[] = [gmailSearch, gmailGetMessage];

export function gmailSearchStatus(): "connected" | "unavailable" {
  return accessToken() ? "connected" : "unavailable";
}
