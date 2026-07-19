"use client";

// ── Operability Scorecard (frontispiece) ───────────────────────────────────────
// An honest exec-summary rollup of the CURRENT real findings — org-wide, by
// sub-product group, plus the ONE genuine before/after time series (the D2C
// billing regression). Everything past "now" is explicitly PROJECTED (dashed),
// anchored to the Field Log re-audit cadence — never passed off as measured.
import {
  afterFindings,
  scoreOf,
  heatCells,
  org,
  billingBefore,
  billingAfter,
} from "@/components/linnaeus/data";
import { anonymize } from "@/components/linnaeus/anonymize";

// operability = the inverse of friction: 100 = perfectly legible, 0 = illegible.
const operability = (friction: number) => 100 - friction;
const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const round = (x: number) => Math.round(x);

// Which sub-product a probe belongs to — derived from the module it exercised
// (repo path prefix). Org-level cross-surface probes touch no single module.
const groupOf = (probeId: string): string => {
  const cell = heatCells.find((c) => c.probe === probeId);
  return cell ? cell.path.split("/")[0] : "cross-surface";
};

const INK = "#0d366b"; // deep prussian (headline blue)
const BLUE = "#2e5e9e"; // fluent blue
const RED = "#c0392b"; // stall / critical (status only)

// ── Derived aggregates (all computed from the real friction scores) ────────────
const allScores = afterFindings.map(scoreOf);
const orgOp = round(operability(mean(allScores)));
const totalProbes = afterFindings.length;
const stalls = afterFindings.filter((f) => f.status !== "completed").length;

const codebaseFindings = afterFindings.filter((f) =>
  heatCells.some((c) => c.probe === f.probe_id)
);
const crossFindings = afterFindings.filter(
  (f) => !heatCells.some((c) => c.probe === f.probe_id)
);
const codebaseOp = round(operability(mean(codebaseFindings.map(scoreOf))));
const crossOp = round(operability(mean(crossFindings.map(scoreOf))));

interface GroupStat {
  group: string;
  op: number;
  n: number;
  stalls: number;
  critical: boolean;
}
const groupStats: GroupStat[] = (() => {
  const byGroup = new Map<string, number[]>();
  const stallsByGroup = new Map<string, number>();
  for (const f of afterFindings) {
    const g = groupOf(f.probe_id);
    (byGroup.get(g) ?? byGroup.set(g, []).get(g)!).push(scoreOf(f));
    if (f.status !== "completed") stallsByGroup.set(g, (stallsByGroup.get(g) ?? 0) + 1);
  }
  const stats: GroupStat[] = [...byGroup.entries()].map(([group, scores]) => {
    const op = round(operability(mean(scores)));
    return {
      group,
      op,
      n: scores.length,
      stalls: stallsByGroup.get(group) ?? 0,
      critical: op < 35,
    };
  });
  // sub-products by operability desc, cross-surface always last (it's the aggregate lens).
  return stats.sort((a, b) => {
    if (a.group === "cross-surface") return 1;
    if (b.group === "cross-surface") return -1;
    return b.op - a.op;
  });
})();

// ── Operability over time ──────────────────────────────────────────────────────
// The x-axis is shared. Only two things are MEASURED: org-wide operability now,
// and the D2C billing capability before vs after the launch. Points past "Now"
// are illustrative projections (remediation applied on each re-audit) — never
// measurements; a series is drawn solid only through its `measuredThru` index.
const beforeOp = round(operability(scoreOf(billingBefore)));
const nowOp = round(operability(scoreOf(billingAfter)));
const X_LABELS = ["Before D2C", "Now", "+1 re-audit", "+2 re-audits", "+3 re-audits"];
const NOW_IDX = 1;

interface Series {
  name: string;
  color: string;
  primary: boolean;
  pts: Array<number | null>; // null = not plotted at that x (no measured baseline)
  measuredThru: number; // last index that is real; beyond it is projected
}
const orgSeries: Series = {
  name: "org-wide",
  color: INK,
  primary: true,
  pts: [null, orgOp, 60, 72, 82], // one real anchor (Now); rest projected
  measuredThru: NOW_IDX,
};
const billingSeries: Series = {
  name: "D2C billing",
  color: "#7aa0c8",
  primary: false,
  pts: [beforeOp, nowOp, 48, 66, 80], // real before/after; rest projected
  measuredThru: NOW_IDX,
};
const seriesList = [billingSeries, orgSeries]; // billing under, org on top

function label(g: string) {
  return g === "cross-surface" ? "cross-surface" : anonymize(g);
}

// ── Small pieces ───────────────────────────────────────────────────────────────
function StatTile({
  value,
  unit,
  title,
  sub,
  accent = INK,
}: {
  value: string;
  unit?: string;
  title: string;
  sub: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-border">
      <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="tabular-nums text-3xl font-bold" style={{ color: accent }}>
          {value}
        </span>
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
      <div className="text-xs leading-snug text-muted-foreground">{sub}</div>
    </div>
  );
}

// Horizontal operability bars — one measure across categories → single hue,
// direct-labelled, no legend. Critical groups carry a red dot + word (status,
// never colour alone).
function GroupBars() {
  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-border">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-base font-semibold">Operability by group</h3>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          higher = more legible
        </span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Current-state rollup per sub-product. <span className="font-mono">n</span> = probes run
        against that group.
      </p>
      <div className="space-y-3">
        {groupStats.map((g) => (
          <div key={g.group} className="flex items-center gap-3">
            <div className="w-40 shrink-0 whitespace-nowrap text-right font-mono text-xs text-foreground">
              {label(g.group)}
              <span className="ml-1 text-muted-foreground">· n{g.n}</span>
            </div>
            <div className="relative h-6 flex-1 overflow-hidden rounded-md bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-md"
                style={{ width: `${g.op}%`, background: g.critical ? RED : BLUE }}
              />
            </div>
            <div className="flex w-24 shrink-0 items-center gap-1.5">
              <span className="tabular-nums text-sm font-bold" style={{ color: g.critical ? RED : INK }}>
                {g.op}
              </span>
              {g.critical && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#c0392b]/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#c0392b]">
                  critical
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Operability-over-time chart (SVG) — org-wide + the measured billing probe ──
function TrendChart() {
  const W = 640;
  const H = 250;
  const padL = 40;
  const padR = 54;
  const padT = 22;
  const padB = 40;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const n = X_LABELS.length;
  const x = (i: number) => padL + (plotW * i) / (n - 1);
  const y = (op: number) => padT + plotH * (1 - op / 100);
  const gridYs = [0, 25, 50, 75, 100];

  // Build a path over a contiguous index range, skipping null points.
  const segPath = (pts: Array<number | null>, from: number, to: number) => {
    const d: string[] = [];
    for (let i = from; i <= to; i++) {
      const v = pts[i];
      if (v == null) continue;
      d.push(`${d.length === 0 ? "M" : "L"} ${x(i)} ${y(v)}`);
    }
    return d.join(" ");
  };

  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-border">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-base font-semibold">Operability over time</h3>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {seriesList.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4" style={{ background: "currentColor" }} /> measured
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-4"
              style={{ backgroundImage: `repeating-linear-gradient(90deg, currentColor 0 3px, transparent 3px 6px)` }}
            />
            projected
          </span>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Org-wide operability, plus the one probe with a measured before/after. Projected points are
        filled in by the Field Log as it re-audits each change.
      </p>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[520px]" role="img">
          {/* projected region wash */}
          <rect x={x(NOW_IDX)} y={padT} width={W - padR - x(NOW_IDX)} height={plotH} fill={INK} opacity={0.04} />
          <text
            x={(x(NOW_IDX) + (W - padR)) / 2}
            y={padT - 8}
            textAnchor="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9, letterSpacing: 1 }}
          >
            PROJECTED
          </text>

          {/* gridlines + y labels */}
          {gridYs.map((g) => (
            <g key={g}>
              <line x1={padL} x2={W - padR} y1={y(g)} y2={y(g)} stroke="currentColor" className="text-border" strokeWidth={1} opacity={0.5} />
              <text x={padL - 8} y={y(g) + 3} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                {g}
              </text>
            </g>
          ))}

          {/* series: measured (solid) through measuredThru, projected (dashed) after */}
          {seriesList.map((s) => (
            <g key={s.name}>
              <path
                d={segPath(s.pts, 0, s.measuredThru)}
                fill="none"
                stroke={s.color}
                strokeWidth={s.primary ? 2.5 : 2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={segPath(s.pts, s.measuredThru, n - 1)}
                fill="none"
                stroke={s.color}
                strokeWidth={s.primary ? 2 : 1.75}
                strokeDasharray="4 4"
                strokeLinecap="round"
                opacity={0.75}
              />
              {s.pts.map((v, i) => {
                if (v == null) return null;
                const proj = i > s.measuredThru;
                return (
                  <g key={i}>
                    <circle
                      cx={x(i)}
                      cy={y(v)}
                      r={proj ? 3 : s.primary ? 5 : 4}
                      fill={proj ? "var(--card)" : s.color}
                      stroke={s.color}
                      strokeWidth={proj ? 1.5 : 2}
                    />
                    {!proj && (
                      <text
                        x={x(i)}
                        y={y(v) - 11}
                        textAnchor="middle"
                        className="fill-foreground"
                        style={{ fontSize: 12, fontWeight: 700 }}
                      >
                        {v}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}

          {/* x-axis labels */}
          {X_LABELS.map((lbl, i) => (
            <text key={lbl} x={x(i)} y={H - padB + 16} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
              {lbl}
            </text>
          ))}

          {/* the caught-regression call-out on the measured billing drop */}
          <text
            x={(x(0) + x(1)) / 2 - 6}
            y={y((beforeOp + nowOp) / 2) - 6}
            textAnchor="middle"
            fill={RED}
            style={{ fontSize: 10, fontWeight: 600 }}
          >
            −{beforeOp - nowOp} regression
          </text>
        </svg>
      </div>
    </div>
  );
}

export function ScorecardView() {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline gap-3 border-b border-border pb-2.5">
          <span className="font-serif text-lg italic text-muted-foreground">Frontispiece</span>
          <h2 className="text-2xl">Operability Scorecard</h2>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {anonymize(org)}
          </span>
        </div>
        <p className="mt-2.5 max-w-2xl text-sm text-muted-foreground">
          How legibly an agent can operate across{" "}
          <span className="font-medium text-foreground">{anonymize(org)}</span> — rolled up from the
          current probe battery, broken out by sub-product, and tracked over time.
        </p>
      </div>

      {/* headline tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          title="Org operability"
          value={String(orgOp)}
          unit="/ 100"
          sub={`mean across ${totalProbes} probes · higher = more legible`}
        />
        <StatTile
          title="Probes stalled"
          value={`${stalls}`}
          unit={`of ${totalProbes}`}
          accent={RED}
          sub="agent could not complete without a human"
        />
        <StatTile
          title="Codebase"
          value={String(codebaseOp)}
          unit="/ 100"
          sub="single-surface (repo) probes — fairly legible"
        />
        <StatTile
          title="Cross-surface"
          value={String(crossOp)}
          unit="/ 100"
          accent={crossOp < 35 ? RED : INK}
          sub="org knowledge across repo · email · notes — the gap"
        />
      </div>

      <GroupBars />
      <TrendChart />

      <p className="text-xs text-muted-foreground">
        Scores are computed live as operability = 100 − mechanically-observed friction. The
        cross-surface figure is the honest headline: the code is legible, but the org knowledge an
        agent needs is scattered and unowned.
      </p>
    </div>
  );
}
