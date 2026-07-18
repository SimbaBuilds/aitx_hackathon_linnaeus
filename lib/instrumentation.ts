// ─────────────────────────────────────────────────────────────────────────────
// Friction instrumentation core.  OWNED BY ORCHESTRATOR (M3).
// This defines the friction-measurement SEMANTICS — what counts as a stall, a
// dead end, a surface open, the seconds-to-first-correct-move, and the scalar
// rollup.  The WS-B engine WRAPS its SurfaceTools with FrictionRecorder.wrap()
// and calls the mark* hooks; it does not redefine these.  See
// friction_measurement_spec.md for the prose definitions this implements.
// ─────────────────────────────────────────────────────────────────────────────

import type { FrictionVector } from "@/lib/contracts";
import type { SurfaceTool, SurfaceToolResult } from "@/lib/surfaces";

// Low-confidence / hedging markers scanned in the candle's assistant text.
const HEDGE_PATTERNS: RegExp[] = [
  /\bI(?:'m| am) not sure\b/i,
  /\bnot certain\b/i,
  /\bassum(?:e|ing|ption)\b/i,
  /\bI think\b/i,
  /\bprobably\b/i,
  /\bmight be\b/i,
  /\bguess(?:ing)?\b/i,
  /\bunclear\b/i,
  /\bcan(?:'t|not) (?:tell|determine|find)\b/i,
  /\bno(?:thing)? (?:on record|documented|documentation)\b/i,
];

export class FrictionRecorder {
  private readonly startMs = Date.now();
  private surfacesOpened = new Set<string>();
  private toolCalls = 0;
  private retries = 0;
  private deadEnds = 0;
  private hedges = 0;
  private firstCorrectMoveMs: number | null = null;
  private lastToolSignature: string | null = null;

  /** ms elapsed since the run started. */
  private now(): number {
    return Date.now() - this.startMs;
  }

  /**
   * Wrap a SurfaceTool so every invocation is instrumented. Surfaces implement
   * only invoke(); this counts the tool call, marks the surface opened, and
   * records a dead end when the result is not ok (no data / unauthorized) or a
   * retry when the same tool+args is repeated.
   */
  wrap(tool: SurfaceTool): SurfaceTool {
    return {
      ...tool,
      invoke: async (args: Record<string, unknown>): Promise<SurfaceToolResult> => {
        this.toolCalls += 1;
        this.surfacesOpened.add(tool.surface);
        const sig = `${tool.name}:${stableStringify(args)}`;
        if (sig === this.lastToolSignature) this.retries += 1;
        this.lastToolSignature = sig;

        const result = await tool.invoke(args);
        if (!result.ok) this.deadEnds += 1;
        return result;
      },
    };
  }

  /** Scan an assistant turn's text for low-confidence language. */
  scanText(text: string): void {
    if (!text) return;
    for (const re of HEDGE_PATTERNS) {
      if (re.test(text)) this.hedges += 1;
    }
  }

  /**
   * Signal that the candle reached its first genuinely-correct move toward the
   * task (defined per-probe by the engine's success criteria — the engine calls
   * this the first time the probe's checkpoint is satisfied). Idempotent: only
   * the first call is recorded.
   */
  markCorrectMove(): void {
    if (this.firstCorrectMoveMs === null) this.firstCorrectMoveMs = this.now();
  }

  /** Collapse the recorder into the frozen FrictionVector (Contract A). */
  toVector(completed: boolean): FrictionVector {
    return {
      completed,
      seconds_to_first_correct_move:
        this.firstCorrectMoveMs === null ? null : this.firstCorrectMoveMs / 1000,
      surfaces_opened: this.surfacesOpened.size,
      tool_calls: this.toolCalls,
      retries: this.retries,
      dead_ends: this.deadEnds,
      guessed: this.hedges > 0 && !completed, // hedged AND didn't land = a guess
      hedging_count: this.hedges,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// The scalar rollup.  Higher = MORE friction (worse operability).  Deliberately
// lossy marketing on top of the vector (talking_points).  Its ONLY honest use is
// relative/longitudinal: frictionScore(after) - frictionScore(before) = the delta.
// A never-completed run is pinned near the ceiling so a completed→stalled swing
// (a caught regression) produces a large positive delta.
// ─────────────────────────────────────────────────────────────────────────────
export function frictionScore(v: FrictionVector): number {
  if (!v.completed) {
    // Failed the task: high floor (70) plus how hard it thrashed before giving up.
    const thrash = 3 * v.dead_ends + 2 * v.retries + v.hedging_count + 0.5 * v.surfaces_opened;
    return clamp(70 + thrash, 0, 100);
  }
  // Completed: friction is the effort it took to get there.
  const effort =
    1.5 * v.tool_calls +
    2 * v.dead_ends +
    2 * v.retries +
    1.5 * v.hedging_count +
    1.5 * v.surfaces_opened +
    (v.seconds_to_first_correct_move ?? 0) / 30;
  return clamp(effort, 0, 65); // completed runs cap below the failure floor
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function stableStringify(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, Object.keys(obj).sort());
}
