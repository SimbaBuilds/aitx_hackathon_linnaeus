// ─────────────────────────────────────────────────────────────────────────────
// WS-B — The bounded probe loop (friction_measurement_spec.md §"The probe loop").
// Wrap every SurfaceTool with FrictionRecorder, chat with the candle, thread tool
// results back, scanText per turn, markCorrectMove at the probe checkpoint, stop
// when the candle emits no tool calls or maxSteps is hit.
// ─────────────────────────────────────────────────────────────────────────────

import type { CandleClient, ChatMessage } from "@/lib/candle";
import type { SurfaceTool, SurfaceToolResult } from "@/lib/surfaces";
import { FrictionRecorder } from "@/lib/instrumentation";
import type { RunSignals } from "./classify";
import { emptySignals } from "./classify";
import { toolDefs, parseArgs, toolResultMessage, indexByName } from "./util";

export const DEFAULT_MAX_STEPS = 20;

/** True when a result reads as an access denial (→ missing-access classification). */
function isUnauthorized(result: SurfaceToolResult): boolean {
  const note = (result.note ?? "").toLowerCase();
  return result.ok === false && /unauthor|forbidden|denied|no access|403/.test(note);
}

/** True when an OK result actually carried a payload. */
function hasPayload(result: SurfaceToolResult): boolean {
  if (!result.ok) return false;
  const d = result.data;
  if (d == null) return false;
  if (typeof d === "string") return d.trim().length > 0;
  if (Array.isArray(d)) return d.length > 0;
  return true;
}

export interface DriveOptions {
  candle: CandleClient;
  /** Already-wrapped (instrumented) surface tools. */
  tools: SurfaceTool[];
  recorder: FrictionRecorder;
  /** Conversation seed (system + user). Mutated in place as the loop appends. */
  messages: ChatMessage[];
  /** Per-result predicate → when true, recorder.markCorrectMove() is called. */
  isCheckpoint?: (ctx: {
    toolName: string;
    args: Record<string, unknown>;
    result: SurfaceToolResult;
  }) => boolean;
  maxSteps?: number;
}

export interface DriveResult {
  messages: ChatMessage[];
  checkpointReached: boolean;
  signals: RunSignals;
}

/**
 * Drive a bounded tool-using conversation. Shared by the execution loop and the
 * authoring pass. The recorder is instrumented by the caller (tools must already
 * be wrapped) so counts survive across passes if desired.
 */
export async function driveConversation(opts: DriveOptions): Promise<DriveResult> {
  const { candle, tools, recorder, messages } = opts;
  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;
  const byName = indexByName(tools);
  const defs = toolDefs(tools);
  const signals: RunSignals = emptySignals();
  const surfacesTouched = new Set<string>();
  let checkpointReached = false;

  for (let step = 0; step < maxSteps; step++) {
    const res = await candle.chat(messages, defs);
    recorder.scanText(res.text); // count hedges once per assistant turn
    messages.push(res.message);

    if (res.toolCalls.length === 0) break; // candle thinks it's done

    for (const tc of res.toolCalls) {
      const args = parseArgs(tc.arguments);
      const tool = byName.get(tc.name);

      if (!tool) {
        // Unknown tool: report the error back so the candle can recover.
        const errResult: SurfaceToolResult = {
          ok: false,
          data: null,
          note: `unknown tool: ${tc.name}`,
        };
        messages.push(toolResultMessage(tc, errResult));
        continue;
      }

      const result = await tool.invoke(args); // wrapped → counts tool_calls/dead_ends/etc.
      surfacesTouched.add(tool.surface);

      if (isUnauthorized(result)) signals.sawUnauthorized = true;
      if (hasPayload(result)) signals.foundArtifact = true;

      if (opts.isCheckpoint?.({ toolName: tc.name, args, result })) {
        recorder.markCorrectMove();
        checkpointReached = true;
      }

      messages.push(toolResultMessage(tc, result));
    }
  }

  signals.surfacesTouched = surfacesTouched.size;
  return { messages, checkpointReached, signals };
}
