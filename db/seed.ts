// ─────────────────────────────────────────────────────────────────────────────
// Seed/loader: load fixtures/demo.json into the DB in FK-safe order.
// Requires live Supabase creds (deferred to integration). Pure mapping used here
// is proven lossless by db/roundtrip.test.ts without a live DB.
//
// Run (once creds are set): npx tsx db/seed.ts
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase";
import { loadFixture } from "@/db/fixture";
import { probeToRow, runToRow, findingToRow, findingToArtifactRow } from "@/db/mappers";
import type { FindingRow } from "@/db/types";

/** Load the demo fixture into the DB. Order respects FKs: surfaces/probes/runs → findings → artifacts. */
export async function seedDemo(client?: SupabaseClient): Promise<{
  surfaces: number;
  probes: number;
  runs: number;
  findings: number;
  artifacts: number;
}> {
  const db = client ?? createServiceClient();
  const { surfaces, probes, runs, findings } = loadFixture();

  const surfaceRes = await db.from("surfaces").upsert(surfaces).select();
  if (surfaceRes.error) throw new Error(`seed surfaces: ${surfaceRes.error.message}`);

  const probeRes = await db.from("probes").upsert(probes.map(probeToRow)).select();
  if (probeRes.error) throw new Error(`seed probes: ${probeRes.error.message}`);

  const runRes = await db.from("runs").upsert(runs.map(runToRow)).select();
  if (runRes.error) throw new Error(`seed runs: ${runRes.error.message}`);

  let artifactCount = 0;
  for (const finding of findings) {
    const insertRes = await db
      .from("findings")
      .upsert(findingToRow(finding), { onConflict: "run_id,probe_id" })
      .select()
      .single();
    if (insertRes.error) {
      throw new Error(
        `seed finding ${finding.run_id}/${finding.probe_id}: ${insertRes.error.message}`,
      );
    }
    const row = insertRes.data as Required<FindingRow>;
    const artifactRow = findingToArtifactRow(finding, row.id);
    if (artifactRow) {
      const aRes = await db
        .from("artifacts")
        .upsert(artifactRow, { onConflict: "finding_id" });
      if (aRes.error) {
        throw new Error(`seed artifact ${row.id}: ${aRes.error.message}`);
      }
      artifactCount += 1;
    }
  }

  return {
    surfaces: surfaces.length,
    probes: probes.length,
    runs: runs.length,
    findings: findings.length,
    artifacts: artifactCount,
  };
}

// Allow `npx tsx db/seed.ts` as a one-shot loader.
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemo()
    .then((counts) => {
      console.log("Seeded demo fixture:", counts);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seed failed:", err.message);
      process.exit(1);
    });
}
