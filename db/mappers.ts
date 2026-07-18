// ─────────────────────────────────────────────────────────────────────────────
// Pure, DB-free mappers between Contract A (lib/contracts.ts) and DB row shapes.
// These are the heart of the losslessness guarantee and are exercised directly
// by db/roundtrip.test.ts without needing a live Supabase instance.
// ─────────────────────────────────────────────────────────────────────────────

import type { Finding, Remediation, Run, Probe } from "@/lib/contracts";
import type {
  RunRow,
  ProbeRow,
  FindingRow,
  ArtifactRow,
} from "@/db/types";

// ── Run ──────────────────────────────────────────────────────────────────────
export function runToRow(run: Run): RunRow {
  return {
    id: run.id,
    target: run.target,
    candle: run.candle,
    org_state: run.org_state,
    mode: run.mode,
    started_at: run.started_at,
  };
}

export function rowToRun(row: RunRow): Run {
  return {
    id: row.id,
    target: row.target,
    candle: row.candle,
    org_state: row.org_state,
    mode: row.mode,
    started_at: row.started_at,
  };
}

// ── Probe ────────────────────────────────────────────────────────────────────
export function probeToRow(probe: Probe): ProbeRow {
  return {
    id: probe.id,
    category: probe.category,
    kind: probe.kind,
    instance_spec: probe.instance_spec,
  };
}

export function rowToProbe(row: ProbeRow): Probe {
  return {
    id: row.id,
    category: row.category,
    kind: row.kind,
    instance_spec: row.instance_spec,
  };
}

// ── Finding ↔ (FindingRow + optional ArtifactRow) ────────────────────────────
// A Contract A `Finding` splits across two tables: the scalar/friction data goes
// to `findings`, and `remediation` (if present) is normalized into `artifacts`.

/** Split a Finding into its `findings` row (remediation stripped out). */
export function findingToRow(finding: Finding): FindingRow {
  return {
    run_id: finding.run_id,
    probe_id: finding.probe_id,
    status: finding.status,
    friction_vector: finding.friction_vector,
    root_cause_tag: finding.root_cause_tag,
  };
}

/** Build the `artifacts` row for a finding, or null if it has no remediation. */
export function findingToArtifactRow(
  finding: Finding,
  findingId: string,
): ArtifactRow | null {
  if (finding.remediation === null) return null;
  return remediationToArtifactRow(finding.remediation, findingId);
}

export function remediationToArtifactRow(
  remediation: Remediation,
  findingId: string,
): ArtifactRow {
  return {
    finding_id: findingId,
    remediation_type: remediation.type,
    content: remediation.content,
    target: remediation.target,
    provenance: remediation.provenance,
  };
}

export function artifactRowToRemediation(row: ArtifactRow): Remediation {
  return {
    type: row.remediation_type,
    content: row.content,
    target: row.target,
    provenance: row.provenance,
  };
}

/** Reassemble a Contract A Finding from its `findings` row + optional artifact. */
export function rowToFinding(
  row: FindingRow,
  artifact: ArtifactRow | null,
): Finding {
  return {
    run_id: row.run_id,
    probe_id: row.probe_id,
    status: row.status,
    friction_vector: row.friction_vector,
    root_cause_tag: row.root_cause_tag,
    remediation: artifact ? artifactRowToRemediation(artifact) : null,
  };
}
