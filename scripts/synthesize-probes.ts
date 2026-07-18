// ─────────────────────────────────────────────────────────────────────────────
// PROBE SYNTHESIS (Frontier-Factor) — design the instrument, don't run it.
// A frontier model (Sonnet 5) explores the org's surfaces and PROPOSES a ranked
// list of operability probes tailored to THIS org. This is instrument-DESIGN, so
// it uses a smart model — NOT the pinned Nemotron candle (which does the
// MEASUREMENT). Read-only exploration + a proposal; nothing is scored here.
//
//   npx tsx scripts/synthesize-probes.ts
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createCandle } from "@/lib/candle";
import { allSurfaceTools, surfaceStatus } from "@/surfaces";
import { synthesizeProbes } from "@/engine";
import { ensureGoogleToken } from "@/surfaces/google-auth";

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

async function main(): Promise<void> {
  loadEnvLocal();
  process.env.REPO_PATH =
    process.env.REPO_PATH ?? "/Users/cameronhightower/Software_Projects/SKMD";

  // Force the frontier dev candle (Sonnet 5) — synthesis is instrument DESIGN,
  // not measurement, so it must NOT route to the pinned Nemotron endpoint.
  delete process.env.CANDLE_BASE_URL;
  process.env.DEV_CANDLE_MODEL = process.env.DEV_CANDLE_MODEL ?? "claude-sonnet-5";
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("✗ ANTHROPIC_API_KEY required for the synthesis (frontier) model.");
    process.exit(1);
  }

  // Auto-refresh Google creds so synthesis can explore Gmail/Drive (best-effort).
  try {
    await ensureGoogleToken({ verbose: true });
  } catch (e) {
    console.warn(`  google token refresh skipped: ${(e as Error).message}`);
  }

  const candle = createCandle();
  const tools = allSurfaceTools();

  console.log(`\n▶ Probe synthesis (Frontier-Factor) — model=${candle.spec.model}`);
  console.log(`  surfaces: ${surfaceStatus().map((s) => `${s.kind}:${s.access_status}`).join("  ")}`);
  console.log(`  (surfaces marked 'unavailable' have no creds — synthesis sees only the connected ones)\n`);

  const { proposal, steps } = await synthesizeProbes("SKMD", tools, candle, {
    onStep: (step, names) => process.stdout.write(`  step ${step}: ${names.join(", ")}\n`),
  });

  console.log(`\n── proposed probes (after ${steps} steps) ──────────────────────\n`);
  console.log(proposal || "(no proposal produced)");

  const outDir = join(process.cwd(), "results");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `synthesized_probes_${Date.now()}.md`);
  const connected = surfaceStatus().filter((s) => s.access_status === "connected").map((s) => s.kind);
  writeFileSync(
    outFile,
    `# Synthesized probes — ${candle.spec.model}\n\n` +
      `Surfaces explored: ${connected.join(", ")}\n` +
      `Generated: ${new Date().toISOString()}\n\n---\n\n${proposal}\n`,
  );
  console.log(`\n✓ wrote ${outFile}\n`);
}

main().catch((err) => {
  console.error("synthesis failed:", err);
  process.exit(1);
});
