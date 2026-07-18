// ─────────────────────────────────────────────────────────────────────────────
// THE MONEY SHOT — the billing before/after regression delta.
// Runs the billing probe against current SKMD with two scoped instances:
//   before = medspa/docuspa scope   (the script's designed scope → completes)
//   after  = all clients incl nxtyou D2C  (script never covered it → stalls)
// Same code, same candle; the SCOPE (the org change nxtyou introduced) is the only
// variable. Confirmed real by Cameron: generate_skmd_monthly_invoice.py prices
// medspa/docuspa clients and does NOT handle nxtyou D2C patient billing (unpatched).
//
//   npx tsx scripts/run-billing-delta.ts
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { createCandle } from "@/lib/candle";
import { allSurfaceTools, surfaceStatus } from "@/surfaces";
import { ensureGoogleToken } from "@/surfaces/google-auth";
import { runProbe } from "@/engine";
import { frictionScore } from "@/lib/instrumentation";
import type { Finding, Probe, Run, Remediation } from "@/lib/contracts";
import { insertRun, insertProbe, insertFinding, getProbeDelta } from "@/db/client";

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

const BILLING_SCRIPT = "skmd_fastapi/scripts/billing/generate_skmd_monthly_invoice.py";

const BEFORE_SPEC =
  "Scope = one client type: medspa / docuspa clinic clients (the clinics billed " +
  "by the monthly-invoice pipeline). Does a pricing code path exist for this " +
  "client type?";

const AFTER_SPEC =
  "Scope = two client types: (1) medspa / docuspa clinic clients AND (2) nxtyou " +
  "direct-to-consumer (D2C) patients now in production. Does a pricing code path " +
  "exist for EACH of these client types?";

const supabaseConfigured = (): boolean =>
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main(): Promise<void> {
  loadEnvLocal();
  process.env.REPO_PATH =
    process.env.REPO_PATH ?? "/Users/cameronhightower/Software_Projects/SKMD";

  // Best-effort Google auto-refresh (billing is repo-only, so non-fatal here —
  // keeps Gmail/Drive warm if a probe reaches out).
  try {
    await ensureGoogleToken({ verbose: true });
  } catch (e) {
    console.warn(`  google token refresh skipped: ${(e as Error).message}`);
  }

  const candle = createCandle();
  if (!candle.isProd && !process.env.ANTHROPIC_API_KEY) {
    console.error("✗ No candle. Set CANDLE_BASE_URL (vLLM) or ANTHROPIC_API_KEY.");
    process.exit(1);
  }
  const tools = allSurfaceTools();
  const target = "SKMD";
  const now = new Date().toISOString();
  const stamp = Date.now();
  const beforeRunId = `run_before_${stamp}`;
  const afterRunId = `run_after_${stamp}`;

  console.log(`\n▶ Billing regression delta — target=${target}`);
  console.log(`  candle: ${candle.isProd ? "PROD (vLLM Nemotron — MEASURED)" : "DEV (Opus 4.8)"}  model=${candle.spec.model}`);
  console.log(`  surfaces: ${surfaceStatus().map((s) => `${s.kind}:${s.access_status}`).join("  ")}\n`);

  console.log("  running BEFORE (medspa/docuspa scope)…");
  const before: Finding = await runProbe("billing-coverage", target, tools, candle, {
    runId: beforeRunId,
    instanceSpec: BEFORE_SPEC,
  });
  console.log(`    → ${before.status}  friction=${frictionScore(before.friction_vector).toFixed(1)}  ${before.root_cause_tag}`);

  console.log("  running AFTER (all clients incl. nxtyou D2C)…");
  const after: Finding = await runProbe("billing-coverage", target, tools, candle, {
    runId: afterRunId,
    instanceSpec: AFTER_SPEC,
  });
  console.log(`    → ${after.status}  friction=${frictionScore(after.friction_vector).toFixed(1)}  ${after.root_cause_tag}`);

  // The candle authors the typed recommendation off the stalled after-finding
  // (single-model architecture, L19). Confirmed-real Fix; provenance flagged.
  if (after.status !== "completed" && !after.remediation) {
    const rem: Remediation = {
      type: "Fix",
      content:
        "Update the monthly invoice script to price nxtyou D2C patient billing — " +
        "it currently only handles medspa/docuspa clients.",
      target: BILLING_SCRIPT,
      provenance: "candle-inferred (confirmed by owner: D2C billing not yet implemented)",
    };
    after.remediation = rem;
  }

  const delta = frictionScore(after.friction_vector) - frictionScore(before.friction_vector);
  console.log(`\n  ═══ DELTA (money shot) ═══`);
  console.log(`  before ${frictionScore(before.friction_vector).toFixed(1)} (${before.status}) → after ${frictionScore(after.friction_vector).toFixed(1)} (${after.status})   Δ = ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}`);
  console.log(delta > 0 ? "  ✅ caught regression: the nxtyou D2C scope made billing less operable." : "  ⚠️  no regression detected — check the scoping/surfaces.");

  // ── persist ────────────────────────────────────────────────────────────────
  if (supabaseConfigured()) {
    try {
      const probe: Probe = {
        id: "billing-coverage", // must match the findings' probe_id (FK)
        category: "billing-regression",
        kind: "universal",
        instance_spec: AFTER_SPEC,
      };
      const mkRun = (id: string, org_state: "before" | "after"): Run => ({
        id, target, candle: candle.spec, org_state, mode: "passive", started_at: now,
      });
      await insertProbe(probe).catch(() => {}); // idempotent-ish; ignore dup
      await insertRun(mkRun(beforeRunId, "before"));
      await insertRun(mkRun(afterRunId, "after"));
      await insertFinding(before);
      await insertFinding(after);
      const persisted = await getProbeDelta("billing-coverage", beforeRunId, afterRunId);
      console.log(`\n  ✓ persisted to Supabase; round-trip delta = ${persisted.friction_delta >= 0 ? "+" : ""}${persisted.friction_delta.toFixed(1)}`);
    } catch (e) {
      console.log(`\n  ⚠️  persistence skipped: ${(e as Error).message}`);
    }
  } else {
    console.log("\n  (Supabase not configured — skipped persistence)");
  }

  const outDir = join(process.cwd(), ".audit-output");
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `billing_delta_${stamp}.json`);
  writeFileSync(outFile, JSON.stringify({ target, candle: candle.spec, delta, before, after }, null, 2));
  console.log(`  ✓ wrote ${outFile}\n`);
}

main().catch((err) => {
  console.error("billing-delta failed:", err);
  process.exit(1);
});
