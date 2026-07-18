// Typed loader for the demo + heatmap fixtures.  UI-only (WS-C) — reads the
// frozen fixtures and maps them onto the frozen contract types, computing every
// score with frictionScore() (never trusting the fixtures' _derived hints).
import demoJson from "@/fixtures/demo.json";
import heatmapJson from "@/fixtures/heatmap.json";
import synthBoardJson from "@/results/nemotron_synth_board.json";
import { PROBE_REGISTRY } from "@/probes";
import type {
  Finding,
  Probe,
  ProbeKind,
  Run,
  Surface,
  RootCauseTag,
} from "@/lib/contracts";
import { frictionScore } from "@/lib/instrumentation";

// ── Fixture-shaped types (the JSON carries a few _derived/_note hints we ignore) ──
export interface HeatCell {
  path: string;
  loc: number;
  cyclomatic: number;
  coupling: number;
  dry_violations: number;
  heat: number; // 0..1 static-scan prediction
  probe_stalled: string | null; // probe id confirmed to stall here, if any
  root_cause_tag: RootCauseTag;
}

interface DemoShape {
  target: string;
  surfaces: Surface[];
  probes: Probe[];
  runs: Run[];
  findings: Finding[];
}
interface HeatmapShape {
  target: string;
  cells: HeatCell[];
}

const demo = demoJson as unknown as DemoShape;
const heatmap = heatmapJson as unknown as HeatmapShape;

// ── Synthesized org-level board (results/nemotron_synth_board.json) ────────────
// Nemotron-measured single-shot snapshots of the Frontier-Factor probes. These are
// current-state ("after") findings — no before/after pair, so they enrich the
// Findings board (not the delta view). Probe metadata comes from the registry.
interface SynthBoardShape {
  findings: Array<Finding & { _derived?: { surfaces_hit?: string[] } }>;
}
const synthBoard = synthBoardJson as unknown as SynthBoardShape;

const synthFindings: Finding[] = synthBoard.findings.map((f) => ({
  run_id: "run_after", // fold into the current-state audit surface
  probe_id: f.probe_id,
  status: f.status,
  friction_vector: f.friction_vector,
  root_cause_tag: f.root_cause_tag,
  remediation: f.remediation ?? null,
}));

const synthProbes: Probe[] = synthBoard.findings.map((f) => {
  const def = PROBE_REGISTRY[f.probe_id];
  return {
    id: f.probe_id,
    category: def?.category ?? f.probe_id,
    kind: (def?.kind ?? "synthesized") as ProbeKind,
    instance_spec: null,
  };
});

export const target = demo.target;
export const surfaces: Surface[] = demo.surfaces;
export const probes: Probe[] = [...demo.probes, ...synthProbes];
export const runs: Run[] = demo.runs;
export const findings: Finding[] = [...demo.findings, ...synthFindings];
export const heatCells: HeatCell[] = heatmap.cells;

// The one honest use of the scalar: computed live from the vector.
export const scoreOf = (f: Finding): number => frictionScore(f.friction_vector);

export const probeLabel = (id: string): string =>
  probes.find((p) => p.id === id)?.category ?? id;

const runByState = (state: "before" | "after") =>
  runs.find((r) => r.org_state === state);

export const afterRun = runByState("after");
export const beforeRun = runByState("before");

// Findings observed in the "after" org state = the current audit surface.
// Includes the synthesized org-level board (folded to run_after above).
export const afterFindings: Finding[] = findings.filter(
  (f) => f.run_id === afterRun?.id
);

// THE money shot: same probe, before (completed) vs after (stalled).
const BILLING = "billing-regression";
export const billingBefore = findings.find(
  (f) => f.probe_id === BILLING && f.run_id === beforeRun?.id
)!;
export const billingAfter = findings.find(
  (f) => f.probe_id === BILLING && f.run_id === afterRun?.id
)!;
