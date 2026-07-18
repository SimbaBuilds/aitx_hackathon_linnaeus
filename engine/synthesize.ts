// ─────────────────────────────────────────────────────────────────────────────
// WS-B — Probe SYNTHESIS (instrument design).  A first-class engine capability,
// sibling to runProbe.  A (frontier) candle explores the org's surfaces and
// PROPOSES a ranked list of operability probes tailored to THIS org.
//
// Faithful to the build: routes through the same SurfaceTool adapters and the
// same CandleClient seam as measurement.  BUT synthesis is instrument-DESIGN,
// not measurement — so the caller passes a smart model here, while scored runs
// stay on the pinned Nemotron candle.  Nothing is scored in this pass.
// ─────────────────────────────────────────────────────────────────────────────

import type { CandleClient, ChatMessage } from "@/lib/candle";
import type { SurfaceTool } from "@/lib/surfaces";
import { toolDefs, parseArgs, toolResultMessage, indexByName } from "./util";

export interface SynthesisResult {
  /** The model's ranked probe proposal (markdown/prose). */
  proposal: string;
  /** How many candle turns the exploration took. */
  steps: number;
  /** Distinct surfaces the model actually touched while exploring. */
  surfacesExplored: string[];
}

export interface SynthesizeOptions {
  /** Exploration loop bound (default 18). */
  maxSteps?: number;
  /** Optional callback per step (e.g. to log which tools were called). */
  onStep?: (step: number, toolNames: string[]) => void;
}

const SYNTH_SYSTEM =
  "You are a principal engineer designing an OPERABILITY AUDIT for an organization " +
  "— a set of probes that reveal where an AI agent would STALL trying to do real " +
  "work here: missing/scattered documentation, knowledge that lives only in " +
  "someone's head, unclear ownership, stale or legacy code, undocumented glue " +
  "between systems. EXPLORE the available surfaces with the tools before you " +
  "propose anything — ground every probe in something specific you actually found. " +
  "Prefer targeted searches over dumping large files. Do not invent facts.";

function synthUser(target: string): string {
  return (
    `Explore this organization's surfaces (target: ${target}), then propose a ` +
    "RANKED list of 5–8 operability probes tailored to THIS org. For each probe give:\n" +
    "  1. a short name\n" +
    "  2. kind: 'universal' (ports to any org) or 'synthesized' (specific to this org)\n" +
    "  3. the concrete task instance an auditor agent would actually run\n" +
    "  4. which surface(s) it touches\n" +
    "  5. the negative space / operability risk it targets\n" +
    "  6. the expected stall + root-cause tag if the org is weak there " +
    "(one of: coupling, dead-code, missing-doc, no-owner, no-runbook, stale-code, missing-access)\n" +
    "Prioritize probes that would surface REAL, specific gaps you noticed while " +
    "exploring — not generic checklist items. When done, output the ranked list and stop."
  );
}

/**
 * Run a synthesis pass: the candle explores `tools` and proposes probes for
 * `target`. Read-only design pass — no findings, no scoring.
 */
export async function synthesizeProbes(
  target: string,
  tools: SurfaceTool[],
  candle: CandleClient,
  opts: SynthesizeOptions = {},
): Promise<SynthesisResult> {
  const maxSteps = opts.maxSteps ?? 18;
  const toolIndex = indexByName(tools);
  const surfacesExplored = new Set<string>();

  const messages: ChatMessage[] = [
    { role: "system", content: SYNTH_SYSTEM },
    { role: "user", content: synthUser(target) },
  ];

  let steps = 0;
  for (let i = 0; i < maxSteps; i++) {
    steps = i + 1;
    const res = await candle.chat(messages, toolDefs(tools));
    messages.push(res.message);
    if (!res.toolCalls.length) break;
    opts.onStep?.(steps, res.toolCalls.map((t) => t.name));
    for (const tc of res.toolCalls) {
      const tool = toolIndex.get(tc.name);
      if (tool) surfacesExplored.add(tool.surface);
      const result = tool
        ? await tool.invoke(parseArgs(tc.arguments))
        : { ok: false, data: null, note: `unknown tool: ${tc.name}` };
      messages.push(toolResultMessage(tc, result));
    }
  }

  const proposal = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content ?? "")
    .filter(Boolean)
    .join("\n\n")
    .trim();

  return { proposal, steps, surfacesExplored: [...surfacesExplored] };
}
