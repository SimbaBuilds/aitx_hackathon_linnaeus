// ─────────────────────────────────────────────────────────────────────────────
// Contract A — the Finding/Run data shape.  OWNED BY ORCHESTRATOR (M3).  FROZEN.
// The producer/consumer interface: engine EMITS, UI RENDERS, DB PERSISTS.
// Do not change these shapes without an orchestrator sign-off — every workstream
// depends on them.  Sample instances live in /fixtures.
// ─────────────────────────────────────────────────────────────────────────────

export type OrgState = "before" | "after"; // before vs after the org change → the delta
export type RunMode = "passive" | "capture";
export type ProbeKind = "universal" | "synthesized";

// A probe can end three ways.  `failed_to_author` is the layer-1 testability-gate
// hit: the system was too illegible to even instantiate the instrument (maximal finding).
export type FindingStatus = "completed" | "stalled" | "failed_to_author";

export type RootCauseTag =
  | "coupling"
  | "dead-code"
  | "missing-doc"
  | "no-owner"
  | "no-runbook"
  | "stale-code"
  | "missing-access"
  | "none";

// The 5-type remediation taxonomy (PLAN L25).  Emitted as a recommendation a human
// decides on — NOT executed as a loop (except the pure-code Fix, optionally).
export type RemediationType = "Document" | "Connect" | "Grant" | "Fix" | "Delete";

export interface CandleSpec {
  model: string; // e.g. "nemotron-candle" (prod) | "claude-opus-4-8" (dev stand-in, M1)
  quant: string | null; // "FP8" | "NVFP4" | null (dev)
  seed: number;
  temp: number;
}

export interface Run {
  id: string;
  target: string; // e.g. "SKMD"
  candle: CandleSpec;
  org_state: OrgState;
  mode: RunMode;
  started_at: string; // ISO 8601
}

export interface Probe {
  id: string;
  category: string; // e.g. "billing-regression", "auth-boundary"
  kind: ProbeKind;
  instance_spec: string | null; // null for universal-hardcoded; authored text for synthesized
}

// Every field here is mechanically observable from the run — NO answer key required.
// This is the audit.  See friction_measurement_spec.md for exact definitions.
export interface FrictionVector {
  completed: boolean;
  seconds_to_first_correct_move: number | null; // null = never reached a correct move
  surfaces_opened: number;
  tool_calls: number;
  retries: number;
  dead_ends: number;
  guessed: boolean;
  hedging_count: number;
}

export interface Remediation {
  type: RemediationType;
  content: string; // the recommendation text / the stub / the doc body
  target: string; // where it would apply (file path, doc, system)
  provenance: string; // "candle-inferred" | "human-verbatim: <quote>"
}

export interface Finding {
  run_id: string;
  probe_id: string;
  status: FindingStatus;
  friction_vector: FrictionVector;
  root_cause_tag: RootCauseTag;
  remediation: Remediation | null; // null until the capture pass authors it
}

export interface Surface {
  id: string;
  kind: "repo" | "gmail" | "drive" | "notion" | "rds";
  access_status: "connected" | "unavailable" | "unauthorized";
}

// THE MONEY SHOT: two Findings for the same probe across org_state before/after.
// A positive friction_delta on a probe that used to complete = a caught regression.
export interface ProbeDelta {
  probe_id: string;
  before: Finding;
  after: Finding;
  friction_delta: number; // frictionScore(after) - frictionScore(before); + = regression
}
