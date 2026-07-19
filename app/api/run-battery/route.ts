// ─────────────────────────────────────────────────────────────────────────────
// POST /api/run-battery  — fire a real audit battery against the pinned candle.
//
// This is what the Field Log "Run Now" button calls. It runs probes SERVER-SIDE
// through the same engine + surfaces + candle as scripts/run-audit.ts, so a click
// genuinely hits the vLLM Nemotron endpoint (CANDLE_BASE_URL) — you can watch it
// light up `Running: N reqs` in the vLLM log. Concurrent mode fires all probes at
// once (Promise.all) so vLLM's continuous batching does real work.
//
// Body: { probeIds: string[], mode: "sequential" | "concurrent" }
// Returns: { ok, mode, count, wall_s, isProd, model,
//            findings: [{probe_id,status,score,root_cause_tag,trace,verdict}] }
// `trace` = the tool-by-tool path the candle walked (surface/tool/query/ok/note),
// `verdict` = its final structured line — so the UI can show what the agent did.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { createCandle } from "@/lib/candle";
import { allSurfaceTools } from "@/surfaces";
import { runProbe } from "@/engine";
import { BATTERY_IDS } from "@/probes";
import { frictionScore } from "@/lib/instrumentation";
import type { Finding } from "@/lib/contracts";
import type { SurfaceTool } from "@/lib/surfaces";
import type { ChatMessage } from "@/lib/candle";

interface TraceEntry {
  surface: string;
  tool: string;
  ok: boolean;
  query: string;
  note: string;
}

function argSummary(args: Record<string, unknown>): string {
  const q = args.query ?? args.q ?? args.path ?? args.page_id;
  return q === undefined ? "" : String(q).slice(0, 80);
}

function extractVerdict(messages: ChatMessage[]): string {
  const text = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content ?? "")
    .join("\n");
  return text.match(/(OWNER|ROLLOUT|WIRING|COVERAGE):.*/i)?.[0]?.trim() ?? "";
}

// Wrap each tool so every real invocation is logged into `trace`. Wrapping here
// (before runProbe re-wraps with the FrictionRecorder) captures the actual path.
// Fresh per probe, so concurrent runs never cross-contaminate their traces.
function tracingTools(tools: SurfaceTool[], trace: TraceEntry[]): SurfaceTool[] {
  return tools.map((t) => ({
    ...t,
    invoke: async (args: Record<string, unknown>) => {
      const r = await t.invoke(args);
      trace.push({ surface: t.surface, tool: t.name, ok: r.ok, query: argSummary(args), note: r.note ?? "" });
      return r;
    },
  }));
}

export const runtime = "nodejs"; // engine + surfaces need fs / node APIs (not edge)
export const dynamic = "force-dynamic"; // never cache a run
export const maxDuration = 300; // a full concurrent battery can take a couple minutes

export async function POST(req: Request) {
  // Next loads .env.local into process.env; REPO_PATH isn't there, so default it
  // exactly like scripts/run-audit.ts does (surfaces read it).
  process.env.REPO_PATH =
    process.env.REPO_PATH ?? "/Users/cameronhightower/Software_Projects/SKMD";

  let body: { probeIds?: string[]; mode?: "sequential" | "concurrent" } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body → defaults below */
  }
  const mode = body.mode === "sequential" ? "sequential" : "concurrent";
  const probeIds = body.probeIds?.length ? body.probeIds : BATTERY_IDS;

  const candle = createCandle();
  if (!candle.isProd && !process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: "No candle: set CANDLE_BASE_URL (vLLM) or ANTHROPIC_API_KEY." },
      { status: 503 },
    );
  }
  const target = process.env.AUDIT_TARGET ?? "SKMD";
  const tools = allSurfaceTools();

  // Per-probe isolation: one probe throwing (e.g. an unauthorized org surface)
  // must not sink the whole battery — return a stalled finding for it instead.
  // Each probe captures its own trace + verdict (fresh tracing tools per call).
  interface ProbeRun {
    finding: Finding;
    trace: TraceEntry[];
    verdict: string;
  }
  const one = async (id: string): Promise<ProbeRun> => {
    const trace: TraceEntry[] = [];
    let verdict = "";
    try {
      const finding = await runProbe(id, target, tracingTools(tools, trace), candle, {
        onFinish: (messages) => (verdict = extractVerdict(messages)),
      });
      return { finding, trace, verdict };
    } catch {
      return {
        finding: {
          run_id: `run_error_${id}`,
          probe_id: id,
          status: "stalled",
          friction_vector: {
            completed: false,
            seconds_to_first_correct_move: 0,
            surfaces_opened: 0,
            tool_calls: 0,
            retries: 0,
            dead_ends: 1,
            guessed: false,
            hedging_count: 0,
          },
          root_cause_tag: "missing-doc",
          remediation: null,
        } satisfies Finding,
        trace,
        verdict,
      };
    }
  };

  const started = Date.now();
  let runs: ProbeRun[];
  if (mode === "concurrent") {
    runs = await Promise.all(probeIds.map(one)); // all in flight → vLLM batches
  } else {
    runs = [];
    for (const id of probeIds) runs.push(await one(id));
  }
  const wall_s = (Date.now() - started) / 1000;

  return NextResponse.json({
    ok: true,
    mode,
    count: runs.length,
    wall_s,
    isProd: candle.isProd,
    model: candle.spec.model,
    findings: runs.map((r) => ({
      probe_id: r.finding.probe_id,
      status: r.finding.status,
      score: frictionScore(r.finding.friction_vector),
      root_cause_tag: r.finding.root_cause_tag,
      trace: r.trace,
      verdict: r.verdict,
    })),
  });
}
