// ─────────────────────────────────────────────────────────────────────────────
// WS-B — The testability gate (layer-1 scoring), run BEFORE the loop for
// synthesized probes.  An authoring pass asks the candle to produce a concrete
// instance against the target.  If it can't, the engine emits `failed_to_author`
// with a ceiling friction score — the system was too illegible to even load the
// instrument (friction_measurement_spec.md §"The testability gate").
// ─────────────────────────────────────────────────────────────────────────────

import type { CandleClient, ChatMessage } from "@/lib/candle";
import type { SurfaceTool } from "@/lib/surfaces";
import type { FrictionVector } from "@/lib/contracts";
import { FrictionRecorder } from "@/lib/instrumentation";
import type { ProbeDefinition } from "@/probes";
import type { RunSignals } from "./classify";
import { driveConversation } from "./loop";

const CANNOT = "CANNOT_AUTHOR";
const AUTHORING_MAX_STEPS = 8;

export type AuthorResult =
  | { ok: true; instanceSpec: string }
  | { ok: false; vector: FrictionVector; signals: RunSignals };

/** Last assistant text in a transcript (the authored instance, or a refusal). */
function lastAssistantText(messages: ChatMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role === "assistant" && m.content) return m.content.trim();
  }
  return "";
}

/**
 * Pad a not-completed vector toward the ceiling: a failed-to-author finding is a
 * maximal operability finding, so it must outscore any ordinary stall. We floor
 * its dead_ends so frictionScore lands near 100 without discarding real counts.
 */
function ceilingVector(base: FrictionVector): FrictionVector {
  return { ...base, completed: false, dead_ends: Math.max(base.dead_ends, 8), guessed: true };
}

/**
 * Run the authoring pass for a synthesized probe. Returns the authored instance
 * spec, or a failed_to_author signal (with a ceiling vector) when the candle
 * cannot instantiate the instrument.
 */
export async function authorInstance(
  probe: ProbeDefinition,
  target: string,
  tools: SurfaceTool[],
  candle: CandleClient,
): Promise<AuthorResult> {
  // The authoring pass has its OWN recorder so its exploration friction is not
  // conflated with the execution loop's friction.
  const recorder = new FrictionRecorder();
  const wrappedTools = tools.map((t) => recorder.wrap(t));
  const messages: ChatMessage[] = [
    { role: "system", content: probe.systemPrompt },
    {
      role: "user",
      content:
        `Target system: ${target}.\n` +
        (probe.authoringPrompt ??
          "Author a concrete instance for this probe, or reply 'CANNOT_AUTHOR'."),
    },
  ];

  const { messages: finalMessages, signals } = await driveConversation({
    candle,
    tools: wrappedTools,
    recorder,
    messages,
    // no checkpoint during authoring — this pass only produces an instance
    maxSteps: AUTHORING_MAX_STEPS,
  });

  const text = lastAssistantText(finalMessages);
  const refused = text.length === 0 || /\bCANNOT_AUTHOR\b/i.test(text);

  if (refused) {
    return { ok: false, vector: ceilingVector(recorder.toVector(false)), signals };
  }
  return { ok: true, instanceSpec: text };
}

export { CANNOT as CANNOT_AUTHOR_SENTINEL };
