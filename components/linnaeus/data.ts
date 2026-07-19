// Typed loader for the demo + heatmap fixtures.  UI-only (WS-C) — reads the
// frozen fixtures and maps them onto the frozen contract types, computing every
// score with frictionScore() (never trusting the fixtures' _derived hints).
import demoJson from "@/fixtures/demo.json";
import heatmapJson from "@/fixtures/heatmap.json";
import synthBoardJson from "@/results/nemotron_synth_board.json";
import triggerJson from "@/fixtures/trigger_activity.json";
import { PROBE_REGISTRY } from "@/probes";
import { anonymize } from "@/components/linnaeus/anonymize";
import type {
  Finding,
  FindingStatus,
  Probe,
  ProbeKind,
  Run,
  Surface,
  RootCauseTag,
  Remediation,
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
  probe: string | null; // probe id that exercised this module (null = unprobed)
  probe_stalled: string | null; // probe id confirmed to stall here, if any
  root_cause_tag: RootCauseTag;
}

interface DeltaDef {
  probe_id: string;
  before_run_id: string;
  after_run_id: string;
  friction_delta: number;
}
interface DemoShape {
  org?: string;
  target: string;
  surfaces: Surface[];
  probes: Probe[];
  runs: Run[];
  findings: Finding[];
  deltas?: DeltaDef[];
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
interface CallLogRow {
  probe: string;
  tool: string;
  surface: string;
  ok: boolean;
  query?: string;
  note?: string;
}
interface SynthBoardShape {
  findings: Array<Finding & { verdict?: string; _derived?: { surfaces_hit?: string[] } }>;
  call_log?: CallLogRow[];
}
const synthBoard = synthBoardJson as unknown as SynthBoardShape;

// Typed recommendation per org-level STALL (beat 3: every finding → a typed
// recommendation the human decides on). Grounded + anonymized; the TYPE follows
// mechanically from the root cause. Completed-clean probes get none by design
// (a stall-free surface has nothing to remediate). Attached in the data layer so
// it survives board re-runs (the engine emits remediation: null).
const ORG_REMEDIATION: Record<string, Remediation> = {
  "synth-ownership-map": {
    type: "Document",
    content:
      "Add a committed ownership record (OWNERS / governance doc) naming the clinical " +
      "sign-off authority for protocol & contraindication changes — today it exists only " +
      "in email and ad-hoc request files, so an agent can't determine who approves.",
    target: "docs/OWNERS.md",
    provenance: "candle-inferred (no-owner: no committed ownership record found)",
  },
  "synth-billing-rollout": {
    type: "Document",
    content:
      "Record the fleet-wide weekly-billing rollout as an owned, tracked plan with a named " +
      "owner and ticket — today only an email thread references pilot clinics, so there is " +
      "no discoverable owner or status.",
    target: "implementation_plans/weekly_billing_rollout.md",
    provenance: "candle-inferred (no-owner: no tracked/owned rollout)",
  },
  // NB: keyed on the RAW probe_id (findings carry the un-anonymized id; the UI
  // rewrites nxtyou→d2c_web only at display time).
  "synth-nxtyou-wiring": {
    type: "Fix",
    content:
      "Wire the d2c provider flag to a reachable admin toggle / API endpoint and branch the " +
      "patient-queue on it — the schema column and query filter exist but nothing sets it, " +
      "so the feature is half-built and unreachable. (Or Delete the dead path if abandoned.)",
    target: "d2c_web/provider-access (is_d2c_web flag)",
    provenance: "candle-inferred (dead-code: flag exists, no setter/branch)",
  },
};

const synthFindings: Finding[] = synthBoard.findings.map((f) => ({
  run_id: "run_after", // fold into the current-state audit surface
  probe_id: f.probe_id,
  status: f.status,
  friction_vector: f.friction_vector,
  root_cause_tag: f.root_cause_tag,
  // Real remediation if the board carried one; else the grounded typed
  // recommendation for this stall; completed-clean stays null.
  remediation: f.remediation ?? ORG_REMEDIATION[f.probe_id] ?? null,
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

export const org = demo.org ?? demo.target; // the audited organization (the specimen)
export const target = demo.target; // the codebase alias (one surface of the org)
export const surfaces: Surface[] = demo.surfaces;
export const probes: Probe[] = [...demo.probes, ...synthProbes];
export const runs: Run[] = demo.runs;
export const findings: Finding[] = [...demo.findings, ...synthFindings];
export const heatCells: HeatCell[] = heatmap.cells;

// The one honest use of the scalar: computed live from the vector.
export const scoreOf = (f: Finding): number => frictionScore(f.friction_vector);

export const probeLabel = (id: string): string =>
  anonymize(probes.find((p) => p.id === id)?.category ?? id);

// ── The free-text task the candle actually ran ─────────────────────────────────
// Every probe carries a human-readable task (registry userPrompt / authored
// instance). It was never surfaced to the UI — so a viewer only saw the probe id.
// We resolve it here and ANONYMIZE it (the registry strings carry live org
// identifiers) so a card/modal can show "what the probe asked" in plain English.
export function taskTextOf(probeId: string): string {
  const def = PROBE_REGISTRY[probeId];
  const fixtureSpec = probes.find((p) => p.id === probeId)?.instance_spec ?? null;
  if (!def) return anonymize(fixtureSpec ?? "");
  const spec = fixtureSpec ?? def.instanceSpec ?? null;
  try {
    return anonymize(def.userPrompt(spec));
  } catch {
    return anonymize(spec ?? "");
  }
}

// ── Probe trace (org-level board only) ─────────────────────────────────────────
// The ordered path the candle took, from the board's call_log — anonymized for
// the public UI (decision 1a). Universal/billing probes have no call_log → [].
export interface TraceStep {
  surface: string;
  tool: string;
  ok: boolean;
  query: string; // anonymized
  note: string; // anonymized
  isCrossSurfaceReach: boolean; // first successful non-repo step
}

export function traceOf(probeId: string): TraceStep[] {
  const rows = (synthBoard.call_log ?? []).filter((r) => r.probe === probeId);
  let reachMarked = false;
  return rows.map((r) => {
    const isReach = !reachMarked && r.ok && r.surface !== "repo";
    if (isReach) reachMarked = true;
    return {
      surface: r.surface,
      tool: r.tool,
      ok: r.ok,
      query: anonymize(r.query),
      note: anonymize(r.note),
      isCrossSurfaceReach: isReach,
    };
  });
}

export function verdictOf(probeId: string): string | null {
  const f = synthBoard.findings.find((x) => x.probe_id === probeId);
  return f?.verdict ? anonymize(f.verdict) : null;
}

// The panel's payoff line. If the candle emitted a structured verdict, show it.
// Otherwise the candle thrashed to its step budget WITHOUT concluding — itself a
// finding (a wall for the machine) — so we derive an honest line from the measured
// trace instead of inventing a verdict.
export interface Conclusion {
  text: string;
  kind: "verdict" | "no-conclusion";
}
export function conclusionOf(probeId: string): Conclusion {
  const v = verdictOf(probeId);
  if (v) return { text: v, kind: "verdict" };
  const f = synthBoard.findings.find((x) => x.probe_id === probeId);
  const steps = traceOf(probeId);
  const nonRepo = [...new Set(steps.filter((s) => s.ok && s.surface !== "repo").map((s) => s.surface))];
  const reached = nonRepo.length ? `, reached ${nonRepo.join(", ")}` : "";
  const tag = f?.root_cause_tag ?? "none";
  return {
    text: `Stalled after ${steps.length} tool calls${reached} without reaching a conclusion → ${tag}.`,
    kind: "no-conclusion",
  };
}

/** Does this finding have a captured trace to expand? */
export const hasTrace = (probeId: string): boolean =>
  (synthBoard.call_log ?? []).some((r) => r.probe === probeId);

const runByState = (state: "before" | "after") =>
  runs.find((r) => r.org_state === state);

export const afterRun = runByState("after");
export const beforeRun = runByState("before");

// Findings observed in the "after" org state = the current audit surface.
// Includes the synthesized org-level board (folded to run_after above).
export const afterFindings: Finding[] = findings.filter(
  (f) => f.run_id === afterRun?.id
);

// probe id -> its current-state finding (for the heatmap detail drill-down).
export const afterFindingByProbe: Record<string, Finding> = Object.fromEntries(
  afterFindings.map((f) => [f.probe_id, f])
);

// ── Org-level probe board (cross-surface, from the synthesized Nemotron board) ──
// These are org-level (not codebase) runs: the candle operates across repo/gmail/
// notion. The data is thin for a heat *gradient* (all stalled), so we render them
// as a board — task + surfaces reached + score + why it stalled — not a grid.
export interface OrgProbe {
  probeId: string;
  category: string;
  finding: Finding;
  score: number;
  task: string;
  surfacesHit: string[];
  status: FindingStatus;
  rootCause: RootCauseTag;
}

export const orgProbes: OrgProbe[] = synthBoard.findings
  .map((raw): OrgProbe | null => {
    const finding = synthFindings.find((f) => f.probe_id === raw.probe_id);
    if (!finding) return null;
    const def = PROBE_REGISTRY[raw.probe_id];
    return {
      probeId: raw.probe_id,
      category: anonymize(def?.category ?? raw.probe_id),
      finding,
      score: scoreOf(finding),
      task: taskTextOf(raw.probe_id),
      surfacesHit: raw._derived?.surfaces_hit ?? [],
      status: finding.status,
      rootCause: finding.root_cause_tag,
    };
  })
  .filter((p): p is OrgProbe => p !== null)
  .sort((a, b) => b.score - a.score);

// ── Runnable probe catalogue (Run Now panel) ──────────────────────────────────
// The two selectable batteries the operator can fire on demand: the codebase-level
// universal set (demo.probes) and the org-level cross-surface set (orgProbes).
// expectedScore is the last observed friction for that probe (drives the run
// animation's revealed number + the friction chip in the checklist).
export interface RunnableProbe {
  id: string;
  label: string;
  set: "codebase" | "org";
  expectedScore: number | null;
}

const codebaseProbeIds = demo.probes.map((p) => p.id);
export const runnableProbes: RunnableProbe[] = [
  ...demo.probes.map((p): RunnableProbe => ({
    id: p.id,
    label: anonymize(p.category),
    set: "codebase",
    expectedScore: afterFindingByProbe[p.id] ? scoreOf(afterFindingByProbe[p.id]) : null,
  })),
  ...orgProbes
    .filter((op) => !codebaseProbeIds.includes(op.probeId))
    .map((op): RunnableProbe => ({
      id: op.probeId,
      label: op.category,
      set: "org",
      expectedScore: op.score,
    })),
];

// THE money shot: same probe, before (completed) vs after (stalled).
const BILLING = "billing-regression";
export const billingBefore = findings.find(
  (f) => f.probe_id === BILLING && f.run_id === beforeRun?.id
)!;
export const billingAfter = findings.find(
  (f) => f.probe_id === BILLING && f.run_id === afterRun?.id
)!;

// ── Probe deltas (extensible) ──────────────────────────────────────────────────
// One entry per probe re-run across the org change. Today the fixture carries a
// single delta (billing-regression); adding another before/after pair to
// demo.json `deltas` renders another card with no view changes.
export interface ProbeDelta {
  probe: Probe;
  before: Finding;
  after: Finding;
  beforeScore: number;
  afterScore: number;
  delta: number;
}

// ── Trigger activity log (fixtures/trigger_activity.json) ──────────────────────
// The event-driven beat (L28, Red Hat Live Data): the always-on classifier watches
// event surfaces and dispatches a re-audit when an operability-relevant change
// lands. Every string is anonymized at render (live identifiers in the raw log).
// A single tool call the candle made during a live operator run.
export interface OperatorTraceStep {
  surface: string;
  tool: string;
  ok: boolean;
  query: string; // anonymized at render
  note: string; // anonymized at render
}

// One probe's result inside an operator "Run now" battery.
export interface OperatorRunProbe {
  id: string;
  label: string; // anonymized
  status: string; // completed | stalled | failed_to_author
  score: number;
  rootCause: string;
  trace?: OperatorTraceStep[]; // the tool-by-tool path (from /api/run-battery)
  verdict?: string; // the candle's final structured line, if any
}

export interface TriggerEvent {
  ts: string;
  source: string; // gmail | cron | operator | …
  subject: string; // anonymized
  from: string; // anonymized
  classifierModel: string;
  relevant: boolean; // classifier verdict
  reason: string; // anonymized
  dispatched: boolean;
  dispatchKind: string | null; // re-audit | drift-sweep
  delta: number | null; // friction delta caught, when a re-audit ran
  deltaProbe: string | null;
  // Operator "Run now" only — the real per-probe results captured from the
  // battery (source of truth for the card's detail view). Absent on classifier
  // events, which show the operability-relevant/not-relevant verdict instead.
  operatorRun?: {
    mode: string; // sequential | concurrent
    wall: number; // ms wall-clock
    model: string; // candle model that measured it
    probes: OperatorRunProbe[];
  } | null;
}

interface TriggerRow {
  ts: string;
  source: string;
  subject: string;
  from?: string;
  classifier_model?: string;
  relevant: boolean;
  reason: string;
  dispatched: boolean;
  dispatch_kind?: string;
  delta?: number;
  delta_probe?: string;
}
const triggerData = triggerJson as unknown as { events: TriggerRow[] };

export const triggerEvents: TriggerEvent[] = triggerData.events.map((e) => ({
  ts: e.ts,
  source: e.source,
  subject: anonymize(e.subject),
  from: anonymize(e.from ?? ""),
  classifierModel: e.classifier_model ?? "—",
  relevant: e.relevant,
  reason: anonymize(e.reason),
  dispatched: e.dispatched,
  dispatchKind: e.dispatch_kind ?? null,
  delta: typeof e.delta === "number" ? e.delta : null,
  deltaProbe: e.delta_probe ? anonymize(e.delta_probe) : null,
}));

export const probeDeltas: ProbeDelta[] = (demo.deltas ?? [])
  .map((d): ProbeDelta | null => {
    const before = findings.find(
      (f) => f.probe_id === d.probe_id && f.run_id === d.before_run_id
    );
    const after = findings.find(
      (f) => f.probe_id === d.probe_id && f.run_id === d.after_run_id
    );
    const probe = probes.find((p) => p.id === d.probe_id);
    if (!before || !after || !probe) return null;
    const beforeScore = scoreOf(before);
    const afterScore = scoreOf(after);
    return { probe, before, after, beforeScore, afterScore, delta: afterScore - beforeScore };
  })
  .filter((d): d is ProbeDelta => d !== null)
  // steepest regression first
  .sort((a, b) => b.delta - a.delta);
