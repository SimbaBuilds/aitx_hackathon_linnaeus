// ─────────────────────────────────────────────────────────────────────────────
// WS-B — Offline test doubles (NO network).  A StubCandleClient that replays a
// scripted sequence of assistant turns, and an in-memory SurfaceTool factory.
// Used by engine/smoke.ts to prove the loop wiring + friction-vector emission
// without ANTHROPIC_API_KEY / a live candle.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CandleClient,
  CandleResponse,
  ChatMessage,
  ToolCall,
} from "@/lib/candle";
import type { CandleSpec } from "@/lib/contracts";
import type { SurfaceTool, SurfaceToolResult } from "@/lib/surfaces";
import type { Surface } from "@/lib/surfaces";

// ── Stub candle ──────────────────────────────────────────────────────────────

/** One scripted assistant turn: optional tool calls and/or final text. */
export interface StubTurn {
  tools?: { name: string; arguments: Record<string, unknown> }[];
  text?: string;
}

export class StubCandleClient implements CandleClient {
  readonly spec: CandleSpec = { model: "stub-candle", quant: null, seed: 42, temp: 0 };
  readonly isProd = false;
  private i = 0;

  constructor(private readonly script: StubTurn[]) {}

  async chat(_messages: ChatMessage[], _tools?: unknown): Promise<CandleResponse> {
    const turn: StubTurn = this.script[this.i] ?? { text: "(no further action)" };
    this.i += 1;

    const toolCalls: ToolCall[] = (turn.tools ?? []).map((t, idx) => ({
      id: `call_${this.i}_${idx}`,
      name: t.name,
      arguments: JSON.stringify(t.arguments),
    }));

    const message: ChatMessage = {
      role: "assistant",
      content: turn.text ?? "",
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    };

    return {
      message,
      text: turn.text ?? "",
      toolCalls,
      usage: { promptTokens: 0, completionTokens: 0 },
    };
  }
}

// ── In-memory surface tools ──────────────────────────────────────────────────

/**
 * A canned SurfaceTool whose invoke() returns a fixed result (ignores args).
 * The FrictionRecorder wraps these exactly like real surfaces.
 */
export function makeTool(
  name: string,
  surface: Surface["kind"],
  result: SurfaceToolResult,
  description = `stub tool ${name}`,
): SurfaceTool {
  return {
    name,
    surface,
    description,
    schema: { type: "object", properties: {}, additionalProperties: true },
    invoke: async (): Promise<SurfaceToolResult> => result,
  };
}

/** Convenience result builders. */
export const ok = (data: unknown, note?: string): SurfaceToolResult => ({ ok: true, data, note });
export const dead = (note: string): SurfaceToolResult => ({ ok: false, data: null, note });
