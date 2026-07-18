// ─────────────────────────────────────────────────────────────────────────────
// The real-run entry point.  Wires the candle + real org surfaces + probe engine
// so ONE command runs a genuine audit against the target system.
//
//   npx tsx scripts/run-audit.ts                 # full battery
//   npx tsx scripts/run-audit.ts billing-regression   # one probe
//
// Candle selection (Contract B): if CANDLE_BASE_URL is set → the pinned vLLM
// Nemotron (a MEASURED run); else the dev stand-in (Opus 4.8) needing
// ANTHROPIC_API_KEY.  Reads .env.local.  Writes a JSON artifact under
// .audit-output/ and prints a per-probe friction summary.
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createCandle } from "@/lib/candle";
import { allSurfaceTools, surfaceStatus } from "@/surfaces";
import { runBattery } from "@/engine";
import { BATTERY_IDS } from "@/probes";
import { frictionScore } from "@/lib/instrumentation";
import type { Finding } from "@/lib/contracts";

// Minimal .env.local loader (no dep). Does not override already-set vars.
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
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val && process.env[key] === undefined) process.env[key] = val;
  }
}

async function main(): Promise<void> {
  loadEnvLocal();

  const target = process.env.AUDIT_TARGET ?? "SKMD";
  const repoPath = process.env.REPO_PATH ?? "/Users/cameronhightower/Software_Projects/SKMD";
  process.env.REPO_PATH = repoPath; // surfaces read this

  const candle = createCandle();
  const mode = candle.isProd ? "PROD (pinned Nemotron candle — MEASURED)" : "DEV (Opus 4.8 stand-in)";

  // Guard: a run needs a usable candle.
  if (!candle.isProd && !process.env.ANTHROPIC_API_KEY) {
    console.error(
      "\n✗ No candle available.\n" +
        "  Set CANDLE_BASE_URL (your vLLM endpoint) for a measured run, OR\n" +
        "  set ANTHROPIC_API_KEY in .env.local for a dev-candle run.\n",
    );
    process.exit(1);
  }

  console.log(`\n▶ Linnaeus audit — target=${target}`);
  console.log(`  candle: ${mode}  model=${candle.spec.model} seed=${candle.spec.seed} temp=${candle.spec.temp}`);
  console.log(`  repo:   ${repoPath}`);
  console.log(`  surfaces:`);
  for (const s of surfaceStatus()) console.log(`    - ${s.kind.padEnd(7)} ${s.access_status}`);

  const tools = allSurfaceTools();
  const arg = process.argv[2];
  const probeIds = arg ? [arg] : BATTERY_IDS;
  console.log(`  probes: ${probeIds.join(", ")}\n`);

  const started = Date.now();
  const findings: Finding[] = await runBattery(target, tools, candle, probeIds);
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  console.log(`── findings (${elapsed}s) ─────────────────────────────────────────`);
  for (const f of findings) {
    const score = frictionScore(f.friction_vector).toFixed(1);
    const rem = f.remediation ? ` → ${f.remediation.type}` : "";
    console.log(
      `  ${f.probe_id.padEnd(20)} ${f.status.padEnd(16)} friction=${score.padStart(5)}  ${f.root_cause_tag}${rem}`,
    );
  }

  const outDir = join(process.cwd(), ".audit-output");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `run_${target}_${Date.now()}.json`);
  writeFileSync(
    outFile,
    JSON.stringify({ target, candle: candle.spec, ran_at: new Date().toISOString(), findings }, null, 2),
  );
  console.log(`\n✓ wrote ${outFile}`);
  console.log(
    candle.isProd
      ? "  (measured run — safe to persist / compare as a real delta)"
      : "  (dev-candle run — proves the pipeline; use the vLLM candle for the scored delta)\n",
  );
}

main().catch((err) => {
  console.error("audit failed:", err);
  process.exit(1);
});
