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

/**
 * Max characters of a single tool result threaded back to the candle. Large
 * file reads / grep dumps otherwise blow the context window over a 20-step loop
 * (observed: SKMD billing files → 66k tokens > 64k limit). ~8k chars ≈ ~2k
 * tokens; capped × maxSteps stays well under the window. Truncation itself is a
 * mild friction signal (the agent must re-query more narrowly).
 */
const MAX_TOOL_RESULT_CHARS = 8000;

/** Build the role:"tool" turn that threads a surface result back to the candle. */
export function toolResultMessage(tc: ToolCall, result: SurfaceToolResult): ChatMessage {
  let content = JSON.stringify(result);
  if (content.length > MAX_TOOL_RESULT_CHARS) {
    content =
      content.slice(0, MAX_TOOL_RESULT_CHARS) +
      `…[truncated ${content.length - MAX_TOOL_RESULT_CHARS} chars — re-query more narrowly]`;
  }
  return {
    role: "tool",
    tool_call_id: tc.id,
    name: tc.name,
    content,
  };
}

/** Index tools by name for O(1) dispatch inside the loop. */
export function indexByName(tools: SurfaceTool[]): Map<string, SurfaceTool> {
  return new Map(tools.map((t) => [t.name, t]));
}
