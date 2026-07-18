// ─────────────────────────────────────────────────────────────────────────────
// WS-B — Public API of the probe engine.
//   runProbe(probeId, target, tools, candle)  → one Finding (Contract A)
//   runBattery(probeIds?, target, tools, candle) → Finding[]
// Implements friction_measurement_spec.md: testability gate (synthesized) →
// bounded probe loop → friction vector → root-cause classification.
// ─────────────────────────────────────────────────────────────────────────────

import type { CandleClient, ChatMessage } from "@/lib/candle";
import type { SurfaceTool } from "@/lib/surfaces";
import type { Finding, FrictionVector } from "@/lib/contracts";
import { FrictionRecorder } from "@/lib/instrumentation";
import { getProbe, BATTERY_IDS, type ProbeDefinition } from "@/probes";
import { driveConversation, DEFAULT_MAX_STEPS } from "./loop";
import { authorInstance } from "./authoring";
import { classifyRootCause, type RunSignals } from "./classify";

export interface RunProbeOptions {
  /** Overrides the auto-generated run id (to tie a Finding to a Contract-A Run). */
  runId?: string;
  /** Loop bound (default 20, per spec). */
  maxSteps?: number;
  /**
   * Explicit instance override: skip the authoring/testability gate and run this
   * exact instance. Used for controlled before/after runs (e.g. the billing
   * regression scoped two ways) where the instance is fixed, not authored.
   */
  instanceSpec?: string;
}

function makeRunId(target: string, probeId: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `run_${target}_${probeId}_${ts}${rand}`;
}

function buildFinding(
  runId: string,
  probeId: string,
  status: Finding["status"],
  vector: FrictionVector,
  rootCause: Finding["root_cause_tag"],
): Finding {
  return {
    run_id: runId,
    probe_id: probeId,
    status,
    friction_vector: vector,
    root_cause_tag: rootCause,
    remediation: null, // the capture pass (WS-C/mode) authors this later
  };
}

/**
 * Run a single probe end-to-end and emit its Finding.
 *
 * @param probeId  registry id (e.g. "auth-boundary", "billing-regression")
 * @param target   the audited system (e.g. "SKMD") — recorded on the run id
 * @param tools    the org's SurfaceTools (raw; the engine wraps them)
 * @param candle   the model client (Contract B)
 */
export async function runProbe(
  probeId: string,
  target: string,
  tools: SurfaceTool[],
  candle: CandleClient,
  opts: RunProbeOptions = {},
): Promise<Finding> {
  const probe: ProbeDefinition = getProbe(probeId);
  const runId = opts.runId ?? makeRunId(target, probeId);
  const maxSteps = opts.maxSteps ?? DEFAULT_MAX_STEPS;

  // ── Layer 1: testability gate (synthesized probes only) ──────────────────
  let instanceSpec = probe.instanceSpec;
  if (opts.instanceSpec !== undefined) {
    // Explicit instance override → skip authoring (controlled before/after runs).
    instanceSpec = opts.instanceSpec;
  } else if (probe.kind === "synthesized") {
    const authored = await authorInstance(probe, target, tools, candle);
    if (!authored.ok) {
      // Too illegible to even load the instrument → maximal finding, no loop.
      return buildFinding(
        runId,
        probeId,
        "failed_to_author",
        authored.vector,
        "missing-doc", // authoring-time illegibility ≈ a documentation gap
      );
    }
    instanceSpec = authored.instanceSpec;
  }

  // ── Layer 2: the bounded probe loop ──────────────────────────────────────
  const recorder = new FrictionRecorder();
  const wrappedTools = tools.map((t) => recorder.wrap(t)); // instrument every surface

  const messages: ChatMessage[] = [
    { role: "system", content: probe.systemPrompt },
    { role: "user", content: probe.userPrompt(instanceSpec) },
  ];

  const drive = await driveConversation({
    candle,
    tools: wrappedTools,
    recorder,
    messages,
    isCheckpoint: (ctx) => probe.reachedCheckpoint(ctx),
    maxSteps,
  });

  const completed = probe.didProbeSucceed({
    messages: drive.messages,
    checkpointReached: drive.checkpointReached,
  });

  const vector = recorder.toVector(completed);
  const signals: RunSignals = drive.signals;
  const rootCause = classifyRootCause(probe, vector, signals);

  return buildFinding(
    runId,
    probeId,
    completed ? "completed" : "stalled",
    vector,
    rootCause,
  );
}

/**
 * Run a set of probes (default: the full hackathon battery) against one target.
 * Findings preserve the requested order.
 */
export async function runBattery(
  target: string,
  tools: SurfaceTool[],
  candle: CandleClient,
  probeIds: string[] = BATTERY_IDS,
  opts: RunProbeOptions = {},
): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const id of probeIds) {
    findings.push(await runProbe(id, target, tools, candle, opts));
  }
  return findings;
}

export { driveConversation, DEFAULT_MAX_STEPS } from "./loop";
export { authorInstance } from "./authoring";
export { classifyRootCause, type RunSignals } from "./classify";
