// ─────────────────────────────────────────────────────────────────────────────
// WS-D typed read/write client. Types to Contract A (lib/contracts.ts) and uses
// the service-role Supabase client from lib/supabase.ts. All mapping between
// Contract A and DB rows is delegated to the pure functions in db/mappers.ts.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase";
import { frictionScore } from "@/lib/instrumentation";
import type {
  Finding,
  Probe,
  ProbeDelta,
  Remediation,
  Run,
} from "@/lib/contracts";
import type { ArtifactRow, FindingRow } from "@/db/types";
import {
  artifactRowToRemediation,
  findingToArtifactRow,
  findingToRow,
  probeToRow,
  remediationToArtifactRow,
  rowToFinding,
  rowToProbe,
  rowToRun,
  runToRow,
} from "@/db/mappers";

/** Resolve a client: caller may inject one (tests/integration) else service-role. */
function resolveClient(client?: SupabaseClient): SupabaseClient {
  return client ?? createServiceClient();
}

// ── Writes ───────────────────────────────────────────────────────────────────

export async function insertRun(
  run: Run,
  client?: SupabaseClient,
): Promise<Run> {
  const db = resolveClient(client);
  const { data, error } = await db
    .from("runs")
    .insert(runToRow(run))
    .select()
    .single();
  if (error) throw new Error(`insertRun(${run.id}): ${error.message}`);
  return rowToRun(data);
}

export async function insertProbe(
  probe: Probe,
  client?: SupabaseClient,
): Promise<Probe> {
  const db = resolveClient(client);
  const { data, error } = await db
    .from("probes")
    .insert(probeToRow(probe))
    .select()
    .single();
  if (error) throw new Error(`insertProbe(${probe.id}): ${error.message}`);
  return rowToProbe(data);
}

/**
 * Insert a Finding: writes the `findings` row, then (if present) its normalized
 * `artifacts` row. Returns the DB-assigned finding id.
 */
export async function insertFinding(
  finding: Finding,
  client?: SupabaseClient,
): Promise<{ id: string; finding: Finding }> {
  const db = resolveClient(client);
  const { data, error } = await db
    .from("findings")
    .insert(findingToRow(finding))
    .select()
    .single();
  if (error) {
    throw new Error(
      `insertFinding(${finding.run_id}/${finding.probe_id}): ${error.message}`,
    );
  }
  const row = data as Required<FindingRow>;
  const artifactRow = findingToArtifactRow(finding, row.id);
  if (artifactRow) await insertArtifact(artifactRow, db);
  return { id: row.id, finding };
}

/**
 * Insert an artifact (typed remediation) for a finding. Accepts either a ready
 * ArtifactRow or a (Remediation + findingId) pair.
 */
export async function insertArtifact(
  artifact: ArtifactRow | { remediation: Remediation; findingId: string },
  client?: SupabaseClient,
): Promise<ArtifactRow> {
  const db = resolveClient(client);
  const row: ArtifactRow =
    "remediation" in artifact
      ? remediationToArtifactRow(artifact.remediation, artifact.findingId)
      : artifact;
  const { data, error } = await db
    .from("artifacts")
    .insert(row)
    .select()
    .single();
  if (error) {
    throw new Error(`insertArtifact(${row.finding_id}): ${error.message}`);
  }
  return data as ArtifactRow;
}

// ── Reads ────────────────────────────────────────────────────────────────────

export async function getRun(
  runId: string,
  client?: SupabaseClient,
): Promise<Run | null> {
  const db = resolveClient(client);
  const { data, error } = await db
    .from("runs")
    .select()
    .eq("id", runId)
    .maybeSingle();
  if (error) throw new Error(`getRun(${runId}): ${error.message}`);
  return data ? rowToRun(data) : null;
}

/**
 * All findings for a run, each rehydrated to Contract A (remediation rejoined
 * from `artifacts`).
 */
export async function getFindings(
  runId: string,
  client?: SupabaseClient,
): Promise<Finding[]> {
  const db = resolveClient(client);
  const { data, error } = await db
    .from("findings")
    .select("*, artifacts(*)")
    .eq("run_id", runId);
  if (error) throw new Error(`getFindings(${runId}): ${error.message}`);

  return (data ?? []).map((row) => {
    const { artifacts, ...findingRow } = row as FindingRow & {
      artifacts: ArtifactRow[] | ArtifactRow | null;
    };
    const artifact = Array.isArray(artifacts)
      ? (artifacts[0] ?? null)
      : (artifacts ?? null);
    return rowToFinding(findingRow, artifact);
  });
}

/**
 * THE MONEY SHOT: the before/after Finding pair for one probe and the friction
 * delta between them (positive = a caught regression).
 */
export async function getProbeDelta(
  probeId: string,
  beforeRunId: string,
  afterRunId: string,
  client?: SupabaseClient,
): Promise<ProbeDelta> {
  const db = resolveClient(client);
  const before = await getFindingForProbe(db, probeId, beforeRunId);
  const after = await getFindingForProbe(db, probeId, afterRunId);
  if (!before) {
    throw new Error(`getProbeDelta: no finding for ${probeId} in ${beforeRunId}`);
  }
  if (!after) {
    throw new Error(`getProbeDelta: no finding for ${probeId} in ${afterRunId}`);
  }
  return {
    probe_id: probeId,
    before,
    after,
    friction_delta:
      frictionScore(after.friction_vector) -
      frictionScore(before.friction_vector),
  };
}

/** One finding for a (probe, run) pair, rehydrated with its remediation. */
async function getFindingForProbe(
  db: SupabaseClient,
  probeId: string,
  runId: string,
): Promise<Finding | null> {
  const { data, error } = await db
    .from("findings")
    .select("*, artifacts(*)")
    .eq("probe_id", probeId)
    .eq("run_id", runId)
    .maybeSingle();
  if (error) {
    throw new Error(`getFindingForProbe(${probeId}, ${runId}): ${error.message}`);
  }
  if (!data) return null;
  const { artifacts, ...findingRow } = data as FindingRow & {
    artifacts: ArtifactRow[] | ArtifactRow | null;
  };
  const artifact = Array.isArray(artifacts)
    ? (artifacts[0] ?? null)
    : (artifacts ?? null);
  return rowToFinding(findingRow, artifact);
}
