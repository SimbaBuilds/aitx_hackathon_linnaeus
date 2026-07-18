// ─────────────────────────────────────────────────────────────────────────────
// WS-B — Root-cause classifier.  Maps a finished run to ONE RootCauseTag using
// the heuristics in friction_measurement_spec.md over the recorder-derived
// FrictionVector, the per-run signals collected in the loop, and the probe's
// authored hints (failureTag / completedTag).
// ─────────────────────────────────────────────────────────────────────────────

import type { FrictionVector, RootCauseTag } from "@/lib/contracts";
import type { ProbeDefinition } from "@/probes";

/** Signals the loop observes per tool result that the vector doesn't capture. */
export interface RunSignals {
  /** any result surfaced an unauthorized / access-denied condition. */
  sawUnauthorized: boolean;
  /** any OK result actually returned a payload (an artifact was found). */
  foundArtifact: boolean;
  /** distinct surfaces touched (mirrors vector.surfaces_opened; kept for tuning). */
  surfacesTouched: number;
}

export function emptySignals(): RunSignals {
  return { sawUnauthorized: false, foundArtifact: false, surfacesTouched: 0 };
}

// Completed-but-thrashed threshold → the change was over-coupled across files.
const COUPLING_TOOL_CALLS = 12;

/**
 * classifyRootCause(recorder-derived vector, signals, probe).
 * Order matters: an observed access failure dominates authored hints; a clean
 * completion is `none`; otherwise fall back to the probe's authored tag.
 */
export function classifyRootCause(
  probe: ProbeDefinition,
  vector: FrictionVector,
  signals: RunSignals,
): RootCauseTag {
  // A surface explicitly denied access → missing-access regardless of probe.
  if (signals.sawUnauthorized) return "missing-access";

  if (vector.completed) {
    // Completed but thrashed across many files/retries for one change → coupling.
    if (vector.tool_calls >= COUPLING_TOOL_CALLS && vector.retries > 0) {
      return "coupling";
    }
    // Completed with a latent finding the probe anticipated (e.g. no-runbook), else clean.
    return probe.completedTag ?? "none";
  }

  // Stalled: the probe's authored failure hint is the primary classification,
  // refined by the transcript signal (nothing found at all → missing-doc).
  if (!signals.foundArtifact && probe.failureTag === "stale-code") {
    // couldn't even find the code → it's a doc/legibility gap, not stale code.
    return "missing-doc";
  }
  return probe.failureTag;
}
