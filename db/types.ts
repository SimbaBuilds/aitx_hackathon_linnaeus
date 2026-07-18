// ─────────────────────────────────────────────────────────────────────────────
// Database row shapes — the on-the-wire representation of Contract A.
// These mirror the columns in supabase/migrations/20260718120000_init_linnaeus.sql.
// The `db/mappers.ts` module converts losslessly between these and Contract A.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  CandleSpec,
  FrictionVector,
  OrgState,
  RunMode,
  ProbeKind,
  FindingStatus,
  RootCauseTag,
  RemediationType,
  Surface,
} from "@/lib/contracts";

/** Row in `runs`. `candle` is jsonb (CandleSpec). `id`/timestamps are DB-managed. */
export interface RunRow {
  id: string;
  target: string;
  candle: CandleSpec;
  org_state: OrgState;
  mode: RunMode;
  started_at: string;
}

/** Row in `probes`. */
export interface ProbeRow {
  id: string;
  category: string;
  kind: ProbeKind;
  instance_spec: string | null;
}

/** Row in `surfaces`. Structurally identical to Contract A `Surface`. */
export type SurfaceRow = Surface;

/**
 * Row in `findings`. Note: no `remediation` here — that is normalized into the
 * `artifacts` table and rejoined by the client. `id` is a DB surrogate uuid.
 */
export interface FindingRow {
  id?: string;
  run_id: string;
  probe_id: string;
  status: FindingStatus;
  friction_vector: FrictionVector;
  root_cause_tag: RootCauseTag;
}

/** Row in `artifacts` — Contract A `Remediation` normalized out of `Finding`. */
export interface ArtifactRow {
  id?: string;
  finding_id: string;
  remediation_type: RemediationType;
  content: string;
  target: string;
  provenance: string;
}
