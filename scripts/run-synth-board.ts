// ─────────────────────────────────────────────────────────────────────────────
// SYNTHESIZED ORG-LEVEL BOARD — measure the Frontier-Factor proposals on Nemotron.
// Runs the 3 synthesized probes (SYNTH_BOARD_IDS) as single-shot snapshots against
// live SKMD (repo + Gmail + Drive). No before/after — this feeds the heatmap +
// findings board, NOT the delta view. Same pinned Nemotron candle that measures
// everything else.
//
// Two probes are surface-forcing (unanswerable from the repo alone → the candle
// MUST open Gmail). A logging proxy records which surface EVERY tool call hit, so
// we can PROVE Gmail/Drive were exercised (not just infer from a count).
//
// Requires: CANDLE_BASE_URL (Nemotron up) + a FRESH Google token loaded into env
// (set -a; . /path/to/.google-token.env; set +a) — Gmail/Drive tokens expire ~1hr.
//
//   set -a; . /Users/cameronhightower/Software_Projects/SKMD/.google-token.env; set +a
//   npx tsx scripts/run-synth-board.ts
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createCandle } from "@/lib/candle";
import { allSurfaceTools, surfaceStatus } from "@/surfaces";
import { runProbe } from "@/engine";
import { frictionScore } from "@/lib/instrumentation";
import { SYNTH_BOARD_IDS } from "@/probes";
import { ensureGoogleToken } from "@/surfaces/google-auth";
import type { SurfaceTool } from "@/lib/surfaces";
import type { Finding } from "@/lib/contracts";

function loadEnvLocal(): void {
  const path = join(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    const quoted =
      (val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"));
    if (quoted) val = val.slice(1, -1);
    else if (val.startsWith("#")) val = "";
    else {
      const h = val.indexOf(" #");
      if (h >= 0) val = val.slice(0, h).trim();
    }
    if (val && process.env[key] === undefined) process.env[key] = val;
  }
}

// A per-call surface log. Wrapping here (BEFORE runProbe re-wraps with the
// FrictionRecorder) means our logger fires on every real invocation, so we can
// attribute each tool call to a probe + surface and PROVE Gmail/Drive were hit.
interface CallLogEntry {
  probe: string;
  tool: string;
  surface: string;
  ok: boolean;
  query?: string;
  note?: string;
}

function argSummary(args: Record<string, unknown>): string | undefined {
  const q = args.query ?? args.q ?? args.path ?? args.page_id;
  return q === undefined ? undefined : String(q).slice(0, 80);
}

function loggingProxy(tools: SurfaceTool[], log: CallLogEntry[], currentProbe: () => string): SurfaceTool[] {
  return tools.map((t) => ({
    ...t,
    invoke: async (args: Record<string, unknown>) => {
      const r = await t.invoke(args);
      log.push({
        probe: currentProbe(),
        tool: t.name,
        surface: t.surface,
        ok: r.ok,
        query: argSummary(args),
        note: r.note,
      });
      return r;
    },
  }));
}

async function main(): Promise<void> {
  loadEnvLocal();
  process.env.REPO_PATH =
    process.env.REPO_PATH ?? "/Users/cameronhightower/Software_Projects/SKMD";

  // The board of RECORD must be Nemotron-measured. Dev mode is allowed ONLY for
  // pipeline validation (LINNAEUS_ALLOW_DEV=1) and NEVER overwrites the Nemotron
  // board — it writes to results/dev_synth_board.json and is not the demo source.
  const allowDev = process.env.LINNAEUS_ALLOW_DEV === "1";
  if (!process.env.CANDLE_BASE_URL && !allowDev) {
    console.error(
      "✗ CANDLE_BASE_URL not set — this board MUST be measured by the Nemotron candle,\n" +
        "  not the dev stand-in. Bring the Brev/vLLM box up and set CANDLE_BASE_URL,\n" +
        "  or set LINNAEUS_ALLOW_DEV=1 to run a DEV validation board (separate file).",
    );
    process.exit(1);
  }
  if (allowDev) {
    // Force the dev (Anthropic) candle even if a stale/unreachable CANDLE_BASE_URL lingers.
    delete process.env.CANDLE_BASE_URL;
  }

  // Auto-refresh Google creds so Gmail/Drive are live regardless of when the last
  // token was minted (access tokens expire ~1hr). No-op if the cache is still fresh.
  try {
    const r = await ensureGoogleToken({ verbose: true });
    console.log(`  google token ${r.source}${r.refreshed ? " (fresh mint)" : ""}`);
  } catch (e) {
    console.error(`  ⚠ google token refresh failed: ${(e as Error).message}`);
    console.error("    Gmail/Drive probes may stall on 'unauthorized'. Continuing anyway.");
  }

  const status = surfaceStatus();
  const gmail = status.find((s) => s.kind === "gmail");
  const drive = status.find((s) => s.kind === "drive");
  const surfacesOff = [gmail, drive].filter((s) => s?.access_status !== "connected");
  if (surfacesOff.length) {
    console.error(
      "✗ Gmail/Drive not connected — the surface-forcing probes need a FRESH Google token.\n" +
        "  Run:  set -a; . /Users/cameronhightower/Software_Projects/SKMD/.google-token.env; set +a\n" +
        "  (tokens expire ~1hr; re-mint if the verify below shows 'unauthorized').",
    );
    // Not a hard exit — allow a repo-only dry run — but warn loudly.
  }

  const candle = createCandle();
  const rawTools = allSurfaceTools();
  const callLog: CallLogEntry[] = [];
  let activeProbe = "";
  const tools = loggingProxy(rawTools, callLog, () => activeProbe);

  console.log(`\n▶ Synthesized org-level board — candle=${candle.spec.model} (measurement)`);
  console.log(`  surfaces: ${status.map((s) => `${s.kind}:${s.access_status}`).join("  ")}`);
  console.log(`  probes:   ${SYNTH_BOARD_IDS.join(", ")}\n`);

  const findings: Array<
    Finding & {
      verdict: string;
      _derived: { friction_score: number; surfaces_hit: string[]; tool_calls_by_surface: Record<string, number> };
    }
  > = [];

  for (const id of SYNTH_BOARD_IDS) {
    activeProbe = id;
    const before = callLog.length;
    process.stdout.write(`  ▸ ${id} … `);
    let verdict = "";
    const finding = await runProbe(id, "SKMD", tools, candle, {
      onFinish: (messages) => {
        const text = messages
          .filter((m) => m.role === "assistant")
          .map((m) => m.content ?? "")
          .join("\n");
        verdict = text.match(/(OWNER|ROLLOUT|WIRING):.*/i)?.[0]?.trim() ?? "";
      },
    });

    const mine = callLog.slice(before).filter((e) => e.probe === id);
    const bySurface: Record<string, number> = {};
    for (const e of mine) bySurface[e.surface] = (bySurface[e.surface] ?? 0) + 1;
    const surfacesHit = Object.keys(bySurface);
    const score = frictionScore(finding.friction_vector);

    findings.push({
      ...finding,
      verdict,
      _derived: { friction_score: score, surfaces_hit: surfacesHit, tool_calls_by_surface: bySurface },
    });

    console.log(
      `${finding.status.toUpperCase()}  score=${score.toFixed(1)}  ` +
        `root_cause=${finding.root_cause_tag}  surfaces=[${surfacesHit.join(",")}]`,
    );
  }

  const nonRepoUse = callLog.filter((e) => e.surface !== "repo" && e.ok);
  console.log(
    `\n  cross-surface proof: ${nonRepoUse.length} successful non-repo tool call(s) ` +
      `(${[...new Set(nonRepoUse.map((e) => e.surface))].join(", ") || "none"})`,
  );

  const out = {
    _note:
      "Synthesized org-level board — Nemotron-measured single-shot snapshots of the " +
      "Frontier-Factor proposals. Feeds heatmap + findings board (no deltas). " +
      "fixtures/demo.json (the money-shot delta) is untouched.",
    target: "SKMD",
    candle: candle.spec,
    generated: new Date().toISOString(),
    surfaces: status,
    findings,
    call_log: callLog,
  };

  const outDir = join(process.cwd(), "results");
  mkdirSync(outDir, { recursive: true });
  // Prod (Nemotron) → the board of record. Dev → a clearly-separate validation file.
  const outFile = join(
    outDir,
    candle.isProd ? "nemotron_synth_board.json" : "dev_synth_board.json",
  );
  writeFileSync(outFile, JSON.stringify(out, null, 2));
  console.log(`\n✓ wrote ${outFile}\n`);
}

main().catch((err) => {
  console.error("synth board run failed:", err);
  process.exit(1);
});
