// ─────────────────────────────────────────────────────────────────────────────
// WS-B — Probe registry types.  Internal to the engine (NOT a frozen contract).
// A ProbeDefinition is the authored knowledge for one probe category: the prompt
// templates, the per-probe checkpoint (→ markCorrectMove), the coarse success
// gate (→ completed), and the root-cause hints the classifier falls back to.
// The engine turns a ProbeDefinition + an (authored) instance into a Contract-A
// `Probe` and drives it through the loop in friction_measurement_spec.md.
// ─────────────────────────────────────────────────────────────────────────────

import type { ProbeKind, RootCauseTag } from "@/lib/contracts";
import type { ChatMessage } from "@/lib/candle";
import type { SurfaceToolResult } from "@/lib/surfaces";

/** Passed to a probe's checkpoint predicate after each tool invocation. */
export interface CheckpointContext {
  toolName: string;
  args: Record<string, unknown>;
  result: SurfaceToolResult;
}

/** Passed to a probe's coarse success gate once the loop finishes. */
export interface SuccessContext {
  messages: ChatMessage[];
  /** did the loop ever satisfy reachedCheckpoint()? */
  checkpointReached: boolean;
}

export interface ProbeDefinition {
  id: string;
  category: string;
  kind: ProbeKind;

  /**
   * Universal probes ship a hardcoded instance (ported unchanged across orgs).
   * Synthesized probes start `null` and are authored against the target by the
   * testability-gate pass before the loop runs.
   */
  instanceSpec: string | null;

  /** System prompt establishing the candle's role for this probe. */
  systemPrompt: string;

  /** Builds the user turn from the (possibly authored) instance spec. */
  userPrompt(instanceSpec: string | null): string;

  /**
   * Synthesized only: the instruction the authoring pass gives the candle to
   * produce a concrete instance against the target. If the candle cannot, the
   * engine emits `failed_to_author` before the loop (layer-1 testability gate).
   */
  authoringPrompt?: string;

  /**
   * The first genuinely-correct move toward the task. When a tool result
   * satisfies this, the engine calls recorder.markCorrectMove() (idempotent).
   */
  reachedCheckpoint(ctx: CheckpointContext): boolean;

  /**
   * The coarse correctness gate → FrictionVector.completed. Deliberately simple
   * (a human/proxy supplies ground truth in prod). Defaults to "did we reach the
   * checkpoint and finish"; a probe may override for a stricter criterion.
   */
  didProbeSucceed(ctx: SuccessContext): boolean;

  /** Root-cause tag applied when the run STALLS. */
  failureTag: RootCauseTag;

  /**
   * Root-cause tag applied when the run COMPLETES but carries a latent finding
   * (e.g. onboard-client completes yet there is no runbook). Defaults to "none".
   */
  completedTag?: RootCauseTag;
}
