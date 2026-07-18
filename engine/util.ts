// ─────────────────────────────────────────────────────────────────────────────
// WS-B — engine plumbing shared by the authoring pass and the execution loop.
// Message/tool conversions between Contract C (SurfaceTool) and Contract B
// (CandleClient chat protocol).
// ─────────────────────────────────────────────────────────────────────────────

import type { ChatMessage, ToolCall, ToolDef } from "@/lib/candle";
import type { SurfaceTool, SurfaceToolResult } from "@/lib/surfaces";

/** Map instrumented SurfaceTools → the ToolDefs the candle sees. */
export function toolDefs(tools: SurfaceTool[]): ToolDef[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    schema: t.schema,
  }));
}

/** Parse a model-emitted tool-call argument string; never throws. */
export function parseArgs(raw: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Build the role:"tool" turn that threads a surface result back to the candle. */
export function toolResultMessage(tc: ToolCall, result: SurfaceToolResult): ChatMessage {
  return {
    role: "tool",
    tool_call_id: tc.id,
    name: tc.name,
    content: JSON.stringify(result),
  };
}

/** Index tools by name for O(1) dispatch inside the loop. */
export function indexByName(tools: SurfaceTool[]): Map<string, SurfaceTool> {
  return new Map(tools.map((t) => [t.name, t]));
}
