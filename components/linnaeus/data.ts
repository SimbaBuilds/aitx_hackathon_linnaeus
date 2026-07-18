// Typed loader for the demo + heatmap fixtures.  UI-only (WS-C) — reads the
// frozen fixtures and maps them onto the frozen contract types, computing every
// score with frictionScore() (never trusting the fixtures' _derived hints).
import demoJson from "@/fixtures/demo.json";
import heatmapJson from "@/fixtures/heatmap.json";
import type {
  Finding,
  Probe,
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

export const target = demo.target;
export const surfaces: Surface[] = demo.surfaces;
export const probes: Probe[] = demo.probes;
export const runs: Run[] = demo.runs;
export const findings: Finding[] = demo.findings;
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
