// ─────────────────────────────────────────────────────────────────────────────
// Contract C — SurfaceTool.  OWNED BY ORCHESTRATOR (M3).  FROZEN.
// How a probe "touches" the org.  Each org surface (repo, gmail, drive, notion,
// rds) implements this interface.  Surfaces just fetch data — the ENGINE's
// FrictionRecorder (lib/instrumentation.ts) WRAPS every invoke() to count
// surfaces_opened, tool_calls, dead_ends, timing.  Surface authors (WS-E) do NOT
// implement instrumentation; they only implement invoke().
// ─────────────────────────────────────────────────────────────────────────────

// A JSON-Schema object describing the tool's arguments (passed to the candle).
export type ToolSchema = Record<string, unknown>;

export interface SurfaceToolResult {
  ok: boolean; // false = a dead end (no data / not found / unauthorized) → friction signal
  data: unknown; // the payload the candle sees (search hits, file text, rows, …)
  note?: string; // optional human-readable note (e.g. "unauthorized", "empty result")
}

export interface SurfaceTool {
  name: string; // unique tool name the candle calls, e.g. "gmail_search"
  surface: Surface["kind"]; // which surface it belongs to (for surfaces_opened accounting)
  description: string; // shown to the candle
  schema: ToolSchema; // JSON schema for args
  invoke(args: Record<string, unknown>): Promise<SurfaceToolResult>;
}

import type { Surface } from "@/lib/contracts";
export type { Surface };
